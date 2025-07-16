import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

// Example component showing how to use translations
const TranslationExample: React.FC = () => {
  const { t, currentLocale, isLoading } = useTranslation();

  if (isLoading) {
    return <div>Loading translations...</div>;
  }

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h2 className="text-xl font-bold mb-4">
        {t('services.title', 'Our Services')}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded">
          <h3 className="font-semibold text-lg mb-2">
            {t('services.snow_removal.title', 'Snow & Ice Removal')}
          </h3>
          <p className="text-gray-600">
            {t('services.snow_removal.description', 'Professional snow and ice removal for commercial and residential properties')}
          </p>
        </div>

        <div className="bg-white p-4 rounded">
          <h3 className="font-semibold text-lg mb-2">
            {t('services.landscaping.title', 'Landscaping')}
          </h3>
          <p className="text-gray-600">
            {t('services.landscaping.description', 'Complete landscape design, installation, and maintenance services')}
          </p>
        </div>

        <div className="bg-white p-4 rounded">
          <h3 className="font-semibold text-lg mb-2">
            {t('services.tree_removal.title', 'Tree & Stump Removal')}
          </h3>
          <p className="text-gray-600">
            {t('services.tree_removal.description', 'Professional tree removal and stump grinding services')}
          </p>
        </div>

        <div className="bg-white p-4 rounded">
          <h3 className="font-semibold text-lg mb-2">
            {t('services.concrete.title', 'Concrete & Asphalt')}
          </h3>
          <p className="text-gray-600">
            {t('services.concrete.description', 'Concrete work, asphalt repair, and paving services')}
          </p>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-100 rounded">
        <p className="text-sm text-blue-800">
          Current language: <strong>{currentLocale}</strong>
        </p>
        <p className="text-xs text-blue-600 mt-1">
          This example demonstrates how to use the translation system. 
          Switch languages using the globe icon in the header.
        </p>
      </div>
    </div>
  );
};

export default TranslationExample;