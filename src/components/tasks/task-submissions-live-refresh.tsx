"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TASK_SUBMISSION_EVENT } from "@/lib/chat/events";

/** Refreshes task pages when submissions change in realtime. */
export function TaskSubmissionsLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    function onUpdate() {
      router.refresh();
    }

    window.addEventListener(TASK_SUBMISSION_EVENT, onUpdate);
    return () => window.removeEventListener(TASK_SUBMISSION_EVENT, onUpdate);
  }, [router]);

  return null;
}
