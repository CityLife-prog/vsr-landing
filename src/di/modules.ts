/**
 * Dependency Injection Modules
 * Module system for organizing and configuring services
 */

import {
  Container,
  DIModule,
  ServiceProvider,
  ServiceRegistration,
  ServiceToken,
  ServiceLifetime,
  ServiceFactory,
  ServiceConstructor
} from './types';

// Abstract base class for DI modules
export abstract class DIModuleBase implements DIModule {
  abstract readonly name: string;
  readonly dependencies?: string[];

  abstract configure(container: Container): void | Promise<void>;

  // Helper methods for service registration
  protected registerSingleton<T>(
    container: Container,
    token: ServiceToken<T>,
    factoryOrConstructor: ServiceFactory<T> | ServiceConstructor<T>
  ): void {
    (container as any).registerSingleton(token, factoryOrConstructor);
  }

  protected registerTransient<T>(
    container: Container,
    token: ServiceToken<T>,
    factoryOrConstructor: ServiceFactory<T> | ServiceConstructor<T>
  ): void {
    (container as any).registerTransient(token, factoryOrConstructor);
  }

  protected registerScoped<T>(
    container: Container,
    token: ServiceToken<T>,
    factoryOrConstructor: ServiceFactory<T> | ServiceConstructor<T>
  ): void {
    (container as any).registerScoped(token, factoryOrConstructor);
  }

  protected registerInstance<T>(
    container: Container,
    token: ServiceToken<T>,
    instance: T
  ): void {
    container.registerInstance(token, instance);
  }

  protected registerFactory<T>(
    container: Container,
    token: ServiceToken<T>,
    factory: ServiceFactory<T>,
    lifetime: ServiceLifetime = ServiceLifetime.TRANSIENT
  ): void {
    const registration: ServiceRegistration<T> = {
      token,
      lifetime,
      factory,
      constructor: undefined,
      instance: undefined,
      dependencies: [] as ServiceToken[],
      metadata: {} as any,
      interceptors: [] as any[],
      tags: [] as string[]
    };
    container.register(registration);
  }
}

// Service configuration module
export class ServiceConfigurationModule extends DIModuleBase {
  readonly name = 'ServiceConfiguration';

  constructor(private configurations: ServiceConfiguration[]) {
    super();
  }

  configure(container: Container): void {
    for (const config of this.configurations) {
      this.applyConfiguration(container, config);
    }
  }

  private applyConfiguration(container: Container, config: ServiceConfiguration): void {
    const registration: ServiceRegistration = {
      token: config.token,
      lifetime: config.lifetime || ServiceLifetime.TRANSIENT,
      factory: config.factory,
      constructor: config.constructor,
      instance: config.instance,
      dependencies: config.dependencies || [],
      metadata: config.metadata || {},
      interceptors: config.interceptors || [],
      tags: config.tags || [],
      dispose: config.dispose
    };

    container.register(registration);
  }
}

// Interface for service configuration
export interface ServiceConfiguration<T = any> {
  token: ServiceToken<T>;
  lifetime?: ServiceLifetime;
  factory?: ServiceFactory<T>;
  constructor?: ServiceConstructor<T>;
  instance?: T;
  dependencies?: ServiceToken[];
  metadata?: Record<string, any>;
  interceptors?: any[];
  tags?: string[];
  dispose?: (instance: T) => void | Promise<void>;
}

// Module loader for dynamic module loading
export class ModuleLoader {
  private loadedModules = new Map<string, DIModule>();

  async loadModule(modulePath: string): Promise<DIModule> {
    if (this.loadedModules.has(modulePath)) {
      return this.loadedModules.get(modulePath)!;
    }

    try {
      const moduleExports = await import(modulePath);
      const ModuleClass = moduleExports.default || moduleExports;
      
      if (typeof ModuleClass === 'function') {
        const module = new ModuleClass() as DIModule;
        this.loadedModules.set(modulePath, module);
        return module;
      } else if (typeof ModuleClass === 'object' && ModuleClass.configure) {
        this.loadedModules.set(modulePath, ModuleClass);
        return ModuleClass;
      } else {
        throw new Error(`Invalid module at ${modulePath}: must export a class or object with configure method`);
      }
    } catch (error) {
      throw new Error(`Failed to load module ${modulePath}: ${error}`);
    }
  }

  getLoadedModules(): DIModule[] {
    return Array.from(this.loadedModules.values());
  }

  unloadModule(modulePath: string): boolean {
    return this.loadedModules.delete(modulePath);
  }
}

// Module registry for managing module dependencies
export class ModuleRegistry {
  private modules = new Map<string, DIModule>();
  private dependencyGraph = new Map<string, Set<string>>();

  registerModule(module: DIModule): void {
    this.modules.set(module.name, module);
    
    if (module.dependencies) {
      this.dependencyGraph.set(module.name, new Set(module.dependencies));
    }
  }

  getModule(name: string): DIModule | undefined {
    return this.modules.get(name);
  }

  getAllModules(): DIModule[] {
    return Array.from(this.modules.values());
  }

  getModuleLoadOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (moduleName: string) => {
      if (visiting.has(moduleName)) {
        throw new Error(`Circular dependency detected in modules: ${moduleName}`);
      }
      
      if (visited.has(moduleName)) {
        return;
      }

      visiting.add(moduleName);
      
      const dependencies = this.dependencyGraph.get(moduleName) || new Set();
      for (const dep of dependencies) {
        if (!this.modules.has(dep)) {
          throw new Error(`Module dependency not found: ${dep} (required by ${moduleName})`);
        }
        visit(dep);
      }

      visiting.delete(moduleName);
      visited.add(moduleName);
      order.push(moduleName);
    };

    for (const moduleName of this.modules.keys()) {
      visit(moduleName);
    }

    return order;
  }

  async configureContainer(container: Container): Promise<void> {
    const loadOrder = this.getModuleLoadOrder();
    
    for (const moduleName of loadOrder) {
      const module = this.modules.get(moduleName)!;
      await module.configure(container);
    }
  }
}

// Service provider base class
export abstract class ServiceProviderBase implements ServiceProvider {
  abstract configureServices(container: Container): void | Promise<void>;

  // Helper method to create service configuration
  protected createConfiguration<T>(
    token: ServiceToken<T>,
    config: Partial<ServiceConfiguration<T>>
  ): ServiceConfiguration<T> {
    return {
      token,
      lifetime: ServiceLifetime.TRANSIENT,
      dependencies: [],
      metadata: {},
      interceptors: [],
      tags: [],
      ...config
    };
  }
}

// Application module for bootstrapping
export class ApplicationModule extends DIModuleBase {
  readonly name = 'Application';

  constructor(
    private providers: ServiceProvider[] = [],
    private modules: DIModule[] = []
  ) {
    super();
  }

  async configure(container: Container): Promise<void> {
    // Configure service providers first
    for (const provider of this.providers) {
      await provider.configureServices(container);
    }

    // Configure modules
    const registry = new ModuleRegistry();
    for (const module of this.modules) {
      registry.registerModule(module);
    }

    await registry.configureContainer(container);
  }

  addProvider(provider: ServiceProvider): this {
    this.providers.push(provider);
    return this;
  }

  addModule(module: DIModule): this {
    this.modules.push(module);
    return this;
  }
}

// Configuration module for application settings
export class ConfigurationModule extends DIModuleBase {
  readonly name = 'Configuration';

  constructor(private config: Record<string, any> = {}) {
    super();
  }

  configure(container: Container): void {
    // Register configuration object
    container.registerInstance('Config', this.config);

    // Register individual config values
    for (const [key, value] of Object.entries(this.config)) {
      container.registerInstance(`Config:${key}`, value);
    }

    // Register config factory
    container.registerSingleton('ConfigFactory', () => ({
      get: <T>(key: string, defaultValue?: T): T => {
        return this.config[key] ?? defaultValue;
      },
      set: (key: string, value: any): void => {
        this.config[key] = value;
      },
      has: (key: string): boolean => {
        return key in this.config;
      },
      getAll: (): Record<string, any> => {
        return { ...this.config };
      }
    }));
  }

  setConfig(key: string, value: any): this {
    this.config[key] = value;
    return this;
  }

  setConfigs(configs: Record<string, any>): this {
    Object.assign(this.config, configs);
    return this;
  }
}

// Environment module for environment-specific configuration
export class EnvironmentModule extends DIModuleBase {
  readonly name = 'Environment';

  configure(container: Container): void {
    const env = process.env.NODE_ENV || 'development';
    
    container.registerInstance('Environment', env);
    container.registerInstance('IsProduction', env === 'production');
    container.registerInstance('IsDevelopment', env === 'development');
    container.registerInstance('IsTest', env === 'test');

    // Register environment variables
    container.registerInstance('ProcessEnv', process.env);

    // Register environment helper
    container.registerSingleton('EnvironmentHelper', () => ({
      get: (key: string, defaultValue?: string): string => {
        return process.env[key] ?? defaultValue ?? '';
      },
      getRequired: (key: string): string => {
        const value = process.env[key];
        if (!value) {
          throw new Error(`Required environment variable not found: ${key}`);
        }
        return value;
      },
      getInt: (key: string, defaultValue?: number): number => {
        const value = process.env[key];
        if (!value) return defaultValue ?? 0;
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? (defaultValue ?? 0) : parsed;
      },
      getBool: (key: string, defaultValue?: boolean): boolean => {
        const value = process.env[key];
        if (!value) return defaultValue ?? false;
        return value.toLowerCase() === 'true' || value === '1';
      }
    }));
  }
}

// Logging module integration
export class LoggingModule extends DIModuleBase {
  readonly name = 'Logging';

  configure(container: Container): void {
    // Register logger from observability system if available
    try {
      const { logger } = require('../observability');
      container.registerInstance('Logger', logger);
    } catch (error) {
      // Fallback to console logger
      const consoleLogger = {
        debug: console.debug.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        log: console.log.bind(console)
      };
      container.registerInstance('Logger', consoleLogger);
    }
  }
}

// Module builder for fluent configuration
export class ModuleBuilder {
  private configurations: ServiceConfiguration[] = [];

  register<T>(token: ServiceToken<T>): ServiceConfigurationBuilder<T> {
    return new ServiceConfigurationBuilder<T>(token, this.configurations);
  }

  build(): ServiceConfigurationModule {
    return new ServiceConfigurationModule([...this.configurations]);
  }
}

// Service configuration builder
export class ServiceConfigurationBuilder<T> {
  private config: Partial<ServiceConfiguration<T>> = {};

  constructor(
    private token: ServiceToken<T>,
    private configurations: ServiceConfiguration[]
  ) {
    this.config.token = token;
  }

  withLifetime(lifetime: ServiceLifetime): this {
    this.config.lifetime = lifetime;
    return this;
  }

  withFactory(factory: ServiceFactory<T>): this {
    this.config.factory = factory;
    return this;
  }

  withConstructor(constructor: ServiceConstructor<T>): this {
    this.config.constructor = constructor;
    return this;
  }

  withInstance(instance: T): this {
    this.config.instance = instance;
    return this;
  }

  withDependencies(...dependencies: ServiceToken[]): this {
    this.config.dependencies = dependencies;
    return this;
  }

  withMetadata(metadata: Record<string, any>): this {
    this.config.metadata = { ...this.config.metadata, ...metadata };
    return this;
  }

  withTags(...tags: string[]): this {
    this.config.tags = [...(this.config.tags || []), ...tags];
    return this;
  }

  withDisposer(dispose: (instance: T) => void | Promise<void>): this {
    this.config.dispose = dispose;
    return this;
  }

  asSingleton(): this {
    return this.withLifetime(ServiceLifetime.SINGLETON);
  }

  asTransient(): this {
    return this.withLifetime(ServiceLifetime.TRANSIENT);
  }

  asScoped(): this {
    return this.withLifetime(ServiceLifetime.SCOPED);
  }

  register(): ModuleBuilder {
    this.configurations.push(this.config as ServiceConfiguration<T>);
    return new ModuleBuilder();
  }
}

// Export common module instances
export const commonModules = {
  configuration: (config?: Record<string, any>) => new ConfigurationModule(config),
  environment: () => new EnvironmentModule(),
  logging: () => new LoggingModule()
};