# PostgreSQL Setup Guide

Complete guide for setting up PostgreSQL for VSR Construction landing page.

## 🎯 Quick Start

### 1. Install PostgreSQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**macOS (Homebrew):**
```bash
brew install postgresql
brew services start postgresql
```

**Windows:**
Download from [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Create Database and User

```bash
# Connect as postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE vsr_construction;
CREATE USER vsr_app WITH PASSWORD 'your-secure-password-here';
GRANT ALL PRIVILEGES ON DATABASE vsr_construction TO vsr_app;
GRANT USAGE ON SCHEMA public TO vsr_app;
GRANT CREATE ON SCHEMA public TO vsr_app;
ALTER USER vsr_app CREATEDB;
\q
```

### 3. Create Database Schema

```bash
# Run the schema creation script
psql -h localhost -U vsr_app -d vsr_construction -f database/schema.sql
```

### 4. Configure Environment Variables

Add to `.env.local`:
```bash
DATABASE_PROVIDER=postgresql
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=vsr_construction
DATABASE_USER=vsr_app
DATABASE_PASSWORD=your-secure-database-password
DATABASE_SSL=false
DATABASE_MAX_CONNECTIONS=20
```

### 5. Migrate Existing Data

```bash
# Test migration (dry run)
node scripts/migrate-to-postgresql.js --dry-run

# Run actual migration
node scripts/migrate-to-postgresql.js
```

## 🔧 Production Setup

### Hosted PostgreSQL Options

#### Option 1: Vercel Postgres (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Create Postgres database
vercel postgres create vsr-construction

# Get connection string
vercel env pull .env.local
```

#### Option 2: Supabase
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get connection details from Settings > Database
4. Use connection string format:
   ```
   DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
   ```

#### Option 3: Railway
1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL service
4. Get connection string from Variables tab

#### Option 4: Render
1. Go to [render.com](https://render.com)
2. Create PostgreSQL database
3. Get connection details

### Environment Variables for Production

```bash
# Use connection string (preferred for production)
DATABASE_URL=postgresql://user:password@host:port/database

# Or individual variables
DATABASE_PROVIDER=postgresql
DATABASE_HOST=your-host.com
DATABASE_PORT=5432
DATABASE_NAME=vsr_construction
DATABASE_USER=your-username
DATABASE_PASSWORD=your-secure-password
DATABASE_SSL=true
DATABASE_MAX_CONNECTIONS=20
```

## 🛡️ Security Configuration

### 1. Password Security
- Use strong passwords (min 12 characters)
- Include uppercase, lowercase, numbers, symbols
- Never commit passwords to version control

### 2. SSL Configuration
```bash
# Production (required)
DATABASE_SSL=true

# Development (optional)
DATABASE_SSL=false
```

### 3. Connection Limits
```bash
# Adjust based on your hosting plan
DATABASE_MAX_CONNECTIONS=20  # Default
DATABASE_MAX_CONNECTIONS=5   # Hobby/free plans
DATABASE_MAX_CONNECTIONS=100 # Enterprise
```

## 🔍 Troubleshooting

### Connection Issues

**Error: `password authentication failed`**
```bash
# Reset password
sudo -u postgres psql
ALTER USER vsr_app PASSWORD 'your-new-secure-password';
```

**Error: `database does not exist`**
```bash
# Create database
sudo -u postgres createdb vsr_construction
```

**Error: `permission denied for schema public`**
```bash
# Grant permissions
sudo -u postgres psql vsr_construction
GRANT ALL ON SCHEMA public TO vsr_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vsr_app;
```

### Migration Issues

**Error: `relation does not exist`**
```bash
# Run schema creation first
psql -h localhost -U vsr_app -d vsr_construction -f database/schema.sql
```

**Error: `duplicate key value`**
- Data already exists in database
- Use `--dry-run` to check what would be migrated
- Clear database or update migration script

### Performance Issues

**Slow queries:**
```sql
-- Check active connections
SELECT * FROM pg_stat_activity;

-- Check database size
SELECT pg_size_pretty(pg_database_size('vsr_construction'));

-- Check table sizes
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats 
WHERE tablename = 'quote_requests';
```

## 📊 Database Maintenance

### Backup
```bash
# Create backup
pg_dump -h localhost -U vsr_app vsr_construction > backup.sql

# Restore backup
psql -h localhost -U vsr_app vsr_construction < backup.sql
```

### Monitor Performance
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Check table usage
SELECT schemaname, tablename, n_tup_ins, n_tup_upd, n_tup_del 
FROM pg_stat_user_tables;
```

### Vacuum and Analyze
```sql
-- Routine maintenance
VACUUM ANALYZE;

-- For specific table
VACUUM ANALYZE quote_requests;
```

## 🚀 Testing

### Test Database Connection
```bash
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  user: 'vsr_app',
  password: 'your-secure-password',
  database: 'vsr_construction'
});
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? err : res.rows[0]);
  pool.end();
});
"
```

### Test Application
```bash
# Start development server
npm run dev

# Check health endpoint
curl http://localhost:3000/api/v1/health

# Should show database status as healthy
```

## 📋 Production Checklist

- [ ] PostgreSQL database created
- [ ] Database user created with proper permissions
- [ ] Schema tables created (`database/schema.sql`)
- [ ] Environment variables configured
- [ ] SSL enabled for production
- [ ] Connection limits set appropriately
- [ ] Existing data migrated
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Application tested with database

## 🔗 Useful Commands

```bash
# Connect to database
psql -h localhost -U vsr_app -d vsr_construction

# List tables
\dt

# Describe table
\d users

# Show database size
\l+

# Show current connections
SELECT * FROM pg_stat_activity WHERE datname = 'vsr_construction';

# Exit psql
\q
```

---

**Next Steps:**
1. Choose hosting provider (Vercel Postgres recommended)
2. Run migration script
3. Update application to use `DATABASE_PROVIDER=postgresql`
4. Test all functionality
5. Deploy to production