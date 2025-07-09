/**
 * VSR Landing Observability Health Check
 * Comprehensive health verification for the observability system
 */

import {
  getSystemHealth,
  observability,
  logger,
  metricsCollector,
  distributedTracing,
  performanceMonitoring,
  alertingSystem,
  resilienceObservability
} from '../src/observability';

export async function performObservabilityHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, any>;
  timestamp: number;
}> {
  const healthCheck = {
    status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
    components: {} as Record<string, any>,
    timestamp: Date.now()
  };

  console.log('🔍 Performing VSR Landing Observability Health Check...');

  try {
    // 1. Check ObservabilityCore
    const coreHealth = await observability.getHealthStatus();
    healthCheck.components.observabilityCore = {
      status: coreHealth.status,
      uptime: coreHealth.uptime,
      activeSpans: coreHealth.activeSpans,
      metricsCollected: coreHealth.metricsCollected
    };
    console.log(`✅ ObservabilityCore: ${coreHealth.status}`);

    // 2. Check Logger
    try {
      logger.info('Health check test log entry', { component: 'health_check' });
      healthCheck.components.logger = { status: 'healthy' };
      console.log('✅ Logger: healthy');
    } catch (error) {
      healthCheck.components.logger = { 
        status: 'unhealthy', 
        error: (error as Error).message 
      };
      console.log('❌ Logger: unhealthy');
      healthCheck.status = 'unhealthy';
    }

    // 3. Check MetricsCollector
    try {
      metricsCollector.recordCounter('health_check.test', 1, { component: 'health_check' });
      const testMetrics = metricsCollector.getMetricValues('health_check.test');
      healthCheck.components.metricsCollector = { 
        status: 'healthy',
        testMetrics: testMetrics.length
      };
      console.log('✅ MetricsCollector: healthy');
    } catch (error) {
      healthCheck.components.metricsCollector = { 
        status: 'unhealthy', 
        error: (error as Error).message 
      };
      console.log('❌ MetricsCollector: unhealthy');
      healthCheck.status = 'unhealthy';
    }

    // 4. Check DistributedTracing
    try {
      const testTrace = distributedTracing.startTrace('health_check_test');
      distributedTracing.addSpanTag(testTrace, 'test', 'true');
      distributedTracing.finishSpan(testTrace);
      healthCheck.components.distributedTracing = { 
        status: 'healthy',
        testTraceId: testTrace.traceId.substring(0, 8)
      };
      console.log('✅ DistributedTracing: healthy');
    } catch (error) {
      healthCheck.components.distributedTracing = { 
        status: 'unhealthy', 
        error: (error as Error).message 
      };
      console.log('❌ DistributedTracing: unhealthy');
      healthCheck.status = 'unhealthy';
    }

    // 5. Check PerformanceMonitoring
    try {
      const perfSummary = performanceMonitoring.getPerformanceSummary();
      healthCheck.components.performanceMonitoring = { 
        status: 'healthy',
        totalOperations: perfSummary.totalOperations,
        averageResponseTime: perfSummary.averageResponseTime
      };
      console.log('✅ PerformanceMonitoring: healthy');
    } catch (error) {
      healthCheck.components.performanceMonitoring = { 
        status: 'unhealthy', 
        error: (error as Error).message 
      };
      console.log('❌ PerformanceMonitoring: unhealthy');
      healthCheck.status = 'unhealthy';
    }

    // 6. Check AlertingSystem
    try {
      const alertMetrics = alertingSystem.getAlertMetrics();
      healthCheck.components.alertingSystem = { 
        status: 'healthy',
        activeAlerts: alertMetrics.activeAlerts,
        totalAlerts: alertMetrics.totalAlerts
      };
      console.log('✅ AlertingSystem: healthy');
    } catch (error) {
      healthCheck.components.alertingSystem = { 
        status: 'unhealthy', 
        error: (error as Error).message 
      };
      console.log('❌ AlertingSystem: unhealthy');
      healthCheck.status = 'unhealthy';
    }

    // 7. Check ResilienceIntegration
    try {
      const resilienceHealth = await resilienceObservability.monitorResilienceHealth();
      healthCheck.components.resilienceIntegration = { 
        status: resilienceHealth.overall,
        services: Object.keys(resilienceHealth.services).length
      };
      console.log(`✅ ResilienceIntegration: ${resilienceHealth.overall}`);
      
      if (resilienceHealth.overall !== 'healthy' && healthCheck.status === 'healthy') {
        healthCheck.status = 'degraded';
      }
    } catch (error) {
      healthCheck.components.resilienceIntegration = { 
        status: 'unhealthy', 
        error: (error as Error).message 
      };
      console.log('❌ ResilienceIntegration: unhealthy');
      healthCheck.status = 'unhealthy';
    }

    // 8. Overall system health check
    try {
      const systemHealth = await getSystemHealth();
      healthCheck.components.systemHealth = systemHealth;
      
      if (systemHealth.overall !== 'healthy' && healthCheck.status === 'healthy') {
        healthCheck.status = systemHealth.overall;
      }
      
      console.log(`✅ SystemHealth: ${systemHealth.overall}`);
    } catch (error) {
      healthCheck.components.systemHealth = { 
        overall: 'unhealthy', 
        error: (error as Error).message 
      };
      console.log('❌ SystemHealth: unhealthy');
      healthCheck.status = 'unhealthy';
    }

    // Record health check metrics
    metricsCollector.recordCounter('health_check.completed', 1, {
      status: healthCheck.status
    });

    // Log health check results
    logger.info('Observability health check completed', {
      status: healthCheck.status,
      components_checked: Object.keys(healthCheck.components).length,
      healthy_components: Object.values(healthCheck.components)
        .filter((c: any) => c.status === 'healthy').length,
      component: 'health_check'
    });

  } catch (error) {
    healthCheck.status = 'unhealthy';
    healthCheck.components.healthCheck = { 
      status: 'unhealthy', 
      error: (error as Error).message 
    };
    
    logger.error('Health check failed', error as Error, {
      component: 'health_check'
    });
  }

  console.log(`\n🎯 Overall Status: ${healthCheck.status.toUpperCase()}`);
  console.log(`📊 Components Checked: ${Object.keys(healthCheck.components).length}`);
  console.log(`✅ Healthy Components: ${Object.values(healthCheck.components).filter((c: any) => c.status === 'healthy').length}`);
  
  return healthCheck;
}

// Quick system status check
export function getQuickStatus() {
  console.log('\n📊 VSR Landing Observability Quick Status:');
  console.log('==========================================');
  
  // Active alerts
  const activeAlerts = alertingSystem.getActiveAlerts();
  console.log(`🚨 Active Alerts: ${activeAlerts.length}`);
  
  // Recent metrics
  const alertMetrics = alertingSystem.getAlertMetrics();
  console.log(`📈 Total Alerts Today: ${alertMetrics.totalAlerts}`);
  
  // Performance summary
  const perfSummary = performanceMonitoring.getPerformanceSummary();
  console.log(`⚡ Operations Monitored: ${perfSummary.totalOperations}`);
  console.log(`📊 Avg Response Time: ${Math.round(perfSummary.averageResponseTime)}ms`);
  
  // System health indicator
  const systemHealth = observability.getHealthStatus();
  console.log(`💚 System Status: ${systemHealth.status}`);
  console.log(`⏱️  Uptime: ${Math.round(systemHealth.uptime / 60000)} minutes`);
  
  console.log('==========================================\n');
}

// Demo function to show observability in action
export async function demoObservabilityFeatures() {
  console.log('🎬 Demonstrating VSR Landing Observability Features...\n');
  
  // 1. Trace a sample operation
  console.log('1. 🔍 Distributed Tracing Demo:');
  const trace = distributedTracing.startTrace('demo_operation');
  distributedTracing.addSpanTag(trace, 'demo', 'true');
  distributedTracing.addSpanTag(trace, 'user.id', 'demo_user');
  
  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, 100));
  
  distributedTracing.addSpanLog(trace, 'demo.completed', { 
    duration: 100,
    result: 'success' 
  });
  distributedTracing.finishSpan(trace);
  console.log(`   ✅ Created trace: ${trace.traceId.substring(0, 8)}`);
  
  // 2. Record metrics
  console.log('\n2. 📊 Metrics Collection Demo:');
  metricsCollector.recordCounter('demo.operations', 1, { type: 'demo' });
  metricsCollector.recordHistogram('demo.duration', 100, { operation: 'demo' });
  metricsCollector.recordBusinessEvent('demo_event', 1, { 
    user_id: 'demo_user',
    value: 42 
  });
  console.log('   ✅ Recorded demo metrics');
  
  // 3. Performance monitoring
  console.log('\n3. ⚡ Performance Monitoring Demo:');
  const duration = await performanceMonitoring.profileOperation(
    'demo_computation',
    'demo',
    async (context) => {
      // Simulate computation
      await new Promise(resolve => setTimeout(resolve, 50));
      return { result: 'computed' };
    }
  );
  console.log(`   ✅ Profiled operation: ${duration}ms`);
  
  // 4. Structured logging
  console.log('\n4. 📝 Structured Logging Demo:');
  const demoLogger = logger.withContext({ demo: 'true', user_id: 'demo_user' });
  demoLogger.info('Demo operation started');
  demoLogger.business('demo_conversion', 1, { value: 100 });
  demoLogger.performance('demo_performance', 50);
  console.log('   ✅ Generated structured logs');
  
  // 5. Test alert (low severity)
  console.log('\n5. 🚨 Alerting System Demo:');
  alertingSystem.createAlert(
    'demo_alert',
    'Demo Alert',
    'This is a demonstration alert',
    'demo.metric',
    100,
    50,
    'low',
    { demo: 'true' }
  );
  console.log('   ✅ Created demo alert');
  
  console.log('\n🎯 Demo completed! Check your console for observability output.');
}

// Run health check if this file is executed directly
if (require.main === module) {
  performObservabilityHealthCheck()
    .then(result => {
      console.log('\n📋 Health Check Results:');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.status === 'healthy' ? 0 : 1);
    })
    .catch(error => {
      console.error('Health check failed:', error);
      process.exit(1);
    });
}