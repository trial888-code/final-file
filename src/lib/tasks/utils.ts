import { getTaskById } from "@/lib/tasks/definitions";
import type { TaskSubmission, UserLevelProgress } from "@/lib/tasks/types";

function getLevelStatus(level: number, progress: UserLevelProgress[]) {
  return progress.find((p) => p.level === level)?.status ?? "locked";
}

export function isTaskUnlocked(
  taskId: string,
  levelProgress: UserLevelProgress[],
  submissions: TaskSubmission[]
): { unlocked: boolean; reason?: string; status?: "available" | "pending" | "approved" | "rejected" | "locked" } {
  const task = getTaskById(taskId);
  if (!task) return { unlocked: false, reason: "Task not found", status: "locked" };

  const levelStat = getLevelStatus(task.level, levelProgress);
  if (levelStat === "locked") {
    return { unlocked: false, reason: `Complete Level ${task.level - 1} first`, status: "locked" };
  }

  const existing = submissions.find((s) => s.task_id === taskId);
  if (existing?.status === "approved") {
    return { unlocked: false, reason: "Completed", status: "approved" };
  }
  if (existing?.status === "pending") {
    return { unlocked: false, reason: "Awaiting admin review", status: "pending" };
  }
  if (existing?.status === "rejected") {
    return { unlocked: true, reason: "Resubmit with better proof", status: "rejected" };
  }

  if (levelStat === "completed") {
    return { unlocked: false, reason: "Level completed", status: "locked" };
  }

  return { unlocked: true, status: "available" };
}

export function getLevelTaskProgress(
  level: number,
  submissions: TaskSubmission[],
  taskCount: number
) {
  const approved = submissions.filter(
    (s) => s.level === level && s.status === "approved"
  ).length;
  return { approved, total: taskCount, percent: taskCount ? Math.round((approved / taskCount) * 100) : 0 };
}
