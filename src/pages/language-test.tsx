import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export default function LanguageTest() {
  const router = useRouter();
  const [browserInfo, setBrowserInfo] = useState<any>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBrowserInfo({
        language: navigator.language,
        languages: navigator.languages,
        locale: router.locale,
        hasSpanish: (navigator.languages || [navigator.language]).some(lang => lang.startsWith('es'))
      });
    }
  }, [router.locale]);

  const testSpanishRedirect = () => {
    router.push(router.asPath, router.asPath, { locale: 'es' });
  };

  const testEnglishRedirect = () => {
    router.push(router.asPath, router.asPath, { locale: 'en' });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Language Detection Test</h1>
      
      <div className="bg-gray-800 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Browser Language Info</h2>
        <pre className="text-sm bg-gray-700 p-4 rounded overflow-auto">
          {JSON.stringify(browserInfo, null, 2)}
        </pre>
      </div>

      <div className="space-y-4">
        <button 
          onClick={testSpanishRedirect}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded text-white mr-4"
        >
          Test Spanish Redirect
        </button>
        
        <button 
          onClick={testEnglishRedirect}
          className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded text-white"
        >
          Test English Redirect
        </button>
      </div>

      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Instructions</h2>
        <p className="text-gray-300">
          1. Check your browser language info above<br/>
          2. If "hasSpanish" is true, the page should auto-redirect to Spanish<br/>
          3. Use the buttons to manually test language switching<br/>
          4. Check browser console for detection logs
        </p>
      </div>
    </div>
  );
}