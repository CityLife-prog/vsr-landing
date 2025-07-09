/**
 * Password Management System
 * Secure password hashing, validation, and policy enforcement
 */

import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  PasswordConfig,
  AuthenticationError,
  AuthErrorCode
} from './types';

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-100
  errors: string[];
  warnings: string[];
}

export interface PasswordHashResult {
  hash: string;
  salt: string;
  algorithm: string;
  iterations: number;
}

export class PasswordManager {
  private config: PasswordConfig;
  private passwordHistory = new Map<string, string[]>(); // userId -> previous hashes
  private commonPasswords = new Set<string>();

  constructor(config: PasswordConfig) {
    this.config = config;
    this.initializeCommonPasswords();
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const hash = await bcrypt.hash(password, this.config.hashRounds);
      return hash;
    } catch {
      throw new AuthenticationError(
        'Failed to hash password',
        AuthErrorCode.PASSWORD_TOO_WEAK
      );
    }
  }

  /**
   * Verify password against stored hash
   */
  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, storedHash);
    } catch {
      return false;
    }
  }

  /**
   * Validate password against policy
   */
  async validatePassword(password: string): Promise<PasswordValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    // Length validation
    if (password.length < this.config.minLength) {
      errors.push(`Password must be at least ${this.config.minLength} characters long`);
    } else if (password.length >= this.config.minLength) {
      score += 10;
    }

    if (password.length > this.config.maxLength) {
      errors.push(`Password must not exceed ${this.config.maxLength} characters`);
    }

    // Character type requirements
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (this.config.requireUppercase && !hasUppercase) {
      errors.push('Password must contain at least one uppercase letter');
    } else if (hasUppercase) {
      score += 15;
    }

    if (this.config.requireLowercase && !hasLowercase) {
      errors.push('Password must contain at least one lowercase letter');
    } else if (hasLowercase) {
      score += 15;
    }

    if (this.config.requireNumbers && !hasNumbers) {
      errors.push('Password must contain at least one number');
    } else if (hasNumbers) {
      score += 15;
    }

    if (this.config.requireSpecialChars && !hasSpecialChars) {
      errors.push('Password must contain at least one special character');
    } else if (hasSpecialChars) {
      score += 15;
    }

    // Common password check
    if (this.config.preventCommonPasswords && this.isCommonPassword(password)) {
      errors.push('Password is too common. Please choose a more unique password');
    }

    // Pattern analysis
    const patternScore = this.analyzePatterns(password);
    score += patternScore.score;
    warnings.push(...patternScore.warnings);

    // Entropy calculation
    const entropy = this.calculateEntropy(password);
    if (entropy < 40) {
      warnings.push('Password has low entropy. Consider adding more variety');
    } else if (entropy > 60) {
      score += 10;
    }

    // Dictionary attack resistance
    const dictionaryScore = this.checkDictionaryResistance(password);
    score += dictionaryScore.score;
    warnings.push(...dictionaryScore.warnings);

    // Repetition check
    if (this.hasExcessiveRepetition(password)) {
      warnings.push('Password contains excessive character repetition');
      score -= 10;
    }

    // Sequential characters check
    if (this.hasSequentialCharacters(password)) {
      warnings.push('Password contains sequential characters (e.g., abc, 123)');
      score -= 10;
    }

    // Keyboard pattern check
    if (this.hasKeyboardPatterns(password)) {
      warnings.push('Password contains keyboard patterns (e.g., qwerty, asdf)');
      score -= 10;
    }

    // Length bonus
    if (password.length >= 12) {
      score += 10;
    }
    if (password.length >= 16) {
      score += 10;
    }

    // Normalize score
    score = Math.max(0, Math.min(100, score));

    return {
      isValid: errors.length === 0,
      score,
      errors,
      warnings
    };
  }

  /**
   * Check if password was recently used
   */
  async isPasswordReused(userId: string, newPassword: string): Promise<boolean> {
    const history = this.passwordHistory.get(userId) || [];
    
    for (const oldHash of history) {
      try {
        if (await bcrypt.compare(newPassword, oldHash)) {
          return true;
        }
      } catch {
        // If comparison fails, continue to next hash
        continue;
      }
    }

    return false;
  }

  /**
   * Store password hash for user
   */
  async storePasswordHash(userId: string, hashedPassword: string): Promise<void> {
    // Update password history
    const history = this.passwordHistory.get(userId) || [];
    history.unshift(hashedPassword);
    
    // Keep only last 5 passwords
    if (history.length > 5) {
      history.splice(5);
    }
    
    this.passwordHistory.set(userId, history);
  }

  /**
   * Generate secure random password
   */
  generatePassword(length: number = 16): string {
    const charset = {
      lowercase: 'abcdefghijklmnopqrstuvwxyz',
      uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      numbers: '0123456789',
      special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };

    let password = '';
    let allChars = '';

    // Ensure at least one character from each required type
    if (this.config.requireLowercase) {
      password += this.getRandomChar(charset.lowercase);
      allChars += charset.lowercase;
    }

    if (this.config.requireUppercase) {
      password += this.getRandomChar(charset.uppercase);
      allChars += charset.uppercase;
    }

    if (this.config.requireNumbers) {
      password += this.getRandomChar(charset.numbers);
      allChars += charset.numbers;
    }

    if (this.config.requireSpecialChars) {
      password += this.getRandomChar(charset.special);
      allChars += charset.special;
    }

    // If no charset was added, use all
    if (!allChars) {
      allChars = charset.lowercase + charset.uppercase + charset.numbers + charset.special;
    }

    // Fill remaining length
    for (let i = password.length; i < length; i++) {
      password += this.getRandomChar(allChars);
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Get password strength description
   */
  getStrengthDescription(score: number): string {
    if (score >= 90) return 'Very Strong';
    if (score >= 70) return 'Strong';
    if (score >= 50) return 'Medium';
    if (score >= 30) return 'Weak';
    return 'Very Weak';
  }

  /**
   * Estimate time to crack password
   */
  estimateCrackTime(password: string): string {
    const entropy = this.calculateEntropy(password);
    const possibleCombinations = Math.pow(2, entropy);
    
    // Assume 1 billion attempts per second
    const secondsToCrack = possibleCombinations / (2 * 1e9);
    
    if (secondsToCrack < 1) return 'Instantly';
    if (secondsToCrack < 60) return `${Math.round(secondsToCrack)} seconds`;
    if (secondsToCrack < 3600) return `${Math.round(secondsToCrack / 60)} minutes`;
    if (secondsToCrack < 86400) return `${Math.round(secondsToCrack / 3600)} hours`;
    if (secondsToCrack < 31536000) return `${Math.round(secondsToCrack / 86400)} days`;
    if (secondsToCrack < 31536000000) return `${Math.round(secondsToCrack / 31536000)} years`;
    
    return 'Centuries';
  }

  /**
   * PBKDF2 hash function
   */
  private async pbkdf2(password: string, salt: string, iterations: number): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, 64, 'sha512', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey.toString('hex'));
      });
    });
  }

  /**
   * Format hash for storage
   */
  private formatHash(hashResult: PasswordHashResult): string {
    return `${hashResult.algorithm}:${hashResult.iterations}:${hashResult.salt}:${hashResult.hash}`;
  }

  /**
   * Parse stored hash
   */
  private parseHash(formattedHash: string): PasswordHashResult | null {
    const parts = formattedHash.split(':');
    if (parts.length !== 4) {
      return null;
    }

    return {
      algorithm: parts[0],
      iterations: parseInt(parts[1], 10),
      salt: parts[2],
      hash: parts[3]
    };
  }

  /**
   * Calculate password entropy
   */
  private calculateEntropy(password: string): number {
    let charsetSize = 0;

    if (/[a-z]/.test(password)) charsetSize += 26;
    if (/[A-Z]/.test(password)) charsetSize += 26;
    if (/\d/.test(password)) charsetSize += 10;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) charsetSize += 32;

    return password.length * Math.log2(charsetSize);
  }

  /**
   * Analyze password patterns
   */
  private analyzePatterns(password: string): { score: number; warnings: string[] } {
    const warnings: string[] = [];
    let score = 20; // Base score

    // Check for mixed case
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
      score += 5;
    }

    // Check for numbers and letters
    if (/\d/.test(password) && /[a-zA-Z]/.test(password)) {
      score += 5;
    }

    // Check for special characters
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      score += 5;
    }

    // Penalty for common substitutions
    if (/[@4]/.test(password) || /[3e]/.test(password) || /[0o]/.test(password)) {
      warnings.push('Common character substitutions detected');
      score -= 5;
    }

    return { score, warnings };
  }

  /**
   * Check dictionary resistance
   */
  private checkDictionaryResistance(password: string): { score: number; warnings: string[] } {
    const warnings: string[] = [];
    let score = 0;

    // Check for dictionary words (simplified check)
    const commonWords = ['password', 'admin', 'user', 'login', 'welcome', 'hello', 'world'];
    const lowerPassword = password.toLowerCase();
    
    for (const word of commonWords) {
      if (lowerPassword.includes(word)) {
        warnings.push(`Contains dictionary word: ${word}`);
        score -= 10;
      }
    }

    // Check for personal information patterns
    if (/\b(19|20)\d{2}\b/.test(password)) {
      warnings.push('Contains year pattern');
      score -= 5;
    }

    if (/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(password)) {
      warnings.push('Contains date pattern');
      score -= 5;
    }

    return { score: Math.max(score, 0), warnings };
  }

  /**
   * Check for excessive repetition
   */
  private hasExcessiveRepetition(password: string): boolean {
    const maxRepeats = 3;
    
    for (let i = 0; i < password.length - maxRepeats; i++) {
      const char = password[i];
      let count = 1;
      
      for (let j = i + 1; j < password.length && password[j] === char; j++) {
        count++;
      }
      
      if (count > maxRepeats) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check for sequential characters
   */
  private hasSequentialCharacters(password: string): boolean {
    const sequences = ['abcdefghijklmnopqrstuvwxyz', '0123456789'];
    
    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const subseq = sequence.substring(i, i + 3);
        if (password.toLowerCase().includes(subseq) || 
            password.toLowerCase().includes(subseq.split('').reverse().join(''))) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Check for keyboard patterns
   */
  private hasKeyboardPatterns(password: string): boolean {
    const patterns = [
      'qwerty', 'asdf', 'zxcv', 'qwer', 'asdfg', 'zxcvb',
      '1234', '12345', '123456'
    ];
    
    const lowerPassword = password.toLowerCase();
    
    for (const pattern of patterns) {
      if (lowerPassword.includes(pattern) || 
          lowerPassword.includes(pattern.split('').reverse().join(''))) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if password is in common passwords list
   */
  private isCommonPassword(password: string): boolean {
    return this.commonPasswords.has(password.toLowerCase());
  }

  /**
   * Get random character from charset
   */
  private getRandomChar(charset: string): string {
    const randomIndex = crypto.randomInt(0, charset.length);
    return charset[randomIndex];
  }

  /**
   * Initialize common passwords list
   */
  private initializeCommonPasswords(): void {
    const common = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', '1234567',
      'monkey', '12345678', 'password1', '123123', 'dragon',
      '1234567890', 'football', 'iloveyou', 'admin123', 'welcome123',
      'princess', 'sunshine', 'master', '654321', 'passw0rd',
      'shadow', 'superman', 'qwerty123', 'michael', 'jesus'
    ];

    common.forEach(pwd => this.commonPasswords.add(pwd));
  }
}

// Default password configuration
export const DEFAULT_PASSWORD_CONFIG: PasswordConfig = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  hashRounds: 10000,
  maxAttempts: 5,
  lockoutDuration: 900 // 15 minutes
};