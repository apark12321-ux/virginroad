/**
 * 빌드 후 dist/rss.xml을 자동 생성.
 * MOCK_POSTS(constants.ts)를 읽어 최신 글 기준 RSS 2.0 피드를 만든다.
 *
 * 사용: package.json build 스크립트 뒤에 `&& node scripts/generate-rss.mjs` 추가.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = resolve(ROOT, "dist");
const SITE_URL = "https://virginroad.kr";
const SITE_NAME = "홈코노미뉴스";
const SITE_DESC = "신혼부부를 위한 가장 정확한 결혼·신혼 가이드";

function slugify(title) {
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

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function loadPosts() {
  const file = resolve(ROOT, "src/constants.ts");
  if (!existsSync(file)) return [];
  const src = readFileSync(file, "utf8");
  const posts = [];
  const blockRe = /\{\s*id:\s*"([^"]+)"[\s\S]*?title:\s*"((?:[^"\\]|\\.)*)"[\s\S]*?date:\s*"([^"]+)"/g;
  let m;
  while ((m = blockRe.exec(src)) !== null) {
    const id = m[1];
    const title = m[2].replace(/\\"/g, '"');
    const date = m[3];
    const block = src.slice(m.index, m.index + 9000);
    const exMatch = block.match(/excerpt:\s*"((?:[^"\\]|\\.)*)"/);
    const catMatch = block.match(/category:\s*"([^"]+)"/);
    posts.push({
      id,
      title,
      date,
      excerpt: exMatch ? exMatch[1].replace(/\\"/g, '"') : "",
      category: catMatch ? catMatch[1] : "",
    });
  }
  return posts;
}

function buildRss(posts) {
  // 최신순 정렬, 최대 30개 (RSS는 보통 최신 글 위주)
  const sorted = posts
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 30);

  const now = new Date().toUTCString();

  const items = sorted
    .map((p) => {
      const url = `${SITE_URL}/post/${encodeURIComponent(slugify(p.title))}`;
      // 날짜를 RFC-822 형식으로 (RSS 표준)
      const pubDate = new Date(`${p.date}T09:00:00+09:00`).toUTCString();
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(p.excerpt)}</description>
      <category>${escapeXml(p.category)}</category>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(SITE_DESC)}</description>
    <language>ko</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
}

const posts = loadPosts();
const rss = buildRss(posts);
writeFileSync(resolve(DIST, "rss.xml"), rss, "utf8");
console.log(`[rss] generated for ${Math.min(posts.length, 30)} latest posts → dist/rss.xml`);
