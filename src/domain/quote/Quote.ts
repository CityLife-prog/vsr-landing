/**
 * Quote Aggregate Root - Business Logic for Quote Requests
 * Core domain entity representing a service quote request
 */

import { AggregateRoot } from '../shared/AggregateRoot';
import { UniqueEntityId } from '../shared/UniqueEntityId';
import { DomainEventBase } from '../shared/Entity';
import { BusinessRuleViolationError, DomainValidationError } from '../shared/DomainError';
import { Email } from '../shared/Email';
import { PhoneNumber } from '../shared/PhoneNumber';
import { ServiceType } from '../shared/ServiceType';

export enum QuoteStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  QUOTE_SENT = 'quote_sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum QuotePriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

interface QuoteProps {
  customerName: string;
  email: Email;
  phone: PhoneNumber;
  serviceType: ServiceType;
  description: string;
  status: QuoteStatus;
  priority: QuotePriority;
  photoAttachments: string[];
  submittedAt: Date;
  updatedAt: Date;
  estimatedValue?: number;
  quoteSentAt?: Date;
  expiresAt?: Date;
  metadata: QuoteMetadata;
}

interface QuoteMetadata {
  ipAddress?: string;
  userAgent?: string;
  source: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export class Quote extends AggregateRoot<UniqueEntityId> {
  private constructor(id: UniqueEntityId, private props: QuoteProps) {
    super(id);
  }

  static create(props: {
    customerName: string;
    email: string;
    phone: string;
    serviceType: string;
    description: string;
    photoAttachments?: string[];
    metadata?: Partial<QuoteMetadata>;
  }): Quote {
    // Domain validation
    this.validateCustomerName(props.customerName);
    this.validateDescription(props.description);

    const email = Email.create(props.email);
    const phone = PhoneNumber.create(props.phone);
    const serviceType = ServiceType.create(props.serviceType);
    
    const id = UniqueEntityId.create();
    const now = new Date();

    const quote = new Quote(id, {
      customerName: props.customerName.trim(),
      email,
      phone,
      serviceType,
      description: props.description.trim(),
      status: QuoteStatus.PENDING,
      priority: QuotePriority.MEDIUM,
      photoAttachments: props.photoAttachments || [],
      submittedAt: now,
      updatedAt: now,
      metadata: {
        source: 'website',
        ...props.metadata
      }
    });

    quote.addDomainEvent(new QuoteSubmittedEvent(quote));
    return quote;
  }

  static reconstitute(id: UniqueEntityId, props: QuoteProps): Quote {
    return new Quote(id, props);
  }

  private static validateCustomerName(name: string): void {
    if (!name || name.trim().length < 2) {
      throw new DomainValidationError('customerName', 'Must be at least 2 characters');
    }
    if (name.trim().length > 100) {
      throw new DomainValidationError('customerName', 'Must not exceed 100 characters');
    }
  }

  private static validateDescription(description: string): void {
    if (!description || description.trim().length < 10) {
      throw new DomainValidationError('description', 'Must be at least 10 characters');
    }
    if (description.trim().length > 2000) {
      throw new DomainValidationError('description', 'Must not exceed 2000 characters');
    }
  }

  // Business Methods
  moveToReview(): void {
    if (this.props.status !== QuoteStatus.PENDING) {
      throw new BusinessRuleViolationError('Quote must be pending to move to review');
    }
    
    this.props.status = QuoteStatus.UNDER_REVIEW;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new QuoteMovedToReviewEvent(this));
  }

  sendQuote(estimatedValue: number): void {
    if (this.props.status !== QuoteStatus.UNDER_REVIEW) {
      throw new BusinessRuleViolationError('Quote must be under review to send quote');
    }
    
    if (estimatedValue <= 0) {
      throw new DomainValidationError('estimatedValue', 'Must be greater than 0');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    this.props.status = QuoteStatus.QUOTE_SENT;
    this.props.estimatedValue = estimatedValue;
    this.props.quoteSentAt = now;
    this.props.expiresAt = expiresAt;
    this.props.updatedAt = now;
    
    this.addDomainEvent(new QuoteSentEvent(this, estimatedValue));
  }

  accept(): void {
    if (this.props.status !== QuoteStatus.QUOTE_SENT) {
      throw new BusinessRuleViolationError('Quote must be sent to be accepted');
    }
    
    if (this.isExpired()) {
      throw new BusinessRuleViolationError('Cannot accept expired quote');
    }

    this.props.status = QuoteStatus.ACCEPTED;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new QuoteAcceptedEvent(this));
  }

  reject(): void {
    if (![QuoteStatus.PENDING, QuoteStatus.UNDER_REVIEW, QuoteStatus.QUOTE_SENT].includes(this.props.status)) {
      throw new BusinessRuleViolationError('Cannot reject quote in current status');
    }

    this.props.status = QuoteStatus.REJECTED;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new QuoteRejectedEvent(this));
  }

  setPriority(priority: QuotePriority): void {
    this.props.priority = priority;
    this.props.updatedAt = new Date();
  }

  addPhotoAttachment(photoId: string): void {
    if (this.props.photoAttachments.length >= 10) {
      throw new BusinessRuleViolationError('Maximum 10 photo attachments allowed');
    }
    
    this.props.photoAttachments.push(photoId);
    this.props.updatedAt = new Date();
  }

  isExpired(): boolean {
    return this.props.expiresAt ? new Date() > this.props.expiresAt : false;
  }

  // Getters
  get customerName(): string { return this.props.customerName; }
  get email(): Email { return this.props.email; }
  get phone(): PhoneNumber { return this.props.phone; }
  get serviceType(): ServiceType { return this.props.serviceType; }
  get description(): string { return this.props.description; }
  get status(): QuoteStatus { return this.props.status; }
  get priority(): QuotePriority { return this.props.priority; }
  get photoAttachments(): ReadonlyArray<string> { return this.props.photoAttachments; }
  get submittedAt(): Date { return this.props.submittedAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get estimatedValue(): number | undefined { return this.props.estimatedValue; }
  get quoteSentAt(): Date | undefined { return this.props.quoteSentAt; }
  get expiresAt(): Date | undefined { return this.props.expiresAt; }
  get metadata(): QuoteMetadata { return this.props.metadata; }
}

// Domain Events
export class QuoteSubmittedEvent extends DomainEventBase {
  constructor(public readonly quote: Quote) {
    super();
  }
}

export class QuoteMovedToReviewEvent extends DomainEventBase {
  constructor(public readonly quote: Quote) {
    super();
  }
}

export class QuoteSentEvent extends DomainEventBase {
  constructor(
    public readonly quote: Quote,
    public readonly estimatedValue: number
  ) {
    super();
  }
}

export class QuoteAcceptedEvent extends DomainEventBase {
  constructor(public readonly quote: Quote) {
    super();
  }
}

export class QuoteRejectedEvent extends DomainEventBase {
  constructor(public readonly quote: Quote) {
    super();
  }
}