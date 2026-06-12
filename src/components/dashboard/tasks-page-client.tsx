"use client";

import { useEffect, useState } from "react";
import { DailyTasksClient } from "@/components/tasks/daily-tasks-client";
import { TaskSubmissionsLiveRefresh } from "@/components/tasks/task-submissions-live-refresh";
import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardRouteLoading } from "@/components/dashboard/dashboard-route-loading";
import { useDashboardSession } from "@/lib/dashboard/use-dashboard-session";
import { TASK_LEVELS } from "@/lib/tasks/definitions";
import type { TaskBoardData } from "@/lib/actions/daily-tasks";
import type { TaskSubmission, UserLevelProgress } from "@/lib/tasks/types";

export function TasksPageClient() {
  const { supabase, userId, ready } = useDashboardSession();
  const [board, setBoard] = useState<TaskBoardData | { error: string } | null>(null);

  useEffect(() => {
    if (!ready || !supabase || !userId) return;

    let cancelled = false;

    async function load() {
      const { data: existing } = await supabase!
        .from("user_task_levels")
        .select("level")
        .eq("user_id", userId!)
        .limit(1);

      if (!existing?.length) {
        await supabase!.rpc("init_user_task_levels", { p_user_id: userId! });
      }

      const [{ data: levelProgress }, { data: submissions }] = await Promise.all([
        supabase!.from("user_task_levels").select("*").eq("user_id", userId!).order("level"),
        supabase!.from("user_task_submissions").select("*").eq("user_id", userId!),
      ]);

      if (cancelled) return;

      if (!levelProgress) {
        setBoard({
          error: "Daily tasks not set up. Run supabase/daily-tasks.sql in Supabase.",
        });
        return;
      }

      const progress = (levelProgress ?? []) as UserLevelProgress[];
      const subs = (submissions ?? []) as TaskSubmission[];

      const activeLevel =
        progress.find((l) => l.status === "active")?.level ??
        progress.find((l) => l.status === "completed")?.level ??
        1;

      const totalPointsEarned = subs
        .filter((s) => s.status === "approved")
        .reduce((sum, s) => sum + s.points_awarded, 0);

      const totalCashEarned = progress
        .filter((l) => l.reward_granted)
        .reduce((sum, l) => {
          const meta = TASK_LEVELS.find((t) => t.level === l.level);
          return sum + (meta?.cashReward ?? 0);
        }, 0);

      setBoard({
        levels: TASK_LEVELS,
        levelProgress: progress,
        submissions: subs,
        totalPointsEarned,
        totalCashEarned,
        activeLevel,
      });
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [ready, supabase, userId]);

  if (!board) {
    return <DashboardRouteLoading cards={3} />;
  }

  if ("error" in board) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{board.error}</p>
      </div>
    );
  }

  return (
    <div>
      <TaskSubmissionsLiveRefresh />
      <DashboardPageHeader
        title="Daily Tasks"
        description="Complete levels 1–10, earn points, and unlock real cash to your Cashout wallet"
      />
      <DailyTasksClient board={board} />
    </div>
  );
}
