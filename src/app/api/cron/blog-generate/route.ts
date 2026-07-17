import { NextRequest, NextResponse } from "next/server";

import { runBlogCronGeneration } from "@/lib/automation/generate-blog-post";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** cron-job.org or Vercel Cron — AI blog draft (Gemini) → Supabase. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const topic = request.nextUrl.searchParams.get("topic") ?? undefined;

  try {
    const result = await runBlogCronGeneration(topic ? { topic } : undefined);
    const status = result.ok ? 200 : 500;
    return NextResponse.json({ ...result, at: new Date().toISOString() }, { status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Blog generation failed.";
    return NextResponse.json({ ok: false, error: message, at: new Date().toISOString() }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
