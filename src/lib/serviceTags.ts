// lib/serviceTags.ts

export interface ServiceTag {
    name: string;
    description?: string;
    link?: string;
    tooltipPosition?: 'top' | 'bottom';
  }
  
  export const serviceTags: ServiceTag[] = [
    {
      name: 'Snow & Ice Removal',
      description: 'Reliable winter maintenance for commercial properties.',
      link: '/services/snow-ice-removal',
      tooltipPosition: 'top',
    },
    {
      name: 'Landscaping, Arboring & Hardscaping',
      description: 'Full-service yard transformation and maintenance.',
      link: '/services/landscaping',
      tooltipPosition: 'top',
    },
    {
      name: 'Concrete & Asphalt Repairs',
      description: 'Patching, sealing, and surface restoration.',
      link: '/services/concrete-asphalt',
      tooltipPosition: 'top',
    },
    {
      name: 'Demolition',
      description: 'Safe and clean demolition for residential and commercial sites.',
      link: '/services/demolition',
      tooltipPosition: 'bottom',
    },
    {
      name: 'Painting',
      description: 'Interior and exterior painting for long-lasting appeal.',
      link: '/services/painting',
      tooltipPosition: 'bottom',
    },
  ];
  