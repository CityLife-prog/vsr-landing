/**
 * Simple VSR Landing Observability Usage Demo
 * Shows how to immediately start using the observability system
 */

import {
  initializeObservability,
  logger,
  trackUserAction,
  metricsCollector,
  instrumentHttpRequest,
  measurePerformance,
  getSystemHealth
} from '../src/observability';

// 🚀 Step 1: Initialize the system (add this to your app startup)
export function initApp() {
  console.log('🔧 Initializing VSR Landing with Observability...');
  
  initializeObservability({
    serviceName: 'vsr-landing',
    environment: process.env.NODE_ENV || 'development'
  });
  
  console.log('✅ Observability system ready!');
}

// 📊 Step 2: Track user actions (add to your existing user flows)
export function trackUserQuoteRequest(userId: string, quoteData: any) {
  trackUserAction('quote_requested', userId, {
    service_type: quoteData.serviceType,
    location: quoteData.location,
    estimated_value: quoteData.estimatedValue,
    page_source: 'quote_form'
  });
  
  // Also log it
  logger.info('User requested quote', {
    user_id: userId,
    service_type: quoteData.serviceType,
    location: quoteData.location
  });
}

// 🔍 Step 3: Monitor API endpoints (wrap your existing API handlers)
export async function monitoredQuoteHandler(req: any, res: any) {
  return await instrumentHttpRequest(
    req.method,
    req.url,
    async (context) => {
      const userId = req.user?.id || 'anonymous';
      
      // Your existing quote processing logic
      const quote = await processQuote(req.body, userId);
      
      // Track the successful quote generation
      trackUserAction('quote_generated', userId, {
        quote_id: quote.id,
        service_type: req.body.serviceType,
        quote_amount: quote.total
      }, context);
      
      return res.json({
        success: true,
        quote,
        trace_id: context.traceId // Include for debugging
      });
    }
  );
}

// ⚡ Step 4: Monitor performance of critical operations
export function monitoredDataProcessing(data: any[]) {
  return measurePerformance(
    'data_processing',
    () => {
      // Your existing data processing logic
      return data.map(item => processItem(item));
    },
    { 
      warning: 1000,  // Alert if takes longer than 1 second
      critical: 5000  // Critical alert if takes longer than 5 seconds
    }
  );
}

// 💰 Step 5: Track business metrics (add to your conversion points)
export function trackQuoteConversion(quote: any, userId: string) {
  // Record the business event
  metricsCollector.recordBusinessEvent('quote_converted', 1, {
    quote_id: quote.id,
    service_type: quote.serviceType,
    revenue: quote.total,
    user_id: userId,
    conversion_source: 'website'
  });
  
  // Also track the user action
  trackUserAction('quote_accepted', userId, {
    quote_id: quote.id,
    value: quote.total,
    service_type: quote.serviceType
  });
  
  logger.business('Quote conversion', quote.total, {
    quote_id: quote.id,
    user_id: userId,
    service_type: quote.serviceType
  });
}

// 🏥 Step 6: Health monitoring (add to your health check endpoint)
export async function healthEndpoint(req: any, res: any) {
  try {
    const health = await getSystemHealth();
    
    res.status(health.overall === 'healthy' ? 200 : 503).json({
      status: health.overall,
      timestamp: new Date().toISOString(),
      service: 'vsr-landing',
      observability: health.observability,
      resilience: health.resilience
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
}

// 🎯 Complete example: Quote processing with full observability
export async function completeQuoteExample(quoteRequest: any, userId: string) {
  // Start tracking the user journey
  trackUserAction('quote_flow_started', userId, {
    service_type: quoteRequest.serviceType,
    source: 'website'
  });
  
  try {
    // Process with performance monitoring
    const quote = await measurePerformance(
      'quote_generation',
      async () => {
        // Your quote generation logic here
        const pricing = await calculatePricing(quoteRequest);
        return {
          id: generateQuoteId(),
          serviceType: quoteRequest.serviceType,
          items: pricing.items,
          total: pricing.total,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        };
      },
      { warning: 2000, critical: 10000 }
    );
    
    // Track successful generation
    trackUserAction('quote_generated', userId, {
      quote_id: quote.id,
      amount: quote.total,
      service_type: quote.serviceType
    });
    
    // Record business metrics
    metricsCollector.recordBusinessEvent('quote_generated', 1, {
      service_type: quote.serviceType,
      quote_value: quote.total,
      user_id: userId
    });
    
    logger.info('Quote generated successfully', {
      quote_id: quote.id,
      user_id: userId,
      service_type: quote.serviceType,
      total_amount: quote.total
    });
    
    return quote;
    
  } catch (error) {
    // Track the failure
    trackUserAction('quote_generation_failed', userId, {
      service_type: quoteRequest.serviceType,
      error: (error as Error).message
    });
    
    // Record error metrics
    metricsCollector.recordCounter('quote_generation.errors', 1, {
      service_type: quoteRequest.serviceType,
      error_type: (error as Error).constructor.name
    });
    
    logger.error('Quote generation failed', error as Error, {
      user_id: userId,
      service_type: quoteRequest.serviceType
    });
    
    throw error;
  }
}

// Helper functions (implement these based on your existing logic)
async function processQuote(quoteData: any, userId: string) {
  return {
    id: 'quote_' + Math.random().toString(36),
    serviceType: quoteData.serviceType,
    total: 5000,
    items: ['Service delivery', 'Materials']
  };
}

function processItem(item: any) {
  return { ...item, processed: true };
}

async function calculatePricing(request: any) {
  return {
    items: ['Base service', 'Materials'],
    total: 5000
  };
}

function generateQuoteId() {
  return 'quote_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 🎬 Demo function to test everything
export async function runObservabilityDemo() {
  console.log('🎬 Running VSR Landing Observability Demo...\n');
  
  // Initialize
  initApp();
  
  // Simulate user flow
  const userId = 'demo_user_123';
  const quoteRequest = {
    serviceType: 'concrete',
    location: 'Denver, CO',
    estimatedValue: 5000
  };
  
  // Track user starting quote flow
  trackUserQuoteRequest(userId, quoteRequest);
  
  // Process quote with full monitoring
  const quote = await completeQuoteExample(quoteRequest, userId);
  
  // Simulate conversion
  setTimeout(() => {
    trackQuoteConversion(quote, userId);
  }, 1000);
  
  // Check system health
  const health = await getSystemHealth();
  console.log('\n🏥 System Health:', health.overall);
  
  console.log('\n✅ Demo complete! Check your console for observability output.');
  console.log('📊 Metrics, traces, and logs are now being collected automatically.');
}

// Run demo if this file is executed directly
if (require.main === module) {
  runObservabilityDemo().catch(console.error);
}