/**
 * Analytics Provider Component
 * Automatically tracks page views and provides analytics context
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useRouter } from 'next/router';
import analytics from '../utils/analytics';

interface AnalyticsContextType {
  trackPageView: (path?: string) => void;
  trackVisitor: () => void;
  trackQuoteRequest: () => void;
  trackButtonClick: (buttonText: string) => void;
  trackFormSubmit: (formName: string) => void;
  trackQRCodeScan: (qrCodeType: string, employeeName?: string) => void;
  trackLoginAttempt: (loginType: string, success: boolean) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export const useAnalyticsContext = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsContext must be used within AnalyticsProvider');
  }
  return context;
};

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children }) => {
  const router = useRouter();

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      analytics.trackPageView(url);
    };

    // Track initial page load and visitor
    analytics.trackPageView(router.asPath);
    analytics.trackVisitor(); // Ensure visitor is tracked

    // Listen for route changes
    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  const contextValue: AnalyticsContextType = {
    trackPageView: analytics.trackPageView.bind(analytics),
    trackVisitor: analytics.trackVisitor.bind(analytics),
    trackQuoteRequest: analytics.trackQuoteRequest.bind(analytics),
    trackButtonClick: analytics.trackButtonClick.bind(analytics),
    trackFormSubmit: analytics.trackFormSubmit.bind(analytics),
    trackQRCodeScan: analytics.trackQRCodeScan.bind(analytics),
    trackLoginAttempt: analytics.trackLoginAttempt.bind(analytics),
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};