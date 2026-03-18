# Paisa App — Quick Start Guide

Your Paisa money planner app now has a **complete, production-ready Supabase backend**. Here's what you need to do to get it running.

## 🚀 Quick Start (3 Steps)

### Step 1: Run the Database Migration

1. Open your Supabase project: https://app.supabase.com
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of:
   ```
   scripts/01-create-schema.sql
   ```
5. Click **Run**

This creates all 9 tables, RLS policies, indexes, and RPC functions. Takes ~5 seconds.

### Step 2: Verify Environment Variables

Your environment variables are already set in Vercel:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

(You can verify in **Settings → Vars** in the v0 dashboard)

### Step 3: Test the App

1. **Sign Up**: Go to `/auth/sign-up` and create an account
2. **Onboarding**: Fill out household and personal info
3. **Dashboard**: See all your data!

## 📋 What's Included

### Database (9 Tables)
- `households` — Family group
- `profiles` — Users with roles
- `budget_categories` — Spending categories
- `expenses` — Individual transactions
- `goals` — Savings targets
- `investments` — Portfolio
- `household_settings` — 50/30/20 split
- `income_history` — Bonuses & raises
- `detected_expenses` — SMS-parsed transactions

### Security
- ✅ **Row Level Security (RLS)** — Users only see their household data
- ✅ **Password hashing** — Supabase Auth handles it
- ✅ **HTTP-only cookies** — Secure session management
- ✅ **API protection** — Service role key never exposed

### Features
- ✅ **Multi-user households** — Family sharing
- ✅ **Invite codes** — Add family members
- ✅ **SMS parsing** — Detect expenses from bank messages
- ✅ **Real-time data** — SWR hooks for live updates
- ✅ **Complete CRUD** — Create, read, update, delete everything
- ✅ **Financial reports** — Income tracking, projections, analytics

## 📚 Documentation

- **`BACKEND_SETUP.md`** — Detailed setup guide with API docs, hooks reference, troubleshooting
- **`INTEGRATION_COMPLETE.md`** — Summary of what was implemented
- **`scripts/01-create-schema.sql`** — Complete database schema

## 🔑 Key Files

### Backend Logic
- `lib/supabase/client.ts` — Browser client
- `lib/supabase/server.ts` — Server client
- `lib/supabase/admin.ts` — Admin client (for API routes)
- `hooks/use-paisa-data.ts` — All data hooks with SWR

### API Routes
- `app/api/parse-sms/route.ts` — Parse SMS messages → extract amounts, merchants, categories
- `app/api/delete-account/route.ts` — Delete user account and all data

### Pages
- `app/auth/login/page.tsx` — Sign in
- `app/auth/sign-up/page.tsx` — Create account
- `app/app/page.tsx` — Main dashboard (orchestrator)

### Components
- `components/paisa/dashboard-db.tsx` — Main dashboard UI
- `components/paisa/onboarding.tsx` — Sign up flow
- `components/paisa/tabs/*` — Individual sections (expenses, budget, goals, etc.)

## 🧪 Test Scenarios

### Scenario 1: Single User
1. Sign up with email
2. Create household "My Family"
3. Set income, goals, budget
4. Add expenses
5. See dashboard

### Scenario 2: Multi-User Household
1. User A: Sign up, create household
2. User A: Goes to Family tab, clicks "+ Invite", copies code
3. User B: Sign up, then on onboarding: select "Join household", paste code
4. User B: Sees same household, expenses, budget as User A
5. Both see only their household data (RLS protection)

### Scenario 3: SMS Parsing
1. Logged in as Android app with user_id
2. Send POST to `/api/parse-sms`:
   ```json
   {
     "sms": "You spent ₹500 at SWIGGY on 15-03-2025 10:30:00 pm",
     "save": true,
     "user_id": "user-uuid"
   }
   ```
3. Parsed expense shows in "Detected Expenses" widget
4. Click confirm → converts to real expense

## 🔒 Security Notes

✅ **RLS is enforced** at database level
- Even if someone hacks the app code, they can't access other households' data
- All queries automatically filtered by `household_id`

✅ **Service role key is hidden**
- Only used in API routes (`/api/parse-sms`, `/api/delete-account`)
- Never sent to the browser

✅ **Sessions are secure**
- Supabase Auth handles password hashing
- Cookies are HTTP-only
- Middleware checks auth on every request

## ❓ Common Questions

**Q: Where do I run the SQL?**  
A: In Supabase → SQL Editor. Not in your terminal.

**Q: Do I need to install anything?**  
A: No. Dependencies are already in `package.json`.

**Q: What if the schema already exists?**  
A: The SQL uses `CREATE TABLE IF NOT EXISTS`, so it's safe to run multiple times.

**Q: How do I check if it worked?**  
A: Go to Supabase → Data Studio, you should see all 9 tables listed.

**Q: Can I modify the schema later?**  
A: Yes, but be careful with RLS policies. Each table needs SELECT/INSERT/UPDATE/DELETE policies.

**Q: What about SMS parsing on iPhone?**  
A: The endpoint works for any device. You'd need an iOS bridge similar to Android WebView.

## 📞 Support

If you encounter issues:
1. Check `BACKEND_SETUP.md` troubleshooting section
2. Verify env vars are set in Vercel
3. Check Supabase logs: **Logs** → **Edge Functions** or **API Gateway**
4. Ensure all 9 tables exist in Supabase Data Studio

---

**You're all set!** 🎉

The backend is complete and ready. Just run the SQL migration, and your app is production-ready.

Questions? See `BACKEND_SETUP.md` for comprehensive documentation.
