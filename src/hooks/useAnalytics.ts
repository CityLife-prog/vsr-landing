/**
 * Analytics Hook for React Components
 * Provides easy access to analytics tracking functions
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import analytics from '../utils/analytics';

export const useAnalytics = () => {
  const router = useRouter();

  // Track page views on route changes
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      analytics.trackPageView(url);
    };

    // Track initial page load
    analytics.trackPageView(router.asPath);

    // Listen for route changes
    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  return {
    trackPageView: analytics.trackPageView.bind(analytics),
    trackVisitor: analytics.trackVisitor.bind(analytics),
    trackQuoteRequest: analytics.trackQuoteRequest.bind(analytics),
    trackButtonClick: analytics.trackButtonClick.bind(analytics),
    trackFormSubmit: analytics.trackFormSubmit.bind(analytics),
  };
};