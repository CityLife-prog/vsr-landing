/**
 * Password Complexity Validation Utility
 * Implements NIST 800-63B and OWASP password guidelines
 */

export interface PasswordRequirement {
  id: string;
  description: string;
  pattern?: RegExp;
  validator?: (password: string) => boolean;
  severity: 'required' | 'recommended' | 'optional';
}

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-100
  strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  requirements: {
    met: PasswordRequirement[];
    failed: PasswordRequirement[];
  };
  suggestions: string[];
}

// Common weak passwords and patterns (subset - in production use a comprehensive list)
const COMMON_WEAK_PASSWORDS = [
  'password', 'password123', '123456', '123456789', 'qwerty', 'abc123',
  'password1', 'admin', 'administrator', 'root', 'user', 'guest', 'test',
  'welcome', 'login', 'pass', '12345678', 'iloveyou', 'princess', 'football',
  'monkey', 'dragon', 'master', 'sunshine', 'superman', 'batman', 'letmein'
];

// Password complexity requirements
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  // REQUIRED (NIST 800-63B compliant)
  {
    id: 'minLength',
    description: 'At least 12 characters long',
    validator: (password: string) => password.length >= 12,
    severity: 'required'
  },
  {
    id: 'maxLength', 
    description: 'No more than 128 characters',
    validator: (password: string) => password.length <= 128,
    severity: 'required'
  },
  {
    id: 'noCommonWords',
    description: 'Not a commonly used weak password',
    validator: (password: string) => !COMMON_WEAK_PASSWORDS.includes(password.toLowerCase()),
    severity: 'required'
  },
  {
    id: 'noRepeatingChars',
    description: 'No more than 3 consecutive identical characters',
    validator: (password: string) => !/(.)\1{3,}/.test(password),
    severity: 'required'
  },
  {
    id: 'noKeyboardPatterns',
    description: 'No obvious keyboard patterns (qwerty, 123456, etc.)',
    validator: (password: string) => {
      const patterns = [
        'qwerty', 'qwertyui', 'asdfgh', 'zxcvbn', 'asdf', 'zxcv',
        '123456', '1234567', '12345678', '987654', '9876543',
        'abcdef', 'fedcba', 'password', 'passw0rd'
      ];
      const lowerPassword = password.toLowerCase();
      return !patterns.some(pattern => lowerPassword.includes(pattern));
    },
    severity: 'required'
  },

  // RECOMMENDED (Enhanced security)
  {
    id: 'hasLowercase',
    description: 'Contains lowercase letters (a-z)',
    pattern: /[a-z]/,
    severity: 'recommended'
  },
  {
    id: 'hasUppercase', 
    description: 'Contains uppercase letters (A-Z)',
    pattern: /[A-Z]/,
    severity: 'recommended'
  },
  {
    id: 'hasNumbers',
    description: 'Contains numbers (0-9)',
    pattern: /[0-9]/,
    severity: 'recommended'
  },
  {
    id: 'hasSpecialChars',
    description: 'Contains special characters (!@#$%^&*)',
    pattern: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    severity: 'recommended'
  },
  {
    id: 'minLength16',
    description: 'At least 16 characters for enhanced security',
    validator: (password: string) => password.length >= 16,
    severity: 'recommended'
  },

  // OPTIONAL (Best practices)
  {
    id: 'hasUnicode',
    description: 'Contains Unicode characters for added complexity',
    validator: (password: string) => /[^\x00-\x7F]/.test(password),
    severity: 'optional'
  },
  {
    id: 'noPersonalInfo',
    description: 'Avoid personal information (names, birthdays, etc.)',
    validator: (password: string) => {
      // Basic check - in production, this would check against user profile data
      const personalPatterns = [
        /john|jane|smith|admin|user|test/i,
        /19\d{2}|20\d{2}/, // Years
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i // Months
      ];
      return !personalPatterns.some(pattern => pattern.test(password));
    },
    severity: 'optional'
  }
];

/**
 * Comprehensive password validation
 */
export function validatePassword(password: string, userContext?: any): PasswordValidationResult {
  const met: PasswordRequirement[] = [];
  const failed: PasswordRequirement[] = [];
  
  // Check each requirement
  PASSWORD_REQUIREMENTS.forEach(requirement => {
    let passes = false;
    
    if (requirement.pattern) {
      passes = requirement.pattern.test(password);
    } else if (requirement.validator) {
      passes = requirement.validator(password);
    }
    
    if (passes) {
      met.push(requirement);
    } else {
      failed.push(requirement);
    }
  });

  // Calculate password strength score (0-100)
  const requiredMet = met.filter(r => r.severity === 'required').length;
  const requiredTotal = PASSWORD_REQUIREMENTS.filter(r => r.severity === 'required').length;
  const recommendedMet = met.filter(r => r.severity === 'recommended').length;
  const recommendedTotal = PASSWORD_REQUIREMENTS.filter(r => r.severity === 'recommended').length;
  const optionalMet = met.filter(r => r.severity === 'optional').length;
  const optionalTotal = PASSWORD_REQUIREMENTS.filter(r => r.severity === 'optional').length;

  // Weighted scoring: Required (60%), Recommended (30%), Optional (10%)
  const score = Math.round(
    (requiredMet / requiredTotal) * 60 +
    (recommendedMet / recommendedTotal) * 30 +
    (optionalMet / optionalTotal) * 10
  );

  // Determine strength level
  let strength: PasswordValidationResult['strength'];
  if (score < 20) strength = 'very-weak';
  else if (score < 40) strength = 'weak';
  else if (score < 60) strength = 'fair';
  else if (score < 80) strength = 'good';
  else if (score < 95) strength = 'strong';
  else strength = 'very-strong';

  // Check if password meets minimum requirements (all required criteria)
  const requiredFailed = failed.filter(r => r.severity === 'required');
  const isValid = requiredFailed.length === 0;

  // Generate suggestions for improvement
  const suggestions = generatePasswordSuggestions(failed, password);

  return {
    isValid,
    score,
    strength,
    requirements: { met, failed },
    suggestions
  };
}

/**
 * Generate helpful suggestions for password improvement
 */
function generatePasswordSuggestions(failed: PasswordRequirement[], password: string): string[] {
  const suggestions: string[] = [];
  
  failed.forEach(requirement => {
    switch (requirement.id) {
      case 'minLength':
        suggestions.push(`Add ${12 - password.length} more characters`);
        break;
      case 'maxLength':
        suggestions.push('Password is too long, please shorten it');
        break;
      case 'hasLowercase':
        suggestions.push('Add lowercase letters (a-z)');
        break;
      case 'hasUppercase':
        suggestions.push('Add uppercase letters (A-Z)');
        break;
      case 'hasNumbers':
        suggestions.push('Add numbers (0-9)');
        break;
      case 'hasSpecialChars':
        suggestions.push('Add special characters (!@#$%^&*)');
        break;
      case 'noCommonWords':
        suggestions.push('Avoid common passwords like "password123"');
        break;
      case 'noRepeatingChars':
        suggestions.push('Avoid repeating the same character multiple times');
        break;
      case 'noKeyboardPatterns':
        suggestions.push('Avoid keyboard patterns like "qwerty" or "123456"');
        break;
      case 'minLength16':
        suggestions.push('Consider using 16+ characters for enhanced security');
        break;
      case 'noPersonalInfo':
        suggestions.push('Avoid personal information like names or birth years');
        break;
    }
  });

  // Add general suggestions if password is weak
  if (password.length < 16) {
    suggestions.push('Consider using a passphrase like "Coffee!Morning@Beach2025"');
  }
  
  return [...new Set(suggestions)]; // Remove duplicates
}

/**
 * Generate a secure password suggestion
 */
export function generateSecurePassword(length: number = 16): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  
  let password = '';
  
  // Ensure at least one character from each category
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Check if password has been compromised (basic implementation)
 * In production, integrate with HaveIBeenPwned API
 */
export async function checkPasswordCompromised(password: string): Promise<boolean> {
  // For demo purposes, check against a small list of known compromised passwords
  const compromisedPasswords = [
    'password', '123456', 'password123', 'admin', 'qwerty',
    'letmein', 'welcome', 'monkey', 'dragon', 'password1'
  ];
  
  return compromisedPasswords.includes(password.toLowerCase());
}

/**
 * Estimate time to crack password (simplified calculation)
 */
export function estimateCrackTime(password: string): string {
  const charsetSize = getCharsetSize(password);
  const combinations = Math.pow(charsetSize, password.length);
  
  // Assume 1 billion guesses per second (modern GPU)
  const secondsToCrack = combinations / (2 * 1_000_000_000);
  
  if (secondsToCrack < 1) return 'Instantly';
  if (secondsToCrack < 60) return `${Math.round(secondsToCrack)} seconds`;
  if (secondsToCrack < 3600) return `${Math.round(secondsToCrack / 60)} minutes`;
  if (secondsToCrack < 86400) return `${Math.round(secondsToCrack / 3600)} hours`;
  if (secondsToCrack < 31536000) return `${Math.round(secondsToCrack / 86400)} days`;
  if (secondsToCrack < 3153600000) return `${Math.round(secondsToCrack / 31536000)} years`;
  return `${Math.round(secondsToCrack / 31536000000)} centuries`;
}

function getCharsetSize(password: string): number {
  let size = 0;
  if (/[a-z]/.test(password)) size += 26;
  if (/[A-Z]/.test(password)) size += 26;
  if (/[0-9]/.test(password)) size += 10;
  if (/[^a-zA-Z0-9]/.test(password)) size += 32; // Special characters
  return size || 1;
}