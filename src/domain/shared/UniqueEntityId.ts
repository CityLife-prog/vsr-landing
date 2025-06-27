/**
 * Unique Entity ID - Type-safe domain identifiers
 * Ensures proper entity identification across the domain
 */

import { ValueObject } from './ValueObject';

interface UniqueEntityIdProps {
  value: string;
}

export class UniqueEntityId extends ValueObject<UniqueEntityIdProps> {
  constructor(id?: string) {
    super({ value: id || UniqueEntityId.createNew() });
  }

  private static createNew(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${randomPart}`;
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }

  static isValid(id: string): boolean {
    return typeof id === 'string' && id.length > 0 && /^[a-zA-Z0-9-_]+$/.test(id);
  }

  static create(id?: string): UniqueEntityId {
    if (id && !this.isValid(id)) {
      throw new Error(`Invalid entity ID format: ${id}`);
    }
    return new UniqueEntityId(id);
  }
}