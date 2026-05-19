
import { Post } from "../types";
import { calculateReadTime } from "../lib/utils";
import { Clock } from "lucide-react";

interface PostCardProps {
  post: Post;
  onClick: (id: string) => void;
  index?: number;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "신혼금융": { bg: "#FFE9D9", text: "#B0432F" },
  "신혼가전": { bg: "#FFF6EE", text: "#6B5D4A" },
  "결혼준비": { bg: "#FFD2BD", text: "#6B2418" },
};

export function PostCard({ post, onClick }: PostCardProps) {
  const dynamicReadTime = calculateReadTime(post.content);
  const colors = CATEGORY_COLORS[post.category] || CATEGORY_COLORS["신혼금융"];

  return (
    <article
      className="group cursor-pointer card-warm overflow-hidden flex flex-col h-full"
      onClick={() => onClick(post.id)}
      id={`post-${post.id}`}
    >
      {/* Image */}
      <div className="relative aspect-[5/4] overflow-hidden bg-[#FFF6EE]">
        <img
          src={post.image}
          alt={post.title}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&q=80&w=800";
          }}
        />
        {/* Category badge overlaid on image */}
        <div className="absolute top-3 left-3">
          <span
            style={{ backgroundColor: colors.bg, color: colors.text }}
            className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full"
          >
            {post.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Title */}
        <h3 className="text-[15px] sm:text-[16px] font-bold leading-[1.4] text-[#2C2419] mb-2 break-keep line-clamp-2 group-hover:text-[#E8745F] transition-colors">
          {post.title}
        </h3>

        {/* Excerpt */}
        <p className="text-[13px] leading-[1.55] text-[#6B5D4A] line-clamp-2 break-keep mb-3 flex-1">
          {post.excerpt}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-2 text-[11px] text-[#968670] pt-3 border-t border-[#F4EDE3]">
          <span className="font-medium">{post.date.replace(/-/g, ". ")}</span>
          <span className="w-[3px] h-[3px] bg-[#C8BBA8] rounded-full" />
          <Clock className="w-3 h-3" />
          <span>{dynamicReadTime}</span>
        </div>
      </div>
    </article>
  );
}
