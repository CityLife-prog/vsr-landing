/**
 * Domain Errors - Business Rule Violations
 * Clean architecture principle: domain errors should be explicit
 */

export abstract class DomainError extends Error {
  abstract readonly errorCode: string;
  
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BusinessRuleViolationError extends DomainError {
  readonly errorCode = 'BUSINESS_RULE_VIOLATION';
  
  constructor(rule: string, details?: string) {
    super(`Business rule violation: ${rule}${details ? ` - ${details}` : ''}`);
  }
}

export class DomainValidationError extends DomainError {
  readonly errorCode = 'DOMAIN_VALIDATION_ERROR';
  readonly field: string;
  
  constructor(field: string, message: string) {
    super(`Validation failed for ${field}: ${message}`);
    this.field = field;
  }
}

export class InvariantViolationError extends DomainError {
  readonly errorCode = 'INVARIANT_VIOLATION';
  
  constructor(invariant: string) {
    super(`Domain invariant violated: ${invariant}`);
  }
}