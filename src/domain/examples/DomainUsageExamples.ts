/**
 * Domain Usage Examples - Clean Architecture Demonstration
 * Shows how to use the domain layer with proper patterns
 */

import { Quote, QuotePriority } from '../quote/Quote';
import { JobApplication } from '../application/JobApplication';
import { Email } from '../shared/Email';
import { PhoneNumber } from '../shared/PhoneNumber';
import { ServiceType } from '../shared/ServiceType';
import { UniqueEntityId } from '../shared/UniqueEntityId';
import { container } from '../../infrastructure/di/Container';

export class DomainUsageExamples {
  /**
   * Example: Complete quote workflow
   */
  static async demonstrateQuoteWorkflow(): Promise<void> {
    console.log('🏗️ Domain Example: Quote Workflow');

    try {
      // 1. Customer submits quote request
      const result = await container.submitQuoteRequestUseCase.execute({
        customerName: 'John Smith',
        email: 'john.smith@example.com',
        phone: '(555) 123-4567',
        serviceType: 'concrete-asphalt',
        description: 'Need to repair cracks in driveway and resurface the entire area. Approximately 500 sq ft.',
        metadata: {
          source: 'website',
          utmSource: 'google',
          utmMedium: 'cpc'
        }
      });

      console.log('✅ Quote submitted:', result);

      // 2. Admin processes the quote
      const quoteId = result.quoteId;

      // Move to review
      await container.processQuoteUseCase.moveToReview({ quoteId });
      console.log('📋 Quote moved to review');

      // Send quote with estimate
      await container.processQuoteUseCase.sendQuote({
        quoteId,
        estimatedValue: 2500
      });
      console.log('💰 Quote sent with estimate: $2,500');

      // 3. Demonstrate domain entity usage
      const quote = await container.quoteRepository.findById(UniqueEntityId.create(quoteId));
      if (quote) {
        console.log('📊 Quote details:');
        console.log(`  Customer: ${quote.customerName}`);
        console.log(`  Service: ${quote.serviceType.name}`);
        console.log(`  Status: ${quote.status}`);
        console.log(`  Estimate: $${quote.estimatedValue}`);
        console.log(`  Expires: ${quote.expiresAt}`);
      }

    } catch (error) {
      console.error('❌ Quote workflow error:', error);
    }
  }

  /**
   * Example: Complete job application workflow
   */
  static async demonstrateJobApplicationWorkflow(): Promise<void> {
    console.log('👥 Domain Example: Job Application Workflow');

    try {
      // 1. Applicant submits application
      const result = await container.submitJobApplicationUseCase.execute({
        applicantName: 'Jane Doe',
        email: 'jane.doe@example.com',
        phone: '(555) 987-6543',
        experienceLevel: 'experienced',
        experienceDescription: 'I have 8 years of experience in construction, specializing in concrete work and asphalt repair. Previously worked with ABC Construction on commercial projects.',
        metadata: {
          source: 'website',
          referralSource: 'employee_referral'
        }
      });

      console.log('✅ Application submitted:', result);

      // 2. HR processes the application
      const applicationId = result.applicationId;
      const application = await container.jobApplicationRepository.findById(
        UniqueEntityId.create(applicationId)
      );

      if (application) {
        // Move to review
        application.moveToReview();
        await container.jobApplicationRepository.save(application);
        console.log('📋 Application moved to review');

        // Schedule interview
        const interviewDate = new Date();
        interviewDate.setDate(interviewDate.getDate() + 7); // Next week
        interviewDate.setHours(14, 0, 0, 0); // 2 PM

        application.scheduleInterview(interviewDate);
        await container.jobApplicationRepository.save(application);
        console.log(`📅 Interview scheduled for ${interviewDate}`);

        // Demonstrate domain entity usage
        console.log('📊 Application details:');
        console.log(`  Applicant: ${application.applicantName}`);
        console.log(`  Experience: ${application.experienceLevel}`);
        console.log(`  Status: ${application.status}`);
        console.log(`  Has Resume: ${application.hasResume()}`);
        console.log(`  Interview: ${application.interviewDate}`);
      }

    } catch (error) {
      console.error('❌ Job application workflow error:', error);
    }
  }

  /**
   * Example: Value object usage and validation
   */
  static demonstrateValueObjects(): void {
    console.log('🔧 Domain Example: Value Objects');

    try {
      // Email value object
      const email = Email.create('customer@example.com');
      console.log('📧 Email:', {
        value: email.value,
        domain: email.getDomain(),
        localPart: email.getLocalPart()
      });

      // Phone number value object
      const phone = PhoneNumber.create('555-123-4567');
      console.log('📞 Phone:', {
        raw: phone.value,
        formatted: phone.formatted,
        isUS: phone.isUSNumber()
      });

      // Service type value object
      const serviceType = ServiceType.create('landscaping');
      console.log('🌱 Service Type:', {
        key: serviceType.key,
        name: serviceType.name,
        category: serviceType.category,
        isMaintenance: serviceType.isMaintenanceService()
      });

      // Demonstrate validation errors
      try {
        Email.create('invalid-email');
      } catch (error) {
        console.log('❌ Email validation error:', (error as Error).message);
      }

      try {
        ServiceType.create('invalid-service');
      } catch (error) {
        console.log('❌ Service type validation error:', (error as Error).message);
      }

    } catch (error) {
      console.error('❌ Value object error:', error);
    }
  }

  /**
   * Example: Repository patterns and queries
   */
  static async demonstrateRepositoryPatterns(): Promise<void> {
    console.log('🗄️ Domain Example: Repository Patterns');

    try {
      // Create some test data
      const quote1 = Quote.create({
        customerName: 'Alice Johnson',
        email: 'alice@example.com',
        phone: '555-111-2222',
        serviceType: 'painting',
        description: 'Interior painting for 3 bedrooms'
      });

      const quote2 = Quote.create({
        customerName: 'Bob Wilson',
        email: 'bob@example.com',
        phone: '555-333-4444',
        serviceType: 'demolition',
        description: 'Small shed demolition'
      });

      quote2.setPriority(QuotePriority.HIGH);

      await container.quoteRepository.save(quote1);
      await container.quoteRepository.save(quote2);

      // Demonstrate repository queries
      const allQuotes = await container.quoteRepository.findRecentQuotes(10);
      console.log(`📋 Found ${allQuotes.length} quotes`);

      const paintingQuotes = await container.quoteRepository.findByStatus(quote1.status);
      console.log(`🎨 Found ${paintingQuotes.length} pending quotes`);

      const highPriorityQuotes = await container.quoteRepository.findByPriority(QuotePriority.HIGH);
      console.log(`⚡ Found ${highPriorityQuotes.length} high priority quotes`);

      // Clean up
      await container.quoteRepository.delete(quote1.id);
      await container.quoteRepository.delete(quote2.id);

    } catch (error) {
      console.error('❌ Repository pattern error:', error);
    }
  }

  /**
   * Run all examples
   */
  static async runAllExamples(): Promise<void> {
    console.log('🚀 Running Domain Layer Examples\n');

    this.demonstrateValueObjects();
    console.log('');

    await this.demonstrateRepositoryPatterns();
    console.log('');

    await this.demonstrateQuoteWorkflow();
    console.log('');

    await this.demonstrateJobApplicationWorkflow();
    console.log('');

    console.log('✅ All domain examples completed successfully!');
  }
}