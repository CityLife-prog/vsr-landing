/**
 * Admin Dashboard Component
 * Main dashboard interface for admin users with comprehensive overview
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  FaUsers,
  FaUserTie,
  FaClipboardCheck,
  FaExclamationTriangle,
  FaChartLine,
  FaCog,
  FaShieldAlt,
  FaServer,
  FaSignOutAlt,
  FaBell,
  FaRedo,
  FaTools,
  FaChevronDown,
  FaDatabase,
  FaCode,
  FaFileAlt,
  FaTasks,
  FaChartBar,
  FaIdCard
} from 'react-icons/fa';

interface DashboardStats {
  totalUsers: number;
  totalEmployees: number;
  pendingApprovals: number;
  activeAdmins: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'user_created' | 'employee_approved' | 'employee_rejected' | 'admin_login' | 'system_update';
  message: string;
  timestamp: Date;
  user: string;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  action: () => void;
  color: string;
}

const AdminDashboard: React.FC = () => {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      // Mock data - in production this would come from API
      const mockStats: DashboardStats = {
        totalUsers: 6,
        totalEmployees: 15,
        pendingApprovals: 3,
        activeAdmins: 3,
        systemHealth: 'healthy',
        recentActivity: [
          {
            id: '1',
            type: 'employee_approved',
            message: 'Employee John Smith was approved by Admin',
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            user: 'citylife32@outlook.com'
          },
          {
            id: '2',
            type: 'admin_login',
            message: 'Admin Marcus logged in',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            user: 'marcus@vsrsnow.com'
          },
          {
            id: '3',
            type: 'user_created',
            message: 'New employee registration: Sarah Johnson',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            user: 'sarah.johnson@company.com'
          },
          {
            id: '4',
            type: 'employee_rejected',
            message: 'Employee application rejected: Invalid documentation',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
            user: 'zack@vsrsnow.com'
          },
          {
            id: '5',
            type: 'system_update',
            message: 'System backup completed successfully',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
            user: 'system'
          }
        ]
      };

      setStats(mockStats);

      // Get current user from token (simplified)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUser(payload.email || 'Admin User');
      } catch {
        setCurrentUser('Admin User');
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    router.push('/admin/login');
  };

  const handleToolNavigation = (url: string) => {
    setShowToolsDropdown(false);
    router.push(url);
  };

  const quickActions: QuickAction[] = [
    {
      title: 'Review Pending Employees',
      description: 'Approve or reject employee applications',
      icon: FaClipboardCheck,
      action: () => router.push('/admin/employees'),
      color: 'blue'
    },
    {
      title: 'Manage Users',
      description: 'View and manage user accounts',
      icon: FaUsers,
      action: () => router.push('/admin/users'),
      color: 'green'
    },
    {
      title: 'System Settings',
      description: 'Configure system preferences',
      icon: FaCog,
      action: () => router.push('/admin/settings'),
      color: 'purple'
    },
    {
      title: 'View Reports',
      description: 'Generate and download reports',
      icon: FaChartLine,
      action: () => router.push('/admin/reports'),
      color: 'orange'
    }
  ];

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'user_created': return FaUsers;
      case 'employee_approved': return FaClipboardCheck;
      case 'employee_rejected': return FaExclamationTriangle;
      case 'admin_login': return FaShieldAlt;
      case 'system_update': return FaServer;
      default: return FaBell;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'user_created': return 'text-blue-600';
      case 'employee_approved': return 'text-green-600';
      case 'employee_rejected': return 'text-red-600';
      case 'admin_login': return 'text-purple-600';
      case 'system_update': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-gray-900">
                VSR Admin Dashboard
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadDashboardData}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Refresh Data"
              >
                <FaRedo />
              </button>
              
              {/* Tools Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowToolsDropdown(!showToolsDropdown)}
                  className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  <FaTools />
                  <span>Tools</span>
                  <FaChevronDown className={`transition-transform ${showToolsDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showToolsDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-gray-50 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => handleToolNavigation('/admin/business-cards')}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <FaIdCard className="mr-3 h-4 w-4" />
                        Business Cards
                      </button>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => handleToolNavigation('/admin/database')}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <FaDatabase className="mr-3 h-4 w-4" />
                        Database Management
                      </button>
                      <button
                        onClick={() => handleToolNavigation('/admin/api-docs')}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <FaCode className="mr-3 h-4 w-4" />
                        API Documentation
                      </button>
                      <button
                        onClick={() => handleToolNavigation('/admin/logs')}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <FaFileAlt className="mr-3 h-4 w-4" />
                        System Logs
                      </button>
                      <button
                        onClick={() => handleToolNavigation('/admin/tasks')}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <FaTasks className="mr-3 h-4 w-4" />
                        Task Queue
                      </button>
                      <button
                        onClick={() => handleToolNavigation('/admin/analytics')}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <FaChartBar className="mr-3 h-4 w-4" />
                        Analytics Dashboard
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <FaUserTie className="text-gray-400" />
                <span className="text-sm text-gray-700">{currentUser}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-red-600"
              >
                <FaSignOutAlt />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to the Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor and manage your VSR system from this central hub.</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaUsers className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.totalUsers || 0}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaUserTie className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Employees</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.totalEmployees || 0}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaClipboardCheck className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Approvals</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.pendingApprovals || 0}</dd>
                </dl>
              </div>
              {(stats?.pendingApprovals || 0) > 0 && (
                <div className="ml-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Action Required
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaServer className={`h-8 w-8 ${
                  stats?.systemHealth === 'healthy' ? 'text-green-600' :
                  stats?.systemHealth === 'warning' ? 'text-yellow-600' : 'text-red-600'
                }`} />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">System Health</dt>
                  <dd className="text-lg font-medium text-gray-900 capitalize">
                    {stats?.systemHealth || 'Unknown'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const IconComponent = action.icon;
              const colorClasses = {
                blue: 'bg-blue-100 text-blue-600 border-blue-200',
                green: 'bg-green-100 text-green-600 border-green-200',
                purple: 'bg-purple-100 text-purple-600 border-purple-200',
                orange: 'bg-orange-100 text-orange-600 border-orange-200'
              };

              return (
                <button
                  key={index}
                  onClick={action.action}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 text-left"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`p-2 rounded-lg ${colorClasses[action.color as keyof typeof colorClasses]}`}>
                      <IconComponent size={20} />
                    </div>
                    <h3 className="font-medium text-gray-900">{action.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="flow-root">
                <ul className="-mb-8">
                  {stats?.recentActivity.map((activity, index) => {
                    const IconComponent = getActivityIcon(activity.type);
                    const colorClass = getActivityColor(activity.type);
                    
                    return (
                      <li key={activity.id}>
                        <div className="relative pb-8">
                          {index !== (stats?.recentActivity.length || 1) - 1 && (
                            <span
                              className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                              aria-hidden="true"
                            />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center ring-8 ring-white`}>
                                <IconComponent className={`h-4 w-4 ${colorClass}`} />
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500">{activity.message}</p>
                                <p className="text-xs text-gray-400">by {activity.user}</p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                <time>{formatTimeAgo(activity.timestamp)}</time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">System Status</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Authentication Service</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Operational
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Database</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Operational
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Email Service</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Limited
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">File Storage</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Operational
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Active Admins</span>
                  <span className="text-sm text-gray-900">{stats?.activeAdmins || 0}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-medium text-gray-500">Uptime</span>
                  <span className="text-sm text-gray-900">99.9%</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-medium text-gray-500">Last Backup</span>
                  <span className="text-sm text-gray-900">2 hours ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Management Tools</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/training"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <FaClipboardCheck className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-900">Training Module</h4>
                  <p className="text-sm text-gray-500">Manage training programs</p>
                </div>
              </Link>
              
              <Link
                href="/employee/dashboard"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <FaUsers className="h-6 w-6 text-green-600 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-900">Employee Portal</h4>
                  <p className="text-sm text-gray-500">Access employee tools</p>
                </div>
              </Link>
              
              <Link
                href="/admin/change-password"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <FaShieldAlt className="h-6 w-6 text-purple-600 mr-3" />
                <div>
                  <h4 className="font-medium text-gray-900">Change Password</h4>
                  <p className="text-sm text-gray-500">Update security settings</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;