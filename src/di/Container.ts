/**
 * Dependency Injection Container
 * Core implementation of the DI container with service registration and resolution
 */

import {
  Container,
  ServiceRegistration,
  ServiceToken,
  ServiceFactory,
  ServiceConstructor,
  ServiceLifetime,
  ServiceScope,
  ContainerConfig,
  ResolutionContext,
  DependencyNode,
  DIError,
  CircularDependencyError,
  ServiceNotFoundError,
  ServiceRegistrationError,
  ServiceMetadata,
  ServiceInterceptor,
  DI_METADATA_KEYS
} from './types';

export class DIContainer implements Container {
  private registrations = new Map<ServiceToken, ServiceRegistration>();
  private singletons = new Map<ServiceToken, any>();
  private currentScope?: ServiceScope;
  private parent?: Container;
  private children = new Set<Container>();
  private config: Required<ContainerConfig>;
  private disposed = false;

  constructor(config: ContainerConfig = {}, parent?: Container) {
    this.config = {
      enableCircularDependencyDetection: true,
      enableAutoRegistration: false,
      enableInterceptors: true,
      enableObservability: false,
      defaultLifetime: ServiceLifetime.TRANSIENT,
      maxResolutionDepth: 50,
      scopeFactory: () => new DefaultServiceScope(),
      ...config
    };
    this.parent = parent;
    
    if (this.parent) {
      (this.parent as DIContainer).children.add(this);
    }
  }

  // Service registration methods
  register<T>(registration: ServiceRegistration<T>): Container {
    this.validateRegistration(registration);
    this.registrations.set(registration.token, registration);
    return this;
  }

  registerSingleton<T>(token: ServiceToken<T>, factoryOrConstructor: ServiceFactory<T> | ServiceConstructor<T>): Container {
    return this.registerWithLifetime(token, factoryOrConstructor, ServiceLifetime.SINGLETON);
  }

  registerTransient<T>(token: ServiceToken<T>, factoryOrConstructor: ServiceFactory<T> | ServiceConstructor<T>): Container {
    return this.registerWithLifetime(token, factoryOrConstructor, ServiceLifetime.TRANSIENT);
  }

  registerScoped<T>(token: ServiceToken<T>, factoryOrConstructor: ServiceFactory<T> | ServiceConstructor<T>): Container {
    return this.registerWithLifetime(token, factoryOrConstructor, ServiceLifetime.SCOPED);
  }

  registerInstance<T>(token: ServiceToken<T>, instance: T): Container {
    const registration: ServiceRegistration<T> = {
      token,
      lifetime: ServiceLifetime.SINGLETON,
      instance,
      factory: undefined,
      constructor: undefined,
      dependencies: [] as ServiceToken[],
      metadata: {} as ServiceMetadata,
      interceptors: [] as ServiceInterceptor[],
      tags: [] as string[]
    };
    
    this.registrations.set(token, registration);
    this.singletons.set(token, instance);
    return this;
  }

  // Service resolution methods
  resolve<T>(token: ServiceToken<T>): T {
    if (this.disposed) {
      throw new DIError('Container has been disposed');
    }

    const context: ResolutionContext = {
      token,
      path: [],
      scope: this.currentScope,
      metadata: {}
    };

    return this.resolveInternal<T>(token, context);
  }

  async resolveAsync<T>(token: ServiceToken<T>): Promise<T> {
    if (this.disposed) {
      throw new DIError('Container has been disposed');
    }

    const context: ResolutionContext = {
      token,
      path: [],
      scope: this.currentScope,
      metadata: {}
    };

    return this.resolveInternalAsync<T>(token, context);
  }

  resolveAll<T>(token: ServiceToken<T>): T[] {
    const instances: T[] = [];
    
    // Collect from current container
    for (const [regToken, registration] of this.registrations) {
      if (this.tokensMatch(regToken, token)) {
        instances.push(this.resolve<T>(regToken));
      }
    }

    // Collect from parent
    if (this.parent) {
      instances.push(...this.parent.resolveAll<T>(token));
    }

    return instances;
  }

  resolveOptional<T>(token: ServiceToken<T>): T | undefined {
    try {
      return this.resolve<T>(token);
    } catch (error) {
      if (error instanceof ServiceNotFoundError) {
        return undefined;
      }
      throw error;
    }
  }

  tryResolve<T>(token: ServiceToken<T>): { success: boolean; instance?: T; error?: Error } {
    try {
      const instance = this.resolve<T>(token);
      return { success: true, instance };
    } catch (error) {
      return { success: false, error: error as Error };
    }
  }

  // Service management
  isRegistered<T>(token: ServiceToken<T>): boolean {
    return this.registrations.has(token) || (this.parent?.isRegistered(token) ?? false);
  }

  unregister<T>(token: ServiceToken<T>): boolean {
    const registration = this.registrations.get(token);
    if (!registration) {
      return false;
    }

    // Dispose singleton if exists
    if (registration.lifetime === ServiceLifetime.SINGLETON) {
      const instance = this.singletons.get(token);
      if (instance && registration.dispose) {
        try {
          registration.dispose(instance);
        } catch (error) {
          console.warn(`Error disposing service ${String(token)}:`, error);
        }
      }
      this.singletons.delete(token);
    }

    this.registrations.delete(token);
    return true;
  }

  clear(): void {
    // Dispose all singletons
    for (const [token, registration] of this.registrations) {
      if (registration.lifetime === ServiceLifetime.SINGLETON && registration.dispose) {
        const instance = this.singletons.get(token);
        if (instance) {
          try {
            registration.dispose(instance);
          } catch (error) {
            console.warn(`Error disposing service ${String(token)}:`, error);
          }
        }
      }
    }

    this.registrations.clear();
    this.singletons.clear();
  }

  // Scope management
  createScope(): ServiceScope {
    return this.config.scopeFactory();
  }

  beginScope(): Container {
    this.currentScope = this.createScope();
    return this;
  }

  async endScope(): Promise<void> {
    if (this.currentScope) {
      await this.currentScope.dispose();
      this.currentScope = undefined;
    }
  }

  // Container hierarchy
  createChild(): Container {
    return new DIContainer(this.config, this);
  }

  getParent(): Container | undefined {
    return this.parent;
  }

  // Introspection
  getRegistrations(): ServiceRegistration[] {
    const registrations = Array.from(this.registrations.values());
    
    if (this.parent) {
      registrations.push(...this.parent.getRegistrations());
    }
    
    return registrations;
  }

  getRegistration<T>(token: ServiceToken<T>): ServiceRegistration<T> | undefined {
    const registration = this.registrations.get(token);
    if (registration) {
      return registration as ServiceRegistration<T>;
    }
    
    return this.parent?.getRegistration(token);
  }

  getDependencyGraph(): DependencyNode[] {
    const nodes: DependencyNode[] = [];
    const visited = new Set<ServiceToken>();

    for (const registration of this.registrations.values()) {
      this.buildDependencyNode(registration.token, nodes, visited);
    }

    return nodes;
  }

  // Lifecycle
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    // Dispose children first
    for (const child of this.children) {
      await child.dispose();
    }
    this.children.clear();

    // End current scope
    await this.endScope();

    // Clear all services
    this.clear();

    // Remove from parent
    if (this.parent) {
      (this.parent as DIContainer).children.delete(this);
    }

    this.disposed = true;
  }

  // Private methods
  private validateRegistration<T>(registration: ServiceRegistration<T>): void {
    if (!registration.token) {
      throw new ServiceRegistrationError('Service token is required');
    }

    if (!registration.lifetime) {
      registration.lifetime = this.config.defaultLifetime;
    }

    if (!registration.factory && !registration.constructor && !registration.instance) {
      throw new ServiceRegistrationError(
        'Registration must have factory, constructor, or instance',
        registration.token
      );
    }

    if (!registration.dependencies) registration.dependencies = [];
    if (!registration.metadata) registration.metadata = {};
    if (!registration.interceptors) registration.interceptors = [];
    if (!registration.tags) registration.tags = [];
  }

  private registerWithLifetime<T>(
    token: ServiceToken<T>,
    factoryOrConstructor: ServiceFactory<T> | ServiceConstructor<T>,
    lifetime: ServiceLifetime
  ): Container {
    const registration: ServiceRegistration<T> = {
      token,
      lifetime,
      factory: undefined,
      constructor: undefined,
      instance: undefined,
      dependencies: [] as ServiceToken[],
      metadata: {} as ServiceMetadata,
      interceptors: [] as ServiceInterceptor[],
      tags: [] as string[]
    };

    if (this.isConstructor(factoryOrConstructor)) {
      registration.constructor = factoryOrConstructor;
      registration.dependencies = this.getConstructorDependencies(factoryOrConstructor);
    } else {
      registration.factory = factoryOrConstructor;
    }

    return this.register(registration);
  }

  private resolveInternal<T>(token: ServiceToken<T>, context: ResolutionContext): T {
    if (context.path.length > this.config.maxResolutionDepth) {
      throw new DIError(`Maximum resolution depth exceeded: ${this.config.maxResolutionDepth}`);
    }

    if (this.config.enableCircularDependencyDetection && context.path.includes(token)) {
      throw new CircularDependencyError([...context.path, token]);
    }

    const registration = this.getRegistration(token);
    if (!registration) {
      throw new ServiceNotFoundError(token);
    }

    // Check for existing instance based on lifetime
    const existingInstance = this.getExistingInstance<T>(token, registration, context);
    if (existingInstance !== undefined) {
      return existingInstance;
    }

    // Create new instance
    context.path.push(token);
    try {
      const instance = this.createInstance<T>(registration, context);
      this.storeInstance(token, instance, registration, context);
      return instance;
    } finally {
      context.path.pop();
    }
  }

  private async resolveInternalAsync<T>(token: ServiceToken<T>, context: ResolutionContext): Promise<T> {
    if (context.path.length > this.config.maxResolutionDepth) {
      throw new DIError(`Maximum resolution depth exceeded: ${this.config.maxResolutionDepth}`);
    }

    if (this.config.enableCircularDependencyDetection && context.path.includes(token)) {
      throw new CircularDependencyError([...context.path, token]);
    }

    const registration = this.getRegistration(token);
    if (!registration) {
      throw new ServiceNotFoundError(token);
    }

    // Check for existing instance based on lifetime
    const existingInstance = this.getExistingInstance<T>(token, registration, context);
    if (existingInstance !== undefined) {
      return existingInstance;
    }

    // Create new instance
    context.path.push(token);
    try {
      const instance = await this.createInstanceAsync<T>(registration, context);
      this.storeInstance(token, instance, registration, context);
      return instance;
    } finally {
      context.path.pop();
    }
  }

  private getExistingInstance<T>(
    token: ServiceToken<T>,
    registration: ServiceRegistration<T>,
    context: ResolutionContext
  ): T | undefined {
    switch (registration.lifetime) {
      case ServiceLifetime.SINGLETON:
        return this.singletons.get(token);
      case ServiceLifetime.SCOPED:
        return context.scope?.instances.get(token);
      case ServiceLifetime.TRANSIENT:
      default:
        return undefined;
    }
  }

  private createInstance<T>(registration: ServiceRegistration<T>, context: ResolutionContext): T {
    if (registration.instance) {
      return registration.instance;
    }

    if (registration.factory) {
      const result = registration.factory(this);
      return result as T;
    }

    if (registration.constructor) {
      const dependencies = this.resolveDependencies(registration.dependencies, context);
      return new registration.constructor(...dependencies);
    }

    throw new DIError(`Invalid registration for ${String(registration.token)}`);
  }

  private async createInstanceAsync<T>(registration: ServiceRegistration<T>, context: ResolutionContext): Promise<T> {
    if (registration.instance) {
      return registration.instance;
    }

    if (registration.factory) {
      const result = registration.factory(this);
      return result instanceof Promise ? await result : result;
    }

    if (registration.constructor) {
      const dependencies = await this.resolveDependenciesAsync(registration.dependencies, context);
      return new registration.constructor(...dependencies);
    }

    throw new DIError(`Invalid registration for ${String(registration.token)}`);
  }

  private storeInstance<T>(
    token: ServiceToken<T>,
    instance: T,
    registration: ServiceRegistration<T>,
    context: ResolutionContext
  ): void {
    switch (registration.lifetime) {
      case ServiceLifetime.SINGLETON:
        this.singletons.set(token, instance);
        break;
      case ServiceLifetime.SCOPED:
        if (context.scope) {
          context.scope.instances.set(token, instance);
        }
        break;
      case ServiceLifetime.TRANSIENT:
      default:
        // No storage needed for transient
        break;
    }
  }

  private resolveDependencies(dependencies: ServiceToken[], context: ResolutionContext): any[] {
    return dependencies.map(dep => this.resolveInternal(dep, { ...context }));
  }

  private async resolveDependenciesAsync(dependencies: ServiceToken[], context: ResolutionContext): Promise<any[]> {
    return Promise.all(dependencies.map(dep => this.resolveInternalAsync(dep, { ...context })));
  }

  private getConstructorDependencies(constructor: ServiceConstructor): ServiceToken[] {
    // Try to get dependencies from metadata (set by decorators)
    if (typeof Reflect !== 'undefined' && Reflect.getMetadata) {
      const dependencies = Reflect.getMetadata(DI_METADATA_KEYS.DEPENDENCIES, constructor);
      if (dependencies) {
        return dependencies;
      }

      // Try to infer from parameter types
      const paramTypes = Reflect.getMetadata('design:paramtypes', constructor);
      if (paramTypes) {
        return paramTypes;
      }
    }

    return [];
  }

  private isConstructor(value: any): value is ServiceConstructor {
    return typeof value === 'function' && value.prototype && value.prototype.constructor === value;
  }

  private tokensMatch(token1: ServiceToken, token2: ServiceToken): boolean {
    return token1 === token2;
  }

  private buildDependencyNode(
    token: ServiceToken,
    nodes: DependencyNode[],
    visited: Set<ServiceToken>
  ): void {
    if (visited.has(token)) {
      return;
    }

    visited.add(token);
    const registration = this.getRegistration(token);
    
    if (!registration) {
      return;
    }

    const dependencies = registration.dependencies || [];
    const node: DependencyNode = {
      token,
      dependencies,
      dependents: [],
      lifetime: registration.lifetime
    };

    nodes.push(node);

    // Build dependency nodes recursively
    for (const dep of dependencies) {
      this.buildDependencyNode(dep, nodes, visited);
      
      // Find dependent node and add this token as dependent
      const depNode = nodes.find(n => n.token === dep);
      if (depNode) {
        depNode.dependents.push(token);
      }
    }

    // Check for circular dependencies
    if (this.config.enableCircularDependencyDetection) {
      node.circular = this.hasCircularDependency(token, dependencies, new Set());
    }
  }

  private hasCircularDependency(
    token: ServiceToken,
    dependencies: ServiceToken[],
    visited: Set<ServiceToken>
  ): boolean {
    if (visited.has(token)) {
      return true;
    }

    visited.add(token);

    for (const dep of dependencies) {
      const depRegistration = this.getRegistration(dep);
      if (depRegistration) {
        if (this.hasCircularDependency(dep, depRegistration.dependencies || [], new Set(visited))) {
          return true;
        }
      }
    }

    return false;
  }
}

// Default service scope implementation
class DefaultServiceScope implements ServiceScope {
  readonly id: string;
  readonly instances = new Map<ServiceToken, any>();

  constructor() {
    this.id = `scope_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async dispose(): Promise<void> {
    // Dispose all scoped instances
    for (const instance of this.instances.values()) {
      if (instance && typeof instance.dispose === 'function') {
        try {
          await instance.dispose();
        } catch (error) {
          console.warn('Error disposing scoped instance:', error);
        }
      }
    }
    
    this.instances.clear();
  }
}

// Create default container instance
export const defaultContainer = new DIContainer();