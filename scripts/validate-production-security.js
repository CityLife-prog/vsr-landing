#!/usr/bin/env node

/**
 * Production Security Validation Script
 * Validates security configuration before deployment
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
function loadEnvFile(envFile = '.env.production') {
  try {
    const envPath = path.join(__dirname, '..', envFile);
    if (!fs.existsSync(envPath)) {
      console.log(`⚠️  ${envFile} not found, checking process.env`);
      return;
    }
    
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
    console.error(`Error loading ${envFile}:`, error.message);
  }
}

// Security validation checks
const securityChecks = {
  // Critical security requirements
  critical: [
    {
      name: 'JWT_SECRET strength',
      check: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) return { pass: false, message: 'JWT_SECRET is not set' };
        if (secret === 'your-secret-key' || secret === 'dev-secret-key-change-in-production') {
          return { pass: false, message: 'JWT_SECRET is using insecure default value' };
        }
        if (secret.length < 32) {
          return { pass: false, message: 'JWT_SECRET is too short (minimum 32 characters)' };
        }
        return { pass: true, message: `JWT_SECRET is secure (${secret.length} characters)` };
      }
    },
    {
      name: 'NODE_ENV production',
      check: () => {
        const env = process.env.NODE_ENV;
        if (env !== 'production') {
          return { pass: false, message: `NODE_ENV is '${env}', should be 'production'` };
        }
        return { pass: true, message: 'NODE_ENV is set to production' };
      }
    },
    {
      name: 'Database password security',
      check: () => {
        const password = process.env.DATABASE_PASSWORD;
        if (!password) return { pass: false, message: 'DATABASE_PASSWORD is not set' };
        if (password === 'VSRdb2025!' || password === 'your-secure-password') {
          return { pass: false, message: 'DATABASE_PASSWORD is using example/default value' };
        }
        if (password.length < 12) {
          return { pass: false, message: 'DATABASE_PASSWORD is too short (minimum 12 characters)' };
        }
        return { pass: true, message: 'DATABASE_PASSWORD is secure' };
      }
    },
    {
      name: 'Email credentials configured',
      check: () => {
        const emailPass = process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;
        if (!emailPass) {
          return { pass: false, message: 'EMAIL_PASS/GMAIL_APP_PASSWORD not set' };
        }
        if (emailPass.length < 8) {
          return { pass: false, message: 'Email password appears to be too short' };
        }
        return { pass: true, message: 'Email credentials configured' };
      }
    }
  ],

  // Important security recommendations
  important: [
    {
      name: 'HTTPS configuration',
      check: () => {
        const url = process.env.NEXTAUTH_URL;
        if (!url) return { pass: false, message: 'NEXTAUTH_URL not set' };
        if (!url.startsWith('https://')) {
          return { pass: false, message: 'NEXTAUTH_URL should use HTTPS in production' };
        }
        return { pass: true, message: 'NEXTAUTH_URL uses HTTPS' };
      }
    },
    {
      name: 'Database SSL',
      check: () => {
        const ssl = process.env.DATABASE_SSL;
        if (ssl !== 'true') {
          return { pass: false, message: 'DATABASE_SSL should be true in production' };
        }
        return { pass: true, message: 'Database SSL enabled' };
      }
    },
    {
      name: 'Email recipient restriction',
      check: () => {
        const recipients = process.env.QUOTE_RECIPIENTS;
        if (!recipients) {
          return { pass: false, message: 'QUOTE_RECIPIENTS not configured' };
        }
        const emails = recipients.split(',').map(e => e.trim());
        const authorizedEmails = ['citylife32@outlook.com', 'contact@vsrsnow.com'];
        const unauthorized = emails.filter(email => !authorizedEmails.includes(email));
        if (unauthorized.length > 0) {
          return { pass: false, message: `Unauthorized email recipients: ${unauthorized.join(', ')}` };
        }
        return { pass: true, message: 'Email recipients properly restricted' };
      }
    },
    {
      name: 'NEXTAUTH_SECRET configured',
      check: () => {
        const secret = process.env.NEXTAUTH_SECRET;
        if (!secret) return { pass: false, message: 'NEXTAUTH_SECRET not set' };
        if (secret.length < 32) {
          return { pass: false, message: 'NEXTAUTH_SECRET should be at least 32 characters' };
        }
        return { pass: true, message: 'NEXTAUTH_SECRET configured' };
      }
    }
  ],

  // Optional security enhancements
  optional: [
    {
      name: 'Rate limiting enabled',
      check: () => {
        const enabled = process.env.RATE_LIMIT_ENABLED;
        if (enabled !== 'true') {
          return { pass: false, message: 'Rate limiting not enabled' };
        }
        return { pass: true, message: 'Rate limiting enabled' };
      }
    },
    {
      name: 'Security headers enabled',
      check: () => {
        const enabled = process.env.ENABLE_SECURITY_HEADERS;
        if (enabled !== 'true') {
          return { pass: false, message: 'Security headers not enabled' };
        }
        return { pass: true, message: 'Security headers enabled' };
      }
    },
    {
      name: 'Request logging enabled',
      check: () => {
        const enabled = process.env.ENABLE_REQUEST_LOGGING;
        if (enabled !== 'true') {
          return { pass: false, message: 'Request logging not enabled' };
        }
        return { pass: true, message: 'Request logging enabled' };
      }
    }
  ]
};

function runSecurityValidation() {
  console.log('🔒 Production Security Validation\\n');
  
  let criticalFailures = 0;
  let importantFailures = 0;
  let optionalFailures = 0;

  // Run critical checks
  console.log('🚨 CRITICAL SECURITY CHECKS:');
  securityChecks.critical.forEach(check => {
    const result = check.check();
    const status = result.pass ? '✅' : '❌';
    console.log(`   ${status} ${check.name}: ${result.message}`);
    if (!result.pass) criticalFailures++;
  });

  console.log('\\n⚠️  IMPORTANT SECURITY CHECKS:');
  securityChecks.important.forEach(check => {
    const result = check.check();
    const status = result.pass ? '✅' : '⚠️ ';
    console.log(`   ${status} ${check.name}: ${result.message}`);
    if (!result.pass) importantFailures++;
  });

  console.log('\\n💡 OPTIONAL SECURITY ENHANCEMENTS:');
  securityChecks.optional.forEach(check => {
    const result = check.check();
    const status = result.pass ? '✅' : '💡';
    console.log(`   ${status} ${check.name}: ${result.message}`);
    if (!result.pass) optionalFailures++;
  });

  // Summary
  console.log('\\n📊 SECURITY VALIDATION SUMMARY:');
  console.log(`   Critical failures: ${criticalFailures}`);
  console.log(`   Important issues: ${importantFailures}`);
  console.log(`   Optional improvements: ${optionalFailures}`);

  if (criticalFailures > 0) {
    console.log('\\n❌ DEPLOYMENT BLOCKED: Critical security issues must be resolved');
    console.log('   Fix all critical issues before deploying to production');
    return false;
  }

  if (importantFailures > 0) {
    console.log('\\n⚠️  DEPLOYMENT WARNING: Important security issues detected');
    console.log('   Consider fixing these issues for better security');
  }

  if (criticalFailures === 0 && importantFailures === 0) {
    console.log('\\n✅ SECURITY VALIDATION PASSED: Ready for production deployment');
  }

  return criticalFailures === 0;
}

function generateSecureSecrets() {
  console.log('\\n🔑 SECURE SECRET GENERATION:\\n');
  
  const jwtSecret = crypto.randomBytes(48).toString('base64');
  const nextAuthSecret = crypto.randomBytes(32).toString('base64');
  const dbPassword = crypto.randomBytes(24).toString('base64').replace(/[^a-zA-Z0-9]/g, '') + '!Aa9';
  
  console.log('Add these to your production environment:');
  console.log(`JWT_SECRET=${jwtSecret}`);
  console.log(`NEXTAUTH_SECRET=${nextAuthSecret}`);
  console.log(`DATABASE_PASSWORD=${dbPassword}`);
  console.log('\\nNOTE: Store these securely and never commit to version control');
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Production Security Validation

Usage:
  node scripts/validate-production-security.js [options]

Options:
  --help, -h           Show this help message
  --generate-secrets   Generate secure secrets for production
  --env-file FILE      Use specific environment file (default: .env.production)

Examples:
  node scripts/validate-production-security.js
  node scripts/validate-production-security.js --generate-secrets
  node scripts/validate-production-security.js --env-file .env.local
`);
    process.exit(0);
  }
  
  if (args.includes('--generate-secrets')) {
    generateSecureSecrets();
    process.exit(0);
  }
  
  const envFile = args.includes('--env-file') ? args[args.indexOf('--env-file') + 1] : '.env.production';
  loadEnvFile(envFile);
  
  const isSecure = runSecurityValidation();
  process.exit(isSecure ? 0 : 1);
}

module.exports = { runSecurityValidation, securityChecks };