"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { adminReviewTaskSubmission } from "@/lib/actions/daily-tasks";
import { formatTaskDay, getTaskById } from "@/lib/tasks/definitions";
import { TaskProofImage } from "@/components/tasks/task-proof-image";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

interface AdminTaskReviewListProps {
  submissions: Array<{
    id: string;
    task_id: string;
    proof_note: string | null;
    proof_url: string | null;
    created_at: string;
    user: { full_name?: string | null; email?: string | null } | null;
  }>;
}

export function AdminTaskReviewList({ submissions }: AdminTaskReviewListProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function handleReview(id: string, approve: boolean) {
    setLoadingId(id);
    const result = await adminReviewTaskSubmission(id, approve, notes[id]);
    setLoadingId(null);
    if (result.error) toast.error(result.error);
    else toast.success(approve ? "Task approved" : "Task rejected");
    router.refresh();
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground rounded-xl border border-white/5">
        No pending task submissions.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((sub) => {
        const task = getTaskById(sub.task_id);
        const user = sub.user;
        return (
          <div key={sub.id} className="rounded-xl border border-white/10 bg-[#161616] p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
              <div>
                <p className="font-semibold">{task?.title ?? sub.task_id}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.full_name || user?.email?.split("@")[0] || "Player"} · {task ? formatTaskDay(task.level) : "Day ?"} · +
                  {task?.points} pts · {formatRelativeTime(sub.created_at)}
                </p>
              </div>
            </div>
            {sub.proof_note && (
              <p className="text-sm text-foreground/90 mb-2 whitespace-pre-wrap">{sub.proof_note}</p>
            )}
            {sub.proof_url ? (
              sub.proof_url.startsWith("task-proofs/") ||
              /\.(jpe?g|png|gif|webp)(\?|$)/i.test(sub.proof_url) ? (
                <div className="mb-2">
                  <TaskProofImage path={sub.proof_url} />
                </div>
              ) : (
                <a
                  href={sub.proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-orange-400 hover:underline break-all"
                >
                  {sub.proof_url}
                </a>
              )
            ) : null}
            <Textarea
              value={notes[sub.id] ?? ""}
              onChange={(e) => setNotes((n) => ({ ...n, [sub.id]: e.target.value }))}
              placeholder="Optional admin note to player..."
              rows={2}
              className="mt-3 text-sm bg-[#1a1a1a] border-white/10 resize-none"
            />
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => handleReview(sub.id, true)}
                disabled={loadingId === sub.id}
                className="gap-1.5"
              >
                <Check className="h-4 w-4" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReview(sub.id, false)}
                disabled={loadingId === sub.id}
                className="gap-1.5 text-red-400 hover:text-red-300"
              >
                <X className="h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
