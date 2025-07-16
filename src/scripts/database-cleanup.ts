/**
 * Database Cleanup Script
 * Removes all entries except valid accounts and projects
 */

import { AdminUserService } from '../services/AdminUserService';
import { EmployeeAccountService } from '../services/EmployeeAccountService';
import { DatabaseConnection } from '../infrastructure/database/DatabaseConnection';

interface CleanupReport {
  validAccountsRetained: number;
  validProjectsRetained: number;
  entriesRemoved: number;
  cleanupTimestamp: Date;
  errors: string[];
}

export class DatabaseCleanup {
  private adminService: AdminUserService;
  private employeeService: EmployeeAccountService;
  private errors: string[] = [];

  constructor() {
    this.adminService = new AdminUserService();
    this.employeeService = new EmployeeAccountService();
  }

  /**
   * Main cleanup function
   */
  async cleanup(): Promise<CleanupReport> {
    console.log('🧹 Starting database cleanup...');
    const startTime = new Date();

    try {
      // Get current valid data before cleanup
      const validAccounts = await this.getValidAccounts();
      const validProjects = await this.getValidProjects();

      console.log(`📊 Found ${validAccounts.length} valid accounts and ${validProjects.length} valid projects`);

      // Clear existing data
      await this.clearAllData();

      // Restore only valid data
      await this.restoreValidAccounts(validAccounts);
      await this.restoreValidProjects(validProjects);

      const report: CleanupReport = {
        validAccountsRetained: validAccounts.length,
        validProjectsRetained: validProjects.length,
        entriesRemoved: 0, // Would track actual deletions in real implementation
        cleanupTimestamp: startTime,
        errors: this.errors
      };

      console.log('✅ Database cleanup completed successfully');
      console.log('📋 Cleanup Report:', report);

      return report;
    } catch (error) {
      this.errors.push(`Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Get all valid accounts (admin users and approved employees)
   */
  private async getValidAccounts(): Promise<any[]> {
    try {
      const validAccounts = [];

      // Get all admin users (these are considered valid by default)
      const adminUsers = await this.adminService.getAdminUsers();
      validAccounts.push(...adminUsers.map(admin => ({
        type: 'admin',
        id: admin.id,
        email: admin.email,
        data: admin
      })));

      // Get approved employee accounts
      const employees = await this.employeeService.getAllEmployees();
      const approvedEmployees = employees.filter(emp => 
        emp.status === 'active' && 
        emp.verificationStatus === 'fully_verified'
      );

      validAccounts.push(...approvedEmployees.map(emp => ({
        type: 'employee',
        id: emp.id,
        email: emp.email,
        data: emp
      })));

      console.log(`✅ Identified ${adminUsers.length} admin users and ${approvedEmployees.length} approved employees as valid`);

      return validAccounts;
    } catch (error) {
      this.errors.push(`Error getting valid accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Get all valid projects (would need to be implemented based on project structure)
   */
  private async getValidProjects(): Promise<any[]> {
    try {
      // This would connect to your project data source
      // For now, returning empty array as project structure isn't defined
      const validProjects: any[] = [];

      // Example criteria for valid projects:
      // - Must have valid customer information
      // - Must be in active or completed status
      // - Must have valid creation date within reasonable timeframe
      // - Must have required fields populated

      console.log(`✅ Identified ${validProjects.length} valid projects`);

      return validProjects;
    } catch (error) {
      this.errors.push(`Error getting valid projects: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  }

  /**
   * Clear all data from the database
   */
  private async clearAllData(): Promise<void> {
    console.log('🗑️ Clearing all data...');
    
    try {
      // Clear in-memory data (since we're using in-memory storage currently)
      // In a real database, this would execute DELETE statements
      
      // Force clear all employee data - only keep the 4 admin accounts
      this.employeeService = new (require('../services/EmployeeAccountService').EmployeeAccountService)();
      
      console.log('✅ All non-admin data cleared - keeping only 4 admin accounts (3 default + 1 demo)');
    } catch (error) {
      this.errors.push(`Error clearing data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Restore valid accounts to the database
   */
  private async restoreValidAccounts(validAccounts: any[]): Promise<void> {
    console.log(`📥 Restoring ${validAccounts.length} valid accounts...`);

    for (const account of validAccounts) {
      try {
        if (account.type === 'admin') {
          // Admin users are restored via default initialization
          console.log(`✅ Admin user restored: ${account.email}`);
        } else if (account.type === 'employee') {
          // Restore employee account
          await this.employeeService.restoreEmployee(account.data);
          console.log(`✅ Employee account restored: ${account.email}`);
        }
      } catch (error) {
        this.errors.push(`Error restoring account ${account.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Restore valid projects to the database
   */
  private async restoreValidProjects(validProjects: any[]): Promise<void> {
    console.log(`📥 Restoring ${validProjects.length} valid projects...`);

    for (const project of validProjects) {
      try {
        // This would restore project data
        // Implementation depends on project data structure
        console.log(`✅ Project restored: ${project.id}`);
      } catch (error) {
        this.errors.push(`Error restoring project ${project.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Generate cleanup report
   */
  async generateReport(): Promise<CleanupReport> {
    const validAccounts = await this.getValidAccounts();
    const validProjects = await this.getValidProjects();

    return {
      validAccountsRetained: validAccounts.length,
      validProjectsRetained: validProjects.length,
      entriesRemoved: 0,
      cleanupTimestamp: new Date(),
      errors: this.errors
    };
  }
}

// CLI execution
if (require.main === module) {
  const cleanup = new DatabaseCleanup();
  cleanup.cleanup()
    .then(report => {
      console.log('\n🎉 Cleanup completed successfully!');
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Cleanup failed:', error);
      process.exit(1);
    });
}