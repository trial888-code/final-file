import { NextResponse } from "next/server";
import { generateAndSaveAIBlogPost } from "@/lib/ai/blog-generator";
import { broadcastBlogPostToTelegram } from "@/lib/telegram/auto-post";
import { verifyCronRequest } from "@/lib/cron/auth";
import { getBlogSettings, getTelegramSettings } from "@/lib/ai/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

async function handleCron(request: Request) {
  const denied = verifyCronRequest(request);
  if (denied) return denied;

  const blogSettings = await getBlogSettings();
  if (!blogSettings.is_enabled) {
    return NextResponse.json({ skipped: true, reason: "AI blog disabled in settings" });
  }

  const url = new URL(request.url);
  const topicParam = url.searchParams.get("topic") || undefined;
  const keywordsParam = url.searchParams.get("keywords")
    ? url.searchParams.get("keywords")!.split(",")
    : undefined;

  const result = await generateAndSaveAIBlogPost({
    topic: topicParam,
    targetKeywords: keywordsParam,
    aiProvider: blogSettings.ai_provider as "smart_auto",
    aiModel: blogSettings.ai_model,
  });

  if (!result.ok || !result.post) {
    return NextResponse.json(
      { error: result.error || "Failed to generate AI blog post" },
      { status: 500 }
    );
  }

  let telegramResult: { ok: boolean; error?: string } = { ok: false };
  const telegramSettings = await getTelegramSettings();

  if (blogSettings.auto_telegram_broadcast && telegramSettings.auto_post_blog) {
    try {
      telegramResult = await broadcastBlogPostToTelegram(result.post, {
        header: telegramSettings.template_header,
        footer: telegramSettings.template_footer,
      });
    } catch (err) {
      telegramResult = {
        ok: false,
        error: err instanceof Error ? err.message : "Broadcast failed",
      };
    }
  }

  return NextResponse.json({
    success: true,
    post: {
      id: result.postId,
      title: result.post.title,
      slug: result.post.slug,
    },
    telegramBroadcast: telegramResult,
  });
}
