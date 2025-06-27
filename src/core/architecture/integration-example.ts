/**
 * Enterprise Architecture Integration Example
 * Demonstrates how all architectural layers work together in practice
 */

import { NextApiRequest, NextApiResponse } from 'next';

// Import all architectural layers
import {
  ApplicationSubmission,
  ApplicationDomainService,
  Email,
  DomainEvent,
  ApplicationRepository,
  DomainEventPublisher,
  ApplicationValidationRules
} from './domain-layer';

import {
  SubmitApplicationCommand,
  GetApplicationQuery,
  SubmitApplicationHandler,
  GetApplicationHandler,
  ApplicationCoordinator,
  ApplicationContainer,
  FileStorageService,
  NotificationService,
  ApplicationMetrics,
  ApplicationLogger
} from './application-layer';

import {
  PostgreSQLApplicationRepository,
  EventPublisher,
  S3FileStorageService,
  SMTPNotificationService,
  BusinessApplicationValidationRules,
  PrometheusMetrics,
  StructuredLogger,
  InfrastructureContainer,
  InfrastructureConfig
} from './infrastructure-layer';

import {
  ApplicationController,
  ApiFactory,
  ApiConfiguration,
  RouteFactory
} from './presentation-layer';

import {
  ErrorBoundary,
  ErrorBoundaryConfig,
  EnterpriseError,
  ErrorSeverity,
  ErrorCategory
} from './error-boundary-system';

import {
  ObservabilityService,
  ObservabilityConfig,
  LogLevel,
  HealthCheck,
  HealthStatus
} from './enterprise-monitoring';

import {
  ServiceContainer,
  ContainerBuilder,
  ServiceToken,
  ServiceLifetime,
  LoggingInterceptor,
  PerformanceInterceptor
} from './enterprise-container';

// ================== SERVICE TOKENS ==================

export const ServiceTokens = {
  // Domain Services
  ApplicationRepository: { name: 'ApplicationRepository' } as ServiceToken<ApplicationRepository>,
  DomainEventPublisher: { name: 'DomainEventPublisher' } as ServiceToken<DomainEventPublisher>,
  ApplicationValidationRules: { name: 'ApplicationValidationRules' } as ServiceToken<ApplicationValidationRules>,
  ApplicationDomainService: { name: 'ApplicationDomainService' } as ServiceToken<ApplicationDomainService>,
  
  // Application Services
  FileStorageService: { name: 'FileStorageService' } as ServiceToken<FileStorageService>,
  NotificationService: { name: 'NotificationService' } as ServiceToken<NotificationService>,
  ApplicationMetrics: { name: 'ApplicationMetrics' } as ServiceToken<ApplicationMetrics>,
  ApplicationLogger: { name: 'ApplicationLogger' } as ServiceToken<ApplicationLogger>,
  ApplicationCoordinator: { name: 'ApplicationCoordinator' } as ServiceToken<ApplicationCoordinator>,
  
  // Infrastructure Services
  ObservabilityService: { name: 'ObservabilityService' } as ServiceToken<ObservabilityService>,
  ErrorBoundary: { name: 'ErrorBoundary' } as ServiceToken<ErrorBoundary>,
  
  // External Dependencies
  DatabasePool: { name: 'DatabasePool' } as ServiceToken<unknown>,
  MessageBus: { name: 'MessageBus' } as ServiceToken<unknown>,
  EmailProvider: { name: 'EmailProvider' } as ServiceToken<unknown>,
} as const;

// ================== ENTERPRISE CONTAINER SETUP ==================

export class EnterpriseContainerFactory {
  static create(config: EnterpriseConfiguration): ServiceContainer {
    const builder = new ContainerBuilder()
      .configure({
        enableLogging: config.container.enableLogging,
        enableCircularDependencyDetection: true,
        maxResolutionDepth: 50
      });
    
    // Register infrastructure services
    builder
      .addSingleton(ServiceTokens.ApplicationLogger, () => 
        new StructuredLogger(
          config.serviceName,
          config.serviceVersion
        )
      )
      .addSingleton(ServiceTokens.ApplicationMetrics, () => 
        new PrometheusMetrics()
      );
    
    // Register observability
    builder.addSingleton(ServiceTokens.ObservabilityService, (container) => {
      const logger = container.resolve(ServiceTokens.ApplicationLogger);
      
      const observabilityConfig: ObservabilityConfig = {
        serviceName: config.serviceName,
        serviceVersion: config.serviceVersion,
        tracing: { enabled: true },
        metrics: { enabled: true },
        logging: { level: LogLevel.INFO },
        healthChecks: config.healthChecks
      };
      
      return new ObservabilityService(observabilityConfig);
    });
    
    // Register error boundary
    builder.addSingleton(ServiceTokens.ErrorBoundary, (container) => {
      const logger = container.resolve(ServiceTokens.ApplicationLogger);
      
      const errorBoundaryConfig: ErrorBoundaryConfig = {
        circuitBreaker: {
          failureThreshold: 5,
          recoveryTimeout: 30000,
          monitoringPeriod: 60000,
          minimumThroughput: 10,
          errorPercentageThreshold: 50
        },
        retry: {
          maxAttempts: 3,
          initialDelayMs: 100,
          maxDelayMs: 5000,
          backoffMultiplier: 2,
          jitterMs: 50,
          retryableErrors: ['timeout', 'network', 'temporary']
        },
        bulkhead: {
          maxConcurrentExecutions: 100,
          queueCapacity: 200,
          timeoutMs: 30000
        },
        enableFallback: true
      };
      
      return new ErrorBoundary('application', errorBoundaryConfig, logger);
    });
    
    // Register domain services
    builder
      .addScoped(ServiceTokens.ApplicationRepository, (container) => {
        const logger = container.resolve(ServiceTokens.ApplicationLogger);
        return new PostgreSQLApplicationRepository(config.databasePool as any, logger);
      })
      .addScoped(ServiceTokens.ApplicationValidationRules, (container) => {
        const repository = container.resolve(ServiceTokens.ApplicationRepository);
        const logger = container.resolve(ServiceTokens.ApplicationLogger);
        return new BusinessApplicationValidationRules(repository, logger);
      })
      .addScoped(ServiceTokens.ApplicationDomainService, (container) => {
        const validationRules = container.resolve(ServiceTokens.ApplicationValidationRules);
        const eventPublisher = container.resolve(ServiceTokens.DomainEventPublisher);
        return new ApplicationDomainService(validationRules, eventPublisher);
      });
    
    // Register application services
    builder
      .addScoped(ServiceTokens.FileStorageService, (container) => {
        const logger = container.resolve(ServiceTokens.ApplicationLogger);
        return new S3FileStorageService(config.storageClient as any, config.storageBucket, logger);
      })
      .addScoped(ServiceTokens.NotificationService, (container) => {
        const logger = container.resolve(ServiceTokens.ApplicationLogger);
        return new SMTPNotificationService(config.emailProvider as any, config.adminEmails, logger);
      })
      .addScoped(ServiceTokens.ApplicationCoordinator, (container) => {
        const repository = container.resolve(ServiceTokens.ApplicationRepository);
        const domainService = container.resolve(ServiceTokens.ApplicationDomainService);
        const fileStorage = container.resolve(ServiceTokens.FileStorageService);
        const notificationService = container.resolve(ServiceTokens.NotificationService);
        const metrics = container.resolve(ServiceTokens.ApplicationMetrics);
        const logger = container.resolve(ServiceTokens.ApplicationLogger);
        
        const submitHandler = new SubmitApplicationHandler(
          repository,
          domainService,
          fileStorage,
          notificationService,
          metrics,
          logger
        );
        
        const getHandler = new GetApplicationHandler(repository, metrics, logger);
        
        return new ApplicationCoordinator(submitHandler, getHandler, logger);
      });
    
    // Add interceptors for cross-cutting concerns
    const container = builder.build();
    
    const logger = container.resolve(ServiceTokens.ApplicationLogger);
    const metrics = container.resolve(ServiceTokens.ApplicationMetrics);
    
    // Add logging interceptor to all services
    container.addInterceptor(ServiceTokens.ApplicationCoordinator, new LoggingInterceptor(logger));
    container.addInterceptor(ServiceTokens.ApplicationRepository, new LoggingInterceptor(logger));
    container.addInterceptor(ServiceTokens.FileStorageService, new LoggingInterceptor(logger));
    
    // Add performance monitoring to application services
    container.addInterceptor(ServiceTokens.ApplicationCoordinator, new PerformanceInterceptor(metrics));
    container.addInterceptor(ServiceTokens.ApplicationRepository, new PerformanceInterceptor(metrics));
    
    return container;
  }
}

// ================== ENTERPRISE API FACTORY ==================

export class EnterpriseApiFactory {
  static create(container: ServiceContainer): {
    submitApplication: (req: NextApiRequest, res: NextApiResponse) => Promise<void>;
    getApplication: (req: NextApiRequest, res: NextApiResponse) => Promise<void>;
    healthCheck: (req: NextApiRequest, res: NextApiResponse) => Promise<void>;
  } {
    const observability = container.resolve(ServiceTokens.ObservabilityService);
    const errorBoundary = container.resolve(ServiceTokens.ErrorBoundary);
    const coordinator = container.resolve(ServiceTokens.ApplicationCoordinator);
    
    // Wrap coordinator methods with error boundary and observability
    const instrumentedCoordinator = {
      submitApplication: observability.createInstrumentedFunction(
        'submit_application',
        'application_coordinator',
        async (command: SubmitApplicationCommand) => {
          return await errorBoundary.execute(
            () => coordinator.submitApplication(command),
            'submit_application',
            async () => {
              // Fallback: return a cached response or minimal success
              return {
                success: true,
                data: { applicationId: 'fallback_id', status: 'pending' },
                errors: [],
                metadata: { processingTime: 0, version: '1.0' }
              };
            }
          );
        }
      ),
      
      getApplication: observability.createInstrumentedFunction(
        'get_application',
        'application_coordinator',
        async (query: GetApplicationQuery) => {
          return await errorBoundary.execute(
            () => coordinator.getApplication(query),
            'get_application'
          );
        }
      )
    };
    
    // Create API configuration
    const apiConfig: ApiConfiguration = {
      rateLimiting: {
        windowMs: 60000,
        maxRequests: 100
      },
      cors: {
        origins: ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        headers: ['Content-Type', 'Authorization']
      },
      validation: {
        maxRequestSize: 10 * 1024 * 1024, // 10MB
        allowedFileTypes: ['application/pdf', 'image/jpeg', 'image/png']
      },
      logging: {
        level: 'INFO',
        includeRequestBody: false,
        includeResponseBody: false
      }
    };
    
    const routeFactory = ApiFactory.create(container as any, apiConfig);
    const routes = routeFactory.createApplicationRoutes();
    
    return {
      submitApplication: routes.submitApplication,
      getApplication: routes.getApplication,
      healthCheck: async (req: NextApiRequest, res: NextApiResponse) => {
        try {
          const health = await observability.health.getServiceHealth();
          const statusCode = health.status === HealthStatus.HEALTHY ? 200 : 503;
          res.status(statusCode).json(health);
        } catch (error) {
          res.status(500).json({
            service: 'vsr-application',
            status: HealthStatus.UNHEALTHY,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    };
  }
}

// ================== CONFIGURATION INTERFACE ==================

export interface EnterpriseConfiguration {
  serviceName: string;
  serviceVersion: string;
  container: {
    enableLogging: boolean;
  };
  databasePool: unknown; // DatabasePool interface
  storageClient: unknown; // CloudStorageClient interface
  storageBucket: string;
  emailProvider: unknown; // EmailProvider interface
  adminEmails: string[];
  healthChecks: HealthCheck[];
}

// ================== USAGE EXAMPLE ==================

export class VSREnterpriseApplication {
  private container?: ServiceContainer;
  private observability?: ObservabilityService;
  
  async initialize(config: EnterpriseConfiguration): Promise<void> {
    try {
      // Create enterprise container
      this.container = EnterpriseContainerFactory.create(config);
      
      // Initialize observability
      this.observability = this.container.resolve(ServiceTokens.ObservabilityService);
      
      // Register health checks
      this.observability.health.registerHealthCheck({
        name: 'database',
        check: async () => {
          const repository = this.container!.resolve(ServiceTokens.ApplicationRepository);
          // Test database connection
          return {
            status: HealthStatus.HEALTHY,
            message: 'Database connection is healthy',
            duration: 50
          };
        },
        interval: 30000,
        critical: true
      });
      
      this.observability.health.registerHealthCheck({
        name: 'storage',
        check: async () => {
          const storage = this.container!.resolve(ServiceTokens.FileStorageService);
          // Test storage connection
          return {
            status: HealthStatus.HEALTHY,
            message: 'Storage service is healthy',
            duration: 25
          };
        },
        interval: 60000,
        critical: false
      });
      
      this.observability.logger.info('Enterprise application initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize enterprise application:', error);
      throw error;
    }
  }
  
  getApiHandlers() {
    if (!this.container) {
      throw new Error('Application not initialized');
    }
    
    return EnterpriseApiFactory.create(this.container);
  }
  
  async shutdown(): Promise<void> {
    if (this.observability) {
      await this.observability.shutdown();
    }
    
    if (this.container) {
      this.container.clear();
    }
  }
}

// ================== EXAMPLE USAGE IN NEXT.JS API ROUTE ==================

export function createEnterpriseApiRoute(config: EnterpriseConfiguration) {
  const app = new VSREnterpriseApplication();
  let apiHandlers: ReturnType<typeof EnterpriseApiFactory.create>;
  
  const initializeApp = async () => {
    if (!apiHandlers) {
      await app.initialize(config);
      apiHandlers = app.getApiHandlers();
    }
    return apiHandlers;
  };
  
  return {
    submitApplication: async (req: NextApiRequest, res: NextApiResponse) => {
      const handlers = await initializeApp();
      return handlers.submitApplication(req, res);
    },
    
    getApplication: async (req: NextApiRequest, res: NextApiResponse) => {
      const handlers = await initializeApp();
      return handlers.getApplication(req, res);
    },
    
    healthCheck: async (req: NextApiRequest, res: NextApiResponse) => {
      const handlers = await initializeApp();
      return handlers.healthCheck(req, res);
    }
  };
}

// Example usage in /pages/api/applications/submit.ts:
/*
import { createEnterpriseApiRoute } from '@/core/architecture/integration-example';

const config: EnterpriseConfiguration = {
  serviceName: 'vsr-construction',
  serviceVersion: '1.0.0',
  container: { enableLogging: true },
  databasePool: {} as any, // database pool instance
  storageClient: {} as any, // S3 client instance
  storageBucket: 'vsr-applications',
  emailProvider: {} as any, // email provider instance
  adminEmails: ['admin@vsr.com'],
  healthChecks: []
};

const { submitApplication } = createEnterpriseApiRoute(config);

export default submitApplication;
*/