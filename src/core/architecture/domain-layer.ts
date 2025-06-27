/**
 * Domain Layer Architecture - Pure Business Logic
 * ENTERPRISE PATTERN: Domain-Driven Design with Clean Architecture
 * 
 * This layer contains:
 * - Business entities and value objects
 * - Domain services and business rules
 * - Interfaces for infrastructure dependencies
 * - No external dependencies (framework-agnostic)
 */

// ================== DOMAIN ENTITIES ==================

export abstract class Entity<T> {
  protected readonly id: T;
  
  constructor(id: T) {
    this.id = id;
  }
  
  getId(): T {
    return this.id;
  }
  
  equals(entity: Entity<T>): boolean {
    return this.id === entity.id;
  }
}

export abstract class ValueObject<T> {
  protected readonly props: T;
  
  constructor(props: T) {
    this.props = Object.freeze(props);
  }
  
  equals(vo: ValueObject<T>): boolean {
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}

// ================== BUSINESS ENTITIES ==================

export interface ApplicationSubmissionProps {
  name: string;
  email: string;
  phone: string;
  experience: string;
  resumeFileId?: string;
  submittedAt: Date;
  status: ApplicationStatus;
  ipAddress?: string;
  userAgent?: string;
}

export enum ApplicationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ARCHIVED = 'archived'
}

export class ApplicationSubmission extends Entity<string> {
  private constructor(
    id: string,
    private readonly props: ApplicationSubmissionProps
  ) {
    super(id);
  }
  
  static create(
    props: Omit<ApplicationSubmissionProps, 'submittedAt' | 'status'>,
    id?: string
  ): ApplicationSubmission {
    return new ApplicationSubmission(
      id || this.generateId(),
      {
        ...props,
        submittedAt: new Date(),
        status: ApplicationStatus.PENDING
      }
    );
  }
  
  static reconstitute(id: string, props: ApplicationSubmissionProps): ApplicationSubmission {
    return new ApplicationSubmission(id, props);
  }
  
  // Business Methods
  approve(): void {
    if (this.props.status !== ApplicationStatus.PENDING) {
      throw new DomainError('Can only approve pending applications');
    }
    this.props.status = ApplicationStatus.APPROVED;
  }
  
  reject(_reason?: string): void {
    if (this.props.status !== ApplicationStatus.PENDING) {
      throw new DomainError('Can only reject pending applications');
    }
    this.props.status = ApplicationStatus.REJECTED;
  }
  
  // Getters
  get name(): string { return this.props.name; }
  get email(): string { return this.props.email; }
  get phone(): string { return this.props.phone; }
  get experience(): string { return this.props.experience; }
  get status(): ApplicationStatus { return this.props.status; }
  get submittedAt(): Date { return this.props.submittedAt; }
  get resumeFileId(): string | undefined { return this.props.resumeFileId; }
  
  private static generateId(): string {
    return `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  toSnapshot(): ApplicationSubmissionProps & { id: string } {
    return {
      id: this.getId(),
      ...this.props
    };
  }
}

// ================== VALUE OBJECTS ==================

export interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  constructor(email: string) {
    if (!Email.isValid(email)) {
      throw new DomainError(`Invalid email format: ${email}`);
    }
    super({ value: email.toLowerCase().trim() });
  }
  
  static isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }
  
  get value(): string {
    return this.props.value;
  }
  
  getDomain(): string {
    return this.props.value.split('@')[1];
  }
}

export interface PhoneNumberProps {
  value: string;
  countryCode?: string;
}

export class PhoneNumber extends ValueObject<PhoneNumberProps> {
  constructor(phoneNumber: string, countryCode = '+1') {
    const normalized = PhoneNumber.normalize(phoneNumber);
    if (!PhoneNumber.isValid(normalized)) {
      throw new DomainError(`Invalid phone number format: ${phoneNumber}`);
    }
    super({ value: normalized, countryCode });
  }
  
  static normalize(phone: string): string {
    return phone.replace(/\D/g, '');
  }
  
  static isValid(normalizedPhone: string): boolean {
    return /^\d{10,15}$/.test(normalizedPhone);
  }
  
  get value(): string {
    return this.props.value;
  }
  
  getFormatted(): string {
    const { value } = this.props;
    if (value.length === 10) {
      return `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
    }
    return value;
  }
}

// ================== DOMAIN SERVICES ==================

export interface ApplicationValidationRules {
  validateExperienceLevel(experience: string): boolean;
  validateResumeRequirement(hasResume: boolean): boolean;
  checkDuplicateApplication(email: Email): Promise<boolean>;
}

export class ApplicationDomainService {
  constructor(
    private readonly validationRules: ApplicationValidationRules,
    private readonly eventPublisher: DomainEventPublisher
  ) {}
  
  async validateNewApplication(
    applicationData: Omit<ApplicationSubmissionProps, 'submittedAt' | 'status'>
  ): Promise<ApplicationValidationResult> {
    const errors: string[] = [];
    
    // Validate email format
    try {
      new Email(applicationData.email);
    } catch {
      errors.push('Invalid email format');
    }
    
    // Validate phone format
    try {
      new PhoneNumber(applicationData.phone);
    } catch {
      errors.push('Invalid phone number format');
    }
    
    // Business rule validations
    if (!this.validationRules.validateExperienceLevel(applicationData.experience)) {
      errors.push('Experience level does not meet requirements');
    }
    
    if (!this.validationRules.validateResumeRequirement(!!applicationData.resumeFileId)) {
      errors.push('Resume is required for this application');
    }
    
    // Check for duplicate applications
    const email = new Email(applicationData.email);
    const isDuplicate = await this.validationRules.checkDuplicateApplication(email);
    if (isDuplicate) {
      errors.push('An application with this email already exists');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  async submitApplication(
    applicationData: Omit<ApplicationSubmissionProps, 'submittedAt' | 'status'>
  ): Promise<ApplicationSubmission> {
    const validation = await this.validateNewApplication(applicationData);
    
    if (!validation.isValid) {
      throw new DomainError(`Application validation failed: ${validation.errors.join(', ')}`);
    }
    
    const application = ApplicationSubmission.create(applicationData);
    
    // Publish domain event
    await this.eventPublisher.publish(
      new ApplicationSubmittedEvent(application.getId(), application.toSnapshot())
    );
    
    return application;
  }
}

// ================== DOMAIN EVENTS ==================

export abstract class DomainEvent {
  public readonly occurredOn: Date;
  public readonly eventId: string;
  
  constructor(
    public readonly aggregateId: string,
    public readonly eventType: string
  ) {
    this.occurredOn = new Date();
    this.eventId = `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export class ApplicationSubmittedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly applicationData: ApplicationSubmissionProps & { id: string }
  ) {
    super(aggregateId, 'APPLICATION_SUBMITTED');
  }
}

export class ApplicationApprovedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly approvedBy: string,
    public readonly approvedAt: Date
  ) {
    super(aggregateId, 'APPLICATION_APPROVED');
  }
}

// ================== DOMAIN INTERFACES ==================

export interface DomainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

export interface ApplicationRepository {
  save(application: ApplicationSubmission): Promise<void>;
  findById(id: string): Promise<ApplicationSubmission | null>;
  findByEmail(email: Email): Promise<ApplicationSubmission | null>;
  findByStatus(status: ApplicationStatus): Promise<ApplicationSubmission[]>;
  exists(email: Email): Promise<boolean>;
}

// ================== DOMAIN ERRORS ==================

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export interface ApplicationValidationResult {
  isValid: boolean;
  errors: string[];
}