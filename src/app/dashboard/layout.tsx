import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { CompleteProfilePrompt } from "@/components/auth/complete-profile-prompt";
import { getAuthUser, getProfile } from "@/lib/supabase/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  const emailConfirmed = Boolean(user.email_confirmed_at ?? user.confirmed_at);
  if (!emailConfirmed) {
    redirect("/login?error=email_not_confirmed");
  }

  const profile = await getProfile();
  if (profile?.is_suspended) redirect("/login");

  const needsPhone = !profile?.phone;
  const email = profile?.email || user.email || "";

  return (
    <Suspense fallback={null}>
      <DashboardShell>
        {needsPhone && email && !email.endsWith("@phone.spinora.local") && (
          <CompleteProfilePrompt email={email} fullName={profile?.full_name} />
        )}
        {children}
      </DashboardShell>
    </Suspense>
  );
}
