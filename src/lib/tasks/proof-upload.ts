import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CHAT_ATTACHMENT_BUCKET,
  CHAT_MAX_FILE_SIZE,
  getAttachmentType,
  resolveFileMimeType,
} from "@/lib/chat/attachments";

function createUploadId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function uploadTaskProofImage(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<{ path: string } | { error: string }> {
  const attachmentType = getAttachmentType(file);
  if (attachmentType !== "image") {
    return { error: "Please upload an image (JPG, PNG, GIF, or WebP)." };
  }

  if (file.size > CHAT_MAX_FILE_SIZE) {
    return { error: "Image is too large. Maximum size is 10 MB." };
  }

  const mimeType = resolveFileMimeType(file);
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `task-proofs/${userId}/${createUploadId()}.${ext}`;

  const { error } = await supabase.storage
    .from(CHAT_ATTACHMENT_BUCKET)
    .upload(path, file, { contentType: mimeType, upsert: false });

  if (error) {
    const hint =
      error.message.includes("Bucket not found") || error.message.includes("policy")
        ? " Run supabase/task-proof-attachments.sql in Supabase."
        : "";
    return { error: `${error.message}${hint}` };
  }

  return { path };
}

export function isTaskProofStoragePath(url: string): boolean {
  return url.startsWith("task-proofs/");
}
