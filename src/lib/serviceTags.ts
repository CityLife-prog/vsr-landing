// lib/serviceTags.ts

export interface ServiceTag {
    name: string;
    description?: string;
    link?: string;
    tooltipPosition?: 'top' | 'bottom';
    disabled?: boolean;
  }

  const siteVersion = process.env.NEXT_PUBLIC_VERSION;
  const isNewVersion = siteVersion === '2';
  
  export const serviceTags: ServiceTag[] = [
    {
      name: 'Snow & Ice Removal',
      description: 'Reliable winter maintenance for commercial properties.',
      link: '/services/snow-ice-removal',
      tooltipPosition: 'top',
      disabled: !isNewVersion,
    },
    {
      name: 'Landscaping, Arboring & Hardscaping',
      description: 'Full-service yard transformation and maintenance.',
      link: '/services/landscaping',
      tooltipPosition: 'top',
      disabled: !isNewVersion,
    },
    {
      name: 'Concrete & Asphalt Repairs',
      description: 'Patching, sealing, and surface restoration.',
      link: '/services/concrete-asphalt',
      tooltipPosition: 'top',
      disabled: !isNewVersion,
    },
    {
      name: 'Demolition',
      description: 'Safe and clean demolition for residential and commercial sites.',
      link: '/services/demolition',
      tooltipPosition: 'bottom',
      disabled: !isNewVersion,
    },
    {
      name: 'Painting',
      description: 'Interior and exterior painting for long-lasting appeal.',
      link: '/services/painting',
      tooltipPosition: 'bottom',
      disabled: !isNewVersion,
    },
  ];
  