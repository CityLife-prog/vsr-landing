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
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaExclamationTriangle
} from 'react-icons/fa';
import { isFeatureEnabled } from '@/utils/version';

export default function Analytics() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [serviceStatus, setServiceStatus] = useState<any>(null);

  useEffect(() => {
    checkAdminAuth();
  }, []);

  // Load service status after admin is loaded
  useEffect(() => {
    if (admin?.email === 'citylife32@outlook.com') {
      console.log('🔐 Super admin detected, loading service status...');
      loadServiceStatus();
    }
  }, [admin]);

  // Load analytics data once on admin auth (removed auto-refresh)
  useEffect(() => {
    if (!admin) return;
    
    const token = localStorage.getItem('accessToken');
    if (token) {
      loadAnalytics(token);
    }
  }, [admin]);

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
        console.log('👤 Admin user loaded:', data.admin);
        setAdmin(data.admin);
        await loadAnalytics(token);
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

  const loadAnalytics = async (token: string) => {
    try {
      const response = await fetch('/api/admin/analytics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setAnalyticsData(result.data);
      } else {
        console.error('Failed to load analytics');
        // Set fallback data if API fails
        setAnalyticsData({
          overview: {
            totalVisitors: 0,
            visitorChange: 0,
            pageViews: 0,
            pageViewChange: 0,
            quoteRequests: 0,
            quoteRequestChange: 0,
            conversionRate: 0,
            conversionRateChange: 0
          },
          topPages: [],
          trafficSources: [],
          deviceBreakdown: []
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      // Set fallback data if request fails
      setAnalyticsData({
        overview: {
          totalVisitors: 0,
          visitorChange: 0,
          pageViews: 0,
          pageViewChange: 0,
          quoteRequests: 0,
          quoteRequestChange: 0,
          conversionRate: 0,
          conversionRateChange: 0
        },
        topPages: [],
        trafficSources: [],
        deviceBreakdown: []
      });
    }
  };

  const loadServiceStatus = async (retryCount = 0) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('🔒 No token available for service status');
      setServiceStatus(null);
      return;
    }

    console.log('🔄 Loading service status... (attempt', retryCount + 1, ')');
    console.log('🔑 Token length:', token.length, 'Admin email:', admin?.email);
    
    try {
      const response = await fetch('/api/admin/service-status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Service status response:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 Service status data received:', data);
        setServiceStatus(data.data);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        console.error('❌ Service status error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        // If unauthorized/forbidden and this is super admin, retry once
        if ((response.status === 403 || response.status === 401) && retryCount === 0 && admin?.email === 'citylife32@outlook.com') {
          console.log('🔄 Retrying service status load for super admin...');
          setTimeout(() => loadServiceStatus(1), 2000);
        } else {
          setServiceStatus(null);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load service status:', error);
      
      // Retry once on network error
      if (retryCount === 0) {
        console.log('🔄 Retrying service status load due to network error...');
        setTimeout(() => loadServiceStatus(1), 2000);
      } else {
        setServiceStatus(null);
      }
    }
  };

  const handleToggleService = async () => {
    console.log('🔧 handleToggleService called');
    console.log('📊 Current serviceStatus:', serviceStatus);
    console.log('👤 Current admin:', admin);
    
    if (!serviceStatus) {
      console.log('❌ No service status available');
      alert('Service status not loaded. Please refresh and try again.');
      return;
    }

    const action = serviceStatus.isRunning ? 'stop' : 'start';
    const actionWord = serviceStatus.isRunning ? 'STOP' : 'START';
    
    console.log(`🎯 Action: ${action}, ActionWord: ${actionWord}`);
    
    const confirmText = prompt(
      `WARNING: This will ${action} the entire service!\n\n` +
      `Type "${actionWord} SERVICE" to confirm:`
    );

    console.log(`✅ User entered: "${confirmText}", Expected: "${actionWord} SERVICE"`);

    if (confirmText !== `${actionWord} SERVICE`) {
      alert(`Service ${action} cancelled. Invalid confirmation text.`);
      return;
    }

    const finalConfirm = confirm(
      `Are you absolutely sure you want to ${action} the service?\n\n` +
      (serviceStatus.isRunning ? 
        'This will stop all modules and require manual restart.' :
        'This will start all service modules.')
    );

    if (!finalConfirm) {
      alert(`Service ${action} cancelled.`);
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      console.log('🔑 Token available:', !!token);
      
      const response = await fetch('/api/admin/service-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'toggle_service' })
      });

      console.log('📡 Response status:', response.status);
      const result = await response.json();
      console.log('📋 Response data:', result);

      if (result.success) {
        setServiceStatus(result.data);
        alert(`Service ${result.data.isRunning ? 'started' : 'stopped'} successfully!`);
        
        // Reload analytics
        const token = localStorage.getItem('accessToken');
        if (token) loadAnalytics(token);
      } else {
        alert(`Failed to ${action} service: ${result.message}`);
      }
    } catch (error) {
      console.error(`❌ Error ${action}ping service:`, error);
      alert(`Error occurred while trying to ${action} service.`);
    }
  };

  const resetAnalytics = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    if (confirm('Are you sure you want to reset all analytics data to 0?')) {
      try {
        const response = await fetch('/api/admin/analytics', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action: 'reset' })
        });

        if (response.ok) {
          const result = await response.json();
          setAnalyticsData(result.data);
        }
      } catch (error) {
        console.error('Error resetting analytics:', error);
      }
    }
  };

  const handleToggleAnalytics = async () => {
    if (!serviceStatus) return;

    const isEnabled = serviceStatus.modules.analytics;
    const action = isEnabled ? 'disable' : 'enable';
    
    const reason = isEnabled ? prompt(
      'Optional: Enter a reason for disabling analytics (will be shown to other admins):'
    ) : null;

    if (isEnabled && reason === null) return; // User cancelled

    const confirmed = confirm(
      `Are you sure you want to ${action} the analytics module?\n\n` +
      (isEnabled ? 'This will stop analytics collection and show a notice to other admins.' : 
       'This will re-enable analytics collection and clear any admin notices.')
    );

    if (!confirmed) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/service-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          action: 'toggle_module', 
          module: 'analytics',
          reason: reason || undefined
        })
      });

      const result = await response.json();

      if (result.success) {
        setServiceStatus(result.data);
        alert(`Analytics ${result.data.modules.analytics ? 'enabled' : 'disabled'} successfully!`);
      } else {
        alert(`Failed to ${action} analytics: ${result.message}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing analytics:`, error);
      alert(`Error occurred while trying to ${action} analytics.`);
    }
  };

  if (loading || !analyticsData) {
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
              <button 
                onClick={() => {
                  const token = localStorage.getItem('accessToken');
                  if (token) loadAnalytics(token);
                  loadServiceStatus();
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm mr-2"
              >
                <FaArrowUp className="inline mr-2" />
                Refresh All
              </button>
              {admin?.email === 'citylife32@outlook.com' && (
                <>
                  <button 
                    onClick={handleToggleAnalytics}
                    className={`${
                      serviceStatus?.modules.analytics
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white px-4 py-2 rounded-md text-sm mr-2`}
                    title={serviceStatus?.modules.analytics ? 'Disable Analytics Only' : 'Enable Analytics Only'}
                  >
                    {serviceStatus?.modules.analytics ? 'Disable Analytics' : 'Enable Analytics'}
                  </button>
                  <button 
                    onClick={resetAnalytics}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm mr-2"
                  >
                    Reset to 0
                  </button>
                </>
              )}
              {isFeatureEnabled('admin-reports') && (
                <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm mr-2">
                  <FaDownload className="inline mr-2" />
                  Export Report
                </button>
              )}
              {admin?.email === 'citylife32@outlook.com' && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleToggleService}
                    className={`${
                      !serviceStatus 
                        ? 'bg-yellow-600 hover:bg-yellow-700' 
                        : serviceStatus.isRunning 
                          ? 'bg-red-800 hover:bg-red-900' 
                          : 'bg-green-800 hover:bg-green-900'
                    } text-white px-4 py-2 rounded-md text-sm flex items-center`}
                    title={`Admin: ${admin?.email}, Service Status: ${serviceStatus ? (serviceStatus.isRunning ? 'Running' : 'Stopped') : 'Loading...'}`}
                    disabled={!serviceStatus}
                  >
                    <FaExclamationTriangle className="mr-2" />
                    {serviceStatus ? (serviceStatus.isRunning ? 'Stop Service' : 'Start Service') : 'Loading Service...'}
                  </button>
                  
                  {/* Service Status Indicator */}
                  {serviceStatus && (
                    <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${
                      serviceStatus.isRunning 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${
                        serviceStatus.isRunning ? 'bg-green-600' : 'bg-red-600'
                      }`}></div>
                      {serviceStatus.isRunning ? 'All Systems Operational' : 'Maintenance Mode Active'}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Admin Analytics Notice */}
          {serviceStatus?.adminNotes?.analytics && !serviceStatus.modules.analytics && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Analytics System Notice
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p className="mb-2">{serviceStatus.adminNotes.analytics.message}</p>
                    <div className="text-xs space-y-1">
                      <p><strong>Disabled by:</strong> {serviceStatus.adminNotes.analytics.disabledBy}</p>
                      <p><strong>Disabled at:</strong> {new Date(serviceStatus.adminNotes.analytics.disabledAt).toLocaleString()}</p>
                      {serviceStatus.adminNotes.analytics.reason && (
                        <p><strong>Reason:</strong> {serviceStatus.adminNotes.analytics.reason}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                <span className="text-sm text-green-500">+{Math.round(analyticsData.overview.visitorChange)}%</span>
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
                  <FaEye className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <FaArrowUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-500">+{Math.round(analyticsData.overview.pageViewChange)}%</span>
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
                  <FaEnvelope className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <FaArrowUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-sm text-green-500">+{Math.round(analyticsData.overview.quoteRequestChange)}%</span>
                <span className="text-sm text-gray-500 ml-2">from last period</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.round(analyticsData.overview.conversionRate)}%</p>
                </div>
                <div className="flex items-center">
                  <FaChartLine className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <FaArrowDown className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-sm text-red-500">{Math.round(analyticsData.overview.conversionRateChange)}%</span>
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
                      <p className="text-xs text-gray-500">{Math.round(page.percentage)}%</p>
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
                      <p className="text-xs text-gray-500">{Math.round(source.percentage)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Breakdown</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {analyticsData.deviceBreakdown.map((device, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl font-bold text-gray-900">{Math.round(device.percentage)}%</div>
                  <div className="text-sm text-gray-600">{device.device}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Login Attempts Breakdown */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Login Attempts by Type</h2>
            <div className="space-y-4">
              {analyticsData.loginAttempts && analyticsData.loginAttempts.map((login, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{login.loginType} Portal</p>
                    <div className="mt-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${login.successRate}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm font-medium text-gray-900">{login.successful}/{login.attempts}</p>
                    <p className="text-xs text-gray-500">{Math.round(login.successRate)}% success</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}