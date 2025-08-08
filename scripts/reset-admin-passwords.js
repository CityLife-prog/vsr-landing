/**
 * Admin Password Reset Utility
 * Resets all admin account passwords with new secure ones
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Password security configuration
const SALT_ROUNDS = 12;
const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// Generate a secure password
function generateSecurePassword(length = 16) {
  const charset = {
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
    special: SPECIAL_CHARS
  };

  const allChars = charset.uppercase + charset.lowercase + charset.numbers + charset.special;
  
  let password = '';
  
  // Ensure at least one character from each category
  password += charset.uppercase[crypto.randomInt(charset.uppercase.length)];
  password += charset.lowercase[crypto.randomInt(charset.lowercase.length)];
  password += charset.numbers[crypto.randomInt(charset.numbers.length)];
  password += charset.special[crypto.randomInt(charset.special.length)];
  
  // Fill the rest with random characters
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  const arr = password.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  
  return arr.join('');
}

async function resetAdminPasswords() {
  console.log('🔐 VSR Admin Password Reset Utility');
  console.log('=====================================');
  
  const dataDir = path.join(process.cwd(), 'data', 'secure');
  const usersFile = path.join(dataDir, 'users.encrypted');
  
  try {
    // Read current users
    const userData = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    const users = userData.users;
    
    console.log(`📂 Found ${users.length} users in the system`);
    
    // Generate new passwords for all admin users
    const newPasswords = [];
    
    for (let user of users) {
      if (user.role === 'admin') {
        // Generate new secure password
        const newPassword = generateSecurePassword(16);
        
        // Hash the new password
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        const passwordHash = await bcrypt.hash(newPassword, salt);
        
        // Update user
        const oldHash = user.passwordHash;
        user.passwordHash = passwordHash;
        user.requirePasswordChange = true; // Force password change on next login
        user.lastPasswordChange = new Date();
        user.passwordExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
        user.updatedAt = new Date();
        
        newPasswords.push({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          password: newPassword,
          oldHashPrefix: oldHash.substring(0, 20) + '...',
          newHashPrefix: passwordHash.substring(0, 20) + '...'
        });
        
        console.log(`✅ Reset password for: ${user.email} (${user.firstName} ${user.lastName})`);
      }
    }
    
    // Update the user data
    userData.lastUpdated = new Date();
    
    // Write updated data back
    fs.writeFileSync(usersFile, JSON.stringify(userData, null, 2));
    
    console.log('\n🔒 Password Reset Summary');
    console.log('========================');
    
    newPasswords.forEach(user => {
      console.log(`\n👤 ${user.name} (${user.email})`);
      console.log(`   New Password: ${user.password}`);
      console.log(`   Old Hash: ${user.oldHashPrefix}`);
      console.log(`   New Hash: ${user.newHashPrefix}`);
      console.log(`   ⚠️  User must change password on next login`);
    });
    
    console.log('\n📋 Login Instructions:');
    console.log('======================');
    console.log('1. Go to: http://localhost:3000/portal/admin/login');
    console.log('2. Use the email and new password above');
    console.log('3. You will be prompted to change your password immediately');
    console.log('4. Choose a new secure password that meets the requirements');
    
    console.log('\n🔗 Password Reset Testing:');
    console.log('==========================');
    console.log('1. Go to: http://localhost:3000/portal/admin/forgot-password');
    console.log('2. Enter your admin email address');
    console.log('3. Check your email for the reset link');
    console.log('4. Follow the link to reset your password');
    
    console.log('\n✅ All admin passwords have been reset successfully!');
    console.log('⚠️  IMPORTANT: Save these passwords securely and change them after first login!');
    
    return newPasswords;
    
  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  resetAdminPasswords().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { resetAdminPasswords, generateSecurePassword };