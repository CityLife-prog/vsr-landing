/**
 * Job Application Controller - Presentation Layer
 * Clean Architecture: Adapts HTTP requests to use cases
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { container } from '../../infrastructure/di/Container';
import { DomainValidationError, BusinessRuleViolationError } from '../../domain/shared/DomainError';
import { SubmitJobApplicationError } from '../../application/usecases/SubmitJobApplicationUseCase';

export class JobApplicationController {
  async submitJobApplication(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    try {
      // Validate HTTP method
      if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      // Extract request data
      const {
        applicantName,
        email,
        phone,
        experienceLevel,
        experienceDescription,
        metadata
      } = req.body;

      // Validate required fields
      if (!applicantName || !email || !phone || !experienceLevel || !experienceDescription) {
        res.status(400).json({
          error: 'Missing required fields',
          details: 'applicantName, email, phone, experienceLevel, and experienceDescription are required'
        });
        return;
      }

      // Prepare command
      const command = {
        applicantName,
        email,
        phone,
        experienceLevel,
        experienceDescription,
        metadata: {
          ipAddress: this.getClientIP(req),
          userAgent: req.headers['user-agent'],
          ...metadata
        }
      };

      // Execute use case
      const result = await container.submitJobApplicationUseCase.execute(command);

      // Return success response
      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          applicationId: result.applicationId
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
    console.error('Job Application API Error:', error);

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

    if (error instanceof SubmitJobApplicationError) {
      res.status(500).json({
        error: 'Failed to submit job application',
        message: 'An error occurred while processing your application'
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

export const jobApplicationController = new JobApplicationController();