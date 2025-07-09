import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { 
  FaArrowLeft, 
  FaChartBar, 
  FaUsers, 
  FaEye, 
  FaMousePointer,
  FaPhoneAlt,
  FaEnvelope,
  FaDownload,
  FaCalendarAlt,
  FaTrendingUp,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';

export default function Analytics() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

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

  // Mock analytics data
  const analyticsData = {
    overview: {
      totalVisitors: 1247,
      visitorChange: 12.5,
      pageViews: 3891,
      pageViewChange: 8.2,
      quoteRequests: 34,
      quoteRequestChange: 25.0,
      conversionRate: 2.7,
      conversionRateChange: -0.3
    },
    topPages: [
      { path: '/', views: 1247, percentage: 32.0 },
      { path: '/quote', views: 892, percentage: 22.9 },
      { path: '/services', views: 567, percentage: 14.6 },
      { path: '/about', views: 234, percentage: 6.0 },
      { path: '/apply', views: 189, percentage: 4.9 }
    ],
    trafficSources: [
      { source: 'Direct', visitors: 456, percentage: 36.6 },
      { source: 'Google Search', visitors: 389, percentage: 31.2 },
      { source: 'Social Media', visitors: 234, percentage: 18.8 },
      { source: 'Referral', visitors: 168, percentage: 13.5 }
    ],
    deviceBreakdown: [
      { device: 'Desktop', percentage: 45.2 },
      { device: 'Mobile', percentage: 39.8 },
      { device: 'Tablet', percentage: 15.0 }
    ]
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Website Analytics - Admin Portal | VSR Construction</title>
        <meta name="description" content="Website analytics and performance metrics" />
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
              <h1 className="text-2xl font-bold text-gray-900">Website Analytics</h1>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white text-gray-900"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm">
                <FaDownload className="inline mr-2" />
                Export Report
              </button>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Visitors</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.totalVisitors.toLocaleString()}</p>
                </div>
                <div className="flex items-center">
                  <FaUsers className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <FaArrowUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-500">+{analyticsData.overview.visitorChange}%</span>
                <span className="text-sm text-gray-500 ml-2">from last period</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Page Views</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.pageViews.toLocaleString()}</p>
                </div>
                <div className="flex items-center">
                  <FaEye className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <FaArrowUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-500">+{analyticsData.overview.pageViewChange}%</span>
                <span className="text-sm text-gray-500 ml-2">from last period</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Quote Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.quoteRequests}</p>
                </div>
                <div className="flex items-center">
                  <FaEnvelope className="h-8 w-8 text-purple-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <FaArrowUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-500">+{analyticsData.overview.quoteRequestChange}%</span>
                <span className="text-sm text-gray-500 ml-2">from last period</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.conversionRate}%</p>
                </div>
                <div className="flex items-center">
                  <FaTrendingUp className="h-8 w-8 text-orange-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <FaArrowDown className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-sm text-red-500">{analyticsData.overview.conversionRateChange}%</span>
                <span className="text-sm text-gray-500 ml-2">from last period</span>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Pages */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Pages</h2>
              <div className="space-y-4">
                {analyticsData.topPages.map((page, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{page.path}</p>
                      <div className="mt-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${page.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-medium text-gray-900">{page.views.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{page.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Traffic Sources */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Traffic Sources</h2>
              <div className="space-y-4">
                {analyticsData.trafficSources.map((source, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{source.source}</p>
                      <div className="mt-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${source.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-medium text-gray-900">{source.visitors.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{source.percentage}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analyticsData.deviceBreakdown.map((device, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{device.percentage}%</div>
                  <div className="text-sm text-gray-600">{device.device}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}