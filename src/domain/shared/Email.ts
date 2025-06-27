/**
 * Email Value Object - Ensures valid email addresses
 * Domain-driven design: encapsulates email validation rules
 */

import { ValueObject } from './ValueObject';
import { DomainValidationError } from './DomainError';

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  static create(email: string): Email {
    if (!this.isValid(email)) {
      throw new DomainValidationError('email', 'Invalid email format');
    }
    
    return new Email({ value: email.toLowerCase().trim() });
  }

  private static isValid(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = email.trim();
    
    return (
      emailRegex.test(trimmedEmail) &&
      trimmedEmail.length <= 254 &&
      !trimmedEmail.includes('..') &&
      !trimmedEmail.startsWith('.') &&
      !trimmedEmail.endsWith('.')
    );
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }

  getDomain(): string {
    return this.props.value.split('@')[1];
  }

  getLocalPart(): string {
    return this.props.value.split('@')[0];
  }
}