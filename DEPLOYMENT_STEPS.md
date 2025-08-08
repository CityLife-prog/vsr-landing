# VSR LLC Production Deployment Guide

**Complete step-by-step guide to deploy your VSR landing page to production**

---

## 🎯 Current Status

### ✅ **Completed Tasks**
- [x] Security audit completed - all hardcoded secrets removed
- [x] PostgreSQL database configuration ready
- [x] Production environment template created
- [x] File upload functionality fixed (quote forms + apply form)
- [x] Widget updated with new options
- [x] Cookie consent implemented
- [x] Legal documents updated (VSR LLC)
- [x] Application builds successfully

### 🚀 **Ready for Deployment**
Your application is production-ready from a technical perspective. All critical issues have been resolved.

---

## 📋 Pre-Deployment Checklist

### Step 1: Choose Your Hosting Platform

#### **Option A: Vercel (Recommended - Easiest)**
- ✅ **Pros**: Automatic deployments, built-in PostgreSQL, SSL certificates, excellent Next.js support
- ⚠️ **Cons**: More expensive for large traffic volumes
- 💰 **Cost**: Free tier available, Pro starts at $20/month

#### **Option B: Railway**
- ✅ **Pros**: Simple setup, good pricing, automatic deployments
- ⚠️ **Cons**: Smaller community, fewer integrations
- 💰 **Cost**: $5/month per service

#### **Option C: Render**
- ✅ **Pros**: Good free tier, automatic SSL, simple deployment
- ⚠️ **Cons**: Can be slower than alternatives
- 💰 **Cost**: Free tier available, paid plans start at $7/month

---

## 🚀 Deployment Steps

## Option A: Vercel Deployment (Recommended)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```
- Choose your preferred login method (GitHub, GitLab, Bitbucket, or email)

### Step 3: Initialize Vercel Project
```bash
# From your project root directory
vercel

# Follow the prompts:
# ? Set up and deploy "~/path/to/vsr-landing"? [Y/n] Y
# ? Which scope do you want to deploy to? [Your Account]
# ? Link to existing project? [y/N] N
# ? What's your project's name? vsr-landing
# ? In which directory is your code located? ./
```

### Step 4: Set Up PostgreSQL Database
```bash
# Create PostgreSQL database
vercel postgres create vsr-construction

# This will provide you with a DATABASE_URL
# Save this URL - you'll need it for environment variables
```

### Step 5: Configure Environment Variables

#### Generate Secure Secrets First:
```bash
# Generate secure secrets
node scripts/validate-production-security.js --generate-secrets
```
This will output something like:
```
JWT_SECRET=+7B6/t9lSm9A/eh5nV8B9uKeP49bYefSRamYPJbJeiod4x87N48bs/BOF+Or9QRL
NEXTAUTH_SECRET=2dACP5ZNdNsAtwJuXL/dY4FzYPnemyNoUSbGdGVq+rs=
DATABASE_PASSWORD=Yae5nWUzXELfQNfMfqAaPw5DNaBXs!Aa9
```

#### Set Environment Variables in Vercel:
```bash
# Essential Variables (REQUIRED)
vercel env add NODE_ENV
# Enter: production

vercel env add NEXTAUTH_URL
# Enter: https://your-domain.vercel.app (or your custom domain)

vercel env add JWT_SECRET
# Enter: [Generated JWT_SECRET from above]

vercel env add NEXTAUTH_SECRET
# Enter: [Generated NEXTAUTH_SECRET from above]

vercel env add DATABASE_URL
# Enter: [PostgreSQL URL from Step 4]

# Email Configuration (REQUIRED)
vercel env add EMAIL_FROM
# Enter: contact@vsrsnow.com

vercel env add EMAIL_PASS
# Enter: [Your Gmail App Password]

vercel env add GMAIL_USER
# Enter: contact@vsrsnow.com

vercel env add GMAIL_APP_PASSWORD
# Enter: [Your Gmail App Password]

# Email Recipients (REQUIRED)
vercel env add QUOTE_RECIPIENTS
# Enter: citylife32@outlook.com,contact@vsrsnow.com

vercel env add APPLICATION_RECIPIENTS
# Enter: citylife32@outlook.com,contact@vsrsnow.com

vercel env add ADMIN_RECIPIENTS
# Enter: citylife32@outlook.com

vercel env add SUPPORT_RECIPIENTS
# Enter: citylife32@outlook.com,contact@vsrsnow.com

vercel env add EMERGENCY_RECIPIENTS
# Enter: citylife32@outlook.com

# Optional but Recommended
vercel env add NEXT_PUBLIC_VERSION
# Enter: 2

vercel env add ALLOWED_ORIGIN
# Enter: https://your-domain.vercel.app

vercel env add NEXT_PUBLIC_ENABLE_ANALYTICS
# Enter: true
```

### Step 6: Set Up Database Schema
```bash
# Get your database URL
vercel env pull .env.production

# Run the schema setup
psql "$(grep DATABASE_URL .env.production | cut -d '=' -f2-)" -f database/schema.sql

# Migrate existing data (if any)
node scripts/migrate-to-postgresql.js
```

### Step 7: Deploy to Production
```bash
vercel --prod
```

### Step 8: Set Up Custom Domain (Optional)
```bash
# Add your custom domain
vercel domains add yourdomain.com
vercel domains add www.yourdomain.com

# Update NEXTAUTH_URL
vercel env add NEXTAUTH_URL production
# Enter: https://yourdomain.com

# Update ALLOWED_ORIGIN
vercel env add ALLOWED_ORIGIN production
# Enter: https://yourdomain.com
```

---

## Option B: Railway Deployment

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your VSR landing page repository

### Step 3: Add PostgreSQL Service
1. In your project dashboard, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Note the connection details provided

### Step 4: Configure Environment Variables
1. Click on your web service
2. Go to "Variables" tab
3. Add all the environment variables from the Vercel list above
4. Use the PostgreSQL connection details for DATABASE_URL

### Step 5: Deploy
1. Railway will automatically deploy from your main branch
2. Get your deployment URL from the dashboard

---

## Option C: Render Deployment

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Step 2: Create PostgreSQL Database
1. Click "New" → "PostgreSQL"
2. Name: `vsr-construction`
3. Note the connection details

### Step 3: Create Web Service
1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `vsr-landing`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### Step 4: Set Environment Variables
1. In the web service dashboard, go to "Environment"
2. Add all variables from the list above

### Step 5: Deploy
1. Click "Create Web Service"
2. Render will build and deploy automatically

---

## 🔧 Post-Deployment Configuration

### Step 1: Validate Security Configuration
```bash
# Test your production environment
node scripts/validate-production-security.js --env-file .env.production
```

### Step 2: Test Email Functionality
```bash
# Test email configuration
node scripts/test-email-config.js
```

### Step 3: Verify Application Health
```bash
# Check health endpoint
curl https://your-domain.com/api/v1/health
```

### Step 4: Test Forms
1. **Quote Request**: Submit a quote with file attachments
2. **Quote Update**: Submit an update with files  
3. **Job Application**: Submit application with resume
4. **Widget**: Test all three widget options

---

## 🎯 DNS Configuration (For Custom Domain)

### If Using Cloudflare (Recommended):
1. **Add your domain to Cloudflare**
2. **Update nameservers** at your domain registrar
3. **Add DNS records**:
   ```
   Type: CNAME
   Name: @
   Target: your-app.vercel.app (or Railway/Render domain)
   
   Type: CNAME  
   Name: www
   Target: your-app.vercel.app
   ```
4. **Enable SSL/TLS**: Set to "Full (strict)"
5. **Configure redirects**: www → non-www (or vice versa)

### If Using Domain Registrar DNS:
1. **Add CNAME records**:
   ```
   @ → your-app.vercel.app
   www → your-app.vercel.app
   ```
2. **Wait for propagation** (up to 48 hours)

---

## 📧 Email Setup Requirements

### Step 1: Gmail App Password Setup
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and generate password
   - Use this password for `EMAIL_PASS` and `GMAIL_APP_PASSWORD`

### Step 2: Verify Email Recipients
- Ensure `citylife32@outlook.com` and `contact@vsrsnow.com` can receive emails
- Test email delivery after deployment

---

## 🛡️ Security Final Checklist

### Before Going Live:
- [ ] All environment variables set correctly
- [ ] JWT secrets are unique and secure (64+ characters)
- [ ] Database password is strong and unique
- [ ] Email recipients limited to authorized addresses only
- [ ] SSL/HTTPS enabled and working
- [ ] No hardcoded secrets in code
- [ ] Cookie consent banner working
- [ ] Admin passwords noted and secure

### Security Validation:
```bash
# Run final security check
node scripts/validate-production-security.js --env-file .env.production
```

---

## 🚨 Troubleshooting Common Issues

### Build Failures
```bash
# Check build locally first
npm run build

# Common issues:
# - Missing environment variables
# - TypeScript errors
# - Missing dependencies
```

### Database Connection Issues
```bash
# Test database connection
node scripts/test-postgresql.js --env-file .env.production

# Common issues:
# - Wrong DATABASE_URL format
# - SSL configuration problems
# - Firewall blocking connections
```

### Email Delivery Issues
```bash
# Test email configuration
node scripts/test-email-config.js

# Common issues:
# - Wrong Gmail app password
# - 2FA not enabled
# - Blocked by spam filters
```

### Form Submission Issues
- Check browser network tab for API errors
- Verify file upload size limits
- Check email recipient configuration
- Ensure FormData is being sent correctly

---

## 📊 Monitoring and Maintenance

### Set Up Monitoring:
1. **Uptime Monitoring**: Use Vercel Analytics or external service
2. **Error Tracking**: Set up Sentry or similar
3. **Performance**: Monitor Core Web Vitals
4. **Email Delivery**: Monitor bounce rates

### Regular Maintenance:
- **Weekly**: Check error logs and performance
- **Monthly**: Update dependencies, review security
- **Quarterly**: Review backup strategy, test disaster recovery

---

## 🎉 Launch Checklist

### Pre-Launch (T-24 hours):
- [ ] Complete security audit passed
- [ ] All forms tested and working
- [ ] Email delivery confirmed
- [ ] SSL certificates active
- [ ] DNS propagation complete
- [ ] Admin access verified
- [ ] Backup strategy in place

### Launch Day:
- [ ] Deploy to production
- [ ] Verify all functionality
- [ ] Test forms from different devices
- [ ] Monitor for any errors
- [ ] Announce launch to stakeholders

### Post-Launch (T+24 hours):
- [ ] Monitor application performance
- [ ] Check email delivery logs
- [ ] Review error reports
- [ ] Gather user feedback
- [ ] Plan next iteration

---

## 📞 Emergency Contacts & Support

### Technical Issues:
- **Developer**: Matthew Kenner - citylife32@outlook.com
- **Hosting Support**: [Platform-specific support]

### Business Issues:
- **Primary**: Marcus Vargas - marcus@vsrsnow.com
- **Secondary**: Zach Lewis - zach@vsrsnow.com

### Quick Reference:
- **Admin Login**: `/portal/admin/login`
- **Health Check**: `/api/v1/health` 
- **Security Validation**: `node scripts/validate-production-security.js`
- **Database Test**: `node scripts/test-postgresql.js`

---

## 🚀 Ready to Deploy?

Your application is **production-ready**. Choose your preferred hosting platform from the options above and follow the step-by-step guide. 

**Recommended path**: Start with **Vercel** for the easiest deployment experience, then consider migrating to other platforms if needed for cost or feature reasons.

**Estimated deployment time**: 2-4 hours for first deployment, including domain setup and testing.

---

*Last updated: January 2025*