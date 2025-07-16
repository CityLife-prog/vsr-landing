import React, { useState } from 'react';
import { useTranslation, getLanguageDisplayName } from '@/hooks/useTranslation';
import { FaGlobe, FaChevronDown } from 'react-icons/fa';

interface LanguageSwitcherProps {
  className?: string;
  showLabel?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  className = '',
  showLabel = true 
}) => {
  const { currentLocale, changeLanguage, availableLocales } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (locale: string) => {
    changeLanguage(locale);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 hover:text-blue-400 focus:outline-none"
        aria-label="Change language"
      >
        <FaGlobe className="h-4 w-4" />
        {showLabel && (
          <>
            <span className="text-sm">{getLanguageDisplayName(currentLocale)}</span>
            <FaChevronDown 
              size={12} 
              className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
          </>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown - matching Portal dropdown style */}
          <div className="absolute top-full left-0 mt-1 bg-gray-800 text-white rounded-lg shadow-lg py-2 min-w-48 z-50">
            {availableLocales.map((locale) => (
              <button
                key={locale}
                onClick={() => handleLanguageChange(locale)}
                className={`block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm font-medium text-white ${
                  currentLocale === locale ? 'bg-gray-700' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{getLanguageDisplayName(locale)}</span>
                  {currentLocale === locale && (
                    <span className="text-blue-400">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;