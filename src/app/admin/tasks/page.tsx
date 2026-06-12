import { AdminTaskReviewList } from "@/components/tasks/admin-task-review-list";
import { TaskSubmissionsLiveRefresh } from "@/components/tasks/task-submissions-live-refresh";
import { getPendingTaskSubmissions } from "@/lib/actions/daily-tasks";
export default async function AdminTasksPage() {
  const submissions = await getPendingTaskSubmissions();

  return (
    <div>
      <TaskSubmissionsLiveRefresh />
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Task Submissions</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Review player proof and approve tasks to award points
        </p>
      </div>
      <AdminTaskReviewList submissions={submissions} />
    </div>
  );
}
