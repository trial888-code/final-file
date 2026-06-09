"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface MobileChatShellProps {
  open: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Full-screen mobile chat overlay — escapes parent overflow/clipping */
export function MobileChatShell({ open, children, className }: MobileChatShellProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-x-0 top-14 bottom-0 z-[200] flex flex-col bg-[#0f0f0f] md:hidden",
        className
      )}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>,
    document.body
  );
}
