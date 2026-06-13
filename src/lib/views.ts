import { db, auth } from "./firebase";
import { doc, getDoc, getDocs, collection, query, where, documentId, runTransaction, setDoc, increment } from "firebase/firestore";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Error (Handled): ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * 조회수 헬퍼 (Firebase Firestore 기반 실시간 조회수)
 *
 * - recordView(id): 글 진입·새로고침할 때마다 조회수 1 증가 (Firestore Transaction)
 * - fetchAllViews(ids): 여러 글 조회수를 한 번에 읽어 카드·목록에 표시
 * - 카운터 미설정(오류) 시 조회수는 숨김 — 가짜 숫자를 만들지 않음
 */

/** 글 조회 시 호출 — 호출(새로고침)할 때마다 1 증가. 반환: 최신 조회수 또는 null(오류). */
export async function recordView(postId: string): Promise<number | null> {
  if (!postId) return null;

  const docRef = doc(db, "views", postId);

  // 1. First, attempt a light transaction to securely increase count
  try {
    const newViews = await runTransaction(db, async (transaction) => {
      const sfDoc = await transaction.get(docRef);
      if (!sfDoc.exists()) {
        transaction.set(docRef, { count: 1 });
        return 1;
      }
      const newCount = (sfDoc.data().count || 0) + 1;
      transaction.update(docRef, { count: newCount });
      return newCount;
    });
    
    return newViews;
  } catch (error) {
    console.warn("Transaction failed in recordView, attempting highly robust fallback with increment(1):", error);
    
    // 2. High-resiliency fallback: write increment(1) with merge and fetch updated value
    try {
      await setDoc(docRef, { count: increment(1) }, { merge: true });
      const snap = await getDoc(docRef);
      return snap.exists() ? (snap.data().count || 1) : 1;
    } catch (fallbackError) {
      try {
        handleFirestoreError(fallbackError, OperationType.WRITE, `views/${postId}`);
      } catch (thrownError) {
        console.warn("recordView robust fallback caught error silently:", thrownError);
      }
      return null;
    }
  }
}

/** 여러 글 조회수를 { id: count }로 읽기. 실패 시 빈 객체(조회수 숨김). */
export async function fetchAllViews(ids: string[] = []): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  
  try {
    const result: Record<string, number> = {};
    
    // 개별 문서에 대해 getDoc을 병렬로 수행함으로써 list 쿼리 권한 문제를 피하고 get 권한만 사용합니다.
    await Promise.all(
      ids.map(async (id) => {
        try {
          const docRef = doc(db, "views", id);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            result[id] = snap.data().count || 0;
          } else {
            result[id] = 0;
          }
        } catch (error) {
          try {
            handleFirestoreError(error, OperationType.GET, `views/${id}`);
          } catch (thrownError) {
            console.warn(`fetchAllViews individual document fetch error on ${id} handled gracefully:`, thrownError);
          }
        }
      })
    );
    
    return result;
  } catch (error) {
    console.error("Failed to fetch views from Firestore:", error);
    return {};
  }
}

/** 단일 글 조회수 읽기. */
export async function fetchView(postId: string): Promise<number | null> {
  if (!postId) return null;
  try {
    const snap = await getDoc(doc(db, "views", postId));
    return snap.exists() ? (snap.data().count || 0) : 0;
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.GET, `views/${postId}`);
    } catch (thrownError) {
      console.warn("fetchView caught and handled error silently:", thrownError);
    }
    return null;
  }
}

/** 조회수 표시 포맷: 1234 → "1.2천", 12345 → "1.2만" */
export function formatViews(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}천`;
  return n.toLocaleString();
}


