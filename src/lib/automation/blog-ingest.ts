import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

export const automationBlogSchema = z.object({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only")
    .min(3)
    .max(80)
    .optional(),
  title: z.string().trim().min(3).max(140),
  excerpt: z.string().trim().max(300).optional().default(""),
  content: z.string().trim().min(50).max(200_000),
  cover_image_url: z.string().trim().url().max(500).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]),
  seo_title: z.string().trim().max(70).optional().default(""),
  seo_description: z.string().trim().max(200).optional().default(""),
  /** Defaults to draft — review in Admin → CMS → Blog before going live. */
  status: z.enum(["draft", "published"]).optional().default("draft"),
});

export type AutomationBlogInput = z.infer<typeof automationBlogSchema>;

export function slugifyBlogTitle(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  const suffix = Date.now().toString(36).slice(-4);
  const slug = base || "spinora-post";
  return `${slug}-${suffix}`.slice(0, 80);
}

function revalidateBlogPaths() {
  revalidatePath("/admin/cms");
  revalidatePath("/blog");
  revalidatePath("/");
  revalidatePath("/community");
}

export async function ingestAutomationBlogPost(
  input: AutomationBlogInput
): Promise<
  | { ok: true; id: string; slug: string; status: "draft" | "published"; adminUrl: string }
  | { ok: false; error: string }
> {
  const parsed = automationBlogSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid payload" };
  }

  const admin = createAdminClient();
  if (!admin) {
    return { ok: false, error: "Server misconfigured (Supabase admin client)." };
  }

  const slug = parsed.data.slug?.trim() || slugifyBlogTitle(parsed.data.title);
  const status = parsed.data.status;
  const published_at = status === "published" ? new Date().toISOString() : null;

  const payload = {
    slug,
    title: parsed.data.title,
    excerpt: parsed.data.excerpt || parsed.data.content.slice(0, 280).replace(/\s+/g, " ").trim(),
    content: parsed.data.content,
    cover_image_url: parsed.data.cover_image_url ?? null,
    tags: parsed.data.tags ?? [],
    status,
    seo_title: parsed.data.seo_title || null,
    seo_description: parsed.data.seo_description || null,
    author_id: null,
    published_at,
  };

  const { data, error } = await admin.from("blog_posts").insert(payload).select("id, slug").single();

  if (error) {
    if (/duplicate|unique/i.test(error.message)) {
      return { ok: false, error: "That slug is already in use. Send a different slug or title." };
    }
    return { ok: false, error: "Could not save blog post." };
  }

  revalidateBlogPaths();

  return {
    ok: true,
    id: data.id,
    slug: data.slug,
    status,
    adminUrl: `/admin/cms?tab=blog`,
  };
}
