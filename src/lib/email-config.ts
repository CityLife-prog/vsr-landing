/**
 * Centralized Email Recipient Configuration
 * Manages all email recipients via environment variables for security and flexibility
 */

export interface EmailRecipientConfig {
  quotes: string[];
  applications: string[];
  admin: string[];
  support: string[];
  emergency: string[];
  test: string[];
}

/**
 * Parse comma-separated email list from environment variable
 * @param envVar Environment variable value
 * @param fallback Fallback emails if env var is missing
 * @returns Array of validated email addresses
 */
function parseEmailList(envVar: string | undefined, fallback: string[] = []): string[] {
  if (!envVar) return fallback;
  
  return envVar
    .split(',')
    .map(email => email.trim())
    .filter(email => email.length > 0 && isValidEmail(email));
}

/**
 * Basic email validation
 * @param email Email address to validate
 * @returns True if email format is valid
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get email recipients configuration from environment variables
 * @returns EmailRecipientConfig object with all recipient lists
 */
export function getEmailRecipients(): EmailRecipientConfig {
  // Restricted recipient lists - only these accounts can receive emails
  const restrictedEmails = ['citylife32@outlook.com', 'contact@vsrsnow.com'];
  
  const config: EmailRecipientConfig = {
    // Quote requests - business inquiries
    quotes: parseEmailList(
      process.env.QUOTE_RECIPIENTS,
      restrictedEmails
    ),
    
    // Job applications - HR inquiries
    applications: parseEmailList(
      process.env.APPLICATION_RECIPIENTS || process.env.TEST_EMAIL_RECIPIENT,
      restrictedEmails
    ),
    
    // Admin notifications - system alerts
    admin: parseEmailList(
      process.env.ADMIN_RECIPIENTS,
      ['citylife32@outlook.com']
    ),
    
    // Support requests - customer service
    support: parseEmailList(
      process.env.SUPPORT_RECIPIENTS,
      restrictedEmails
    ),
    
    // Emergency notifications - critical alerts
    emergency: parseEmailList(
      process.env.EMERGENCY_RECIPIENTS,
      ['citylife32@outlook.com']
    ),
    
    // Test/development emails
    test: parseEmailList(
      process.env.TEST_EMAIL_RECIPIENT,
      ['citylife32@outlook.com']
    )
  };

  // Security: Validate all recipients are in allowed list
  if (process.env.NODE_ENV === 'production') {
    const allowedEmails = new Set(restrictedEmails);
    
    Object.keys(config).forEach(key => {
      const recipientList = config[key as keyof EmailRecipientConfig];
      config[key as keyof EmailRecipientConfig] = recipientList.filter(email => {
        const isAllowed = allowedEmails.has(email);
        if (!isAllowed) {
          console.warn(`⚠️  Email recipient ${email} not in allowed list, removing`);
        }
        return isAllowed;
      });
    });
  }

  return config;
}

/**
 * Get recipients for specific email type
 * @param type Email type (quotes, applications, admin, etc.)
 * @returns Array of email addresses for the specified type
 */
export function getRecipientsForType(type: keyof EmailRecipientConfig): string[] {
  const config = getEmailRecipients();
  return config[type] || [];
}

/**
 * Get recipients as comma-separated string for nodemailer
 * @param type Email type
 * @returns Comma-separated email string
 */
export function getRecipientsString(type: keyof EmailRecipientConfig): string {
  return getRecipientsForType(type).join(', ');
}

/**
 * Validate email configuration on startup
 * @returns Validation result with any errors
 */
export function validateEmailConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const config = getEmailRecipients();

  // Required email configurations
  const requiredConfigs: (keyof EmailRecipientConfig)[] = ['quotes', 'applications', 'admin'];
  
  requiredConfigs.forEach(configType => {
    const recipients = config[configType];
    if (!recipients || recipients.length === 0) {
      errors.push(`Missing recipients for ${configType} emails`);
    }
  });

  // Validate sender configuration
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    errors.push('Missing Gmail credentials (GMAIL_USER, GMAIL_APP_PASSWORD)');
  }

  if (!process.env.EMAIL_FROM) {
    errors.push('Missing EMAIL_FROM configuration');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Log current email configuration (without sensitive data)
 */
export function logEmailConfig(): void {
  const config = getEmailRecipients();
  const validation = validateEmailConfig();
  
  console.log('📧 Email Configuration:');
  console.log(`  Quotes: ${config.quotes.length} recipients`);
  console.log(`  Applications: ${config.applications.length} recipients`);
  console.log(`  Admin: ${config.admin.length} recipients`);
  console.log(`  Support: ${config.support.length} recipients`);
  console.log(`  Emergency: ${config.emergency.length} recipients`);
  console.log(`  Test: ${config.test.length} recipients`);
  
  if (!validation.valid) {
    console.warn('⚠️  Email configuration issues:');
    validation.errors.forEach(error => console.warn(`    - ${error}`));
  } else {
    console.log('✅ Email configuration valid');
  }
}

// Export singleton instance
export const emailRecipients = getEmailRecipients();
export default emailRecipients;