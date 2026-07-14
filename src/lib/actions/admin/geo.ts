"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AdminActionResult,
  adminDb,
  authorize,
  writeAudit,
} from "@/lib/actions/admin/core";

const PERMISSION = "cms.manage";

function revalidateGeo(stateSlug?: string, citySlug?: string) {
  revalidatePath("/admin/geo");
  revalidatePath("/sitemap.xml");
  revalidatePath("/");
  if (stateSlug) revalidatePath(`/${stateSlug}`);
  if (stateSlug && citySlug) revalidatePath(`/${stateSlug}/${citySlug}`);
}

// ── States ───────────────────────────────────────────────────────────────────

const stateSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Lowercase, numbers, hyphens").min(2).max(40),
  name: z.string().trim().min(2).max(60),
  abbr: z.string().trim().toUpperCase().length(2),
  hero_lede: z.string().trim().max(600),
  meta_description: z.string().trim().max(300),
  hero_image_url: z.string().trim().max(1000).optional().default(""),
  sort_order: z.number().int().min(0).max(9999),
  is_active: z.boolean(),
});

export async function upsertGeoStateAction(
  input: z.infer<typeof stateSchema> & { id?: string }
): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = stateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const row = { ...parsed.data, hero_image_url: parsed.data.hero_image_url || null };

  const db = adminDb();
  const result = input.id
    ? await db.from("geo_states").update(row).eq("id", input.id)
    : await db.from("geo_states").insert(row);
  if (result.error) {
    return {
      ok: false,
      error: /duplicate|unique/.test(result.error.message)
        ? "That state slug is already in use."
        : "Could not save the state.",
    };
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: input.id ? "geo_state.update" : "geo_state.create",
    entityType: "geo_state",
    entityId: input.id ?? null,
    after: row,
  });
  revalidateGeo(parsed.data.slug);
  return { ok: true, message: "State saved." };
}

// ── Cities ───────────────────────────────────────────────────────────────────

const citySchema = z.object({
  state_id: z.string().uuid(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Lowercase, numbers, hyphens").min(2).max(40),
  name: z.string().trim().min(2).max(60),
  description_snippet: z.string().trim().max(200),
  sort_order: z.number().int().min(0).max(9999),
  is_active: z.boolean(),
});

export async function upsertGeoCityAction(
  input: z.infer<typeof citySchema> & { id?: string; state_slug?: string }
): Promise<AdminActionResult> {
  const auth = await authorize(PERMISSION);
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = citySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const db = adminDb();
  const result = input.id
    ? await db.from("geo_cities").update(parsed.data).eq("id", input.id)
    : await db.from("geo_cities").insert(parsed.data);
  if (result.error) {
    return {
      ok: false,
      error: /duplicate|unique/.test(result.error.message)
        ? "That city slug already exists for this state."
        : "Could not save the city.",
    };
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: input.id ? "geo_city.update" : "geo_city.create",
    entityType: "geo_city",
    entityId: input.id ?? null,
    after: parsed.data,
  });
  revalidateGeo(input.state_slug, parsed.data.slug);
  return { ok: true, message: "City saved." };
}
