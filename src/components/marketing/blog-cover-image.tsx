"use client";

import { useState } from "react";
import Image from "next/image";
import { BookOpen } from "lucide-react";

import { isPhotoCover, isRemoteBlogCover } from "@/lib/blog-cover";
import { cn } from "@/lib/utils";

type BlogCoverImageProps = {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  variant?: "card" | "hero";
};

export function BlogCoverImage({
  src,
  alt,
  priority = false,
  sizes = "(max-width: 640px) 100vw, 33vw",
  className,
  variant = "card",
}: BlogCoverImageProps) {
  const [failed, setFailed] = useState(false);
  const isPhoto = isPhotoCover(src);

  if (failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1208] via-[#141414] to-[#0d1a12]">
        <BookOpen className="h-10 w-10 text-white/15" aria-hidden />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={isRemoteBlogCover(src)}
      className={cn(
        isPhoto || variant === "hero"
          ? "object-cover object-center transition-transform duration-500 group-hover:scale-105"
          : "object-contain object-center p-6",
        className
      )}
      onError={() => setFailed(true)}
    />
  );
}
