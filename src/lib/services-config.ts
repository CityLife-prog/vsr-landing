/**
 * Centralized service configuration
 * Single source of truth for all service data
 */

export interface ServiceConfig {
  title: string;
  description: string;
  galleryUrl: string;
  seoTitle?: string;
  seoDescription?: string;
  estimatedResponseTime?: string;
  category: 'construction' | 'maintenance' | 'seasonal';
  breadcrumbs?: Array<{ name: string; href: string }>;
  keywords?: string[];
  features?: string[];
  priceRange?: string;
}

export const SERVICES_CONFIG: Record<string, ServiceConfig> = {
  'concrete-asphalt': {
    title: 'Concrete & Asphalt Repairs',
    description: 'Professional patching, sealing, and surface restoration for driveways, sidewalks, and parking lots. We restore damaged concrete and asphalt surfaces to extend their lifespan and improve safety.',
    galleryUrl: 'https://drive.google.com/embeddedfolderview?id=1YfEAP89In40y267yTwyNrMR6VXnhJAIY#grid',
    seoTitle: 'Professional Concrete & Asphalt Repair Services - VSR Construction',
    seoDescription: 'Expert concrete and asphalt repair services including patching, sealing, and surface restoration for driveways, sidewalks, and parking lots. Free estimates.',
    estimatedResponseTime: '3-5 business days',
    category: 'construction',
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: 'Services', href: '/services' },
      { name: 'Concrete & Asphalt', href: '/services/concrete-asphalt' }
    ],
    keywords: ['concrete repair', 'asphalt repair', 'driveway repair', 'sidewalk repair', 'parking lot repair'],
    features: ['Crack sealing', 'Surface patching', 'Resurfacing', 'Preventive maintenance'],
    priceRange: '$$'
  },
  'landscaping': {
    title: 'Landscaping',
    description: 'Transform your outdoor spaces with expert landscape design, installation, and maintenance. From garden beds to complete yard makeovers, we create beautiful and functional outdoor environments.',
    galleryUrl: 'https://drive.google.com/embeddedfolderview?id=1_jkL1KhqKyhwZD0N4mL0i4JyZ6zgfiLa#grid',
    seoTitle: 'Professional Landscaping Services - VSR Construction',
    seoDescription: 'Transform your outdoor spaces with expert landscaping design and maintenance services. Garden design, lawn care, and complete landscape installation.',
    estimatedResponseTime: '5-7 business days',
    category: 'maintenance',
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: 'Services', href: '/services' },
      { name: 'Landscaping', href: '/services/landscaping' }
    ],
    keywords: ['landscaping', 'garden design', 'lawn care', 'landscape maintenance', 'outdoor design'],
    features: ['Garden design', 'Lawn installation', 'Plant selection', 'Seasonal cleanup'],
    priceRange: '$$$'
  },
  'painting': {
    title: 'Painting',
    description: 'Professional interior and exterior painting services for residential and commercial properties. Using premium paints and proven techniques for lasting, beautiful results.',
    galleryUrl: 'https://drive.google.com/embeddedfolderview?id=1YPGSX4PBTpLyCLA8PIyITKmqUiEJobJk#grid',
    seoTitle: 'Professional Interior & Exterior Painting - VSR Construction',
    seoDescription: 'Quality interior and exterior painting services for residential and commercial properties. Professional painters using premium materials.',
    estimatedResponseTime: '3-5 business days',
    category: 'construction',
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: 'Services', href: '/services' },
      { name: 'Painting', href: '/services/painting' }
    ],
    keywords: ['interior painting', 'exterior painting', 'commercial painting', 'residential painting', 'house painting'],
    features: ['Surface preparation', 'Premium paint selection', 'Color consultation', 'Clean finish work'],
    priceRange: '$$'
  },
  'demolition': {
    title: 'Demolition',
    description: 'Safe, efficient demolition services for residential and commercial projects. From partial tear-downs to complete structure removal, we handle all demolition needs with proper permits and cleanup.',
    galleryUrl: 'https://drive.google.com/embeddedfolderview?id=1edZkkPbHU8HyIjh5-50yHM60TYy3wzl5#grid',
    seoTitle: 'Safe Demolition Services - VSR Construction',
    seoDescription: 'Professional demolition services for residential and commercial projects. Safe, efficient tear-down with proper permits and complete cleanup.',
    estimatedResponseTime: '5-10 business days',
    category: 'construction',
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: 'Services', href: '/services' },
      { name: 'Demolition', href: '/services/demolition' }
    ],
    keywords: ['demolition', 'tear down', 'structure removal', 'building demolition', 'debris removal'],
    features: ['Permit assistance', 'Safe tear-down', 'Debris removal', 'Site cleanup'],
    priceRange: '$$$'
  },
  'snow-ice-removal': {
    title: 'Snow & Ice Removal',
    description: 'Reliable 24/7 snow and ice removal services for commercial properties. Keep your business accessible and safe during winter weather with our prompt, professional service.',
    galleryUrl: 'https://drive.google.com/embeddedfolderview?id=1IqMq5IdY5_NAlPk8ZvVw2_pyPSIRP7oh#grid',
    seoTitle: 'Commercial Snow & Ice Removal - VSR Construction',
    seoDescription: 'Reliable 24/7 commercial snow and ice removal services. Keep your business accessible during winter weather with prompt professional service.',
    estimatedResponseTime: '24-48 hours',
    category: 'seasonal',
    breadcrumbs: [
      { name: 'Home', href: '/' },
      { name: 'Services', href: '/services' },
      { name: 'Snow & Ice Removal', href: '/services/snow-ice-removal' }
    ],
    keywords: ['snow removal', 'ice removal', 'winter maintenance', 'commercial snow service', 'parking lot clearing'],
    features: ['24/7 availability', 'Salt/de-icing', 'Parking lot clearing', 'Walkway maintenance'],
    priceRange: '$$'
  },
} as const;

/**
 * Utility functions for service configuration
 */
export const getServiceConfig = (serviceKey: string): ServiceConfig | null => {
  return SERVICES_CONFIG[serviceKey] || null;
};

export const getAllServices = (): Array<ServiceConfig & { key: string }> => {
  return Object.entries(SERVICES_CONFIG).map(([key, config]) => ({
    key,
    ...config,
  }));
};

export const getServicesByCategory = (category: ServiceConfig['category']): Array<ServiceConfig & { key: string }> => {
  return getAllServices().filter(service => service.category === category);
};