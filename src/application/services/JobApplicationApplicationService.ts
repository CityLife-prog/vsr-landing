/**
 * Job Application Application Service - CQRS Application Layer
 * High-level service that orchestrates commands and queries for job application operations
 */

import { CommandDispatcher } from '../cqrs/Command';
import { QueryDispatcher } from '../cqrs/Query';

// Commands
import { 
  SubmitJobApplicationCommand, 
  SubmitJobApplicationCommandResult 
} from '../commands/application/SubmitJobApplicationCommand';

export interface SubmitJobApplicationRequest {
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
  correlationId?: string;
  userId?: string;
}

export class JobApplicationApplicationService {
  constructor(
    private readonly commandDispatcher: CommandDispatcher,
    private readonly queryDispatcher: QueryDispatcher
  ) {}

  // Command Operations
  async submitJobApplication(request: SubmitJobApplicationRequest): Promise<SubmitJobApplicationCommandResult> {
    const command = new SubmitJobApplicationCommand(
      request.applicantName,
      request.email,
      request.phone,
      request.experienceLevel,
      request.experienceDescription,
      request.resumeFile,
      request.metadata,
      request.correlationId,
      request.userId
    );

    return await this.commandDispatcher.dispatch(command);
  }

  // Future query operations can be added here
  // async getApplicationList(request: ApplicationListRequest): Promise<...>
  // async getApplicationDetails(applicationId: string): Promise<...>
  // async getApplicationsByStatus(status: string): Promise<...>
}