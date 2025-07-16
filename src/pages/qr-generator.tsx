import { useState } from 'react';
import Head from 'next/head';
import { FaQrcode, FaCopy, FaExternalLinkAlt } from 'react-icons/fa';

export default function QRGenerator() {
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const employees = [
    { slug: 'marcus', name: 'Marcus VSR', title: 'Project Manager' },
    { slug: 'zach', name: 'Zach VSR', title: 'Operations Manager' },
    { slug: 'demo', name: 'Development Admin', title: 'System Administrator' },
    { slug: 'citylife', name: 'Developer CityLife', title: 'Lead Developer' }
  ];

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const copyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const openUrl = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <>
      <Head>
        <title>QR Code Generator - VSR Construction</title>
        <meta name="description" content="Generate QR codes for business cards" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center space-x-3 mb-6">
              <FaQrcode className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">QR Code Generator</h1>
            </div>
            
            <p className="text-gray-600 mb-6">
              Generate QR codes for employee business cards. Each QR code links to a personalized landing page 
              that automatically tracks scans for analytics.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {employees.map((employee) => {
                const qrUrl = `${baseUrl}/qr/${employee.slug}`;
                
                return (
                  <div key={employee.slug} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{employee.name}</h3>
                        <p className="text-sm text-gray-600">{employee.title}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded p-3 mb-3">
                      <p className="text-xs text-gray-500 mb-1">QR Landing Page URL:</p>
                      <p className="text-sm font-mono text-gray-800 break-all">{qrUrl}</p>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => copyToClipboard(qrUrl)}
                        className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded text-sm font-medium transition-colors ${
                          copiedUrl === qrUrl
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                        }`}
                      >
                        <FaCopy className="h-3 w-3" />
                        <span>{copiedUrl === qrUrl ? 'Copied!' : 'Copy URL'}</span>
                      </button>
                      
                      <button
                        onClick={() => openUrl(qrUrl)}
                        className="flex items-center justify-center space-x-2 py-2 px-3 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        <FaExternalLinkAlt className="h-3 w-3" />
                        <span>Test</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">How to Use QR Codes</h2>
            <div className="space-y-3 text-sm text-blue-800">
              <div>
                <strong>1. Generate QR Codes:</strong>
                <p>Use any QR code generator (like qr-code-generator.com) with the URLs above.</p>
              </div>
              <div>
                <strong>2. Add to Business Cards:</strong>
                <p>Include the QR code on the back or corner of each employee's business card.</p>
              </div>
              <div>
                <strong>3. Track Analytics:</strong>
                <p>Each scan will be automatically tracked in the admin analytics dashboard.</p>
              </div>
              <div>
                <strong>4. Landing Page:</strong>
                <p>Visitors will see a mobile-friendly contact page with the employee's information.</p>
              </div>
            </div>
          </div>

          {/* Analytics Preview */}
          <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-purple-900 mb-3">Analytics Tracking</h2>
            <p className="text-sm text-purple-800 mb-3">
              QR code scans will appear in the admin analytics dashboard under "QR Code Scans" with:
            </p>
            <ul className="text-sm text-purple-700 space-y-1">
              <li>• Employee name and scan count</li>
              <li>• Device type (mobile, desktop, tablet)</li>
              <li>• Timestamp of each scan</li>
              <li>• Percentage breakdown by employee</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}