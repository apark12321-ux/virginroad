/**
 * 조회수 헬퍼 (Upstash Redis 기반 /api/views 호출)
 *
 * - recordView(id): 글 진입 시 조회수 1 증가. 같은 세션에서 같은 글은 1회만 증가(sessionStorage).
 * - fetchAllViews(ids): 여러 글 조회수를 한 번에 읽어 카드·목록에 표시.
 * - 카운터 미설정(503)이나 오류 시 조회수는 숨김 — 가짜 숫자를 만들지 않음.
 *
 * 전체 방문자 합산 조회수이며, 서버(Upstash)에서 중앙 집계됩니다.
 */

const SESSION_KEY = "viewed_posts";

function alreadyViewedThisSession(postId: string): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    return (JSON.parse(raw) as string[]).includes(postId);
  } catch {
    return false;
  }
}

function markViewedThisSession(postId: string): void {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!list.includes(postId)) {
      list.push(postId);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(list));
    }
  } catch {
    /* sessionStorage 불가 환경: 무시 */
  }
}

/** 글 조회 시 호출 — 세션당 1회 증가. 반환: 최신 조회수 또는 null(증가 안 함/오류). */
export async function recordView(postId: string): Promise<number | null> {
  if (!postId) return null;
  if (alreadyViewedThisSession(postId)) return null;

  try {
    const res = await fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: postId }),
    });
    if (!res.ok) return null; // 503(미설정) 등 → 조회수 숨김
    const data = (await res.json()) as { views?: number };
    markViewedThisSession(postId);
    return typeof data.views === "number" ? data.views : null;
  } catch {
    return null;
  }
}

/** 여러 글 조회수를 { id: count }로 읽기. 실패 시 빈 객체(조회수 숨김). */
export async function fetchAllViews(ids: string[] = []): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  try {
    const res = await fetch(`/api/views?ids=${encodeURIComponent(ids.join(","))}`);
    if (!res.ok) return {};
    const data = (await res.json()) as { views?: Record<string, number> };
    return data.views || {};
  } catch {
    return {};
  }
}

/** 단일 글 조회수 읽기. */
export async function fetchView(postId: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/views?id=${encodeURIComponent(postId)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { views?: number };
    return typeof data.views === "number" ? data.views : null;
  } catch {
    return null;
  }
}

/** 조회수 표시 포맷: 1234 → "1.2천", 12345 → "1.2만" */
export function formatViews(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}천`;
  return n.toLocaleString();
}
