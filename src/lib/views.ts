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
 * - 새로고침해도 카운트되지만, 같은 글을 30초 이내에 다시 열면 무시(F5 도배 방지).
 * - fetchAllViews()로 전체 조회수를 한 번에 읽어 카드·목록에 표시.
 *
 * 실제 방문 기반 누적값이며 임의로 만든 숫자가 아닙니다.
 * Firestore 규칙에서 'count +1' 형태의 업데이트만 허용해 조작을 차단합니다.
 */

const COOLDOWN_KEY = "view_cooldowns";
const COOLDOWN_MS = 30 * 1000; // 같은 글 30초 이내 재조회는 카운트하지 않음

/** 30초 쿨다운 중인지 확인 (localStorage에 글별 마지막 조회 시각 저장). */
function isOnCooldown(postId: string): boolean {
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY);
    if (!raw) return false;
    const map: Record<string, number> = JSON.parse(raw);
    const last = map[postId];
    if (!last) return false;
    return Date.now() - last < COOLDOWN_MS;
  } catch {
    return false;
  }
}

/** 조회 시각 기록 + 오래된 항목 정리. */
function stampViewed(postId: string): void {
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    map[postId] = now;
    // 24시간 지난 기록은 정리 (localStorage 비대화 방지)
    for (const key of Object.keys(map)) {
      if (now - map[key] > 24 * 60 * 60 * 1000) delete map[key];
    }
    localStorage.setItem(COOLDOWN_KEY, JSON.stringify(map));
  } catch {
    /* localStorage 사용 불가 환경에서는 조용히 무시 */
  }
}

/**
 * 글 조회 시 호출 — 새로고침해도 카운트되지만, 같은 글 30초 이내 연속 조회는 무시(도배 방지).
 * 실패해도 화면에는 영향 없음.
 */
export async function recordView(postId: string): Promise<number | null> {
  if (!postId) return null;
  if (isOnCooldown(postId)) return null;

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
    // DB 쓰기가 성공한 경우에만 쿨다운 시각 기록
    stampViewed(postId);
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
