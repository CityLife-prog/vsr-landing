/**
 * Get Quote Details Query Handler - CQRS Implementation
 * Handles detailed quote information queries
 */

import { QueryHandler, BaseQueryResult } from '../../cqrs/Query';
import { GetQuoteDetailsQuery, GetQuoteDetailsResult } from '../../queries/quote/GetQuoteDetailsQuery';
import { QuoteRepository } from '../../../domain/quote/QuoteRepository';
import { FileStorageService } from '../../../domain/services/FileStorageService';
import { UniqueEntityId } from '../../../domain/shared/UniqueEntityId';

export class GetQuoteDetailsQueryHandler 
  implements QueryHandler<GetQuoteDetailsQuery, BaseQueryResult<GetQuoteDetailsResult>> {

  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly fileStorageService: FileStorageService
  ) {}

  async handle(query: GetQuoteDetailsQuery): Promise<BaseQueryResult<GetQuoteDetailsResult>> {
    const startTime = Date.now();

    try {
      const quoteId = UniqueEntityId.create(query.quoteId);
      const quote = await this.quoteRepository.findById(quoteId);

      if (!quote) {
        const executionTime = Date.now() - startTime;
        return BaseQueryResult.failure(
          query.queryId,
          'Quote not found',
          executionTime
        );
      }

      // Get photo attachment details
      const photoAttachments = await Promise.all(
        quote.photoAttachments.map(async (photoId) => {
          try {
            const metadata = await this.fileStorageService.getFileMetadata(photoId);
            const url = await this.fileStorageService.generateSignedUrl(photoId, 3600); // 1 hour

            return metadata ? {
              id: photoId,
              filename: metadata.filename,
              url,
              contentType: metadata.contentType,
              size: metadata.size
            } : null;
          } catch (error) {
            console.warn(`Failed to get metadata for photo ${photoId}:`, error);
            return null;
          }
        })
      );

      // Filter out failed photo attachments
      const validPhotoAttachments = photoAttachments.filter(photo => photo !== null);

      // Build timeline from quote events (simplified for demo)
      const timeline = [
        {
          event: 'submitted',
          timestamp: quote.submittedAt,
          description: 'Quote request submitted by customer',
          performedBy: quote.customerName
        }
      ];

      if (quote.status !== 'pending') {
        timeline.push({
          event: 'status_change',
          timestamp: quote.updatedAt,
          description: `Quote status changed to ${quote.status}`,
          performedBy: 'System'
        });
      }

      if (quote.quoteSentAt) {
        timeline.push({
          event: 'quote_sent',
          timestamp: quote.quoteSentAt,
          description: `Quote sent with estimate of $${quote.estimatedValue}`,
          performedBy: 'Admin'
        });
      }

      const result: GetQuoteDetailsResult = {
        id: quote.id.toString(),
        customerName: quote.customerName,
        email: quote.email.value,
        phone: quote.phone.formatted,
        serviceType: {
          key: quote.serviceType.key,
          name: quote.serviceType.name,
          category: quote.serviceType.category,
          description: quote.serviceType.description
        },
        description: quote.description,
        status: quote.status,
        priority: quote.priority,
        estimatedValue: quote.estimatedValue,
        submittedAt: quote.submittedAt,
        updatedAt: quote.updatedAt,
        quoteSentAt: quote.quoteSentAt,
        expiresAt: quote.expiresAt,
        isExpired: quote.isExpired(),
        photoAttachments: validPhotoAttachments,
        metadata: quote.metadata,
        confirmationNumber: this.generateConfirmationNumber(quote.id.toString()),
        timeline: timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      };

      const executionTime = Date.now() - startTime;

      return BaseQueryResult.success(query.queryId, result, executionTime);

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('GetQuoteDetailsQueryHandler error:', error);
      
      return BaseQueryResult.failure(
        query.queryId,
        'Failed to retrieve quote details',
        executionTime
      );
    }
  }

  private generateConfirmationNumber(quoteId: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const quoteIdShort = quoteId.substring(0, 8).toUpperCase();
    return `QTE-${timestamp}-${quoteIdShort}`;
  }
}