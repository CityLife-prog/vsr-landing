import { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 shadow-lg z-50 border-t border-gray-700">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm">
            We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. 
            By clicking "Accept All", you consent to our use of cookies.{' '}
            <a href="/privacy" className="underline hover:text-blue-300">
              Learn more in our Privacy Policy
            </a>
          </p>
        </div>
        
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm border border-gray-600 rounded hover:bg-gray-800 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm bg-blue-600 rounded hover:bg-blue-700 transition-colors"
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}