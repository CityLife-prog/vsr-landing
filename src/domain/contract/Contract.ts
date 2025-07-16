/**
 * Contract Aggregate Root - Business Logic for Contract Management
 * Supports autofill functionality for quote requests
 */

import { AggregateRoot } from '../shared/AggregateRoot';
import { UniqueEntityId } from '../shared/UniqueEntityId';
import { DomainEventBase } from '../shared/Entity';
import { DomainValidationError } from '../shared/DomainError';
import { Email } from '../shared/Email';
import { PhoneNumber } from '../shared/PhoneNumber';
import { ServiceType } from '../shared/ServiceType';

export enum ContractStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold'
}

interface ContractProps {
  contractId: string; // Business Contract ID (e.g., "VSR-2025-001")
  customerName: string;
  email: Email;
  phone: PhoneNumber;
  serviceType: ServiceType;
  address: string;
  status: ContractStatus;
  startDate: Date;
  endDate?: Date;
  contractValue: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  metadata: ContractMetadata;
}

interface ContractMetadata {
  projectManager?: string;
  estimator?: string;
  region?: string;
  notes?: string;
}

export class Contract extends AggregateRoot<UniqueEntityId> {
  private constructor(id: UniqueEntityId, private props: ContractProps) {
    super(id);
  }

  static create(props: {
    contractId: string;
    customerName: string;
    email: string;
    phone: string;
    serviceType: string;
    address: string;
    contractValue: number;
    description: string;
    startDate: Date;
    endDate?: Date;
    metadata?: Partial<ContractMetadata>;
  }): Contract {
    // Domain validation
    this.validateContractId(props.contractId);
    this.validateCustomerName(props.customerName);
    this.validateAddress(props.address);
    this.validateContractValue(props.contractValue);

    const email = Email.create(props.email);
    const phone = PhoneNumber.create(props.phone);
    const serviceType = ServiceType.create(props.serviceType);
    
    const id = UniqueEntityId.create();
    const now = new Date();

    const contract = new Contract(id, {
      contractId: props.contractId.toUpperCase(),
      customerName: props.customerName.trim(),
      email,
      phone,
      serviceType,
      address: props.address.trim(),
      status: ContractStatus.ACTIVE,
      startDate: props.startDate,
      endDate: props.endDate,
      contractValue: props.contractValue,
      description: props.description.trim(),
      createdAt: now,
      updatedAt: now,
      metadata: props.metadata || {}
    });

    contract.addDomainEvent(new ContractCreatedEvent(contract));
    return contract;
  }

  static reconstitute(id: UniqueEntityId, props: ContractProps): Contract {
    return new Contract(id, props);
  }

  private static validateContractId(contractId: string): void {
    if (!contractId || contractId.trim().length < 3) {
      throw new DomainValidationError('contractId', 'Must be at least 3 characters');
    }
    
    // Validate format: VSR-YYYY-NNN or similar
    const contractIdPattern = /^[A-Z]{2,4}-\d{4}-\d{3,4}$/;
    if (!contractIdPattern.test(contractId.toUpperCase())) {
      throw new DomainValidationError('contractId', 'Invalid contract ID format. Expected: XXX-YYYY-NNN');
    }
  }

  private static validateCustomerName(name: string): void {
    if (!name || name.trim().length < 2) {
      throw new DomainValidationError('customerName', 'Must be at least 2 characters');
    }
    if (name.trim().length > 100) {
      throw new DomainValidationError('customerName', 'Must not exceed 100 characters');
    }
  }

  private static validateAddress(address: string): void {
    if (!address || address.trim().length < 10) {
      throw new DomainValidationError('address', 'Must be at least 10 characters');
    }
    if (address.trim().length > 500) {
      throw new DomainValidationError('address', 'Must not exceed 500 characters');
    }
  }

  private static validateContractValue(value: number): void {
    if (value <= 0) {
      throw new DomainValidationError('contractValue', 'Must be greater than 0');
    }
    if (value > 10000000) { // $10M limit
      throw new DomainValidationError('contractValue', 'Contract value exceeds maximum limit');
    }
  }

  // Business Methods
  updateStatus(status: ContractStatus): void {
    this.props.status = status;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ContractStatusUpdatedEvent(this, status));
  }

  updateContractValue(value: number): void {
    Contract.validateContractValue(value);
    this.props.contractValue = value;
    this.props.updatedAt = new Date();
  }

  complete(endDate?: Date): void {
    this.props.status = ContractStatus.COMPLETED;
    this.props.endDate = endDate || new Date();
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ContractCompletedEvent(this));
  }

  cancel(): void {
    if (this.props.status === ContractStatus.COMPLETED) {
      throw new DomainValidationError('status', 'Cannot cancel completed contract');
    }
    
    this.props.status = ContractStatus.CANCELLED;
    this.props.updatedAt = new Date();
    this.addDomainEvent(new ContractCancelledEvent(this));
  }

  isActive(): boolean {
    return this.props.status === ContractStatus.ACTIVE;
  }

  isCompleted(): boolean {
    return this.props.status === ContractStatus.COMPLETED;
  }

  // Getters for autofill functionality
  get contractId(): string { return this.props.contractId; }
  get customerName(): string { return this.props.customerName; }
  get email(): Email { return this.props.email; }
  get phone(): PhoneNumber { return this.props.phone; }
  get serviceType(): ServiceType { return this.props.serviceType; }
  get address(): string { return this.props.address; }
  get status(): ContractStatus { return this.props.status; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date | undefined { return this.props.endDate; }
  get contractValue(): number { return this.props.contractValue; }
  get description(): string { return this.props.description; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get metadata(): ContractMetadata { return this.props.metadata; }

  // Export contract data for autofill
  getAutofillData() {
    return {
      contractId: this.contractId,
      customerName: this.customerName,
      email: this.email.value,
      phone: this.phone.value,
      serviceType: this.serviceType.key,
      address: this.address,
      projectManager: this.metadata.projectManager,
      estimator: this.metadata.estimator,
      region: this.metadata.region
    };
  }
}

// Domain Events
export class ContractCreatedEvent extends DomainEventBase {
  constructor(public readonly contract: Contract) {
    super();
  }
}

export class ContractStatusUpdatedEvent extends DomainEventBase {
  constructor(
    public readonly contract: Contract,
    public readonly newStatus: ContractStatus
  ) {
    super();
  }
}

export class ContractCompletedEvent extends DomainEventBase {
  constructor(public readonly contract: Contract) {
    super();
  }
}

export class ContractCancelledEvent extends DomainEventBase {
  constructor(public readonly contract: Contract) {
    super();
  }
}