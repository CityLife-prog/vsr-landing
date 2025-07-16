import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaGlobe } from 'react-icons/fa';
import { useAnalyticsContext } from '@/components/AnalyticsProvider';

export default function QRLanding() {
  const router = useRouter();
  const { employee } = router.query;
  const { trackQRCodeScan } = useAnalyticsContext();
  const [employeeData, setEmployeeData] = useState<any>(null);

  // Employee data mapping
  const employees = {
    'marcus': {
      name: 'Marcus VSR',
      title: 'Project Manager',
      phone: '(720) 838-5807',
      email: 'marcus@vsrsnow.com',
      photo: '/team/marcus.jpg'
    },
    'zach': {
      name: 'Zach VSR', 
      title: 'Operations Manager',
      phone: '(720) 838-5807',
      email: 'zach@vsrsnow.com',
      photo: '/team/zach.jpg'
    },
    'demo': {
      name: 'Development Admin',
      title: 'System Administrator',
      phone: '(720) 838-5807',
      email: 'demo.admin@vsrsnow.com',
      photo: '/team/demo.jpg'
    },
    'citylife': {
      name: 'Developer CityLife',
      title: 'Lead Developer',
      phone: '(720) 838-5807',
      email: 'citylife32@outlook.com',
      photo: '/team/citylife.jpg'
    }
  };

  useEffect(() => {
    if (employee && typeof employee === 'string') {
      const empData = employees[employee as keyof typeof employees];
      if (empData) {
        setEmployeeData(empData);
        // Track QR code scan
        trackQRCodeScan('Business Card', empData.name);
      }
    }
  }, [employee, trackQRCodeScan]);

  if (!employeeData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p className="text-gray-400">Please wait while we load the contact information.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{employeeData.name} - VSR Construction</title>
        <meta name="description" content={`Contact information for ${employeeData.name} at VSR Construction`} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-md mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-32 h-32 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-300">
                {employeeData.name.split(' ').map((n: string) => n[0]).join('')}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white">{employeeData.name}</h1>
            <p className="text-gray-400">{employeeData.title}</p>
            <div className="mt-4 px-4 py-2 bg-blue-600 rounded-lg inline-block">
              <span className="text-sm font-semibold">VSR Construction LLC</span>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Contact Information</h2>
            
            <div className="space-y-4">
              <a 
                href={`tel:${employeeData.phone}`}
                className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <FaPhone className="text-green-400" />
                <div>
                  <p className="text-sm text-gray-400">Phone</p>
                  <p className="text-white font-medium">{employeeData.phone}</p>
                </div>
              </a>

              <a 
                href={`mailto:${employeeData.email}`}
                className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <FaEnvelope className="text-blue-400" />
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-white font-medium">{employeeData.email}</p>
                </div>
              </a>

              <div className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                <FaMapMarkerAlt className="text-red-400" />
                <div>
                  <p className="text-sm text-gray-400">Service Area</p>
                  <p className="text-white font-medium">Michigan & Surrounding Areas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Our Services</h2>
            <ul className="space-y-2 text-gray-300">
              <li>• Snow & Ice Removal</li>
              <li>• Landscaping & Grounds Maintenance</li>
              <li>• Concrete & Asphalt Services</li>
              <li>• Demolition Services</li>
              <li>• Painting & General Construction</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Link
              href="/quote"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 px-6 rounded-lg font-semibold transition-colors"
            >
              Get a Free Quote
            </Link>
            
            <Link
              href="/"
              className="block w-full bg-gray-700 hover:bg-gray-600 text-white text-center py-3 px-6 rounded-lg font-semibold transition-colors"
            >
              <FaGlobe className="inline mr-2" />
              Visit Our Website
            </Link>
          </div>

          {/* Footer */}
          <div className="text-center mt-8 text-gray-500 text-sm">
            <p>Thanks for scanning our QR code!</p>
            <p className="mt-1">VSR Construction LLC - Built for Every Season</p>
          </div>
        </div>
      </div>
    </>
  );
}