/**
 * CQRS Container - Infrastructure Layer
 * Dependency injection container for CQRS components
 */

import { CommandDispatcher } from '../../application/cqrs/Command';
import { QueryDispatcher } from '../../application/cqrs/Query';
import { InMemoryCommandDispatcher } from './InMemoryCommandDispatcher';
import { InMemoryQueryDispatcher } from './InMemoryQueryDispatcher';
import { InMemoryQueryCache } from './InMemoryQueryCache';

// Application Services
import { QuoteApplicationService } from '../../application/services/QuoteApplicationService';
import { JobApplicationApplicationService } from '../../application/services/JobApplicationApplicationService';

// Command Handlers
import { SubmitQuoteRequestCommandHandler } from '../../application/handlers/commands/SubmitQuoteRequestCommandHandler';
import { 
  MoveQuoteToReviewCommandHandler,
  SendQuoteCommandHandler,
  UpdateQuotePriorityCommandHandler,
  RejectQuoteCommandHandler
} from '../../application/handlers/commands/ProcessQuoteCommandHandler';
import { SubmitJobApplicationCommandHandler } from '../../application/handlers/commands/SubmitJobApplicationCommandHandler';

// Query Handlers
import { GetQuoteListQueryHandler } from '../../application/handlers/queries/GetQuoteListQueryHandler';
import { GetQuoteDetailsQueryHandler } from '../../application/handlers/queries/GetQuoteDetailsQueryHandler';

// Commands
import { SubmitQuoteRequestCommand } from '../../application/commands/quote/SubmitQuoteRequestCommand';
import { 
  MoveQuoteToReviewCommand,
  SendQuoteCommand,
  UpdateQuotePriorityCommand,
  RejectQuoteCommand
} from '../../application/commands/quote/ProcessQuoteCommand';
import { SubmitJobApplicationCommand } from '../../application/commands/application/SubmitJobApplicationCommand';

// Queries
import { GetQuoteListQuery } from '../../application/queries/quote/GetQuoteListQuery';
import { GetQuoteDetailsQuery } from '../../application/queries/quote/GetQuoteDetailsQuery';

// Middleware
import { CommandLoggingMiddleware } from '../../application/middleware/CommandLoggingMiddleware';
import { CommandValidationMiddleware } from '../../application/middleware/CommandValidationMiddleware';
import { PerformanceMiddleware, InMemoryPerformanceMonitor } from '../../application/middleware/PerformanceMiddleware';

// Domain Services (from existing container)
import { container as domainContainer } from '../di/Container';

export interface CQRSContainer {
  // Dispatchers
  commandDispatcher: CommandDispatcher;
  queryDispatcher: QueryDispatcher;
  
  // Application Services
  quoteApplicationService: QuoteApplicationService;
  jobApplicationApplicationService: JobApplicationApplicationService;
  
  // Utilities
  performanceMonitor: InMemoryPerformanceMonitor;
}

export class CQRSDIContainer implements CQRSContainer {
  private static instance: CQRSDIContainer;
  
  // Core CQRS Infrastructure
  public readonly commandDispatcher: CommandDispatcher;
  public readonly queryDispatcher: QueryDispatcher;
  public readonly performanceMonitor: InMemoryPerformanceMonitor;
  
  // Application Services
  public readonly quoteApplicationService: QuoteApplicationService;
  public readonly jobApplicationApplicationService: JobApplicationApplicationService;

  private constructor() {
    // Initialize performance monitoring
    this.performanceMonitor = new InMemoryPerformanceMonitor();

    // Initialize query cache
    const queryCache = new InMemoryQueryCache();

    // Initialize dispatchers
    this.commandDispatcher = new InMemoryCommandDispatcher();
    this.queryDispatcher = new InMemoryQueryDispatcher(queryCache);

    // Setup middleware
    this.setupCommandMiddleware();

    // Register command handlers
    this.registerCommandHandlers();

    // Register query handlers
    this.registerQueryHandlers();

    // Initialize application services
    this.quoteApplicationService = new QuoteApplicationService(
      this.commandDispatcher,
      this.queryDispatcher
    );

    this.jobApplicationApplicationService = new JobApplicationApplicationService(
      this.commandDispatcher,
      this.queryDispatcher
    );
  }

  public static getInstance(): CQRSDIContainer {
    if (!CQRSDIContainer.instance) {
      CQRSDIContainer.instance = new CQRSDIContainer();
    }
    return CQRSDIContainer.instance;
  }

  private setupCommandMiddleware(): void {
    const commandDispatcher = this.commandDispatcher as InMemoryCommandDispatcher;
    
    // Add middleware in order of execution
    commandDispatcher.addMiddleware(new CommandLoggingMiddleware());
    commandDispatcher.addMiddleware(new CommandValidationMiddleware());
    commandDispatcher.addMiddleware(new PerformanceMiddleware(this.performanceMonitor));
  }

  private registerCommandHandlers(): void {
    // Quote command handlers
    this.commandDispatcher.register(
      SubmitQuoteRequestCommand,
      new SubmitQuoteRequestCommandHandler(
        domainContainer.quoteRepository,
        domainContainer.notificationService,
        domainContainer.fileStorageService,
        domainContainer.eventPublisher
      )
    );

    this.commandDispatcher.register(
      MoveQuoteToReviewCommand,
      new MoveQuoteToReviewCommandHandler(
        domainContainer.quoteRepository,
        domainContainer.eventPublisher
      )
    );

    this.commandDispatcher.register(
      SendQuoteCommand,
      new SendQuoteCommandHandler(
        domainContainer.quoteRepository,
        domainContainer.eventPublisher
      )
    );

    this.commandDispatcher.register(
      UpdateQuotePriorityCommand,
      new UpdateQuotePriorityCommandHandler(
        domainContainer.quoteRepository
      )
    );

    this.commandDispatcher.register(
      RejectQuoteCommand,
      new RejectQuoteCommandHandler(
        domainContainer.quoteRepository,
        domainContainer.eventPublisher
      )
    );

    // Job application command handlers
    this.commandDispatcher.register(
      SubmitJobApplicationCommand,
      new SubmitJobApplicationCommandHandler(
        domainContainer.jobApplicationRepository,
        domainContainer.notificationService,
        domainContainer.fileStorageService,
        domainContainer.eventPublisher
      )
    );
  }

  private registerQueryHandlers(): void {
    // Quote query handlers
    this.queryDispatcher.register(
      GetQuoteListQuery,
      new GetQuoteListQueryHandler(
        domainContainer.quoteRepository
      )
    );

    this.queryDispatcher.register(
      GetQuoteDetailsQuery,
      new GetQuoteDetailsQueryHandler(
        domainContainer.quoteRepository,
        domainContainer.fileStorageService
      )
    );
  }

  // Development/testing helpers
  public reset(): void {
    if (this.commandDispatcher instanceof InMemoryCommandDispatcher) {
      this.commandDispatcher.clear();
    }

    if (this.queryDispatcher instanceof InMemoryQueryDispatcher) {
      this.queryDispatcher.clear();
    }

    // Reset domain container as well
    domainContainer.reset();
  }

  public getPerformanceReport(): Record<string, { count: number; avgTime: number; maxTime: number }> {
    return this.performanceMonitor.getMetricsSummary();
  }

  public getRegisteredCommands(): string[] {
    return this.commandDispatcher instanceof InMemoryCommandDispatcher 
      ? this.commandDispatcher.getRegisteredCommands()
      : [];
  }

  public getRegisteredQueries(): string[] {
    return this.queryDispatcher instanceof InMemoryQueryDispatcher
      ? this.queryDispatcher.getRegisteredQueries()
      : [];
  }
}

// Global CQRS container instance
export const cqrsContainer = CQRSDIContainer.getInstance();