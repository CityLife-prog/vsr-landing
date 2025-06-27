/**
 * Base Entity - Domain-Driven Design Pattern
 * Core building block for all domain entities
 */

export abstract class Entity<TId> {
  protected readonly _id: TId;
  private _domainEvents: DomainEvent[] = [];

  constructor(id: TId) {
    this._id = id;
  }

  get id(): TId {
    return this._id;
  }

  equals(other: Entity<TId>): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (this === other) {
      return true;
    }
    return this._id === other._id;
  }

  addDomainEvent(domainEvent: DomainEvent): void {
    this._domainEvents.push(domainEvent);
  }

  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  getDomainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents;
  }
}

export interface DomainEvent {
  readonly occurredOn: Date;
  readonly eventVersion: number;
  readonly eventId: string;
}

export abstract class DomainEventBase implements DomainEvent {
  readonly occurredOn: Date;
  readonly eventVersion: number = 1;
  readonly eventId: string;

  constructor() {
    this.occurredOn = new Date();
    this.eventId = this.generateId();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}