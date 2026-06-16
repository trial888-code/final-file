"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Lock, XCircle, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TaskProofForm } from "@/components/tasks/task-proof-form";
import { isTaskUnlocked, getLevelTaskProgress } from "@/lib/tasks/utils";
import { formatTaskDay, getTasksForLevel, type TaskDefinition } from "@/lib/tasks/definitions";
import type { TaskBoardData } from "@/lib/actions/daily-tasks";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: TaskDefinition;
  board: TaskBoardData;
  compact?: boolean;
}

export function TaskCard({ task, board, compact }: TaskCardProps) {
  const router = useRouter();
  const [showSubmit, setShowSubmit] = useState(false);

  const state = isTaskUnlocked(task.id, board.levelProgress, board.submissions);
  const levelProgress = getLevelTaskProgress(
    task.level,
    board.submissions,
    getTasksForLevel(task.level).length
  );

  const actionBtn = task.external ? (
    <a
      href={task.actionHref}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center rounded-lg px-4 py-2 text-xs font-bold transition-opacity",
        state.status === "available" || state.status === "rejected"
          ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:opacity-90"
          : "bg-white/10 text-muted-foreground pointer-events-none"
      )}
    >
      {task.actionLabel}
    </a>
  ) : (
    <Button
      asChild
      size="sm"
      disabled={state.status !== "available" && state.status !== "rejected"}
      className="bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold"
    >
      <Link href={task.actionHref}>{task.actionLabel}</Link>
    </Button>
  );

  return (
    <article
      className={cn(
        "rounded-xl border p-4 sm:p-5 transition-colors",
        state.status === "approved"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : state.status === "pending"
            ? "border-amber-500/30 bg-amber-500/5"
            : state.status === "locked"
              ? "border-white/5 bg-[#141414] opacity-60"
              : "border-orange-500/20 bg-[#161616]"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-400">
              {formatTaskDay(task.level)}
            </span>
            <span className="text-[10px] text-muted-foreground capitalize">{task.category}</span>
            {state.status === "approved" && (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            )}
            {state.status === "pending" && <Clock className="h-3.5 w-3.5 text-amber-400" />}
            {state.status === "locked" && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
            {state.status === "rejected" && <XCircle className="h-3.5 w-3.5 text-red-400" />}
          </div>
          <h3 className="font-semibold text-white text-sm sm:text-base">{task.title}</h3>
          {!compact && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{task.description}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-amber-400">+{task.points}</p>
          <p className="text-[10px] text-muted-foreground">pts</p>
        </div>
      </div>

      {!compact && board.activeLevel === task.level && state.status !== "locked" && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Day progress</span>
            <span>
              {levelProgress.approved}/{levelProgress.total}
            </span>
          </div>
          <Progress value={levelProgress.percent} className="h-1.5" />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-1.5 text-xs text-amber-300/80">
          <Coins className="h-3.5 w-3.5" />
          <span>Get points → real cash at level end</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(state.status === "available" || state.status === "rejected") && (
            <>
              {actionBtn}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowSubmit((v) => !v)}
                className="text-xs"
              >
                {state.status === "rejected" ? "Resubmit" : "Mark Done"}
              </Button>
            </>
          )}
          {state.status === "pending" && (
            <span className="text-xs text-amber-400 font-medium px-3 py-2">Awaiting review</span>
          )}
          {state.status === "approved" && (
            <span className="text-xs text-emerald-400 font-medium px-3 py-2">Completed ✓</span>
          )}
          {state.status === "locked" && (
            <span className="text-xs text-muted-foreground px-3 py-2">{state.reason}</span>
          )}
        </div>
      </div>

      {showSubmit && (state.status === "available" || state.status === "rejected") && (
        <TaskProofForm
          taskId={task.id}
          onSuccess={() => {
            setShowSubmit(false);
            router.refresh();
          }}
          onCancel={() => setShowSubmit(false)}
        />
      )}
    </article>
  );
}
