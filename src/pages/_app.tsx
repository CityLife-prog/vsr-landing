import { MobileProvider } from '@/context/MobileContext';
import { AuthProvider } from '@/context/AuthContext';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import type { AppProps } from 'next/app';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ClientUpdateButton from '@/components/ClientUpdateButton';
import LanguageDetector from '@/components/LanguageDetector';
import CookieConsent from '@/components/CookieConsent';
import MaintenanceMode from '@/components/MaintenanceMode';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [maintenanceMode, setMaintenanceMode] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkMaintenanceStatus();
  }, []);

  const checkMaintenanceStatus = async () => {
    try {
      const response = await fetch('/api/maintenance-status');
      if (response.ok) {
        const data = await response.json();
        // Always check maintenance status, but admin routes bypass the block
        setMaintenanceMode(!!data.maintenance);
      } else {
        setMaintenanceMode(false);
      }
    } catch (error) {
      console.error('Failed to check maintenance status:', error);
      setMaintenanceMode(false);
    }
    setLoading(false);
  };

  // Show loading while checking maintenance status
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Checking system status...</div>
      </div>
    );
  }

  // Show maintenance mode if enabled (except for admin routes)
  if (maintenanceMode && !router.pathname.startsWith('/portal/admin')) {
    return <MaintenanceMode />;
  }

  return (
    <AuthProvider>
      <MobileProvider>
        <AnalyticsProvider>
          <Head>
            {/* Enable browser auto-translation */}
            <meta name="google" content="translate" />
            <meta name="language" content="en" />
            <meta name="content-language" content="en" />
          </Head>
          <LanguageDetector />
          <div className="bg-gray-900 text-white min-h-screen">
            <Header />
            <main className="px-4 py-8">
              <Component {...pageProps} />
            </main>
            <Footer />
            <ClientUpdateButton />
            <CookieConsent />
          </div>
        </AnalyticsProvider>
      </MobileProvider>
    </AuthProvider>
  );
}
