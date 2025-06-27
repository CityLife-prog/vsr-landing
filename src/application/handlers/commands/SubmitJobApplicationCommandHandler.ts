/**
 * Submit Job Application Command Handler - CQRS Implementation
 * Handles job application submission commands with proper validation and business rules
 */

import { CommandHandler, BaseCommandResult, ValidationError } from '../../cqrs/Command';
import { 
  SubmitJobApplicationCommand, 
  SubmitJobApplicationResult,
  SubmitJobApplicationCommandResult 
} from '../../commands/application/SubmitJobApplicationCommand';

// Domain imports
import { JobApplication } from '../../../domain/application/JobApplication';
import { JobApplicationRepository } from '../../../domain/application/JobApplicationRepository';
import { NotificationService } from '../../../domain/services/NotificationService';
import { FileStorageService } from '../../../domain/services/FileStorageService';
import { DomainEventPublisher } from '../../../domain/shared/DomainEventPublisher';
import { DomainValidationError, BusinessRuleViolationError } from '../../../domain/shared/DomainError';

export class SubmitJobApplicationCommandHandler 
  implements CommandHandler<SubmitJobApplicationCommand, SubmitJobApplicationCommandResult> {

  constructor(
    private readonly applicationRepository: JobApplicationRepository,
    private readonly notificationService: NotificationService,
    private readonly fileStorageService: FileStorageService,
    private readonly eventPublisher: DomainEventPublisher
  ) {}

  async handle(command: SubmitJobApplicationCommand): Promise<SubmitJobApplicationCommandResult> {
    try {
      // 1. Validate command
      const validationResult = await this.validateCommand(command);
      if (!validationResult.isValid) {
        return BaseCommandResult.failure(
          command.commandId,
          validationResult.errors,
          'Command validation failed'
        );
      }

      // 2. Upload resume if provided
      let resumeFileId: string | undefined;
      if (command.resumeFile) {
        const uploadedFile = await this.fileStorageService.uploadFile(
          command.resumeFile.buffer,
          command.resumeFile.filename,
          command.resumeFile.contentType,
          {
            purpose: 'resume',
            applicantEmail: command.email,
            commandId: command.commandId
          }
        );
        resumeFileId = uploadedFile.id;
      }

      // 3. Create job application domain entity
      const application = JobApplication.create({
        applicantName: command.applicantName,
        email: command.email,
        phone: command.phone,
        experienceLevel: command.experienceLevel,
        experienceDescription: command.experienceDescription,
        resumeFileId,
        metadata: {
          ipAddress: command.requestMetadata?.ipAddress,
          userAgent: command.requestMetadata?.userAgent,
          source: command.requestMetadata?.source || 'web',
          referralSource: command.requestMetadata?.referralSource
        }
      });

      // 4. Save application
      await this.applicationRepository.save(application);

      // 5. Publish domain events
      const events = application.getUncommittedEvents();
      await this.eventPublisher.publishAll(events);
      application.markEventsAsCommitted();

      // 6. Generate confirmation number
      const confirmationNumber = this.generateConfirmationNumber(application.id.toString());

      // 7. Prepare result
      const result: SubmitJobApplicationResult = {
        applicationId: application.id.toString(),
        confirmationNumber,
        estimatedResponseTime: '1-2 weeks',
        nextSteps: [
          'Application review by HR team',
          'Initial phone screening (if qualified)',
          'In-person or video interview',
          'Final decision notification'
        ]
      };

      return BaseCommandResult.success(
        command.commandId,
        result,
        'Job application submitted successfully'
      );

    } catch (error) {
      return this.handleError(command.commandId, error);
    }
  }

  private async validateCommand(command: SubmitJobApplicationCommand): Promise<{
    isValid: boolean;
    errors: ValidationError[];
  }> {
    const errors: ValidationError[] = [];

    // Required field validation
    if (!command.applicantName?.trim()) {
      errors.push({
        field: 'applicantName',
        message: 'Applicant name is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!command.email?.trim()) {
      errors.push({
        field: 'email',
        message: 'Email is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!command.phone?.trim()) {
      errors.push({
        field: 'phone',
        message: 'Phone number is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!command.experienceLevel?.trim()) {
      errors.push({
        field: 'experienceLevel',
        message: 'Experience level is required',
        code: 'REQUIRED_FIELD'
      });
    }

    if (!command.experienceDescription?.trim()) {
      errors.push({
        field: 'experienceDescription',
        message: 'Experience description is required',
        code: 'REQUIRED_FIELD'
      });
    }

    // Business rule validation
    if (command.experienceDescription && command.experienceDescription.length < 20) {
      errors.push({
        field: 'experienceDescription',
        message: 'Experience description must be at least 20 characters',
        code: 'MIN_LENGTH'
      });
    }

    if (command.experienceDescription && command.experienceDescription.length > 1000) {
      errors.push({
        field: 'experienceDescription',
        message: 'Experience description must not exceed 1000 characters',
        code: 'MAX_LENGTH'
      });
    }

    // Experience level validation
    const validExperienceLevels = ['entry_level', 'intermediate', 'experienced', 'expert'];
    if (command.experienceLevel && !validExperienceLevels.includes(command.experienceLevel)) {
      errors.push({
        field: 'experienceLevel',
        message: `Experience level must be one of: ${validExperienceLevels.join(', ')}`,
        code: 'INVALID_VALUE'
      });
    }

    // Resume file validation
    if (command.resumeFile) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(command.resumeFile.contentType)) {
        errors.push({
          field: 'resumeFile',
          message: 'Resume must be a PDF or Word document',
          code: 'INVALID_FILE_TYPE'
        });
      }

      const maxSizeMB = 10;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (command.resumeFile.buffer.length > maxSizeBytes) {
        errors.push({
          field: 'resumeFile',
          message: `Resume file size must not exceed ${maxSizeMB}MB`,
          code: 'FILE_TOO_LARGE'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private generateConfirmationNumber(applicationId: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const applicationIdShort = applicationId.substring(0, 8).toUpperCase();
    return `APP-${timestamp}-${applicationIdShort}`;
  }

  private handleError(commandId: string, error: unknown): SubmitJobApplicationCommandResult {
    console.error('SubmitJobApplicationCommandHandler error:', error);

    if (error instanceof DomainValidationError) {
      return BaseCommandResult.failure(
        commandId,
        [{
          field: error.field,
          message: error.message,
          code: 'DOMAIN_VALIDATION'
        }],
        'Domain validation failed'
      );
    }

    if (error instanceof BusinessRuleViolationError) {
      return BaseCommandResult.failure(
        commandId,
        [{
          field: 'business_rule',
          message: error.message,
          code: 'BUSINESS_RULE_VIOLATION'
        }],
        'Business rule violation'
      );
    }

    return BaseCommandResult.failure(
      commandId,
      [{
        field: 'system',
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR'
      }],
      'Internal system error'
    );
  }
}