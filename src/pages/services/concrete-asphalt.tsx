import ServicePageTemplate from '../../components/ServicePageTemplate';
import { getServiceConfig } from '../../lib/services-config';

export default function ConcreteAsphaltPage() {
  const serviceConfig = getServiceConfig('concrete-asphalt');
  
  if (!serviceConfig) {
    return <div>Service not found</div>;
  }

  return (
    <ServicePageTemplate
      title={serviceConfig.title}
      description={serviceConfig.description}
      galleryUrl={serviceConfig.galleryUrl}
      seoTitle={serviceConfig.seoTitle}
      seoDescription={serviceConfig.seoDescription}
      category={serviceConfig.category}
      estimatedResponseTime={serviceConfig.estimatedResponseTime}
      breadcrumbs={serviceConfig.breadcrumbs}
    />
  );
}