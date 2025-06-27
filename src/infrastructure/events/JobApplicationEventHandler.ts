/**
 * Job Application Event Handler - Infrastructure Layer
 * Clean Architecture: Handles domain events for job applications
 */

import { 
  JobApplicationSubmittedEvent,
  JobApplicationMovedToReviewEvent,
  InterviewScheduledEvent,
  JobApplicationApprovedEvent,
  JobApplicationRejectedEvent,
  JobApplicationWithdrawnEvent
} from '../../domain/application/JobApplication';
import { NotificationService } from '../../domain/services/NotificationService';
import { DomainEventPublisher, BaseDomainEventHandler } from '../../domain/shared/DomainEventPublisher';

export class JobApplicationSubmittedEventHandler extends BaseDomainEventHandler<JobApplicationSubmittedEvent> {
  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async handle(event: JobApplicationSubmittedEvent): Promise<void> {
    this.logEvent(event);

    // Business logic: Log application submission for HR analytics
    console.log('👥 HR Analytics:', {
      applicationId: event.application.id.toString(),
      applicantEmail: event.application.email.value,
      experienceLevel: event.application.experienceLevel,
      hasResume: event.application.hasResume(),
      submittedAt: event.application.submittedAt,
      source: event.application.metadata.source
    });

    // Additional integrations could be added here:
    // - HR systems (ATS)
    // - Background check services
    // - Skills assessment platforms
  }
}

export class InterviewScheduledEventHandler extends BaseDomainEventHandler<InterviewScheduledEvent> {
  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async handle(event: InterviewScheduledEvent): Promise<void> {
    this.logEvent(event);

    // Send interview notification to applicant
    await this.notificationService.sendInterviewScheduledEmail(
      event.application.email,
      event.interviewDate
    );

    console.log('📅 Interview Scheduled:', {
      applicationId: event.application.id.toString(),
      applicantEmail: event.application.email.value,
      interviewDate: event.interviewDate,
      applicantName: event.application.applicantName
    });

    // Could integrate with:
    // - Calendar systems
    // - Video conferencing platforms
    // - Interview scheduling tools
  }
}

export class JobApplicationApprovedEventHandler extends BaseDomainEventHandler<JobApplicationApprovedEvent> {
  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async handle(event: JobApplicationApprovedEvent): Promise<void> {
    this.logEvent(event);

    console.log('✅ Application Approved:', {
      applicationId: event.application.id.toString(),
      applicantEmail: event.application.email.value,
      applicantName: event.application.applicantName,
      experienceLevel: event.application.experienceLevel
    });

    // Could trigger:
    // - Onboarding process
    // - Contract generation
    // - Equipment assignment
    // - Training enrollment
  }
}

export class JobApplicationEventHandler {
  constructor(private readonly notificationService: NotificationService) {}

  subscribeToEvents(eventPublisher: DomainEventPublisher): void {
    // Subscribe to all job application events
    eventPublisher.subscribe(
      JobApplicationSubmittedEvent,
      new JobApplicationSubmittedEventHandler(this.notificationService)
    );

    eventPublisher.subscribe(
      JobApplicationMovedToReviewEvent,
      new (class extends BaseDomainEventHandler<JobApplicationMovedToReviewEvent> {
        async handle(event: JobApplicationMovedToReviewEvent): Promise<void> {
          this.logEvent(event);
          console.log('🔍 Application moved to review:', {
            applicationId: event.application.id.toString(),
            applicantName: event.application.applicantName
          });
        }
      })
    );

    eventPublisher.subscribe(
      InterviewScheduledEvent,
      new InterviewScheduledEventHandler(this.notificationService)
    );

    eventPublisher.subscribe(
      JobApplicationApprovedEvent,
      new JobApplicationApprovedEventHandler(this.notificationService)
    );

    eventPublisher.subscribe(
      JobApplicationRejectedEvent,
      new (class extends BaseDomainEventHandler<JobApplicationRejectedEvent> {
        async handle(event: JobApplicationRejectedEvent): Promise<void> {
          this.logEvent(event);
          console.log('❌ Application rejected:', {
            applicationId: event.application.id.toString(),
            applicantEmail: event.application.email.value,
            reason: event.reason
          });
        }
      })
    );

    eventPublisher.subscribe(
      JobApplicationWithdrawnEvent,
      new (class extends BaseDomainEventHandler<JobApplicationWithdrawnEvent> {
        async handle(event: JobApplicationWithdrawnEvent): Promise<void> {
          this.logEvent(event);
          console.log('🚪 Application withdrawn:', {
            applicationId: event.application.id.toString(),
            applicantEmail: event.application.email.value
          });
        }
      })
    );
  }
}