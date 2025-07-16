import React, { useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { FaPrint, FaArrowLeft, FaPalette, FaQrcode, FaDownload } from 'react-icons/fa';
import BusinessCard from '../../components/BusinessCard';

const BusinessCardsPage: React.FC = () => {
  const router = useRouter();
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  
  // Derived values based on mode
  const textColor = mode === 'light' ? 'text-gray-800' : 'text-white';
  const qrCode = mode === 'light' ? 'qrcode.svg' : 'qr-code.png';
  const cardBackground = mode === 'light' ? 'bg-white' : 'bg-gray-900';

  const downloadPDF = () => {
    const filename = mode === 'light' ? 'Light_BusinessCard.pdf' : 'Dark_BusinessCard.pdf';
    const link = document.createElement('a');
    link.href = `/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <Head>
        <title>Business Card Dashboard - VSR Admin</title>
        <style jsx>{`
          .print-cards-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(5, 1fr);
            gap: 15px;
            max-width: 800px;
            margin: 0 auto;
          }
          
          .pdf-layout-grid {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            overflow: hidden;
          }
          
          .pdf-card-container {
            page-break-inside: avoid;
          }
          
          .pdf-card {
            width: 3.5in;
            height: 2in;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            border: 2px solid #1f2937;
            border-radius: 0;
            margin: 0;
            padding: 12px;
          }
          
          .print-section {
            display: none;
          }
          
          @media print {
            /* Hide everything except the print section */
            body * {
              visibility: hidden;
            }
            
            .print-section, .print-section * {
              visibility: visible;
            }
            
            .print-section {
              display: block !important;
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            
            .no-print {
              display: none !important;
            }
            
            /* Print-specific card styling */
            .print-card {
              width: 3.5in !important;
              height: 2in !important;
              box-shadow: none !important;
              border: 2px solid #000 !important;
              transform: none !important;
              margin: 0 !important;
              border-radius: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            /* Print grid layout */
            .print-cards-grid {
              display: grid !important;
              grid-template-columns: repeat(2, 1fr) !important;
              grid-template-rows: repeat(5, 1fr) !important;
              gap: 0.2in !important;
              max-width: 8.5in !important;
              margin: 0 auto !important;
              padding: 0 !important;
            }
            
            /* Page break settings */
            .print-page {
              page-break-after: always !important;
              padding: 0.25in 0 !important;
            }
            
            .print-page:last-child {
              page-break-after: auto !important;
            }
            
            /* Print card container */
            .print-card-container {
              page-break-inside: avoid !important;
              display: flex !important;
              justify-content: center !important;
              align-items: center !important;
            }
            
            /* Page settings */
            @page {
              size: letter !important;
              margin: 0.5in !important;
            }
          }
        `}</style>
      </Head>

      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-white shadow-sm border-b no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/portal/admin/dashboard')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                  <FaArrowLeft />
                  <span>Back to Admin Dashboard</span>
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Business Card Dashboard</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 no-print">
          <div className="bg-gray-50 rounded-lg p-6 mb-6 admin-form">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customization Controls</h2>
            <div className="flex justify-center">
              <div className="w-full max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  <FaPalette className="inline mr-2" />
                  Card Theme
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setMode('light')}
                    className={`flex items-center justify-center py-3 px-4 border-2 rounded-lg transition-all ${
                      mode === 'light'
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-medium">Light Mode</div>
                      <div className="text-xs mt-1">Black text • White background</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setMode('dark')}
                    className={`flex items-center justify-center py-3 px-4 border-2 rounded-lg transition-all ${
                      mode === 'dark'
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg font-medium">Dark Mode</div>
                      <div className="text-xs mt-1">White text • Dark background</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Preview */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 no-print">
          <div className="bg-white rounded-lg shadow border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Business Card Preview</h2>
            <div className="flex flex-col lg:flex-row justify-center items-center gap-12">
              <div className="text-center">
                <h3 className="text-md font-medium text-gray-700 mb-4">Front Side</h3>
                <BusinessCard side="front" textColor={textColor} qrCode={qrCode} cardBackground={cardBackground} />
              </div>
              <div className="text-center">
                <h3 className="text-md font-medium text-gray-700 mb-4">Back Side</h3>
                <BusinessCard side="back" textColor={textColor} qrCode={qrCode} cardBackground={cardBackground} />
              </div>
            </div>
          </div>
        </div>

        {/* Printable Document Download */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="bg-white rounded-lg shadow border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Printable Business Cards</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Thumbnail */}
                <div className="w-24 h-32 bg-gray-100 border-2 border-gray-300 rounded-lg overflow-hidden relative">
                  <iframe 
                    src={`/${mode === 'light' ? 'Light_BusinessCard.pdf' : 'Dark_BusinessCard.pdf'}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full transform scale-50 origin-top-left"
                    style={{ width: '200%', height: '200%' }}
                    title="PDF Preview"
                  />
                  <div className="absolute bottom-1 left-1 right-1 bg-black bg-opacity-75 text-white text-xs text-center py-1 rounded">
                    {mode === 'light' ? 'Light' : 'Dark'} PDF
                  </div>
                </div>
                
                {/* Document Info */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900">VSR Business Cards - Print Template</h3>
                  <p className="text-sm text-gray-600 mb-2">Printable PDF with 10 cards per page (2 pages: front & back)</p>
                  <ul className="text-sm text-gray-500 space-y-1">
                    <li>• Standard business card size (3.5" × 2")</li>
                    <li>• High-resolution 300 DPI</li>
                    <li>• Ready for professional printing</li>
                    <li>• Includes cut lines and bleed marks</li>
                    {mode === 'dark' && (
                      <li className="text-orange-600 font-medium">• Dark mode uses white text on transparent background - choose dark cardstock for best results</li>
                    )}
                  </ul>
                </div>
              </div>
              
              {/* Download Button */}
              <div className="text-right">
                <button
                  onClick={downloadPDF}
                  className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium text-lg"
                >
                  <FaDownload />
                  <span>Download PDF</span>
                </button>
                <p className="text-xs text-gray-500 mt-2">Click to generate printable PDF</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default BusinessCardsPage;