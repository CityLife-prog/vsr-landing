/**
 * Quote Controller - Presentation Layer
 * Clean Architecture: Adapts HTTP requests to use cases
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { container } from '../../infrastructure/di/Container';
import { DomainValidationError, BusinessRuleViolationError } from '../../domain/shared/DomainError';
import { SubmitQuoteRequestError } from '../../application/usecases/SubmitQuoteRequestUseCase';

export class QuoteController {
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
        description,
        metadata
      } = req.body;

      // Validate required fields
      if (!customerName || !email || !phone || !serviceType || !description) {
        res.status(400).json({
          error: 'Missing required fields',
          details: 'customerName, email, phone, serviceType, and description are required'
        });
        return;
      }

      // Prepare command
      const command = {
        customerName,
        email,
        phone,
        serviceType,
        description,
        metadata: {
          ipAddress: this.getClientIP(req),
          userAgent: req.headers['user-agent'],
          ...metadata
        }
      };

      // Execute use case
      const result = await container.submitQuoteRequestUseCase.execute(command);

      // Return success response
      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          quoteId: result.quoteId
        }
      });

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
    console.error('Quote API Error:', error);

    if (error instanceof DomainValidationError) {
      res.status(400).json({
        error: 'Validation failed',
        message: error.message,
        field: error.field
      });
      return;
    }

    if (error instanceof BusinessRuleViolationError) {
      res.status(422).json({
        error: 'Business rule violation',
        message: error.message
      });
      return;
    }

    if (error instanceof SubmitQuoteRequestError) {
      res.status(500).json({
        error: 'Failed to submit quote request',
        message: 'An error occurred while processing your request'
      });
      return;
    }

    // Generic error
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred'
    });
  }
}

export const quoteController = new QuoteController();