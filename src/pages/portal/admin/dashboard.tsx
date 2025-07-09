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
  FaSnowflake
} from 'react-icons/fa';
import { isFeatureEnabled, getCurrentVersion } from '@/utils/version';

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
                <div className="flex-shrink-0">
                  <FaProjectDiagram className="h-8 w-8 text-purple-500" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-400">Active Projects</p>
                  <p className="text-2xl font-bold text-white">{stats?.activeProjects || 0}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaExclamationTriangle className="h-8 w-8 text-yellow-500" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-400">Pending Approvals</p>
                  <p className="text-2xl font-bold text-white">{stats?.pendingApprovals || 0}</p>
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
                      className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <FaUsers className="h-8 w-8 text-purple-400 mb-2" />
                      <span className="text-sm text-white">User Management</span>
                    </Link>
                  )}
                  
                  {isFeatureEnabled('admin-employees') && (
                    <Link
                      href="/portal/admin/employees"
                      className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <FaUserTie className="h-8 w-8 text-yellow-400 mb-2" />
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
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">Employee approvals</p>
                      <p className="text-gray-400 text-xs">3 pending</p>
                    </div>
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">Quote requests</p>
                      <p className="text-gray-400 text-xs">5 new</p>
                    </div>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">System updates</p>
                      <p className="text-gray-400 text-xs">2 available</p>
                    </div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* System Status */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">System Status</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Database</span>
                    <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Online</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Email Service</span>
                    <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Online</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Backup</span>
                    <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded">Running</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Uptime</span>
                    <span className="text-xs text-white">99.8%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}