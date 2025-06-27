/**
 * Service Type Value Object - Valid construction services
 * Domain-driven design: encapsulates business service categories
 */

import { ValueObject } from './ValueObject';
import { DomainValidationError } from './DomainError';

export enum ServiceCategory {
  CONSTRUCTION = 'construction',
  MAINTENANCE = 'maintenance',
  SEASONAL = 'seasonal'
}

interface ServiceTypeProps {
  key: string;
  name: string;
  category: ServiceCategory;
  description: string;
}

export class ServiceType extends ValueObject<ServiceTypeProps> {
  private static readonly VALID_SERVICES: Record<string, Omit<ServiceTypeProps, 'key'>> = {
    'concrete-asphalt': {
      name: 'Concrete & Asphalt Repairs',
      category: ServiceCategory.CONSTRUCTION,
      description: 'Professional concrete and asphalt repair services'
    },
    'landscaping': {
      name: 'Landscaping',
      category: ServiceCategory.MAINTENANCE,
      description: 'Landscape design and maintenance services'
    },
    'painting': {
      name: 'Painting',
      category: ServiceCategory.CONSTRUCTION,
      description: 'Interior and exterior painting services'
    },
    'demolition': {
      name: 'Demolition',
      category: ServiceCategory.CONSTRUCTION,
      description: 'Safe demolition and removal services'
    },
    'snow-ice-removal': {
      name: 'Snow & Ice Removal',
      category: ServiceCategory.SEASONAL,
      description: 'Commercial snow and ice removal services'
    }
  };

  private constructor(props: ServiceTypeProps) {
    super(props);
  }

  static create(serviceKey: string): ServiceType {
    const serviceConfig = this.VALID_SERVICES[serviceKey];
    
    if (!serviceConfig) {
      throw new DomainValidationError(
        'serviceType',
        `Invalid service type: ${serviceKey}. Valid types: ${Object.keys(this.VALID_SERVICES).join(', ')}`
      );
    }

    return new ServiceType({
      key: serviceKey,
      ...serviceConfig
    });
  }

  static getAllValidServices(): string[] {
    return Object.keys(this.VALID_SERVICES);
  }

  static getServicesByCategory(category: ServiceCategory): ServiceType[] {
    return Object.entries(this.VALID_SERVICES)
      .filter(([, config]) => config.category === category)
      .map(([key]) => this.create(key));
  }

  get key(): string {
    return this.props.key;
  }

  get name(): string {
    return this.props.name;
  }

  get category(): ServiceCategory {
    return this.props.category;
  }

  get description(): string {
    return this.props.description;
  }

  toString(): string {
    return this.props.name;
  }

  isConstructionService(): boolean {
    return this.props.category === ServiceCategory.CONSTRUCTION;
  }

  isMaintenanceService(): boolean {
    return this.props.category === ServiceCategory.MAINTENANCE;
  }

  isSeasonalService(): boolean {
    return this.props.category === ServiceCategory.SEASONAL;
  }
}