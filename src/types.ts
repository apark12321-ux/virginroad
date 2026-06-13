export interface Post {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: "신혼금융" | "신혼가전" | "결혼준비";
  author: string;
  date: string;
  updated?: string;
  image: string;
  readTime: string;
  hashtags?: string[];
}

export type Category = Post["category"];
