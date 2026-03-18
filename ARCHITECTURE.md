# Paisa App — Data Flow & Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  households  │  │   profiles   │  │ budget_ctgs  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  expenses    │  │    goals     │  │investments   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  settings    │  │income_history│  │detected_exp. │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  Row Level Security (RLS) on all tables                      │
│  Every query filtered: household_id IN (user's households)   │
│                                                               │
│  ┌──────────────────────────────────────────────────┐        │
│  │         RPC Functions (SECURITY DEFINER)         │        │
│  │  • setup_household()                              │        │
│  │  • add_budget_category()                          │        │
│  │  • add_goal()                                     │        │
│  │  • join_household_by_code()                       │        │
│  └──────────────────────────────────────────────────┘        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         ▲                                      ▲
         │ (via SDK/HTTP)                      │ (RLS policies)
         │                                      │
    ┌────┴──────────────────────────────────────┴───┐
    │                                                │
    │     Browser (Next.js Client Components)      │
    │                                                │
    ├─────────────────────────────────────────────┤
    │  lib/supabase/client.ts                      │
    │  (createBrowserClient)                      │
    └────────┬─────────────────────────────────────┘
             │
             ├─────────────────────────────────────┐
             │                                     │
    ┌────────▼─────────┐           ┌──────────────▼──────┐
    │  useAuth()       │           │ usePaisaData()       │
    ├──────────────────┤           ├─────────────────────┤
    │ • Auth state     │           │ • useProfile()      │
    │ • Subscribe auth │           │ • useHousehold()    │
    │ • Sign out       │           │ • useExpenses()     │
    │                  │           │ • useGoals()        │
    └──────────────────┘           │ • ... + 7 more      │
                                   └─────────────────────┘
                                      (All use SWR)
             │
             └──────────────────────────────┐
                                            │
                    ┌───────────────────────▼──────────┐
                    │    Dashboard Components          │
                    ├────────────────────────────────┤
                    │ • DashboardDb (main UI)        │
                    │ • OverviewTabDb                │
                    │ • BudgetTabDb                  │
                    │ • ExpensesTabDb                │
                    │ • GoalsTabDb                   │
                    │ • HistoryTabDb                 │
                    │ • InvestTabDb                  │
                    │ • FamilyTabDb                  │
                    │ • ProfileTabDb                 │
                    └────────────────────────────────┘
```

---

## Authentication Flow

```
1. SIGN UP
   User Input (email, password, name)
         ↓
   supabase.auth.signUp()
         ↓
   Supabase creates auth user (bcrypt password)
         ↓
   Redirect to /auth/sign-up-success
         ↓
   User sees onboarding page

2. ONBOARDING (Create Household)
   User selects "Create household"
         ↓
   Form: household name, personal info, goals, budget
         ↓
   completeOnboarding() called
         ↓
   useCreateHousehold() calls:
      • supabase.rpc('setup_household', {...})
         → Creates households row
         → Creates profiles row (links to household)
         → Creates household_settings row
      • supabase.rpc('add_budget_category', {...}) [4x]
         → Creates 4 default budget categories
      • supabase.rpc('add_goal', {...}) [user's goals]
         → Creates user's goals
         ↓
   Dashboard loads with household data

3. ONBOARDING (Join Household)
   User selects "Join household"
         ↓
   User enters invite code
         ↓
   joinHousehold() called
         ↓
   useJoinHousehold() calls:
      • supabase.rpc('join_household_by_code', {...})
         → Finds household by invite_code
         → Creates/updates profiles row
         ↓
   Dashboard loads with household data

4. LOGIN (on new device)
   User Input (email, password)
         ↓
   supabase.auth.signInWithPassword()
         ↓
   Supabase validates, sets session cookie
         ↓
   Redirect to /app
         ↓
   Middleware checks auth
         ↓
   usePaisaData(userId) fetches:
      • profile (to get household_id)
      • household, settings, categories, expenses, goals...
         ↓
   Dashboard renders with data
```

---

## Data Fetching Flow (SWR)

```
Component Renders
    │
    ├─ useExpenses(householdId, "2025-03")
    │  │
    │  ├─ Check SWR cache: `expenses-2025-03-2025-03`
    │  │  ├─ If HIT: return cached data
    │  │  └─ If MISS: fetch from Supabase
    │  │
    │  ├─ supabase.from("expenses")
    │  │  .select("*")
    │  │  .eq("household_id", householdId)
    │  │  .gte("expense_date", "2025-03-01")
    │  │  .lte("expense_date", "2025-03-31")
    │  │
    │  ├─ RLS Policy: "household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())"
    │  │  (Database filters to only this user's household)
    │  │
    │  ├─ Return data: Expense[]
    │  │
    │  └─ Component re-renders with data
    │
    └─ onAddExpense(newExpense)
       │
       ├─ supabase.from("expenses").insert(newExpense)
       │
       ├─ RLS Policy checks:
       │  └─ Is household_id owned by auth user? YES ✓
       │
       ├─ mutate(`expenses-${householdId}-all`)
       │  (Revalidate SWR cache)
       │
       └─ Component re-renders with updated data
```

---

## SMS Parsing Flow (Android)

```
Android App
    │
    └─ SMS Received: "You spent ₹500 at SWIGGY on 15-03-2025 10:30:00 pm"
       │
       ├─ AndroidBridge.setUserId(userId)
       │  (Sets current user_id)
       │
       └─ POST /api/parse-sms
          │
          ├─ Request:
          │  {
          │    "sms": "You spent ₹500 at SWIGGY...",
          │    "save": true,
          │    "user_id": "abc-123-xyz"
          │  }
          │
          ├─ Parse SMS:
          │  │
          │  ├─ Amount: ₹500
          │  ├─ Merchant: "swiggy"
          │  ├─ Category: "Food"
          │  └─ Date: 2025-03-15T22:30:00
          │
          ├─ Save to detected_expenses:
          │  │
          │  ├─ Use createAdminClient() (bypass RLS)
          │  │
          │  ├─ Fetch profile → get household_id
          │  │
          │  ├─ Upsert into detected_expenses:
          │  │  {
          │  │    "household_id": "household-uuid",
          │  │    "user_id": "user-uuid",
          │  │    "amount": "500",
          │  │    "merchant": "swiggy",
          │  │    "category": "Food",
          │  │    "raw_sms": "...",
          │  │    "status": "pending",
          │  │    "transaction_date": "2025-03-15T22:30:00"
          │  │  }
          │  │
          │  └─ onConflict: "raw_sms" (deduplicates identical SMS)
          │
          └─ Response: { amount, merchant, category, transaction_date, user_id }
             │
             └─ In Dashboard: "Pending SMS Expenses" widget shows
                │
                ├─ User clicks "Confirm"
                │  └─ createExpense with confirmed data
                │
                ├─ User clicks "Ignore"
                │  └─ Mark as ignored
                │
                └─ User clicks "Clear All"
                   └─ Delete all pending
```

---

## Multi-Household Security (RLS in Action)

```
Scenario: Two households

Household A (family-id-1)
├─ User 1 (profile.household_id = family-id-1)
└─ User 2 (profile.household_id = family-id-1)

Household B (family-id-2)
├─ User 3 (profile.household_id = family-id-2)
└─ User 4 (profile.household_id = family-id-2)

─────────────────────────────────────────────

Query: supabase.from("expenses").select("*")

WITHOUT RLS (❌ BAD):
├─ User 1 sees: All expenses from Household A ✓ AND Household B ✗

WITH RLS (✅ GOOD):
├─ User 1 sees:
│  ├─ Database applies policy:
│  │  SELECT * FROM expenses WHERE
│  │    household_id IN (SELECT household_id FROM profiles WHERE id = auth.uid())
│  │
│  │  → SELECT household_id FROM profiles WHERE id = user-1-uuid
│  │    → Returns: family-id-1
│  │
│  │  → SELECT * FROM expenses WHERE household_id = family-id-1
│  │    → Returns only expenses from Household A ✓
│  │
│  └─ Result: Only Household A expenses (correct)
│
├─ User 2 sees: Only Household A expenses ✓
│
├─ User 3 sees: Only Household B expenses ✓
│
└─ User 4 sees: Only Household B expenses ✓
```

---

## Component Hierarchy

```
app/app/page.tsx (orchestrator)
│
├─ Gets user from auth
├─ Calls usePaisaData(userId)
├─ Fetches all data via hooks
│
└─ If household exists:
   │
   └─ DashboardDb (main UI)
      │
      ├─ Header (with invite button, add expense button)
      │
      ├─ Month Navigator (for month-filtered views)
      │
      ├─ Main Content (tab-based):
      │  ├─ OverviewTabDb (dashboard summary)
      │  ├─ BudgetTabDb (categories & spending)
      │  ├─ ExpensesTabDb (transaction list)
      │  ├─ HistoryTabDb (reports & analytics)
      │  ├─ GoalsTabDb (savings targets)
      │  ├─ InvestTabDb (portfolio)
      │  ├─ ProjectionsTabDb (forecasts)
      │  ├─ FamilyTabDb (members & invite)
      │  └─ ProfileTabDb (account settings)
      │
      ├─ ExpenseModal (add/edit expense)
      │
      ├─ InviteModal (show invite code)
      │
      └─ Bottom Navigation (tab switcher)
        └─ More Menu (additional tabs)

   If household doesn't exist:
   │
   └─ Onboarding
      ├─ Step 1: Personal info
      ├─ Step 2: Role selection
      ├─ Step 3: Income input
      ├─ Step 4: Goals selection
      ├─ Step 5: Household mode (create/join)
      │
      └─ On Complete:
         ├─ Mode = Create:
         │  └─ useCreateHousehold() → rpc('setup_household', ...)
         │
         └─ Mode = Join:
            └─ useJoinHousehold() → rpc('join_household_by_code', ...)
```

---

## Error Handling Flow

```
Try to access expense from other household
        │
        └─ supabase.from("expenses")
           .select("*")
           .eq("household_id", "wrong-household-id")
           │
           ├─ RLS Policy Check:
           │  │
           │  └─ household_id IN (
           │       SELECT household_id FROM profiles 
           │       WHERE id = auth.uid()
           │     )
           │     → Returns: wrong-household-id NOT IN [user's households]
           │
           ├─ Policy DENIES query
           │
           └─ Returns: PostgrestError (no rows returned)
              │
              ├─ Hook catches error
              ├─ Returns error state
              ├─ Component shows error message
              └─ User cannot see the data ✓ (Security enforced)
```

---

## Deployment Architecture

```
Local Development
├─ .env.local (Supabase credentials)
├─ npm run dev
└─ http://localhost:3000

Git Push to GitHub
        ↓
Vercel Detects Change
        ↓
Deploy Preview
├─ Environment variables from Vercel project
├─ Builds Next.js app
└─ Creates preview URL

Merge to Main
        ↓
Production Deployment
├─ Environment variables (PROD_URL, PROD_KEYS)
├─ Builds & optimizes
├─ Deploys to Edge Functions
└─ Supabase auto-synced (same DB for dev/prod)
```

---

## Database Indexes (for Performance)

```
CREATE INDEX idx_profiles_household_id
  → Speeds up: "Get all members of household"

CREATE INDEX idx_expenses_household_id
  → Speeds up: "Get all expenses for household"

CREATE INDEX idx_expenses_date
  → Speeds up: "Get expenses in date range"

CREATE INDEX idx_expenses_category_id
  → Speeds up: "Get expenses by category"

CREATE INDEX idx_budget_categories_household_id
  → Speeds up: "Get budget categories for household"

... (and 5 more for other tables)

CREATE UNIQUE INDEX idx_detected_expenses_raw_sms
  → Prevents duplicate SMS parsing
  → Speeds up: "Check if SMS already processed"
```

---

This architecture ensures:
✅ Security through RLS  
✅ Performance through indexes  
✅ Scalability through multi-user support  
✅ Reliability through transactions (RPC functions)  
✅ Real-time updates through SWR caching  
