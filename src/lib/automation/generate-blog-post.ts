import "server-only";

import { ingestAutomationBlogPost } from "@/lib/automation/blog-ingest";
import { pickBlogCronTopic } from "@/lib/automation/blog-topics";
import {
  generateBlogDraftWithGemini,
  pollinationsCoverUrl,
} from "@/lib/automation/gemini-blog";

function cronPublishStatus(): "draft" | "published" {
  const raw = (process.env.BLOG_CRON_AUTO_PUBLISH ?? "false").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes" ? "published" : "draft";
}

export async function runBlogCronGeneration(options?: { topic?: string }) {
  const topic = options?.topic?.trim() || pickBlogCronTopic();
  const draft = await generateBlogDraftWithGemini(topic);
  const status = cronPublishStatus();

  const saved = await ingestAutomationBlogPost({
    title: draft.title,
    excerpt: draft.excerpt,
    content: draft.content,
    cover_image_url: pollinationsCoverUrl(draft.image_prompt),
    tags: draft.tags,
    seo_title: draft.seo_title,
    seo_description: draft.seo_description,
    status,
  });

  if (!saved.ok) {
    return { ok: false as const, topic, error: saved.error };
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

  return {
    ok: true as const,
    topic,
    id: saved.id,
    slug: saved.slug,
    status: saved.status,
    adminUrl: saved.adminUrl,
    publicUrl: site ? `${site}/blog/${saved.slug}` : `/blog/${saved.slug}`,
    message:
      saved.status === "draft"
        ? "Draft saved — review in Admin → CMS → Blog."
        : "Post published on the blog.",
  };
}
