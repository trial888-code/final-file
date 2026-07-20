import { NextResponse } from "next/server";
import { verifyNowPaymentsSignature } from "@/lib/payments/nowpayments";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-nowpayments-sig") || "";

    const isValid = verifyNowPaymentsSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);
    const { payment_status, price_amount, order_id } = payload;

    // Check if payment is confirmed or finished
    if (payment_status === "finished" || payment_status === "confirmed") {
      const admin = createAdminClient();
      if (admin && order_id) {
        // Extract user_id from order_id format: dep_{userId}_{timestamp}
        const parts = order_id.split("_");
        const userId = parts[1];

        if (userId && userId !== "guest") {
          // Increment player wallet balance atomically in Supabase
          const { data: wallet } = await admin
            .from("wallets")
            .select("balance")
            .eq("user_id", userId)
            .maybeSingle();

          const currentBalance = Number(wallet?.balance || 0);
          const depositAmount = Number(price_amount || 0);
          const newBalance = currentBalance + depositAmount;

          await admin
            .from("wallets")
            .update({ balance: newBalance, updated_at: new Date().toISOString() })
            .eq("user_id", userId);

          // Log transaction
          await admin.from("wallet_audit_logs").insert({
            user_id: userId,
            action: "nowpayments_deposit_confirmed",
            amount: depositAmount,
            metadata: { order_id, payment_status, payload },
          });
        }
      }
    }

    return NextResponse.json({ success: true, payment_status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
