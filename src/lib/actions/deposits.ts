"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDepositMethod, type DepositPaymentMethodId } from "@/lib/payments/methods";
import { notifyAdminOfDeposit } from "@/lib/telegram/notify-admin-deposit";
import { createNotification } from "@/lib/actions/notifications";
import type { RequestStatus } from "@/types/database";

export interface DepositRequestRow {
  id: string;
  user_id: string;
  game_slug: string | null;
  game_name: string;
  payment_method: DepositPaymentMethodId;
  amount: number | null;
  proof_url: string;
  status: RequestStatus;
  admin_notes: string | null;
  created_at: string;
  user?: { full_name: string | null; email: string } | null;
}

export async function submitDepositRequest(input: {
  gameSlug: string;
  gameName: string;
  paymentMethod: DepositPaymentMethodId;
  amount?: number;
  proofPath: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to submit a deposit." };

  if (!getDepositMethod(input.paymentMethod)) {
    return { error: "Invalid payment method." };
  }

  if (!input.proofPath?.trim()) {
    return { error: "Payment screenshot is required." };
  }

  const amount =
    input.amount != null && !Number.isNaN(input.amount) && input.amount > 0
      ? Math.round(input.amount * 100) / 100
      : null;

  const { data: row, error } = await supabase
    .from("deposit_requests")
    .insert({
      user_id: user.id,
      game_slug: input.gameSlug,
      game_name: input.gameName,
      payment_method: input.paymentMethod,
      amount,
      proof_url: input.proofPath.trim(),
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("deposit_requests")) {
      return { error: "Deposits not set up. Run supabase/deposit-requests.sql in Supabase." };
    }
    return { error: error.message };
  }

  void notifyAdminOfDeposit({
    userId: user.id,
    gameName: input.gameName,
    paymentMethod: input.paymentMethod,
    amount,
    proofPath: input.proofPath.trim(),
    depositId: row.id,
  });

  revalidatePath("/admin/deposits");
  revalidatePath("/dashboard/deposits");
  return { success: true, id: row.id };
}

export async function getAdminDepositRequests(): Promise<DepositRequestRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return [];

  const { data } = await supabase
    .from("deposit_requests")
    .select("*, user:profiles!deposit_requests_user_id_fkey(full_name, email)")
    .order("created_at", { ascending: false });

  return (data ?? []) as DepositRequestRow[];
}

export async function updateDepositStatus(
  depositId: string,
  status: RequestStatus,
  adminNotes?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const { data: existing } = await supabase
    .from("deposit_requests")
    .select("user_id, game_name, payment_method, amount")
    .eq("id", depositId)
    .single();

  const update: Record<string, string | null> = { status };
  if (adminNotes?.trim()) update.admin_notes = adminNotes.trim();

  const { error } = await supabase
    .from("deposit_requests")
    .update({
      ...update,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", depositId);

  if (error) return { error: error.message };

  if (existing) {
    const method = getDepositMethod(existing.payment_method as DepositPaymentMethodId);
    if (status === "completed") {
      await createNotification(
        existing.user_id,
        "Deposit confirmed! 💰",
        `Your ${existing.game_name} deposit via ${method?.label ?? existing.payment_method} has been credited.`,
        "success"
      );
    } else if (status === "rejected") {
      await createNotification(
        existing.user_id,
        "Deposit issue",
        `We could not confirm your ${existing.game_name} deposit. Contact support if you need help.`,
        "warning"
      );
    }
  }

  revalidatePath("/admin/deposits");
  revalidatePath("/dashboard/deposits");
  return { success: true };
}
