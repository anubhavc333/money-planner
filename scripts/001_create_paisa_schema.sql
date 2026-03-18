-- Paisa Family Finance App Schema
-- Households table - groups family members together
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My Household',
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table - extends auth.users with app-specific data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES public.households(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'spouse' CHECK (role IN ('head', 'spouse', 'child', 'parent', 'other')),
  age INTEGER,
  monthly_income DECIMAL(12,2) DEFAULT 0,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget categories table - stores monthly budget allocations
CREATE TABLE IF NOT EXISTS public.budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'receipt',
  budgeted DECIMAL(12,2) NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#534AB7',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expenses table - individual expense transactions
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.budget_categories(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Financial goals table
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) DEFAULT 0,
  target_date DATE,
  icon TEXT DEFAULT 'target',
  color TEXT DEFAULT '#534AB7',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Investment allocations table
CREATE TABLE IF NOT EXISTS public.investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mutual_funds', 'ppf', 'fd', 'stocks', 'gold', 'other')),
  name TEXT NOT NULL,
  monthly_amount DECIMAL(12,2) DEFAULT 0,
  total_invested DECIMAL(12,2) DEFAULT 0,
  current_value DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Household settings (budget split percentages, etc.)
CREATE TABLE IF NOT EXISTS public.household_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID UNIQUE NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  needs_percent INTEGER DEFAULT 50 CHECK (needs_percent >= 0 AND needs_percent <= 100),
  wants_percent INTEGER DEFAULT 30 CHECK (wants_percent >= 0 AND wants_percent <= 100),
  savings_percent INTEGER DEFAULT 20 CHECK (savings_percent >= 0 AND savings_percent <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles 
  FOR DELETE USING (auth.uid() = id);

-- RLS Policies for households - members can see their own household
CREATE POLICY "households_select" ON public.households 
  FOR SELECT USING (
    id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
    OR invite_code IS NOT NULL
  );
CREATE POLICY "households_insert" ON public.households 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "households_update" ON public.households 
  FOR UPDATE USING (
    id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );

-- RLS Policies for budget_categories - household members can access
CREATE POLICY "budget_categories_select" ON public.budget_categories 
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "budget_categories_insert" ON public.budget_categories 
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "budget_categories_update" ON public.budget_categories 
  FOR UPDATE USING (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "budget_categories_delete" ON public.budget_categories 
  FOR DELETE USING (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );

-- RLS Policies for expenses - household members can access
CREATE POLICY "expenses_select" ON public.expenses 
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "expenses_insert" ON public.expenses 
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
    AND user_id = auth.uid()
  );
CREATE POLICY "expenses_update" ON public.expenses 
  FOR UPDATE USING (
    user_id = auth.uid()
  );
CREATE POLICY "expenses_delete" ON public.expenses 
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- RLS Policies for goals - household members can access
CREATE POLICY "goals_select" ON public.goals 
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "goals_insert" ON public.goals 
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "goals_update" ON public.goals 
  FOR UPDATE USING (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "goals_delete" ON public.goals 
  FOR DELETE USING (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );

-- RLS Policies for investments - household members can access
CREATE POLICY "investments_select" ON public.investments 
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "investments_insert" ON public.investments 
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "investments_update" ON public.investments 
  FOR UPDATE USING (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "investments_delete" ON public.investments 
  FOR DELETE USING (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );

-- RLS Policies for household_settings - household members can access
CREATE POLICY "household_settings_select" ON public.household_settings 
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "household_settings_insert" ON public.household_settings 
  FOR INSERT WITH CHECK (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );
CREATE POLICY "household_settings_update" ON public.household_settings 
  FOR UPDATE USING (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );

-- Policies for viewing household members (family tab)
CREATE POLICY "profiles_select_household_members" ON public.profiles
  FOR SELECT USING (
    household_id IN (SELECT household_id FROM public.profiles WHERE id = auth.uid())
  );

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_household ON public.profiles(household_id);
CREATE INDEX IF NOT EXISTS idx_expenses_household ON public.expenses(household_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_household ON public.budget_categories(household_id);
CREATE INDEX IF NOT EXISTS idx_goals_household ON public.goals(household_id);
CREATE INDEX IF NOT EXISTS idx_investments_household ON public.investments(household_id);
