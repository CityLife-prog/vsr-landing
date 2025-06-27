/**
 * Quote Event Handler - Infrastructure Layer
 * Clean Architecture: Handles domain events for quotes
 */

import { 
  QuoteSubmittedEvent,
  QuoteMovedToReviewEvent,
  QuoteSentEvent,
  QuoteAcceptedEvent,
  QuoteRejectedEvent
} from '../../domain/quote/Quote';
import { NotificationService } from '../../domain/services/NotificationService';
import { DomainEventPublisher, BaseDomainEventHandler } from '../../domain/shared/DomainEventPublisher';

export class QuoteSubmittedEventHandler extends BaseDomainEventHandler<QuoteSubmittedEvent> {
  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async handle(event: QuoteSubmittedEvent): Promise<void> {
    this.logEvent(event);

    // Business logic: Log quote submission for analytics
    console.log('📊 Quote Analytics:', {
      quoteId: event.quote.id.toString(),
      serviceType: event.quote.serviceType.key,
      customerEmail: event.quote.email.value,
      submittedAt: event.quote.submittedAt,
      hasPhotos: event.quote.photoAttachments.length > 0,
      source: event.quote.metadata.source
    });

    // Additional integrations could be added here:
    // - CRM systems
    // - Analytics platforms
    // - Marketing automation
  }
}

export class QuoteSentEventHandler extends BaseDomainEventHandler<QuoteSentEvent> {
  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async handle(event: QuoteSentEvent): Promise<void> {
    this.logEvent(event);

    // Business logic: Track quote conversion metrics
    console.log('💰 Quote Sent:', {
      quoteId: event.quote.id.toString(),
      estimatedValue: event.estimatedValue,
      customerEmail: event.quote.email.value,
      serviceType: event.quote.serviceType.key
    });

    // Could integrate with:
    // - Financial systems
    // - Revenue tracking
    // - Sales pipeline management
  }
}

export class QuoteAcceptedEventHandler extends BaseDomainEventHandler<QuoteAcceptedEvent> {
  constructor(private readonly notificationService: NotificationService) {
    super();
  }

  async handle(event: QuoteAcceptedEvent): Promise<void> {
    this.logEvent(event);

    // Business logic: Quote conversion success
    console.log('✅ Quote Accepted:', {
      quoteId: event.quote.id.toString(),
      customerEmail: event.quote.email.value,
      estimatedValue: event.quote.estimatedValue,
      serviceType: event.quote.serviceType.key
    });

    // Could trigger:
    // - Project creation
    // - Contract generation
    // - Resource scheduling
    // - Customer onboarding
  }
}

export class QuoteEventHandler {
  constructor(private readonly notificationService: NotificationService) {}

  subscribeToEvents(eventPublisher: DomainEventPublisher): void {
    // Subscribe to all quote-related events
    eventPublisher.subscribe(
      QuoteSubmittedEvent,
      new QuoteSubmittedEventHandler(this.notificationService)
    );

    eventPublisher.subscribe(
      QuoteMovedToReviewEvent,
      new (class extends BaseDomainEventHandler<QuoteMovedToReviewEvent> {
        async handle(event: QuoteMovedToReviewEvent): Promise<void> {
          this.logEvent(event);
          console.log('🔍 Quote moved to review:', {
            quoteId: event.quote.id.toString(),
            customerName: event.quote.customerName
          });
        }
      })
    );

    eventPublisher.subscribe(
      QuoteSentEvent,
      new QuoteSentEventHandler(this.notificationService)
    );

    eventPublisher.subscribe(
      QuoteAcceptedEvent,
      new QuoteAcceptedEventHandler(this.notificationService)
    );

    eventPublisher.subscribe(
      QuoteRejectedEvent,
      new (class extends BaseDomainEventHandler<QuoteRejectedEvent> {
        async handle(event: QuoteRejectedEvent): Promise<void> {
          this.logEvent(event);
          console.log('❌ Quote rejected:', {
            quoteId: event.quote.id.toString(),
            customerEmail: event.quote.email.value
          });
        }
      })
    );
  }
}