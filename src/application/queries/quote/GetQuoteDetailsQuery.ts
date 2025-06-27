/**
 * Get Quote Details Query - CQRS Implementation
 * Query for retrieving detailed quote information
 */

import { BaseQuery } from '../../cqrs/Query';

export class GetQuoteDetailsQuery extends BaseQuery<GetQuoteDetailsResult> {
  constructor(
    public readonly quoteId: string,
    correlationId?: string,
    userId?: string
  ) {
    super(correlationId, userId);
  }
}

export interface GetQuoteDetailsResult {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  serviceType: {
    key: string;
    name: string;
    category: string;
    description: string;
  };
  description: string;
  status: string;
  priority: string;
  estimatedValue?: number;
  submittedAt: Date;
  updatedAt: Date;
  quoteSentAt?: Date;
  expiresAt?: Date;
  isExpired: boolean;
  photoAttachments: Array<{
    id: string;
    filename: string;
    url: string;
    contentType: string;
    size: number;
  }>;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    source: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  };
  confirmationNumber: string;
  timeline: Array<{
    event: string;
    timestamp: Date;
    description: string;
    performedBy?: string;
  }>;
}