import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { 
  FaTools, 
  FaCalendarAlt, 
  FaProjectDiagram, 
  FaComments, 
  FaUser,
  FaClock,
  FaTasks,
  FaChartLine,
  FaFileAlt,
  FaSnowflake
} from 'react-icons/fa';
import { isFeatureEnabled } from '@/utils/version';

export default function EmployeeDashboard() {
  const router = useRouter();
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkEmployeeAuth();
  }, []);

  const checkEmployeeAuth = async () => {
    const token = localStorage.getItem('employeeToken');
    if (!token) {
      router.push('/portal/employee/login');
      return;
    }

    try {
      const response = await fetch('/api/employee/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmployee(data.employee);
      } else {
        router.push('/portal/employee/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/portal/employee/login');
    } finally {
      setLoading(false);
    }
  };

  // Logout handled by main Header component

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Employee Dashboard | VSR Construction</title>
        <meta name="description" content="Employee dashboard for VSR Construction" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-100">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaClock className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-400">Hours This Week</p>
                  <p className="text-2xl font-bold text-white">38.5</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaTasks className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-400">Active Tasks</p>
                  <p className="text-2xl font-bold text-white">5</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaProjectDiagram className="h-8 w-8 text-purple-500" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-400">Projects</p>
                  <p className="text-2xl font-bold text-white">3</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaChartLine className="h-8 w-8 text-yellow-500" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-400">Performance</p>
                  <p className="text-2xl font-bold text-white">95%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Tools & Resources */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Tools & Resources</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* v3 Features */}
                  {isFeatureEnabled('employee-snow-removal') && (
                    <Link
                      href="/portal/employee/snow-removal"
                      className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <FaSnowflake className="h-8 w-8 text-blue-400 mb-2" />
                      <span className="text-sm text-white">Snow Removal</span>
                    </Link>
                  )}
                  
                  {isFeatureEnabled('employee-projects') && (
                    <Link
                      href="/portal/employee/projects"
                      className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <FaProjectDiagram className="h-8 w-8 text-purple-400 mb-2" />
                      <span className="text-sm text-white">Projects</span>
                    </Link>
                  )}
                  
                  {/* v4 Features */}
                  {isFeatureEnabled('employee-tools') && (
                    <Link
                      href="/portal/employee/tools"
                      className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <FaTools className="h-8 w-8 text-green-400 mb-2" />
                      <span className="text-sm text-white">Tools</span>
                    </Link>
                  )}
                  
                  {isFeatureEnabled('employee-calendar') && (
                    <Link
                      href="/portal/employee/calendar"
                      className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <FaCalendarAlt className="h-8 w-8 text-yellow-400 mb-2" />
                      <span className="text-sm text-white">Calendar</span>
                    </Link>
                  )}
                  
                  {isFeatureEnabled('employee-messages') && (
                    <Link
                      href="/portal/employee/messages"
                      className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <FaComments className="h-8 w-8 text-cyan-400 mb-2" />
                      <span className="text-sm text-white">Messages</span>
                    </Link>
                  )}
                  
                  {isFeatureEnabled('employee-reports') && (
                    <Link
                      href="/portal/employee/reports"
                      className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <FaFileAlt className="h-8 w-8 text-red-400 mb-2" />
                      <span className="text-sm text-white">Reports</span>
                    </Link>
                  )}
                  
                  {isFeatureEnabled('employee-profile') && (
                    <Link
                      href="/portal/employee/profile"
                      className="flex flex-col items-center p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <FaUser className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-white">Profile</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-white text-sm">Task completed: Snow removal - Main St</p>
                      <p className="text-gray-400 text-xs">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-white text-sm">New project assigned: Residential landscaping</p>
                      <p className="text-gray-400 text-xs">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div>
                      <p className="text-white text-sm">Message from supervisor</p>
                      <p className="text-gray-400 text-xs">2 days ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div>
              {/* Upcoming Schedule */}
              <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-white mb-4">Today's Schedule</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">Morning briefing</p>
                      <p className="text-gray-400 text-xs">8:00 AM</p>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">Project site visit</p>
                      <p className="text-gray-400 text-xs">10:00 AM</p>
                    </div>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">Equipment maintenance</p>
                      <p className="text-gray-400 text-xs">2:00 PM</p>
                    </div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
                    Clock In/Out
                  </button>
                  <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
                    Submit Report
                  </button>
                  <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors">
                    Request Time Off
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}