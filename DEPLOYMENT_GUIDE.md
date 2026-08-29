# Deployment Guide: GitHub & Vercel

This guide provides step-by-step instructions for deploying the Shule ya Kenya Sasa school management system to GitHub and Vercel.

## Prerequisites

- GitHub account
- Vercel account
- Supabase project with environment variables
- Node.js installed locally
- Git installed locally

---

## Part 1: Upload to GitHub

### Step 1: Initialize Git Repository

If you haven't already initialized git:

```bash
cd c:/Users/ADMIN/Desktop/shule-ya-kenya-sasa-main
git init
```

### Step 2: Create .gitignore

Ensure your `.gitignore` file includes sensitive files:

```gitignore
# Environment variables
.env
.env.local
.env.production

# Logs
logs
*.log
npm-debug.log*

# Dependencies
node_modules/

# Build output
dist/
build/

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

### Step 3: Stage and Commit Files

```bash
git add .
git commit -m "Initial commit: School management system"
```

### Step 4: Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the **+** icon in the top-right corner
3. Select **New repository**
4. Repository name: `shule-ya-kenya-sasa` (or your preferred name)
5. Description: School management system
6. Make it **Private** (recommended for production)
7. **Do not** initialize with README, .gitignore, or license
8. Click **Create repository**

### Step 5: Push to GitHub

```bash
# Add remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/shule-ya-kenya-sasa.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Part 2: Deploy to Vercel

### Step 1: Prepare Environment Variables

You'll need these environment variables from your Supabase project:

- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key

Get these from:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Copy **Project URL** and **anon public** key

### Step 2: Connect Vercel to GitHub

1. Go to [Vercel](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Click **Import** under **Continue with GitHub**
4. Authorize Vercel to access your GitHub account if prompted
5. Select the `shule-ya-kenya-sasa` repository
6. Click **Import**

### Step 3: Configure Vercel Project

#### Framework Preset
- **Framework Preset**: Vite
- **Root Directory**: `./` (default)

#### Build and Output Settings
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

#### Environment Variables

Add the following environment variables:

| Name | Value | Environment |
|------|-------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase URL | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview, Development |

To add variables:
1. Scroll to **Environment Variables**
2. Click **Add New**
3. Enter the name and value
4. Select all environments (Production, Preview, Development)
5. Click **Save**

### Step 4: Deploy

1. Click **Deploy**
2. Wait for the build to complete (usually 1-2 minutes)
3. Once deployed, you'll get a Vercel URL like: `https://shule-ya-kenya-sasa.vercel.app`

---

## Part 3: Post-Deployment Configuration

### Step 1: Configure Supabase Auth Callbacks

To ensure authentication works in production:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Add your Vercel URL to **Site URL**:
   ```
   https://your-project.vercel.app
   ```
5. Add to **Redirect URLs**:
   ```
   https://your-project.vercel.app/**
   ```
6. Click **Save**

### Step 2: Test the Deployment

1. Visit your Vercel URL
2. Test authentication flow
3. Test key features (student management, etc.)
4. Verify all data loads correctly

---

## Part 4: Continuous Deployment

With this setup, any changes pushed to GitHub will automatically deploy to Vercel:

### Workflow

```bash
# Make changes locally
git add .
git commit -m "Your commit message"
git push
```

Vercel will automatically:
1. Detect the push
2. Build the project
3. Deploy to a preview URL (for pull requests)
4. Deploy to production (for main branch)

### Branch Strategy

- **main branch** → Production deployment
- **feature branches** → Preview deployments (for testing)

---

## Part 5: Custom Domain (Optional)

### Step 1: Add Custom Domain

1. Go to your Vercel project dashboard
2. Click **Settings** → **Domains**
3. Click **Add Domain**
4. Enter your domain (e.g., `school.yourdomain.com`)
5. Click **Add**

### Step 2: Configure DNS

Vercel will provide DNS records. Add them to your domain registrar:

| Type | Name | Value |
|------|------|-------|
| CNAME | school | cname.vercel-dns.com |

### Step 3: Verify

1. Wait for DNS propagation (usually 5-30 minutes)
2. Vercel will automatically issue an SSL certificate
3. Your site will be accessible via your custom domain

---

## Troubleshooting

### Build Failures

**Issue**: Build fails on Vercel

**Solutions**:
1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in `package.json`
3. Verify environment variables are set correctly
4. Try running `npm run build` locally first

### Environment Variables Not Working

**Issue**: Features not working in production

**Solutions**:
1. Verify environment variables are set in Vercel dashboard
2. Ensure variable names start with `VITE_` (Vite requirement)
3. Check that variables are selected for all environments
4. Redeploy after adding variables

### Authentication Issues

**Issue**: Login/registration not working

**Solutions**:
1. Verify Supabase URL and anon key are correct
2. Check Supabase auth callback URLs
3. Ensure CORS is configured in Supabase
4. Check browser console for errors

### Database Connection Issues

**Issue**: Data not loading

**Solutions**:
1. Verify Supabase project is active
2. Check Row Level Security (RLS) policies
3. Ensure tables exist in Supabase
4. Verify database connection string

---

## Security Best Practices

1. **Never commit `.env` files** - Use environment variables in Vercel
2. **Keep repository private** - Especially in production
3. **Use strong Supabase keys** - Rotate keys if compromised
4. **Enable RLS policies** - Restrict database access
5. **Monitor Vercel logs** - Watch for suspicious activity
6. **Regular updates** - Keep dependencies updated

---

## Monitoring and Maintenance

### Vercel Dashboard

Monitor your deployment at:
- **Analytics**: View traffic and performance
- **Logs**: Check build and runtime logs
- **Deployments**: View deployment history
- **Settings**: Configure project settings

### Supabase Dashboard

Monitor your database at:
- **Database**: View tables and data
- **Authentication**: Monitor user activity
- **API Logs**: Check API usage and errors
- **Storage**: Manage file storage

---

## Rollback Procedure

If something goes wrong:

1. Go to Vercel project dashboard
2. Click **Deployments**
3. Find the previous successful deployment
4. Click the **...** menu
5. Select **Redeploy**
6. Or revert the code change and push to GitHub

---

## Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [GitHub Documentation](https://docs.github.com/)

---

## Quick Reference Commands

```bash
# Git commands
git add .
git commit -m "Message"
git push

# Local testing
npm install
npm run dev
npm run build
npm run preview

# Testing
npm test
npm run test:coverage
```

---

**Last Updated**: August 2026
**Version**: 1.0
