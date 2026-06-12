import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message } from "@/types/database";

/** One realtime channel for all message inserts (faster than per-conversation channels). */
export function subscribeToMessageInserts(
  supabase: SupabaseClient,
  channelName: string,
  userId: string,
  onMessage: (message: Message) => void,
  options?: {
    /** When set, ignore messages outside these conversations (typical for customers). */
    conversationIds?: Set<string> | string[];
  }
) {
  const allowed =
    options?.conversationIds instanceof Set
      ? options.conversationIds
      : options?.conversationIds
        ? new Set(options.conversationIds)
        : null;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => {
        const msg = payload.new as Message;
        if (msg.sender_id === userId) return;
        if (allowed && !allowed.has(msg.conversation_id)) return;
        onMessage(msg);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
