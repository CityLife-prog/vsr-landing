/**
 * Phone Number Value Object - Ensures valid phone numbers
 * Domain-driven design: encapsulates phone validation rules
 */

import { ValueObject } from './ValueObject';
import { DomainValidationError } from './DomainError';

interface PhoneNumberProps {
  value: string;
  formatted: string;
}

export class PhoneNumber extends ValueObject<PhoneNumberProps> {
  private constructor(props: PhoneNumberProps) {
    super(props);
  }

  static create(phone: string): PhoneNumber {
    const cleaned = this.cleanPhoneNumber(phone);
    
    if (!this.isValid(cleaned)) {
      throw new DomainValidationError('phone', 'Invalid phone number format');
    }
    
    return new PhoneNumber({
      value: cleaned,
      formatted: this.formatPhoneNumber(cleaned)
    });
  }

  private static cleanPhoneNumber(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      return '';
    }
    
    // Remove all non-digit characters
    return phone.replace(/\D/g, '');
  }

  private static isValid(phone: string): boolean {
    if (!phone) return false;
    
    // US phone numbers (10 digits) or international (7-15 digits)
    const usPhoneRegex = /^1?[2-9]\d{2}[2-9]\d{2}\d{4}$/;
    const internationalPhoneRegex = /^\d{7,15}$/;
    
    return usPhoneRegex.test(phone) || internationalPhoneRegex.test(phone);
  }

  private static formatPhoneNumber(phone: string): string {
    // US number formatting
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`;
    }
    
    // US number with country code
    if (phone.length === 11 && phone.startsWith('1')) {
      const number = phone.slice(1);
      return `+1 (${number.slice(0, 3)}) ${number.slice(3, 6)}-${number.slice(6)}`;
    }
    
    // International number
    return `+${phone}`;
  }

  get value(): string {
    return this.props.value;
  }

  get formatted(): string {
    return this.props.formatted;
  }

  toString(): string {
    return this.props.formatted;
  }

  isUSNumber(): boolean {
    return this.props.value.length === 10 || 
           (this.props.value.length === 11 && this.props.value.startsWith('1'));
  }
}