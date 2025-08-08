# Production Deployment Guide

Complete guide for deploying VSR Construction landing page to production.

## 🚀 Pre-Deployment Checklist

### 1. Security Audit ✅
- [x] Remove hardcoded secrets from code
- [x] Secure JWT fallback handling
- [x] Remove plaintext passwords from documentation
- [x] Generate secure admin passwords at runtime
- [x] Environment file protection (.gitignore)

### 2. Environment Configuration
- [ ] Create production environment variables
- [ ] Generate secure JWT secret
- [ ] Configure database credentials
- [ ] Set up email credentials
- [ ] Configure domain settings

### 3. Database Setup ✅
- [x] PostgreSQL provider configured
- [x] Migration scripts created
- [x] Secure password hashing implemented
- [x] Connection pooling configured

### 4. Email System ✅
- [x] Email recipient security implemented
- [x] Environment-based configuration
- [x] SMTP authentication configured

## 🔧 Deployment Steps

### Step 1: Choose Hosting Platform

#### Recommended: Vercel (Easiest)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set up database
vercel postgres create vsr-construction

# Configure environment variables
vercel env add
```

#### Alternative: Railway
1. Connect GitHub repository
2. Add PostgreSQL service
3. Configure environment variables
4. Deploy automatically

#### Alternative: Render
1. Create web service from GitHub
2. Add PostgreSQL database
3. Set environment variables
4. Deploy

### Step 2: Database Setup

#### Option A: Vercel Postgres
```bash
# Create database
vercel postgres create vsr-construction

# Get connection string
vercel env pull .env.production

# Run schema
psql $DATABASE_URL -f database/schema.sql

# Migrate data
node scripts/migrate-to-postgresql.js
```

#### Option B: Supabase
1. Create project at supabase.com
2. Get connection details from Settings > Database
3. Run schema via SQL Editor or command line
4. Update environment variables

#### Option C: Railway/Render Postgres
1. Add PostgreSQL service in dashboard
2. Get connection details
3. Run schema and migration scripts

### Step 3: Environment Variables

Copy `.env.production.template` to `.env.production` and configure:

```bash
# Generate secure secrets
JWT_SECRET=$(openssl rand -base64 64)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
DATABASE_PASSWORD=$(openssl rand -base64 32)

# Set in hosting platform
vercel env add JWT_SECRET
vercel env add DATABASE_URL
vercel env add EMAIL_PASS
# ... etc
```

### Step 4: Domain and SSL

#### Vercel
```bash
# Add custom domain
vercel domains add your-domain.com
vercel domains add www.your-domain.com

# SSL is automatic with Vercel
```

#### Railway/Render
1. Add custom domain in dashboard
2. Configure DNS records
3. SSL certificates are automatic

### Step 5: Final Verification

```bash
# Test build
npm run build

# Test health endpoint
curl https://your-domain.com/api/v1/health

# Test email functionality
curl -X POST https://your-domain.com/api/quote -d '{"email":"test@example.com",...}'

# Check admin login
curl -X POST https://your-domain.com/api/admin/auth/login -d '{"email":"admin@example.com","password":"..."}'
```

## 📋 Environment Variables Reference

### Required Variables
```bash
NODE_ENV=production
NEXTAUTH_URL=https://your-domain.com
JWT_SECRET=your-64-character-secret
DATABASE_URL=postgresql://user:pass@host:port/db
EMAIL_PASS=your-gmail-app-password
```

### Email Configuration
```bash
EMAIL_FROM=contact@your-domain.com
GMAIL_USER=contact@your-domain.com
GMAIL_APP_PASSWORD=your-app-password
QUOTE_RECIPIENTS=citylife32@outlook.com,contact@your-domain.com
APPLICATION_RECIPIENTS=citylife32@outlook.com,contact@your-domain.com
```

### Optional Performance Variables
```bash
DATABASE_MAX_CONNECTIONS=20
ENABLE_CACHING=true
RATE_LIMIT_ENABLED=true
ENABLE_SECURITY_HEADERS=true
```

## 🔐 Security Considerations

### 1. Environment Variables
- Never commit production secrets to git
- Use strong, randomly generated secrets
- Rotate secrets regularly
- Use different secrets for different environments

### 2. Database Security
- Use SSL connections in production
- Implement connection limits
- Regular security updates
- Backup encryption

### 3. Email Security
- Use app passwords, not account passwords
- Restrict email recipients to authorized accounts
- Monitor email delivery logs
- Implement rate limiting

### 4. Application Security
- Enable HTTPS only
- Configure security headers
- Implement CSP (Content Security Policy)
- Regular dependency updates

## 🚨 Emergency Procedures

### Database Connection Issues
```bash
# Check connection
psql $DATABASE_URL -c "SELECT NOW();"

# Reset connection pool
# Restart application or container
```

### Email Delivery Issues
```bash
# Test SMTP connection
node scripts/test-email-config.js

# Check Gmail app password
# Verify 2FA is enabled
```

### Application Errors
```bash
# Check logs
vercel logs  # For Vercel
# Or check platform-specific logs

# Health check
curl https://your-domain.com/api/v1/health
```

## 📊 Post-Deployment Monitoring

### 1. Health Checks
- `/api/v1/health` - Application health
- Database connectivity
- Email service status
- External service dependencies

### 2. Performance Monitoring
- Response times
- Error rates
- Database query performance
- Email delivery rates

### 3. Security Monitoring
- Failed login attempts
- Unusual traffic patterns
- Dependency vulnerabilities
- SSL certificate expiration

## 🔄 Maintenance Tasks

### Daily
- Monitor error logs
- Check health endpoints
- Verify email delivery

### Weekly
- Review security logs
- Check dependency updates
- Monitor performance metrics

### Monthly
- Rotate secrets (if required)
- Database maintenance
- Security audit
- Backup verification

---

## 📞 Emergency Contacts

- **Technical Issues**: citylife32@outlook.com
- **Business Issues**: contact@vsrsnow.com
- **Security Issues**: citylife32@outlook.com

---

**Next Steps After Deployment:**
1. Set up monitoring and alerting
2. Configure backup strategy
3. Plan regular maintenance schedule
4. Document operational procedures