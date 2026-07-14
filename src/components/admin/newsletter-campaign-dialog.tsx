"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import type { FieldDef, FieldValue } from "@/components/admin/entity-edit-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AdminActionResult } from "@/lib/actions/admin/core";
import { customCampaignEmail } from "@/lib/email/newsletter-templates";

/**
 * Newsletter-only fork of EntityEditDialog: same field-list shape, but with
 * a live rendered-email preview pane. Forked (not a generic prop on
 * EntityEditDialog) since no other caller of that component needs a preview.
 */
export function NewsletterCampaignDialog({
  title,
  fields,
  action,
  triggerLabel,
}: {
  title: string;
  fields: FieldDef[];
  action: (values: Record<string, FieldValue>) => Promise<AdminActionResult>;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [values, setValues] = React.useState<Record<string, FieldValue>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.defaultValue]))
  );

  React.useEffect(() => {
    if (open) {
      setValues(Object.fromEntries(fields.map((f) => [f.name, f.defaultValue])));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await action(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Saved");
      setOpen(false);
      router.refresh();
    });
  }

  const stats = [1, 2, 3]
    .map((n) => {
      const value = String(values[`stat${n}_value`] ?? "");
      const label = String(values[`stat${n}_label`] ?? "");
      return value && label ? { value, label } : null;
    })
    .filter((s): s is { value: string; label: string } => s !== null);

  const preview = customCampaignEmail({
    subject: String(values.subject ?? ""),
    eyebrow: String(values.eyebrow ?? ""),
    heading: String(values.heading ?? ""),
    subhead: String(values.subhead ?? ""),
    body: String(values.body ?? ""),
    stats: stats.length ? stats : undefined,
    cta: { label: String(values.cta_label ?? ""), href: String(values.cta_href ?? "") },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerLabel ? (
          <Button variant="outline" size="sm">
            <Pencil className="size-4" aria-hidden />
            {triggerLabel}
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" aria-label={title}>
            <Pencil className="size-4" aria-hidden />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-strong sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-6 lg:grid-cols-[minmax(320px,1fr)_360px]">
          <form onSubmit={submit} className="min-w-0 max-h-[70vh] space-y-4 overflow-y-auto pr-3">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                {field.type === "select" ? (
                  <>
                    <Label htmlFor={`f-${field.name}`}>{field.label}</Label>
                    <Select
                      value={String(values[field.name] ?? "")}
                      onValueChange={(v) =>
                        setValues((prev) => ({ ...prev, [field.name]: v }))
                      }
                    >
                      <SelectTrigger id={`f-${field.name}`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                ) : field.type === "textarea" ? (
                  <>
                    <Label htmlFor={`f-${field.name}`}>{field.label}</Label>
                    <Textarea
                      id={`f-${field.name}`}
                      rows={3}
                      value={String(values[field.name] ?? "")}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, [field.name]: e.target.value }))
                      }
                    />
                  </>
                ) : field.type === "text" ||
                  field.type === "number" ||
                  field.type === "datetime-local" ? (
                  <>
                    <Label htmlFor={`f-${field.name}`}>{field.label}</Label>
                    <Input
                      id={`f-${field.name}`}
                      type={field.type}
                      min={field.min}
                      step={field.step}
                      value={String(values[field.name] ?? "")}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [field.name]:
                            field.type === "number" ? Number(e.target.value) : e.target.value,
                        }))
                      }
                    />
                    {field.hint && (
                      <p className="text-xs text-muted-foreground">{field.hint}</p>
                    )}
                  </>
                ) : null}
              </div>
            ))}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
          <div className="min-w-0">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Eye className="size-3.5" aria-hidden />
              Live preview
            </h3>
            <iframe
              title="Email preview"
              srcDoc={preview.html}
              sandbox=""
              className="h-[70vh] w-full rounded-lg border border-border bg-white"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
