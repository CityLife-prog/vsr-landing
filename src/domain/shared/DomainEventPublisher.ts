/**
 * Domain Event Publisher Interface - Domain Layer
 * Clean Architecture: Enables domain events without coupling to infrastructure
 */

import { DomainEvent } from './Entity';

export interface DomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}

export interface DomainEventPublisher {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: new (...args: unknown[]) => T,
    handler: DomainEventHandler<T>
  ): void;
  unsubscribe<T extends DomainEvent>(
    eventType: new (...args: unknown[]) => T,
    handler: DomainEventHandler<T>
  ): void;
}

export abstract class BaseDomainEventHandler<T extends DomainEvent> implements DomainEventHandler<T> {
  abstract handle(event: T): Promise<void>;
  
  protected logEvent(event: T): void {
    console.log(`Handling domain event: ${event.constructor.name}`, {
      eventId: event.eventId,
      occurredOn: event.occurredOn,
      eventVersion: event.eventVersion
    });
  }
}