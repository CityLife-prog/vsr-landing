import { useState } from 'react';
import { useAnalyticsContext } from '@/components/AnalyticsProvider';

export default function TestAnalytics() {
  const { trackPageView, trackButtonClick, trackQuoteRequest, trackVisitor, trackQRCodeScan } = useAnalyticsContext();
  const [message, setMessage] = useState('');

  const handleTestEvent = async (eventType: string) => {
    try {
      switch (eventType) {
        case 'pageview':
          trackPageView('/test-page');
          setMessage('Page view tracked');
          break;
        case 'button':
          trackButtonClick('Test Button');
          setMessage('Button click tracked');
          break;
        case 'quote':
          trackQuoteRequest();
          setMessage('Quote request tracked');
          break;
        case 'visitor':
          trackVisitor();
          setMessage('Visitor tracked');
          break;
        case 'qr':
          trackQRCodeScan('Business Card', 'Test Employee');
          setMessage('QR code scan tracked');
          break;
        default:
          setMessage('Unknown event type');
      }
    } catch (error) {
      setMessage(`Error: ${error}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics Testing</h1>
        
        <div className="space-y-4">
          <button
            onClick={() => handleTestEvent('pageview')}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Test Page View
          </button>
          
          <button
            onClick={() => handleTestEvent('button')}
            className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Test Button Click
          </button>
          
          <button
            onClick={() => handleTestEvent('quote')}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Test Quote Request
          </button>
          
          <button
            onClick={() => handleTestEvent('visitor')}
            className="w-full bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
          >
            Test Visitor
          </button>

          <button
            onClick={() => handleTestEvent('qr')}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Test QR Code Scan
          </button>
        </div>
        
        {message && (
          <div className="mt-4 p-3 bg-gray-100 rounded">
            <p className="text-sm text-gray-700">{message}</p>
          </div>
        )}
        
        <div className="mt-6 text-sm text-gray-600">
          <p><strong>Instructions:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open browser developer tools (F12)</li>
            <li>Go to Console tab</li>
            <li>Click any test button above</li>
            <li>Look for "📊 Analytics Event" logs in console</li>
            <li>Check the admin analytics page for updates</li>
          </ol>
        </div>
      </div>
    </div>
  );
}