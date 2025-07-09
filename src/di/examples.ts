/**
 * Dependency Injection Examples
 * Comprehensive examples showing how to use the DI container
 */

import {
  DIContainer,
  defaultContainer,
  Injectable,
  Singleton,
  Transient,
  Scoped,
  Inject,
  LazyInject,
  OptionalInject,
  InterceptAll,
  Intercept,
  createServiceToken,
  SERVICE_TOKENS,
  ServiceLifetime,
  ServiceToken,
  ModuleBuilder,
  ApplicationModule,
  ConfigurationModule,
  EnvironmentModule,
  LoggingModule,
  InterceptorChain,
  LoggingInterceptor,
  PerformanceInterceptor,
  CachingInterceptor,
  ObservableContainer,
  makeObservable,
  performDIHealthCheck
} from './index';

// Example 1: Basic Service Registration and Resolution
export function basicExample() {
  console.log('\n=== Basic DI Example ===');
  
  const container = new DIContainer();
  
  // Register services
  container.registerSingleton('Database', () => ({
    connect: () => console.log('Connected to database'),
    query: (sql: string) => console.log(`Executing: ${sql}`)
  }));
  
  container.registerTransient('Logger', () => ({
    log: (message: string) => console.log(`[LOG] ${message}`)
  }));
  
  // Resolve services
  const database = container.resolve<any>('Database');
  const logger = container.resolve<any>('Logger');
  
  database.connect();
  logger.log('Application started');
  
  // Verify singleton behavior
  const database2 = container.resolve<any>('Database');
  console.log('Same database instance:', database === database2);
}

// Example 2: Using Decorators
@Injectable({ lifetime: ServiceLifetime.SINGLETON })
class DatabaseService {
  private connected = false;
  
  connect(): void {
    this.connected = true;
    console.log('Database connected');
  }
  
  query(sql: string): any[] {
    if (!this.connected) {
      throw new Error('Database not connected');
    }
    console.log(`Executing: ${sql}`);
    return [];
  }
  
  isConnected(): boolean {
    return this.connected;
  }
}

@Injectable()
class UserRepository {
  constructor(
    @Inject() private database: DatabaseService
  ) {}
  
  findById(id: string): any {
    return this.database.query(`SELECT * FROM users WHERE id = '${id}'`);
  }
  
  create(user: any): void {
    this.database.query(`INSERT INTO users ...`);
  }
}

@Injectable()
class UserService {
  constructor(
    private userRepository: UserRepository,
    @Inject({ token: 'Logger' }) private logger: any
  ) {}
  
  getUser(id: string): any {
    this.logger.log(`Getting user ${id}`);
    return this.userRepository.findById(id);
  }
  
  createUser(user: any): void {
    this.logger.log(`Creating user ${user.name}`);
    this.userRepository.create(user);
  }
}

export function decoratorExample() {
  console.log('\n=== Decorator Example ===');
  
  const container = new DIContainer();
  
  // Register services using decorators
  container.register({
    token: DatabaseService,
    lifetime: ServiceLifetime.SINGLETON,
    constructor: DatabaseService,
    dependencies: [],
    metadata: {},
    interceptors: [],
    tags: []
  });
  
  container.register({
    token: UserRepository,
    lifetime: ServiceLifetime.TRANSIENT,
    constructor: UserRepository,
    dependencies: [DatabaseService],
    metadata: {},
    interceptors: [],
    tags: []
  });
  
  container.registerInstance('Logger', {
    log: (message: string) => console.log(`[LOGGER] ${message}`)
  });
  
  container.register({
    token: UserService,
    lifetime: ServiceLifetime.TRANSIENT,
    constructor: UserService,
    dependencies: [UserRepository, 'Logger'],
    metadata: {},
    interceptors: [],
    tags: []
  });
  
  // Use services
  const userService = container.resolve<UserService>(UserService);
  const database = container.resolve<DatabaseService>(DatabaseService);
  
  database.connect();
  userService.createUser({ name: 'John Doe' });
  userService.getUser('123');
}

// Example 3: Service Tokens and Advanced Features
const USER_REPOSITORY_TOKEN = createServiceToken<UserRepository>('UserRepository');
const EMAIL_SERVICE_TOKEN = createServiceToken<EmailService>('EmailService');

interface EmailService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

@Singleton(EMAIL_SERVICE_TOKEN)
class SMTPEmailService implements EmailService {
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    console.log(`Sending email to ${to}: ${subject}`);
  }
}

@Injectable()
class NotificationService {
  constructor(
    @Inject({ token: EMAIL_SERVICE_TOKEN }) private emailService: EmailService,
    @Inject({ token: SERVICE_TOKENS.LOGGER }) private logger: any
  ) {}
  
  async notifyUser(userId: string, message: string): Promise<void> {
    this.logger.log(`Notifying user ${userId}`);
    await this.emailService.sendEmail('user@example.com', 'Notification', message);
  }
}

export function advancedExample() {
  console.log('\n=== Advanced Features Example ===');
  
  const container = new DIContainer();
  
  // Register with tokens
  container.register({
    token: EMAIL_SERVICE_TOKEN,
    lifetime: ServiceLifetime.SINGLETON,
    constructor: SMTPEmailService,
    dependencies: [],
    metadata: { name: 'SMTP Email Service', version: '1.0.0' },
    interceptors: [],
    tags: ['email', 'communication']
  });
  
  container.registerInstance(SERVICE_TOKENS.LOGGER, {
    log: (message: string) => console.log(`[ADVANCED] ${message}`)
  });
  
  container.register({
    token: NotificationService,
    lifetime: ServiceLifetime.TRANSIENT,
    constructor: NotificationService,
    dependencies: [EMAIL_SERVICE_TOKEN, SERVICE_TOKENS.LOGGER],
    metadata: {},
    interceptors: [],
    tags: []
  });
  
  // Use services
  const notificationService = container.resolve<NotificationService>(NotificationService);
  notificationService.notifyUser('user123', 'Welcome to our service!');
  
  // Inspect registrations
  const registrations = container.getRegistrations();
  console.log('Total registrations:', registrations.length);
  
  registrations.forEach(reg => {
    console.log(`- ${String(reg.token)} (${reg.lifetime})`);
  });
}

// Example 4: Scoped Services
@Scoped()
class RequestContext {
  readonly requestId: string;
  readonly timestamp: number;
  
  constructor() {
    this.requestId = `req_${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = Date.now();
  }
  
  getRequestId(): string {
    return this.requestId;
  }
}

@Injectable()
class RequestHandler {
  constructor(private context: RequestContext) {}
  
  handleRequest(): void {
    console.log(`Handling request ${this.context.getRequestId()}`);
  }
}

export function scopedExample() {
  console.log('\n=== Scoped Services Example ===');
  
  const container = new DIContainer();
  
  container.register({
    token: RequestContext,
    lifetime: ServiceLifetime.SCOPED,
    constructor: RequestContext,
    dependencies: [],
    metadata: {},
    interceptors: [],
    tags: []
  });
  
  container.register({
    token: RequestHandler,
    lifetime: ServiceLifetime.TRANSIENT,
    constructor: RequestHandler,
    dependencies: [RequestContext],
    metadata: {},
    interceptors: [],
    tags: []
  });
  
  // Simulate multiple requests
  for (let i = 0; i < 3; i++) {
    container.beginScope();
    
    const handler1 = container.resolve<RequestHandler>(RequestHandler);
    const handler2 = container.resolve<RequestHandler>(RequestHandler);
    
    handler1.handleRequest();
    handler2.handleRequest();
    
    // Both handlers should have the same request context within the scope
    console.log('Same context in scope:', 
      (handler1 as any).context === (handler2 as any).context);
    
    container.endScope();
  }
}

// Example 5: Interceptors and AOP
@InterceptAll(new LoggingInterceptor(), new PerformanceInterceptor())
@Injectable()
class BusinessService {
  @Intercept(new CachingInterceptor({ ttl: 5000 }))
  calculateExpensiveOperation(input: number): number {
    console.log('Performing expensive calculation...');
    // Simulate expensive operation
    let result = 0;
    for (let i = 0; i < input * 1000; i++) {
      result += Math.sqrt(i);
    }
    return result;
  }
  
  processData(data: any[]): any[] {
    console.log('Processing data...');
    return data.map(item => ({ ...item, processed: true }));
  }
}

export function interceptorExample() {
  console.log('\n=== Interceptor Example ===');
  
  const container = new DIContainer();
  
  // Register with interceptors
  const interceptors = new InterceptorChain()
    .addLogging()
    .addPerformance()
    .build();
  
  container.register({
    token: BusinessService,
    lifetime: ServiceLifetime.SINGLETON,
    constructor: BusinessService,
    dependencies: [],
    metadata: {},
    interceptors,
    tags: []
  });
  
  const service = container.resolve<BusinessService>(BusinessService);
  
  // Test intercepted methods
  const result1 = service.calculateExpensiveOperation(1000);
  const result2 = service.calculateExpensiveOperation(1000); // Should use cache
  
  service.processData([{ id: 1 }, { id: 2 }]);
  
  console.log('Results:', { result1, result2 });
}

// Example 6: Module System
class ApiModule extends ModuleBuilder {
  configure() {
    return this
      .register('ApiClient')
      .withFactory(() => ({
        get: (url: string) => console.log(`GET ${url}`),
        post: (url: string, data: any) => console.log(`POST ${url}`, data)
      }))
      .asSingleton()
      .register()
      .register('ApiService')
      .withConstructor(class ApiService {
        constructor(private client: any) {}
        fetchData() { return this.client.get('/data'); }
      })
      .withDependencies('ApiClient')
      .asTransient()
      .register()
      .build();
  }
}

export function moduleExample() {
  console.log('\n=== Module System Example ===');
  
  const container = new DIContainer();
  
  // Create application with modules
  const app = new ApplicationModule()
    .addModule(new ConfigurationModule({
      apiUrl: 'https://api.example.com',
      timeout: 5000
    }))
    .addModule(new EnvironmentModule())
    .addModule(new LoggingModule())
    .addModule(new ApiModule().configure());
  
  // Configure container
  app.configure(container);
  
  // Use configured services
  const config = container.resolve<any>('Config');
  const apiService = container.resolve<any>('ApiService');
  
  console.log('Config:', config);
  apiService.fetchData();
}

// Example 7: Observability Integration
export async function observabilityExample() {
  console.log('\n=== Observability Example ===');
  
  const container = new DIContainer();
  const observableContainer = makeObservable(container);
  
  // Register some services
  observableContainer.registerSingleton('MetricsService', () => ({
    increment: (metric: string) => console.log(`Incrementing ${metric}`),
    timing: (metric: string, duration: number) => console.log(`Timing ${metric}: ${duration}ms`)
  }));
  
  observableContainer.registerTransient('WorkerService', () => ({
    doWork: () => {
      console.log('Doing work...');
      return Math.random() > 0.5 ? 'success' : 'failure';
    }
  }));
  
  // Use services (with observability)
  const metricsService = observableContainer.resolve<any>('MetricsService');
  const workerService = observableContainer.resolve<any>('WorkerService');
  
  metricsService.increment('work.started');
  const result = workerService.doWork();
  metricsService.increment(`work.${result}`);
  
  // Perform health check
  const healthStatus = await performDIHealthCheck(observableContainer);
  console.log('Health Status:', healthStatus);
}

// Example 8: Full Application Bootstrap
export async function fullApplicationExample() {
  console.log('\n=== Full Application Example ===');
  
  // Create application container with observability
  const container = makeObservable(new DIContainer({
    enableCircularDependencyDetection: true,
    enableInterceptors: true,
    enableObservability: true
  }));
  
  // Configure application modules
  const app = new ApplicationModule()
    .addModule(new ConfigurationModule({
      database: {
        host: 'localhost',
        port: 5432,
        name: 'vsr_landing'
      },
      redis: {
        host: 'localhost',
        port: 6379
      },
      email: {
        smtp: 'smtp.gmail.com',
        port: 587
      }
    }))
    .addModule(new EnvironmentModule())
    .addModule(new LoggingModule());
  
  await app.configure(container);
  
  // Register application services
  container.registerSingleton('DatabaseService', (c) => {
    const config = c.resolve<any>('Config');
    return new DatabaseService();
  });
  
  container.registerTransient('UserService', (c) => {
    const db = c.resolve<DatabaseService>(DatabaseService);
    const logger = c.resolve<any>('Logger');
    return new UserService(new UserRepository(db), logger);
  });
  
  // Start application
  const userService = container.resolve<UserService>('UserService');
  const db = container.resolve<DatabaseService>(DatabaseService);
  
  db.connect();
  userService.createUser({ name: 'VSR User', email: 'user@vsr.com' });
  
  // Show dependency graph
  const graph = container.getDependencyGraph();
  console.log('\nDependency Graph:');
  graph.forEach(node => {
    console.log(`${String(node.token)} -> [${node.dependencies.map(d => String(d)).join(', ')}]`);
  });
  
  // Health check
  const health = await performDIHealthCheck(container);
  console.log('\nApplication Health:', health.healthy ? 'HEALTHY' : 'UNHEALTHY');
  
  // Cleanup
  await container.dispose();
}

// Run all examples
export async function runAllExamples() {
  console.log('🏗️ VSR Landing DI Container Examples');
  console.log('====================================');
  
  try {
    basicExample();
    decoratorExample();
    advancedExample();
    scopedExample();
    interceptorExample();
    moduleExample();
    await observabilityExample();
    await fullApplicationExample();
    
    console.log('\n✅ All DI examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
  }
}

// Quick verification
export function verifyDIImplementation() {
  console.log('\n🔍 Verifying DI Implementation...');
  
  const checks = [
    { name: 'Container Creation', test: () => new DIContainer() },
    { name: 'Service Registration', test: () => {
      const container = new DIContainer();
      container.registerSingleton('test', () => 'test');
      return container.isRegistered('test');
    }},
    { name: 'Service Resolution', test: () => {
      const container = new DIContainer();
      container.registerSingleton('test', () => 'test');
      return container.resolve('test') === 'test';
    }},
    { name: 'Decorator Support', test: () => {
      @Injectable()
      class TestService {}
      return TestService;
    }},
    { name: 'Module System', test: () => new ApplicationModule() },
    { name: 'Observability', test: () => makeObservable(new DIContainer()) }
  ];
  
  let passed = 0;
  for (const check of checks) {
    try {
      const result = check.test();
      if (result) {
        console.log(`✅ ${check.name}`);
        passed++;
      } else {
        console.log(`❌ ${check.name}: Test returned false`);
      }
    } catch (error) {
      console.log(`❌ ${check.name}: ${(error as Error).message}`);
    }
  }
  
  console.log(`\n📊 Verification: ${passed}/${checks.length} checks passed`);
  return passed === checks.length;
}

// Export for CLI usage
if (require.main === module) {
  verifyDIImplementation();
  setTimeout(() => {
    runAllExamples().catch(console.error);
  }, 1000);
}