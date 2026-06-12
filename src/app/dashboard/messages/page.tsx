import dynamic from "next/dynamic";
import { CHAT_PAGE_SHELL_CLASS } from "@/lib/chat/chat-layout";
import { Skeleton } from "@/components/ui/skeleton";

const UserMessagesInbox = dynamic(
  () =>
    import("@/components/chat/user-messages-inbox").then((m) => ({
      default: m.UserMessagesInbox,
    })),
  {
    loading: () => (
      <div className="flex flex-col gap-3 h-full min-h-[320px] animate-pulse">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="flex-1 rounded-xl min-h-[240px]" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
    ),
  }
);

export default function MessagesPage() {
  return (
    <div className={CHAT_PAGE_SHELL_CLASS}>
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground">Chat with our support team — like Messenger</p>
      </div>

      <div className="flex-1 min-h-0">
        <UserMessagesInbox />
      </div>
    </div>
  );
}
