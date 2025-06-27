import { NextSeo } from 'next-seo';
import { useRouter } from 'next/router';
import { Component, ErrorInfo, ReactNode } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface ServicePageTemplateProps {
  title: string;
  description: string;
  galleryUrl: string;
  seoTitle?: string;
  seoDescription?: string;
  category?: 'construction' | 'maintenance' | 'seasonal';
  estimatedResponseTime?: string;
  breadcrumbs?: Array<{ name: string; href: string }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ServiceErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Service page error:', error, errorInfo);
    // In production, send to monitoring service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false,
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="px-6 py-10 text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Service Unavailable</h1>
          <p className="text-gray-600 mb-4">We&apos;re experiencing technical difficulties with this service page.</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Production-ready service page template with SEO, structured data, and error handling
 * Features:
 * - Comprehensive SEO optimization
 * - JSON-LD structured data markup
 * - Error boundaries for fault tolerance
 * - Performance optimized iframe loading
 * - Analytics tracking
 * - Accessibility improvements
 */
export default function ServicePageTemplate({ 
  title, 
  description, 
  galleryUrl,
  seoTitle,
  seoDescription,
  category = 'construction',
  estimatedResponseTime = '3-5 business days',
  breadcrumbs = []
}: ServicePageTemplateProps) {
  const router = useRouter();
  const currentUrl = `https://vsrconstruction.com${router.asPath}`;
  
  // Generate structured data for search engines
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: title,
    description: description,
    provider: {
      '@type': 'Organization',
      name: 'VSR Construction',
      url: 'https://vsrconstruction.com',
      telephone: '+1-555-0123',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'US'
      }
    },
    serviceType: category,
    url: currentUrl,
    potentialAction: {
      '@type': 'ContactAction',
      target: 'https://vsrconstruction.com/quote'
    }
  };

  const breadcrumbStructuredData = breadcrumbs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `https://vsrconstruction.com${crumb.href}`
    }))
  } : null;
  return (
    <ServiceErrorBoundary>
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {breadcrumbStructuredData && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
          />
        )}
        <link rel="canonical" href={currentUrl} />
        <meta name="robots" content="index, follow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <NextSeo
        title={seoTitle || `${title} - VSR Construction`}
        description={seoDescription || description}
        canonical={currentUrl}
        openGraph={{
          title: seoTitle || `${title} - VSR Construction`,
          description: seoDescription || description,
          type: 'website',
          url: currentUrl,
          siteName: 'VSR Construction',
          images: [{
            url: 'https://vsrconstruction.com/og-image.jpg',
            width: 1200,
            height: 630,
            alt: `${title} - VSR Construction`,
          }],
        }}
        twitter={{
          cardType: 'summary_large_image',
          site: '@vsrconstruction',
        }}
        additionalMetaTags={[
          {
            name: 'keywords',
            content: `${title.toLowerCase()}, construction, ${category}, VSR Construction`
          },
          {
            name: 'author',
            content: 'VSR Construction'
          },
          {
            property: 'article:section',
            content: 'Services'
          }
        ]}
      />
      
      <div className="px-6 py-10 max-w-4xl mx-auto">
        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex space-x-2 text-sm text-gray-600">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="flex items-center">
                  {index > 0 && <span className="mx-2">/</span>}
                  <a 
                    href={crumb.href} 
                    className="hover:text-blue-600 transition-colors"
                    onClick={() => {
                      // Analytics tracking
                      if (typeof window !== 'undefined' && window.gtag) {
                        window.gtag('event', 'breadcrumb_click', {
                          breadcrumb: crumb.name,
                          page: router.asPath
                        });
                      }
                    }}
                  >
                    {crumb.name}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">{title}</h1>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-lg leading-relaxed text-gray-800">
                  {description}
                </p>
                <p className="text-sm text-blue-600 mt-2 font-medium">
                  Response Time: {estimatedResponseTime}
                </p>
              </div>
            </div>
          </div>
        </header>
        
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Photo Gallery</h2>
            <Link 
              href="/quote" 
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              onClick={() => {
                // Analytics tracking
                if (typeof window !== 'undefined' && window.gtag) {
                  window.gtag('event', 'cta_click', {
                    cta_location: 'service_gallery',
                    service: title,
                    page: router.asPath
                  });
                }
              }}
            >
              Get Quote
            </Link>
          </div>
          
          <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg border border-gray-200">
            <iframe
              src={galleryUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              title={`${title} Photo Gallery - Examples of our work`}
              loading="lazy"
              className="w-full h-full"
              onLoad={() => {
                // Analytics tracking for gallery load
                if (typeof window !== 'undefined' && window.gtag) {
                  window.gtag('event', 'gallery_loaded', {
                    service: title,
                    page: router.asPath
                  });
                }
              }}
              onError={() => {
                console.error('Gallery failed to load for service:', title);
                // Track gallery errors
                if (typeof window !== 'undefined' && window.gtag) {
                  window.gtag('event', 'gallery_error', {
                    service: title,
                    page: router.asPath
                  });
                }
              }}
            />
          </div>
          
          <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded">
            <p>✨ Browse our portfolio to see examples of our {title.toLowerCase()} work</p>
            <p>📞 Questions about what you see? <Link href="/quote" className="text-blue-600 hover:underline">Contact us for details</Link></p>
          </div>
        </section>
        
        <section className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-xl font-semibold mb-3 text-gray-900">Ready to Get Started?</h3>
          <p className="text-gray-700 mb-4">
            Get a free estimate for your {title.toLowerCase()} project. We typically respond within {estimatedResponseTime}.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link 
              href="/quote" 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-center"
              onClick={() => {
                if (typeof window !== 'undefined' && window.gtag) {
                  window.gtag('event', 'cta_click', {
                    cta_location: 'service_bottom',
                    service: title,
                    page: router.asPath
                  });
                }
              }}
            >
              Get Free Quote
            </Link>
            <Link 
              href="/apply" 
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium text-center"
              onClick={() => {
                if (typeof window !== 'undefined' && window.gtag) {
                  window.gtag('event', 'cta_click', {
                    cta_location: 'service_apply',
                    service: title,
                    page: router.asPath
                  });
                }
              }}
            >
              Apply for Work
            </Link>
          </div>
        </section>
      </div>
    </ServiceErrorBoundary>
  );
}