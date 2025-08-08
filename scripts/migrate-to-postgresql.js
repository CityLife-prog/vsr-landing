#!/usr/bin/env node

/**
 * Migration Script: JSON Files to PostgreSQL
 * Migrates existing JSON data to PostgreSQL database
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Load environment variables
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  } catch (error) {
    console.error('Could not load .env.local file:', error.message);
  }
}

loadEnvFile();

// Database configuration
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'vsr_construction',
  user: process.env.DATABASE_USER || 'vsr_app',
  password: process.env.DATABASE_PASSWORD || '',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Load existing JSON data
function loadJsonData() {
  const dataDir = path.join(__dirname, '..', 'data');
  
  try {
    const users = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
    const quotes = JSON.parse(fs.readFileSync(path.join(dataDir, 'quote-requests.json'), 'utf8'));
    const serviceStatus = JSON.parse(fs.readFileSync(path.join(dataDir, 'service-status.json'), 'utf8'));
    
    return { users, quotes, serviceStatus };
  } catch (error) {
    console.error('Error loading JSON data:', error.message);
    return { users: [], quotes: [], serviceStatus: {} };
  }
}

// Migrate users with password hashing
async function migrateUsers(pool, users) {
  console.log(`\n📥 Migrating ${users.length} users...`);
  
  for (const user of users) {
    try {
      // Hash the plaintext password
      const passwordHash = await bcrypt.hash(user.password, 12);
      
      const query = `
        INSERT INTO users (
          id, email, password_hash, first_name, last_name, role, status,
          require_password_change, is_first_login, last_login_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          updated_at = NOW()
      `;
      
      await pool.query(query, [
        user.id,
        user.email,
        passwordHash,
        user.firstName,
        user.lastName,
        user.role,
        user.status || 'active',
        user.requiresPasswordReset || false,
        user.isFirstLogin !== false, // Default to true if not specified
        user.lastLoginAt ? new Date(user.lastLoginAt) : null
      ]);
      
      console.log(`  ✅ Migrated user: ${user.email}`);
    } catch (error) {
      console.error(`  ❌ Failed to migrate user ${user.email}:`, error.message);
    }
  }
}

// Migrate quote requests
async function migrateQuotes(pool, quotes) {
  console.log(`\n📋 Migrating ${quotes.length} quote requests...`);
  
  for (const quote of quotes) {
    try {
      const query = `
        INSERT INTO quote_requests (
          id, request_id, full_name, email, phone, service_class, service, details,
          photo_files, status, quoted_amount, estimated_value, admin_notes,
          ip_address, user_agent, submitted_at, submitted_by, reviewed_at,
          quoted_at, updated_at, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (request_id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          service = EXCLUDED.service,
          details = EXCLUDED.details,
          status = EXCLUDED.status,
          quoted_amount = EXCLUDED.quoted_amount,
          updated_at = NOW()
      `;
      
      await pool.query(query, [
        quote.id || `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        quote.id, // Use existing ID as request_id
        quote.fullName,
        quote.email,
        quote.phone,
        quote.serviceClass || 'not-specified',
        quote.service,
        quote.details,
        JSON.stringify(quote.photoFiles || []),
        quote.status || 'review',
        quote.quotedAmount || null,
        quote.estimatedValue || null,
        quote.adminNotes || null,
        quote.ipAddress || null,
        quote.userAgent || null,
        quote.submittedAt ? new Date(quote.submittedAt) : new Date(),
        quote.submittedBy || null,
        quote.reviewedAt ? new Date(quote.reviewedAt) : null,
        quote.quotedAt ? new Date(quote.quotedAt) : null,
        quote.updatedAt ? new Date(quote.updatedAt) : new Date(),
        quote.updatedBy || null
      ]);
      
      console.log(`  ✅ Migrated quote: ${quote.id} (${quote.fullName})`);
    } catch (error) {
      console.error(`  ❌ Failed to migrate quote ${quote.id}:`, error.message);
    }
  }
}

// Migrate service status
async function migrateServiceStatus(pool, serviceStatus) {
  console.log(`\n⚙️  Migrating service status...`);
  
  try {
    // Update or insert service status
    for (const [serviceName, config] of Object.entries(serviceStatus.services || {})) {
      const query = `
        INSERT INTO service_status (service_name, is_enabled, disabled_reason, disabled_by, disabled_at, updated_by, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (service_name) DO UPDATE SET
          is_enabled = EXCLUDED.is_enabled,
          disabled_reason = EXCLUDED.disabled_reason,
          disabled_by = EXCLUDED.disabled_by,
          disabled_at = EXCLUDED.disabled_at,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
      `;
      
      await pool.query(query, [
        serviceName,
        config.enabled !== false,
        config.disabledReason || null,
        config.disabledBy || null,
        config.disabledAt ? new Date(config.disabledAt) : null,
        serviceStatus.updatedBy || 'migration'
      ]);
      
      console.log(`  ✅ Migrated service status: ${serviceName}`);
    }
  } catch (error) {
    console.error('  ❌ Failed to migrate service status:', error.message);
  }
}

// Main migration function
async function runMigration() {
  console.log('🚀 Starting PostgreSQL Migration...\n');
  
  const pool = new Pool(dbConfig);
  
  try {
    // Test connection
    console.log('🔗 Testing database connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    client.release();
    
    console.log(`✅ Connected to PostgreSQL`);
    console.log(`   Time: ${result.rows[0].current_time}`);
    console.log(`   Version: ${result.rows[0].db_version.substring(0, 80)}...`);
    
    // Load JSON data
    const data = loadJsonData();
    
    // Run migrations
    await migrateUsers(pool, data.users);
    await migrateQuotes(pool, data.quotes);
    await migrateServiceStatus(pool, data.serviceStatus);
    
    // Verify migration
    console.log('\n📊 Migration Summary:');
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const quoteCount = await pool.query('SELECT COUNT(*) as count FROM quote_requests');
    const serviceCount = await pool.query('SELECT COUNT(*) as count FROM service_status');
    
    console.log(`   Users: ${userCount.rows[0].count}`);
    console.log(`   Quote Requests: ${quoteCount.rows[0].count}`);
    console.log(`   Service Status: ${serviceCount.rows[0].count}`);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n⚠️  SECURITY NOTE: Plaintext passwords have been hashed with bcrypt');
    console.log('   Users will need to use their existing passwords to log in');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
PostgreSQL Migration Script

Usage:
  node scripts/migrate-to-postgresql.js [options]

Options:
  --help, -h     Show this help message
  --dry-run      Show what would be migrated without making changes

Environment Variables Required:
  DATABASE_HOST       PostgreSQL host (default: localhost)
  DATABASE_PORT       PostgreSQL port (default: 5432)
  DATABASE_NAME       Database name (default: vsr_construction)
  DATABASE_USER       Database user (default: vsr_app)
  DATABASE_PASSWORD   Database password (required)

Before running:
1. Create PostgreSQL database and user
2. Run database/schema.sql to create tables
3. Set environment variables in .env.local
4. Backup existing data files

Example:
  # Test connection
  node scripts/migrate-to-postgresql.js --dry-run
  
  # Run migration
  node scripts/migrate-to-postgresql.js
`);
    process.exit(0);
  }
  
  if (args.includes('--dry-run')) {
    console.log('🧪 DRY RUN MODE - No changes will be made\n');
    const data = loadJsonData();
    console.log(`Would migrate:`);
    console.log(`  - ${data.users.length} users`);
    console.log(`  - ${data.quotes.length} quote requests`);
    console.log(`  - Service status configuration`);
    console.log('\nRun without --dry-run to perform actual migration');
    process.exit(0);
  }
  
  runMigration().catch(console.error);
}

module.exports = { runMigration, loadJsonData };