/**
 * Dependency Injection Decorators
 * Decorators for service registration, dependency injection, and metadata
 */

import 'reflect-metadata';
import {
  ServiceToken,
  ServiceLifetime,
  ServiceMetadata,
  ServiceInterceptor,
  DIMetadata,
  DI_METADATA_KEYS,
  ServiceRegistration
} from './types';

// Class decorator to mark a class as injectable
export function Injectable(config?: {
  lifetime?: ServiceLifetime;
  token?: ServiceToken;
  metadata?: ServiceMetadata;
  tags?: string[];
}) {
  return function <T extends new (...args: any[]) => any>(target: T) {
    const lifetime = config?.lifetime || ServiceLifetime.TRANSIENT;
    const token = config?.token || target;
    const metadata = config?.metadata || {};
    const tags = config?.tags || [];

    // Store injectable metadata
    Reflect.defineMetadata(DI_METADATA_KEYS.INJECTABLE, {
      lifetime,
      token,
      metadata,
      tags
    }, target);

    // Extract constructor parameter types
    const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
    const dependencies = paramTypes.map((type: any, index: number) => {
      const injectMetadata: DIMetadata = Reflect.getMetadata(DI_METADATA_KEYS.INJECT, target, index.toString()) || {};
      return injectMetadata.token || type;
    });

    Reflect.defineMetadata(DI_METADATA_KEYS.DEPENDENCIES, dependencies, target);

    return target;
  };
}

// Parameter decorator for dependency injection
export function Inject(config?: {
  token?: ServiceToken;
  optional?: boolean;
  lazy?: boolean;
  multiple?: boolean;
  qualifier?: string;
}) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    const metadata: DIMetadata = {
      token: config?.token,
      optional: config?.optional || false,
      lazy: config?.lazy || false,
      multiple: config?.multiple || false,
      qualifier: config?.qualifier
    };

    Reflect.defineMetadata(DI_METADATA_KEYS.INJECT, metadata, target, parameterIndex.toString());
  };
}

// Class decorator for singleton services
export function Singleton(token?: ServiceToken, metadata?: ServiceMetadata) {
  return Injectable({
    lifetime: ServiceLifetime.SINGLETON,
    token,
    metadata
  });
}

// Class decorator for transient services
export function Transient(token?: ServiceToken, metadata?: ServiceMetadata) {
  return Injectable({
    lifetime: ServiceLifetime.TRANSIENT,
    token,
    metadata
  });
}

// Class decorator for scoped services
export function Scoped(token?: ServiceToken, metadata?: ServiceMetadata) {
  return Injectable({
    lifetime: ServiceLifetime.SCOPED,
    token,
    metadata
  });
}

// Property decorator for lazy injection
export function LazyInject(token?: ServiceToken) {
  return function (target: any, propertyKey: string | symbol) {
    const getter = function (this: any) {
      if (!this._container) {
        throw new Error('Container not available for lazy injection');
      }
      return this._container.resolve(token || Reflect.getMetadata('design:type', target, propertyKey));
    };

    Object.defineProperty(target, propertyKey, {
      get: getter,
      enumerable: true,
      configurable: true
    });
  };
}

// Property decorator for optional injection
export function OptionalInject(token?: ServiceToken) {
  return function (target: any, propertyKey: string | symbol) {
    const getter = function (this: any) {
      if (!this._container) {
        return undefined;
      }
      return this._container.resolveOptional(token || Reflect.getMetadata('design:type', target, propertyKey));
    };

    Object.defineProperty(target, propertyKey, {
      get: getter,
      enumerable: true,
      configurable: true
    });
  };
}

// Method decorator for interceptors
export function Intercept(...interceptors: ServiceInterceptor[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      let index = 0;
      
      const proceed = (): any => {
        if (index < interceptors.length) {
          const interceptor = interceptors[index++];
          return interceptor.intercept(this, propertyKey, args, proceed);
        } else {
          return originalMethod.apply(this, args);
        }
      };

      return proceed();
    };

    return descriptor;
  };
}

// Class decorator for adding interceptors to all methods
export function InterceptAll(...interceptors: ServiceInterceptor[]) {
  return function <T extends new (...args: any[]) => any>(target: T) {
    const existingInterceptors = Reflect.getMetadata(DI_METADATA_KEYS.INTERCEPTORS, target) || [];
    Reflect.defineMetadata(DI_METADATA_KEYS.INTERCEPTORS, [...existingInterceptors, ...interceptors], target);
    return target;
  };
}

// Decorator for service metadata
export function Metadata(metadata: ServiceMetadata) {
  return function <T extends new (...args: any[]) => any>(target: T) {
    const existingMetadata = Reflect.getMetadata(DI_METADATA_KEYS.METADATA, target) || {};
    Reflect.defineMetadata(DI_METADATA_KEYS.METADATA, { ...existingMetadata, ...metadata }, target);
    return target;
  };
}

// Decorator for service tags
export function Tags(...tags: string[]) {
  return function <T extends new (...args: any[]) => any>(target: T) {
    const existingTags = Reflect.getMetadata('tags', target) || [];
    Reflect.defineMetadata('tags', [...existingTags, ...tags], target);
    return target;
  };
}

// Auto-registration helper
export function AutoRegister(container: any) {
  return function <T extends new (...args: any[]) => any>(target: T) {
    const injectableMetadata = Reflect.getMetadata(DI_METADATA_KEYS.INJECTABLE, target);
    
    if (injectableMetadata) {
      const dependencies = Reflect.getMetadata(DI_METADATA_KEYS.DEPENDENCIES, target) || [];
      const interceptors = Reflect.getMetadata(DI_METADATA_KEYS.INTERCEPTORS, target) || [];
      const metadata = Reflect.getMetadata(DI_METADATA_KEYS.METADATA, target) || {};
      const tags = Reflect.getMetadata('tags', target) || [];

      const registration: ServiceRegistration = {
        token: injectableMetadata.token,
        lifetime: injectableMetadata.lifetime,
        constructor: target,
        dependencies,
        metadata,
        interceptors,
        tags
      };

      container.register(registration);
    }

    return target;
  };
}

// Service token creation helpers
export function createServiceToken<T>(name: string): ServiceToken<T> {
  return Symbol(name);
}

export function createStringToken<T>(name: string): ServiceToken<T> {
  return name;
}

// Utility functions for metadata access
export function getInjectableMetadata(target: any) {
  return Reflect.getMetadata(DI_METADATA_KEYS.INJECTABLE, target);
}

export function getDependencies(target: any): ServiceToken[] {
  return Reflect.getMetadata(DI_METADATA_KEYS.DEPENDENCIES, target) || [];
}

export function getServiceMetadata(target: any): ServiceMetadata {
  return Reflect.getMetadata(DI_METADATA_KEYS.METADATA, target) || {};
}

export function getInterceptors(target: any): ServiceInterceptor[] {
  return Reflect.getMetadata(DI_METADATA_KEYS.INTERCEPTORS, target) || [];
}

export function isInjectable(target: any): boolean {
  return Reflect.hasMetadata(DI_METADATA_KEYS.INJECTABLE, target);
}

// Service discovery helper
export function discoverServices(modules: any[]): ServiceRegistration[] {
  const registrations: ServiceRegistration[] = [];

  for (const module of modules) {
    if (typeof module === 'function' && isInjectable(module)) {
      const injectableMetadata = getInjectableMetadata(module);
      const dependencies = getDependencies(module);
      const interceptors = getInterceptors(module);
      const metadata = getServiceMetadata(module);
      const tags = Reflect.getMetadata('tags', module) || [];

      registrations.push({
        token: injectableMetadata.token,
        lifetime: injectableMetadata.lifetime,
        constructor: module,
        dependencies,
        metadata,
        interceptors,
        tags
      });
    }
  }

  return registrations;
}

// Common service tokens
export const SERVICE_TOKENS = {
  LOGGER: createServiceToken<any>('Logger'),
  CONFIG: createServiceToken<any>('Config'),
  HTTP_CLIENT: createServiceToken<any>('HttpClient'),
  DATABASE: createServiceToken<any>('Database'),
  CACHE: createServiceToken<any>('Cache'),
  EVENT_BUS: createServiceToken<any>('EventBus'),
  METRICS: createServiceToken<any>('Metrics'),
  TRACER: createServiceToken<any>('Tracer')
} as const;