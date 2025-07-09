# Dependency Injection Container

A comprehensive, production-ready Dependency Injection (DI) container for TypeScript/JavaScript applications with support for IoC (Inversion of Control), service registration, lifecycle management, and observability.

## Features

- ✅ **Service Registration & Resolution** - Register and resolve services with different lifetimes
- ✅ **Lifecycle Management** - Singleton, Transient, and Scoped service lifetimes
- ✅ **Decorator Support** - TypeScript decorators for clean service definition
- ✅ **Circular Dependency Detection** - Prevents and detects circular dependencies
- ✅ **Module System** - Organize services into reusable modules
- ✅ **Interceptors (AOP)** - Aspect-oriented programming with method interceptors
- ✅ **Container Hierarchy** - Parent-child container relationships
- ✅ **Observability Integration** - Built-in monitoring and health checks
- ✅ **Scope Management** - Request-scoped services for web applications
- ✅ **Type Safety** - Full TypeScript support with type inference

## Quick Start

### Basic Usage

```typescript
import { DIContainer, Injectable, Inject } from './di';

// Create container
const container = new DIContainer();

// Register services
container.registerSingleton('Logger', () => ({
  log: (msg: string) => console.log(msg)
}));

container.registerTransient('UserService', (c) => {
  const logger = c.resolve('Logger');
  return {
    createUser: (name: string) => {
      logger.log(`Creating user: ${name}`);
    }
  };
});

// Resolve and use
const userService = container.resolve('UserService');
userService.createUser('John Doe');
```

### Using Decorators

```typescript
@Injectable()
class DatabaseService {
  connect() {
    console.log('Database connected');
  }
}

@Injectable()
class UserRepository {
  constructor(
    @Inject() private database: DatabaseService
  ) {}
  
  findUser(id: string) {
    return { id, name: 'John' };
  }
}

@Injectable()
class UserService {
  constructor(
    private repository: UserRepository,
    @Inject('Logger') private logger: any
  ) {}
  
  getUser(id: string) {
    this.logger.log(`Getting user ${id}`);
    return this.repository.findUser(id);
  }
}

// Register services
container.register({
  token: DatabaseService,
  lifetime: ServiceLifetime.SINGLETON,
  constructor: DatabaseService,
  dependencies: []
});

container.register({
  token: UserRepository,
  lifetime: ServiceLifetime.TRANSIENT,
  constructor: UserRepository,
  dependencies: [DatabaseService]
});

container.register({
  token: UserService,
  lifetime: ServiceLifetime.TRANSIENT,
  constructor: UserService,
  dependencies: [UserRepository, 'Logger']
});
```

## Service Lifetimes

### Singleton
Services are created once and reused throughout the application lifetime.

```typescript
container.registerSingleton('Database', () => new DatabaseConnection());
```

### Transient
New instance created every time the service is resolved.

```typescript
container.registerTransient('RequestHandler', () => new RequestHandler());
```

### Scoped
Instance is created once per scope (e.g., per HTTP request).

```typescript
container.registerScoped('RequestContext', () => new RequestContext());

// Use with scopes
container.beginScope();
const context1 = container.resolve('RequestContext');
const context2 = container.resolve('RequestContext'); // Same instance
await container.endScope();

container.beginScope();
const context3 = container.resolve('RequestContext'); // New instance
await container.endScope();
```

## Module System

Organize services into reusable modules:

```typescript
import { DIModuleBase, ApplicationModule } from './di';

class DatabaseModule extends DIModuleBase {
  readonly name = 'Database';
  
  configure(container: Container): void {
    container.registerSingleton('Database', () => new PostgreSQLDatabase());
    container.registerTransient('UserRepository', (c) => 
      new UserRepository(c.resolve('Database'))
    );
  }
}

class ApiModule extends DIModuleBase {
  readonly name = 'API';
  dependencies = ['Database'];
  
  configure(container: Container): void {
    container.registerTransient('UserController', (c) =>
      new UserController(c.resolve('UserRepository'))
    );
  }
}

// Bootstrap application
const app = new ApplicationModule()
  .addModule(new DatabaseModule())
  .addModule(new ApiModule());

await app.configure(container);
```

## Interceptors (AOP)

Add cross-cutting concerns with interceptors:

```typescript
import { LoggingInterceptor, PerformanceInterceptor, CachingInterceptor } from './di';

@Injectable()
@InterceptAll(
  new LoggingInterceptor(),
  new PerformanceInterceptor()
)
class BusinessService {
  
  @Intercept(new CachingInterceptor({ ttl: 5000 }))
  expensiveOperation(input: number): number {
    // Expensive calculation
    return input * Math.PI;
  }
}
```

Available interceptors:
- `LoggingInterceptor` - Logs method calls and results
- `PerformanceInterceptor` - Measures execution time
- `CachingInterceptor` - Caches method results
- `RetryInterceptor` - Retries failed operations
- `CircuitBreakerInterceptor` - Circuit breaker pattern
- `SecurityInterceptor` - Access control
- `ValidationInterceptor` - Input validation

## Service Tokens

Use typed service tokens for better type safety:

```typescript
import { createServiceToken } from './di';

// Create typed tokens
const DATABASE_TOKEN = createServiceToken<DatabaseService>('Database');
const LOGGER_TOKEN = createServiceToken<Logger>('Logger');

// Register with tokens
container.registerSingleton(DATABASE_TOKEN, () => new DatabaseService());

// Resolve with full type safety
const database = container.resolve(DATABASE_TOKEN); // Type: DatabaseService
```

## Observability

Monitor your DI container with built-in observability:

```typescript
import { makeObservable, performDIHealthCheck } from './di';

// Wrap container with observability
const observableContainer = makeObservable(container);

// All operations are now monitored
const service = observableContainer.resolve('MyService');

// Perform health checks
const health = await performDIHealthCheck(container);
console.log('Container health:', health.healthy);
```

## Configuration

Configure the container behavior:

```typescript
const container = new DIContainer({
  enableCircularDependencyDetection: true, // Default: true
  enableAutoRegistration: false,           // Default: false
  enableInterceptors: true,                // Default: true
  enableObservability: true,               // Default: false
  defaultLifetime: ServiceLifetime.TRANSIENT, // Default: TRANSIENT
  maxResolutionDepth: 50                   // Default: 50
});
```

## Container Hierarchy

Create parent-child container relationships:

```typescript
const appContainer = new DIContainer();
const requestContainer = appContainer.createChild();

// Register in parent
appContainer.registerSingleton('Database', () => new Database());

// Register in child
requestContainer.registerScoped('RequestContext', () => new RequestContext());

// Child can resolve from parent
const database = requestContainer.resolve('Database'); // Works!

// Parent cannot resolve from child
// const context = appContainer.resolve('RequestContext'); // Throws error
```

## Error Handling

The container provides specific error types:

```typescript
import { ServiceNotFoundError, CircularDependencyError } from './di';

try {
  const service = container.resolve('NonExistentService');
} catch (error) {
  if (error instanceof ServiceNotFoundError) {
    console.log('Service not registered');
  }
}
```

## Best Practices

1. **Use Service Tokens** - For better type safety and refactoring
2. **Prefer Constructor Injection** - Over property injection
3. **Keep Dependencies Minimal** - Avoid services with too many dependencies
4. **Use Modules** - Organize related services together
5. **Monitor Container Health** - Use built-in health checks
6. **Dispose Properly** - Always dispose containers when done

```typescript
// Good: Constructor injection with typed tokens
@Injectable()
class UserService {
  constructor(
    @Inject(REPOSITORY_TOKEN) private repository: UserRepository,
    @Inject(LOGGER_TOKEN) private logger: Logger
  ) {}
}

// Good: Proper disposal
async function shutdown() {
  await container.dispose();
}
```

## Integration with VSR Landing

The DI container integrates seamlessly with the VSR landing application:

```typescript
// Register VSR-specific services
container.registerSingleton('QuoteService', (c) => 
  new QuoteService(
    c.resolve('Database'),
    c.resolve('EmailService'),
    c.resolve('Logger')
  )
);

container.registerTransient('ContactFormHandler', (c) =>
  new ContactFormHandler(c.resolve('QuoteService'))
);

// Use in API routes
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const formHandler = container.resolve('ContactFormHandler');
  return formHandler.processForm(req.body);
}
```

## Testing

The container supports easy testing with mocks:

```typescript
// Test setup
const testContainer = new DIContainer();
const mockDatabase = { query: jest.fn() };
testContainer.registerInstance('Database', mockDatabase);

// Test
const service = testContainer.resolve('UserService');
service.getUser('123');
expect(mockDatabase.query).toHaveBeenCalled();
```

## Performance

The container is optimized for production use:

- Fast service resolution (1000+ ops/sec)
- Minimal memory overhead
- Efficient dependency graph analysis
- Lazy loading support
- Scope cleanup automation

## API Reference

### Container Methods

- `register<T>(registration: ServiceRegistration<T>): Container`
- `registerSingleton<T>(token, factory): Container`
- `registerTransient<T>(token, factory): Container`
- `registerScoped<T>(token, factory): Container`
- `registerInstance<T>(token, instance): Container`
- `resolve<T>(token): T`
- `resolveAsync<T>(token): Promise<T>`
- `resolveAll<T>(token): T[]`
- `resolveOptional<T>(token): T | undefined`
- `isRegistered<T>(token): boolean`
- `createChild(): Container`
- `dispose(): Promise<void>`

### Decorators

- `@Injectable(options?)` - Mark class as injectable
- `@Singleton(token?, metadata?)` - Register as singleton
- `@Transient(token?, metadata?)` - Register as transient
- `@Scoped(token?, metadata?)` - Register as scoped
- `@Inject(options?)` - Inject dependency
- `@LazyInject(token?)` - Lazy dependency injection
- `@OptionalInject(token?)` - Optional dependency injection

For more examples, see the `examples.ts` file.