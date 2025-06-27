/**
 * Aggregate Root - Domain-Driven Design Pattern
 * Entry point for accessing aggregate entities and enforcing business invariants
 */

import { Entity, DomainEvent } from './Entity';

export abstract class AggregateRoot<TId> extends Entity<TId> {
  private _version: number = 0;

  get version(): number {
    return this._version;
  }

  markEventsAsCommitted(): void {
    this.clearDomainEvents();
    this._version += 1;
  }

  addDomainEvent(domainEvent: DomainEvent): void {
    super.addDomainEvent(domainEvent);
  }

  getUncommittedEvents(): ReadonlyArray<DomainEvent> {
    return this.getDomainEvents();
  }
}