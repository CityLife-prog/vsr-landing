/**
 * CQRS Quote Controller - Presentation Layer
 * HTTP adapter that uses CQRS application services
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { cqrsContainer } from '../../infrastructure/cqrs/CQRSContainer';
import { CommandValidationError } from '../../application/middleware/CommandValidationMiddleware';

export class CQRSQuoteController {
  private readonly quoteService = cqrsContainer.quoteApplicationService;

  async submitQuoteRequest(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    try {
      // Validate HTTP method
      if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Extract request data
      const {
        customerName,
        email,
        phone,
        serviceType,
        description
      } = req.body;

      // Submit command through CQRS
      const result = await this.quoteService.submitQuoteRequest({
        customerName,
        email,
        phone,
        serviceType,
        description,
        metadata: {
          ipAddress: this.getClientIP(req),
          userAgent: req.headers['user-agent'],
          source: 'api'
        },
        correlationId: req.headers['x-correlation-id'] as string || undefined,
        userId: req.headers['x-user-id'] as string || undefined
      });

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: result.data,
          correlationId: result.data?.quoteId
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }

    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getQuoteList(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    try {
      // Validate HTTP method
      if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Extract query parameters
      const {
        status,
        priority,
        serviceType,
        customerName,
        customerEmail,
        page = '1',
        limit = '20',
        sortField = 'submittedAt',
        sortDirection = 'desc'
      } = req.query;

      // Execute query through CQRS
      const result = await this.quoteService.getQuoteList({
        status: status as string,
        priority: priority as string,
        serviceType: serviceType as string,
        customerName: customerName as string,
        customerEmail: customerEmail as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sortField: sortField as string,
        sortDirection: sortDirection as 'asc' | 'desc',
        correlationId: req.headers['x-correlation-id'] as string || undefined,
        userId: req.headers['x-user-id'] as string || undefined
      });

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          executionTimeMs: result.executionTimeMs
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
          executionTimeMs: result.executionTimeMs
        });
      }

    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getQuoteDetails(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    try {
      // Validate HTTP method
      if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const { quoteId } = req.query;

      if (!quoteId || typeof quoteId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Quote ID is required'
        });
        return;
      }

      // Execute query through CQRS
      const result = await this.quoteService.getQuoteDetails(
        quoteId,
        req.headers['x-correlation-id'] as string || undefined,
        req.headers['x-user-id'] as string || undefined
      );

      if (result.success) {
        res.status(200).json({
          success: true,
          data: result.data,
          executionTimeMs: result.executionTimeMs
        });
      } else {
        res.status(404).json({
          success: false,
          error: result.error,
          executionTimeMs: result.executionTimeMs
        });
      }

    } catch (error) {
      this.handleError(error, res);
    }
  }

  async processQuote(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    try {
      // Validate HTTP method
      if (req.method !== 'PATCH') {
        res.setHeader('Allow', ['PATCH']);
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      const { quoteId } = req.query;
      const { action, ...actionData } = req.body;

      if (!quoteId || typeof quoteId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Quote ID is required'
        });
        return;
      }

      const correlationId = req.headers['x-correlation-id'] as string || undefined;
      const userId = req.headers['x-user-id'] as string || undefined;

      let result;

      switch (action) {
        case 'move_to_review':
          result = await this.quoteService.moveQuoteToReview({
            quoteId,
            correlationId,
            userId
          });
          break;

        case 'send_quote':
          result = await this.quoteService.sendQuote({
            quoteId,
            estimatedValue: actionData.estimatedValue,
            notes: actionData.notes,
            validUntil: actionData.validUntil ? new Date(actionData.validUntil) : undefined,
            correlationId,
            userId
          });
          break;

        case 'update_priority':
          result = await this.quoteService.updateQuotePriority({
            quoteId,
            priority: actionData.priority,
            reason: actionData.reason,
            correlationId,
            userId
          });
          break;

        case 'reject':
          result = await this.quoteService.rejectQuote({
            quoteId,
            reason: actionData.reason,
            notifyCustomer: actionData.notifyCustomer,
            correlationId,
            userId
          });
          break;

        default:
          res.status(400).json({
            success: false,
            error: `Unknown action: ${action}`
          });
          return;
      }

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: result.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors
        });
      }

    } catch (error) {
      this.handleError(error, res);
    }
  }

  private getClientIP(req: NextApiRequest): string {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded 
      ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
      : req.socket.remoteAddress;
    return ip || 'unknown';
  }

  private handleError(error: unknown, res: NextApiResponse): void {
    console.error('CQRS Quote Controller error:', error);

    if (error instanceof CommandValidationError) {
      res.status(400).json({
        success: false,
        error: 'Command validation failed',
        validationErrors: error.validationErrors
      });
      return;
    }

    // Generic error
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
}

export const cqrsQuoteController = new CQRSQuoteController();