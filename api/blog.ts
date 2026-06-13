// BlogStudio 연동용 Vercel 서버리스 함수
// - GET  /api/blog  → 채널 연결 테스트(핑) 응답
// - POST /api/blog  → 글 수신 → Firestore에 저장 → 발행 URL 반환
//
// 환경변수(Vercel에 설정):
//   BLOGSTUDIO_API_KEY  : BlogStudio 채널에 설정한 X-API-Key 값과 동일해야 함 (필수, 보안)
//   FIRESTORE_API_KEY   : Firestore REST 쓰기용 API 키 (선택, 없으면 로컬 저장 생략)
//
// BlogStudio 채널 설정:
//   엔드포인트 URL = https://virginroad.kr/api/blog
//   HTTP 메서드    = POST
//   API Key 헤더   = X-API-Key
//   응답 URL 추출  = data.url

type Req = {
  method?: string;
  body?: any;
  query?: Record<string, any>;
  headers: Record<string, any>;
};
type Res = {
  setHeader: (k: string, v: string) => void;
  status: (n: number) => Res;
  json: (o: any) => void;
  end: () => void;
};

const SITE_URL = "https://virginroad.kr";
const SITE_NAME = "홈코노미뉴스";
const FIRESTORE_PROJECT = "gen-lang-client-0326874047";
const FIRESTORE_DB = "ai-studio-9ae01718-7459-4ac4-90d0-d2a27c2a0cc1";
const FIRESTORE_SECRET = "virginroad-secure-secret-token-2026";

function slugify(title: string): string {
  if (!title) return "";
  return title
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\uAC00-\uD7A3\-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 25)
    .replace(/-+$/g, "");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function classifyCategory(title: string, content: string): "신혼금융" | "신혼가전" | "결혼준비" {
  const c = (title + " " + content).toLowerCase();
  const fin = ["대출","금리","금융","예금","적금","청약","재테크","지원","소득","월세","isa","절세","부동산","디딤돌","보험","자금","세금","지원금","주택","전세","은행","투자","자산","연금","카드"];
  const app = ["가전","인테리어","삼성","lg","빌트인","가구","청정","에어컨","스타일러","정수기","냉장고","조명","세탁기","건조기","비스포크","오브제","식기세척기","식세기","인덕션","티비","tv","소파","침대","시공","리모델링","커튼","매트리스"];
  if (fin.some((k) => c.includes(k))) return "신혼금융";
  if (app.some((k) => c.includes(k))) return "신혼가전";
  return "결혼준비";
}

function extractFirstImage(content: string): string | null {
  const m = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function extractChannelId(req: Req): string {
  const b = req.body || {};
  const q = req.query || {};
  const cands = [
    b.channelId, b.channel_id, b.channelID, b.channel,
    b.channel?.id, b.channel?.channelId, b.channel?.channel_id, b.id,
    q.channelId, q.channel_id, q.channelID, q.channel, q.id,
    req.headers["x-channel-id"], req.headers["x-channel"],
  ];
  for (const v of cands) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "virginroad";
}

function pingResponse(channelId: string) {
  return {
    status: "success",
    message: "Channel verification successful. Ready to receive posts.",
    url: `${SITE_URL}/`,
    id: channelId,
    channelId,
    channel_id: channelId,
    channel: { id: channelId, name: "버진로드", url: `${SITE_URL}/` },
    data: {
      url: `${SITE_URL}/`,
      id: channelId,
      channelId,
      channel_id: channelId,
      channel: { id: channelId, name: "버진로드", url: `${SITE_URL}/` },
    },
  };
}

async function writeToFirestore(postId: string, post: any): Promise<number> {
  const key = process.env.FIRESTORE_API_KEY;
  if (!key) return 0;
  const url = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT}/databases/${FIRESTORE_DB}/documents/posts/${encodeURIComponent(postId)}?key=${key}`;
  const body = {
    fields: {
      title: { stringValue: post.title },
      excerpt: { stringValue: post.excerpt },
      content: { stringValue: post.content },
      category: { stringValue: post.category },
      author: { stringValue: post.author },
      date: { stringValue: post.date },
      image: { stringValue: post.image },
      readTime: { stringValue: post.readTime },
      hashtags: { arrayValue: { values: post.hashtags.map((t: string) => ({ stringValue: t })) } },
      secretToken: { stringValue: FIRESTORE_SECRET },
    },
  };
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.status;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key, x-api-key, Authorization, X-Channel-ID, x-channel-id, Accept, Origin");

  if (req.method === "OPTIONS") return res.status(200).end();

  const channelId = extractChannelId(req);
  res.setHeader("X-Channel-ID", String(channelId));
  res.setHeader("X-Channel-Id", String(channelId));
  res.setHeader("x-channel-id", String(channelId));

  // GET = 연결 테스트(핑). 키 없이 통과시켜 BlogStudio가 채널을 확인하게 함.
  if (req.method === "GET") {
    return res.status(200).json(pingResponse(channelId));
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  // POST = 글 수신. API 키 검증.
  const expectedKey = process.env.BLOGSTUDIO_API_KEY;
  const gotKey =
    req.headers["x-api-key"] ||
    req.headers["X-API-Key"] ||
    (req.query && (req.query.key || req.query.apiKey));
  if (expectedKey && gotKey !== expectedKey) {
    return res.status(401).json({ error: "unauthorized", message: "API key mismatch" });
  }

  const body = req.body || {};
  const rawTitle = body.title || body.subject || body.header || body.name;
  const rawContent = body.content || body.body || body.text || body.description || body.desc;
  const seoDescription = body.seoDescription || body.excerpt || body.summary || "";

  // 제목이 없으면 연결 테스트(핑)로 간주
  if (!rawTitle || typeof rawTitle !== "string") {
    return res.status(200).json(pingResponse(channelId));
  }

  try {
    const title = rawTitle.trim();
    const content = typeof rawContent === "string" ? rawContent : "";
    const postId = slugify(title) || `post-${Date.now()}`;
    const category = classifyCategory(title, content);

    let image = extractFirstImage(content);
    if (!image) {
      image =
        category === "신혼금융"
          ? "https://images.unsplash.com/photo-1554224155-1696413565d3?auto=format&fit=crop&q=80&w=800"
          : category === "신혼가전"
          ? "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&q=80&w=800"
          : "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800";
    }

    const plain = stripHtml(content);
    const readTime = `${Math.max(1, Math.ceil(plain.length / 500))}분`;
    const excerpt = (seoDescription.trim() || plain.slice(0, 140) + (plain.length > 140 ? "..." : "")).trim();
    const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split("T")[0];

    const post = {
      id: postId,
      title,
      excerpt,
      content,
      category,
      author: `${SITE_NAME} 편집부`,
      date: kstDate,
      image,
      readTime,
      hashtags: [category, "결혼꿀팁", "홈코노미뉴스"],
    };

    let fsStatus = 0;
    try {
      fsStatus = await writeToFirestore(postId, post);
    } catch {
      /* Firestore 쓰기 실패해도 발행 응답은 정상 반환 */
    }

    const url = `${SITE_URL}/post/${encodeURIComponent(postId)}`;
    return res.status(200).json({
      status: "success",
      message: "Post published successfully",
      id: postId,
      postId,
      channelId,
      channel_id: channelId,
      url,
      firestore: fsStatus,
      data: {
        url,
        id: postId,
        postId,
        channelId,
        channel_id: channelId,
        channel: { id: channelId, name: "버진로드", url: `${SITE_URL}/` },
      },
    });
  } catch (e) {
    return res.status(500).json({ error: "publish_failed", message: (e as Error).message });
  }
}
