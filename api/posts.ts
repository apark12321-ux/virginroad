import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * 외부 게시물 발행 API - 현재 비활성화 상태
 *
 * 이 API는 의도적으로 비활성화되어 있습니다.
 * - 콘텐츠 품질 통제와 애드센스 정책 준수를 위해
 * - 외부에서의 자동 발행을 일시 차단합니다.
 *
 * 복원 방법:
 * 1. api/posts.ts.disabled.bak 의 내용을 이 파일로 복사
 * 2. firestore.rules 에서 쓰기 권한 조정
 * 3. 환경변수 BLOG_STUDIO_API_KEY 설정 확인
 */

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key");

  return res.status(503).json({
    error: "Service Unavailable",
    message: "외부 게시물 발행 API는 현재 비활성화 상태입니다.",
    status: "disabled",
  });
}
