/**
 * Dependency Injection Container - Infrastructure Layer
 * Clean Architecture: Wires together all dependencies
 */

// Domain Interfaces
import { QuoteRepository } from '../../domain/quote/QuoteRepository';
import { JobApplicationRepository } from '../../domain/application/JobApplicationRepository';
import { NotificationService } from '../../domain/services/NotificationService';
import { FileStorageService } from '../../domain/services/FileStorageService';
import { DomainEventPublisher } from '../../domain/shared/DomainEventPublisher';

// Infrastructure Implementations
import { InMemoryQuoteRepository } from '../persistence/InMemoryQuoteRepository';
import { InMemoryJobApplicationRepository } from '../persistence/InMemoryJobApplicationRepository';
import { ConsoleNotificationService } from '../notifications/ConsoleNotificationService';
import { InMemoryFileStorageService } from '../storage/InMemoryFileStorageService';
import { InMemoryEventPublisher } from '../events/InMemoryEventPublisher';

// Use Cases
import { SubmitQuoteRequestUseCase } from '../../application/usecases/SubmitQuoteRequestUseCase';
import { SubmitJobApplicationUseCase } from '../../application/usecases/SubmitJobApplicationUseCase';
import { ProcessQuoteUseCase } from '../../application/usecases/ProcessQuoteUseCase';

// Event Handlers
import { QuoteEventHandler } from '../events/QuoteEventHandler';
import { JobApplicationEventHandler } from '../events/JobApplicationEventHandler';

export interface Container {
  // Repositories
  quoteRepository: QuoteRepository;
  jobApplicationRepository: JobApplicationRepository;
  
  // Services
  notificationService: NotificationService;
  fileStorageService: FileStorageService;
  eventPublisher: DomainEventPublisher;
  
  // Use Cases
  submitQuoteRequestUseCase: SubmitQuoteRequestUseCase;
  submitJobApplicationUseCase: SubmitJobApplicationUseCase;
  processQuoteUseCase: ProcessQuoteUseCase;
}

export class DIContainer implements Container {
  private static instance: DIContainer;
  
  // Infrastructure
  public readonly quoteRepository: QuoteRepository;
  public readonly jobApplicationRepository: JobApplicationRepository;
  public readonly notificationService: NotificationService;
  public readonly fileStorageService: FileStorageService;
  public readonly eventPublisher: DomainEventPublisher;
  
  // Use Cases
  public readonly submitQuoteRequestUseCase: SubmitQuoteRequestUseCase;
  public readonly submitJobApplicationUseCase: SubmitJobApplicationUseCase;
  public readonly processQuoteUseCase: ProcessQuoteUseCase;

  private constructor() {
    // Initialize infrastructure services
    this.eventPublisher = new InMemoryEventPublisher();
    this.notificationService = new ConsoleNotificationService();
    this.fileStorageService = new InMemoryFileStorageService();
    
    // Initialize repositories
    this.quoteRepository = new InMemoryQuoteRepository();
    this.jobApplicationRepository = new InMemoryJobApplicationRepository();
    
    // Initialize use cases
    this.submitQuoteRequestUseCase = new SubmitQuoteRequestUseCase(
      this.quoteRepository,
      this.notificationService,
      this.fileStorageService,
      this.eventPublisher
    );
    
    this.submitJobApplicationUseCase = new SubmitJobApplicationUseCase(
      this.jobApplicationRepository,
      this.notificationService,
      this.fileStorageService,
      this.eventPublisher
    );
    
    this.processQuoteUseCase = new ProcessQuoteUseCase(
      this.quoteRepository,
      this.notificationService,
      this.eventPublisher
    );
    
    // Setup event handlers
    this.setupEventHandlers();
  }

  public static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  private setupEventHandlers(): void {
    const quoteEventHandler = new QuoteEventHandler(this.notificationService);
    const jobApplicationEventHandler = new JobApplicationEventHandler(this.notificationService);
    
    // Subscribe to quote events
    quoteEventHandler.subscribeToEvents(this.eventPublisher);
    
    // Subscribe to job application events
    jobApplicationEventHandler.subscribeToEvents(this.eventPublisher);
  }

  // Development/testing helpers
  public reset(): void {
    // Reset repositories
    if (this.quoteRepository instanceof InMemoryQuoteRepository) {
      (this.quoteRepository as InMemoryQuoteRepository).clear();
    }
    
    if (this.jobApplicationRepository instanceof InMemoryJobApplicationRepository) {
      (this.jobApplicationRepository as InMemoryJobApplicationRepository).clear();
    }
    
    // Reset event publisher
    if (this.eventPublisher instanceof InMemoryEventPublisher) {
      (this.eventPublisher as InMemoryEventPublisher).clearAllSubscriptions();
      this.setupEventHandlers();
    }
  }
}

// Global container instance
export const container = DIContainer.getInstance();