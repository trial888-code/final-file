import type { Metadata } from "next";
import { format } from "date-fns";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import {
  EntityEditDialog,
  type FieldValue,
} from "@/components/admin/entity-edit-dialog";
import { NewsletterCampaignDialog } from "@/components/admin/newsletter-campaign-dialog";
import { GlassCard } from "@/components/shared/glass-card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminDb } from "@/lib/actions/admin/core";
import {
  deleteNewsletterCampaignAction,
  scheduleNewsletterCampaignAction,
  upsertNewsletterCampaignAction,
} from "@/lib/actions/admin/newsletters";
import { requirePermission } from "@/lib/data/admin";
import type { NewsletterCampaign, NewsletterCampaignStatus } from "@/lib/database.types";

export const metadata: Metadata = { title: "Newsletters" };

const STATUS_BADGE: Record<NewsletterCampaignStatus, string> = {
  draft: "bg-foreground/8 text-muted-foreground",
  scheduled: "bg-ws-gold/15 text-ws-gold-deep dark:text-ws-gold",
  sending: "bg-ws-gold/15 text-ws-gold-deep dark:text-ws-gold",
  sent: "bg-ws-emerald/15 text-ws-emerald",
  failed: "bg-destructive/15 text-destructive",
};

function campaignFields(c?: NewsletterCampaign) {
  return [
    { name: "name", label: "Internal name", type: "text" as const, defaultValue: c?.name ?? "" },
    { name: "subject", label: "Subject line", type: "text" as const, defaultValue: c?.subject ?? "" },
    { name: "eyebrow", label: "Eyebrow (small label above the heading)", type: "text" as const, defaultValue: c?.eyebrow ?? "" },
    { name: "heading", label: "Heading", type: "text" as const, defaultValue: c?.heading ?? "" },
    { name: "subhead", label: "Subhead", type: "textarea" as const, defaultValue: c?.subhead ?? "" },
    {
      name: "body",
      label: "Body",
      type: "textarea" as const,
      defaultValue: c?.body ?? "",
      hint: "Plain text — you can use <strong> for emphasis, it's rendered as raw HTML.",
    },
    { name: "cta_label", label: "Button label", type: "text" as const, defaultValue: c?.cta_label ?? "Play Now" },
    { name: "cta_href", label: "Button link", type: "text" as const, defaultValue: c?.cta_href ?? "https://winsweeps.games/deposit" },
    { name: "stat1_value", label: "Stat 1 value (optional)", type: "text" as const, defaultValue: c?.stat1_value ?? "" },
    { name: "stat1_label", label: "Stat 1 label", type: "text" as const, defaultValue: c?.stat1_label ?? "" },
    { name: "stat2_value", label: "Stat 2 value (optional)", type: "text" as const, defaultValue: c?.stat2_value ?? "" },
    { name: "stat2_label", label: "Stat 2 label", type: "text" as const, defaultValue: c?.stat2_label ?? "" },
    { name: "stat3_value", label: "Stat 3 value (optional)", type: "text" as const, defaultValue: c?.stat3_value ?? "" },
    { name: "stat3_label", label: "Stat 3 label", type: "text" as const, defaultValue: c?.stat3_label ?? "" },
    {
      name: "segment",
      label: "Send to",
      type: "select" as const,
      defaultValue: c?.segment ?? "all",
      options: [
        { value: "all", label: "All players (opted-in, not banned)" },
        { value: "test", label: "Test — just me" },
      ],
    },
  ];
}

function toCampaignInput(v: Record<string, FieldValue>) {
  return {
    name: String(v.name),
    subject: String(v.subject),
    eyebrow: String(v.eyebrow),
    heading: String(v.heading),
    subhead: String(v.subhead),
    body: String(v.body),
    cta_label: String(v.cta_label),
    cta_href: String(v.cta_href),
    stat1_value: String(v.stat1_value),
    stat1_label: String(v.stat1_label),
    stat2_value: String(v.stat2_value),
    stat2_label: String(v.stat2_label),
    stat3_value: String(v.stat3_value),
    stat3_label: String(v.stat3_label),
    segment: v.segment === "test" ? ("test" as const) : ("all" as const),
  };
}

function defaultScheduleValue() {
  const d = new Date(Date.now() + 5 * 60_000);
  return d.toISOString().slice(0, 16);
}

export default async function AdminNewslettersPage() {
  await requirePermission("newsletters.manage");
  const db = adminDb();

  const { data } = await db
    .from("newsletter_campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  const campaigns = (data ?? []) as NewsletterCampaign[];

  return (
    <div className="mx-auto max-w-5xl">
      <AdminPageHeader
        title="Newsletters"
        description="Author a campaign, send a test to yourself, then schedule or send it to every opted-in player."
        action={
          <NewsletterCampaignDialog
            title="New campaign"
            triggerLabel="New campaign"
            fields={campaignFields()}
            action={async (values: Record<string, FieldValue>) => {
              "use server";
              return upsertNewsletterCampaignAction(toCampaignInput(values));
            }}
          />
        }
      />

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-foreground/8 hover:bg-transparent">
                <TableHead>Campaign</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled / Sent</TableHead>
                <TableHead className="text-right">Progress</TableHead>
                <TableHead className="w-32 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No campaigns yet — create one above.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((c) => (
                  <TableRow key={c.id} className="border-foreground/8">
                    <TableCell>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.subject}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.segment === "test" ? "Test — just me" : "All players"}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_BADGE[c.status]}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.sent_at
                        ? `Sent ${format(new Date(c.sent_at), "MMM d, p")}`
                        : c.scheduled_at
                          ? `Scheduled ${format(new Date(c.scheduled_at), "MMM d, p")}`
                          : "—"}
                    </TableCell>
                    <TableCell className="tnum text-right text-sm">
                      {c.total_recipients > 0
                        ? `${c.sent_count} / ${c.total_recipients}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {c.status === "draft" ? (
                        <div className="flex justify-end gap-1">
                          <NewsletterCampaignDialog
                            title="Edit campaign"
                            fields={campaignFields(c)}
                            action={async (values: Record<string, FieldValue>) => {
                              "use server";
                              return upsertNewsletterCampaignAction({ id: c.id, ...toCampaignInput(values) });
                            }}
                          />
                          <EntityEditDialog
                            title="Schedule send"
                            triggerLabel="Schedule"
                            fields={[
                              {
                                name: "scheduled_at",
                                label: "Send at",
                                type: "datetime-local",
                                defaultValue: defaultScheduleValue(),
                              },
                            ]}
                            action={async (values: Record<string, FieldValue>) => {
                              "use server";
                              const iso = new Date(String(values.scheduled_at)).toISOString();
                              return scheduleNewsletterCampaignAction(c.id, iso);
                            }}
                          />
                          <ConfirmActionButton
                            action={async () => {
                              "use server";
                              return scheduleNewsletterCampaignAction(c.id, null);
                            }}
                            title="Send this campaign now?"
                            description={
                              c.segment === "test"
                                ? "Sends immediately to your own email address."
                                : "Sends immediately to every opted-in, non-banned player. This cannot be undone."
                            }
                            confirmLabel="Send now"
                            triggerLabel="Send now"
                            variant="outline"
                          />
                          <ConfirmActionButton
                            action={deleteNewsletterCampaignAction.bind(null, c.id)}
                            title="Delete campaign?"
                            description="This draft will be permanently removed."
                            confirmLabel="Delete"
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {c.failed_count > 0 ? `${c.failed_count} failed` : "Locked"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>
    </div>
  );
}
