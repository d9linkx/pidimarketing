-- 1) Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  email text,
  avatar_url text,
  balance numeric DEFAULT 0,
  pending_balance numeric DEFAULT 0,
  completed_tasks integer DEFAULT 0,
  user_role text DEFAULT 'performer',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 3) Admin whitelist
CREATE TABLE IF NOT EXISTS public.admin_whitelist (
  id serial PRIMARY KEY,
  email text,
  user_id uuid,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- 4) Campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  platform text,
  target_url text,
  goal_count integer,
  current_count integer DEFAULT 0,
  instructions text,
  payment_proof_url text,
  total_cost numeric DEFAULT 0,
  status text DEFAULT 'pending_verification',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 5) Transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id uuid,
  amount numeric DEFAULT 0,
  type text,
  status text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL
);

-- 6) Engagements
CREATE TABLE IF NOT EXISTS public.engagements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  performer_id uuid NOT NULL,
  platform text,
  quality_score integer DEFAULT 0,
  proof_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (performer_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 7) Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid,
  performer_id uuid,
  status text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (performer_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- 8) Global activity
CREATE TABLE IF NOT EXISTS public.global_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text,
  user_handle text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 9) Proofs metadata (optional)
CREATE TABLE IF NOT EXISTS public.proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text,
  public_url text,
  uploaded_by uuid,
  uploaded_at timestamptz DEFAULT now()
);

-- 10) Useful indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON public.campaigns (creator_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_engagements_campaign ON public.engagements (campaign_id);

-- 11) Trigger function: increment campaign.current_count on new engagement
CREATE OR REPLACE FUNCTION public.increment_campaign_count() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.campaigns
    SET current_count = COALESCE(current_count,0) + 1,
        updated_at = now()
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE t.tgname = 'engagements_increment_campaign_count'
      AND c.relname = 'engagements'
  ) THEN
    CREATE TRIGGER engagements_increment_campaign_count
      AFTER INSERT ON public.engagements
      FOR EACH ROW EXECUTE FUNCTION public.increment_campaign_count();
  END IF;
END;
$$;

-- 12) Helper: is_admin() checks admin_whitelist by user_id or email
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_whitelist aw
    WHERE 
      -- Compare UUID to UUID
      (aw.user_id = auth.uid()) 
      OR 
      -- Compare Text to Text
      (aw.email IS NOT NULL AND aw.email = (
          SELECT u.email FROM auth.users u 
          WHERE u.id = auth.uid() 
          LIMIT 1
      ))
  );
$$;

-- 13) Enable Row Level Security (RLS) and create policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_whitelist ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS select_own_profile ON public.profiles;
CREATE POLICY select_own_profile ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS insert_own_profile ON public.profiles;
CREATE POLICY insert_own_profile ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS update_own_profile ON public.profiles;
CREATE POLICY update_own_profile ON public.profiles FOR UPDATE USING (auth.uid() = id OR public.is_admin());

-- Campaigns policies
DROP POLICY IF EXISTS select_active_campaigns_public ON public.campaigns;
CREATE POLICY select_active_campaigns_public ON public.campaigns FOR SELECT USING (status = 'active' OR auth.uid() = creator_id OR public.is_admin());

DROP POLICY IF EXISTS insert_campaigns_by_creator ON public.campaigns;
CREATE POLICY insert_campaigns_by_creator ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = creator_id OR public.is_admin());

DROP POLICY IF EXISTS update_campaigns_by_owner_or_admin ON public.campaigns;
CREATE POLICY update_campaigns_by_owner_or_admin ON public.campaigns FOR UPDATE USING (auth.uid() = creator_id OR public.is_admin());

-- Transactions policies
DROP POLICY IF EXISTS select_own_transactions ON public.transactions;
CREATE POLICY select_own_transactions ON public.transactions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- Engagements policies
DROP POLICY IF EXISTS select_engagements_for_creator_or_admin ON public.engagements;
CREATE POLICY select_engagements_for_creator_or_admin ON public.engagements FOR SELECT USING (
  public.is_admin() 
  OR auth.uid() = performer_id 
  OR EXISTS(SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.creator_id = auth.uid())
);

DROP POLICY IF EXISTS insert_engagements_by_performer ON public.engagements;
CREATE POLICY insert_engagements_by_performer ON public.engagements FOR INSERT WITH CHECK (auth.uid() = performer_id);

-- 14) Optional seeding (admin account + small demo)
-- Replace the admin UUID and email with your real admin if you prefer.
-- YOU PROVIDED earlier: 93ca13ef-3aff-4679-8f00-f43db5f987f8
INSERT INTO public.admin_whitelist (email, user_id, reason)
VALUES ('admin-93ca13ef-3aff-4679-8f00-f43db5f987f8@example.com', '93ca13ef-3aff-4679-8f00-f43db5f987f8', 'bootstrap admin');

INSERT INTO public.profiles (id, full_name, email, user_role, balance)
VALUES ('93ca13ef-3aff-4679-8f00-f43db5f987f8', 'Admin Tester', 'admin-93ca13ef-3aff-4679-8f00-f43db5f987f8@example.com', 'admin', 1000)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, user_role = EXCLUDED.user_role;

-- Demo creator + campaign + transaction
INSERT INTO public.profiles (id, full_name, user_role)
VALUES ('11111111-1111-1111-1111-111111111111', 'Creator One', 'creator')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.campaigns (id, creator_id, platform, target_url, goal_count, total_cost, status)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'instagram', 'https://example.com/post', 20, 2000, 'pending_verification')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transactions (id, user_id, campaign_id, amount, type, status, description)
VALUES ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 2000, 'escrow_lock', 'pending', 'Seed funding for demo campaign')
ON CONFLICT (id) DO NOTHING;

-- 15) Quick verification queries
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' ORDER BY ordinal_position;
SELECT * FROM public.admin_whitelist LIMIT 10;
SELECT id, creator_id, status FROM public.campaigns LIMIT 10;
SELECT id, user_id, amount, status FROM public.transactions LIMIT 10;