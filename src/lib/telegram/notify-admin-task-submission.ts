import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/constants";
import { escapeTelegramHtml, isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram/client";
import { isAnyAdminOnline } from "@/lib/telegram/admin-presence";

export async function notifyAdminOfTaskSubmission(input: {
  userId: string;
  taskTitle: string;
  taskId: string;
  level: number;
  proofNote?: string | null;
  hasImage?: boolean;
}): Promise<void> {
  if (!isTelegramConfigured()) return;
  if (await isAnyAdminOnline()) return;

  const admin = createAdminClient();
  if (!admin) return;

  const { data: sender } = await admin
    .from("profiles")
    .select("full_name, email, role")
    .eq("id", input.userId)
    .single();

  if (!sender || sender.role === "admin") return;

  const displayName =
    sender.full_name?.trim() ||
    sender.email?.split("@")[0] ||
    "Player";
  const email = sender.email ?? "unknown";
  const tasksUrl = `${SITE_URL}/admin/tasks`;

  const note = input.proofNote?.trim();
  const clipped = note && note.length > 200 ? `${note.slice(0, 197)}...` : note;

  const lines = [
    "✅ <b>New daily task submission</b>",
    "",
    `<b>From:</b> ${escapeTelegramHtml(displayName)}`,
    `<b>Email:</b> ${escapeTelegramHtml(email)}`,
    `<b>Task:</b> ${escapeTelegramHtml(input.taskTitle)}`,
    `<b>Level:</b> ${input.level}`,
  ];

  if (clipped) {
    lines.push(`<b>Proof:</b> ${escapeTelegramHtml(clipped)}`);
  }
  if (input.hasImage) {
    lines.push("<b>Attachment:</b> Screenshot uploaded");
  }

  lines.push("", `<a href="${tasksUrl}">Review in Spinora</a>`);

  const result = await sendTelegramMessage(lines.join("\n"));
  if (!result.ok && process.env.NODE_ENV === "development") {
    console.warn("[telegram] task submission notify failed:", result.error);
  }
}
