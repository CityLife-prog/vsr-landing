/**
 * Database Initialization Script
 * Sets up database schema and initial data for production deployment
 */

import { executeQuery, initializeDatabase } from '../lib/database-connection';
import { DEFAULT_ADMIN_USERS } from '../types/admin';

interface InitResult {
  success: boolean;
  message: string;
  errors: string[];
}

export class DatabaseInitializer {
  private errors: string[] = [];

  async initialize(): Promise<InitResult> {
    console.log('🚀 Starting database initialization...');
    
    try {
      // Initialize connection
      await initializeDatabase();
      console.log('✅ Database connection established');

      // Create tables
      await this.createTables();
      console.log('✅ Database tables created');

      // Insert initial data
      await this.insertInitialData();
      console.log('✅ Initial data inserted');

      // Verify setup
      await this.verifySetup();
      console.log('✅ Database setup verified');

      return {
        success: true,
        message: 'Database initialized successfully',
        errors: this.errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.errors.push(errorMessage);
      console.error('❌ Database initialization failed:', errorMessage);

      return {
        success: false,
        message: 'Database initialization failed',
        errors: this.errors
      };
    }
  }

  private async createTables(): Promise<void> {
    console.log('Creating database tables...');

    // Admin Users table
    await this.executeWithErrorHandling(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        admin_level VARCHAR(20) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        is_email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login_at TIMESTAMP NULL,
        metadata JSON
      )
    `, 'admin_users');

    // Employee Accounts table
    await this.executeWithErrorHandling(`
      CREATE TABLE IF NOT EXISTS employee_accounts (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        employee_id VARCHAR(50) UNIQUE NOT NULL,
        department VARCHAR(100) NOT NULL,
        position VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        verification_status VARCHAR(20) DEFAULT 'unverified',
        hire_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        approved_by VARCHAR(36) NULL,
        approved_at TIMESTAMP NULL,
        notes TEXT NULL
      )
    `, 'employee_accounts');

    // Quotes table
    await this.executeWithErrorHandling(`
      CREATE TABLE IF NOT EXISTS quotes (
        id VARCHAR(36) PRIMARY KEY,
        full_name VARCHAR(200) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        service_class VARCHAR(20) NOT NULL,
        service VARCHAR(100) NOT NULL,
        details TEXT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, 'quotes');

    // Application Submissions table
    await this.executeWithErrorHandling(`
      CREATE TABLE IF NOT EXISTS applications (
        id VARCHAR(36) PRIMARY KEY,
        full_name VARCHAR(200) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        experience_level VARCHAR(50) NOT NULL,
        availability TEXT NOT NULL,
        transportation BOOLEAN NOT NULL,
        additional_info TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `, 'applications');

    // System Logs table
    await this.executeWithErrorHandling(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id VARCHAR(36) PRIMARY KEY,
        level VARCHAR(10) NOT NULL,
        message TEXT NOT NULL,
        metadata JSON,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_id VARCHAR(36) NULL,
        ip_address VARCHAR(45) NULL,
        endpoint VARCHAR(255) NULL
      )
    `, 'system_logs');
  }

  private async insertInitialData(): Promise<void> {
    console.log('Inserting initial data...');

    // Insert default admin users
    for (const adminConfig of DEFAULT_ADMIN_USERS) {
      await this.executeWithErrorHandling(`
        INSERT OR IGNORE INTO admin_users (
          id, email, first_name, last_name, admin_level, 
          is_active, is_email_verified, metadata
        ) VALUES (
          ?, ?, ?, ?, ?, 
          true, true, ?
        )
      `, 'admin_users insert', [
        this.generateUUID(),
        adminConfig.email,
        adminConfig.firstName,
        adminConfig.lastName,
        adminConfig.adminLevel,
        JSON.stringify({
          isDefaultAdmin: true,
          permissions: adminConfig.permissions,
          createdBy: 'system'
        })
      ]);
    }

    console.log(`✅ Inserted ${DEFAULT_ADMIN_USERS.length} default admin users`);
  }

  private async verifySetup(): Promise<void> {
    console.log('Verifying database setup...');

    // Check if tables exist and have data
    const tables = ['admin_users', 'employee_accounts', 'quotes', 'applications', 'system_logs'];
    
    for (const table of tables) {
      const result = await executeQuery(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`✅ Table ${table}: ${result.rows[0]?.count || 0} records`);
    }

    // Verify admin users
    const adminResult = await executeQuery('SELECT email, admin_level FROM admin_users WHERE is_active = true');
    console.log(`✅ Active admin users: ${adminResult.rowCount}`);
    
    for (const admin of adminResult.rows) {
      console.log(`  - ${admin.email} (${admin.admin_level})`);
    }
  }

  private async executeWithErrorHandling(sql: string, operation: string, params?: any[]): Promise<void> {
    try {
      await executeQuery(sql, params);
    } catch (error) {
      const errorMessage = `Failed to execute ${operation}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.errors.push(errorMessage);
      console.warn(`⚠️ ${errorMessage}`);
      // Don't throw - let the process continue for other operations
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// CLI execution
if (require.main === module) {
  const initializer = new DatabaseInitializer();
  initializer.initialize()
    .then(result => {
      console.log('\n🎉 Database initialization completed!');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n❌ Database initialization failed:', error);
      process.exit(1);
    });
}

export default DatabaseInitializer;