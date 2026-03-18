# Deployment Checklist

Use this checklist to ensure your Paisa app is production-ready.

## Pre-Deployment

### Environment Setup
- [ ] Supabase project created at https://app.supabase.co
- [ ] Project URL noted: `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Anon key noted: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Service role key noted: `SUPABASE_SERVICE_ROLE_KEY`

### Database
- [ ] SQL migration run: `scripts/01-create-schema.sql`
- [ ] All 9 tables visible in Supabase Data Studio
- [ ] RLS enabled on all tables (check: each row shows "🔐" icon)
- [ ] 4 RPC functions created (setup_household, add_budget_category, add_goal, join_household_by_code)

### Environment Variables
- [ ] `.env.local` has all 3 env vars (for local testing)
- [ ] Vercel project settings → Vars contains all 3 env vars
- [ ] Env vars match between local and Vercel

### Code Review
- [ ] `scripts/01-create-schema.sql` exists and is complete
- [ ] `app/api/delete-account/route.ts` uses `createAdminClient()`
- [ ] `app/auth/login/page.tsx` redirects to `/app`
- [ ] `app/app/page.tsx` uses `DashboardDb` component
- [ ] All imports are correct

### Testing (Local)
- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts dev server
- [ ] No TypeScript errors in terminal
- [ ] Sign up works: `/auth/sign-up` → creates auth user
- [ ] Sign up success page shows: `/auth/sign-up-success`
- [ ] Onboarding appears at `/app` (no household)
- [ ] Can create household → sets name, income, role, goals
- [ ] Dashboard loads with empty data
- [ ] Can add expense → appears in list
- [ ] Can add goal → appears in goals tab
- [ ] Can add budget category → appears in budget tab
- [ ] Month navigation works (prev/next buttons)
- [ ] Logout works → redirects to `/auth/login`
- [ ] Login again → redirects to `/app` with same data ✓ (persistence working)

### Multi-User Testing (Local)
- [ ] Sign up as User A → create household "Family A"
- [ ] Open second browser (or incognito) → sign up as User B
- [ ] User B joins household using User A's invite code
- [ ] User A and User B see same household data ✓
- [ ] User A adds expense → User B sees it ✓
- [ ] Login as different user doesn't see other household data ✓ (RLS working)

### SMS Parsing Testing
- [ ] POST to `/api/parse-sms` with Android user_id:
  ```json
  {
    "sms": "You spent ₹500 at SWIGGY on 15-03-2025 10:30:00 pm",
    "save": true,
    "user_id": "test-uuid"
  }
  ```
- [ ] Returns parsed: amount, merchant, category, date
- [ ] Expense appears in "Detected Expenses" widget
- [ ] Click "Confirm" → creates real expense ✓
- [ ] Same SMS again → deduplicates (not created twice) ✓

---

## Vercel Deployment

### Pre-Deploy
- [ ] All code committed to GitHub
- [ ] Branch pushed to remote
- [ ] No uncommitted changes

### Deploy
- [ ] Go to Vercel Dashboard → select project
- [ ] Click "Deploy" or auto-deploy on push
- [ ] Wait for build to complete (~2-3 min)
- [ ] Check: "Deployments" section shows "✓ Ready"
- [ ] Click deployment → opens production URL

### Post-Deploy Testing
- [ ] Production URL loads without errors
- [ ] Sign up works on production
- [ ] Can create household
- [ ] Can add expenses/goals/budget
- [ ] Data persists across page reloads
- [ ] Logout/login works
- [ ] Multi-user household join works

### Monitoring
- [ ] Check Vercel Function Logs for errors
- [ ] Check Supabase Logs → Edge Functions
- [ ] Check Supabase Logs → API Gateway
- [ ] Monitor Real-time subscription health

---

## Post-Deployment

### Security
- [ ] Review Supabase RLS policies in production
- [ ] Verify service role key NOT in client code
- [ ] Check no secrets in GitHub history: `git log -p | grep -i secret`
- [ ] Enable Supabase API rate limiting
- [ ] Review database-level password requirements

### Monitoring
- [ ] Set up error tracking: Sentry / LogRocket
- [ ] Set up uptime monitoring: Pingdom / UptimeRobot
- [ ] Configure Supabase alerts: Metrics, Logs

### Analytics
- [ ] Set up Google Analytics (optional)
- [ ] Track key events: sign ups, households created, expenses added

### Documentation
- [ ] Update `README.md` with live URL
- [ ] Document any custom configurations
- [ ] Keep `BACKEND_SETUP.md` in repo

### Backups
- [ ] Enable Supabase automated backups
- [ ] Test restore procedure
- [ ] Document backup retention policy

---

## Common Issues & Fixes

### Issue: "NEXT_PUBLIC_SUPABASE_URL is not defined"
**Fix**: 
1. Check `.env.local` exists with 3 vars
2. Check Vercel Vars section has all 3
3. Redeploy with `npm run build` locally first

### Issue: "PostgrestError: no rows"
**Fix**: 
- User doesn't exist yet (complete sign up + onboarding)
- RLS policy denying access (check household_id match)
- Check Supabase Logs for actual error

### Issue: "Cannot read property 'uid' of undefined"
**Fix**:
- User not authenticated (check middleware)
- Session expired (logout/login)
- Auth not properly initialized (check useAuth hook)

### Issue: SMS parsing returns "Unknown" merchant
**Fix**:
- SMS format not matching regex
- Add merchant to pattern in `/api/parse-sms`
- Test with different SMS format

### Issue: Database too slow / "Error: statement timeout"
**Fix**:
- Check indexes exist: `idx_profiles_household_id`, etc.
- Check RLS policies aren't too complex
- Monitor Supabase metrics → query performance

### Issue: "Duplicate key value" error on expenses
**Fix**:
- Check unique constraints
- SMS deduplication should prevent this
- If happening, manually delete duplicate in Supabase

---

## Performance Optimization

### Already Implemented ✅
- [x] SWR caching on all hooks
- [x] Database indexes (10 total)
- [x] RLS policies (optimized)
- [x] Pagination available (not required yet)

### Optional Optimizations
- [ ] Enable Supabase query statistics monitoring
- [ ] Add caching layer (Redis) for projections
- [ ] Compress API responses (gzip - automatic)
- [ ] CDN for static assets (automatic with Vercel)
- [ ] Database query optimization if load testing shows issues

---

## Maintenance Plan

### Weekly
- [ ] Check Vercel build logs for warnings
- [ ] Monitor error tracking dashboard
- [ ] Check Supabase database size

### Monthly
- [ ] Review user feedback / bug reports
- [ ] Update dependencies (if no breaking changes)
- [ ] Backup database locally

### Quarterly
- [ ] Review RLS policies for security
- [ ] Audit database permissions
- [ ] Performance review & optimization
- [ ] User count and feature usage analysis

---

## Rollback Procedure (if needed)

If deployment has critical issue:

1. **Immediate**: Revert in Vercel
   - Go to Vercel Dashboard → Deployments
   - Find last good deployment
   - Click "Promote to Production"

2. **Code Fix**:
   - Fix issue locally
   - Push to GitHub
   - New deployment auto-starts

3. **Database Rollback** (if needed):
   - Contact Supabase support for DB restore
   - Or manually revert with backup

---

## Handoff Checklist

When handing off to team:

- [ ] All docs updated (README, BACKEND_SETUP.md, etc.)
- [ ] Team has GitHub repo access
- [ ] Team has Vercel project access
- [ ] Team has Supabase project access
- [ ] Training session completed
- [ ] Monitoring dashboards set up
- [ ] Support contact info documented
- [ ] SLA defined (uptime, response time)

---

## Sign-Off

- [ ] QA testing passed
- [ ] Security review passed
- [ ] Performance review passed
- [ ] Product owner approval
- [ ] Ready for production ✅

---

**Ready to Deploy!** 🚀

If all checkboxes are marked, your Paisa app is production-ready.
