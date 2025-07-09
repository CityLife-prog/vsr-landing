/**
 * VSR Landing Observability Integration Example
 * Demonstrates how to integrate the observability system into your application
 */

import { 
  initializeObservability,
  logger,
  metricsCollector,
  distributedTracing,
  instrumentHttpRequest,
  instrumentDatabaseOperation,
  instrumentBusinessOperation,
  trackUserAction,
  measurePerformance,
  alertingSystem,
  performanceMonitoring
} from '../src/observability';

// 1. Initialize the observability system at application startup
export function setupObservability() {
  console.log('🔧 Initializing VSR Landing Observability System...');
  
  initializeObservability({
    serviceName: 'vsr-landing',
    environment: process.env.NODE_ENV || 'development',
    enableConsoleOutput: true,
    enableFileOutput: false,
    enableHttpExports: process.env.NODE_ENV === 'production'
  });

  // Set up custom alert channels (optional)
  if (process.env.SLACK_WEBHOOK) {
    alertingSystem.addAlertChannel({
      id: 'slack_critical',
      type: 'slack',
      enabled: true,
      config: {
        webhook: process.env.SLACK_WEBHOOK
      },
      severityFilter: ['high', 'critical']
    });
  }

  console.log('✅ Observability system initialized');
}

// 2. Example: Quote request processing with full observability
export async function processQuoteRequest(quoteData: any, userId: string) {
  // Start business operation tracing
  return await instrumentBusinessOperation(
    'quote_processing',
    async (context) => {
      // Track user action
      trackUserAction('quote_requested', userId, {
        service_type: quoteData.serviceType,
        location: quoteData.location,
        estimated_value: quoteData.estimatedValue
      }, context);

      // Create context-aware logger
      const requestLogger = logger.withCorrelation(context);
      requestLogger.info('Processing quote request', {
        user_id: userId,
        service_type: quoteData.serviceType,
        location: quoteData.location
      });

      // Validate quote data with performance monitoring
      const validatedData = measurePerformance(
        'quote_validation',
        () => validateQuoteData(quoteData),
        { warning: 100, critical: 500 },
        context
      );

      // Database operation with instrumentation
      const existingQuotes = await instrumentDatabaseOperation(
        'select',
        'quotes',
        async (dbContext) => {
          return database.query(
            'SELECT * FROM quotes WHERE user_id = ? AND service_type = ?',
            [userId, quoteData.serviceType]
          );
        },
        context
      );

      // External service call with HTTP instrumentation
      const pricingData = await instrumentHttpRequest(
        'POST',
        '/api/pricing/calculate',
        async (httpContext) => {
          return fetch('/api/pricing/calculate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Inject tracing headers
              ...distributedTracing.injectHeaders(httpContext)
            },
            body: JSON.stringify(validatedData)
          }).then(res => res.json());
        },
        context
      );

      // Generate quote with performance monitoring
      const quote = await measurePerformance(
        'quote_generation',
        async () => {
          const generatedQuote = await generateQuote(validatedData, pricingData);
          
          // Record business metrics
          metricsCollector.recordBusinessEvent('quote_generated', 1, {
            service_type: quoteData.serviceType,
            quote_value: generatedQuote.totalAmount,
            processing_time: Date.now() - context.startTime,
            user_id: userId
          });

          return generatedQuote;
        },
        { warning: 2000, critical: 5000 },
        context
      );

      // Save quote to database
      const savedQuote = await instrumentDatabaseOperation(
        'insert',
        'quotes',
        async (dbContext) => {
          return database.insert('quotes', {
            ...quote,
            user_id: userId,
            created_at: new Date(),
            status: 'pending'
          });
        },
        context
      );

      requestLogger.info('Quote request processed successfully', {
        quote_id: savedQuote.id,
        total_amount: savedQuote.totalAmount,
        processing_duration: Date.now() - context.startTime
      });

      // Track conversion funnel
      trackUserAction('quote_generated', userId, {
        quote_id: savedQuote.id,
        service_type: quoteData.serviceType,
        quote_value: savedQuote.totalAmount
      }, context);

      return savedQuote;
    },
    {
      user_id: userId,
      service_type: quoteData.serviceType,
      estimated_value: quoteData.estimatedValue
    }
  );
}

// 3. Example: API endpoint with observability
export async function apiQuoteHandler(req: any, res: any) {
  // Extract tracing context from headers
  const parentContext = distributedTracing.extractContext(req.headers);
  
  return await instrumentHttpRequest(
    req.method,
    req.url,
    async (context) => {
      const requestLogger = logger.withCorrelation(context);
      
      try {
        // Extract user info
        const userId = req.user?.id || 'anonymous';
        const quoteData = req.body;

        requestLogger.info(`${req.method} ${req.url} - Processing quote request`, {
          user_id: userId,
          request_size: JSON.stringify(req.body).length,
          user_agent: req.headers['user-agent']
        });

        // Process the quote with full observability
        const quote = await processQuoteRequest(quoteData, userId);

        // Record API metrics
        metricsCollector.recordApiMetrics(
          req.method,
          req.url,
          200,
          Date.now() - context.startTime,
          JSON.stringify(quote).length
        );

        res.status(200).json({
          success: true,
          quote,
          trace_id: context.traceId
        });

        requestLogger.info(`${req.method} ${req.url} - Request completed successfully`, {
          quote_id: quote.id,
          response_size: JSON.stringify(quote).length
        });

      } catch (error) {
        requestLogger.error(`${req.method} ${req.url} - Request failed`, error as Error, {
          user_id: req.user?.id,
          error_type: (error as Error).constructor.name
        });

        // Record error metrics
        metricsCollector.recordCounter('api.errors', 1, {
          method: req.method,
          endpoint: req.url,
          error_type: (error as Error).constructor.name
        });

        res.status(500).json({
          success: false,
          error: 'Internal server error',
          trace_id: context.traceId
        });

        throw error;
      }
    },
    parentContext
  );
}

// 4. Example: Background job processing
export async function processScheduledTasks() {
  return await instrumentBusinessOperation(
    'scheduled_task_processing',
    async (context) => {
      const taskLogger = logger.withCorrelation(context);
      taskLogger.info('Starting scheduled task processing');

      // Get pending tasks
      const pendingTasks = await instrumentDatabaseOperation(
        'select',
        'scheduled_tasks',
        async () => {
          return database.query(`
            SELECT * FROM scheduled_tasks 
            WHERE status = 'pending' 
            AND scheduled_time <= NOW()
            ORDER BY priority DESC, scheduled_time ASC
            LIMIT 100
          `);
        },
        context
      );

      taskLogger.info(`Found ${pendingTasks.length} pending tasks`);

      let processed = 0;
      let failed = 0;

      for (const task of pendingTasks) {
        try {
          await measurePerformance(
            `task_${task.type}`,
            async () => {
              await processTask(task);
              processed++;
            },
            { warning: 30000, critical: 60000 },
            context
          );

          // Update task status
          await instrumentDatabaseOperation(
            'update',
            'scheduled_tasks',
            async () => {
              return database.query(
                'UPDATE scheduled_tasks SET status = ?, completed_at = ? WHERE id = ?',
                ['completed', new Date(), task.id]
              );
            },
            context
          );

        } catch (error) {
          failed++;
          taskLogger.error(`Task ${task.id} failed`, error as Error, {
            task_id: task.id,
            task_type: task.type
          });

          // Update task with error
          await database.query(
            'UPDATE scheduled_tasks SET status = ?, error = ? WHERE id = ?',
            ['failed', (error as Error).message, task.id]
          );
        }
      }

      // Record business metrics
      metricsCollector.recordBusinessEvent('scheduled_tasks_processed', processed, {
        failed_count: failed,
        total_count: pendingTasks.length
      });

      taskLogger.info('Scheduled task processing completed', {
        processed,
        failed,
        total: pendingTasks.length
      });

      return { processed, failed, total: pendingTasks.length };
    }
  );
}

// 5. Example: Frontend performance monitoring
export function setupFrontendMonitoring() {
  if (typeof window === 'undefined') return;

  // Track page views
  const trackPageView = (url: string) => {
    trackUserAction('page_view', getCurrentUserId(), {
      page_url: url,
      referrer: document.referrer,
      user_agent: navigator.userAgent
    });
  };

  // Track form submissions
  const trackFormSubmission = (formType: string, success: boolean) => {
    trackUserAction('form_submission', getCurrentUserId(), {
      form_type: formType,
      success: success.toString(),
      page_url: window.location.href
    });
  };

  // Track button clicks
  const trackButtonClick = (buttonId: string, buttonText: string) => {
    trackUserAction('button_click', getCurrentUserId(), {
      button_id: buttonId,
      button_text: buttonText,
      page_url: window.location.href
    });
  };

  // Set up automatic Web Vitals collection
  if ('PerformanceObserver' in window) {
    // This would integrate with actual Web Vitals library
    performanceMonitoring.recordWebVitals({
      // Web Vitals would be collected here
      largestContentfulPaint: 2500,
      firstInputDelay: 100,
      cumulativeLayoutShift: 0.1
    }, window.location.href, getCurrentUserId());
  }

  // Track navigation timing
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        performanceMonitoring.recordWebVitals({
          navigationStart: navigation.startTime,
          loadComplete: navigation.loadEventEnd - navigation.startTime,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.startTime,
          timeToFirstByte: navigation.responseStart - navigation.requestStart
        }, window.location.href, getCurrentUserId());
      }
    }, 0);
  });

  return {
    trackPageView,
    trackFormSubmission,
    trackButtonClick
  };
}

// Helper functions (would be implemented based on your app structure)
function validateQuoteData(data: any) {
  // Validation logic here
  return data;
}

function generateQuote(validatedData: any, pricingData: any) {
  // Quote generation logic here
  return {
    id: Math.random().toString(36),
    totalAmount: pricingData.total,
    items: pricingData.items,
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  };
}

function processTask(task: any) {
  // Task processing logic here
  return Promise.resolve();
}

function getCurrentUserId(): string {
  // Extract current user ID from your auth system
  return 'user_123';
}

// Mock database object
const database = {
  query: async (sql: string, params?: any[]) => {
    // Database query implementation
    return [];
  },
  insert: async (table: string, data: any) => {
    // Insert implementation
    return { id: Math.random().toString(36), ...data };
  }
};

// Example usage in your application
export function initializeVSRApp() {
  // 1. Set up observability first
  setupObservability();
  
  // 2. Set up frontend monitoring if in browser
  if (typeof window !== 'undefined') {
    setupFrontendMonitoring();
  }
  
  // 3. Set up scheduled tasks if on server
  if (typeof process !== 'undefined') {
    setInterval(() => {
      processScheduledTasks().catch(error => {
        logger.error('Scheduled task processing failed', error);
      });
    }, 60000); // Every minute
  }
  
  logger.info('VSR Landing application initialized with full observability');
}