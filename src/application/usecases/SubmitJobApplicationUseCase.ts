/**
 * Submit Job Application Use Case - Application Layer
 * Clean Architecture: Orchestrates domain logic and infrastructure
 */

import { JobApplication } from '../../domain/application/JobApplication';
import { JobApplicationRepository } from '../../domain/application/JobApplicationRepository';
import { NotificationService } from '../../domain/services/NotificationService';
import { FileStorageService } from '../../domain/services/FileStorageService';
import { DomainEventPublisher } from '../../domain/shared/DomainEventPublisher';
import { Email } from '../../domain/shared/Email';

export interface SubmitJobApplicationCommand {
  applicantName: string;
  email: string;
  phone: string;
  experienceLevel: string;
  experienceDescription: string;
  resumeFile?: {
    buffer: Buffer;
    filename: string;
    contentType: string;
  };
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    source?: string;
    referralSource?: string;
  };
}

export interface SubmitJobApplicationResult {
  applicationId: string;
  success: boolean;
  message: string;
}

export class SubmitJobApplicationUseCase {
  constructor(
    private readonly applicationRepository: JobApplicationRepository,
    private readonly notificationService: NotificationService,
    private readonly fileStorageService: FileStorageService,
    private readonly eventPublisher: DomainEventPublisher
  ) {}

  async execute(command: SubmitJobApplicationCommand): Promise<SubmitJobApplicationResult> {
    try {
      // Upload resume if provided
      let resumeFileId: string | undefined;
      if (command.resumeFile) {
        const uploadedResume = await this.fileStorageService.uploadFile(
          command.resumeFile.buffer,
          command.resumeFile.filename,
          command.resumeFile.contentType,
          {
            purpose: 'resume',
            applicantEmail: command.email
          }
        );
        resumeFileId = uploadedResume.id;
      }

      // Create job application domain entity
      const application = JobApplication.create({
        applicantName: command.applicantName,
        email: command.email,
        phone: command.phone,
        experienceLevel: command.experienceLevel,
        experienceDescription: command.experienceDescription,
        resumeFileId,
        metadata: command.metadata
      });

      // Save application
      await this.applicationRepository.save(application);

      // Publish domain events
      const events = application.getUncommittedEvents();
      await this.eventPublisher.publishAll(events);
      application.markEventsAsCommitted();

      // Send confirmation notifications
      await this.sendNotifications(application);

      return {
        applicationId: application.id.toString(),
        success: true,
        message: 'Job application submitted successfully'
      };

    } catch (error) {
      throw new SubmitJobApplicationError(
        'Failed to submit job application',
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  private async sendNotifications(application: JobApplication): Promise<void> {
    try {
      // Send confirmation email to applicant
      await this.notificationService.sendApplicationConfirmationEmail(
        application.email,
        application.id.toString()
      );

      // Send notification email to admin
      const adminEmail = Email.create('hr@vsrconstruction.com');
      await this.notificationService.sendApplicationNotificationEmail(
        adminEmail,
        application.id.toString()
      );
    } catch (error) {
      // Log notification errors but don't fail the use case
      console.error('Failed to send application notifications:', error);
    }
  }
}

export class SubmitJobApplicationError extends Error {
  constructor(message: string, public readonly cause: Error) {
    super(message);
    this.name = 'SubmitJobApplicationError';
  }
}