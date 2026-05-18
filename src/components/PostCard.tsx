
import { Post } from "../types";
import { calculateReadTime } from "../lib/utils";

interface PostCardProps {
  post: Post;
  onClick: (id: string) => void;
  index?: number;
}

export function PostCard({ post, onClick }: PostCardProps) {
  const dynamicReadTime = calculateReadTime(post.content);

  return (
    <article
      className="group cursor-pointer"
      onClick={() => onClick(post.id)}
      id={`post-${post.id}`}
    >
      {/* Image — large, no border */}
      <div className="relative aspect-[4/5] overflow-hidden bg-[#F5F5F5] rounded-lg mb-4">
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
      </div>

      {/* Category */}
      <p className="text-[12px] font-medium text-[#888888] mb-2">
        {post.category}
      </p>

      {/* Title */}
      <h3 className="text-[16px] sm:text-[17px] font-bold leading-[1.4] text-[#111111] mb-2 break-keep line-clamp-3 group-hover:underline underline-offset-2 decoration-1">
        {post.title}
      </h3>

      {/* Excerpt */}
      <p className="text-[14px] leading-[1.5] text-[#4A4A4A] line-clamp-2 break-keep mb-3">
        {post.excerpt}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-2 text-[12px] text-[#888888]">
        <span>{post.date.replace(/-/g, ". ")}</span>
        <span className="w-[2px] h-[2px] bg-[#DADADA] rounded-full" />
        <span>{dynamicReadTime} 읽기</span>
      </div>
    </article>
  );
}
