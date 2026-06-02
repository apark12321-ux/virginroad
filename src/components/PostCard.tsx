
import { Post } from "../types";
import { calculateReadTime } from "../lib/utils";
import { Clock, Eye } from "lucide-react";
import { formatViews } from "../lib/views";

interface PostCardProps {
  post: Post;
  onClick: (id: string) => void;
  index?: number;
  views?: number;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  "신혼금융": { bg: "#EEF0FB", text: "#B0432F" },
  "신혼가전": { bg: "#F5F6FD", text: "#5B5870" },
  "결혼준비": { bg: "#FFD2BD", text: "#6B2418" },
};

export function PostCard({ post, onClick, views }: PostCardProps) {
  const dynamicReadTime = calculateReadTime(post.content);
  const colors = CATEGORY_COLORS[post.category] || CATEGORY_COLORS["신혼금융"];

  return (
    <article
      className="group cursor-pointer card-warm overflow-hidden flex flex-col h-full"
      onClick={() => onClick(post.id)}
      id={`post-${post.id}`}
    >
      {/* Image */}
      <div className="relative aspect-[5/4] overflow-hidden bg-[#F5F6FD]">
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
            className="inline-flex items-center text-[12px] font-bold px-3 py-1 rounded-full tracking-tight"
          >
            {post.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {/* Title */}
        <h3 className="text-[16px] sm:text-[17px] font-bold leading-[1.4] text-[#151320] mb-2.5 break-keep line-clamp-2 group-hover:text-[#E8745F] transition-colors tracking-[-0.018em]">
          {post.title}
        </h3>

        {/* Excerpt */}
        <p className="text-[14px] leading-[1.6] text-[#5B5870] line-clamp-2 break-keep mb-4 flex-1 tracking-[-0.012em]">
          {post.excerpt}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-2 text-[12px] text-[#8A87A0] pt-3 border-t border-[#EDEEF7]">
          <span className="font-medium">{post.date.replace(/-/g, ". ")}</span>
          <span className="w-[3px] h-[3px] bg-[#B5B3C8] rounded-full" />
          <Clock className="w-3 h-3" />
          <span>{dynamicReadTime}</span>
          {typeof views === "number" && views > 0 && (
            <>
              <span className="w-[3px] h-[3px] bg-[#B5B3C8] rounded-full" />
              <Eye className="w-3 h-3" />
              <span>{formatViews(views)}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
