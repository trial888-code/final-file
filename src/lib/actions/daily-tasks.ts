"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { creditUserWallet } from "@/lib/actions/wallet";
import { createNotification } from "@/lib/actions/notifications";
import { isTaskUnlocked as checkTaskUnlocked } from "@/lib/tasks/utils";
import {
  TASK_LEVELS,
  getTaskById,
  getTasksForLevel,
  type TaskLevelMeta,
} from "@/lib/tasks/definitions";
import type { TaskSubmission, UserLevelProgress } from "@/lib/tasks/types";
import { notifyAdminOfTaskSubmission } from "@/lib/telegram/notify-admin-task-submission";

export type { TaskSubmission, UserLevelProgress, TaskSubmissionStatus, LevelStatus } from "@/lib/tasks/types";

export interface TaskBoardData {
  levels: TaskLevelMeta[];
  levelProgress: UserLevelProgress[];
  submissions: TaskSubmission[];
  totalPointsEarned: number;
  totalCashEarned: number;
  activeLevel: number;
}

async function ensureUserLevels(userId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("user_task_levels")
    .select("level")
    .eq("user_id", userId)
    .limit(1);

  if (!existing?.length) {
    await supabase.rpc("init_user_task_levels", { p_user_id: userId });
  }
}

export async function getTaskBoard(userId?: string): Promise<TaskBoardData | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  let targetId = user.id;
  if (userId && userId !== user.id) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return { error: "Unauthorized" };
    targetId = userId;
  }

  await ensureUserLevels(targetId);

  const [{ data: levelProgress }, { data: submissions }] = await Promise.all([
    supabase.from("user_task_levels").select("*").eq("user_id", targetId).order("level"),
    supabase.from("user_task_submissions").select("*").eq("user_id", targetId),
  ]);

  if (!levelProgress) {
    return { error: "Daily tasks not set up. Run supabase/daily-tasks.sql in Supabase." };
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

  return {
    levels: TASK_LEVELS,
    levelProgress: progress,
    submissions: subs,
    totalPointsEarned,
    totalCashEarned,
    activeLevel,
  };
}

export async function submitTaskForReview(taskId: string, proofNote: string, proofUrl?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const task = getTaskById(taskId);
  if (!task) return { error: "Invalid task" };

  const note = proofNote.trim();
  const url = proofUrl?.trim() || "";

  if (!note && !url) {
    return { error: "Please describe what you did or upload a screenshot as proof." };
  }

  if (note && note.length < 3 && !url) {
    return { error: "Please add a bit more detail in your proof note." };
  }

  await ensureUserLevels(user.id);

  const board = await getTaskBoard();
  if ("error" in board) return { error: board.error };

  const check = checkTaskUnlocked(taskId, board.levelProgress, board.submissions);
  if (!check.unlocked) return { error: check.reason ?? "Task locked" };

  const existing = board.submissions.find((s) => s.task_id === taskId);
  if (existing?.status === "rejected") {
    const { error } = await supabase
      .from("user_task_submissions")
      .update({
        status: "pending",
        proof_note: note,
        proof_url: url || null,
        admin_note: null,
        reviewed_by: null,
        reviewed_at: null,
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("user_task_submissions").insert({
      user_id: user.id,
      task_id: taskId,
      level: task.level,
      status: "pending",
      proof_note: note,
      proof_url: url || null,
    });

    if (error) {
      if (error.message.includes("user_task")) {
        return { error: "Run supabase/daily-tasks.sql in Supabase SQL Editor." };
      }
      return { error: error.message };
    }
  }

  void notifyAdminOfTaskSubmission({
    userId: user.id,
    taskTitle: task.title,
    taskId: task.id,
    level: task.level,
    proofNote: note || null,
    hasImage: Boolean(url),
  });

  revalidatePath("/dashboard/tasks");
  revalidatePath("/admin/tasks");
  return { success: true };
}

async function tryCompleteLevel(userId: string, level: number) {
  const supabase = await createClient();
  const levelMeta = TASK_LEVELS.find((l) => l.level === level);
  if (!levelMeta) return;

  const levelTasks = getTasksForLevel(level);
  const { data: subs } = await supabase
    .from("user_task_submissions")
    .select("*")
    .eq("user_id", userId)
    .eq("level", level)
    .eq("status", "approved");

  const approved = (subs ?? []) as TaskSubmission[];
  const approvedIds = new Set(approved.map((s) => s.task_id));
  const allDone = levelTasks.every((t) => approvedIds.has(t.id));
  const points = approved.reduce((sum, s) => sum + s.points_awarded, 0);

  if (!allDone || points < levelMeta.pointsRequired) return;

  const { data: levelRow } = await supabase
    .from("user_task_levels")
    .select("reward_granted")
    .eq("user_id", userId)
    .eq("level", level)
    .single();

  if (levelRow?.reward_granted) return;

  await supabase.rpc("upsert_user_task_level", {
    p_user_id: userId,
    p_level: level,
    p_points: points,
    p_status: "completed",
    p_reward_granted: true,
  });

  await creditUserWallet(
    userId,
    levelMeta.cashReward,
    "cashout",
    "daily_task",
    `Level ${level} task reward — ${levelMeta.name}`
  );

  await createNotification(
    userId,
    `Level ${level} complete! 🎉`,
    `$${levelMeta.cashReward} added to your Cashout wallet. Level ${Math.min(level + 1, 10)} is now unlocked!`,
    "success"
  );
}

export async function adminReviewTaskSubmission(
  submissionId: string,
  approve: boolean,
  adminNote?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Admin only" };

  const { data: submission } = await supabase
    .from("user_task_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (!submission) return { error: "Submission not found" };
  if (submission.status !== "pending") return { error: "Already reviewed" };

  const task = getTaskById(submission.task_id);
  if (!task) return { error: "Task definition missing" };

  if (approve) {
    const { error } = await supabase
      .from("user_task_submissions")
      .update({
        status: "approved",
        points_awarded: task.points,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_note: adminNote?.trim() || null,
      })
      .eq("id", submissionId);

    if (error) return { error: error.message };

    await supabase.rpc("upsert_user_task_level", {
      p_user_id: submission.user_id,
      p_level: task.level,
      p_points: task.points,
      p_status: "active",
      p_reward_granted: false,
    });

    await createNotification(
      submission.user_id,
      "Task approved! ⭐",
      `"${task.title}" approved — +${task.points} points earned.`,
      "success"
    );

    await tryCompleteLevel(submission.user_id, task.level);
  } else {
    const { error } = await supabase
      .from("user_task_submissions")
      .update({
        status: "rejected",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_note: adminNote?.trim() || "Please resubmit with clearer proof.",
      })
      .eq("id", submissionId);

    if (error) return { error: error.message };

    await createNotification(
      submission.user_id,
      "Task needs revision",
      `"${task.title}" was not approved. Check your proof and try again.`,
      "warning"
    );
  }

  revalidatePath("/dashboard/tasks");
  revalidatePath("/admin/tasks");
  return { success: true };
}

export async function getPendingTaskSubmissions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return [];

  const { data } = await supabase
    .from("user_task_submissions")
    .select("*, user:profiles!user_task_submissions_user_id_fkey(full_name, email)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return data ?? [];
}
