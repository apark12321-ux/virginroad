import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  getDocs,
} from "firebase/firestore";

/**
 * 조회수 집계 헬퍼.
 *
 * - 글을 열 때 recordView(postId)를 호출하면 Firestore의 views/{postId}.count를 1 증가.
 * - 같은 세션에서 같은 글을 여러 번 열어도 1회만 카운트(sessionStorage로 중복 방지).
 * - fetchAllViews()로 전체 조회수를 한 번에 읽어 카드·목록에 표시.
 *
 * 실제 방문 기반 누적값이며 임의로 만든 숫자가 아닙니다.
 * Firestore 규칙에서 'count +1' 형태의 업데이트만 허용해 조작을 차단합니다.
 */

const SESSION_KEY = "viewed_posts";

function alreadyViewedThisSession(postId: string): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const list: string[] = JSON.parse(raw);
    return list.includes(postId);
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
    /* sessionStorage 사용 불가 환경에서는 조용히 무시 */
  }
}

/** 글 조회 시 호출 — 세션당 1회만 카운트. 실패해도 화면에는 영향 없음. */
export async function recordView(postId: string): Promise<void> {
  if (!postId) return;
  if (alreadyViewedThisSession(postId)) return;
  markViewedThisSession(postId);

  try {
    const ref = doc(db, "views", postId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      await updateDoc(ref, { count: increment(1) });
    } else {
      await setDoc(ref, { count: 1 });
    }
  } catch {
    /* 네트워크/권한 오류 시 조용히 무시 — 조회수는 부가 기능 */
  }
}

/** 단일 글 조회수 읽기. */
export async function fetchView(postId: string): Promise<number> {
  try {
    const snap = await getDoc(doc(db, "views", postId));
    return snap.exists() ? (snap.data().count as number) || 0 : 0;
  } catch {
    return 0;
  }
}

/** 전체 글 조회수를 { postId: count } 형태로 읽기. */
export async function fetchAllViews(): Promise<Record<string, number>> {
  try {
    const snap = await getDocs(collection(db, "views"));
    const out: Record<string, number> = {};
    snap.forEach((d) => {
      out[d.id] = (d.data().count as number) || 0;
    });
    return out;
  } catch {
    return {};
  }
}

/** 조회수 표시용 포맷: 1234 → "1.2천", 12345 → "1.2만" */
export function formatViews(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}천`;
  return n.toLocaleString();
}
