/**
 * Submit Quote Request Command - CQRS Implementation
 * Command for submitting new quote requests
 */

import { BaseCommand, CommandResult } from '../../cqrs/Command';

export class SubmitQuoteRequestCommand extends BaseCommand {
  constructor(
    public readonly customerName: string,
    public readonly email: string,
    public readonly phone: string,
    public readonly serviceType: string,
    public readonly description: string,
    public readonly photoFiles?: Array<{
      buffer: Buffer;
      filename: string;
      contentType: string;
    }>,
    public readonly requestMetadata?: {
      ipAddress?: string;
      userAgent?: string;
      source?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
    },
    correlationId?: string,
    userId?: string
  ) {
    super(correlationId, userId, requestMetadata);
  }
}

export interface SubmitQuoteRequestResult {
  quoteId: string;
  estimatedResponseTime: string;
  confirmationNumber: string;
}

export type SubmitQuoteRequestCommandResult = CommandResult<SubmitQuoteRequestResult>;