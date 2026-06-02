import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";

/**
 * 조회수 집계 헬퍼.
 *
 * - 글을 열 때 recordView(postId)를 호출하면 Firestore의 views/{postId}.count를 1 증가.
 * - 새로고침할 때마다 카운트됩니다.
 * - fetchAllViews()로 전체 조회수를 한 번에 읽어 카드·목록에 표시.
 *
 * 실제 방문 기반 누적값이며 임의로 만든 숫자가 아닙니다.
 * Firestore 규칙에서 'count +1' 형태의 업데이트만 허용해 조작을 차단합니다.
 */

/**
 * 글 조회 시 호출 — 새로고침할 때마다 카운트됩니다.
 * 실패해도 화면에는 영향 없음.
 */
export async function recordView(postId: string): Promise<number | null> {
  if (!postId) return null;

  try {
    const ref = doc(db, "views", postId);
    const snap = await getDoc(ref);
    let next: number;
    if (snap.exists()) {
      const current = (snap.data().count as number) || 0;
      next = current + 1;
      // increment() 센티넬 대신 명시적 값 사용 — Firestore 규칙의 'count + 1' 검증과 호환
      await updateDoc(ref, { count: next });
    } else {
      next = 1;
      await setDoc(ref, { count: 1 });
    }
    return next;
  } catch {
    /* 네트워크/권한 오류 시 조용히 무시 — 조회수는 부가 기능 */
    return null;
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
