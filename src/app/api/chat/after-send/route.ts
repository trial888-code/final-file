import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/actions/notifications";
import { notifyAdminOfCustomerMessage } from "@/lib/telegram/notify-admin-message";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: {
    conversationId?: string;
    content?: string;
    attachmentType?: "image" | "file" | null;
    kind?: "user" | "admin";
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { conversationId, content = "", attachmentType = null, kind } = body;
  if (!conversationId || !kind) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";

  if (kind === "admin") {
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { data: conversation } = await supabase
      .from("conversations")
      .select("user_id")
      .eq("id", conversationId)
      .single();

    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString(), admin_id: user.id })
      .eq("id", conversationId);

    if (conversation?.user_id) {
      const preview =
        content.trim() ||
        (attachmentType === "image"
          ? "Sent you an image"
          : attachmentType === "file"
            ? "Sent you a file"
            : "Sent you a message");
      await createNotification(
        conversation.user_id,
        "New message from Support",
        preview.length > 140 ? `${preview.slice(0, 137)}...` : preview,
        "info"
      );
    }
  } else {
    const { data: conversation } = await supabase
      .from("conversations")
      .select("user_id")
      .eq("id", conversationId)
      .single();

    if (!conversation || conversation.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const bumpClient = adminClient ?? supabase;
    await bumpClient
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    void notifyAdminOfCustomerMessage({
      conversationId,
      senderId: user.id,
      content,
      attachmentType,
    });
  }

  return NextResponse.json({ ok: true });
}
