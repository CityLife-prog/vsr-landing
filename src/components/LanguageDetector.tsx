import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const LanguageDetector: React.FC = () => {
  const router = useRouter();
  const [hasDetected, setHasDetected] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && router.isReady && !hasDetected) {
      const browserLanguages = navigator.languages || [navigator.language];
      const hasSpanish = browserLanguages.some(lang => lang.startsWith('es'));
      
      console.log('Browser languages:', browserLanguages);
      console.log('Has Spanish:', hasSpanish);
      console.log('Current locale:', router.locale);
      
      // If user has Spanish in their languages and we're on English, switch to Spanish
      if (hasSpanish && router.locale === 'en') {
        console.log('Switching to Spanish...');
        setHasDetected(true);
        router.push(router.asPath, router.asPath, { locale: 'es' });
      }
    }
  }, [router.isReady, router.locale, hasDetected]);

  return null;
};

export default LanguageDetector;