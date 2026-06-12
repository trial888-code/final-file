"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { getTaskBoard, type TaskBoardData } from "@/lib/actions/daily-tasks";
import type { SupabaseClient } from "@supabase/supabase-js";

const DailyTaskPopup = dynamic(
  () => import("@/components/tasks/daily-task-popup").then((m) => m.DailyTaskPopup),
  { ssr: false }
);

/** Show daily task popup on home `/` for logged-in users, once per full page load. */
export function DailyTaskPopupLoader() {
  const pathname = usePathname();
  const [board, setBoard] = useState<TaskBoardData | null>(null);
  const shownThisVisit = useRef(false);
  const fetchInFlight = useRef(false);

  useEffect(() => {
    if (pathname !== "/") {
      setBoard(null);
      return;
    }

    if (shownThisVisit.current) return;

    const maybeClient = createClient();
    if (!maybeClient) return;
    const supabase: SupabaseClient = maybeClient;

    let cancelled = false;

    async function loadBoard() {
      if (cancelled || shownThisVisit.current || fetchInFlight.current) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled || shownThisVisit.current || !session?.user) return;

      fetchInFlight.current = true;
      try {
        const result = await getTaskBoard();
        if (cancelled || shownThisVisit.current) return;
        if ("error" in result) {
          console.warn("[DailyTaskPopup]", result.error);
          return;
        }
        shownThisVisit.current = true;
        setBoard(result);
      } finally {
        fetchInFlight.current = false;
      }
    }

    void loadBoard();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled || shownThisVisit.current || !session?.user) return;
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        void loadBoard();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [pathname]);

  if (pathname !== "/" || !board) return null;

  return <DailyTaskPopup board={board} onClose={() => setBoard(null)} />;
}
