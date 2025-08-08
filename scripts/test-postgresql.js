#!/usr/bin/env node

/**
 * PostgreSQL Connection Test
 * Tests database connection and basic operations
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

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
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || '20'),
};

async function testDatabaseConnection() {
  console.log('🧪 PostgreSQL Connection Test\n');
  
  console.log('Configuration:');
  console.log(`  Host: ${dbConfig.host}`);
  console.log(`  Port: ${dbConfig.port}`);
  console.log(`  Database: ${dbConfig.database}`);
  console.log(`  User: ${dbConfig.user}`);
  console.log(`  Password: ${dbConfig.password ? '✅ Set' : '❌ Missing'}`);
  console.log(`  SSL: ${dbConfig.ssl ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`  Max Connections: ${dbConfig.max}\n`);

  if (!dbConfig.password) {
    console.error('❌ DATABASE_PASSWORD is required');
    process.exit(1);
  }

  const pool = new Pool(dbConfig);

  try {
    // Test basic connection
    console.log('🔗 Testing connection...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    client.release();
    
    console.log('✅ Connection successful!');
    console.log(`   Time: ${result.rows[0].current_time}`);
    console.log(`   Version: ${result.rows[0].db_version.substring(0, 80)}...\n`);

    // Test table existence
    console.log('📋 Checking tables...');
    const tablesQuery = `
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    
    if (tablesResult.rows.length === 0) {
      console.log('⚠️  No tables found. Run database/schema.sql to create tables.');
    } else {
      console.log('✅ Tables found:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name} (${row.column_count} columns)`);
      });
    }

    // Test basic operations (if tables exist)
    const requiredTables = ['users', 'quote_requests', 'user_sessions'];
    const existingTables = tablesResult.rows.map(row => row.table_name);
    const missingTables = requiredTables.filter(table => !existingTables.includes(table));

    if (missingTables.length > 0) {
      console.log(`\n⚠️  Missing required tables: ${missingTables.join(', ')}`);
      console.log('   Run: psql -h localhost -U vsr_app -d vsr_construction -f database/schema.sql');
    } else {
      console.log('\n🧪 Testing basic operations...');
      
      // Test user count
      const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log(`   Users: ${userCount.rows[0].count}`);
      
      // Test quote count
      const quoteCount = await pool.query('SELECT COUNT(*) as count FROM quote_requests');
      console.log(`   Quote Requests: ${quoteCount.rows[0].count}`);
      
      // Test session count
      const sessionCount = await pool.query('SELECT COUNT(*) as count FROM user_sessions');
      console.log(`   Sessions: ${sessionCount.rows[0].count}`);
    }

    // Test connection pool
    console.log('\n🔄 Testing connection pool...');
    const poolStats = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
    console.log(`   Total connections: ${poolStats.totalCount}`);
    console.log(`   Idle connections: ${poolStats.idleCount}`);
    console.log(`   Waiting connections: ${poolStats.waitingCount}`);

    console.log('\n✅ All tests passed! PostgreSQL is ready for use.');

  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    
    // Provide specific error guidance
    if (error.message.includes('password authentication failed')) {
      console.log('\n🔧 Fix: Check DATABASE_PASSWORD in .env.local');
      console.log('   Or reset password: ALTER USER vsr_app PASSWORD \'new-password\';');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('\n🔧 Fix: Create database: createdb -U postgres vsr_construction');
    } else if (error.message.includes('connect ECONNREFUSED')) {
      console.log('\n🔧 Fix: Start PostgreSQL service');
      console.log('   Ubuntu: sudo systemctl start postgresql');
      console.log('   macOS: brew services start postgresql');
    } else if (error.message.includes('role') && error.message.includes('does not exist')) {
      console.log('\n🔧 Fix: Create user:');
      console.log('   sudo -u postgres createuser -s vsr_app');
      console.log('   sudo -u postgres psql -c "ALTER USER vsr_app PASSWORD \'VSRdb2025!\';"');
    }
    
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
PostgreSQL Connection Test

Usage:
  node scripts/test-postgresql.js [options]

Options:
  --help, -h     Show this help message

This script tests:
- Database connection
- Required environment variables
- Table existence
- Basic operations
- Connection pool

Before running:
1. Install PostgreSQL
2. Create database and user
3. Set environment variables in .env.local
4. Optionally run database/schema.sql

Example:
  node scripts/test-postgresql.js
`);
    process.exit(0);
  }
  
  testDatabaseConnection().catch(console.error);
}

module.exports = { testDatabaseConnection };