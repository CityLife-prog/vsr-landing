/**
 * CQRS Usage Examples - Application Layer
 * Demonstrates how to use the CQRS system with commands and queries
 */

import { cqrsContainer } from '../../infrastructure/cqrs/CQRSContainer';
import { QuotePriority } from '../../domain/quote/Quote';

export class CQRSUsageExamples {
  /**
   * Example: Complete CQRS workflow for quote management
   */
  static async demonstrateQuoteCQRSWorkflow(): Promise<void> {
    console.log('🏗️ CQRS Example: Quote Management Workflow');

    try {
      const quoteService = cqrsContainer.quoteApplicationService;

      // 1. Submit quote request (Command)
      console.log('📝 Submitting quote request...');
      const submitResult = await quoteService.submitQuoteRequest({
        customerName: 'John Smith',
        email: 'john.smith@example.com',
        phone: '(555) 123-4567',
        serviceType: 'concrete-asphalt',
        description: 'Need to repair cracks in driveway and resurface the entire area. Approximately 500 sq ft.',
        metadata: {
          source: 'website',
          utmSource: 'google',
          utmMedium: 'cpc',
          ipAddress: '192.168.1.100'
        },
        correlationId: 'demo-workflow-001'
      });

      if (!submitResult.success) {
        console.error('❌ Quote submission failed:', submitResult.errors);
        return;
      }

      console.log('✅ Quote submitted:', submitResult.data);
      const quoteId = submitResult.data?.quoteId!;

      // 2. Move quote to review (Command)
      console.log('📋 Moving quote to review...');
      const reviewResult = await quoteService.moveQuoteToReview({
        quoteId,
        correlationId: 'demo-workflow-001',
        userId: 'admin-001'
      });

      if (reviewResult.success) {
        console.log('✅ Quote moved to review:', reviewResult.data);
      }

      // 3. Update quote priority (Command)
      console.log('⚡ Updating quote priority...');
      const priorityResult = await quoteService.updateQuotePriority({
        quoteId,
        priority: QuotePriority.HIGH,
        reason: 'Large commercial project',
        correlationId: 'demo-workflow-001',
        userId: 'admin-001'
      });

      if (priorityResult.success) {
        console.log('✅ Quote priority updated:', priorityResult.data);
      }

      // 4. Send quote with estimate (Command)
      console.log('💰 Sending quote with estimate...');
      const sendResult = await quoteService.sendQuote({
        quoteId,
        estimatedValue: 2500,
        notes: 'Includes materials and labor for complete driveway restoration',
        correlationId: 'demo-workflow-001',
        userId: 'admin-001'
      });

      if (sendResult.success) {
        console.log('✅ Quote sent:', sendResult.data);
      }

      // 5. Query quote details (Query)
      console.log('🔍 Querying quote details...');
      const detailsResult = await quoteService.getQuoteDetails(
        quoteId,
        'demo-workflow-001'
      );

      if (detailsResult.success) {
        console.log('📊 Quote details:', {
          id: detailsResult.data?.id,
          customer: detailsResult.data?.customerName,
          status: detailsResult.data?.status,
          priority: detailsResult.data?.priority,
          estimate: detailsResult.data?.estimatedValue,
          timeline: detailsResult.data?.timeline.length
        });
      }

      // 6. Query quote list (Query)
      console.log('📋 Querying quote list...');
      const listResult = await quoteService.getQuoteList({
        status: 'quote_sent',
        page: 1,
        limit: 10,
        correlationId: 'demo-workflow-001'
      });

      if (listResult.success) {
        console.log('📝 Quote list:', {
          total: listResult.data?.total,
          itemCount: listResult.data?.items.length,
          hasMore: listResult.data?.hasNext
        });
      }

    } catch (error) {
      console.error('❌ CQRS workflow error:', error);
    }
  }

  /**
   * Example: Job application CQRS workflow
   */
  static async demonstrateJobApplicationCQRSWorkflow(): Promise<void> {
    console.log('👥 CQRS Example: Job Application Workflow');

    try {
      const applicationService = cqrsContainer.jobApplicationApplicationService;

      // Submit job application (Command)
      console.log('📝 Submitting job application...');
      const submitResult = await applicationService.submitJobApplication({
        applicantName: 'Jane Doe',
        email: 'jane.doe@example.com',
        phone: '(555) 987-6543',
        experienceLevel: 'experienced',
        experienceDescription: 'I have 8 years of experience in construction, specializing in concrete work and asphalt repair. Previously worked with ABC Construction on commercial projects including shopping centers and office buildings.',
        metadata: {
          source: 'website',
          referralSource: 'employee_referral',
          ipAddress: '192.168.1.101'
        },
        correlationId: 'demo-app-001'
      });

      if (submitResult.success) {
        console.log('✅ Job application submitted:', submitResult.data);
      } else {
        console.error('❌ Job application failed:', submitResult.errors);
      }

    } catch (error) {
      console.error('❌ Job application workflow error:', error);
    }
  }

  /**
   * Example: Performance monitoring and metrics
   */
  static async demonstratePerformanceMonitoring(): Promise<void> {
    console.log('📊 CQRS Example: Performance Monitoring');

    try {
      // Execute multiple commands to generate metrics
      const quoteService = cqrsContainer.quoteApplicationService;

      for (let i = 0; i < 5; i++) {
        await quoteService.submitQuoteRequest({
          customerName: `Test Customer ${i}`,
          email: `test${i}@example.com`,
          phone: `(555) 000-000${i}`,
          serviceType: 'painting',
          description: `Test quote description ${i}`,
          correlationId: `perf-test-${i}`
        });
      }

      // Get performance report
      const performanceReport = cqrsContainer.getPerformanceReport();
      console.log('⚡ Performance Report:', performanceReport);

      // Show registered commands and queries
      console.log('📋 Registered Commands:', cqrsContainer.getRegisteredCommands());
      console.log('🔍 Registered Queries:', cqrsContainer.getRegisteredQueries());

    } catch (error) {
      console.error('❌ Performance monitoring error:', error);
    }
  }

  /**
   * Example: Query caching demonstration
   */
  static async demonstrateCaching(): Promise<void> {
    console.log('🗄️ CQRS Example: Query Caching');

    try {
      const quoteService = cqrsContainer.quoteApplicationService;

      // First query (cache miss)
      console.log('🔍 First query (cache miss)...');
      const startTime1 = Date.now();
      const result1 = await quoteService.getQuoteList({ limit: 5 });
      const time1 = Date.now() - startTime1;
      console.log(`✅ Query completed in ${time1}ms`);

      // Second identical query (cache hit)
      console.log('🔍 Second query (cache hit)...');
      const startTime2 = Date.now();
      const result2 = await quoteService.getQuoteList({ limit: 5 });
      const time2 = Date.now() - startTime2;
      console.log(`⚡ Query completed in ${time2}ms (cached)`);

      console.log('📈 Performance improvement:', {
        firstQuery: `${time1}ms`,
        secondQuery: `${time2}ms`,
        improvement: time1 > 0 ? `${Math.round((1 - time2/time1) * 100)}%` : 'N/A'
      });

    } catch (error) {
      console.error('❌ Caching demonstration error:', error);
    }
  }

  /**
   * Run all CQRS examples
   */
  static async runAllExamples(): Promise<void> {
    console.log('🚀 Running CQRS Examples\n');

    await this.demonstrateQuoteCQRSWorkflow();
    console.log('');

    await this.demonstrateJobApplicationCQRSWorkflow();
    console.log('');

    await this.demonstratePerformanceMonitoring();
    console.log('');

    await this.demonstrateCaching();
    console.log('');

    console.log('✅ All CQRS examples completed successfully!');
  }
}