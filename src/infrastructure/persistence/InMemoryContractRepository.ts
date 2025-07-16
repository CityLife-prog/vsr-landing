/**
 * In-Memory Contract Repository - Infrastructure Layer
 * Development/testing implementation of ContractRepository
 */

import { Contract, ContractStatus } from '../../domain/contract/Contract';
import { ContractRepository, ContractQueryFilters, ContractQueryResult } from '../../domain/contract/ContractRepository';
import { UniqueEntityId } from '../../domain/shared/UniqueEntityId';

export class InMemoryContractRepository implements ContractRepository {
  private contracts = new Map<string, Contract>();

  constructor() {
    // Seed with sample contracts for development
    this.seedSampleContracts();
  }

  async save(contract: Contract): Promise<void> {
    this.contracts.set(contract.id.toString(), contract);
  }

  async findById(id: UniqueEntityId): Promise<Contract | null> {
    return this.contracts.get(id.toString()) || null;
  }

  async findByContractId(contractId: string): Promise<Contract | null> {
    const normalizedId = contractId.toUpperCase().trim();
    return Array.from(this.contracts.values()).find(
      contract => contract.contractId === normalizedId
    ) || null;
  }

  async findByCustomerEmail(email: string): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(
      contract => contract.email.value.toLowerCase() === email.toLowerCase()
    );
  }

  async findByCustomerPhone(phone: string): Promise<Contract[]> {
    const normalizedPhone = phone.replace(/\D/g, ''); // Remove non-digits
    return Array.from(this.contracts.values()).filter(
      contract => contract.phone.value.replace(/\D/g, '') === normalizedPhone
    );
  }

  async findByCustomerName(name: string): Promise<Contract[]> {
    const searchTerm = name.toLowerCase().trim();
    return Array.from(this.contracts.values()).filter(
      contract => contract.customerName.toLowerCase().includes(searchTerm)
    );
  }

  async findActiveContracts(): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(
      contract => contract.isActive()
    );
  }

  async findByStatus(status: ContractStatus): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(
      contract => contract.status === status
    );
  }

  async findByServiceType(serviceType: string): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(
      contract => contract.serviceType.key === serviceType
    );
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(
      contract => contract.startDate >= startDate && contract.startDate <= endDate
    );
  }

  async searchContracts(searchTerm: string): Promise<Contract[]> {
    const term = searchTerm.toLowerCase().trim();
    return Array.from(this.contracts.values()).filter(contract => 
      contract.contractId.toLowerCase().includes(term) ||
      contract.customerName.toLowerCase().includes(term) ||
      contract.email.value.toLowerCase().includes(term) ||
      contract.address.toLowerCase().includes(term) ||
      contract.description.toLowerCase().includes(term)
    );
  }

  async findRecentContracts(limit: number): Promise<Contract[]> {
    return Array.from(this.contracts.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async delete(id: UniqueEntityId): Promise<void> {
    this.contracts.delete(id.toString());
  }

  async countByStatus(status: ContractStatus): Promise<number> {
    return Array.from(this.contracts.values()).filter(
      contract => contract.status === status
    ).length;
  }

  async getTotalContractValue(): Promise<number> {
    return Array.from(this.contracts.values())
      .reduce((total, contract) => total + contract.contractValue, 0);
  }

  async getContractValueByServiceType(serviceType: string): Promise<number> {
    return Array.from(this.contracts.values())
      .filter(contract => contract.serviceType.key === serviceType)
      .reduce((total, contract) => total + contract.contractValue, 0);
  }

  async findWithFilters(filters: ContractQueryFilters): Promise<ContractQueryResult> {
    let contracts = Array.from(this.contracts.values());

    // Apply filters
    if (filters.status) {
      contracts = contracts.filter(contract => contract.status === filters.status);
    }

    if (filters.serviceType) {
      contracts = contracts.filter(contract => contract.serviceType.key === filters.serviceType);
    }

    if (filters.contractId) {
      const searchId = filters.contractId.toUpperCase().trim();
      contracts = contracts.filter(contract => 
        contract.contractId.includes(searchId)
      );
    }

    if (filters.customerName) {
      const searchName = filters.customerName.toLowerCase().trim();
      contracts = contracts.filter(contract => 
        contract.customerName.toLowerCase().includes(searchName)
      );
    }

    if (filters.email) {
      const searchEmail = filters.email.toLowerCase().trim();
      contracts = contracts.filter(contract => 
        contract.email.value.toLowerCase().includes(searchEmail)
      );
    }

    if (filters.phone) {
      const searchPhone = filters.phone.replace(/\D/g, '');
      contracts = contracts.filter(contract => 
        contract.phone.value.replace(/\D/g, '').includes(searchPhone)
      );
    }

    if (filters.startDateAfter) {
      contracts = contracts.filter(contract => contract.startDate >= filters.startDateAfter!);
    }

    if (filters.startDateBefore) {
      contracts = contracts.filter(contract => contract.startDate <= filters.startDateBefore!);
    }

    if (filters.minValue) {
      contracts = contracts.filter(contract => contract.contractValue >= filters.minValue!);
    }

    if (filters.maxValue) {
      contracts = contracts.filter(contract => contract.contractValue <= filters.maxValue!);
    }

    if (filters.projectManager) {
      contracts = contracts.filter(contract => 
        contract.metadata.projectManager?.toLowerCase().includes(filters.projectManager!.toLowerCase())
      );
    }

    if (filters.estimator) {
      contracts = contracts.filter(contract => 
        contract.metadata.estimator?.toLowerCase().includes(filters.estimator!.toLowerCase())
      );
    }

    if (filters.region) {
      contracts = contracts.filter(contract => 
        contract.metadata.region?.toLowerCase().includes(filters.region!.toLowerCase())
      );
    }

    // Apply sorting
    const orderBy = filters.orderBy || 'createdAt';
    const orderDirection = filters.orderDirection || 'desc';

    contracts.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (orderBy) {
        case 'contractId':
          aValue = a.contractId;
          bValue = b.contractId;
          break;
        case 'customerName':
          aValue = a.customerName.toLowerCase();
          bValue = b.customerName.toLowerCase();
          break;
        case 'startDate':
          aValue = a.startDate.getTime();
          bValue = b.startDate.getTime();
          break;
        case 'contractValue':
          aValue = a.contractValue;
          bValue = b.contractValue;
          break;
        case 'createdAt':
        default:
          aValue = a.createdAt.getTime();
          bValue = b.createdAt.getTime();
          break;
      }

      if (aValue < bValue) return orderDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return orderDirection === 'asc' ? 1 : -1;
      return 0;
    });

    const total = contracts.length;
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;

    contracts = contracts.slice(offset, offset + limit);

    return {
      contracts,
      total,
      hasMore: offset + contracts.length < total
    };
  }

  // Development helper methods
  async clear(): Promise<void> {
    this.contracts.clear();
  }

  async count(): Promise<number> {
    return this.contracts.size;
  }

  private seedSampleContracts(): void {
    // Sample contracts for development and testing
    const sampleContracts = [
      {
        contractId: 'VSR-2024-001',
        customerName: 'John Smith',
        email: 'john.smith@email.com',
        phone: '(303) 555-0101',
        serviceType: 'snow-ice-removal',
        address: '123 Main St, Denver, CO 80202',
        contractValue: 25000,
        description: 'Seasonal snow removal for office complex',
        startDate: new Date('2024-11-01'),
        endDate: new Date('2025-04-30'),
        metadata: {
          projectManager: 'Marcus Vargas',
          estimator: 'Zach Lewis',
          region: 'Denver Metro'
        }
      },
      {
        contractId: 'VSR-2024-002',
        customerName: 'ABC Corporation',
        email: 'facilities@abccorp.com',
        phone: '(303) 555-0202',
        serviceType: 'concrete-asphalt',
        address: '456 Business Park Dr, Aurora, CO 80014',
        contractValue: 75000,
        description: 'Parking lot repair and resurfacing',
        startDate: new Date('2024-09-15'),
        endDate: new Date('2024-11-30'),
        metadata: {
          projectManager: 'Marcus Vargas',
          estimator: 'Zach Lewis',
          region: 'Aurora'
        }
      },
      {
        contractId: 'VSR-2024-003',
        customerName: 'Mountain View HOA',
        email: 'board@mountainviewhoa.org',
        phone: '(303) 555-0303',
        serviceType: 'landscaping',
        address: '789 Mountain View Blvd, Lakewood, CO 80226',
        contractValue: 45000,
        description: 'Community landscaping and maintenance',
        startDate: new Date('2024-05-01'),
        metadata: {
          projectManager: 'Marcus Vargas',
          estimator: 'Zach Lewis',
          region: 'Lakewood'
        }
      }
    ];

    sampleContracts.forEach(data => {
      try {
        const contract = Contract.create(data);
        this.contracts.set(contract.id.toString(), contract);
      } catch (error) {
        console.error('Failed to create sample contract:', error);
      }
    });
  }
}