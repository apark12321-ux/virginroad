import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateReadTime(content: string): string {
  const charactersPerMinute = 500;
  // Remove HTML tags if any (basic check)
  const plainText = content.replace(/<[^>]*>/g, "");
  const minutes = Math.ceil(plainText.length / charactersPerMinute);
  return `${minutes}분`;
}

/**
 * 제목을 URL 친화적 slug로 변환.
 * - 영문/한글/숫자/하이픈만 남김 (한글 그대로 유지)
 * - 공백 → 하이픈
 * - 특수문자 제거
 * - 연속 하이픈 정리
 * - 최대 80자 (너무 긴 URL 방지)
 */
export function slugify(title: string): string {
  if (!title) return "";
  return title
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\uAC00-\uD7A3\-]/g, "") // 영숫자, 한글, 하이픈만
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 25)
    .replace(/-+$/g, ""); // slice 후 끝에 하이픈 남으면 제거
}

/**
 * HTML 태그를 제거하고 일반 텍스트만 반환.
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
