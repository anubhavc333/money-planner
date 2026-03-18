-- Paisa App — Complete Supabase Schema
-- Run this entire script in Supabase SQL Editor
-- Tables, RLS Policies, Indexes, and RPC Functions

-- ============================================================================
-- 1. TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  household_id UUID,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('head', 'spouse', 'child', 'parent', 'other')),
  age INTEGER,
  monthly_income DECIMAL(12, 2) NOT NULL DEFAULT 0,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_household FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'receipt',
  budgeted DECIMAL(12, 2) DEFAULT 0,
  color TEXT DEFAULT '#534AB7',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_household FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  user_id UUID NOT NULL,
  category_id UUID,
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_household FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_category FOREIGN KEY (category_id) REFERENCES public.budget_categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  name TEXT NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) DEFAULT 0,
  target_date DATE,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_household FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mutual_funds', 'ppf', 'fd', 'stocks', 'gold', 'other')),
  name TEXT NOT NULL,
  monthly_amount DECIMAL(12, 2) DEFAULT 0,
  total_invested DECIMAL(12, 2) DEFAULT 0,
  current_value DECIMAL(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_household FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.household_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID UNIQUE NOT NULL,
  needs_percent INTEGER DEFAULT 50,
  wants_percent INTEGER DEFAULT 30,
  savings_percent INTEGER DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_household FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.income_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  user_id UUID NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('increment', 'bonus', 'other')),
  effective_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_household FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.detected_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL,
  user_id UUID NOT NULL,
  amount TEXT NOT NULL,
  merchant TEXT,
  category TEXT,
  raw_sms TEXT NOT NULL,
  transaction_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ignored')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_household FOREIGN KEY (household_id) REFERENCES public.households(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- ============================================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detected_expenses ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

-- Households: users can only select households they belong to
DO $$ BEGIN
  CREATE POLICY "users_can_select_own_households" ON public.households FOR SELECT USING (
    id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Profiles: users can select all profiles in their household
DO $$ BEGIN
  CREATE POLICY "users_can_select_household_profiles" ON public.profiles FOR SELECT USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Profiles: users can update only their own profile
DO $$ BEGIN
  CREATE POLICY "users_can_update_own_profile" ON public.profiles FOR UPDATE USING (
    id = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Profiles: users can insert their own profile
DO $$ BEGIN
  CREATE POLICY "users_can_insert_own_profile" ON public.profiles FOR INSERT WITH CHECK (
    id = auth.uid()
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Budget Categories: users can select categories for their household
DO $$ BEGIN
  CREATE POLICY "users_can_select_budget_categories" ON public.budget_categories FOR SELECT USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Budget Categories: users can insert categories for their household
DO $$ BEGIN
  CREATE POLICY "users_can_insert_budget_categories" ON public.budget_categories FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Budget Categories: users can update categories for their household
DO $$ BEGIN
  CREATE POLICY "users_can_update_budget_categories" ON public.budget_categories FOR UPDATE USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Budget Categories: users can delete categories for their household
DO $$ BEGIN
  CREATE POLICY "users_can_delete_budget_categories" ON public.budget_categories FOR DELETE USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Expenses: users can select expenses for their household
DO $$ BEGIN
  CREATE POLICY "users_can_select_expenses" ON public.expenses FOR SELECT USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Expenses: users can insert expenses for their household
DO $$ BEGIN
  CREATE POLICY "users_can_insert_expenses" ON public.expenses FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Expenses: users can update expenses for their household
DO $$ BEGIN
  CREATE POLICY "users_can_update_expenses" ON public.expenses FOR UPDATE USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Expenses: users can delete expenses for their household
DO $$ BEGIN
  CREATE POLICY "users_can_delete_expenses" ON public.expenses FOR DELETE USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Goals: users can select goals for their household
DO $$ BEGIN
  CREATE POLICY "users_can_select_goals" ON public.goals FOR SELECT USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Goals: users can insert goals for their household
DO $$ BEGIN
  CREATE POLICY "users_can_insert_goals" ON public.goals FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Goals: users can update goals for their household
DO $$ BEGIN
  CREATE POLICY "users_can_update_goals" ON public.goals FOR UPDATE USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Goals: users can delete goals for their household
DO $$ BEGIN
  CREATE POLICY "users_can_delete_goals" ON public.goals FOR DELETE USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Investments: users can select investments for their household
DO $$ BEGIN
  CREATE POLICY "users_can_select_investments" ON public.investments FOR SELECT USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Investments: users can insert investments for their household
DO $$ BEGIN
  CREATE POLICY "users_can_insert_investments" ON public.investments FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Investments: users can update investments for their household
DO $$ BEGIN
  CREATE POLICY "users_can_update_investments" ON public.investments FOR UPDATE USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Investments: users can delete investments for their household
DO $$ BEGIN
  CREATE POLICY "users_can_delete_investments" ON public.investments FOR DELETE USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Household Settings: users can select settings for their household
DO $$ BEGIN
  CREATE POLICY "users_can_select_household_settings" ON public.household_settings FOR SELECT USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Household Settings: users can update settings for their household
DO $$ BEGIN
  CREATE POLICY "users_can_update_household_settings" ON public.household_settings FOR UPDATE USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Income History: users can select income history for their household
DO $$ BEGIN
  CREATE POLICY "users_can_select_income_history" ON public.income_history FOR SELECT USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Income History: users can insert income history for their household
DO $$ BEGIN
  CREATE POLICY "users_can_insert_income_history" ON public.income_history FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Income History: users can update income history for their household
DO $$ BEGIN
  CREATE POLICY "users_can_update_income_history" ON public.income_history FOR UPDATE USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Income History: users can delete income history for their household
DO $$ BEGIN
  CREATE POLICY "users_can_delete_income_history" ON public.income_history FOR DELETE USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Detected Expenses: users can select detected expenses for their household
DO $$ BEGIN
  CREATE POLICY "users_can_select_detected_expenses" ON public.detected_expenses FOR SELECT USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Detected Expenses: users can insert detected expenses for their household
DO $$ BEGIN
  CREATE POLICY "users_can_insert_detected_expenses" ON public.detected_expenses FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Detected Expenses: users can update detected expenses for their household
DO $$ BEGIN
  CREATE POLICY "users_can_update_detected_expenses" ON public.detected_expenses FOR UPDATE USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Detected Expenses: users can delete detected expenses for their household
DO $$ BEGIN
  CREATE POLICY "users_can_delete_detected_expenses" ON public.detected_expenses FOR DELETE USING (
    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_household_id ON public.profiles(household_id);
CREATE INDEX IF NOT EXISTS idx_expenses_household_id ON public.expenses(household_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_household_id ON public.budget_categories(household_id);
CREATE INDEX IF NOT EXISTS idx_goals_household_id ON public.goals(household_id);
CREATE INDEX IF NOT EXISTS idx_investments_household_id ON public.investments(household_id);
CREATE INDEX IF NOT EXISTS idx_income_history_household_id ON public.income_history(household_id);
CREATE INDEX IF NOT EXISTS idx_detected_expenses_household_id ON public.detected_expenses(household_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_detected_expenses_raw_sms ON public.detected_expenses(raw_sms);

-- ============================================================================
-- 5. RPC FUNCTIONS (with SECURITY DEFINER to bypass RLS)
-- ============================================================================

-- Function: setup_household
CREATE OR REPLACE FUNCTION public.setup_household(
  p_user_id UUID,
  p_household_name TEXT,
  p_user_name TEXT,
  p_user_role TEXT,
  p_monthly_income DECIMAL,
  p_date_of_birth DATE DEFAULT NULL,
  p_needs_percent INTEGER DEFAULT 50,
  p_wants_percent INTEGER DEFAULT 30,
  p_savings_percent INTEGER DEFAULT 20
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_id UUID;
BEGIN
  -- Create household
  INSERT INTO public.households (name)
  VALUES (p_household_name)
  RETURNING id INTO v_household_id;

  -- Create profile
  INSERT INTO public.profiles (id, household_id, name, role, monthly_income, age)
  VALUES (
    p_user_id,
    v_household_id,
    p_user_name,
    p_user_role,
    p_monthly_income,
    CASE WHEN p_date_of_birth IS NOT NULL THEN
      EXTRACT(YEAR FROM AGE(p_date_of_birth))::INTEGER
    ELSE NULL
    END
  );

  -- Create household settings
  INSERT INTO public.household_settings (household_id, needs_percent, wants_percent, savings_percent)
  VALUES (v_household_id, p_needs_percent, p_wants_percent, p_savings_percent);

  RETURN v_household_id;
END;
$$;

-- Function: add_budget_category
CREATE OR REPLACE FUNCTION public.add_budget_category(
  p_household_id UUID,
  p_name TEXT,
  p_icon TEXT,
  p_budget_type TEXT,
  p_budgeted_amount DECIMAL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_id UUID;
  v_color TEXT;
BEGIN
  -- Set color based on budget type
  v_color := CASE
    WHEN p_budget_type = 'needs' THEN '#4ECDC4'
    WHEN p_budget_type = 'wants' THEN '#45B7D1'
    WHEN p_budget_type = 'savings' THEN '#96CEB4'
    ELSE '#B0B0B0'
  END;

  -- Insert category
  INSERT INTO public.budget_categories (household_id, name, icon, budgeted, color)
  VALUES (p_household_id, p_name, p_icon, p_budgeted_amount, v_color)
  RETURNING id INTO v_category_id;

  RETURN v_category_id;
END;
$$;

-- Function: add_goal
CREATE OR REPLACE FUNCTION public.add_goal(
  p_household_id UUID,
  p_name TEXT,
  p_target_amount DECIMAL,
  p_icon TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal_id UUID;
BEGIN
  INSERT INTO public.goals (household_id, name, target_amount, icon)
  VALUES (p_household_id, p_name, p_target_amount, p_icon)
  RETURNING id INTO v_goal_id;

  RETURN v_goal_id;
END;
$$;

-- Function: join_household_by_code
CREATE OR REPLACE FUNCTION public.join_household_by_code(
  p_user_id UUID,
  p_invite_code TEXT,
  p_user_name TEXT,
  p_user_role TEXT,
  p_monthly_income DECIMAL,
  p_date_of_birth DATE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_id UUID;
BEGIN
  -- Find household by invite code
  SELECT id INTO v_household_id
  FROM public.households
  WHERE invite_code = p_invite_code;

  IF v_household_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  -- Upsert profile
  INSERT INTO public.profiles (id, household_id, name, role, monthly_income, age)
  VALUES (
    p_user_id,
    v_household_id,
    p_user_name,
    p_user_role,
    p_monthly_income,
    CASE WHEN p_date_of_birth IS NOT NULL THEN
      EXTRACT(YEAR FROM AGE(p_date_of_birth))::INTEGER
    ELSE NULL
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    household_id = v_household_id,
    name = p_user_name,
    role = p_user_role,
    monthly_income = p_monthly_income;

  RETURN v_household_id;
END;
$$;
