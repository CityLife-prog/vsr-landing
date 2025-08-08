/**
 * Startup Validation for Email Configuration
 * Validates email configuration on application startup
 */

import { validateEmailConfig, logEmailConfig } from './email-config';

/**
 * Validate all email configurations on startup
 * Call this during application initialization
 */
export function validateStartupConfiguration(): void {
  console.log('🚀 Starting email configuration validation...');
  
  const emailValidation = validateEmailConfig();
  
  if (!emailValidation.valid) {
    console.error('❌ Email configuration validation failed:');
    emailValidation.errors.forEach(error => {
      console.error(`   - ${error}`);
    });
    
    // In production, you might want to exit the process
    if (process.env.NODE_ENV === 'production') {
      console.error('💥 Exiting due to invalid email configuration in production');
      process.exit(1);
    } else {
      console.warn('⚠️  Continuing with invalid email configuration in development');
    }
  }
  
  // Log current configuration
  logEmailConfig();
  
  console.log('✅ Startup validation complete');
}

export default validateStartupConfiguration;