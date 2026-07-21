-- ============================================================================
-- Spinora · 0200 · Add telegram_sent status tracking to blog_posts
-- ============================================================================

ALTER TABLE public.blog_posts 
  ADD COLUMN IF NOT EXISTS telegram_sent boolean NOT NULL DEFAULT false;

-- Mark all existing posts as sent so the cron doesn't broadcast historical posts
UPDATE public.blog_posts SET telegram_sent = true;
