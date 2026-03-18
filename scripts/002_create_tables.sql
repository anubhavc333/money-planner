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
