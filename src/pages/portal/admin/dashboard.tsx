import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { 
  FaUsers, 
  FaUserTie, 
  FaChartBar,
  FaCog,
  FaDatabase,
  FaCalendarAlt,
  FaComments,
  FaProjectDiagram,
  FaFileAlt,
  FaExclamationTriangle,
  FaClipboardCheck,
  FaServer,
  FaIdCard,
  FaSnowflake,
  FaEnvelope,
  FaBell,
  FaUserCircle
} from 'react-icons/fa';
import { isFeatureEnabled, getCurrentVersion } from '@/utils/version';
import NotificationBubble from '@/components/admin/NotificationBubble';
import EmergencyMaintenanceButton from '@/components/admin/EmergencyMaintenanceButton';

export default function AdminDashboard() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEmployees: 0,
    activeProjects: 0,
    pendingApprovals: 0
  });
  
  // Notification state
  const [notifications, setNotifications] = useState({
    quoteRequests: 0,
    clientUpdates: 0,
    updateRequests: 0,
    jobApplications: 0,
    employeeApprovals: 0,
    systemUpdates: 0
  });
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [serviceStatus, setServiceStatus] = useState<any>(null);

  useEffect(() => {
    checkAdminAuth();
    // Load system health data on mount (removed auto-refresh)
    loadSystemHealth();
    loadAnalyticsData();
    loadServiceStatus();
  }, []);

  const loadSystemHealth = async () => {
    try {
      const response = await fetch('/api/admin/health', {
        credentials: 'include' // Use cookies instead of token
      });

      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data);
      }
    } catch (error) {
      console.error('Failed to load system health:', error);
    }
  };

  const loadServiceStatus = async () => {
    try {
      const response = await fetch('/api/admin/service-status', {
        credentials: 'include' // Use cookies instead of token
      });

      if (response.ok) {
        const data = await response.json();
        setServiceStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to load service status:', error);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      // Load quote requests
      const quoteResponse = await fetch('/api/admin/quote-requests', {
        credentials: 'include' // Use cookies instead of token
      });

      // Load update requests
      const updateResponse = await fetch('/api/admin/update-requests', {
        credentials: 'include' // Use cookies instead of token
      });

      // Load job applications
      const jobApplicationsResponse = await fetch('/api/admin/job-applications', {
        credentials: 'include' // Use cookies instead of token
      });

      let quoteRequestsCount = 0;
      let updateRequestsCount = 0;
      let jobApplicationsCount = 0;

      if (quoteResponse.ok) {
        const quoteData = await quoteResponse.json();
        quoteRequestsCount = quoteData.data?.summary?.pending || 0;
      }

      if (updateResponse.ok) {
        const updateData = await updateResponse.json();
        updateRequestsCount = updateData.data?.summary?.pending || 0;
      }

      if (jobApplicationsResponse.ok) {
        const jobApplicationsData = await jobApplicationsResponse.json();
        jobApplicationsCount = jobApplicationsData.data?.summary?.pending || 0;
      }

      // Update notifications with real data
      setNotifications(prev => ({
        ...prev,
        quoteRequests: quoteRequestsCount,
        updateRequests: updateRequestsCount,
        jobApplications: jobApplicationsCount,
        clientUpdates: 0 // Can be expanded later
      }));

    } catch (error) {
      console.error('Failed to load analytics data:', error);
      // Fallback to mock data
      setNotifications(prev => ({
        ...prev,
        quoteRequests: 2,
        updateRequests: 3,
        jobApplications: 1,
        clientUpdates: 0
      }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-600';
      case 'degraded':
        return 'bg-yellow-600';
      case 'down':
      case 'critical':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational':
        return 'Online';
      case 'degraded':
        return 'Limited';
      case 'down':
        return 'Offline';
      case 'critical':
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h`;
  };

  const checkAdminAuth = async () => {
    try {
      // Use cookie-based authentication (no token needed)
      const response = await fetch('/api/admin/dashboard', {
        credentials: 'include' // Include cookies for authentication
      });

      if (response.ok) {
        const data = await response.json();
        setAdmin(data.admin);
        setStats(data.stats);
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

  const handleToggleService = async () => {
    if (!serviceStatus) {
      alert('Service status not loaded. Please refresh and try again.');
      return;
    }

    const action = serviceStatus.isRunning ? 'stop' : 'start';
    const actionWord = serviceStatus.isRunning ? 'STOP' : 'START';
    
    const confirmText = prompt(
      `WARNING: This will ${action} the entire service!\n\n` +
      `Type "${actionWord} SERVICE" to confirm:`
    );

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
      const response = await fetch('/api/admin/service-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Use cookies instead of token
        body: JSON.stringify({ action: 'toggle_service' })
      });

      const result = await response.json();

      if (result.success) {
        setServiceStatus(result.data);
        alert(`Service ${result.data.isRunning ? 'started' : 'stopped'} successfully!`);
        
        // Reload system health and analytics
        loadSystemHealth();
        loadAnalyticsData();
      } else {
        alert(`Failed to ${action} service: ${result.message}`);
      }
    } catch (error) {
      console.error(`Error ${action}ping service:`, error);
      alert(`Error occurred while trying to ${action} service.`);
    }
  };

  const handleToggleModule = async (moduleName: string) => {
    if (!serviceStatus) return;

    const isEnabled = serviceStatus.modules[moduleName];
    const action = isEnabled ? 'disable' : 'enable';

    const confirmed = confirm(
      `Are you sure you want to ${action} the ${moduleName} module?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch('/api/admin/service-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Use cookies instead of token
        body: JSON.stringify({ 
          action: 'toggle_module', 
          module: moduleName 
        })
      });

      const result = await response.json();

      if (result.success) {
        setServiceStatus(result.data);
        alert(`Module ${moduleName} ${result.data.modules[moduleName] ? 'enabled' : 'disabled'} successfully!`);
      } else {
        alert(`Failed to ${action} module: ${result.message}`);
      }
    } catch (error) {
      console.error(`Error ${action}ing module:`, error);
      alert(`Error occurred while trying to ${action} module.`);
    }
  };

  // Logout handled by main Header component

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-white">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard | VSR Construction</title>
        <meta name="description" content="Admin dashboard for VSR Construction" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-100">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header with Profile Button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              {admin && (
                <p className="text-gray-600">Welcome back, {admin.firstName} {admin.lastName}</p>
              )}
            </div>
            <Link
              href="/portal/admin/profile"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaUserCircle className="h-5 w-5 mr-2" />
              Profile
            </Link>
          </div>

          {/* Notification Summary Bar */}
          {(notifications.quoteRequests + notifications.clientUpdates + notifications.updateRequests + notifications.jobApplications + notifications.employeeApprovals) > 0 && (
            <div className="bg-red-600 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-white">
                  <FaBell className="h-5 w-5 mr-3" />
                  <span className="font-medium">
                    You have {notifications.quoteRequests + notifications.clientUpdates + notifications.updateRequests + notifications.jobApplications + notifications.employeeApprovals} pending notifications
                  </span>
                </div>
                <div className="flex space-x-2">
                  {notifications.quoteRequests > 0 && (
                    <span className="bg-white bg-opacity-20 text-white px-2 py-1 rounded text-xs">
                      {notifications.quoteRequests} quotes
                    </span>
                  )}
                  {notifications.clientUpdates > 0 && (
                    <span className="bg-white bg-opacity-20 text-white px-2 py-1 rounded text-xs">
                      {notifications.clientUpdates} client updates
                    </span>
                  )}
                  {notifications.updateRequests > 0 && (
                    <span className="bg-white bg-opacity-20 text-white px-2 py-1 rounded text-xs">
                      {notifications.updateRequests} update requests
                    </span>
                  )}
                  {notifications.jobApplications > 0 && (
                    <span className="bg-white bg-opacity-20 text-white px-2 py-1 rounded text-xs">
                      {notifications.jobApplications} applications
                    </span>
                  )}
                  {notifications.employeeApprovals > 0 && (
                    <span className="bg-white bg-opacity-20 text-white px-2 py-1 rounded text-xs">
                      {notifications.employeeApprovals} approvals
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* System Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaUsers className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaUserTie className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-400">Employees</p>
                  <p className="text-2xl font-bold text-white">{stats?.totalEmployees || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 relative">
                  <FaEnvelope className="h-8 w-8 text-yellow-500" />
                  <NotificationBubble count={notifications.quoteRequests} color="red" size="md" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-400">Quote Requests</p>
                  <p className="text-2xl font-bold text-white">{notifications.quoteRequests}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 relative">
                  <FaBell className="h-8 w-8 text-blue-500" />
                  <NotificationBubble count={notifications.clientUpdates} color="blue" size="md" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-400">Client Updates</p>
                  <p className="text-2xl font-bold text-white">{notifications.clientUpdates}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Admin Tools */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Administration Tools</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* v2 Features */}
                  {isFeatureEnabled('admin-business-cards') && (
                    <Link
                      href="/admin/business-cards"
                      className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <FaIdCard className="h-8 w-8 text-blue-400 mb-2" />
                      <span className="text-sm text-white">Business Cards</span>
                    </Link>
                  )}
                  
                  {isFeatureEnabled('admin-analytics') && (
                    <Link
                      href="/portal/admin/analytics"
                      className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <FaChartBar className="h-8 w-8 text-green-400 mb-2" />
                      <span className="text-sm text-white">Analytics</span>
                    </Link>
                  )}
                  
                  {/* v3 Features */}
                  {isFeatureEnabled('employee-snow-removal') && (
                    <Link
                      href="/portal/employee/snow-removal"
                      className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <FaSnowflake className="h-8 w-8 text-cyan-400 mb-2" />
                      <span className="text-sm text-white">Snow Removal</span>
                    </Link>
                  )}
                  
                  {isFeatureEnabled('admin-users') && (
                    <Link
                      href="/portal/admin/users"
                      className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors relative"
                    >
                      <div className="relative">
                        <FaUsers className="h-8 w-8 text-purple-400 mb-2" />
                        <NotificationBubble count={notifications.clientUpdates} color="blue" size="sm" />
                      </div>
                      <span className="text-sm text-white">User Management</span>
                    </Link>
                  )}
                  
                  {isFeatureEnabled('admin-employees') && (
                    <Link
                      href="/portal/admin/employees"
                      className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors relative"
                    >
                      <div className="relative">
                        <FaUserTie className="h-8 w-8 text-yellow-400 mb-2" />
                        <NotificationBubble count={notifications.employeeApprovals} color="red" size="sm" />
                      </div>
                      <span className="text-sm text-white">Employee Management</span>
                    </Link>
                  )}
                  
                  {isFeatureEnabled('admin-projects') && (
                    <Link
                      href="/portal/admin/projects"
                      className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <FaProjectDiagram className="h-8 w-8 text-red-400 mb-2" />
                      <span className="text-sm text-white">Project Tracker</span>
                    </Link>
                  )}
                  
                  {/* v4 Features */}
                  {isFeatureEnabled('admin-calendar') && (
                    <Link
                      href="/portal/admin/calendar"
                      className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <FaCalendarAlt className="h-8 w-8 text-indigo-400 mb-2" />
                      <span className="text-sm text-white">Calendar</span>
                    </Link>
                  )}
                  
                  {isFeatureEnabled('admin-messages') && (
                    <Link
                      href="/portal/admin/messages"
                      className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <FaComments className="h-8 w-8 text-pink-400 mb-2" />
                      <span className="text-sm text-white">Message Board</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Website Control */}
              {(isFeatureEnabled('admin-database') || isFeatureEnabled('admin-settings') || isFeatureEnabled('admin-reports') || isFeatureEnabled('admin-system') || isFeatureEnabled('admin-employee-tools') || isFeatureEnabled('admin-website-content')) && (
                <div className="bg-gray-800 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">Website Management</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* v4 Features */}
                    {isFeatureEnabled('admin-database') && (
                      <Link
                        href="/portal/admin/database"
                        className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <FaDatabase className="h-8 w-8 text-green-400 mb-2" />
                        <span className="text-sm text-white">Database</span>
                      </Link>
                    )}
                    
                    {isFeatureEnabled('admin-settings') && (
                      <Link
                        href="/portal/admin/settings"
                        className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <FaCog className="h-8 w-8 text-gray-400 mb-2" />
                        <span className="text-sm text-white">Settings</span>
                      </Link>
                    )}
                    
                    {isFeatureEnabled('admin-reports') && (
                      <Link
                        href="/portal/admin/reports"
                        className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <FaFileAlt className="h-8 w-8 text-purple-400 mb-2" />
                        <span className="text-sm text-white">Reports</span>
                      </Link>
                    )}
                    
                    {isFeatureEnabled('admin-system') && (
                      <Link
                        href="/portal/admin/system"
                        className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <FaServer className="h-8 w-8 text-red-400 mb-2" />
                        <span className="text-sm text-white">System Health</span>
                      </Link>
                    )}
                    
                    {isFeatureEnabled('admin-employee-tools') && (
                      <Link
                        href="/portal/admin/employee-tools"
                        className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <FaUserTie className="h-8 w-8 text-cyan-400 mb-2" />
                        <span className="text-sm text-white">Employee Tools</span>
                      </Link>
                    )}
                    
                    {isFeatureEnabled('admin-website-content') && (
                      <Link
                        href="/portal/admin/website-content"
                        className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        <FaFileAlt className="h-8 w-8 text-orange-400 mb-2" />
                        <span className="text-sm text-white">Website Content</span>
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <div>
              {/* Pending Actions */}
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Pending Actions</h2>
                <div className="space-y-3">
                  {isFeatureEnabled('employee-approvals') && (
                    <button 
                      className="w-full flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                      onClick={() => router.push('/portal/admin/employees')}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                        <div className="text-left">
                          <p className="text-white text-sm">Employee approvals</p>
                          <p className="text-gray-400 text-xs">{notifications.employeeApprovals} pending</p>
                        </div>
                      </div>
                      <NotificationBubble count={notifications.employeeApprovals} color="red" size="sm" />
                    </button>
                  )}
                  
                  <button 
                    className="w-full flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    onClick={() => router.push('/portal/admin/quote-requests')}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                      <div className="text-left">
                        <p className="text-white text-sm">Quote requests</p>
                        <p className="text-gray-400 text-xs">{notifications.quoteRequests} new</p>
                      </div>
                    </div>
                    <NotificationBubble count={notifications.quoteRequests} color="yellow" size="sm" />
                  </button>
                  
                  <button 
                    className="w-full flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    onClick={() => router.push('/portal/admin/update-requests')}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                      <div className="text-left">
                        <p className="text-white text-sm">Update requests</p>
                        <p className="text-gray-400 text-xs">{notifications.updateRequests} pending</p>
                      </div>
                    </div>
                    <NotificationBubble count={notifications.updateRequests} color="orange" size="sm" />
                  </button>
                  
                  <button 
                    className="w-full flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    onClick={() => router.push('/portal/admin/job-applications')}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                      <div className="text-left">
                        <p className="text-white text-sm">Job applications</p>
                        <p className="text-gray-400 text-xs">{notifications.jobApplications} pending</p>
                      </div>
                    </div>
                    <NotificationBubble count={notifications.jobApplications} color="blue" size="sm" />
                  </button>
                  
                  {isFeatureEnabled('client-management') && (
                    <button 
                      className="w-full flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                      onClick={() => router.push('/portal/admin/update-requests')}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                        <div className="text-left">
                          <p className="text-white text-sm">Client updates</p>
                          <p className="text-gray-400 text-xs">{notifications.updateRequests} linked to update requests</p>
                        </div>
                      </div>
                      <NotificationBubble count={notifications.updateRequests} color="blue" size="sm" />
                    </button>
                  )}
                  
                  {isFeatureEnabled('system-management') && (
                    <button 
                      className="w-full flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                      onClick={() => router.push('/portal/admin/settings')}
                    >
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                        <div className="text-left">
                          <p className="text-white text-sm">System updates</p>
                          <p className="text-gray-400 text-xs">{notifications.systemUpdates} available</p>
                        </div>
                      </div>
                      <NotificationBubble count={notifications.systemUpdates} color="green" size="sm" />
                    </button>
                  )}
                </div>
              </div>

              {/* System Status */}
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">System Status</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        loadSystemHealth();
                        loadAnalyticsData();
                        loadServiceStatus();
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                    >
                      <FaServer className="inline mr-1" />
                      Refresh Now
                    </button>
                    {admin?.email === 'citylife32@outlook.com' && serviceStatus && (
                      <button
                        onClick={handleToggleService}
                        className={`${
                          serviceStatus.isRunning 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-green-600 hover:bg-green-700'
                        } text-white px-3 py-1 rounded text-sm transition-colors`}
                      >
                        <FaExclamationTriangle className="inline mr-1" />
                        {serviceStatus.isRunning ? 'Stop Service' : 'Start Service'}
                      </button>
                    )}
                  </div>
                </div>
                {systemHealth ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Database</span>
                      <span className={`text-xs text-white px-2 py-1 rounded ${getStatusColor(systemHealth.services?.database?.status || 'unknown')}`}>
                        {getStatusText(systemHealth.services?.database?.status || 'unknown')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Email Service</span>
                      <span className={`text-xs text-white px-2 py-1 rounded ${getStatusColor(systemHealth.services?.email?.status || 'unknown')}`}>
                        {getStatusText(systemHealth.services?.email?.status || 'unknown')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Authentication</span>
                      <span className={`text-xs text-white px-2 py-1 rounded ${getStatusColor(systemHealth.services?.authentication?.status || 'unknown')}`}>
                        {getStatusText(systemHealth.services?.authentication?.status || 'unknown')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Rate Limiting</span>
                      <span className={`text-xs text-white px-2 py-1 rounded ${getStatusColor(systemHealth.services?.rateLimit?.status || 'unknown')}`}>
                        {getStatusText(systemHealth.services?.rateLimit?.status || 'unknown')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Uptime</span>
                      <span className="text-xs text-white">{formatUptime(systemHealth.uptime || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Memory Usage</span>
                      <span className="text-xs text-white">
                        {systemHealth.metrics?.memoryUsage ? 
                          `${Math.round(systemHealth.metrics.memoryUsage.used / 1024 / 1024)}MB` : 
                          'Unknown'
                        }
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Loading...</span>
                      <span className="text-xs bg-gray-600 text-white px-2 py-1 rounded">...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Emergency Maintenance - Super Admin Only */}
              {admin?.email === 'citylife32@outlook.com' && (
                <div className="mt-6">
                  <EmergencyMaintenanceButton userEmail={admin.email} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}