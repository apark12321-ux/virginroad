import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * 조회수 카운터 API (Upstash Redis REST 기반)
 *
 * 전체 방문자의 조회수를 중앙에서 합산합니다.
 *   GET  /api/views?id=fin-47           → 단일 글 조회수 읽기 (증가 없음)
 *   GET  /api/views?ids=fin-47,fin-46   → 여러 글 조회수 한 번에 읽기
 *   POST /api/views  body {"id":"fin-47"} → 조회수 1 증가 후 반환
 *
 * 키 형식: views:{글ID}  (예: views:fin-47)
 *
 * 환경변수(Vercel에 등록):
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 * 미설정 시 503을 반환하며, 프론트엔드는 조회수를 숨깁니다(가짜 숫자 표시 안 함).
 */

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command: string[]): Promise<unknown> {
  const res = await fetch(`${URL}/${command.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const data = (await res.json()) as { result: unknown };
  return data.result;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  // 카운터 미설정 시: 503 (프론트엔드가 조회수를 숨김)
  if (!URL || !TOKEN) {
    return res.status(503).json({ error: "counter_not_configured" });
  }

  try {
    // POST: 조회수 1 증가
    if (req.method === "POST") {
      const id = (req.body && req.body.id) || (req.query.id as string);
      if (!id || !/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
        return res.status(400).json({ error: "invalid_id" });
      }
      const views = (await redis(["INCR", `views:${id}`])) as number;
      return res.status(200).json({ id, views });
    }

    // GET: 여러 글 한 번에
    if (req.query.ids) {
      const ids = String(req.query.ids)
        .split(",")
        .map((s) => s.trim())
        .filter((s) => /^[a-zA-Z0-9_-]{1,64}$/.test(s))
        .slice(0, 100);
      if (ids.length === 0) return res.status(200).json({ views: {} });
      const keys = ids.map((id) => `views:${id}`);
      const results = (await redis(["MGET", ...keys])) as (string | null)[];
      const views: Record<string, number> = {};
      ids.forEach((id, i) => {
        views[id] = results[i] ? parseInt(results[i] as string, 10) || 0 : 0;
      });
      return res.status(200).json({ views });
    }

    // GET: 단일 글
    const id = req.query.id as string;
    if (!id || !/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
      return res.status(400).json({ error: "invalid_id" });
    }
    const raw = (await redis(["GET", `views:${id}`])) as string | null;
    return res.status(200).json({ id, views: raw ? parseInt(raw, 10) || 0 : 0 });
  } catch (e) {
    return res.status(500).json({ error: "counter_error", message: (e as Error).message });
  }
}
