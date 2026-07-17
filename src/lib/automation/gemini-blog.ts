import "server-only";

export interface GeminiBlogDraft {
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  seo_title: string;
  seo_description: string;
  image_prompt: string;
}

const MODEL_FALLBACKS = ["gemini-2.0-flash", "gemini-2.0-flash-001", "gemini-2.0-flash-lite"];

function modelCandidates(): string[] {
  const preferred = process.env.GEMINI_BLOG_MODEL?.trim();
  if (preferred) return [preferred, ...MODEL_FALLBACKS.filter((m) => m !== preferred)];
  return MODEL_FALLBACKS;
}

function parseGeminiJson(text: string): GeminiBlogDraft {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as GeminiBlogDraft;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Gemini did not return JSON");
    return JSON.parse(match[0]) as GeminiBlogDraft;
  }
}

export async function generateBlogDraftWithGemini(topic: string): Promise<GeminiBlogDraft> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set on the server.");
  }

  const prompt = `You are an SEO blog writer for Spinora (spinoracasinos.com), a US sweepstakes / fish-table gaming platform.

Write ONE blog post about: ${topic}

Rules:
- Helpful, original, not spammy
- Mention Spinora naturally 2-3 times
- Include a short disclaimer that players must follow local rules and play responsibly
- Markdown body with ## headings, bullet lists, and optionally one table
- 900-1400 words in content

Return ONLY valid JSON (no markdown fences) with keys:
 title (string, max 120 chars)
 excerpt (string, max 280 chars)
 content (string, markdown)
 tags (array of 3-6 lowercase strings)
 seo_title (string, max 65 chars)
 seo_description (string, max 160 chars)
 image_prompt (string, describe a cinematic blog hero image, no text in image)`;

  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });

  let lastError = "Gemini request failed.";

  for (const model of modelCandidates()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body,
    });

    if (!res.ok) {
      let detail = await res.text().catch(() => "");
      try {
        const parsed = JSON.parse(detail) as { error?: { message?: string } };
        if (parsed.error?.message) detail = parsed.error.message;
      } catch {
        /* keep raw text */
      }

      lastError = detail;

      if (res.status === 404 && /no longer available|not found/i.test(detail)) {
        continue;
      }

      if (res.status === 429 || /quota|RESOURCE_EXHAUSTED|limit: 0/i.test(detail)) {
        throw new Error(
          "Gemini blocked this key (free tier quota is 0). Fix: (1) In AI Studio click “Set up billing” for the project, wait 5 minutes, OR (2) create a brand-new API key in a new project and never share it publicly — leaked keys are auto-disabled."
        );
      }
      if (res.status === 400 && /API key not valid|API_KEY_INVALID/i.test(detail)) {
        throw new Error(
          "Invalid Gemini API key. Create a fresh key at https://aistudio.google.com/apikey"
        );
      }

      throw new Error(`Gemini API error (${res.status}): ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text?.trim()) {
      throw new Error("Gemini returned an empty response.");
    }

    const draft = parseGeminiJson(text);

    if (!draft.title?.trim() || !draft.content?.trim()) {
      throw new Error("Gemini JSON missing title or content.");
    }

    return {
      title: draft.title.trim(),
      excerpt: (draft.excerpt ?? "").trim(),
      content: draft.content.trim(),
      tags: Array.isArray(draft.tags) ? draft.tags.map(String) : [],
      seo_title: (draft.seo_title ?? draft.title).trim().slice(0, 70),
      seo_description: (draft.seo_description ?? draft.excerpt ?? "").trim().slice(0, 200),
      image_prompt: (draft.image_prompt ?? draft.title).trim(),
    };
  }

  throw new Error(`Gemini API error: ${lastError.slice(0, 300)}`);
}

export function pollinationsCoverUrl(imagePrompt: string): string {
  const prompt = `${imagePrompt}, professional blog hero, wide 16:9, no text, no watermark`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1200&height=630&nologo=true`;
}
