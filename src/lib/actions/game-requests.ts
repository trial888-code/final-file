"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { RequestStatus } from "@/types/database";

export async function createGameRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const gameName = formData.get("game_name") as string;
  const gameProvider = formData.get("game_provider") as string;
  const notes = formData.get("notes") as string;

  const { error } = await supabase.from("game_requests").insert({
    user_id: user.id,
    game_name: gameName,
    game_provider: gameProvider,
    notes: notes || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/requests");
  return { success: true };
}

export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus,
  adminNotes?: string,
  credentials?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const update: Record<string, string> = { status };
  if (adminNotes) update.admin_notes = adminNotes;
  if (credentials) update.credentials = credentials;

  const { error } = await supabase
    .from("game_requests")
    .update(update)
    .eq("id", requestId);

  if (error) return { error: error.message };

  if (status === "completed") {
    const { data: request } = await supabase
      .from("game_requests")
      .select("user_id")
      .eq("id", requestId)
      .single();

    if (request) {
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("vip_points")
        .eq("id", request.user_id)
        .single();

      if (userProfile) {
        await supabase
          .from("profiles")
          .update({ vip_points: userProfile.vip_points + 50 })
          .eq("id", request.user_id);
      }

      await supabase.from("notifications").insert({
        user_id: request.user_id,
        title: "Game Account Ready!",
        message: "Your game account request has been completed. Check your dashboard for credentials.",
        type: "success",
      });
    }
  }

  revalidatePath("/admin/requests");
  revalidatePath("/dashboard/requests");
  return { success: true };
}
