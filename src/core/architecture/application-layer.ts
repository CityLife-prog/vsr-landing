/**
 * Application Layer Architecture - Use Cases and Commands
 * ENTERPRISE PATTERN: CQRS (Command Query Responsibility Segregation)
 * 
 * This layer contains:
 * - Application services and use cases
 * - Command and query handlers
 * - Application-specific business rules
 * - Orchestration logic
 */

import {
  ApplicationSubmission,
  ApplicationDomainService,
  ApplicationRepository,
  DomainEventPublisher,
  ApplicationValidationRules,
  DomainError
} from './domain-layer';

// ================== COMMANDS AND QUERIES ==================

export interface Command {
  readonly commandId: string;
  readonly timestamp: Date;
}

export interface Query {
  readonly queryId: string;
  readonly timestamp: Date;
}

export class SubmitApplicationCommand implements Command {
  public readonly commandId: string;
  public readonly timestamp: Date;
  
  constructor(
    public readonly name: string,
    public readonly email: string,
    public readonly phone: string,
    public readonly experience: string,
    public readonly resumeFileId?: string,
    public readonly metadata?: {
      ipAddress?: string;
      userAgent?: string;
      source?: string;
    }
  ) {
    this.commandId = `submit_app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
  }
}

export class GetApplicationQuery implements Query {
  public readonly queryId: string;
  public readonly timestamp: Date;
  
  constructor(
    public readonly applicationId: string
  ) {
    this.queryId = `get_app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
  }
}

export class GetApplicationsByStatusQuery implements Query {
  public readonly queryId: string;
  public readonly timestamp: Date;
  
  constructor(
    public readonly status: string,
    public readonly limit: number = 50,
    public readonly offset: number = 0
  ) {
    this.queryId = `get_apps_status_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.timestamp = new Date();
  }
}

// ================== RESULT TYPES ==================

export interface ApplicationResult {
  success: boolean;
  data?: unknown;
  errors?: string[];
  metadata?: {
    processingTime?: number;
    version?: string;
  };
}

export class SuccessResult<T> implements ApplicationResult {
  public readonly success = true;
  
  constructor(
    public readonly data: T,
    public readonly metadata?: { processingTime?: number; version?: string }
  ) {}
}

export class ErrorResult implements ApplicationResult {
  public readonly success = false;
  public readonly data = undefined;
  
  constructor(
    public readonly errors: string[],
    public readonly metadata?: { processingTime?: number; version?: string }
  ) {}
}

// ================== APPLICATION SERVICES ==================

export interface ApplicationMetrics {
  recordCommandExecution(commandType: string, duration: number, success: boolean): void;
  recordQueryExecution(queryType: string, duration: number, recordCount: number): void;
  incrementCounter(metric: string, tags?: Record<string, string>): void;
}

export interface ApplicationLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: Error, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

export interface FileStorageService {
  store(file: Buffer, metadata: FileMetadata): Promise<string>;
  retrieve(fileId: string): Promise<Buffer>;
  delete(fileId: string): Promise<void>;
  getMetadata(fileId: string): Promise<FileMetadata>;
}

export interface FileMetadata {
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  uploadedBy?: string;
}

export interface NotificationService {
  sendApplicationConfirmation(
    email: string,
    applicationId: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;
  
  notifyAdministrators(
    applicationId: string,
    applicantName: string,
    metadata?: Record<string, unknown>
  ): Promise<void>;
}

// ================== COMMAND HANDLERS ==================

export class SubmitApplicationHandler {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly domainService: ApplicationDomainService,
    private readonly fileStorage: FileStorageService,
    private readonly notificationService: NotificationService,
    private readonly metrics: ApplicationMetrics,
    private readonly logger: ApplicationLogger
  ) {}
  
  async handle(command: SubmitApplicationCommand): Promise<ApplicationResult> {
    const startTime = Date.now();
    const context = { commandId: command.commandId, email: command.email };
    
    try {
      this.logger.info('Processing application submission', context);
      
      // Validate file if provided
      const resumeFileId = command.resumeFileId;
      if (resumeFileId) {
        try {
          await this.fileStorage.getMetadata(resumeFileId);
        } catch {
          this.logger.warn('Invalid resume file ID provided', { ...context, resumeFileId });
          return new ErrorResult(['Invalid resume file']);
        }
      }
      
      // Create and validate application through domain service
      const application = await this.domainService.submitApplication({
        name: command.name.trim(),
        email: command.email.toLowerCase().trim(),
        phone: command.phone.trim(),
        experience: command.experience.trim(),
        resumeFileId,
        ipAddress: command.metadata?.ipAddress,
        userAgent: command.metadata?.userAgent
      });
      
      // Persist application
      await this.applicationRepository.save(application);
      
      // Send notifications asynchronously (fire-and-forget)
      this.sendNotificationsAsync(application, context);
      
      const processingTime = Date.now() - startTime;
      this.metrics.recordCommandExecution('SubmitApplication', processingTime, true);
      
      this.logger.info('Application submitted successfully', {
        ...context,
        applicationId: application.getId(),
        processingTime
      });
      
      return new SuccessResult(
        {
          applicationId: application.getId(),
          status: application.status,
          submittedAt: application.submittedAt
        },
        { processingTime, version: '1.0' }
      );
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.metrics.recordCommandExecution('SubmitApplication', processingTime, false);
      
      if (error instanceof DomainError) {
        this.logger.warn('Application submission validation failed', { ...context, error: error.message });
        return new ErrorResult([error.message], { processingTime });
      }
      
      this.logger.error('Application submission failed', error as Error, context);
      return new ErrorResult(['Internal server error'], { processingTime });
    }
  }
  
  private async sendNotificationsAsync(
    application: ApplicationSubmission,
    context: Record<string, unknown>
  ): Promise<void> {
    try {
      await Promise.all([
        this.notificationService.sendApplicationConfirmation(
          application.email,
          application.getId(),
          { applicantName: application.name }
        ),
        this.notificationService.notifyAdministrators(
          application.getId(),
          application.name,
          { submittedAt: application.submittedAt }
        )
      ]);
      
      this.logger.info('Notifications sent successfully', context);
    } catch (error) {
      // Don't fail the main operation, just log the error
      this.logger.error('Failed to send notifications', error as Error, context);
      this.metrics.incrementCounter('notification_failures', { type: 'application_submission' });
    }
  }
}

// ================== QUERY HANDLERS ==================

export class GetApplicationHandler {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly metrics: ApplicationMetrics,
    private readonly logger: ApplicationLogger
  ) {}
  
  async handle(query: GetApplicationQuery): Promise<ApplicationResult> {
    const startTime = Date.now();
    const context = { queryId: query.queryId, applicationId: query.applicationId };
    
    try {
      this.logger.debug('Retrieving application', context);
      
      const application = await this.applicationRepository.findById(query.applicationId);
      
      const processingTime = Date.now() - startTime;
      this.metrics.recordQueryExecution('GetApplication', processingTime, application ? 1 : 0);
      
      if (!application) {
        this.logger.info('Application not found', context);
        return new ErrorResult(['Application not found'], { processingTime });
      }
      
      this.logger.debug('Application retrieved successfully', { ...context, processingTime });
      
      return new SuccessResult(
        application.toSnapshot(),
        { processingTime, version: '1.0' }
      );
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.metrics.recordQueryExecution('GetApplication', processingTime, 0);
      
      this.logger.error('Failed to retrieve application', error as Error, context);
      return new ErrorResult(['Internal server error'], { processingTime });
    }
  }
}

// ================== APPLICATION COORDINATOR ==================

export class ApplicationCoordinator {
  constructor(
    private readonly submitHandler: SubmitApplicationHandler,
    private readonly getHandler: GetApplicationHandler,
    private readonly logger: ApplicationLogger
  ) {}
  
  async submitApplication(command: SubmitApplicationCommand): Promise<ApplicationResult> {
    this.logger.info('Coordinating application submission', { commandId: command.commandId });
    return this.submitHandler.handle(command);
  }
  
  async getApplication(query: GetApplicationQuery): Promise<ApplicationResult> {
    this.logger.debug('Coordinating application retrieval', { queryId: query.queryId });
    return this.getHandler.handle(query);
  }
}

// ================== DEPENDENCY INJECTION CONTAINER ==================

export interface ApplicationContainer {
  // Core Services
  getApplicationRepository(): ApplicationRepository;
  getDomainEventPublisher(): DomainEventPublisher;
  getApplicationValidationRules(): ApplicationValidationRules;
  
  // Application Services
  getFileStorageService(): FileStorageService;
  getNotificationService(): NotificationService;
  getApplicationMetrics(): ApplicationMetrics;
  getApplicationLogger(): ApplicationLogger;
  
  // Domain Services
  getApplicationDomainService(): ApplicationDomainService;
  
  // Command/Query Handlers
  getSubmitApplicationHandler(): SubmitApplicationHandler;
  getGetApplicationHandler(): GetApplicationHandler;
  
  // Coordinators
  getApplicationCoordinator(): ApplicationCoordinator;
}

export class DefaultApplicationContainer implements ApplicationContainer {
  private readonly instances = new Map<string, unknown>();
  
  getApplicationRepository(): ApplicationRepository {
    return this.getSingleton('ApplicationRepository', () => {
      throw new Error('ApplicationRepository must be registered');
    });
  }
  
  getDomainEventPublisher(): DomainEventPublisher {
    return this.getSingleton('DomainEventPublisher', () => {
      throw new Error('DomainEventPublisher must be registered');
    });
  }
  
  getApplicationValidationRules(): ApplicationValidationRules {
    return this.getSingleton('ApplicationValidationRules', () => {
      throw new Error('ApplicationValidationRules must be registered');
    });
  }
  
  getFileStorageService(): FileStorageService {
    return this.getSingleton('FileStorageService', () => {
      throw new Error('FileStorageService must be registered');
    });
  }
  
  getNotificationService(): NotificationService {
    return this.getSingleton('NotificationService', () => {
      throw new Error('NotificationService must be registered');
    });
  }
  
  getApplicationMetrics(): ApplicationMetrics {
    return this.getSingleton('ApplicationMetrics', () => {
      throw new Error('ApplicationMetrics must be registered');
    });
  }
  
  getApplicationLogger(): ApplicationLogger {
    return this.getSingleton('ApplicationLogger', () => {
      throw new Error('ApplicationLogger must be registered');
    });
  }
  
  getApplicationDomainService(): ApplicationDomainService {
    return this.getSingleton('ApplicationDomainService', () => {
      return new ApplicationDomainService(
        this.getApplicationValidationRules(),
        this.getDomainEventPublisher()
      );
    });
  }
  
  getSubmitApplicationHandler(): SubmitApplicationHandler {
    return this.getSingleton('SubmitApplicationHandler', () => {
      return new SubmitApplicationHandler(
        this.getApplicationRepository(),
        this.getApplicationDomainService(),
        this.getFileStorageService(),
        this.getNotificationService(),
        this.getApplicationMetrics(),
        this.getApplicationLogger()
      );
    });
  }
  
  getGetApplicationHandler(): GetApplicationHandler {
    return this.getSingleton('GetApplicationHandler', () => {
      return new GetApplicationHandler(
        this.getApplicationRepository(),
        this.getApplicationMetrics(),
        this.getApplicationLogger()
      );
    });
  }
  
  getApplicationCoordinator(): ApplicationCoordinator {
    return this.getSingleton('ApplicationCoordinator', () => {
      return new ApplicationCoordinator(
        this.getSubmitApplicationHandler(),
        this.getGetApplicationHandler(),
        this.getApplicationLogger()
      );
    });
  }
  
  // Registration methods for external dependencies
  register<T>(key: string, factory: () => T): void {
    this.instances.set(key, factory);
  }
  
  private getSingleton<T>(key: string, factory: () => T): T {
    if (!this.instances.has(key)) {
      this.instances.set(key, factory());
    }
    const instance = this.instances.get(key);
    return typeof instance === 'function' ? (instance as () => T)() : (instance as T);
  }
}