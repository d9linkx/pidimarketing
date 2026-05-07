-- 1. Remove the restrictive constraint
-- 1) Extensions
-- Ensure the pgcrypto extension is enabled for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  email text,
  avatar_url text,
  balance numeric DEFAULT 0,
  allocated_funds numeric DEFAULT 0,
  pending_balance numeric DEFAULT 0,
  completed_tasks integer DEFAULT 0,
  user_role text DEFAULT 'performer',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
); -- End of CREATE TABLE public.profiles

-- Add a foreign key constraint to link profiles.id to auth.users.id
-- This is crucial and was likely the direct cause of your error.
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure the user_role constraint is correct and includes 'admin'
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_user_role_check;
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_role_check 
CHECK (user_role IN ('creator', 'performer', 'admin'));

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
  performer_handle text,
  status text DEFAULT 'pending',
  quality_score integer DEFAULT 0,
  proof_url text,
  expires_at timestamptz,
  reviewed_at timestamptz,
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

-- 10.1) Auto-payout rule note:
-- To implement the 2-day auto-payout, an Edge Function or Postgres Cron should run:
-- UPDATE public.engagements SET status = 'approved' 
-- WHERE status = 'pending' AND created_at < now() - interval '2 days';

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
); -- End of POLICY select_engagements_for_creator_or_admin

DROP POLICY IF EXISTS insert_engagements_by_performer ON public.engagements;
CREATE POLICY insert_engagements_by_performer ON public.engagements FOR INSERT WITH CHECK (auth.uid() = performer_id);

-- 14) Initial Admin Whitelist
-- Add your specific emails here. The user_id will be populated by the trigger after signup.
INSERT INTO public.admin_whitelist (email, user_id, reason)
VALUES
  ('officialprincedike@gmail.com', NULL, 'bootstrap admin'),
  ('officialpidimarketing@gmail.com', NULL, 'bootstrap admin')
ON CONFLICT (email) DO UPDATE SET reason = EXCLUDED.reason; -- Update reason if email exists

-- 16) Quick verification queries
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' ORDER BY ordinal_position;
SELECT * FROM public.admin_whitelist LIMIT 10;
SELECT id, creator_id, status FROM public.campaigns LIMIT 10;
SELECT id, user_id, amount, status FROM public.transactions LIMIT 10;

-- 16) Trigger to create a public.profile entry on new auth.users signup
-- This ensures that a profile is created for every new user,
-- regardless of whether email confirmation is required or not.
-- The SECURITY DEFINER clause is crucial for the trigger to bypass RLS and insert into public.profiles.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, user_role, balance, allocated_funds, pending_balance, completed_tasks)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''), -- Use COALESCE for safety
    NEW.email,
    -- Determine user_role: 'admin' if email is whitelisted, else from metadata or 'performer'
    CASE
      WHEN EXISTS (SELECT 1 FROM public.admin_whitelist WHERE email = NEW.email) THEN 'admin'
      ELSE COALESCE(NEW.raw_user_meta_data->>'user_role', 'performer')
    END,
    0, 0, 0, 0
  )
  ON CONFLICT (id) DO NOTHING;

  -- If the user is an admin, update their user_id in the admin_whitelist
  IF EXISTS (SELECT 1 FROM public.admin_whitelist WHERE email = NEW.email) THEN
    UPDATE public.admin_whitelist
    SET user_id = NEW.id
    WHERE email = NEW.email AND user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 17) Backfill existing users (Runs once to sync any missing profiles)
INSERT INTO public.profiles (id, full_name, email, user_role, balance, allocated_funds, pending_balance, completed_tasks)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'full_name', ''), 
  email, 
  COALESCE(raw_user_meta_data->>'user_role', 'performer'),
  0, 0, 0, 0
FROM auth.users
ON CONFLICT (id) DO NOTHING;