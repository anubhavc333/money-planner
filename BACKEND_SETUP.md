# Paisa App — Complete Backend Integration Setup

This document provides a comprehensive overview of the Paisa App Supabase setup and backend integration.

## Environment Variables

Add these to `.env.local` and Vercel project settings:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Part 1: Supabase Schema Setup

### Step 1: Run the SQL Migration

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to SQL Editor
3. Click "New Query"
4. Copy and paste the entire contents of `scripts/01-create-schema.sql`
5. Click "Run"

This will create:
- **9 tables** with proper constraints and foreign keys
- **Row Level Security (RLS)** policies on all tables
- **Database indexes** for optimal query performance
- **4 RPC functions** (stored procedures) for secure operations

### Tables Created

| Table | Purpose |
|-------|---------|
| `households` | Group of family members sharing finances |
| `profiles` | User profiles linked to households |
| `budget_categories` | Spending categories (food, transport, etc.) |
| `expenses` | Individual transaction records |
| `goals` | Financial goals (savings targets) |
| `investments` | Investment portfolio tracking |
| `household_settings` | 50/30/20 split percentages |
| `income_history` | Bonuses and income changes |
| `detected_expenses` | SMS-parsed transactions (pending confirmation) |

### RLS Security

All tables have Row Level Security enabled with policies that automatically filter data by `household_id`. Users can only see and modify data for their own household.

### RPC Functions

**`setup_household()`** — Creates a new household during onboarding
- Creates household
- Creates user profile
- Creates household settings
- Returns household ID

**`add_budget_category()`** — Adds a budget category with automatic color assignment
- Assigns colors: Needs=#4ECDC4, Wants=#45B7D1, Savings=#96CEB4

**`add_goal()`** — Adds a financial goal to the household

**`join_household_by_code()`** — Allows users to join an existing household via invite code
- Validates invite code
- Creates/updates user profile
- Links user to household

## Part 2: Backend Integration

### API Routes

#### `POST /api/parse-sms`
Parses SMS messages to extract transaction data. Used by Android app.

**Request body:**
```json
{
  "sms": "You spent ₹500 at SWIGGY on 15-03-2025 10:30:00 pm",
  "save": true,
  "user_id": "optional-for-android"
}
```

**Response:**
```json
{
  "amount": "500",
  "merchant": "swiggy",
  "category": "Food",
  "transaction_date": "2025-03-15T22:30:00",
  "user_id": "uuid",
  "raw_sms": "..."
}
```

#### `POST /api/delete-account`
Deletes a user's account and all associated data.

### Hooks (in `hooks/use-paisa-data.ts`)

All hooks use **SWR** for client-side data fetching and caching.

#### `useAuth()`
Manages authentication state and session.

```typescript
const { user, loading, signOut } = useAuth()
```

#### `useProfile(userId)`
Fetches and updates user profile.

```typescript
const { profile, updateProfile } = useProfile(userId)
```

#### `useHousehold(householdId)`
Fetches household data including invite code.

```typescript
const { household } = useHousehold(householdId)
```

#### `useBudgetCategories(householdId)`
Manages budget categories for the household.

```typescript
const { categories, addCategory, updateCategory, deleteCategory } = useBudgetCategories(householdId)
```

#### `useExpenses(householdId, month?)`
Fetches and manages expenses with optional month filtering.

```typescript
const { expenses, addExpense, updateExpense, deleteExpense } = useExpenses(householdId, "2025-03")
```

#### `useGoals(householdId)`
Manages financial goals.

```typescript
const { goals, addGoal, updateGoal, deleteGoal } = useGoals(householdId)
```

#### `useInvestments(householdId)`
Manages investment portfolio.

```typescript
const { investments, addInvestment, updateInvestment, deleteInvestment } = useInvestments(householdId)
```

#### `useHouseholdSettings(householdId)`
Manages 50/30/20 split percentages.

```typescript
const { settings, updateSettings } = useHouseholdSettings(householdId)
```

#### `useIncomeHistory(householdId, userId)`
Tracks bonuses and income changes.

```typescript
const { incomeHistory, addIncomeEntry, updateIncomeEntry, deleteIncomeEntry } = useIncomeHistory(householdId, userId)
```

#### `useDetectedExpenses(householdId)`
Manages SMS-detected expenses pending confirmation.

```typescript
const { detectedExpenses, confirmExpense, ignoreExpense, deleteDetectedExpense } = useDetectedExpenses(householdId)
```

#### `useCreateHousehold()`
Creates a new household during onboarding.

```typescript
const { createHousehold } = useCreateHousehold()
await createHousehold(userId, {
  householdName: "My Family",
  userName: "John",
  userRole: "head",
  monthlyIncome: 50000,
  dateOfBirth: "1990-01-15",
  needsPercent: 50,
  wantsPercent: 30,
  savingsPercent: 20,
  goals: [{ name: "Emergency Fund", targetAmount: 300000 }],
  categories: [{ name: "Groceries", icon: "🛒", budgetType: "needs", budgetedAmount: 10000 }]
})
```

#### `useJoinHousehold()`
Joins an existing household via invite code.

```typescript
const { joinHousehold } = useJoinHousehold()
await joinHousehold(userId, "abc123", {
  name: "Jane",
  role: "spouse",
  monthlyIncome: 40000,
  dateOfBirth: "1992-05-20"
})
```

### Authentication Flow

1. **Sign Up** (`app/auth/sign-up/page.tsx`)
   - User creates account with email & password
   - Supabase auth triggers
   - Redirects to `/auth/sign-up-success`

2. **Login** (`app/auth/login/page.tsx`)
   - User signs in with email & password
   - Redirects to `/app`

3. **Middleware Protection** (`middleware.ts`)
   - Checks Supabase session
   - Redirects unauthenticated users from `/app/*` to `/auth/login`

4. **Onboarding** (`components/paisa/onboarding.tsx`)
   - If user has no household, shows onboarding flow
   - User can create new household or join existing one via invite code

### Dashboard Integration

The main app page (`app/app/page.tsx`) orchestrates all data:

1. Gets current user from Supabase auth
2. Fetches profile to get household_id
3. Loads all household data using hooks
4. Passes data and mutation functions to dashboard components
5. Handles onboarding redirect if no household exists

### Component Structure

```
app/app/page.tsx (orchestrator)
  ├── Onboarding (create/join household)
  └── DashboardDb (main UI)
      ├── OverviewTabDb
      ├── BudgetTabDb
      ├── ExpensesTabDb
      ├── HistoryTabDb
      ├── GoalsTabDb
      ├── InvestTabDb
      ├── ProjectionsTabDb
      ├── FamilyTabDb
      └── ProfileTabDb
```

## Security Best Practices

✅ **Implemented**
- RLS policies filter all queries by household_id
- Service role key only used in API routes (never exposed to client)
- RPC functions use SECURITY DEFINER to bypass RLS for one-time setups
- Passwords hashed by Supabase Auth
- Session cookies are HTTP-only
- Parameterized queries prevent SQL injection

✅ **Never Do**
- Expose `SUPABASE_SERVICE_ROLE_KEY` to the client
- Trust client-side filtering (RLS enforces server-side)
- Store sensitive data in localStorage
- Use `CREATE POLICY IF NOT EXISTS` (Supabase doesn't support it)

## Troubleshooting

### Issue: "Not authenticated" error when signing up
- **Fix**: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly

### Issue: "household_id not found" when loading dashboard
- **Fix**: User hasn't completed onboarding. Clear browser cache and reload.

### Issue: SMS parsing returns "Unknown" merchant
- **Fix**: Check `app/api/parse-sms/route.ts` — add merchant pattern to merchantPatterns array

### Issue: RLS policy errors
- **Fix**: Ensure user's profile exists in profiles table with correct household_id

## Production Checklist

- [ ] Run `01-create-schema.sql` in Supabase
- [ ] Set environment variables in Vercel project settings
- [ ] Enable email notifications in Supabase Auth
- [ ] Configure custom email templates (optional)
- [ ] Test sign-up and onboarding flow
- [ ] Test invite code flow
- [ ] Test SMS parsing with actual SMS
- [ ] Monitor RLS policy performance
- [ ] Set up error tracking (Sentry/LogRocket)
- [ ] Enable audit logging in Supabase

---

**Version**: 1.0  
**Last Updated**: March 2025  
**Maintainer**: Paisa App Team
