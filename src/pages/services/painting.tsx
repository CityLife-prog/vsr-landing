import ServicePageTemplate from '../../components/ServicePageTemplate';
import { getServiceConfig } from '../../lib/services-config';

export default function PaintingPage() {
  const serviceConfig = getServiceConfig('painting');
  
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
  