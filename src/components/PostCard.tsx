
import { Post } from "../types";
import { Calendar, Clock } from "lucide-react";
import { motion } from "motion/react";
import { calculateReadTime } from "../lib/utils";

interface PostCardProps {
  post: Post;
  onClick: (id: string) => void;
  index?: number;
}

export function PostCard({ post, onClick, index = 0 }: PostCardProps) {
  const dynamicReadTime = calculateReadTime(post.content);

  // Number prefix for editorial feel
  const num = String(index + 1).padStart(2, "0");

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="h-full group cursor-pointer"
      onClick={() => onClick(post.id)}
      id={`post-${post.id}`}
    >
      <div className="bg-[#FFFDF9] border border-[#E5DDD0] overflow-hidden h-full flex flex-col transition-all duration-500 hover:border-[#C9A961]">
        {/* Image with overlay */}
        <div className="relative aspect-[4/3] overflow-hidden bg-[#EDE5D6]">
          <img
            src={post.image}
            alt={post.title}
            referrerPolicy="no-referrer"
            className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&q=80&w=800";
            }}
          />
          {/* Subtle warm overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#2A2520]/15 via-transparent to-transparent" />
          {/* Category eyebrow */}
          <div className="absolute top-4 left-4">
            <span className="font-eyebrow text-[10px] tracking-[0.35em] uppercase text-[#FAF7F2] bg-[#7C2D3B] px-3 py-1.5">
              {post.category}
            </span>
          </div>
          {/* Number */}
          <div className="absolute bottom-4 right-4">
            <span className="font-display italic text-2xl text-[#FAF7F2] mix-blend-difference">
              № {num}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 lg:p-7 flex flex-col flex-grow">
          {/* Meta */}
          <div className="flex items-center gap-3 text-[11px] text-[#B8AC9C] mb-3 font-eyebrow tracking-widest uppercase">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> {post.date}
            </span>
            <span className="text-[#C9A961]">·</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> {dynamicReadTime}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-display text-xl lg:text-[22px] font-medium leading-tight text-[#2A2520] group-hover:text-[#7C2D3B] transition-colors duration-300 mb-3 line-clamp-3 tracking-tight break-keep">
            {post.title}
          </h3>

          {/* Excerpt */}
          <p className="text-sm text-[#6B6258] leading-relaxed line-clamp-3 break-keep flex-grow">
            {post.excerpt}
          </p>

          {/* Author + arrow */}
          <div className="mt-5 pt-4 border-t border-[#E5DDD0] flex items-center justify-between">
            <span className="font-eyebrow text-[11px] tracking-[0.25em] uppercase text-[#7C2D3B]">
              {post.author}
            </span>
            <span className="font-display italic text-sm text-[#C9A961] group-hover:translate-x-1 transition-transform duration-300">
              read →
            </span>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
