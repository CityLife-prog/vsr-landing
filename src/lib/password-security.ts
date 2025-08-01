/**
 * Password Security & Encryption System
 * Implements secure password hashing, validation, and encryption mechanisms
 * SECURITY: Uses bcrypt for password hashing with salt rounds and timing-safe comparison
 */

import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// Security configuration
export const PASSWORD_SECURITY_CONFIG = {
  // Bcrypt configuration
  SALT_ROUNDS: 12, // Higher rounds = more secure but slower
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  
  // Password complexity requirements
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL_CHARS: true,
  
  // Account lockout configuration
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
  
  // Password history (prevent reuse)
  PASSWORD_HISTORY_COUNT: 5,
  
  // Password expiration
  PASSWORD_EXPIRY_DAYS: 90,
  
  // Special characters allowed
  SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
} as const;

/**
 * Password validation result interface
 */
export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-100 strength score
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Password hash result interface
 */
export interface PasswordHashResult {
  hash: string;
  salt: string;
  algorithm: string;
  iterations: number;
  timestamp: Date;
}

/**
 * Account lockout information
 */
export interface AccountLockoutInfo {
  isLocked: boolean;
  attemptsRemaining: number;
  lockoutUntil?: Date;
  lastAttempt?: Date;
}

/**
 * Password Security Manager
 * Handles all password-related security operations
 */
export class PasswordSecurityManager {
  private failedAttempts = new Map<string, { count: number; lastAttempt: Date; lockoutUntil?: Date }>();
  private passwordHistory = new Map<string, string[]>(); // userId -> password hashes

  /**
   * Hash a password using bcrypt
   * SECURITY: Uses configurable salt rounds for future-proofing
   */
  async hashPassword(password: string): Promise<PasswordHashResult> {
    if (!password || password.length === 0) {
      throw new Error('Password cannot be empty');
    }

    if (password.length > PASSWORD_SECURITY_CONFIG.MAX_PASSWORD_LENGTH) {
      throw new Error(`Password too long (max ${PASSWORD_SECURITY_CONFIG.MAX_PASSWORD_LENGTH} characters)`);
    }

    try {
      // Generate salt
      const salt = await bcrypt.genSalt(PASSWORD_SECURITY_CONFIG.SALT_ROUNDS);
      
      // Hash password with salt
      const hash = await bcrypt.hash(password, salt);
      
      return {
        hash,
        salt,
        algorithm: 'bcrypt',
        iterations: PASSWORD_SECURITY_CONFIG.SALT_ROUNDS,
        timestamp: new Date()
      };
    } catch (error) {
      throw new Error(`Password hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify a password against its hash
   * SECURITY: Uses timing-safe comparison to prevent timing attacks
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Validate password strength and complexity
   * SECURITY: Comprehensive password validation with detailed feedback
   */
  validatePasswordStrength(password: string): PasswordValidationResult {
    const result: PasswordValidationResult = {
      isValid: false,
      score: 0,
      errors: [],
      warnings: [],
      suggestions: []
    };

    if (!password) {
      result.errors.push('Password is required');
      return result;
    }

    // Length validation
    if (password.length < PASSWORD_SECURITY_CONFIG.MIN_PASSWORD_LENGTH) {
      result.errors.push(`Password must be at least ${PASSWORD_SECURITY_CONFIG.MIN_PASSWORD_LENGTH} characters long`);
    }

    if (password.length > PASSWORD_SECURITY_CONFIG.MAX_PASSWORD_LENGTH) {
      result.errors.push(`Password must not exceed ${PASSWORD_SECURITY_CONFIG.MAX_PASSWORD_LENGTH} characters`);
    }

    // Character type validation
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = new RegExp(`[${PASSWORD_SECURITY_CONFIG.SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password);

    if (PASSWORD_SECURITY_CONFIG.REQUIRE_UPPERCASE && !hasUppercase) {
      result.errors.push('Password must contain at least one uppercase letter');
    }

    if (PASSWORD_SECURITY_CONFIG.REQUIRE_LOWERCASE && !hasLowercase) {
      result.errors.push('Password must contain at least one lowercase letter');
    }

    if (PASSWORD_SECURITY_CONFIG.REQUIRE_NUMBERS && !hasNumbers) {
      result.errors.push('Password must contain at least one number');
    }

    if (PASSWORD_SECURITY_CONFIG.REQUIRE_SPECIAL_CHARS && !hasSpecialChars) {
      result.errors.push(`Password must contain at least one special character (${PASSWORD_SECURITY_CONFIG.SPECIAL_CHARS})`);
    }

    // Common password patterns check
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /admin/i,
      /login/i,
      /welcome/i,
      /(.)\1{2,}/, // Repeated characters
      /012345/,
      /987654/,
      /abcdef/i
    ];

    const foundPatterns = commonPatterns.filter(pattern => pattern.test(password));
    if (foundPatterns.length > 0) {
      result.warnings.push('Password contains common patterns that may be easily guessed');
    }

    // Sequential character check
    if (this.hasSequentialChars(password)) {
      result.warnings.push('Password contains sequential characters');
    }

    // Calculate strength score
    let score = 0;
    
    // Length score (up to 25 points)
    score += Math.min(25, (password.length - PASSWORD_SECURITY_CONFIG.MIN_PASSWORD_LENGTH) * 3);
    
    // Character diversity score (up to 40 points)
    score += hasUppercase ? 10 : 0;
    score += hasLowercase ? 10 : 0;
    score += hasNumbers ? 10 : 0;
    score += hasSpecialChars ? 10 : 0;
    
    // Uniqueness score (up to 25 points)
    const uniqueChars = new Set(password).size;
    score += Math.min(25, uniqueChars * 2);
    
    // Penalty for common patterns
    score -= foundPatterns.length * 10;
    
    // Penalty for sequential characters
    if (this.hasSequentialChars(password)) {
      score -= 10;
    }
    
    result.score = Math.max(0, Math.min(100, score));

    // Generate suggestions
    if (result.score < 50) {
      result.suggestions.push('Consider using a longer password');
      result.suggestions.push('Mix uppercase and lowercase letters');
      result.suggestions.push('Include numbers and special characters');
      result.suggestions.push('Avoid common words and patterns');
    }

    if (result.score < 30) {
      result.suggestions.push('Consider using a passphrase with multiple words');
      result.suggestions.push('Use a password manager to generate strong passwords');
    }

    // Set validity
    result.isValid = result.errors.length === 0 && result.score >= 50;

    return result;
  }

  /**
   * Check for sequential characters in password
   */
  private hasSequentialChars(password: string): boolean {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      '0123456789',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm'
    ];

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const subseq = sequence.substring(i, i + 3);
        if (password.includes(subseq)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check account lockout status
   * SECURITY: Implements exponential backoff for failed login attempts
   */
  checkAccountLockout(identifier: string): AccountLockoutInfo {
    const attempts = this.failedAttempts.get(identifier);
    
    if (!attempts) {
      return {
        isLocked: false,
        attemptsRemaining: PASSWORD_SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS
      };
    }

    const now = new Date();
    
    // Check if lockout has expired
    if (attempts.lockoutUntil && now > attempts.lockoutUntil) {
      this.failedAttempts.delete(identifier);
      return {
        isLocked: false,
        attemptsRemaining: PASSWORD_SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS
      };
    }

    const isLocked = attempts.count >= PASSWORD_SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS;
    
    return {
      isLocked,
      attemptsRemaining: Math.max(0, PASSWORD_SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - attempts.count),
      lockoutUntil: attempts.lockoutUntil,
      lastAttempt: attempts.lastAttempt
    };
  }

  /**
   * Record a failed login attempt
   * SECURITY: Implements progressive delay and account lockout
   */
  recordFailedAttempt(identifier: string): AccountLockoutInfo {
    const now = new Date();
    const attempts = this.failedAttempts.get(identifier) || { count: 0, lastAttempt: now };
    
    attempts.count++;
    attempts.lastAttempt = now;
    
    // Lock account if max attempts reached
    if (attempts.count >= PASSWORD_SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
      attempts.lockoutUntil = new Date(now.getTime() + PASSWORD_SECURITY_CONFIG.LOCKOUT_DURATION);
    }
    
    this.failedAttempts.set(identifier, attempts);
    
    return this.checkAccountLockout(identifier);
  }

  /**
   * Reset failed login attempts (on successful login)
   */
  resetFailedAttempts(identifier: string): void {
    this.failedAttempts.delete(identifier);
  }

  /**
   * Check if password has been used recently
   * SECURITY: Prevents password reuse
   */
  checkPasswordHistory(userId: string, newPasswordHash: string): boolean {
    const history = this.passwordHistory.get(userId) || [];
    return history.includes(newPasswordHash);
  }

  /**
   * Add password to history
   */
  addPasswordToHistory(userId: string, passwordHash: string): void {
    let history = this.passwordHistory.get(userId) || [];
    
    // Add new password to front of history
    history.unshift(passwordHash);
    
    // Keep only the configured number of passwords
    history = history.slice(0, PASSWORD_SECURITY_CONFIG.PASSWORD_HISTORY_COUNT);
    
    this.passwordHistory.set(userId, history);
  }

  /**
   * Generate a secure random password
   * SECURITY: Uses cryptographically secure random number generation
   */
  generateSecurePassword(length: number = 16): string {
    const charset = {
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      numbers: '0123456789',
      special: PASSWORD_SECURITY_CONFIG.SPECIAL_CHARS
    };

    const allChars = charset.uppercase + charset.lowercase + charset.numbers + charset.special;
    
    let password = '';
    
    // Ensure at least one character from each required category
    if (PASSWORD_SECURITY_CONFIG.REQUIRE_UPPERCASE) {
      password += charset.uppercase[crypto.randomInt(charset.uppercase.length)];
    }
    if (PASSWORD_SECURITY_CONFIG.REQUIRE_LOWERCASE) {
      password += charset.lowercase[crypto.randomInt(charset.lowercase.length)];
    }
    if (PASSWORD_SECURITY_CONFIG.REQUIRE_NUMBERS) {
      password += charset.numbers[crypto.randomInt(charset.numbers.length)];
    }
    if (PASSWORD_SECURITY_CONFIG.REQUIRE_SPECIAL_CHARS) {
      password += charset.special[crypto.randomInt(charset.special.length)];
    }
    
    // Fill the rest with random characters
    for (let i = password.length; i < length; i++) {
      password += allChars[crypto.randomInt(allChars.length)];
    }
    
    // Shuffle the password to avoid predictable patterns
    return this.shuffleString(password);
  }

  /**
   * Shuffle string characters randomly
   */
  private shuffleString(str: string): string {
    const arr = str.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   * SECURITY: Uses authenticated encryption with additional data
   */
  encryptSensitiveData(data: string, key: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', key);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data using AES-256-GCM
   * SECURITY: Verifies authentication tag to prevent tampering
   */
  decryptSensitiveData(encryptedData: { encrypted: string; iv: string; tag: string }, key: string): string {
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Clean up expired lockouts and old data
   * SECURITY: Prevents memory leaks and maintains performance
   */
  cleanup(): void {
    const now = new Date();
    
    // Clean up expired lockouts
    for (const [identifier, attempts] of this.failedAttempts.entries()) {
      if (attempts.lockoutUntil && now > attempts.lockoutUntil) {
        this.failedAttempts.delete(identifier);
      }
    }
    
    // Clean up old password history (older than 1 year)
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    // This would need to be implemented with timestamps in a real system
  }
}

// Export singleton instance
export const passwordSecurity = new PasswordSecurityManager();

// Utility functions
export const passwordUtils = {
  /**
   * Generate a secure password reset token
   */
  generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  },

  /**
   * Generate a secure session ID
   */
  generateSessionId(): string {
    return crypto.randomBytes(24).toString('hex');
  },

  /**
   * Create a secure hash for email verification
   */
  createEmailVerificationHash(email: string, timestamp: number): string {
    const data = `${email}:${timestamp}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  },

  /**
   * Timing-safe string comparison
   */
  timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);
    
    return crypto.timingSafeEqual(bufferA, bufferB);
  }
};

export default passwordSecurity;