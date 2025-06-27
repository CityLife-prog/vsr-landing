/**
 * Job Application Aggregate Root - Business Logic for Job Applications
 * Core domain entity representing employment applications
 */

import { AggregateRoot } from '../shared/AggregateRoot';
import { UniqueEntityId } from '../shared/UniqueEntityId';
import { DomainEventBase } from '../shared/Entity';
import { BusinessRuleViolationError, DomainValidationError } from '../shared/DomainError';
import { Email } from '../shared/Email';
import { PhoneNumber } from '../shared/PhoneNumber';

export enum ApplicationStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  INTERVIEW_SCHEDULED = 'interview_scheduled',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  WITHDRAWN = 'withdrawn'
}

export enum ExperienceLevel {
  ENTRY_LEVEL = 'entry_level',
  INTERMEDIATE = 'intermediate',
  EXPERIENCED = 'experienced',
  EXPERT = 'expert'
}

interface JobApplicationProps {
  applicantName: string;
  email: Email;
  phone: PhoneNumber;
  experienceLevel: ExperienceLevel;
  experienceDescription: string;
  status: ApplicationStatus;
  resumeFileId?: string;
  submittedAt: Date;
  updatedAt: Date;
  reviewNotes?: string;
  interviewDate?: Date;
  metadata: ApplicationMetadata;
}

interface ApplicationMetadata {
  ipAddress?: string;
  userAgent?: string;
  source: string;
  referralSource?: string;
}

export class JobApplication extends AggregateRoot<UniqueEntityId> {
  private constructor(id: UniqueEntityId, private props: JobApplicationProps) {
    super(id);
  }

  static create(props: {
    applicantName: string;
    email: string;
    phone: string;
    experienceLevel: string;
    experienceDescription: string;
    resumeFileId?: string;
    metadata?: Partial<ApplicationMetadata>;
  }): JobApplication {
    // Domain validation
    this.validateApplicantName(props.applicantName);
    this.validateExperienceDescription(props.experienceDescription);
    
    const email = Email.create(props.email);
    const phone = PhoneNumber.create(props.phone);
    const experienceLevel = this.parseExperienceLevel(props.experienceLevel);
    
    const id = UniqueEntityId.create();
    const now = new Date();

    const application = new JobApplication(id, {
      applicantName: props.applicantName.trim(),
      email,
      phone,
      experienceLevel,
      experienceDescription: props.experienceDescription.trim(),
      status: ApplicationStatus.PENDING,
      resumeFileId: props.resumeFileId,
      submittedAt: now,
      updatedAt: now,
      metadata: {
        source: 'website',
        ...props.metadata
      }
    });

    application.addDomainEvent(new JobApplicationSubmittedEvent(application));
    return application;
  }

  static reconstitute(id: UniqueEntityId, props: JobApplicationProps): JobApplication {
    return new JobApplication(id, props);
  }

  private static validateApplicantName(name: string): void {
    if (!name || name.trim().length < 2) {
      throw new DomainValidationError('applicantName', 'Must be at least 2 characters');
    }
    if (name.trim().length > 100) {
      throw new DomainValidationError('applicantName', 'Must not exceed 100 characters');
    }
  }

  private static validateExperienceDescription(description: string): void {
    if (!description || description.trim().length < 20) {
      throw new DomainValidationError('experienceDescription', 'Must be at least 20 characters');
    }
    if (description.trim().length > 1000) {
      throw new DomainValidationError('experienceDescription', 'Must not exceed 1000 characters');
    }
  }

  private static parseExperienceLevel(level: string): ExperienceLevel {
    const validLevels = Object.values(ExperienceLevel);
    const experienceLevel = level as ExperienceLevel;
    
    if (!validLevels.includes(experienceLevel)) {
      throw new DomainValidationError(
        'experienceLevel',
        `Invalid experience level: ${level}. Valid levels: ${validLevels.join(', ')}`
      );
    }
    
    return experienceLevel;
  }

  // Business Methods
  moveToReview(): void {
    if (this.props.status !== ApplicationStatus.PENDING) {
      throw new BusinessRuleViolationError('Application must be pending to move to review');
    }
    
    this.props.status = ApplicationStatus.UNDER_REVIEW;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new JobApplicationMovedToReviewEvent(this));
  }

  scheduleInterview(interviewDate: Date): void {
    if (this.props.status !== ApplicationStatus.UNDER_REVIEW) {
      throw new BusinessRuleViolationError('Application must be under review to schedule interview');
    }
    
    if (interviewDate <= new Date()) {
      throw new DomainValidationError('interviewDate', 'Interview date must be in the future');
    }

    this.props.status = ApplicationStatus.INTERVIEW_SCHEDULED;
    this.props.interviewDate = interviewDate;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new InterviewScheduledEvent(this, interviewDate));
  }

  approve(): void {
    if (![ApplicationStatus.UNDER_REVIEW, ApplicationStatus.INTERVIEW_SCHEDULED].includes(this.props.status)) {
      throw new BusinessRuleViolationError('Application must be under review or interviewed to be approved');
    }

    this.props.status = ApplicationStatus.APPROVED;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new JobApplicationApprovedEvent(this));
  }

  reject(reason?: string): void {
    if (![ApplicationStatus.PENDING, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.INTERVIEW_SCHEDULED].includes(this.props.status)) {
      throw new BusinessRuleViolationError('Cannot reject application in current status');
    }

    this.props.status = ApplicationStatus.REJECTED;
    this.props.reviewNotes = reason;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new JobApplicationRejectedEvent(this, reason));
  }

  withdraw(): void {
    if ([ApplicationStatus.APPROVED, ApplicationStatus.REJECTED].includes(this.props.status)) {
      throw new BusinessRuleViolationError('Cannot withdraw finalized application');
    }

    this.props.status = ApplicationStatus.WITHDRAWN;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new JobApplicationWithdrawnEvent(this));
  }

  addReviewNotes(notes: string): void {
    this.props.reviewNotes = notes;
    this.props.updatedAt = new Date();
  }

  attachResume(resumeFileId: string): void {
    if (this.props.status !== ApplicationStatus.PENDING) {
      throw new BusinessRuleViolationError('Can only attach resume to pending applications');
    }
    
    this.props.resumeFileId = resumeFileId;
    this.props.updatedAt = new Date();
  }

  // Getters
  get applicantName(): string { return this.props.applicantName; }
  get email(): Email { return this.props.email; }
  get phone(): PhoneNumber { return this.props.phone; }
  get experienceLevel(): ExperienceLevel { return this.props.experienceLevel; }
  get experienceDescription(): string { return this.props.experienceDescription; }
  get status(): ApplicationStatus { return this.props.status; }
  get resumeFileId(): string | undefined { return this.props.resumeFileId; }
  get submittedAt(): Date { return this.props.submittedAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get reviewNotes(): string | undefined { return this.props.reviewNotes; }
  get interviewDate(): Date | undefined { return this.props.interviewDate; }
  get metadata(): ApplicationMetadata { return this.props.metadata; }

  // Business Rules
  hasResume(): boolean {
    return !!this.props.resumeFileId;
  }

  canScheduleInterview(): boolean {
    return this.props.status === ApplicationStatus.UNDER_REVIEW;
  }

  isFinalized(): boolean {
    return [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED, ApplicationStatus.WITHDRAWN].includes(this.props.status);
  }
}

// Domain Events
export class JobApplicationSubmittedEvent extends DomainEventBase {
  constructor(public readonly application: JobApplication) {
    super();
  }
}

export class JobApplicationMovedToReviewEvent extends DomainEventBase {
  constructor(public readonly application: JobApplication) {
    super();
  }
}

export class InterviewScheduledEvent extends DomainEventBase {
  constructor(
    public readonly application: JobApplication,
    public readonly interviewDate: Date
  ) {
    super();
  }
}

export class JobApplicationApprovedEvent extends DomainEventBase {
  constructor(public readonly application: JobApplication) {
    super();
  }
}

export class JobApplicationRejectedEvent extends DomainEventBase {
  constructor(
    public readonly application: JobApplication,
    public readonly reason?: string
  ) {
    super();
  }
}

export class JobApplicationWithdrawnEvent extends DomainEventBase {
  constructor(public readonly application: JobApplication) {
    super();
  }
}