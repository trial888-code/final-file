import { createClient } from "@/lib/supabase/server";
import { AdminChatInbox, type AdminConversation } from "@/components/admin/admin-chat-inbox";

export default async function AdminChatPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const { userId } = await searchParams;
  const supabase = await createClient();

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, user_id, updated_at, user:profiles!conversations_user_id_fkey(full_name, email, is_online)")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  return (
    <div>
      <div className="mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Customer Chat</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Search any user to message them, or reply to existing chats in real time.
        </p>
      </div>

      <AdminChatInbox
        conversations={(conversations as AdminConversation[]) || []}
        initialUserId={userId}
      />
    </div>
  );
}
