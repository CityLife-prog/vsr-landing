/**
 * DI Container Observability Integration
 * Integration with the existing observability system for monitoring DI operations
 */

import {
  Container,
  ServiceToken,
  ResolutionContext,
  ServiceRegistration,
  ServiceLifetime,
  DIError
} from './types';
import { ServiceInterceptor } from './types';

// Observability imports (with fallbacks)
let logger: any;
let metricsCollector: any;
let distributedTracing: any;
let performanceMonitoring: any;

try {
  const observability = require('../observability');
  logger = observability.logger;
  metricsCollector = observability.metricsCollector;
  distributedTracing = observability.distributedTracing;
  performanceMonitoring = observability.performanceMonitoring;
} catch (error) {
  // Fallback implementations
  logger = {
    debug: console.debug.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  };
  metricsCollector = {
    recordCounter: () => {},
    recordTimer: () => {},
    recordGauge: () => {},
    recordHistogram: () => {}
  };
  distributedTracing = {
    startTrace: () => ({}),
    startChildSpan: () => ({}),
    addSpanTag: () => {},
    addSpanLog: () => {},
    finishSpan: () => {}
  };
  performanceMonitoring = {
    profileOperation: async (name: string, component: string, fn: Function) => fn()
  };
}

// Observable container wrapper
export class ObservableContainer implements Container {
  constructor(private container: Container) {}

  // Service registration with observability
  register<T>(registration: ServiceRegistration<T>): Container {
    const startTime = Date.now();
    
    try {
      const result = this.container.register(registration);
      
      // Record metrics
      metricsCollector.recordCounter('di.service.registered', 1, {
        token: String(registration.token),
        lifetime: registration.lifetime,
        has_factory: !!registration.factory,
        has_constructor: !!registration.constructor,
        has_instance: !!registration.instance,
        dependency_count: registration.dependencies?.length || 0
      });

      logger.debug('Service registered', {
        token: String(registration.token),
        lifetime: registration.lifetime,
        component: 'di_container'
      });

      return this;
    } catch (error) {
      metricsCollector.recordCounter('di.service.registration_failed', 1, {
        token: String(registration.token),
        error_type: (error as Error).constructor.name
      });
      
      logger.error('Service registration failed', error as Error, {
        token: String(registration.token),
        component: 'di_container'
      });
      
      throw error;
    } finally {
      metricsCollector.recordTimer('di.service.registration_duration', Date.now() - startTime, {
        token: String(registration.token)
      });
    }
  }

  registerSingleton<T>(token: ServiceToken<T>, factoryOrConstructor: any): Container {
    return this.container.registerSingleton(token, factoryOrConstructor);
  }

  registerTransient<T>(token: ServiceToken<T>, factoryOrConstructor: any): Container {
    return this.container.registerTransient(token, factoryOrConstructor);
  }

  registerScoped<T>(token: ServiceToken<T>, factoryOrConstructor: any): Container {
    return this.container.registerScoped(token, factoryOrConstructor);
  }

  registerInstance<T>(token: ServiceToken<T>, instance: T): Container {
    return this.container.registerInstance(token, instance);
  }

  // Service resolution with observability
  resolve<T>(token: ServiceToken<T>): T {
    const context = distributedTracing.startTrace('di.service.resolve');
    const startTime = Date.now();
    
    try {
      distributedTracing.addSpanTag(context, 'di.token', String(token));
      
      const result = this.container.resolve<T>(token);
      const duration = Date.now() - startTime;
      
      // Record metrics
      metricsCollector.recordCounter('di.service.resolved', 1, {
        token: String(token),
        success: 'true'
      });
      
      metricsCollector.recordTimer('di.service.resolution_duration', duration, {
        token: String(token)
      });

      logger.debug('Service resolved', {
        token: String(token),
        duration,
        component: 'di_container'
      });

      distributedTracing.addSpanTag(context, 'di.resolution.duration_ms', duration);
      distributedTracing.finishSpan(context);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      metricsCollector.recordCounter('di.service.resolution_failed', 1, {
        token: String(token),
        error_type: (error as Error).constructor.name
      });
      
      metricsCollector.recordTimer('di.service.resolution_duration', duration, {
        token: String(token),
        success: 'false'
      });

      logger.error('Service resolution failed', error as Error, {
        token: String(token),
        duration,
        component: 'di_container'
      });

      distributedTracing.addSpanTag(context, 'error', true);
      distributedTracing.addSpanTag(context, 'error.type', (error as Error).constructor.name);
      distributedTracing.finishSpan(context, undefined, error as Error);
      
      throw error;
    }
  }

  async resolveAsync<T>(token: ServiceToken<T>): Promise<T> {
    const context = distributedTracing.startTrace('di.service.resolve_async');
    
    try {
      distributedTracing.addSpanTag(context, 'di.token', String(token));
      
      const result = await performanceMonitoring.profileOperation(
        'resolve_async',
        'di_container',
        async () => this.container.resolveAsync<T>(token),
        context
      );

      metricsCollector.recordCounter('di.service.resolved_async', 1, {
        token: String(token),
        success: 'true'
      });

      logger.debug('Service resolved asynchronously', {
        token: String(token),
        component: 'di_container'
      });

      distributedTracing.finishSpan(context);
      return result;
    } catch (error) {
      metricsCollector.recordCounter('di.service.resolution_async_failed', 1, {
        token: String(token),
        error_type: (error as Error).constructor.name
      });

      logger.error('Async service resolution failed', error as Error, {
        token: String(token),
        component: 'di_container'
      });

      distributedTracing.addSpanTag(context, 'error', true);
      distributedTracing.finishSpan(context, undefined, error as Error);
      throw error;
    }
  }

  resolveAll<T>(token: ServiceToken<T>): T[] {
    const startTime = Date.now();
    
    try {
      const results = this.container.resolveAll<T>(token);
      
      metricsCollector.recordCounter('di.service.resolved_all', 1, {
        token: String(token),
        count: results.length
      });
      
      metricsCollector.recordTimer('di.service.resolve_all_duration', Date.now() - startTime, {
        token: String(token)
      });

      logger.debug('All services resolved', {
        token: String(token),
        count: results.length,
        component: 'di_container'
      });
      
      return results;
    } catch (error) {
      metricsCollector.recordCounter('di.service.resolve_all_failed', 1, {
        token: String(token),
        error_type: (error as Error).constructor.name
      });

      logger.error('Resolve all services failed', error as Error, {
        token: String(token),
        component: 'di_container'
      });
      
      throw error;
    }
  }

  resolveOptional<T>(token: ServiceToken<T>): T | undefined {
    return this.container.resolveOptional<T>(token);
  }

  tryResolve<T>(token: ServiceToken<T>): { success: boolean; instance?: T; error?: Error } {
    const result = this.container.tryResolve<T>(token);
    
    metricsCollector.recordCounter('di.service.try_resolve', 1, {
      token: String(token),
      success: result.success.toString()
    });
    
    return result;
  }

  // Service management with observability
  isRegistered<T>(token: ServiceToken<T>): boolean {
    return this.container.isRegistered<T>(token);
  }

  unregister<T>(token: ServiceToken<T>): boolean {
    const result = this.container.unregister<T>(token);
    
    if (result) {
      metricsCollector.recordCounter('di.service.unregistered', 1, {
        token: String(token)
      });
      
      logger.debug('Service unregistered', {
        token: String(token),
        component: 'di_container'
      });
    }
    
    return result;
  }

  clear(): void {
    this.container.clear();
    
    metricsCollector.recordCounter('di.container.cleared', 1);
    logger.info('Container cleared', { component: 'di_container' });
  }

  // Scope management
  createScope() {
    const scope = this.container.createScope();
    
    metricsCollector.recordCounter('di.scope.created', 1, {
      scope_id: scope.id
    });
    
    logger.debug('Scope created', {
      scope_id: scope.id,
      component: 'di_container'
    });
    
    return scope;
  }

  beginScope(): Container {
    this.container.beginScope();
    metricsCollector.recordCounter('di.scope.begun', 1);
    return this;
  }

  async endScope(): Promise<void> {
    await this.container.endScope();
    metricsCollector.recordCounter('di.scope.ended', 1);
  }

  // Container hierarchy
  createChild(): Container {
    const child = this.container.createChild();
    
    metricsCollector.recordCounter('di.container.child_created', 1);
    logger.debug('Child container created', { component: 'di_container' });
    
    return new ObservableContainer(child);
  }

  getParent(): Container | undefined {
    return this.container.getParent();
  }

  // Introspection with metrics
  getRegistrations(): ServiceRegistration[] {
    const registrations = this.container.getRegistrations();
    
    // Collect registration metrics
    const lifetimeCounts = new Map<ServiceLifetime, number>();
    let withDependencies = 0;
    let withInterceptors = 0;
    
    for (const reg of registrations) {
      lifetimeCounts.set(reg.lifetime, (lifetimeCounts.get(reg.lifetime) || 0) + 1);
      if (reg.dependencies && reg.dependencies.length > 0) withDependencies++;
      if (reg.interceptors && reg.interceptors.length > 0) withInterceptors++;
    }
    
    metricsCollector.recordGauge('di.registrations.total', registrations.length);
    metricsCollector.recordGauge('di.registrations.with_dependencies', withDependencies);
    metricsCollector.recordGauge('di.registrations.with_interceptors', withInterceptors);
    
    for (const [lifetime, count] of lifetimeCounts) {
      metricsCollector.recordGauge('di.registrations.by_lifetime', count, {
        lifetime: lifetime
      });
    }
    
    return registrations;
  }

  getRegistration<T>(token: ServiceToken<T>): ServiceRegistration<T> | undefined {
    return this.container.getRegistration<T>(token);
  }

  getDependencyGraph() {
    const graph = this.container.getDependencyGraph();
    
    // Analyze dependency graph
    const circularDeps = graph.filter(node => node.circular).length;
    const maxDependencies = Math.max(...graph.map(node => node.dependencies.length));
    const avgDependencies = graph.reduce((sum, node) => sum + node.dependencies.length, 0) / graph.length;
    
    metricsCollector.recordGauge('di.dependency_graph.nodes', graph.length);
    metricsCollector.recordGauge('di.dependency_graph.circular_dependencies', circularDeps);
    metricsCollector.recordGauge('di.dependency_graph.max_dependencies', maxDependencies);
    metricsCollector.recordGauge('di.dependency_graph.avg_dependencies', avgDependencies);
    
    if (circularDeps > 0) {
      logger.warn('Circular dependencies detected', {
        count: circularDeps,
        component: 'di_container'
      });
    }
    
    return graph;
  }

  // Lifecycle with observability
  async dispose(): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.container.dispose();
      
      metricsCollector.recordTimer('di.container.dispose_duration', Date.now() - startTime);
      metricsCollector.recordCounter('di.container.disposed', 1);
      
      logger.info('Container disposed', {
        duration: Date.now() - startTime,
        component: 'di_container'
      });
    } catch (error) {
      metricsCollector.recordCounter('di.container.dispose_failed', 1);
      
      logger.error('Container dispose failed', error as Error, {
        component: 'di_container'
      });
      
      throw error;
    }
  }
}

// Observability interceptor for DI services
export class DIObservabilityInterceptor implements ServiceInterceptor {
  intercept(target: any, method: string, args: any[], proceed: () => any): any {
    const context = distributedTracing.startTrace(`service.${target.constructor.name}.${method}`);
    const startTime = Date.now();
    
    try {
      distributedTracing.addSpanTag(context, 'service.class', target.constructor.name);
      distributedTracing.addSpanTag(context, 'service.method', method);
      distributedTracing.addSpanTag(context, 'service.args_count', args.length);
      
      const result = proceed();
      
      if (result instanceof Promise) {
        return result
          .then((value) => {
            const duration = Date.now() - startTime;
            this.recordSuccess(target, method, duration);
            distributedTracing.addSpanTag(context, 'service.duration_ms', duration);
            distributedTracing.finishSpan(context);
            return value;
          })
          .catch((error) => {
            const duration = Date.now() - startTime;
            this.recordError(target, method, duration, error);
            distributedTracing.addSpanTag(context, 'error', true);
            distributedTracing.addSpanTag(context, 'error.type', error.constructor.name);
            distributedTracing.finishSpan(context, undefined, error);
            throw error;
          });
      } else {
        const duration = Date.now() - startTime;
        this.recordSuccess(target, method, duration);
        distributedTracing.addSpanTag(context, 'service.duration_ms', duration);
        distributedTracing.finishSpan(context);
        return result;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordError(target, method, duration, error);
      distributedTracing.addSpanTag(context, 'error', true);
      distributedTracing.finishSpan(context, undefined, error as Error);
      throw error;
    }
  }

  private recordSuccess(target: any, method: string, duration: number): void {
    const serviceName = target.constructor.name;
    
    metricsCollector.recordCounter('di.service.method_calls', 1, {
      service: serviceName,
      method: method,
      success: 'true'
    });
    
    metricsCollector.recordTimer('di.service.method_duration', duration, {
      service: serviceName,
      method: method
    });
  }

  private recordError(target: any, method: string, duration: number, error: any): void {
    const serviceName = target.constructor.name;
    
    metricsCollector.recordCounter('di.service.method_calls', 1, {
      service: serviceName,
      method: method,
      success: 'false',
      error_type: error.constructor.name
    });
    
    metricsCollector.recordTimer('di.service.method_duration', duration, {
      service: serviceName,
      method: method,
      success: 'false'
    });
    
    logger.error(`Service method failed: ${serviceName}.${method}`, error, {
      service: serviceName,
      method: method,
      duration,
      component: 'di_service'
    });
  }
}

// Health check for DI container
export async function performDIHealthCheck(container: Container): Promise<DIHealthStatus> {
  const startTime = Date.now();
  
  try {
    const registrations = container.getRegistrations();
    const dependencyGraph = container.getDependencyGraph();
    
    const circularDependencies = dependencyGraph.filter(node => node.circular);
    const highComplexityServices = dependencyGraph.filter(node => node.dependencies.length > 10);
    
    const status: DIHealthStatus = {
      healthy: circularDependencies.length === 0,
      registrationCount: registrations.length,
      circularDependencies: circularDependencies.length,
      highComplexityServices: highComplexityServices.length,
      checkDuration: Date.now() - startTime,
      issues: []
    };
    
    if (circularDependencies.length > 0) {
      status.issues.push(`Found ${circularDependencies.length} circular dependencies`);
    }
    
    if (highComplexityServices.length > 0) {
      status.issues.push(`Found ${highComplexityServices.length} services with high complexity (>10 dependencies)`);
    }
    
    // Record health metrics
    metricsCollector.recordGauge('di.health.registration_count', status.registrationCount);
    metricsCollector.recordGauge('di.health.circular_dependencies', status.circularDependencies);
    metricsCollector.recordGauge('di.health.high_complexity_services', status.highComplexityServices);
    metricsCollector.recordGauge('di.health.check_duration', status.checkDuration);
    metricsCollector.recordGauge('di.health.status', status.healthy ? 1 : 0);
    
    logger.info('DI health check completed', {
      healthy: status.healthy,
      registration_count: status.registrationCount,
      circular_dependencies: status.circularDependencies,
      high_complexity_services: status.highComplexityServices,
      duration: status.checkDuration,
      component: 'di_health'
    });
    
    return status;
  } catch (error) {
    logger.error('DI health check failed', error as Error, {
      component: 'di_health'
    });
    
    return {
      healthy: false,
      registrationCount: 0,
      circularDependencies: 0,
      highComplexityServices: 0,
      checkDuration: Date.now() - startTime,
      issues: [`Health check failed: ${(error as Error).message}`]
    };
  }
}

export interface DIHealthStatus {
  healthy: boolean;
  registrationCount: number;
  circularDependencies: number;
  highComplexityServices: number;
  checkDuration: number;
  issues: string[];
}

// Create observable wrapper for existing container
export function makeObservable(container: Container): Container {
  return new ObservableContainer(container);
}