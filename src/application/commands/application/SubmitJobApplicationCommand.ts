/**
 * Submit Job Application Command - CQRS Implementation
 * Command for submitting new job applications
 */

import { BaseCommand, CommandResult } from '../../cqrs/Command';

export class SubmitJobApplicationCommand extends BaseCommand {
  constructor(
    public readonly applicantName: string,
    public readonly email: string,
    public readonly phone: string,
    public readonly experienceLevel: string,
    public readonly experienceDescription: string,
    public readonly resumeFile?: {
      buffer: Buffer;
      filename: string;
      contentType: string;
    },
    public readonly requestMetadata?: {
      ipAddress?: string;
      userAgent?: string;
      source?: string;
      referralSource?: string;
    },
    correlationId?: string,
    userId?: string
  ) {
    super(correlationId, userId, requestMetadata);
  }
}

export interface SubmitJobApplicationResult {
  applicationId: string;
  confirmationNumber: string;
  estimatedResponseTime: string;
  nextSteps: string[];
}

export type SubmitJobApplicationCommandResult = CommandResult<SubmitJobApplicationResult>;