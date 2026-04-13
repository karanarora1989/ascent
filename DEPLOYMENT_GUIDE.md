# 🚀 Ascent - Production Deployment Guide

## ✅ Pre-Deployment Checklist

### 1. Database Setup (CRITICAL)
- [ ] Create Supabase project at https://supabase.com
- [ ] Copy `lib/supabase/migration_complete.sql`
- [ ] Open Supabase SQL Editor
- [ ] Paste and execute the entire SQL file
- [ ] Verify tables created (should see 11 tables)
- [ ] Verify seed data (20 squads, 43 tech assets)

**Verification Query:**
```sql
SELECT COUNT(*) FROM squads; -- Should return 20
SELECT COUNT(*) FROM tech_assets; -- Should return 43
```

---

### 2. Environment Variables (CRITICAL)

#### A. Get Supabase Credentials
1. Go to https://app.supabase.com/project/_/settings/api
2. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### B. Get Clerk Credentials
1. Create project at https://dashboard.clerk.com/
2. Go to API Keys
3. Copy:
   - `Publishable key` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `Secret key` → `CLERK_SECRET_KEY`

#### C. Configure Clerk Settings
1. In Clerk Dashboard → User & Authentication → Email, Phone, Username
2. Enable: Email address (required)
3. Go to Paths
4. Set:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in: `/dashboard`
   - After sign-up: `/dashboard`

#### D. Get Anthropic API Key
1. Go to https://console.anthropic.com/
2. Create API key
3. Copy → `ANTHROPIC_API_KEY`

---

### 3. Local Testing (RECOMMENDED)

#### A. Set up local environment
```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your credentials
# (Use your favorite text editor)

# Install dependencies
npm install

# Test build
npm run build

# Run locally
npm run dev
```

#### B. Test critical flows
- [ ] Sign up with new account
- [ ] Select a squad during signup
- [ ] Create an idea
- [ ] Promote to backlog
- [ ] Frame problem (AI chat)
- [ ] Select tech assets
- [ ] Move to prioritization
- [ ] Check analytics page

---

### 4. Vercel Deployment

#### A. Connect Repository
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your Git repository
4. Select the repository

#### B. Configure Project
1. Framework Preset: **Next.js**
2. Root Directory: `./` (leave as is)
3. Build Command: `npm run build` (default)
4. Output Directory: `.next` (default)

#### C. Add Environment Variables
Click "Environment Variables" and add:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your-key
CLERK_SECRET_KEY=sk_live_your-secret
ANTHROPIC_API_KEY=sk-ant-your-key
```

**Important:** Add for all environments (Production, Preview, Development)

#### D. Deploy
1. Click "Deploy"
2. Wait for build to complete (~2-3 minutes)
3. Note your deployment URL (e.g., `ascent.vercel.app`)

---

### 5. Post-Deployment Configuration

#### A. Update Clerk Webhook (if using)
1. In Clerk Dashboard → Webhooks
2. Update endpoint URL to: `https://your-domain.vercel.app/api/webhooks/clerk`

#### B. Update Supabase CORS (if needed)
1. In Supabase → Settings → API
2. Add your Vercel domain to allowed origins

#### C. Test Production Deployment
- [ ] Visit your Vercel URL
- [ ] Sign up with test account
- [ ] Test complete workflow
- [ ] Check for console errors
- [ ] Verify database writes

---

## 🔍 Troubleshooting

### Build Fails
**Error:** TypeScript errors
**Fix:** Run `npm run build` locally first to catch errors

**Error:** Missing dependencies
**Fix:** Run `npm install` and commit `package-lock.json`

### Database Errors
**Error:** "relation does not exist"
**Fix:** SQL migration not executed. Run `migration_complete.sql` in Supabase

**Error:** "permission denied"
**Fix:** Check RLS policies in Supabase

### Authentication Errors
**Error:** "Unauthorized" on all pages
**Fix:** Check Clerk environment variables are correct

**Error:** Redirect loop
**Fix:** Verify Clerk paths configuration matches your routes

### AI Features Not Working
**Error:** "API key invalid"
**Fix:** Check `ANTHROPIC_API_KEY` is correct and has credits

**Error:** Rate limit errors
**Fix:** Implement rate limiting or upgrade Anthropic plan

---

## 📊 Monitoring & Maintenance

### Recommended Tools
- **Error Tracking:** Sentry (https://sentry.io)
- **Analytics:** Vercel Analytics (built-in)
- **Uptime:** UptimeRobot (https://uptimerobot.com)

### Regular Checks
- [ ] Monitor Supabase database size
- [ ] Check Anthropic API usage
- [ ] Review Clerk active users
- [ ] Check Vercel function logs

---

## 🔐 Security Checklist

- [ ] All environment variables set in Vercel
- [ ] `.env.local` in `.gitignore`
- [ ] Supabase RLS policies enabled
- [ ] Clerk authentication working
- [ ] Admin email configured (`karanarora1989@gmail.com`)
- [ ] HTTPS enabled (automatic on Vercel)

---

## 🎯 Success Criteria

Your deployment is successful when:
- ✅ Users can sign up and sign in
- ✅ Users can select squads
- ✅ Ideas can be created
- ✅ AI chat works (TrueProblem, TrueRank)
- ✅ Tech assets can be selected
- ✅ Analytics shows real data
- ✅ Admin can approve requests
- ✅ No console errors

---

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Supabase logs
3. Check browser console for errors
4. Review this guide again
5. Check environment variables are correct

---

## 🔄 Rollback Plan

If deployment fails:
1. In Vercel → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"
4. Fix issues locally
5. Redeploy when ready

---

## 🎉 You're Ready!

Once all checkboxes are complete, your Ascent platform is live and ready for users!

**Next Steps:**
1. Share the URL with your team
2. Monitor for errors in first 24 hours
3. Gather user feedback
4. Iterate and improve

Good luck! 🚀
