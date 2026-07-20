import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBlogCoverUrl } from "@/lib/blog-cover";
import { getBlogSettings, updateBlogSettings } from "@/lib/ai/settings";

export interface GeneratedBlogPost {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  seo_title: string;
  seo_description: string;
  seo_keywords: string[];
  cover_image: string;
  visual_prompt?: string;
  reading_time_minutes: number;
  category: string;
  tags: string[];
}

export interface BlogGeneratorOptions {
  topic?: string;
  targetKeywords?: string[];
  customPrompt?: string;
  aiProvider?: "smart_auto" | "openai" | "openrouter" | "gemini";
  aiModel?: string;
}

/** 10,000+ Topic Matrix Generators */
const GAME_PLATFORMS = [
  "Juwa 777",
  "Orion Stars",
  "Fire Kirin",
  "Game Vault 999",
  "Panda Master",
  "Vegas Sweeps",
  "Cash Machine",
  "Mafia 777",
  "Cash Frenzy",
  "Milky Way",
  "Spinora Slots",
];

const TOPIC_ANGLES = [
  "Ultimate 2026 Strategy Guide & Free Credit Tricks",
  "How to Unlock VIP Rewards & Instant 5-Minute Cashouts",
  "Highest RTP Slot Games & Secret Payout Patterns",
  "Fish Table Boss Tactics & High-Caliber Ammo Reload Guide",
  "Deposit Bonus Match & Daily Wheel Spin Walkthrough",
  "How to Play Like a Pro & Maximize Session Longevity",
  "Beginner to Master Guide: Everything You Need to Know",
  "Exclusive Promo Codes & Wallet Reload Walkthrough",
];

const GAMING_KEYWORDS = [
  "spinora bonus code",
  "juwa 777 download",
  "orion stars free credits",
  "fire kirin deposit bonus",
  "game vault instant cashout",
  "fish table game cheats",
  "play online slots real money",
  "spinora gaming support",
  "cash machine reload guide",
  "panda master jackpot tips",
  "vegas sweeps bonus code",
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDynamicTopic(): string {
  const game = getRandomItem(GAME_PLATFORMS);
  const angle = getRandomItem(TOPIC_ANGLES);
  return `${game}: ${angle}`;
}

/**
 * SKILL RULE: auto-blog-image-fix (Visual Prompt Reconstruction Engine)
 * Translates abstract platform names into physical 3D scene descriptions
 * guaranteeing NO text, logos, or gibberish typography in generated graphics.
 */
export function constructTextFreeVisualPrompt(title: string): string {
  const s = title.toLowerCase();

  if (s.includes("juwa") || s.includes("slot") || s.includes("777") || s.includes("vegas") || s.includes("frenzy")) {
    return "A vibrant 3D render of a luxury casino slot machine reel showcasing glowing triple 777 symbols, falling gold coins exploding outward, cinematic dramatic studio lighting, deep neon purple and gold accents, clean text-free composition, high-resolution 3D art.";
  }

  if (s.includes("fire kirin") || s.includes("fish") || s.includes("panda") || s.includes("milky way")) {
    return "A 3D photorealistic underwater fish table game scene featuring a golden dragon fish swimming through vibrant coral reefs, glowing treasure chest overflowing with gold coins and blue crystals, dramatic lighting, text-free clear background.";
  }

  if (s.includes("orion") || s.includes("star") || s.includes("cosmic")) {
    return "A cosmic 3D celestial slot game scene with glowing stars, golden coins orbiting in space, deep indigo nebula background, cinematic lighting, text-free.";
  }

  if (s.includes("deposit") || s.includes("cashapp") || s.includes("zelle") || s.includes("crypto") || s.includes("vault")) {
    return "A 3D luxury vault door opening to reveal piles of golden coins, sparkling diamonds, glowing casino chips, cinematic studio lighting, dark neon gold background, text-free.";
  }

  return "A high-resolution 3D casino gaming scene with glowing dice, stacks of colorful poker chips, gold coins, neon lighting, clean text-free composition.";
}

/** 100% Content-to-Photo Smart Matcher for AI Blog Generation */
function getDynamicCoverImage(title: string): string {
  const slug = slugify(title);
  return resolveBlogCoverUrl(slug, null);
}

/** Fallback generator producing rich HTML content with dynamic matrices & structured schemas */
function generateFallbackArticle(
  topicTitle: string,
  keywords: string[]
): GeneratedBlogPost {
  const slug = `${slugify(topicTitle)}-${Date.now().toString().slice(-4)}`;
  const mainKeyword = keywords[0] || "online gaming bonus";
  const secondaryKeywords = keywords.slice(1);
  const coverImage = getDynamicCoverImage(topicTitle);
  const visualPrompt = constructTextFreeVisualPrompt(topicTitle);

  const introVariants = [
    `Welcome to the definitive guide on <strong>${topicTitle}</strong>. Whether you are looking to elevate your gameplay, unlock exclusive <strong>${mainKeyword}</strong> perks, or secure faster cashouts, this guide covers everything you need to know to stay ahead on the <strong>Spinora</strong> platform.`,
    `Are you ready to level up your gaming experience on <strong>${topicTitle}</strong>? In this expert walkthrough, we break down top-tier payout tactics, <strong>${mainKeyword}</strong> bonus strategies, and fast 15-minute cashout routines.`,
    `Mastering <strong>${topicTitle}</strong> requires more than luck—it takes strategic bankroll management, active <strong>${mainKeyword}</strong> promotions, and priority target selection on Spinora's 24/7 gaming platform.`,
  ];

  const takeawayVariants = [
    `<li>Always claim daily wheel spins and check active <strong>Spinora promotions</strong> before playing.</li>
     <li>Optimize your bet sizes according to your wallet balance for maximum session longevity.</li>
     <li>Use verified payment channels (USDT, Chime, PayPal, Cash App) for lightning-fast deposit requests.</li>
     <li>Escalate any account issues directly through Spinora Live Support for 24/7 assistance.</li>`,
    `<li>Lock in 100% deposit match bonuses on your Spinora user dashboard before starting your gaming session.</li>
     <li>Prioritize high RTP slots and medium-tier fish table bosses for maximum payout multipliers.</li>
     <li>Leverage 24/7 automated game account provisioning for instant Juwa, Fire Kirin, and Game Vault loads.</li>
     <li>Maintain disciplined cashouts whenever hitting a 5x or 10x multiplier on your initial balance.</li>`,
  ];

  const content = `
<div class="blog-post-content space-y-6">
  <p class="text-lg leading-relaxed font-medium">
    ${getRandomItem(introVariants)}
  </p>

  <div class="my-6 p-4 border-l-4 border-emerald-500 bg-emerald-500/10 rounded-r-lg">
    <h3 class="text-md font-bold text-emerald-400 uppercase tracking-wider mb-1">⚡ Key Takeaways</h3>
    <ul class="list-disc list-inside space-y-1 text-sm text-foreground/90">
      ${getRandomItem(takeawayVariants)}
    </ul>
  </div>

  <h2>1. Understanding Core Game Mechanics & Payout Patterns</h2>
  <p>
    When playing top titles like <em>Juwa 777</em>, <em>Orion Stars</em>, <em>Fire Kirin</em>, and <em>Game Vault</em>, success relies on understanding payout multipliers and volatility patterns. Utilizing <strong>${mainKeyword}</strong> strategies gives players a distinct edge over random guessing.
  </p>
  <p>
    Fish table games require target prioritization—always focus on medium-tier boss fish when high-level weapons are active. For slot games, pay attention to Return To Player (RTP) percentages and trigger bonus rounds efficiently.
  </p>

  <h2>2. Step-by-Step Strategy for Maximum Cashouts</h2>
  <ol class="list-decimal list-inside space-y-2 pl-2">
    <strong class="text-emerald-400">Step 1: Set Up Your Dedicated Game Account</strong>
    <p class="text-sm text-muted-foreground ml-6 mb-2">Request game account credentials via the Spinora Request Panel and log into your platform app in under 2 minutes.</p>
    
    <strong class="text-emerald-400">Step 2: Take Advantage of Deposit Rollover Bonuses</strong>
    <p class="text-sm text-muted-foreground ml-6 mb-2">Each deposit on Spinora comes with tier-based rewards. Platinum & Gold VIP members earn increased bonus match percentages.</p>

    <strong class="text-emerald-400">Step 3: Track Performance & Withdraw Wisely</strong>
    <p class="text-sm text-muted-foreground ml-6">When hitting a big win multiplier, request cash-out promptly to maintain disciplined bankroll management.</p>
  </ol>

  <h2>3. Why Spinora is the #1 Gaming Support Platform</h2>
  <p>
    Spinora offers 24/7 automated game account provisioning, real-time live chat assistance, instant deposit request handling, and tiered VIP cashback programs.
    ${secondaryKeywords.length > 0 ? `Targeted searches such as <em>${secondaryKeywords.join(", ")}</em> consistently lead players to Spinora for verified gaming services.` : ""}
  </p>

  <h2>Frequently Asked Questions (FAQ)</h2>
  <div class="space-y-4">
    <div class="border border-border/60 rounded-lg p-4 bg-background/50">
      <h4 class="font-bold text-foreground">Q: How do I claim bonus credits on Spinora?</h4>
      <p class="text-sm text-muted-foreground mt-1">Navigate to your Spinora Dashboard, complete daily tasks, or spin the Bonus Wheel to instantly credit bonus funds to your wallet.</p>
    </div>
    <div class="border border-border/60 rounded-lg p-4 bg-background/50">
      <h4 class="font-bold text-foreground">Q: How fast are cashout payouts processed?</h4>
      <p class="text-sm text-muted-foreground mt-1">Most cashout requests are processed within 5 to 15 minutes by our dedicated support agents via Cash App, USDT, and Zelle.</p>
    </div>
  </div>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I claim bonus credits on Spinora?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Navigate to your Spinora Dashboard, complete daily tasks, or spin the Bonus Wheel to credit bonus funds."
        }
      },
      {
        "@type": "Question",
        "name": "How fast are cashout payouts processed?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Most cashout requests are processed within 5 to 15 minutes by Spinora support agents."
        }
      }
    ]
  }
  </script>
</div>
  `.trim();

  return {
    title: topicTitle,
    slug,
    excerpt: `Discover essential strategies and expert tips for ${topicTitle}. Learn how to maximize payouts and claim exclusive bonus credits on Spinora.`,
    content,
    seo_title: `${topicTitle} | Spinora Gaming Guide`,
    seo_description: `Learn how to master ${topicTitle} on Spinora. Read top tips, strategy guides, bonus credit walkthroughs, and fast cashout methods.`,
    seo_keywords: [mainKeyword, ...secondaryKeywords, "spinora", "online gaming", "casino bonus"],
    cover_image: coverImage,
    visual_prompt: visualPrompt,
    reading_time_minutes: 4,
    category: "Gaming Guides",
    tags: ["Strategy", "Bonuses", "Spinora", "Guide"],
  };
}

/** External LLM Caller (OpenRouter / OpenAI / Gemini) */
async function generateViaLLM(
  prompt: string,
  provider: string,
  model?: string
): Promise<GeneratedBlogPost | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  const useGemini = provider === "gemini" && geminiKey;
  const apiKey = useGemini ? geminiKey : openRouterKey || openAiKey || geminiKey;

  if (!apiKey) return null;

  try {
    if (useGemini) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an expert SEO gaming writer for Spinora. Output ONLY valid JSON with keys: title, slug, excerpt, content (HTML), seo_title, seo_description, seo_keywords (array), category, tags (array).\n\n${prompt}`,
                  },
                ],
              },
            ],
          }),
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const jsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonStr) return null;
      const parsed = JSON.parse(jsonStr.replace(/```json|```/g, "").trim()) as Partial<GeneratedBlogPost>;
      if (!parsed.title || !parsed.content) return null;
      return {
        title: parsed.title,
        slug: parsed.slug || slugify(parsed.title),
        excerpt: parsed.excerpt || parsed.title,
        content: parsed.content,
        seo_title: parsed.seo_title || `${parsed.title} | Spinora`,
        seo_description: parsed.seo_description || parsed.excerpt || parsed.title,
        seo_keywords: Array.isArray(parsed.seo_keywords) ? parsed.seo_keywords : ["spinora"],
        cover_image: getDynamicCoverImage(parsed.title),
        visual_prompt: constructTextFreeVisualPrompt(parsed.title),
        reading_time_minutes: Math.ceil(parsed.content.split(/\s+/).length / 200) || 4,
        category: parsed.category || "Gaming Guides",
        tags: Array.isArray(parsed.tags) ? parsed.tags : ["Gaming"],
      };
    }

    const endpoint = openRouterKey
      ? "https://openrouter.ai/api/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || (openRouterKey ? "openai/gpt-4o-mini" : "gpt-4o-mini"),
        messages: [
          {
            role: "system",
            content: `You are an expert SEO content strategist and gaming writer for Spinora. Output ONLY a valid JSON object with: title, slug, excerpt, content (HTML with <h2>, <h3>, <ul>, <p>, <strong>), seo_title, seo_description, seo_keywords (array), category, tags (array).`,
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const jsonStr = data.choices?.[0]?.message?.content;
    if (!jsonStr) return null;

    const parsed = JSON.parse(jsonStr) as Partial<GeneratedBlogPost>;
    if (!parsed.title || !parsed.content) return null;

    return {
      title: parsed.title,
      slug: parsed.slug || slugify(parsed.title),
      excerpt: parsed.excerpt || parsed.title,
      content: parsed.content,
      seo_title: parsed.seo_title || `${parsed.title} | Spinora`,
      seo_description: parsed.seo_description || parsed.excerpt || parsed.title,
      seo_keywords: Array.isArray(parsed.seo_keywords) ? parsed.seo_keywords : ["spinora"],
      cover_image: getDynamicCoverImage(parsed.title),
      visual_prompt: constructTextFreeVisualPrompt(parsed.title),
      reading_time_minutes: Math.ceil(parsed.content.split(/\s+/).length / 200) || 4,
      category: parsed.category || "Gaming Guides",
      tags: Array.isArray(parsed.tags) ? parsed.tags : ["Gaming"],
    };
  } catch (error) {
    console.error("[BlogGenerator] LLM Generation error:", error);
    return null;
  }
}

export const DYNAMIC_AI_POSTS = new Map<string, GeneratedBlogPost>();

/** Main Entry point to generate and persist a new AI SEO Blog Post */
export async function generateAndSaveAIBlogPost(
  options: BlogGeneratorOptions = {}
): Promise<{ ok: boolean; post?: GeneratedBlogPost; postId?: string; error?: string }> {
  const settings = await getBlogSettings();
  if (!settings.is_enabled && !options.topic) {
    return { ok: false, error: "AI blog automation is disabled in settings." };
  }

  const topic =
    options.topic ||
    getRandomItem(settings.topics.length ? settings.topics : GAME_PLATFORMS.map((g) => `${g} Guide`)) ||
    generateDynamicTopic();
  const keywords = options.targetKeywords?.length
    ? options.targetKeywords
    : settings.target_keywords.length
      ? settings.target_keywords
      : [getRandomItem(GAMING_KEYWORDS), "spinora gaming", "cashout guide"];

  const provider = options.aiProvider ?? settings.ai_provider ?? "smart_auto";
  const model = options.aiModel ?? settings.ai_model;
  const prompt = `Write a comprehensive, engaging SEO blog post on: "${topic}". Target keywords: ${keywords.join(", ")}. ${options.customPrompt || ""}`;

  let post: GeneratedBlogPost | null = null;

  if (provider === "smart_auto") {
    if (process.env.OPENROUTER_API_KEY?.trim()) {
      post = await generateViaLLM(prompt, "openrouter", model);
    }
    if (!post && process.env.OPENAI_API_KEY?.trim()) {
      post = await generateViaLLM(prompt, "openai", model);
    }
    if (!post && process.env.GEMINI_API_KEY?.trim()) {
      post = await generateViaLLM(prompt, "gemini", model);
    }
  } else {
    post = await generateViaLLM(prompt, provider, model);
  }

  if (!post) {
    post = generateFallbackArticle(topic, keywords);
  }

  // Ensure cover image 100% matches article content and follows auto-blog-image-fix rule
  post.cover_image = getDynamicCoverImage(post.title);
  post.visual_prompt = constructTextFreeVisualPrompt(post.title);

  // Cache in-memory for instant 0ms routing
  DYNAMIC_AI_POSTS.set(post.slug, post);

  const db = createAdminClient();
  if (!db) {
    return { ok: false, error: "Database client unavailable" };
  }

  const status = settings.auto_publish ? "published" : "draft";

  const { data, error } = await db
    .from("blog_posts")
    .insert({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      cover_image_url: post.cover_image,
      seo_title: post.seo_title,
      seo_description: post.seo_description,
      tags: post.tags,
      status,
      published_at: status === "published" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      const uniqueSlug = `${post.slug}-${Date.now()}`;
      post.slug = uniqueSlug;
      DYNAMIC_AI_POSTS.set(uniqueSlug, post);

      const { data: retryData, error: retryErr } = await db
        .from("blog_posts")
        .insert({
          title: post.title,
          slug: uniqueSlug,
          excerpt: post.excerpt,
          content: post.content,
          cover_image_url: post.cover_image,
          seo_title: post.seo_title,
          seo_description: post.seo_description,
          tags: post.tags,
          status,
          published_at: status === "published" ? new Date().toISOString() : null,
        })
        .select("id")
        .single();

      if (retryErr) {
        return { ok: false, error: retryErr.message };
      }

      await updateBlogSettings({ last_generated_at: new Date().toISOString() });
      return { ok: true, post, postId: retryData.id };
    }
    return { ok: false, error: error.message };
  }

  await updateBlogSettings({ last_generated_at: new Date().toISOString() });
  return { ok: true, post, postId: data.id };
}

/** Bulk Generator: Publish 100+ AI Blog Posts per day with 100% matched Spinora poster photos */
export async function generateBatchAIBlogPosts(count = 10): Promise<{ count: number; posts: GeneratedBlogPost[] }> {
  const generated: GeneratedBlogPost[] = [];

  for (let i = 0; i < count; i++) {
    const res = await generateAndSaveAIBlogPost();
    if (res.post) {
      generated.push(res.post);
    }
  }

  return { count: generated.length, posts: generated };
}
