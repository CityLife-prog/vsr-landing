/**
 * Dependency Injection Container - Main Export
 * Complete DI system with IoC, service registration, and observability
 */

// Core types and interfaces
export * from './types';

// Container implementation
export { DIContainer, defaultContainer } from './Container';

// Decorators and metadata
export * from './decorators';

// Module system
export * from './modules';

// Interceptors and AOP
export * from './interceptors';

// Observability integration
export * from './observability';

// Examples and utilities
export * from './examples';

// Re-export commonly used items for convenience
export {
  DIContainer as Container,
  defaultContainer as container
} from './Container';

export {
  Injectable,
  Singleton,
  Transient,
  Scoped,
  Inject,
  LazyInject,
  OptionalInject
} from './decorators';

import { ServiceLifetime, ServiceToken, ServiceRegistration } from './types';

export {
  ServiceLifetime,
  type ServiceToken,
  type ServiceRegistration,
  type Container as IContainer
} from './types';

// Factory functions for common scenarios
export function createContainer(config?: any) {
  const { DIContainer } = require('./Container');
  return new DIContainer(config);
}

export function createObservableContainer(config?: any) {
  const { DIContainer } = require('./Container');
  const { makeObservable } = require('./observability');
  return makeObservable(new DIContainer(config));
}

// Quick setup helpers
export class QuickSetup {
  static createBasicContainer() {
    const { DIContainer } = require('./Container');
    const container = new DIContainer();
    
    // Register common services
    container.registerInstance('Environment', process.env.NODE_ENV || 'development');
    container.registerInstance('ProcessEnv', process.env);
    
    // Register console logger fallback
    container.registerSingleton('Logger', () => ({
      debug: console.debug.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      log: console.log.bind(console)
    }));
    
    return container;
  }
  
  static createProductionContainer() {
    const { DIContainer } = require('./Container');
    const { makeObservable } = require('./observability');
    const container = makeObservable(new DIContainer({
      enableCircularDependencyDetection: true,
      enableInterceptors: true,
      enableObservability: true,
      defaultLifetime: ServiceLifetime.SINGLETON
    }));
    
    return this.configureCommonServices(container);
  }
  
  static createDevelopmentContainer() {
    const { DIContainer } = require('./Container');
    const container = new DIContainer({
      enableCircularDependencyDetection: true,
      enableInterceptors: true,
      enableObservability: false,
      defaultLifetime: ServiceLifetime.TRANSIENT
    });
    
    return this.configureCommonServices(container);
  }
  
  private static configureCommonServices(container: any) {
    // Environment services
    const { EnvironmentModule, LoggingModule, ConfigurationModule } = require('./modules');
    
    new EnvironmentModule().configure(container);
    new LoggingModule().configure(container);
    new ConfigurationModule().configure(container);
    
    return container;
  }
}

// Global container instance (optional, for convenience)
let globalContainer: any;

export function getGlobalContainer() {
  if (!globalContainer) {
    globalContainer = QuickSetup.createBasicContainer();
  }
  return globalContainer;
}

export function setGlobalContainer(container: any) {
  globalContainer = container;
}

// Convenience functions
export function resolve<T>(token: ServiceToken<T>): T {
  return (getGlobalContainer() as any).resolve(token);
}

export function register<T>(token: ServiceToken<T>, factory: any, lifetime?: ServiceLifetime) {
  const container = getGlobalContainer() as any;
  
  switch (lifetime) {
    case ServiceLifetime.SINGLETON:
      return container.registerSingleton(token, factory);
    case ServiceLifetime.SCOPED:
      return container.registerScoped(token, factory);
    case ServiceLifetime.TRANSIENT:
    default:
      return container.registerTransient(token, factory);
  }
}

export function registerInstance<T>(token: ServiceToken<T>, instance: T) {
  return (getGlobalContainer() as any).registerInstance(token, instance);
}

// Version information
export const VERSION = '1.0.0';
export const DESCRIPTION = 'Comprehensive Dependency Injection Container for TypeScript/JavaScript';

// Initialize default container with basic services
try {
  const defaultContainer = getGlobalContainer();
  
  // Auto-register observability services if available
  try {
    const observability = require('../observability');
    defaultContainer.registerInstance('ObservabilityLogger', observability.logger);
    defaultContainer.registerInstance('MetricsCollector', observability.metricsCollector);
    defaultContainer.registerInstance('DistributedTracing', observability.distributedTracing);
  } catch (error) {
    // Observability not available, use fallbacks
  }
  
} catch (error) {
  console.warn('Failed to initialize default DI container:', error);
}