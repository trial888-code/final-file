-- SPINORA COMBINED MASTER DATABASE MIGRATION
-- Copy and run this entire file in Supabase SQL Editor

-- ==========================================
-- FILE: schema.sql
-- ==========================================
-- Spinora Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  vip_tier TEXT NOT NULL DEFAULT 'bronze' CHECK (vip_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  vip_points INTEGER NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES profiles(id),
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  is_online BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Game requests
CREATE TABLE IF NOT EXISTS game_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  game_name TEXT NOT NULL,
  game_provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  notes TEXT,
  admin_notes TEXT,
  credentials TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  attachment_url TEXT,
  attachment_type TEXT CHECK (attachment_type IN ('image', 'file')),
  attachment_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'promo')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'promotion' CHECK (type IN ('promotion', 'update', 'system')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_points INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_game_requests_user_id ON game_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_game_requests_status ON game_requests(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER game_requests_updated_at BEFORE UPDATE ON game_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code TEXT;
  referrer UUID;
  meta_ref TEXT;
BEGIN
  ref_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8));
  meta_ref := NULLIF(TRIM(NEW.raw_user_meta_data->>'referral_code'), '');

  IF meta_ref IS NOT NULL THEN
    SELECT id INTO referrer FROM public.profiles
    WHERE referral_code = UPPER(meta_ref);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, referral_code, referred_by)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    ref_code,
    referrer
  );

  IF referrer IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, reward_points)
    VALUES (referrer, NEW.id, 100);

    UPDATE public.profiles SET vip_points = vip_points + 100 WHERE id = referrer;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role, supabase_auth_admin;

-- VIP tier auto-update
CREATE OR REPLACE FUNCTION update_vip_tier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vip_points >= 5000 THEN NEW.vip_tier = 'platinum';
  ELSIF NEW.vip_points >= 2000 THEN NEW.vip_tier = 'gold';
  ELSIF NEW.vip_points >= 500 THEN NEW.vip_tier = 'silver';
  ELSE NEW.vip_tier = 'bronze';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vip_tier_update BEFORE UPDATE OF vip_points ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_vip_tier();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Service can insert profiles on signup"
  ON profiles FOR INSERT TO authenticated, service_role WITH CHECK (true);

CREATE POLICY "Public profiles are viewable by authenticated users"
  ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Game requests policies
CREATE POLICY "Users can view own requests"
  ON game_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can create requests"
  ON game_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update requests"
  ON game_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Conversations policies
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update conversations"
  ON conversations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can mark messages read"
  ON messages FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    )
  );

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can create notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trusted inserts from server actions (spin prizes, wallet updates, etc.)
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() <> p_user_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_type NOT IN ('info', 'success', 'warning', 'promo') THEN
    RAISE EXCEPTION 'Invalid notification type';
  END IF;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (p_user_id, p_title, p_message, p_type)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Announcements policies
CREATE POLICY "Anyone can view active announcements"
  ON announcements FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage announcements"
  ON announcements FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Referrals policies
CREATE POLICY "Service can insert referrals on signup"
  ON referrals FOR INSERT TO authenticated, service_role WITH CHECK (true);

CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Seed announcements
INSERT INTO announcements (title, content, type) VALUES
  ('Welcome to Spinora!', 'Join our premium gaming platform and get exclusive access to top games with 24/7 support.', 'promotion'),
  ('VIP Double Points Weekend', 'Earn 2x VIP points on all game requests this weekend only!', 'promotion'),
  ('New Games Added', 'We have added Fire Kirin, Juwa, and Panda Master to our platform.', 'update');


-- ==========================================
-- FILE: signup-email-phone.sql
-- ==========================================
-- Email signup: save phone on profile + auth user + welcome message
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/drpitkvjcwrbzzufwwjt/sql/new
--
-- WHERE TO CHECK PHONE AFTER SIGNUP:
--   Table Editor → public.profiles → "phone" column (NOT Authentication → Users phone filter only)
--
-- ALSO in Dashboard → Authentication → Providers → Email:
--   • Enable "Confirm email"
--   • Confirm signup template must use {{ .ConfirmationURL }} (link), NOT {{ .Token }}
--   • Redirect URLs: http://localhost:3000/auth/callback and https://spinoras.vercel.app/auth/callback

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone) WHERE phone IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code TEXT;
  referrer UUID;
  meta_ref TEXT;
  user_phone TEXT;
  user_whatsapp TEXT;
  user_email TEXT;
  admin_user UUID;
  conv_id UUID;
  welcome_msg TEXT := 'Hey! Welcome to Spinora — we''re genuinely glad you joined us. Browse games, try your daily spin, and message us anytime if you need help with accounts, deposits, or VIP rewards. Our team is here for you!';
BEGIN
  ref_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8));
  meta_ref := NULLIF(TRIM(NEW.raw_user_meta_data->>'referral_code'), '');

  user_phone := COALESCE(NEW.phone, NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''));
  user_whatsapp := NULLIF(TRIM(NEW.raw_user_meta_data->>'whatsapp_number'), '');
  user_email := COALESCE(
    NULLIF(TRIM(NEW.email), ''),
    CASE WHEN user_phone IS NOT NULL THEN user_phone || '@phone.spinora.local' ELSE '' END
  );

  IF meta_ref IS NOT NULL THEN
    SELECT id INTO referrer
    FROM public.profiles
    WHERE referral_code = UPPER(meta_ref);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, whatsapp, referral_code, referred_by)
  VALUES (
    NEW.id,
    user_email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    user_phone,
    user_whatsapp,
    ref_code,
    referrer
  );

  IF referrer IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, reward_points)
    VALUES (referrer, NEW.id, 10);

    UPDATE public.profiles
    SET vip_points = vip_points + 10
    WHERE id = referrer;
  END IF;

  SELECT id INTO admin_user
  FROM public.profiles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;

  IF admin_user IS NOT NULL THEN
    INSERT INTO public.conversations (user_id, admin_id)
    VALUES (NEW.id, admin_user)
    RETURNING id INTO conv_id;

    INSERT INTO public.messages (conversation_id, sender_id, content, is_read)
    VALUES (conv_id, admin_user, welcome_msg, false);

    INSERT INTO public.notifications (user_id, title, message, type, is_read)
    VALUES (
      NEW.id,
      'Welcome to Spinora!',
      'Our team sent you a welcome message. Open Messages to read it.',
      'info',
      false
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user error: %', SQLERRM;
    RAISE;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role, supabase_auth_admin;


-- ==========================================
-- FILE: anti-spam-multi-account.sql
-- ==========================================
-- Spinora multi-account + freeplay abuse protection
-- Run in Supabase SQL Editor AFTER schema.sql / profiles exist.
--
-- Policy:
--   • 3+ accounts on same device → block new signup
--   • 3+ signups from same IP in 7 days → block new signup
--   • 2nd account on same device → signup allowed but freeplay blocked (spin + daily task cash)
--   • Phone uniqueness stays in app (profiles.phone)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE public.security_action AS ENUM (
    'signup',
    'login',
    'spin',
    'task_claim',
    'deposit',
    'withdraw'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ip_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address INET NOT NULL,
  action public.security_action NOT NULL,
  device_id TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_logs_ip_created ON public.ip_logs (ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_logs_user_created ON public.ip_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ip_logs_signup_ip ON public.ip_logs (ip_address, created_at DESC)
  WHERE action = 'signup';

CREATE TABLE IF NOT EXISTS public.device_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (device_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_device_map_device ON public.device_map (device_id);
CREATE INDEX IF NOT EXISTS idx_device_map_user ON public.device_map (user_id);

CREATE TABLE IF NOT EXISTS public.fraud_scores (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  risk_score SMALLINT NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  blocked BOOLEAN NOT NULL DEFAULT false,
  rewards_blocked BOOLEAN NOT NULL DEFAULT false,
  manual_review BOOLEAN NOT NULL DEFAULT false,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_scores_rewards_blocked
  ON public.fraud_scores (rewards_blocked) WHERE rewards_blocked = true;

CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket_key TEXT PRIMARY KEY,
  action public.security_action NOT NULL,
  attempt_count INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.parse_client_ip(p_ip TEXT)
RETURNS INET
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v TEXT;
BEGIN
  v := trim(split_part(COALESCE(p_ip, ''), ',', 1));
  IF v = '' THEN RETURN NULL; END IF;
  BEGIN
    RETURN v::inet;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket_key TEXT,
  p_action public.security_action,
  p_max_attempts INT,
  p_window_seconds INT,
  p_block_seconds INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_row FROM public.rate_limits WHERE bucket_key = p_bucket_key FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (bucket_key, action, attempt_count, window_start)
    VALUES (p_bucket_key, p_action, 1, v_now);
    RETURN jsonb_build_object('allowed', true);
  END IF;

  IF v_row.blocked_until IS NOT NULL AND v_row.blocked_until > v_now THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'cooldown');
  END IF;

  IF v_row.window_start + make_interval(secs => p_window_seconds) < v_now THEN
    UPDATE public.rate_limits
    SET attempt_count = 1, window_start = v_now, blocked_until = NULL, updated_at = v_now
    WHERE bucket_key = p_bucket_key;
    RETURN jsonb_build_object('allowed', true);
  END IF;

  IF v_row.attempt_count >= p_max_attempts THEN
    IF p_block_seconds > 0 THEN
      UPDATE public.rate_limits
      SET blocked_until = v_now + make_interval(secs => p_block_seconds), updated_at = v_now
      WHERE bucket_key = p_bucket_key;
    END IF;
    RETURN jsonb_build_object('allowed', false, 'reason', 'rate_limit');
  END IF;

  UPDATE public.rate_limits
  SET attempt_count = attempt_count + 1, updated_at = v_now
  WHERE bucket_key = p_bucket_key;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Count distinct accounts linked to a device
CREATE OR REPLACE FUNCTION public.device_account_count(p_device_id TEXT)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)::INT
  FROM public.device_map
  WHERE device_id = p_device_id AND length(device_id) >= 16;
$$;

-- Signups from IP in last N days
CREATE OR REPLACE FUNCTION public.ip_signup_count(p_ip INET, p_days INT DEFAULT 7)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT user_id)::INT
  FROM public.ip_logs
  WHERE action = 'signup'
    AND ip_address = p_ip
    AND user_id IS NOT NULL
    AND created_at > NOW() - make_interval(days => p_days);
$$;

-- Called from Next.js BEFORE sending OTP / creating auth user
CREATE OR REPLACE FUNCTION public.check_signup_allowed(
  p_ip TEXT,
  p_device_id TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip INET := public.parse_client_ip(p_ip);
  v_rl JSONB;
  v_device_users INT := 0;
  v_ip_signups INT := 0;
BEGIN
  IF v_ip IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_request');
  END IF;

  v_rl := public.check_rate_limit('signup:ip:' || host(v_ip), 'signup', 5, 86400, 3600);
  IF NOT (v_rl->>'allowed')::boolean THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'too_many_attempts',
      'message', 'Too many signup attempts from this network. Try again later.'
    );
  END IF;

  IF p_device_id IS NOT NULL AND length(p_device_id) >= 16 THEN
    v_rl := public.check_rate_limit('signup:device:' || p_device_id, 'signup', 3, 86400, 7200);
    IF NOT (v_rl->>'allowed')::boolean THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'too_many_attempts',
        'message', 'Too many signup attempts from this device. Try again later.'
      );
    END IF;

    v_device_users := public.device_account_count(p_device_id);
    IF v_device_users >= 2 THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'multi_account_device',
        'message', 'Only one Spinora account is allowed per device. Sign in to your existing account.'
      );
    END IF;
  END IF;

  v_ip_signups := public.ip_signup_count(v_ip, 7);
  IF v_ip_signups >= 2 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'multi_account_ip',
      'message', 'Too many accounts were created from this network recently. Contact support if you need help.'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'secondary_device_account', COALESCE(v_device_users, 0) >= 1
  );
END;
$$;

-- Link device + IP after successful signup (profile must exist)
CREATE OR REPLACE FUNCTION public.link_user_signup(
  p_user_id UUID,
  p_ip TEXT,
  p_device_id TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip INET := public.parse_client_ip(p_ip);
  v_device_users INT := 0;
  v_flags JSONB := '[]'::jsonb;
  v_rewards_blocked BOOLEAN := false;
  v_risk SMALLINT := 0;
BEGIN
  IF p_user_id IS NULL OR v_ip IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  INSERT INTO public.fraud_scores (user_id) VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF EXISTS (
    SELECT 1 FROM public.ip_logs
    WHERE user_id = p_user_id AND action = 'signup'
  ) THEN
    IF p_device_id IS NOT NULL AND length(p_device_id) >= 16 THEN
      INSERT INTO public.device_map (device_id, user_id, user_agent, last_seen_at)
      VALUES (p_device_id, p_user_id, p_user_agent, NOW())
      ON CONFLICT (device_id, user_id)
      DO UPDATE SET last_seen_at = NOW(), user_agent = EXCLUDED.user_agent;
    END IF;
    RETURN jsonb_build_object('ok', true, 'already_linked', true);
  END IF;

  INSERT INTO public.ip_logs (user_id, ip_address, action, device_id, user_agent)
  VALUES (p_user_id, v_ip, 'signup', p_device_id, p_user_agent);

  IF p_device_id IS NOT NULL AND length(p_device_id) >= 16 THEN
    INSERT INTO public.device_map (device_id, user_id, user_agent, last_seen_at)
    VALUES (p_device_id, p_user_id, p_user_agent, NOW())
    ON CONFLICT (device_id, user_id)
    DO UPDATE SET last_seen_at = NOW(), user_agent = EXCLUDED.user_agent;

    v_device_users := public.device_account_count(p_device_id);
    IF v_device_users >= 2 THEN
      v_rewards_blocked := true;
      v_flags := v_flags || jsonb_build_array('shared_device_multi_account');
      v_risk := 60;
    ELSIF v_device_users >= 1 THEN
      -- Should not happen if check_signup_allowed ran first; still flag
      v_rewards_blocked := true;
      v_flags := v_flags || jsonb_build_array('secondary_device_account');
      v_risk := 45;
    END IF;
  END IF;

  IF public.ip_signup_count(v_ip, 7) >= 2 THEN
    v_rewards_blocked := true;
    v_flags := v_flags || jsonb_build_array('shared_ip_multi_account');
    v_risk := GREATEST(v_risk, 50);
  END IF;

  UPDATE public.fraud_scores
  SET
    risk_score = GREATEST(risk_score, v_risk),
    flags = fraud_scores.flags || v_flags,
    rewards_blocked = rewards_blocked OR v_rewards_blocked,
    manual_review = manual_review OR v_rewards_blocked,
    last_calculated_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  IF p_device_id IS NOT NULL AND public.device_account_count(p_device_id) >= 3 THEN
    UPDATE public.profiles SET is_suspended = true WHERE id = p_user_id;
    UPDATE public.fraud_scores
    SET blocked = true, risk_score = GREATEST(risk_score, 90)
    WHERE user_id = p_user_id;
    v_rewards_blocked := true;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'rewards_blocked', v_rewards_blocked,
    'risk_score', v_risk
  );
END;
$$;

-- Block daily spin + task cash claims for flagged / multi-account users
CREATE OR REPLACE FUNCTION public.assert_freeplay_allowed(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suspended BOOLEAN;
  v_blocked BOOLEAN;
  v_rewards_blocked BOOLEAN;
  v_risk SMALLINT;
BEGIN
  SELECT is_suspended INTO v_suspended FROM public.profiles WHERE id = p_user_id;
  IF COALESCE(v_suspended, false) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'suspended',
      'message', 'Your account is suspended. Contact support.'
    );
  END IF;

  SELECT blocked, rewards_blocked, risk_score
  INTO v_blocked, v_rewards_blocked, v_risk
  FROM public.fraud_scores
  WHERE user_id = p_user_id;

  IF COALESCE(v_blocked, false) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'blocked',
      'message', 'This account cannot claim free rewards. Contact support.'
    );
  END IF;

  IF COALESCE(v_rewards_blocked, false) OR COALESCE(v_risk, 0) >= 50 THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rewards_blocked',
      'message', 'Free spin and daily task rewards are not available on this account. Make a deposit or contact support.'
    );
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Auto-init fraud row when profile is created
CREATE OR REPLACE FUNCTION public.init_fraud_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.fraud_scores (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS init_fraud_score_trigger ON public.profiles;
CREATE TRIGGER init_fraud_score_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.init_fraud_score();

-- ---------------------------------------------------------------------------
-- RLS — users cannot write security data; admins can read
-- ---------------------------------------------------------------------------

ALTER TABLE public.ip_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own fraud score" ON public.fraud_scores;
CREATE POLICY "Users read own fraud score"
  ON public.fraud_scores FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read fraud_scores" ON public.fraud_scores;
CREATE POLICY "Admins read fraud_scores"
  ON public.fraud_scores FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins update fraud_scores" ON public.fraud_scores;
CREATE POLICY "Admins update fraud_scores"
  ON public.fraud_scores FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins read ip_logs" ON public.ip_logs;
CREATE POLICY "Admins read ip_logs"
  ON public.ip_logs FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins read device_map" ON public.device_map;
CREATE POLICY "Admins read device_map"
  ON public.device_map FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins read rate_limits" ON public.rate_limits;
CREATE POLICY "Admins read rate_limits"
  ON public.rate_limits FOR SELECT TO authenticated
  USING (public.is_admin());

GRANT EXECUTE ON FUNCTION public.check_signup_allowed TO service_role;
GRANT EXECUTE ON FUNCTION public.link_user_signup TO service_role;
GRANT EXECUTE ON FUNCTION public.assert_freeplay_allowed TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;


-- ==========================================
-- FILE: auth-phone.sql
-- ==========================================
-- Phone & WhatsApp auth support for Spinora profiles
-- Run in Supabase SQL Editor after main schema

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_whatsapp ON public.profiles (whatsapp) WHERE whatsapp IS NOT NULL;

-- Update signup trigger to store phone / WhatsApp from auth metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code TEXT;
  referrer UUID;
  meta_ref TEXT;
  user_phone TEXT;
  user_whatsapp TEXT;
  user_email TEXT;
BEGIN
  ref_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8));
  meta_ref := NULLIF(TRIM(NEW.raw_user_meta_data->>'referral_code'), '');

  user_phone := COALESCE(NEW.phone, NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''));
  user_whatsapp := NULLIF(TRIM(NEW.raw_user_meta_data->>'whatsapp_number'), '');
  user_email := COALESCE(
    NULLIF(TRIM(NEW.email), ''),
    CASE WHEN user_phone IS NOT NULL THEN user_phone || '@phone.spinora.local' ELSE '' END
  );

  IF meta_ref IS NOT NULL THEN
    SELECT id INTO referrer
    FROM public.profiles
    WHERE referral_code = UPPER(meta_ref);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, whatsapp, referral_code, referred_by)
  VALUES (
    NEW.id,
    user_email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    user_phone,
    user_whatsapp,
    ref_code,
    referrer
  );

  IF referrer IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, reward_points)
    VALUES (referrer, NEW.id, 100);

    UPDATE public.profiles
    SET vip_points = vip_points + 100
    WHERE id = referrer;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user error: %', SQLERRM;
    RAISE;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role, supabase_auth_admin;


-- ==========================================
-- FILE: auth-email-otp.sql
-- ==========================================
-- Email OTP login (phone identifies account, code sent to email)
-- Optional: only needed if SUPABASE_SERVICE_ROLE_KEY is not set on the server.
-- With service role in .env, the app resolves phone → email without this file.

CREATE OR REPLACE FUNCTION public.resolve_login_email(p_identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone TEXT;
  v_email TEXT;
BEGIN
  p_identifier := TRIM(p_identifier);
  IF p_identifier = '' THEN RETURN NULL; END IF;

  IF p_identifier LIKE '%@%' THEN
    RETURN LOWER(p_identifier);
  END IF;

  v_phone := '+' || regexp_replace(p_identifier, '\D', '', 'g');
  IF length(regexp_replace(v_phone, '\D', '', 'g')) < 8 THEN RETURN NULL; END IF;

  SELECT email INTO v_email
  FROM public.profiles
  WHERE phone = v_phone
  LIMIT 1;

  IF v_email IS NULL OR v_email LIKE '%@phone.spinora.local' THEN
    RETURN NULL;
  END IF;

  RETURN LOWER(v_email);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_login_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_login_email(TEXT) TO anon, authenticated, service_role;


-- ==========================================
-- FILE: welcome-message.sql
-- ==========================================
-- Admin proactive chat + automatic welcome message on signup
-- Run in Supabase SQL Editor

-- Allow admins to start conversations with any user
DROP POLICY IF EXISTS "Admins can create conversations for users" ON public.conversations;
CREATE POLICY "Admins can create conversations for users"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Signup: create profile + welcome conversation/message from first admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref_code TEXT;
  referrer UUID;
  meta_ref TEXT;
  user_phone TEXT;
  user_whatsapp TEXT;
  user_email TEXT;
  admin_user UUID;
  conv_id UUID;
  welcome_msg TEXT := 'Hey! Welcome to Spinora — we''re genuinely glad you joined us. Browse games, try your daily spin, and message us anytime if you need help with accounts, deposits, or VIP rewards. Our team is here for you!';
BEGIN
  ref_code := UPPER(SUBSTRING(MD5(NEW.id::TEXT) FROM 1 FOR 8));
  meta_ref := NULLIF(TRIM(NEW.raw_user_meta_data->>'referral_code'), '');

  user_phone := COALESCE(NEW.phone, NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''));
  user_whatsapp := NULLIF(TRIM(NEW.raw_user_meta_data->>'whatsapp_number'), '');
  user_email := COALESCE(
    NULLIF(TRIM(NEW.email), ''),
    CASE WHEN user_phone IS NOT NULL THEN user_phone || '@phone.spinora.local' ELSE '' END
  );

  IF meta_ref IS NOT NULL THEN
    SELECT id INTO referrer
    FROM public.profiles
    WHERE referral_code = UPPER(meta_ref);
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, whatsapp, referral_code, referred_by)
  VALUES (
    NEW.id,
    user_email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    user_phone,
    user_whatsapp,
    ref_code,
    referrer
  );

  IF referrer IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, reward_points)
    VALUES (referrer, NEW.id, 100);

    UPDATE public.profiles
    SET vip_points = vip_points + 100
    WHERE id = referrer;
  END IF;

  -- Welcome chat from first admin account
  SELECT id INTO admin_user
  FROM public.profiles
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;

  IF admin_user IS NOT NULL THEN
    INSERT INTO public.conversations (user_id, admin_id)
    VALUES (NEW.id, admin_user)
    RETURNING id INTO conv_id;

    INSERT INTO public.messages (conversation_id, sender_id, content, is_read)
    VALUES (conv_id, admin_user, welcome_msg, false);

    INSERT INTO public.notifications (user_id, title, message, type, is_read)
    VALUES (
      NEW.id,
      'Welcome to Spinora!',
      'Our team sent you a welcome message. Open Messages to read it.',
      'info',
      false
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user error: %', SQLERRM;
    RAISE;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role, supabase_auth_admin;


-- ==========================================
-- FILE: chat-attachments.sql
-- ==========================================
-- Chat attachments: run in Supabase SQL Editor
-- Safe to re-run (idempotent)

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment_type TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_attachment_type_check'
  ) THEN
    ALTER TABLE messages
      ADD CONSTRAINT messages_attachment_type_check
      CHECK (attachment_type IN ('image', 'file'));
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Chat participants can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Chat participants can read attachments" ON storage.objects;

CREATE POLICY "Chat participants can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = (storage.foldername(name))[1]::uuid
    AND (
      c.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);

CREATE POLICY "Chat participants can read attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = (storage.foldername(name))[1]::uuid
    AND (
      c.user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
);


-- ==========================================
-- FILE: deposit-requests.sql
-- ==========================================
-- Deposit requests + proof storage — run in Supabase SQL Editor once.
-- Requires: chat-attachments bucket (supabase/chat-attachments.sql)

CREATE TABLE IF NOT EXISTS public.deposit_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  game_slug TEXT,
  game_name TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (
    payment_method IN ('paypal', 'chime', 'cashapp', 'bitcoin', 'usdt', 'venmo')
  ),
  amount NUMERIC(10, 2),
  proof_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'rejected')
  ),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deposit_requests_user ON public.deposit_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_requests_status ON public.deposit_requests (status);

CREATE TRIGGER deposit_requests_updated_at
  BEFORE UPDATE ON public.deposit_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own deposits"
  ON public.deposit_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users create own deposits"
  ON public.deposit_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all deposits"
  ON public.deposit_requests FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins update deposits"
  ON public.deposit_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE public.deposit_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deposit_requests;

-- Storage: deposit-proofs/{user_id}/...
DROP POLICY IF EXISTS "Users can upload deposit proof images" ON storage.objects;
DROP POLICY IF EXISTS "Users and admins can read deposit proofs" ON storage.objects;

CREATE POLICY "Users can upload deposit proof images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = 'deposit-proofs'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users and admins can read deposit proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = 'deposit-proofs'
  AND (
    (storage.foldername(name))[2] = auth.uid()::text
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
);


-- ==========================================
-- FILE: deposit-usdt-payment.sql
-- ==========================================
-- Add USDT to deposit payment methods (run once if deposit_requests already exists)
ALTER TABLE public.deposit_requests
  DROP CONSTRAINT IF EXISTS deposit_requests_payment_method_check;

ALTER TABLE public.deposit_requests
  ADD CONSTRAINT deposit_requests_payment_method_check
  CHECK (payment_method IN ('paypal', 'chime', 'cashapp', 'bitcoin', 'usdt', 'venmo'));


-- ==========================================
-- FILE: wheel-spins.sql
-- ==========================================
-- Run this in Supabase SQL Editor after main schema

CREATE TABLE IF NOT EXISTS wheel_spins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  prize_label TEXT NOT NULL,
  prize_type TEXT NOT NULL CHECK (prize_type IN ('cash', 'luck', 'points')),
  prize_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wheel_spins_user_id ON wheel_spins(user_id);
CREATE INDEX IF NOT EXISTS idx_wheel_spins_created_at ON wheel_spins(created_at);

ALTER TABLE wheel_spins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wheel spins"
  ON wheel_spins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own wheel spins"
  ON wheel_spins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all wheel spins"
  ON wheel_spins FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));


-- ==========================================
-- FILE: wallets.sql
-- ==========================================
-- Run in Supabase SQL Editor after schema.sql and wheel-spins.sql

-- Wallet balances on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_wallet NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashout_wallet NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- Transaction history
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('current', 'bonus', 'cashout')),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'adjustment')),
  source TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet transactions"
  ON wallet_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all wallet transactions"
  ON wallet_transactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Credit wallet (spin prizes, admin grants) — SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_wallet_type TEXT,
  p_source TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() <> p_user_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF p_wallet_type = 'bonus' THEN
    PERFORM set_config('app.wallet_update', 'true', true);
    UPDATE profiles SET bonus_wallet = bonus_wallet + p_amount WHERE id = p_user_id;
  ELSIF p_wallet_type = 'current' THEN
    PERFORM set_config('app.wallet_update', 'true', true);
    UPDATE profiles SET wallet_balance = wallet_balance + p_amount WHERE id = p_user_id;
  ELSIF p_wallet_type = 'cashout' THEN
    PERFORM set_config('app.wallet_update', 'true', true);
    UPDATE profiles SET cashout_wallet = cashout_wallet + p_amount WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (p_user_id, p_amount, p_wallet_type, 'credit', p_source, p_description, auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_wallet(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;

-- Debit wallet (admin only when adjusting another user)
CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_wallet_type TEXT,
  p_source TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removed NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  IF p_wallet_type = 'bonus' THEN
    SELECT LEAST(bonus_wallet, p_amount) INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET bonus_wallet = GREATEST(0, bonus_wallet - p_amount) WHERE id = p_user_id;
  ELSIF p_wallet_type = 'current' THEN
    SELECT LEAST(wallet_balance, p_amount) INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET wallet_balance = GREATEST(0, wallet_balance - p_amount) WHERE id = p_user_id;
  ELSIF p_wallet_type = 'cashout' THEN
    SELECT LEAST(cashout_wallet, p_amount) INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET cashout_wallet = GREATEST(0, cashout_wallet - p_amount) WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF v_removed IS NULL OR v_removed <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (p_user_id, v_removed, p_wallet_type, 'debit', p_source, p_description, auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.debit_wallet(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;

-- Reset wallet balance to zero (admin only)
CREATE OR REPLACE FUNCTION public.reset_wallet(
  p_user_id UUID,
  p_wallet_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removed NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  IF p_wallet_type = 'bonus' THEN
    SELECT bonus_wallet INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET bonus_wallet = 0 WHERE id = p_user_id;
  ELSIF p_wallet_type = 'current' THEN
    SELECT wallet_balance INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET wallet_balance = 0 WHERE id = p_user_id;
  ELSIF p_wallet_type = 'cashout' THEN
    SELECT cashout_wallet INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET cashout_wallet = 0 WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF v_removed IS NULL OR v_removed <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (p_user_id, v_removed, p_wallet_type, 'adjustment', 'admin', COALESCE(p_description, 'Wallet reset to zero'), auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_wallet(UUID, TEXT, TEXT) TO authenticated;

-- Prevent users from manually editing wallet columns via profile update
CREATE OR REPLACE FUNCTION public.protect_wallet_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.wallet_balance IS DISTINCT FROM NEW.wallet_balance
      OR OLD.bonus_wallet IS DISTINCT FROM NEW.bonus_wallet
      OR OLD.cashout_wallet IS DISTINCT FROM NEW.cashout_wallet) THEN
    IF current_setting('app.wallet_update', true) = 'true' THEN
      RETURN NEW;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
      NEW.wallet_balance := OLD.wallet_balance;
      NEW.bonus_wallet := OLD.bonus_wallet;
      NEW.cashout_wallet := OLD.cashout_wallet;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_wallet_columns_trigger ON profiles;
CREATE TRIGGER protect_wallet_columns_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_wallet_columns();


-- ==========================================
-- FILE: wallet-cashout.sql
-- ==========================================
-- Add Cashout wallet — run in Supabase SQL Editor (if wallets.sql already ran)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cashout_wallet NUMERIC(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_wallet_type_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_wallet_type_check
  CHECK (wallet_type IN ('current', 'bonus', 'cashout'));

CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_wallet_type TEXT,
  p_source TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() <> p_user_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  IF p_wallet_type = 'bonus' THEN
    UPDATE profiles SET bonus_wallet = bonus_wallet + p_amount WHERE id = p_user_id;
  ELSIF p_wallet_type = 'current' THEN
    UPDATE profiles SET wallet_balance = wallet_balance + p_amount WHERE id = p_user_id;
  ELSIF p_wallet_type = 'cashout' THEN
    UPDATE profiles SET cashout_wallet = cashout_wallet + p_amount WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (p_user_id, p_amount, p_wallet_type, 'credit', p_source, p_description, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_wallet_type TEXT,
  p_source TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removed NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  IF p_wallet_type = 'bonus' THEN
    SELECT LEAST(bonus_wallet, p_amount) INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET bonus_wallet = GREATEST(0, bonus_wallet - p_amount) WHERE id = p_user_id;
  ELSIF p_wallet_type = 'current' THEN
    SELECT LEAST(wallet_balance, p_amount) INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET wallet_balance = GREATEST(0, wallet_balance - p_amount) WHERE id = p_user_id;
  ELSIF p_wallet_type = 'cashout' THEN
    SELECT LEAST(cashout_wallet, p_amount) INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET cashout_wallet = GREATEST(0, cashout_wallet - p_amount) WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF v_removed IS NULL OR v_removed <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (p_user_id, v_removed, p_wallet_type, 'debit', p_source, p_description, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_wallet(
  p_user_id UUID,
  p_wallet_type TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removed NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  PERFORM set_config('app.wallet_update', 'true', true);

  IF p_wallet_type = 'bonus' THEN
    SELECT bonus_wallet INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET bonus_wallet = 0 WHERE id = p_user_id;
  ELSIF p_wallet_type = 'current' THEN
    SELECT wallet_balance INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET wallet_balance = 0 WHERE id = p_user_id;
  ELSIF p_wallet_type = 'cashout' THEN
    SELECT cashout_wallet INTO v_removed FROM profiles WHERE id = p_user_id;
    UPDATE profiles SET cashout_wallet = 0 WHERE id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Invalid wallet type';
  END IF;

  IF v_removed IS NULL OR v_removed <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO wallet_transactions (user_id, amount, wallet_type, transaction_type, source, description, created_by)
  VALUES (p_user_id, v_removed, p_wallet_type, 'adjustment', 'admin', COALESCE(p_description, 'Wallet reset to zero'), auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_wallet_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.wallet_balance IS DISTINCT FROM NEW.wallet_balance
      OR OLD.bonus_wallet IS DISTINCT FROM NEW.bonus_wallet
      OR OLD.cashout_wallet IS DISTINCT FROM NEW.cashout_wallet) THEN
    IF current_setting('app.wallet_update', true) = 'true' THEN
      RETURN NEW;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
      NEW.wallet_balance := OLD.wallet_balance;
      NEW.bonus_wallet := OLD.bonus_wallet;
      NEW.cashout_wallet := OLD.cashout_wallet;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_wallet(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.debit_wallet(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_wallet(UUID, TEXT, TEXT) TO authenticated;


-- ==========================================
-- FILE: daily-tasks.sql
-- ==========================================
-- Daily Task System — run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.user_task_levels (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 10),
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'active', 'completed')),
  points_earned INTEGER NOT NULL DEFAULT 0,
  reward_granted BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, level)
);

CREATE TABLE IF NOT EXISTS public.user_task_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 10),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  proof_note TEXT,
  proof_url TEXT,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_user_task_submissions_user ON public.user_task_submissions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_task_submissions_status ON public.user_task_submissions (status);
CREATE INDEX IF NOT EXISTS idx_user_task_submissions_level ON public.user_task_submissions (level);

CREATE TRIGGER user_task_submissions_updated_at
  BEFORE UPDATE ON public.user_task_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.user_task_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_task_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own task levels"
  ON public.user_task_levels FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users view own task submissions"
  ON public.user_task_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own task submissions"
  ON public.user_task_submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own pending submissions"
  ON public.user_task_submissions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all task submissions"
  ON public.user_task_submissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins update task submissions"
  ON public.user_task_submissions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins view all task levels"
  ON public.user_task_levels FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Initialize levels for a user (level 1 active)
CREATE OR REPLACE FUNCTION public.init_user_task_levels(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_task_levels (user_id, level, status)
  SELECT p_user_id, lvl,
    CASE WHEN lvl = 1 THEN 'active' ELSE 'locked' END
  FROM generate_series(1, 10) AS lvl
  ON CONFLICT (user_id, level) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.init_user_task_levels(UUID) TO authenticated;

-- Upsert level progress (service path via admin review)
CREATE OR REPLACE FUNCTION public.upsert_user_task_level(
  p_user_id UUID,
  p_level INTEGER,
  p_points INTEGER,
  p_status TEXT,
  p_reward_granted BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_task_levels (user_id, level, status, points_earned, reward_granted, completed_at)
  VALUES (
    p_user_id,
    p_level,
    p_status,
    p_points,
    p_reward_granted,
    CASE WHEN p_status = 'completed' THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, level) DO UPDATE SET
    status = EXCLUDED.status,
    points_earned = EXCLUDED.points_earned,
    reward_granted = COALESCE(EXCLUDED.reward_granted, user_task_levels.reward_granted),
    completed_at = CASE
      WHEN EXCLUDED.status = 'completed' THEN COALESCE(user_task_levels.completed_at, NOW())
      ELSE user_task_levels.completed_at
    END;

  -- Next level unlocks only after claim + 24h (see unlock_due_task_levels).
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_user_task_level(UUID, INTEGER, INTEGER, TEXT, BOOLEAN) TO authenticated;


-- ==========================================
-- FILE: reviews.sql
-- ==========================================
-- User reviews with star ratings — run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL CHECK (char_length(trim(comment)) >= 3),
  admin_liked BOOLEAN NOT NULL DEFAULT false,
  admin_liked_at TIMESTAMPTZ,
  admin_comment TEXT,
  admin_commented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_admin_liked ON public.reviews (admin_liked) WHERE admin_liked = true;

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view reviews"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can create own review"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own review"
  ON public.reviews FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update any review"
  ON public.reviews FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can delete reviews"
  ON public.reviews FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;


-- ==========================================
-- FILE: message-notifications.sql
-- ==========================================
-- Run in Supabase SQL Editor so chat messages create bell notifications.

CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv_user_id UUID;
  conv_admin_id UUID;
  sender_role TEXT;
  sender_name TEXT;
  recipient_id UUID;
  preview TEXT;
BEGIN
  SELECT c.user_id, c.admin_id
  INTO conv_user_id, conv_admin_id
  FROM conversations c
  WHERE c.id = NEW.conversation_id;

  SELECT role, COALESCE(NULLIF(TRIM(full_name), ''), 'Customer')
  INTO sender_role, sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  IF sender_role = 'admin' THEN
    RETURN NEW;
  END IF;

  recipient_id := conv_admin_id;
  IF recipient_id IS NULL THEN
    SELECT id INTO recipient_id
    FROM profiles
    WHERE role = 'admin'
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF recipient_id IS NULL OR recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  preview := COALESCE(
    NULLIF(TRIM(NEW.content), ''),
    CASE
      WHEN NEW.attachment_type = 'image' THEN 'Sent you an image'
      WHEN NEW.attachment_type = 'file' THEN 'Sent you a file'
      ELSE 'Sent you a message'
    END
  );

  IF LENGTH(preview) > 140 THEN
    preview := LEFT(preview, 137) || '...';
  END IF;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    recipient_id,
    CASE
      WHEN sender_role = 'admin' THEN 'New message from Support'
      ELSE 'New message from ' || sender_name
    END,
    preview,
    'info'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_notify ON messages;
CREATE TRIGGER on_message_notify
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_message_recipient();


-- ==========================================
-- FILE: notifications-rpc.sql
-- ==========================================
-- Run in Supabase SQL Editor if spin/wallet notifications don't appear.
-- Root cause: RLS only allowed admins to INSERT into notifications.

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF auth.uid() <> p_user_id AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_type NOT IN ('info', 'success', 'warning', 'promo') THEN
    RAISE EXCEPTION 'Invalid notification type';
  END IF;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (p_user_id, p_title, p_message, p_type)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT) TO authenticated;


-- ==========================================
-- FILE: admin-presence.sql
-- ==========================================
-- Admin presence for Telegram offline alerts.
-- Run in Supabase SQL Editor once.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_admin_last_seen
  ON profiles (last_seen_at)
  WHERE role = 'admin';

CREATE INDEX IF NOT EXISTS idx_profiles_user_last_seen
  ON profiles (last_seen_at)
  WHERE role = 'user';


-- ==========================================
-- FILE: ai-system.sql
-- ==========================================
-- ==========================================
-- SPINORA AI SUPERCHARGE MIGRATION
-- AI Auto Blog, Telegram Broadcaster, AI Chatbot & Autonomous Analyzer
-- ==========================================

-- 1. AI Blog Settings Table
CREATE TABLE IF NOT EXISTS public.ai_blog_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  topics TEXT[] NOT NULL DEFAULT ARRAY['Online Gaming', 'Fish Table Games', 'Slot Strategies', 'Casino Bonuses', 'Spinora Guides'],
  target_keywords TEXT[] NOT NULL DEFAULT ARRAY['play online slots', 'juwa 777 download', 'orion stars online', 'fire kirin deposit', 'spinora bonus code'],
  posting_frequency_hours INT NOT NULL DEFAULT 24,
  ai_provider TEXT NOT NULL DEFAULT 'smart_auto',
  ai_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  auto_publish BOOLEAN NOT NULL DEFAULT true,
  auto_telegram_broadcast BOOLEAN NOT NULL DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. AI Telegram Settings Table
CREATE TABLE IF NOT EXISTS public.ai_telegram_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_post_blog BOOLEAN NOT NULL DEFAULT true,
  auto_post_promos BOOLEAN NOT NULL DEFAULT true,
  template_header TEXT NOT NULL DEFAULT '🔥 <b>SPINORA GAMING UPDATE</b> 🔥',
  template_footer TEXT NOT NULL DEFAULT '👉 Join now & claim your instant deposit bonus! 🚀',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. AI Chatbot Settings Table
CREATE TABLE IF NOT EXISTS public.ai_chatbot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  bot_name TEXT NOT NULL DEFAULT 'Spinora AI Assistant',
  system_prompt TEXT NOT NULL DEFAULT 'You are Spinora AI Assistant, a friendly and highly knowledgeable gaming support bot. You assist users with game accounts (Juwa, Fire Kirin, Orion Stars, Game Vault), deposits, cashouts, VIP tiers, and bonuses.',
  auto_reply_enabled BOOLEAN NOT NULL DEFAULT true,
  human_handover_threshold NUMERIC(3, 2) NOT NULL DEFAULT 0.60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. AI Chatbot Logs Table
CREATE TABLE IF NOT EXISTS public.ai_chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_query TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  confidence_score NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
  escalated_to_human BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. System Health & Autonomous Analyzer Logs Table
CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  health_score INT NOT NULL DEFAULT 100,
  seo_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  cron_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  database_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.ai_blog_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_telegram_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chatbot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read / staff manage policies
CREATE POLICY "Allow staff select ai_blog_settings" ON public.ai_blog_settings FOR SELECT USING (true);
CREATE POLICY "Allow staff update ai_blog_settings" ON public.ai_blog_settings FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow staff select ai_telegram_settings" ON public.ai_telegram_settings FOR SELECT USING (true);
CREATE POLICY "Allow staff update ai_telegram_settings" ON public.ai_telegram_settings FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow staff select ai_chatbot_settings" ON public.ai_chatbot_settings FOR SELECT USING (true);
CREATE POLICY "Allow staff update ai_chatbot_settings" ON public.ai_chatbot_settings FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert ai_chat_logs" ON public.ai_chat_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select ai_chat_logs" ON public.ai_chat_logs FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert system_health_logs" ON public.system_health_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select system_health_logs" ON public.system_health_logs FOR SELECT USING (true);

-- Pre-seed default settings if empty
INSERT INTO public.ai_blog_settings (id) VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.ai_telegram_settings (id) VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.ai_chatbot_settings (id) VALUES ('00000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;


