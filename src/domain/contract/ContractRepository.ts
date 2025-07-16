/**
 * Contract Repository Interface - Domain Layer
 * Defines contract data access operations
 */

import { Contract, ContractStatus } from './Contract';
import { UniqueEntityId } from '../shared/UniqueEntityId';

export interface ContractRepository {
  // Basic CRUD operations
  save(contract: Contract): Promise<void>;
  findById(id: UniqueEntityId): Promise<Contract | null>;
  findByContractId(contractId: string): Promise<Contract | null>;
  delete(id: UniqueEntityId): Promise<void>;

  // Query operations for autofill
  findByCustomerEmail(email: string): Promise<Contract[]>;
  findByCustomerPhone(phone: string): Promise<Contract[]>;
  findByCustomerName(name: string): Promise<Contract[]>;
  findActiveContracts(): Promise<Contract[]>;
  findByStatus(status: ContractStatus): Promise<Contract[]>;
  
  // Service-specific queries
  findByServiceType(serviceType: string): Promise<Contract[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<Contract[]>;
  
  // Search and filtering
  searchContracts(searchTerm: string): Promise<Contract[]>;
  findRecentContracts(limit: number): Promise<Contract[]>;
  
  // Analytics
  countByStatus(status: ContractStatus): Promise<number>;
  getTotalContractValue(): Promise<number>;
  getContractValueByServiceType(serviceType: string): Promise<number>;
}

// Query filters for advanced contract searches
export interface ContractQueryFilters {
  status?: ContractStatus;
  serviceType?: string;
  customerName?: string;
  email?: string;
  phone?: string;
  contractId?: string;
  startDateAfter?: Date;
  startDateBefore?: Date;
  endDateAfter?: Date;
  endDateBefore?: Date;
  minValue?: number;
  maxValue?: number;
  projectManager?: string;
  estimator?: string;
  region?: string;
  
  // Pagination and sorting
  limit?: number;
  offset?: number;
  orderBy?: 'contractId' | 'customerName' | 'startDate' | 'contractValue' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
}

export interface ContractQueryResult {
  contracts: Contract[];
  total: number;
  hasMore: boolean;
}