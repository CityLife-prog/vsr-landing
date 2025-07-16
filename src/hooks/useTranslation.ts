import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

// Translation type for type safety
type TranslationKey = string;
type TranslationObject = { [key: string]: any };

// Cache for loaded translations
const translationCache: { [locale: string]: TranslationObject } = {};

export const useTranslation = () => {
  const router = useRouter();
  const { locale, defaultLocale } = router;
  const [translations, setTranslations] = useState<TranslationObject>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTranslations(locale || defaultLocale || 'en');
  }, [locale, defaultLocale]);

  const loadTranslations = async (currentLocale: string) => {
    try {
      setIsLoading(true);
      
      // Check cache first
      if (translationCache[currentLocale]) {
        setTranslations(translationCache[currentLocale]);
        setIsLoading(false);
        return;
      }

      // Load translation file
      const response = await fetch(`/locales/${currentLocale}.json`);
      if (response.ok) {
        const translationData = await response.json();
        translationCache[currentLocale] = translationData;
        setTranslations(translationData);
      } else {
        // Fallback to English if locale file not found
        if (currentLocale !== 'en') {
          const fallbackResponse = await fetch('/locales/en.json');
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            translationCache['en'] = fallbackData;
            setTranslations(fallbackData);
          }
        }
      }
    } catch (error) {
      console.error('Error loading translations:', error);
      // Set empty object as fallback
      setTranslations({});
    } finally {
      setIsLoading(false);
    }
  };

  // Translation function with nested key support
  const t = (key: TranslationKey, fallback?: string): string => {
    if (!key) return fallback || '';

    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Return fallback or key if translation not found
        return fallback || key;
      }
    }

    return typeof value === 'string' ? value : (fallback || key);
  };

  // Function to check if a translation exists
  const hasTranslation = (key: TranslationKey): boolean => {
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return false;
      }
    }

    return typeof value === 'string';
  };

  // Get current locale
  const currentLocale = locale || defaultLocale || 'en';

  // Function to change language
  const changeLanguage = (newLocale: string) => {
    router.push(router.asPath, router.asPath, { locale: newLocale });
  };

  // Get available locales from Next.js config
  const availableLocales = ['en', 'es'];

  return {
    t,
    hasTranslation,
    currentLocale,
    changeLanguage,
    availableLocales,
    isLoading,
    translations
  };
};

// Language display names
export const getLanguageDisplayName = (locale: string): string => {
  const displayNames: { [key: string]: string } = {
    'en': 'English',
    'es': 'Español',
    'fr': 'Français', 
    'de': 'Deutsch',
    'zh': '中文'
  };
  
  return displayNames[locale] || locale;
};

// Detect browser language
export const detectBrowserLanguage = (): string => {
  if (typeof window === 'undefined') return 'en';
  
  const browserLang = navigator.language.split('-')[0]; // Get language without region
  const supportedLocales = ['en', 'es'];
  
  return supportedLocales.includes(browserLang) ? browserLang : 'en';
};