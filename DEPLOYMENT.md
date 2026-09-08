# Vercel Deployment Guide

This guide will walk you through deploying the Shule ya Kenya Sasa school management system to Vercel with Supabase as the backend.

## Prerequisites

- A Vercel account (free tier works)
- A Supabase project with database and auth configured
- Git repository with your code (GitHub, GitLab, or Bitbucket)
- Node.js 18+ installed locally

## Step 1: Get Supabase Credentials

1. Log in to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy the following values:
   - **Project URL** (e.g., `https://xyz.supabase.co`)
   - **anon/public** key (this is your publishable key)

**Important Security Note:**
- Never use the `service_role` key in client-side code
- The anon/public key is safe for frontend use as it has Row Level Security (RLS) policies
- Keep your Supabase database secure with proper RLS policies

## Step 2: Configure Environment Variables

### Option A: Via Vercel Dashboard (Recommended for first deployment)

1. Push your code to your Git repository
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**
3. Import your repository
4. In the **Configure Project** step, add the following environment variables:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase Project URL | Production, Preview, Development |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon/public key | Production, Preview, Development |

5. Click **Deploy**

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Add environment variables
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production

# Deploy
vercel --prod
```

## Step 3: Configure Supabase for Production

### 1. Update Auth Settings

In your Supabase dashboard:

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to your Vercel domain (e.g., `https://your-app.vercel.app`)
3. Add your custom domain if you have one (e.g., `https://school.yourdomain.com`)
4. Set **Redirect URLs** to include:
   - `https://your-app.vercel.app/**`
   - `http://localhost:8080/**` (for local development)

### 2. Configure Row Level Security (RLS)

Ensure your Supabase tables have proper RLS policies:

```sql
-- Example RLS policy for students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see students from their school
CREATE POLICY "Users can view students from their school"
ON students FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE school_id = students.school_id
  )
);

-- Policy: School admins can insert students
CREATE POLICY "School admins can insert students"
ON students FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles 
    WHERE school_id = students.school_id AND role = 'school_admin'
  )
);
```

### 3. Enable Required Extensions

In Supabase SQL Editor, run:

```sql
-- Enable UUID extension (usually enabled by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

## Step 4: Deploy to Vercel

### Automatic Deployment (Git Integration)

1. Push your code to your Git repository
2. Vercel will automatically detect the build and deploy
3. Monitor the deployment in the Vercel dashboard

### Manual Deployment

```bash
# Build locally first
npm run build

# Deploy with Vercel CLI
vercel --prod
```

## Step 5: Verify Deployment

1. Visit your Vercel deployment URL
2. Test the following:
   - Login functionality
   - Dashboard access
   - Student/teacher data loading
   - Timetable generation
   - Reports and downloads

## Step 6: Configure Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain (e.g., `school.yourdomain.com`)
3. Update DNS records as instructed by Vercel
4. Update Supabase Site URL to include your custom domain

## Step 7: Set Up Monitoring

### Vercel Analytics

1. In Vercel dashboard, go to **Analytics**
2. Enable Web Vitals and Analytics
3. Install the Vercel Analytics script (optional)

### Error Tracking

Consider integrating error tracking:
- **Sentry**: https://sentry.io
- **LogRocket**: https://logrocket.com

## Troubleshooting

### Build Fails

**Issue:** Build fails with "VITE_SUPABASE_URL is not defined"

**Solution:** Ensure environment variables are set in Vercel dashboard with the correct names (`VITE_SUPABASE_URL`, not `SUPABASE_URL`)

### Authentication Issues

**Issue:** Users cannot log in after deployment

**Solution:**
1. Check Supabase Auth URL Configuration includes your Vercel domain
2. Verify Redirect URLs are configured correctly
3. Check browser console for auth errors

### Database Connection Issues

**Issue:** Data not loading after deployment

**Solution:**
1. Verify Supabase credentials are correct
2. Check RLS policies are not blocking access
3. Test Supabase connection in browser console:
   ```javascript
   const { createClient } = window.supabase;
   const supabase = createClient('YOUR_URL', 'YOUR_KEY');
   const { data, error } = await supabase.from('students').select('*');
   console.log(data, error);
   ```

### Large Bundle Size Warning

**Issue:** Build shows "Some chunks are larger than 500 kB"

**Solution:** This is a warning, not an error. The app will still work. To optimize:
- Consider code-splitting large components
- Use dynamic imports for rarely used features
- The current bundle size is acceptable for a complex app

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes | `https://xyz.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key | Yes | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## Security Checklist

- [ ] Supabase RLS policies are enabled on all tables
- [ ] Service role key is never used in client-side code
- [ ] Only anon/public key is used in environment variables
- [ ] Supabase Auth redirect URLs are configured
- [ ] Custom domain has SSL enabled (automatic with Vercel)
- [ ] Environment variables are not committed to Git
- [ ] `.env` files are in `.gitignore`

## Performance Optimization

The current build configuration includes:
- ESBuild minification
- Console/debugger statements removed in production
- Source maps disabled in production
- Code splitting via Vite

For further optimization:
- Implement lazy loading for heavy components
- Use Vercel Edge Functions for API calls if needed
- Enable Vercel Image Optimization for images

## Post-Deployment Tasks

1. **Test all user flows:**
   - School admin registration
   - Teacher/student creation
   - Timetable generation
   - Attendance tracking
   - Report generation

2. **Monitor performance:**
   - Check Vercel Analytics for load times
   - Monitor Supabase dashboard for database performance

3. **Set up backups:**
   - Supabase automatically backs up your database
   - Consider additional backup strategy for critical data

4. **Update documentation:**
   - Document any custom configurations
   - Update team on deployment process

## Support

- **Vercel Documentation:** https://vercel.com/docs
- **Supabase Documentation:** https://supabase.com/docs
- **React Router Documentation:** https://reactrouter.com

## Local Development

To run the project locally after deployment:

```bash
# Install dependencies
npm install

# Create .env file with your Supabase credentials
cp .env.example .env
# Edit .env with your credentials

# Run development server
npm run dev
```

The app will be available at `http://localhost:8080`
