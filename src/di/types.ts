/**
 * Dependency Injection Types
 * Core types and interfaces for the DI container system
 */

// Service lifetime management
export enum ServiceLifetime {
  SINGLETON = 'singleton',
  TRANSIENT = 'transient',
  SCOPED = 'scoped'
}

// Service registration types
export type ServiceToken<T = any> = string | symbol | (new (...args: any[]) => T);
export type ServiceIdentifier<T = any> = ServiceToken<T>;

// Factory function type
export type ServiceFactory<T = any> = (container: Container) => T | Promise<T>;

// Constructor type
export type ServiceConstructor<T = any> = new (...args: any[]) => T;

// Service registration configuration
export interface ServiceRegistration<T = any> {
  token: ServiceToken<T>;
  lifetime: ServiceLifetime;
  factory?: ServiceFactory<T>;
  constructor?: ServiceConstructor<T>;
  instance?: T;
  dependencies: ServiceToken[];
  metadata: ServiceMetadata;
  interceptors: ServiceInterceptor[];
  tags: string[];
  dispose?: (instance: T) => void | Promise<void>;
}

// Service metadata
export interface ServiceMetadata {
  name?: string;
  description?: string;
  version?: string;
  author?: string;
  tags?: string[];
  config?: Record<string, any>;
}

// Dependency injection metadata
export interface DIMetadata {
  token?: ServiceToken;
  optional?: boolean;
  lazy?: boolean;
  multiple?: boolean;
  qualifier?: string;
}

// Service interceptor for AOP
export interface ServiceInterceptor<T = any> {
  intercept(target: T, method: string, args: any[], proceed: () => any): any;
}

// Container configuration
export interface ContainerConfig {
  enableCircularDependencyDetection?: boolean;
  enableAutoRegistration?: boolean;
  enableInterceptors?: boolean;
  enableObservability?: boolean;
  defaultLifetime?: ServiceLifetime;
  maxResolutionDepth?: number;
  scopeFactory?: () => ServiceScope;
}

// Service scope for scoped lifetime
export interface ServiceScope {
  id: string;
  instances: Map<ServiceToken, any>;
  dispose(): Promise<void>;
}

// Container interface
export interface Container {
  // Service registration
  register<T>(registration: ServiceRegistration<T>): Container;
  registerSingleton<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): Container;
  registerSingleton<T>(token: ServiceToken<T>, constructor: ServiceConstructor<T>): Container;
  registerTransient<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): Container;
  registerTransient<T>(token: ServiceToken<T>, constructor: ServiceConstructor<T>): Container;
  registerScoped<T>(token: ServiceToken<T>, factory: ServiceFactory<T>): Container;
  registerScoped<T>(token: ServiceToken<T>, constructor: ServiceConstructor<T>): Container;
  registerInstance<T>(token: ServiceToken<T>, instance: T): Container;

  // Service resolution
  resolve<T>(token: ServiceToken<T>): T;
  resolveAsync<T>(token: ServiceToken<T>): Promise<T>;
  resolveAll<T>(token: ServiceToken<T>): T[];
  resolveOptional<T>(token: ServiceToken<T>): T | undefined;
  tryResolve<T>(token: ServiceToken<T>): { success: boolean; instance?: T; error?: Error };

  // Service management
  isRegistered<T>(token: ServiceToken<T>): boolean;
  unregister<T>(token: ServiceToken<T>): boolean;
  clear(): void;
  
  // Scope management
  createScope(): ServiceScope;
  beginScope(): Container;
  endScope(): Promise<void>;

  // Container hierarchy
  createChild(): Container;
  getParent(): Container | undefined;

  // Introspection
  getRegistrations(): ServiceRegistration[];
  getRegistration<T>(token: ServiceToken<T>): ServiceRegistration<T> | undefined;
  getDependencyGraph(): DependencyNode[];
  
  // Lifecycle
  dispose(): Promise<void>;
}

// Dependency resolution context
export interface ResolutionContext {
  token: ServiceToken;
  path: ServiceToken[];
  scope?: ServiceScope;
  metadata?: Record<string, any>;
}

// Dependency graph node
export interface DependencyNode {
  token: ServiceToken;
  dependencies: ServiceToken[];
  dependents: ServiceToken[];
  lifetime: ServiceLifetime;
  circular?: boolean;
}

// Module interface for organizing services
export interface DIModule {
  name: string;
  configure(container: Container): void | Promise<void>;
  dependencies?: string[];
}

// Service provider interface
export interface ServiceProvider {
  configureServices(container: Container): void | Promise<void>;
}

// Error types
export class DIError extends Error {
  constructor(message: string, public token?: ServiceToken, public context?: ResolutionContext) {
    super(message);
    this.name = 'DIError';
  }
}

export class CircularDependencyError extends DIError {
  constructor(path: ServiceToken[]) {
    super(`Circular dependency detected: ${path.map(t => String(t)).join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

export class ServiceNotFoundError extends DIError {
  constructor(token: ServiceToken) {
    super(`Service not found: ${String(token)}`);
    this.name = 'ServiceNotFoundError';
  }
}

export class ServiceRegistrationError extends DIError {
  constructor(message: string, token?: ServiceToken) {
    super(message);
    this.name = 'ServiceRegistrationError';
  }
}

// Decorator metadata keys
export const DI_METADATA_KEYS = {
  INJECTABLE: Symbol('injectable'),
  INJECT: Symbol('inject'),
  DEPENDENCIES: Symbol('dependencies'),
  INTERCEPTORS: Symbol('interceptors'),
  METADATA: Symbol('metadata')
} as const;

// Service registration builder
export interface ServiceRegistrationBuilder<T> {
  as(lifetime: ServiceLifetime): ServiceRegistrationBuilder<T>;
  withMetadata(metadata: ServiceMetadata): ServiceRegistrationBuilder<T>;
  withDependencies(...dependencies: ServiceToken[]): ServiceRegistrationBuilder<T>;
  withInterceptors(...interceptors: ServiceInterceptor[]): ServiceRegistrationBuilder<T>;
  withTags(...tags: string[]): ServiceRegistrationBuilder<T>;
  withDisposer(dispose: (instance: T) => void | Promise<void>): ServiceRegistrationBuilder<T>;
  build(): ServiceRegistration<T>;
}