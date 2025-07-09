import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { 
  FaArrowLeft, 
  FaUserTie, 
  FaClock, 
  FaCalendarAlt, 
  FaFileAlt,
  FaChartBar,
  FaTools,
  FaDownload,
  FaUpload,
  FaClipboardCheck
} from 'react-icons/fa';

export default function EmployeeTools() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/portal/admin/login');
      return;
    }

    try {
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data.admin);
      } else {
        router.push('/portal/admin/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/portal/admin/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading employee tools...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Employee Tools - Admin Portal | VSR Construction</title>
        <meta name="description" content="Employee management tools and resources" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Link
                href="/portal/admin/dashboard"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <FaArrowLeft />
                <span>Back to Dashboard</span>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Employee Tools</h1>
            </div>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Time Tracking */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <FaClock className="h-8 w-8 text-blue-500 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900">Time Tracking</h2>
              </div>
              <p className="text-gray-600 mb-4">Manage employee time tracking and attendance records.</p>
              <div className="space-y-2">
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm">
                  View Time Records
                </button>
                <button className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 text-sm">
                  Generate Reports
                </button>
              </div>
            </div>

            {/* Schedule Management */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <FaCalendarAlt className="h-8 w-8 text-green-500 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900">Schedule Management</h2>
              </div>
              <p className="text-gray-600 mb-4">Create and manage employee schedules and assignments.</p>
              <div className="space-y-2">
                <button className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-sm">
                  View Schedules
                </button>
                <button className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 text-sm">
                  Create Schedule
                </button>
              </div>
            </div>

            {/* Performance Tracking */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <FaChartBar className="h-8 w-8 text-purple-500 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900">Performance Tracking</h2>
              </div>
              <p className="text-gray-600 mb-4">Monitor and evaluate employee performance metrics.</p>
              <div className="space-y-2">
                <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 text-sm">
                  View Metrics
                </button>
                <button className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 text-sm">
                  Create Review
                </button>
              </div>
            </div>

            {/* Document Management */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <FaFileAlt className="h-8 w-8 text-orange-500 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900">Document Management</h2>
              </div>
              <p className="text-gray-600 mb-4">Manage employee documents, forms, and certifications.</p>
              <div className="space-y-2">
                <button className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 text-sm">
                  <FaUpload className="inline mr-2" />
                  Upload Documents
                </button>
                <button className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 text-sm">
                  <FaDownload className="inline mr-2" />
                  Download Forms
                </button>
              </div>
            </div>

            {/* Training Management */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <FaClipboardCheck className="h-8 w-8 text-cyan-500 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900">Training Management</h2>
              </div>
              <p className="text-gray-600 mb-4">Track employee training progress and certifications.</p>
              <div className="space-y-2">
                <button className="w-full bg-cyan-600 text-white py-2 px-4 rounded-md hover:bg-cyan-700 text-sm">
                  View Training Records
                </button>
                <button className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 text-sm">
                  Assign Training
                </button>
              </div>
            </div>

            {/* Tools & Equipment */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-4">
                <FaTools className="h-8 w-8 text-red-500 mr-3" />
                <h2 className="text-lg font-semibold text-gray-900">Tools & Equipment</h2>
              </div>
              <p className="text-gray-600 mb-4">Manage tool checkout, maintenance, and inventory.</p>
              <div className="space-y-2">
                <button className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 text-sm">
                  View Inventory
                </button>
                <button className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 text-sm">
                  Checkout Tools
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <button className="bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 text-sm font-medium">
                Clock In/Out Report
              </button>
              <button className="bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 text-sm font-medium">
                Weekly Schedule
              </button>
              <button className="bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 text-sm font-medium">
                Performance Review
              </button>
              <button className="bg-orange-600 text-white py-3 px-4 rounded-md hover:bg-orange-700 text-sm font-medium">
                Safety Training
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}