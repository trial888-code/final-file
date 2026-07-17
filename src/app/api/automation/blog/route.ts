import { NextRequest, NextResponse } from "next/server";

import { ingestAutomationBlogPost } from "@/lib/automation/blog-ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

/** n8n (or any automation) posts AI-generated blog drafts here. */
export async function POST(request: NextRequest) {
  const secret = process.env.N8N_BLOG_SECRET?.trim();
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const result = await ingestAutomationBlogPost(body as Parameters<typeof ingestAutomationBlogPost>[0]);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

  return NextResponse.json({
    ok: true,
    id: result.id,
    slug: result.slug,
    status: result.status,
    adminUrl: result.adminUrl,
    publicUrl: site ? `${site}/blog/${result.slug}` : `/blog/${result.slug}`,
    message:
      result.status === "draft"
        ? "Draft saved — open Admin → CMS → Blog to review and publish."
        : "Post published.",
  });
}

/** Quick health check for n8n (same Bearer secret). */
export async function GET(request: NextRequest) {
  const secret = process.env.N8N_BLOG_SECRET?.trim();
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return unauthorized();
  }

  return NextResponse.json({
    ok: true,
    service: "spinora-blog-automation",
    defaultStatus: "draft",
    at: new Date().toISOString(),
  });
}
