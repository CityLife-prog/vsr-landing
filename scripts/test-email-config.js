#!/usr/bin/env node

/**
 * Email Configuration Test Script
 * Tests email configuration and sends test emails to verify delivery
 */

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Load environment variables from .env.local
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

// Load environment variables
loadEnvFile();

// Email configuration testing
function testEmailConfig() {
  console.log('📧 Email Configuration Test\n');
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log(`  GMAIL_USER: ${process.env.GMAIL_USER ? '✅ Set' : '❌ Missing'}`);
  console.log(`  GMAIL_APP_PASSWORD: ${process.env.GMAIL_APP_PASSWORD ? '✅ Set' : '❌ Missing'}`);
  console.log(`  EMAIL_FROM: ${process.env.EMAIL_FROM ? '✅ Set' : '❌ Missing'}`);
  
  console.log('\nRecipient Configuration:');
  console.log(`  QUOTE_RECIPIENTS: ${process.env.QUOTE_RECIPIENTS || 'Not set'}`);
  console.log(`  APPLICATION_RECIPIENTS: ${process.env.APPLICATION_RECIPIENTS || 'Not set'}`);
  console.log(`  ADMIN_RECIPIENTS: ${process.env.ADMIN_RECIPIENTS || 'Not set'}`);
  console.log(`  SUPPORT_RECIPIENTS: ${process.env.SUPPORT_RECIPIENTS || 'Not set'}`);
  console.log(`  EMERGENCY_RECIPIENTS: ${process.env.EMERGENCY_RECIPIENTS || 'Not set'}`);
  console.log(`  TEST_EMAIL_RECIPIENT: ${process.env.TEST_EMAIL_RECIPIENT || 'Not set'}`);
  
  // Parse recipients
  const quoteRecipients = (process.env.QUOTE_RECIPIENTS || '').split(',').map(e => e.trim()).filter(e => e.length > 0);
  const appRecipients = (process.env.APPLICATION_RECIPIENTS || '').split(',').map(e => e.trim()).filter(e => e.length > 0);
  
  console.log('\nParsed Recipients:');
  console.log(`  Quote Recipients: ${quoteRecipients.length} emails`);
  quoteRecipients.forEach(email => console.log(`    - ${email}`));
  console.log(`  Application Recipients: ${appRecipients.length} emails`);
  appRecipients.forEach(email => console.log(`    - ${email}`));
  
  // Validate only allowed emails
  const allowedEmails = ['citylife32@outlook.com', 'contact@vsrsnow.com'];
  const allRecipients = [...new Set([...quoteRecipients, ...appRecipients])];
  
  console.log('\nSecurity Validation:');
  const unauthorizedEmails = allRecipients.filter(email => !allowedEmails.includes(email));
  if (unauthorizedEmails.length > 0) {
    console.log('❌ Found unauthorized email recipients:');
    unauthorizedEmails.forEach(email => console.log(`    - ${email}`));
  } else {
    console.log('✅ All recipients are authorized');
  }
  
  return {
    configValid: process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.EMAIL_FROM,
    recipients: {
      quotes: quoteRecipients,
      applications: appRecipients
    },
    unauthorized: unauthorizedEmails
  };
}

// Send test email
async function sendTestEmail(type = 'test') {
  console.log(`\n🧪 Sending ${type} test email...`);
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      secure: true,
      requireTLS: true,
    });
    
    // Verify connection
    await transporter.verify();
    console.log('✅ SMTP connection verified');
    
    // Determine recipients based on type
    let recipients;
    let subject;
    let text;
    
    switch (type) {
      case 'quote':
        recipients = process.env.QUOTE_RECIPIENTS;
        subject = 'TEST: Quote Request Email Configuration';
        text = 'This is a test email to verify quote request email delivery is working correctly.';
        break;
      case 'application':
        recipients = process.env.APPLICATION_RECIPIENTS;
        subject = 'TEST: Job Application Email Configuration';
        text = 'This is a test email to verify job application email delivery is working correctly.';
        break;
      default:
        recipients = process.env.TEST_EMAIL_RECIPIENT || 'citylife32@outlook.com';
        subject = 'TEST: Email Configuration Verification';
        text = 'This is a test email to verify the email configuration is working correctly.';
    }
    
    if (!recipients) {
      console.log('❌ No recipients configured for this email type');
      return false;
    }
    
    const mailOptions = {
      from: `VSR Construction <${process.env.EMAIL_FROM}>`,
      to: recipients,
      subject: subject,
      text: `${text}

Sent at: ${new Date().toISOString()}
Environment: ${process.env.NODE_ENV || 'development'}
Type: ${type}

This email confirms that your email configuration is working correctly.`,
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Recipients: ${recipients}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    return false;
  }
}

// Main execution
async function main() {
  const config = testEmailConfig();
  
  if (!config.configValid) {
    console.log('\n❌ Email configuration is invalid. Please check your environment variables.');
    process.exit(1);
  }
  
  if (config.unauthorized.length > 0) {
    console.log('\n⚠️  Warning: Unauthorized email recipients found. Remove them before production.');
  }
  
  // Ask user if they want to send test emails
  const args = process.argv.slice(2);
  if (args.includes('--send-test')) {
    console.log('\n📤 Sending test emails...');
    
    const testResult = await sendTestEmail('test');
    if (testResult) {
      console.log('\n✅ Email configuration test completed successfully!');
      console.log('Check your inbox to confirm email delivery.');
    } else {
      console.log('\n❌ Email test failed. Check your configuration and credentials.');
      process.exit(1);
    }
  } else {
    console.log('\n💡 To send a test email, run: node scripts/test-email-config.js --send-test');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testEmailConfig, sendTestEmail };