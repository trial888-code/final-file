"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { getChatAttachmentSignedUrl } from "@/lib/chat/attachments";
import { isTaskProofStoragePath } from "@/lib/tasks/proof-upload";

interface TaskProofImageProps {
  path: string;
  alt?: string;
}

export function TaskProofImage({ path, alt = "Task proof screenshot" }: TaskProofImageProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (path.startsWith("http://") || path.startsWith("https://")) {
        setSrc(path);
        return;
      }

      if (!isTaskProofStoragePath(path)) {
        setSrc(null);
        return;
      }

      const supabase = createClient();
      if (!supabase) return;

      const signed = await getChatAttachmentSignedUrl(supabase, path, 3600);
      if (!cancelled) setSrc(signed);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!src) {
    return (
      <div className="h-32 w-full max-w-xs rounded-lg bg-white/5 animate-pulse border border-white/10" />
    );
  }

  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className="block max-w-xs">
      <div className="relative h-32 w-full rounded-lg overflow-hidden border border-white/10 hover:border-orange-500/40 transition-colors">
        <Image src={src} alt={alt} fill className="object-cover" unoptimized />
      </div>
      <span className="text-[10px] text-orange-400 mt-1 inline-block hover:underline">
        Open full image
      </span>
    </a>
  );
}
