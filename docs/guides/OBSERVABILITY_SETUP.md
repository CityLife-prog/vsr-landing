# VSR Landing Observability System Setup

## 🎯 **Complete Observability Implementation**

The VSR Landing application now includes a comprehensive observability system with:
- **Metrics Collection** - Business and technical metrics with time-series aggregation
- **Distributed Tracing** - Request flow tracking with correlation IDs  
- **Structured Logging** - Context-aware logging with automatic enrichment
- **Performance Monitoring** - APM with Web Vitals and anomaly detection
- **Alerting System** - Intelligent notifications with escalation
- **Dashboard** - Real-time monitoring interface
- **Resilience Integration** - Deep integration with circuit breakers and retry logic

## 🚀 **Quick Start**

### 1. Initialize the Observability System

```typescript
import { initializeObservability } from '@/observability';

// Initialize with default configuration
initializeObservability({
  serviceName: 'vsr-landing',
  environment: process.env.NODE_ENV || 'development',
  enableConsoleOutput: true,
  enableFileOutput: false,
  enableHttpExports: false
});
```

### 2. Basic Usage Examples

```typescript
import { 
  logger, 
  metricsCollector, 
  distributedTracing,
  instrumentHttpRequest,
  trackUserAction,
  measurePerformance
} from '@/observability';

// Simple logging with correlation
const requestLogger = logger.withContext({ userId: '123', sessionId: 'abc' });
requestLogger.info('User submitted quote request', { service: 'concrete' });

// HTTP request instrumentation
const quotes = await instrumentHttpRequest('GET', '/api/quotes', async (context) => {
  return fetchQuotes();
});

// User action tracking
trackUserAction('quote_submitted', userId, { 
  service: 'concrete',
  amount: 5000 
});

// Performance measurement
const result = measurePerformance('data_processing', () => {
  return processLargeDataset();
}, { warning: 1000, critical: 5000 });

// Business metrics
metricsCollector.recordBusinessEvent('quote_converted', 1, {
  revenue: 5000,
  service_type: 'concrete',
  customer_id: 'cust_123'
});
```

## 📊 **Core Components**

### **ObservabilityCore** - `/src/observability/ObservabilityCore.ts`
- Unified observability infrastructure
- Metrics, tracing, and logging coordination
- Health monitoring and status reporting

### **Logger** - `/src/observability/Logger.ts`
- Structured logging with correlation IDs
- Context-aware logging
- Multiple formatters (JSON, console)
- Sensitive data redaction
- Component-specific loggers

### **DistributedTracing** - `/src/observability/DistributedTracing.ts`
- OpenTelemetry-compatible tracing
- W3C Trace Context support
- Context propagation across services
- Automatic instrumentation helpers
- Console and HTTP exporters

### **MetricsCollector** - `/src/observability/MetricsCollector.ts`
- Counter, gauge, histogram metrics
- Time-series data aggregation
- System metrics (memory, CPU)
- Business metrics tracking
- Prometheus-compatible exports

### **PerformanceMonitoring** - `/src/observability/PerformanceMonitoring.ts`
- Real User Monitoring (RUM)
- Application Performance Monitoring (APM)
- Web Vitals collection
- Memory leak detection
- Performance baselines and anomaly detection

### **AlertingSystem** - `/src/observability/AlertingSystem.ts`
- Rule-based alerting
- Multi-channel notifications
- Alert deduplication and suppression
- Escalation with cooldown periods
- Alert acknowledgment and resolution

### **ResilienceIntegration** - `/src/observability/ResilienceIntegration.ts`
- Circuit breaker monitoring
- Retry attempt correlation
- Failure event tracking
- Health status integration

### **ObservabilityDashboard** - `/src/observability/ObservabilityDashboard.tsx`
- Real-time monitoring interface
- Multiple dashboard views
- System health indicators
- Time range selection and auto-refresh

## 🛠 **Advanced Usage**

### **Custom Instrumentation**

```typescript
import { distributedTracing, logger, metricsCollector } from '@/observability';

// Manual span creation
const context = distributedTracing.startTrace('custom_operation');
distributedTracing.addSpanTag(context, 'user.id', userId);
distributedTracing.addSpanLog(context, 'operation.started', { input: data });

try {
  const result = await customOperation(data);
  distributedTracing.finishSpan(context);
  return result;
} catch (error) {
  distributedTracing.finishSpan(context, SpanStatus.ERROR, error);
  throw error;
}

// Custom metrics
metricsCollector.recordCounter('custom.operations', 1, {
  operation_type: 'data_sync',
  success: 'true'
});

metricsCollector.recordHistogram('custom.duration', duration, {
  operation: 'data_processing'
});
```

### **Database Operation Instrumentation**

```typescript
import { instrumentDatabaseOperation } from '@/observability';

const users = await instrumentDatabaseOperation(
  'select',
  'users',
  async (context) => {
    return db.query('SELECT * FROM users WHERE active = true');
  }
);
```

### **Cache Operation Instrumentation**

```typescript
import { instrumentCacheOperation } from '@/observability';

const cachedData = await instrumentCacheOperation(
  'get',
  'user_quotes_123',
  async (context) => {
    return redis.get('user_quotes_123');
  }
);
```

### **Business Operation Instrumentation**

```typescript
import { instrumentBusinessOperation } from '@/observability';

const quote = await instrumentBusinessOperation(
  'quote_generation',
  async (context) => {
    return generateQuote(quoteRequest);
  },
  { 
    service_type: 'concrete',
    customer_segment: 'enterprise' 
  }
);
```

## 📈 **Metrics Available**

### **System Metrics**
- `system.memory.heap_used`
- `system.memory.heap_total`
- `system.cpu.user`
- `system.cpu.system`
- `system.uptime`
- `system.active_handles`

### **Application Metrics**
- `api.requests` - HTTP request count
- `api.request.duration` - HTTP response times
- `api.errors` - HTTP error count
- `database.queries` - Database query count
- `database.query.duration` - Database response times
- `cache.operations` - Cache operation count
- `cache.hits` / `cache.misses` - Cache hit/miss rates

### **Business Metrics**
- `business.events` - Business event count
- `business.revenue` - Revenue tracking
- `user.actions` - User action count
- `errors.total` - Error count by component

### **Resilience Metrics**
- `resilience.circuit_breaker.state_changes`
- `resilience.circuit_breaker.requests`
- `resilience.retry.attempts`
- `resilience.failures.total`

### **Performance Metrics**
- `web_vitals.lcp` - Largest Contentful Paint
- `web_vitals.fid` - First Input Delay
- `web_vitals.cls` - Cumulative Layout Shift
- `performance.{component}.{operation}` - Operation durations
- `alerts.created` - Alert count

## 🔍 **Tracing Features**

### **Automatic Context Propagation**
- Trace IDs and span IDs automatically propagated
- Correlation IDs for request tracking
- Baggage for custom context data
- W3C Trace Context headers

### **Instrumentation Helpers**
- HTTP request/response instrumentation
- Database operation instrumentation
- Cache operation instrumentation
- Business logic instrumentation

### **Span Enrichment**
- Automatic service metadata
- Custom tags and logs
- Error tracking
- Performance metrics

## 📝 **Logging Features**

### **Structured Logging**
- JSON and console formatters
- Automatic context enrichment
- Correlation ID propagation
- Sensitive data redaction

### **Specialized Loggers**
```typescript
// HTTP logging
logger.http('GET', '/api/quotes', 200, 150);

// Database logging
logger.database('select', 'quotes', 75, 10);

// Cache logging
logger.cache('get', 'user_data_123', true, 5);

// Security logging
logger.security('login_attempt', userId, { ip: '192.168.1.1' });

// Business logging
logger.business('quote_generated', 1, { amount: 5000 });

// Performance logging
logger.performance('data_processing', 1250);
```

### **Context Management**
```typescript
// Add context to logger
const contextLogger = logger.withContext({
  userId: '123',
  sessionId: 'abc',
  feature: 'quote_system'
});

// Add tags
const taggedLogger = logger.withTags('critical', 'payment');

// Combine with correlation
const correlatedLogger = logger.withCorrelation(traceContext);
```

## 🚨 **Alerting Configuration**

### **Default Alert Rules**
- High error rate (>10 errors/5min)
- High response time (>2000ms avg)
- High memory usage (>1GB)
- Circuit breaker opened

### **Custom Alert Rules**
```typescript
import { alertingSystem } from '@/observability';

alertingSystem.addAlertRule({
  id: 'quote_conversion_rate',
  name: 'Low Quote Conversion Rate',
  description: 'Quote conversion rate below threshold',
  enabled: true,
  conditions: [{
    metric: 'business.quote_conversion_rate',
    operator: 'lt',
    threshold: 15, // Less than 15%
    timeWindow: 1800000, // 30 minutes
    aggregation: 'avg'
  }],
  severity: 'medium',
  channels: ['console', 'email'],
  cooldownPeriod: 3600000 // 1 hour
});
```

### **Alert Channels**
```typescript
// Add Slack notifications
alertingSystem.addAlertChannel({
  id: 'slack_alerts',
  type: 'slack',
  enabled: true,
  config: {
    webhook: 'https://hooks.slack.com/services/...'
  },
  severityFilter: ['high', 'critical']
});

// Add email notifications
alertingSystem.addAlertChannel({
  id: 'email_alerts',
  type: 'email',
  enabled: true,
  config: {
    recipient: 'alerts@vsr.com',
    smtp: { /* SMTP config */ }
  },
  severityFilter: ['medium', 'high', 'critical']
});
```

## 🎛 **Dashboard Usage**

### **Access Dashboard**
```typescript
import { ObservabilityDashboard } from '@/observability';

// In your React app
function MonitoringPage() {
  return <ObservabilityDashboard />;
}
```

### **Dashboard Features**
- **Overview** - System health and key metrics
- **Metrics** - Time-series charts and aggregations
- **Traces** - Distributed trace visualization
- **Logs** - Structured log search and filtering
- **Resilience** - Circuit breaker and retry status
- **Performance** - APM metrics and Web Vitals
- **Alerts** - Active alerts and alert history

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Service identification
SERVICE_NAME=vsr-landing
SERVICE_VERSION=1.0.0
ENVIRONMENT=production

# Observability settings
ENABLE_OBSERVABILITY=true
ENABLE_CONSOLE_OUTPUT=true
ENABLE_FILE_OUTPUT=false
ENABLE_HTTP_EXPORTS=false

# Export endpoints
METRICS_ENDPOINT=http://prometheus:9090/api/v1/write
TRACES_ENDPOINT=http://jaeger:14268/api/traces
LOGS_ENDPOINT=http://elasticsearch:9200/logs

# Sampling rates
TRACES_SAMPLE_RATE=1.0
METRICS_SAMPLE_RATE=1.0
ERRORS_SAMPLE_RATE=1.0
```

### **Custom Configuration**
```typescript
import { 
  observability, 
  metricsCollector, 
  distributedTracing,
  performanceMonitoring,
  alertingSystem 
} from '@/observability';

// Configure metrics collection
metricsCollector.config.flushInterval = 30000; // 30 seconds
metricsCollector.config.maxMetricsInMemory = 5000;

// Configure distributed tracing
distributedTracing.config.samplingStrategy.rate = 0.1; // 10% sampling
distributedTracing.config.maxSpansPerTrace = 500;

// Configure performance monitoring
performanceMonitoring.config.enableRealUserMonitoring = true;
performanceMonitoring.config.samplingRate = 1.0;

// Configure alerting
alertingSystem.config.enableAlerting = true;
alertingSystem.config.enableDeduplication = true;
```

## 📋 **Integration Checklist**

- ✅ **ObservabilityCore** - Unified infrastructure
- ✅ **Structured Logging** - Context-aware logging system
- ✅ **Distributed Tracing** - Request flow tracking
- ✅ **Metrics Collection** - Business and technical metrics
- ✅ **Performance Monitoring** - APM and Web Vitals
- ✅ **Alerting System** - Intelligent notifications
- ✅ **Dashboard** - Real-time monitoring interface
- ✅ **Resilience Integration** - Circuit breaker and retry monitoring

## 🚀 **Next Steps**

1. **Initialize** the observability system in your application startup
2. **Add instrumentation** to critical business operations
3. **Configure alerts** for key metrics and thresholds
4. **Set up dashboards** for monitoring and troubleshooting
5. **Integrate** with external monitoring services (optional)

The observability system is production-ready and provides comprehensive monitoring capabilities for the VSR Landing application!