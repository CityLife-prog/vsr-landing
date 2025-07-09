import React, { useState, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { FaPrint, FaArrowLeft, FaPalette, FaQrcode, FaDownload } from 'react-icons/fa';
import BusinessCard from '../../components/BusinessCard';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const BusinessCardsPage: React.FC = () => {
  const router = useRouter();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [textColor, setTextColor] = useState('text-gray-800');
  const [qrCode, setQrCode] = useState<'qr-code.png' | 'qrcode.svg'>('qr-code.png');
  const frontCardsRef = useRef<HTMLDivElement>(null);
  const backCardsRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    setIsPrinting(true);
    // Give time for the state to update before printing
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 200);
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      // Create a new PDF document (8.5" x 11" - letter size)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter'
      });

      // Generate front cards page
      if (frontCardsRef.current) {
        const frontCanvas = await html2canvas(frontCardsRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
        
        const frontImgData = frontCanvas.toDataURL('image/png');
        const imgWidth = 8.5;
        const imgHeight = (frontCanvas.height * imgWidth) / frontCanvas.width;
        
        pdf.addImage(frontImgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }

      // Add a new page for back cards
      pdf.addPage();
      
      // Generate back cards page
      if (backCardsRef.current) {
        const backCanvas = await html2canvas(backCardsRef.current, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
        
        const backImgData = backCanvas.toDataURL('image/png');
        const imgWidth = 8.5;
        const imgHeight = (backCanvas.height * imgWidth) / backCanvas.width;
        
        pdf.addImage(backImgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }

      // Save the PDF
      pdf.save('VSR-Business-Cards.pdf');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const generateFrontCards = () => {
    const cards = [];
    for (let i = 0; i < 10; i++) {
      cards.push(
        <div key={`front-${i}`} className="pdf-card-container" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          width: '3.5in',
          height: '2in'
        }}>
          <BusinessCard side="front" className="pdf-card" textColor={textColor} qrCode={qrCode} />
        </div>
      );
    }
    return cards;
  };

  const generateBackCards = () => {
    const cards = [];
    for (let i = 0; i < 10; i++) {
      cards.push(
        <div key={`back-${i}`} className="pdf-card-container" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          width: '3.5in',
          height: '2in'
        }}>
          <BusinessCard side="back" className="pdf-card" textColor={textColor} qrCode={qrCode} />
        </div>
      );
    }
    return cards;
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
            border: 1px solid #d1d5db;
            border-radius: 8px;
            margin: 0;
            padding: 12px;
            background: white;
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
              border: 1px solid #000 !important;
              transform: none !important;
              margin: 0 !important;
              border-radius: 0.25rem !important;
              background: white !important;
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
                  onClick={() => router.push('/admin')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                  <FaArrowLeft />
                  <span>Back to Admin Dashboard</span>
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Business Card Dashboard</h1>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={handlePrint}
                  disabled={isPrinting}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 font-medium"
                >
                  <FaPrint />
                  <span>{isPrinting ? 'Preparing...' : 'Print Cards'}</span>
                </button>
                
                <button
                  onClick={generatePDF}
                  disabled={isGeneratingPDF}
                  className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 font-medium"
                >
                  <FaDownload />
                  <span>{isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 no-print">
          <div className="bg-gray-50 rounded-lg p-6 mb-6 admin-form">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customization Controls</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Text Color Control */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaPalette className="inline mr-2" />
                  Text Color
                </label>
                <select
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="text-gray-800">Black</option>
                  <option value="text-gray-300">Gray</option>
                  <option value="text-white">White</option>
                  <option value="text-blue-800">Blue</option>
                  <option value="text-red-800">Red</option>
                  <option value="text-green-800">Green</option>
                  <option value="text-purple-800">Purple</option>
                  <option value="text-indigo-800">Indigo</option>
                </select>
              </div>

              {/* QR Code Control */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaQrcode className="inline mr-2" />
                  QR Code
                </label>
                <select
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value as 'qr-code.png' | 'qrcode.svg')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                >
                  <option value="qr-code.png">QR Code (PNG)</option>
                  <option value="qrcode.svg">QR Code (SVG)</option>
                </select>
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
                <BusinessCard side="front" textColor={textColor} qrCode={qrCode} />
              </div>
              <div className="text-center">
                <h3 className="text-md font-medium text-gray-700 mb-4">Back Side</h3>
                <BusinessCard side="back" textColor={textColor} qrCode={qrCode} />
              </div>
            </div>
          </div>
        </div>

        {/* Print Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="bg-white rounded-lg shadow border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Print Layout</h2>
            
            {/* Page 1: Front Cards */}
            <div className="mb-8">
              <h3 className="text-md font-medium text-gray-700 mb-4">Page 1 - Front Cards</h3>
              <div 
                ref={frontCardsRef}
                className="pdf-layout-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gridTemplateRows: 'repeat(5, 1fr)',
                  gap: '0.25in',
                  width: '8.5in',
                  height: '11in',
                  padding: '0.5in',
                  backgroundColor: '#ffffff',
                  margin: '0 auto'
                }}
              >
                {generateFrontCards()}
              </div>
            </div>
            
            {/* Page 2: Back Cards */}
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-4">Page 2 - Back Cards</h3>
              <div 
                ref={backCardsRef}
                className="pdf-layout-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gridTemplateRows: 'repeat(5, 1fr)',
                  gap: '0.25in',
                  width: '8.5in',
                  height: '11in',
                  padding: '0.5in',
                  backgroundColor: '#ffffff',
                  margin: '0 auto'
                }}
              >
                {generateBackCards()}
              </div>
            </div>
          </div>
        </div>

        {/* Print Area (Only visible when printing) */}
        <div className="print-section">
          {/* Page 1: Front Cards */}
          <div className="print-page">
            <div className="print-cards-grid">
              {generateFrontCards()}
            </div>
          </div>
          
          {/* Page 2: Back Cards */}
          <div className="print-page">
            <div className="print-cards-grid">
              {generateBackCards()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BusinessCardsPage;