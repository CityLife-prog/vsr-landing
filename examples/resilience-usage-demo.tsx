/**
 * VSR Landing Resilience Patterns Usage Demo
 * Complete examples showing how to use error boundaries, circuit breakers, and retry logic
 */

import React, { useState, useEffect } from 'react';
import {
  ErrorBoundary,
  CircuitBreakerFactory,
  RetryManager,
  RetryStrategy,
  getResilience
} from '../src/resilience';

// 🛡️ Example 1: Error Boundary for Quote Request Form
export function QuoteRequestPage() {
  return (
    <div className="quote-page">
      <h1>Get Your VSR Quote</h1>
      
      {/* Error boundary protects the entire quote form */}
      <ErrorBoundary
        fallback={(error, errorInfo, retry) => (
          <QuoteErrorFallback 
            error={error} 
            onRetry={retry}
            onContactSupport={() => window.open('mailto:support@vsr.com')}
          />
        )}
        onError={(error, errorInfo, errorId) => {
          // Log error for monitoring
          console.error('Quote form error:', {
            errorId,
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack
          });
        }}
        enableRetry={true}
        maxRetries={3}
        retryDelay={2000}
        errorBoundaryId="quote-form"
      >
        <QuoteRequestForm />
      </ErrorBoundary>
    </div>
  );
}

// Custom error fallback component
function QuoteErrorFallback({ 
  error, 
  onRetry, 
  onContactSupport 
}: {
  error: Error;
  onRetry: () => void;
  onContactSupport: () => void;
}) {
  return (
    <div className="error-fallback">
      <div className="error-content">
        <h2>🔧 Something went wrong with the quote form</h2>
        <p>
          Don't worry! This happens sometimes. Our team has been notified 
          and we're working on it.
        </p>
        
        <div className="error-actions">
          <button 
            onClick={onRetry}
            className="btn btn-primary"
          >
            🔄 Try Again
          </button>
          
          <button 
            onClick={onContactSupport}
            className="btn btn-secondary"
          >
            📞 Contact Support
          </button>
        </div>
        
        <details className="error-details">
          <summary>Technical Details (for developers)</summary>
          <pre>{error.message}</pre>
        </details>
      </div>
    </div>
  );
}

// ⚡ Example 2: Quote Form with Circuit Breaker and Retry Logic
function QuoteRequestForm() {
  const [formData, setFormData] = useState({
    serviceType: '',
    location: '',
    description: '',
    contactInfo: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Set up circuit breakers for different services
  const quoteProcessingBreaker = CircuitBreakerFactory.create('quote-processing', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000, // 30 seconds
    volumeThreshold: 5,
    name: 'Quote Processing Service',
    onStateChange: (state, metrics) => {
      console.log(`🔄 Quote processing circuit breaker: ${state}`, metrics);
      
      if (state === 'open') {
        setError('🔴 Quote service is temporarily unavailable. Please try again in a few minutes.');
      }
    }
  });

  const pricingServiceBreaker = CircuitBreakerFactory.create('pricing-service', {
    failureThreshold: 5,
    timeout: 60000, // 1 minute
    name: 'Pricing Service'
  });

  // Set up retry logic
  const submitRetry = new RetryManager({
    maxAttempts: 3,
    strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
    baseDelay: 1000,
    maxDelay: 10000,
    jitter: true,
    onRetry: (error, attempt, delay) => {
      console.log(`🔄 Retrying quote submission (attempt ${attempt}) in ${delay}ms`);
    },
    name: 'Quote Submission'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Step 1: Get pricing with circuit breaker protection
      const pricing = await pricingServiceBreaker.execute(async () => {
        const response = await fetch('/api/pricing/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceType: formData.serviceType,
            location: formData.location
          })
        });

        if (!response.ok) {
          throw new Error(`Pricing service failed: ${response.status}`);
        }

        return response.json();
      });

      // Step 2: Submit quote with retry logic and circuit breaker
      const quote = await quoteProcessingBreaker.execute(async () => {
        return await submitRetry.execute(async () => {
          const response = await fetch('/api/quotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...formData,
              pricing,
              timestamp: Date.now()
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Quote submission failed: ${response.status} - ${errorText}`);
          }

          return response.json();
        });
      });

      console.log('✅ Quote submitted successfully:', quote);
      setSuccess(true);
      
      // Reset form
      setFormData({
        serviceType: '',
        location: '',
        description: '',
        contactInfo: ''
      });

    } catch (error) {
      console.error('❌ Quote submission failed:', error);
      
      // Check circuit breaker states for better error messages
      if (quoteProcessingBreaker.isOpen()) {
        setError('🔴 Quote service is temporarily down. Please try again in a few minutes.');
      } else if (pricingServiceBreaker.isOpen()) {
        setError('📊 Pricing service is unavailable. Please try again later or contact support.');
      } else {
        setError('❌ Failed to submit quote. Please check your information and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="quote-form">
      <div className="form-group">
        <label htmlFor="serviceType">Service Type:</label>
        <select
          id="serviceType"
          value={formData.serviceType}
          onChange={(e) => setFormData(prev => ({ ...prev, serviceType: e.target.value }))}
          required
        >
          <option value="">Select a service</option>
          <option value="concrete">Concrete Work</option>
          <option value="landscaping">Landscaping</option>
          <option value="demolition">Demolition</option>
          <option value="painting">Painting</option>
          <option value="snow-removal">Snow Removal</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="location">Location:</label>
        <input
          id="location"
          type="text"
          value={formData.location}
          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          placeholder="City, State"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Project Description:</label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe your project..."
          rows={4}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="contactInfo">Contact Information:</label>
        <input
          id="contactInfo"
          type="text"
          value={formData.contactInfo}
          onChange={(e) => setFormData(prev => ({ ...prev, contactInfo: e.target.value }))}
          placeholder="Phone or email"
          required
        />
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          ✅ Quote request submitted successfully! We'll contact you soon.
        </div>
      )}

      <button 
        type="submit" 
        disabled={loading}
        className="btn btn-primary"
      >
        {loading ? '⏳ Submitting...' : '📋 Submit Quote Request'}
      </button>
    </form>
  );
}

// 🏗️ Example 3: Service Cards with Individual Error Boundaries
export function ServicesGrid() {
  const services = [
    'concrete',
    'landscaping', 
    'demolition',
    'painting',
    'snow-removal'
  ];

  return (
    <div className="services-grid">
      <h2>Our Services</h2>
      <div className="grid">
        {services.map(service => (
          <ErrorBoundary
            key={service}
            errorBoundaryId={`service-${service}`}
            fallback={() => (
              <ServiceCardFallback 
                serviceName={service}
                onRetry={() => window.location.reload()}
              />
            )}
            enableRetry={true}
            maxRetries={2}
          >
            <ServiceCard serviceType={service} />
          </ErrorBoundary>
        ))}
      </div>
    </div>
  );
}

function ServiceCard({ serviceType }: { serviceType: string }) {
  const [serviceData, setServiceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadServiceData();
  }, [serviceType]);

  const loadServiceData = async () => {
    setLoading(true);
    setError(null);

    // Create service-specific circuit breaker
    const serviceBreaker = CircuitBreakerFactory.create(`service-data-${serviceType}`, {
      failureThreshold: 2,
      timeout: 30000,
      name: `${serviceType} Service Data`
    });

    // Create retry logic for data loading
    const dataRetry = new RetryManager({
      maxAttempts: 3,
      strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
      baseDelay: 1000,
      maxDelay: 5000,
      retryCondition: (error, attempt) => {
        // Only retry on network errors or timeouts
        return error.message.includes('fetch') || 
               error.message.includes('timeout') ||
               attempt < 2;
      }
    });

    try {
      const data = await serviceBreaker.execute(async () => {
        return await dataRetry.execute(async () => {
          const response = await fetch(`/api/services/${serviceType}`);
          
          if (!response.ok) {
            throw new Error(`Failed to load ${serviceType} data: ${response.status}`);
          }
          
          return response.json();
        });
      });

      setServiceData(data);
    } catch (error) {
      console.error(`Failed to load ${serviceType} service data:`, error);
      setError((error as Error).message);
      
      // Use fallback data
      setServiceData(getFallbackServiceData(serviceType));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ServiceCardSkeleton />;
  }

  if (error && !serviceData) {
    return (
      <ServiceCardError 
        serviceName={serviceType}
        error={error}
        onRetry={loadServiceData} 
      />
    );
  }

  return (
    <div className="service-card">
      <h3>{serviceData.name}</h3>
      <p>{serviceData.description}</p>
      <div className="service-features">
        {serviceData.features?.map((feature: string, index: number) => (
          <span key={index} className="feature-tag">{feature}</span>
        ))}
      </div>
      <button className="btn btn-outline">
        Learn More
      </button>
    </div>
  );
}

// 📊 Example 4: Resilience Monitoring Dashboard
export function ResilienceMonitoringWidget() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResilienceMetrics();
    const interval = setInterval(loadResilienceMetrics, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadResilienceMetrics = async () => {
    try {
      const resilience = getResilience();
      const healthStatus = await resilience.performHealthCheck();
      const comprehensiveMetrics = resilience.getComprehensiveMetrics();
      
      setMetrics({
        health: healthStatus,
        metrics: comprehensiveMetrics
      });
    } catch (error) {
      console.error('Failed to load resilience metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading resilience metrics...</div>;
  }

  if (!metrics) {
    return <div>Failed to load metrics</div>;
  }

  return (
    <div className="resilience-widget">
      <h3>🛡️ System Resilience Status</h3>
      
      <div className="health-indicator">
        <span className={`status ${metrics.health.overall}`}>
          {metrics.health.overall === 'healthy' ? '✅' : 
           metrics.health.overall === 'degraded' ? '⚠️' : '🔴'}
        </span>
        <span>Overall Status: {metrics.health.overall}</span>
      </div>

      <div className="metrics-grid">
        <div className="metric">
          <label>Circuit Breakers:</label>
          <span>
            {metrics.metrics.summary.totalCircuitBreakers} total,{' '}
            {metrics.metrics.summary.openCircuitBreakers} open
          </span>
        </div>
        
        <div className="metric">
          <label>Total Failures:</label>
          <span>{metrics.metrics.summary.totalFailures}</span>
        </div>
        
        <div className="metric">
          <label>System Health:</label>
          <span className={metrics.metrics.summary.overallHealth}>
            {metrics.metrics.summary.overallHealth}
          </span>
        </div>
      </div>

      <button onClick={loadResilienceMetrics} className="refresh-btn">
        🔄 Refresh
      </button>
    </div>
  );
}

// Helper components and functions
function ServiceCardSkeleton() {
  return (
    <div className="service-card skeleton">
      <div className="skeleton-title"></div>
      <div className="skeleton-text"></div>
      <div className="skeleton-text"></div>
      <div className="skeleton-button"></div>
    </div>
  );
}

function ServiceCardError({ 
  serviceName, 
  error, 
  onRetry 
}: { 
  serviceName: string; 
  error: string; 
  onRetry: () => void; 
}) {
  return (
    <div className="service-card error">
      <h3>⚠️ {serviceName}</h3>
      <p>Unable to load service information</p>
      <button onClick={onRetry} className="btn btn-small">
        🔄 Retry
      </button>
    </div>
  );
}

function ServiceCardFallback({ 
  serviceName, 
  onRetry 
}: { 
  serviceName: string; 
  onRetry: () => void; 
}) {
  return (
    <div className="service-card fallback">
      <h3>🔧 {serviceName}</h3>
      <p>Service temporarily unavailable</p>
      <button onClick={onRetry} className="btn btn-small">
        🔄 Try Again
      </button>
    </div>
  );
}

function getFallbackServiceData(serviceType: string) {
  const fallbacks: Record<string, any> = {
    concrete: {
      name: 'Concrete Services',
      description: 'Professional concrete work for residential and commercial projects.',
      features: ['Driveways', 'Patios', 'Foundations']
    },
    landscaping: {
      name: 'Landscaping Services', 
      description: 'Complete landscape design and maintenance services.',
      features: ['Design', 'Installation', 'Maintenance']
    },
    demolition: {
      name: 'Demolition Services',
      description: 'Safe and efficient demolition for all project sizes.',
      features: ['Residential', 'Commercial', 'Site Cleanup']
    },
    painting: {
      name: 'Painting Services',
      description: 'Interior and exterior painting by skilled professionals.',
      features: ['Interior', 'Exterior', 'Commercial']
    },
    'snow-removal': {
      name: 'Snow Removal',
      description: '24/7 snow removal and ice management services.',
      features: ['Residential', 'Commercial', '24/7 Service']
    }
  };

  return fallbacks[serviceType] || {
    name: 'Service',
    description: 'Professional service available.',
    features: []
  };
}

// 🎯 Example 5: Complete App with Resilience
export function VSRAppWithResilience() {
  return (
    <ErrorBoundary
      fallback={(error, errorInfo, retry) => (
        <div className="app-error">
          <h1>🔧 VSR Landing - Temporary Issue</h1>
          <p>We're experiencing a temporary issue. Please try refreshing the page.</p>
          <button onClick={retry}>🔄 Refresh Page</button>
        </div>
      )}
      errorBoundaryId="main-app"
    >
      <div className="vsr-app">
        <header>
          <h1>VSR Landing</h1>
          <ResilienceMonitoringWidget />
        </header>
        
        <main>
          <QuoteRequestPage />
          <ServicesGrid />
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default VSRAppWithResilience;