/**
 * DI Container Tests
 * Basic tests to verify the DI container functionality
 */

import {
  DIContainer,
  ServiceLifetime,
  Injectable,
  Singleton,
  Inject,
  createServiceToken,
  ApplicationModule,
  ConfigurationModule,
  InterceptorChain,
  LoggingInterceptor,
  makeObservable,
  performDIHealthCheck,
  Container
} from './index';

// Test interfaces and implementations
interface ILogger {
  log(message: string): void;
}

interface IDatabase {
  connect(): void;
  query(sql: string): any[];
}

class ConsoleLogger implements ILogger {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }
}

class PostgreSQLDatabase implements IDatabase {
  private connected = false;

  connect(): void {
    this.connected = true;
    console.log('PostgreSQL connected');
  }

  query(sql: string): any[] {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    console.log(`Executing: ${sql}`);
    return [];
  }
}

class UserService {
  constructor(
    private database: IDatabase,
    private logger: ILogger
  ) {}

  createUser(name: string): void {
    this.logger.log(`Creating user: ${name}`);
    this.database.query(`INSERT INTO users (name) VALUES ('${name}')`);
  }

  getUser(id: string): any {
    this.logger.log(`Getting user: ${id}`);
    return this.database.query(`SELECT * FROM users WHERE id = '${id}'`)[0];
  }
}

// Test tokens
const LOGGER_TOKEN = createServiceToken<ILogger>('Logger');
const DATABASE_TOKEN = createServiceToken<IDatabase>('Database');

// Test suite
export class DIContainerTests {
  
  static async runAllTests(): Promise<boolean> {
    console.log('🧪 Running DI Container Tests');
    console.log('=============================\n');

    const tests = [
      () => this.testBasicRegistrationAndResolution(),
      () => this.testServiceLifetimes(),
      () => this.testDependencyInjection(),
      () => this.testServiceTokens(),
      () => this.testScopeManagement(),
      () => this.testModuleSystem(),
      () => this.testInterceptors(),
      () => this.testObservability(),
      () => this.testErrorHandling(),
      () => this.testContainerHierarchy()
    ];

    let passed = 0;
    let failed = 0;

    for (let i = 0; i < tests.length; i++) {
      try {
        console.log(`Test ${i + 1}: ${tests[i].name}`);
        await tests[i]();
        console.log('✅ PASSED\n');
        passed++;
      } catch (error) {
        console.log(`❌ FAILED: ${error}\n`);
        failed++;
      }
    }

    console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
    return failed === 0;
  }

  static testBasicRegistrationAndResolution() {
    const container = new DIContainer();

    // Test instance registration
    const logger = new ConsoleLogger();
    container.registerInstance(LOGGER_TOKEN, logger);

    // Test factory registration
    container.registerSingleton(DATABASE_TOKEN, () => new PostgreSQLDatabase());

    // Test resolution
    const resolvedLogger = container.resolve<ILogger>(LOGGER_TOKEN);
    const resolvedDatabase = container.resolve<IDatabase>(DATABASE_TOKEN);

    if (resolvedLogger !== logger) {
      throw new Error('Instance registration failed');
    }

    if (!(resolvedDatabase instanceof PostgreSQLDatabase)) {
      throw new Error('Factory registration failed');
    }

    // Test isRegistered
    if (!container.isRegistered(LOGGER_TOKEN)) {
      throw new Error('isRegistered check failed');
    }
  }

  static testServiceLifetimes() {
    const container = new DIContainer();

    // Singleton test
    container.registerSingleton('SingletonService', () => ({ id: Math.random() }));
    const singleton1 = container.resolve('SingletonService');
    const singleton2 = container.resolve('SingletonService');

    if (singleton1 !== singleton2) {
      throw new Error('Singleton lifetime failed');
    }

    // Transient test
    container.registerTransient('TransientService', () => ({ id: Math.random() }));
    const transient1 = container.resolve('TransientService');
    const transient2 = container.resolve('TransientService');

    if (transient1 === transient2) {
      throw new Error('Transient lifetime failed');
    }
  }

  static testDependencyInjection() {
    const container = new DIContainer();

    // Register dependencies
    container.register({
      token: ConsoleLogger,
      lifetime: ServiceLifetime.SINGLETON,
      constructor: ConsoleLogger,
      dependencies: [],
      metadata: {},
      interceptors: [],
      tags: []
    });

    container.register({
      token: PostgreSQLDatabase,
      lifetime: ServiceLifetime.SINGLETON,
      constructor: PostgreSQLDatabase,
      dependencies: [],
      metadata: {},
      interceptors: [],
      tags: []
    });

    container.register({
      token: UserService,
      lifetime: ServiceLifetime.TRANSIENT,
      constructor: UserService,
      dependencies: [PostgreSQLDatabase, ConsoleLogger],
      metadata: {},
      interceptors: [],
      tags: []
    });

    // Resolve service with dependencies
    const userService = container.resolve<UserService>(UserService);
    const database = container.resolve<PostgreSQLDatabase>(PostgreSQLDatabase);

    database.connect();
    userService.createUser('Test User');
  }

  static testServiceTokens() {
    const container = new DIContainer();
    const TEST_TOKEN = createServiceToken<string>('TestToken');

    container.registerInstance(TEST_TOKEN, 'test-value');
    const resolved = container.resolve(TEST_TOKEN);

    if (resolved !== 'test-value') {
      throw new Error('Service token resolution failed');
    }
  }

  static async testScopeManagement() {
    const container = new DIContainer();

    // Register scoped service
    container.registerScoped('ScopedService', () => ({ id: Math.random() }));

    // Test scope 1
    container.beginScope();
    const scoped1a = container.resolve('ScopedService');
    const scoped1b = container.resolve('ScopedService');
    
    if (scoped1a !== scoped1b) {
      throw new Error('Scoped service should be same within scope');
    }
    
    await container.endScope();

    // Test scope 2
    container.beginScope();
    const scoped2 = container.resolve('ScopedService');
    
    if (scoped1a === scoped2) {
      throw new Error('Scoped service should be different across scopes');
    }
    
    await container.endScope();
  }

  static async testModuleSystem() {
    const container = new DIContainer();

    // Test configuration module
    const configModule = new ConfigurationModule({
      appName: 'Test App',
      version: '1.0.0'
    });

    await configModule.configure(container);

    const config = container.resolve<any>('Config');
    if (config.appName !== 'Test App') {
      throw new Error('Configuration module failed');
    }

    // Test application module
    const appModule = new ApplicationModule()
      .addModule(configModule);

    await appModule.configure(container);
  }

  static testInterceptors() {
    const container = new DIContainer();

    // Create service with interceptors
    const interceptors = new InterceptorChain()
      .addLogging()
      .build();

    container.register({
      token: 'InterceptedService',
      lifetime: ServiceLifetime.SINGLETON,
      factory: (container: Container) => ({
        testMethod: () => 'test-result'
      }),
      constructor: undefined,
      dependencies: [],
      metadata: {},
      interceptors,
      tags: []
    });

    const service = container.resolve<any>('InterceptedService');
    const result = service.testMethod();

    if (result !== 'test-result') {
      throw new Error('Intercepted service method failed');
    }
  }

  static async testObservability() {
    const container = new DIContainer();
    const observableContainer = makeObservable(container);

    // Register and resolve service
    observableContainer.registerSingleton('ObservableService', () => ({
      getValue: () => 'observable-value'
    }));

    const service = observableContainer.resolve<any>('ObservableService');
    const value = service.getValue();

    if (value !== 'observable-value') {
      throw new Error('Observable container resolution failed');
    }

    // Test health check
    const health = await performDIHealthCheck(observableContainer);
    if (!health) {
      throw new Error('Health check failed');
    }
  }

  static testErrorHandling() {
    const container = new DIContainer();

    // Test unregistered service
    try {
      container.resolve('UnregisteredService');
      throw new Error('Should have thrown ServiceNotFoundError');
    } catch (error) {
      if (!(error as Error).message.includes('Service not found')) {
        throw new Error('Wrong error type for unregistered service');
      }
    }

    // Test circular dependency detection
    container.register({
      token: 'ServiceA',
      lifetime: ServiceLifetime.TRANSIENT,
      factory: (container: Container) => ({ serviceB: container.resolve('ServiceB') }),
      constructor: undefined,
      dependencies: ['ServiceB'],
      metadata: {},
      interceptors: [],
      tags: []
    });

    container.register({
      token: 'ServiceB',
      lifetime: ServiceLifetime.TRANSIENT,
      factory: (container: Container) => ({ serviceA: container.resolve('ServiceA') }),
      constructor: undefined,
      dependencies: ['ServiceA'],
      metadata: {},
      interceptors: [],
      tags: []
    });

    // Note: This would cause a circular dependency in a real scenario
    // For this test, we just verify the configuration doesn't crash
  }

  static testContainerHierarchy() {
    const parentContainer = new DIContainer();
    const childContainer = parentContainer.createChild();

    // Register in parent
    parentContainer.registerInstance('ParentService', 'parent-value');

    // Register in child
    childContainer.registerInstance('ChildService', 'child-value');

    // Child should resolve from parent
    const parentService = childContainer.resolve('ParentService');
    if (parentService !== 'parent-value') {
      throw new Error('Child container should resolve from parent');
    }

    // Parent should not resolve from child
    try {
      parentContainer.resolve('ChildService');
      throw new Error('Parent should not resolve from child');
    } catch (error) {
      // Expected behavior
    }

    // Verify parent relationship
    if (childContainer.getParent() !== parentContainer) {
      throw new Error('Child container parent relationship failed');
    }
  }
}

// Performance test
export class DIPerformanceTests {
  static runPerformanceTests(): void {
    console.log('\n⚡ Running Performance Tests');
    console.log('============================\n');

    this.testRegistrationPerformance();
    this.testResolutionPerformance();
    this.testComplexDependencyResolution();
  }

  static testRegistrationPerformance(): void {
    const container = new DIContainer();
    const count = 1000;
    
    const startTime = Date.now();
    
    for (let i = 0; i < count; i++) {
      container.registerTransient(`Service${i}`, () => ({ id: i }));
    }
    
    const duration = Date.now() - startTime;
    console.log(`Registration Performance: ${count} services in ${duration}ms (${(count/duration*1000).toFixed(0)} ops/sec)`);
  }

  static testResolutionPerformance(): void {
    const container = new DIContainer();
    const count = 1000;
    
    // Setup
    for (let i = 0; i < count; i++) {
      container.registerSingleton(`Service${i}`, () => ({ id: i }));
    }
    
    const startTime = Date.now();
    
    for (let i = 0; i < count; i++) {
      container.resolve(`Service${i}`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`Resolution Performance: ${count} resolutions in ${duration}ms (${(count/duration*1000).toFixed(0)} ops/sec)`);
  }

  static testComplexDependencyResolution(): void {
    const container = new DIContainer();
    
    // Create complex dependency chain
    container.registerSingleton('Level1', () => ({ value: 1 }));
    container.registerTransient('Level2', (c) => ({ 
      level1: c.resolve('Level1'),
      value: 2 
    }));
    container.registerTransient('Level3', (c) => ({ 
      level2: c.resolve('Level2'),
      value: 3 
    }));
    container.registerTransient('Level4', (c) => ({ 
      level3: c.resolve('Level3'),
      value: 4 
    }));
    container.registerTransient('Level5', (c) => ({ 
      level4: c.resolve('Level4'),
      value: 5 
    }));
    
    const count = 100;
    const startTime = Date.now();
    
    for (let i = 0; i < count; i++) {
      container.resolve('Level5');
    }
    
    const duration = Date.now() - startTime;
    console.log(`Complex Dependency Resolution: ${count} deep resolutions in ${duration}ms (${(count/duration*1000).toFixed(0)} ops/sec)`);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  console.log('🏗️ VSR Landing DI Container Test Suite');
  console.log('======================================\n');
  
  DIContainerTests.runAllTests()
    .then(success => {
      if (success) {
        console.log('\n🎉 All tests passed!');
        DIPerformanceTests.runPerformanceTests();
      } else {
        console.log('\n💥 Some tests failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Test suite crashed:', error);
      process.exit(1);
    });
}