import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { FaEdit, FaPhoneAlt, FaQuestionCircle, FaClipboardList } from 'react-icons/fa';
import { useTranslation } from '@/hooks/useTranslation';

export default function ClientUpdateButton() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div 
        className="relative"
        ref={dropdownRef}
      >
        {/* Floating Button */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110"
        >
          <FaEdit size={20} />
        </button>

        {/* Dropdown on Click */}
        {isDropdownOpen && (
          <div className="absolute bottom-16 right-0 bg-gray-800 text-white rounded-lg shadow-lg py-2 min-w-64 z-50 transform transition-all duration-200">
            <div className="px-4 py-2 border-b border-gray-600">
              <h3 className="text-sm font-semibold text-white">{t('help.client_update', 'Client Update')}</h3>
            </div>
            
            <button
              onClick={() => {
                router.push('/quote');
                setIsDropdownOpen(false);
              }}
              className="flex items-center w-full text-left px-4 py-2 hover:bg-gray-700 text-sm text-white"
            >
              <FaClipboardList className="mr-3" size={12} />
              {t('help.request_quote', 'Request a Quote')}
            </button>
            
            <button
              onClick={() => {
                router.push('/quote#update-vsr-team');
                setIsDropdownOpen(false);
              }}
              className="flex items-center w-full text-left px-4 py-2 hover:bg-gray-700 text-sm text-white"
            >
              <FaPhoneAlt className="mr-3" size={12} />
              {t('help.update_team', 'Update the VSR team')}
            </button>
            
            <a
              href="mailto:citylife32@outlook.com?subject=Accessibility Issues - VSR Support"
              onClick={() => setIsDropdownOpen(false)}
              className="flex items-center w-full text-left px-4 py-2 hover:bg-gray-700 text-sm text-white"
            >
              <FaQuestionCircle className="mr-3" size={12} />
              {t('help.accessibility_issues', 'Accessibility issues?')}
            </a>
            
            {/* Arrow pointing to button */}
            <div className="absolute -bottom-2 right-4 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-gray-800"></div>
          </div>
        )}
      </div>
    </div>
  );
}