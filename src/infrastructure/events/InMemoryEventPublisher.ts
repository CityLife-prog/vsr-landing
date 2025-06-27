/**
 * In-Memory Domain Event Publisher - Infrastructure Layer
 * Clean Architecture: Infrastructure implements domain event publishing
 */

import { DomainEvent } from '../../domain/shared/Entity';
import { DomainEventPublisher, DomainEventHandler } from '../../domain/shared/DomainEventPublisher';

export class InMemoryEventPublisher implements DomainEventPublisher {
  private handlers = new Map<string, DomainEventHandler<DomainEvent>[]>();

  async publish(event: DomainEvent): Promise<void> {
    const eventType = event.constructor.name;
    const handlers = this.handlers.get(eventType) || [];

    for (const handler of handlers) {
      try {
        await handler.handle(event);
      } catch (error) {
        console.error(`Error handling domain event ${eventType}:`, error);
        // In production, you might want to implement retry logic or dead letter queues
      }
    }
  }

  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  subscribe<T extends DomainEvent>(
    eventType: new (...args: unknown[]) => T,
    handler: DomainEventHandler<T>
  ): void {
    const eventTypeName = eventType.name;
    
    if (!this.handlers.has(eventTypeName)) {
      this.handlers.set(eventTypeName, []);
    }
    
    this.handlers.get(eventTypeName)!.push(handler as DomainEventHandler<DomainEvent>);
  }

  unsubscribe<T extends DomainEvent>(
    eventType: new (...args: unknown[]) => T,
    handler: DomainEventHandler<T>
  ): void {
    const eventTypeName = eventType.name;
    const handlers = this.handlers.get(eventTypeName);
    
    if (handlers) {
      const index = handlers.indexOf(handler as DomainEventHandler<DomainEvent>);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Development helper methods
  getSubscriberCount(eventType: string): number {
    return this.handlers.get(eventType)?.length || 0;
  }

  clearAllSubscriptions(): void {
    this.handlers.clear();
  }

  getEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}