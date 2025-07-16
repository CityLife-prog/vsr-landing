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
  FaIdCard,
  FaTrash,
  FaEdit,
  FaUser,
  FaProjectDiagram,
  FaCheckCircle,
  FaSpinner
} from 'react-icons/fa';

import { AdminUserService } from '../../services/AdminUserService';
import { EmployeeAccountService } from '../../services/EmployeeAccountService';
import { DatabaseCleanup } from '../../scripts/database-cleanup';
import UserManagementTable from './UserManagementTable';

interface DashboardStats {
  totalUsers: number;
  totalEmployees: number;
  pendingApprovals: number;
  activeAdmins: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  recentActivity: ActivityItem[];
  projects: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    byServiceType: {
      [key: string]: {
        total: number;
        completed: number;
        active: number;
      };
    };
  };
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

interface ValidAccount {
  type: 'admin' | 'employee';
  id: string;
  email: string;
  name: string;
  status: string;
  lastActivity?: Date;
}

interface CleanupReport {
  validAccountsRetained: number;
  validProjectsRetained: number;
  entriesRemoved: number;
  cleanupTimestamp: Date;
  errors: string[];
}

const AdminDashboard: React.FC = () => {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string>('');
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [validAccounts, setValidAccounts] = useState<ValidAccount[]>([]);
  const [cleanupReport, setCleanupReport] = useState<CleanupReport | null>(null);
  const [cleanupInProgress, setCleanupInProgress] = useState(false);
  const [showValidAccounts, setShowValidAccounts] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'profile'>('dashboard');
  const [adminUsers, setAdminUsers] = useState<any[]>([]);

  const adminService = new AdminUserService();
  const employeeService = new EmployeeAccountService();
  const cleanup = new DatabaseCleanup();

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      // Fetch project statistics from API
      let projectStats = {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        byServiceType: {}
      };

      try {
        const projectResponse = await fetch('/api/admin/projects/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (projectResponse.ok) {
          const projectData = await projectResponse.json();
          projectStats = projectData.stats;
        }
      } catch (error) {
        console.error('Failed to load project stats:', error);
      }

      // Mock data - in production this would come from API
      const mockStats: DashboardStats = {
        totalUsers: 6,
        totalEmployees: 15,
        pendingApprovals: 3,
        activeAdmins: 3,
        systemHealth: 'healthy',
        projects: projectStats,
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

      // Load valid accounts
      await loadValidAccounts();

      // Load admin users for user management
      const users = await adminService.getAdminUsers();
      setAdminUsers(users);

      // Generate cleanup report
      const report = await cleanup.generateReport();
      setCleanupReport(report);

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

  const loadValidAccounts = async () => {
    try {
      const accounts: ValidAccount[] = [];

      // Get admin users
      const adminUsers = await adminService.getAdminUsers();
      accounts.push(...adminUsers.map(admin => ({
        type: 'admin' as const,
        id: admin.id,
        email: admin.email,
        name: `${admin.firstName} ${admin.lastName}`,
        status: admin.isActive ? 'Active' : 'Inactive',
        lastActivity: admin.lastLoginAt
      })));

      // Get active employees
      const employees = await employeeService.getAllEmployees();
      const activeEmployees = employees.filter(emp => 
        emp.status === 'active' && emp.verificationStatus === 'fully_verified'
      );

      accounts.push(...activeEmployees.map(emp => ({
        type: 'employee' as const,
        id: emp.id,
        email: emp.email,
        name: `${emp.firstName} ${emp.lastName}`,
        status: emp.status,
        lastActivity: undefined // EmployeeAccount doesn't have lastLoginAt
      })));

      setValidAccounts(accounts);
    } catch (error) {
      console.error('Error loading valid accounts:', error);
    }
  };

  const performCleanup = async () => {
    try {
      setCleanupInProgress(true);
      const report = await cleanup.cleanup();
      setCleanupReport(report);
      await loadDashboardData(); // Refresh data after cleanup
    } catch (error) {
      console.error('Cleanup failed:', error);
    } finally {
      setCleanupInProgress(false);
    }
  };

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
      title: 'Manage Projects',
      description: 'Track and update project status',
      icon: FaProjectDiagram,
      action: () => router.push('/portal/admin/projects'),
      color: 'indigo'
    },
    {
      title: 'Manage Users',
      description: 'View and manage user accounts',
      icon: FaUsers,
      action: () => router.push('/admin/users'),
      color: 'green'
    },
    {
      title: 'Database Cleanup',
      description: 'Clean database and view valid accounts',
      icon: FaTrash,
      action: performCleanup,
      color: 'red'
    },
    {
      title: 'View Valid Accounts',
      description: 'Display all valid accounts in system',
      icon: FaDatabase,
      action: () => setShowValidAccounts(!showValidAccounts),
      color: 'purple'
    }
  ];

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  };

  // User management functions
  const handleUserUpdate = async (userId: string, updates: any) => {
    try {
      await adminService.updateAdminUser(userId, updates, currentUser);
      const users = await adminService.getAdminUsers();
      setAdminUsers(users);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleUserDelete = async (userId: string) => {
    try {
      await adminService.deleteAdminUser(userId, currentUser);
      const users = await adminService.getAdminUsers();
      setAdminUsers(users);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleUserCreate = () => {
    // This would open a modal or navigate to create user page
    alert('Create user functionality - would open modal or new page');
  };

  const handleBulkAction = async (action: string, userIds: string[], data?: any) => {
    console.log('Bulk action:', action, userIds, data);
    // Implement bulk operations
  };

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
              {/* Notifications Bell */}
              {stats && stats.pendingApprovals > 0 && (
                <div className="relative">
                  <button
                    onClick={() => router.push('/admin/employees')}
                    className="p-2 text-gray-400 hover:text-gray-600 relative"
                    title={`${stats.pendingApprovals} pending approval${stats.pendingApprovals !== 1 ? 's' : ''}`}
                  >
                    <FaBell />
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {stats.pendingApprovals}
                    </span>
                  </button>
                </div>
              )}
              
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
                      <button
                        onClick={() => handleToolNavigation('/admin/profile')}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <FaUser className="mr-3 h-4 w-4" />
                        Profile Management
                      </button>
                      <button
                        onClick={() => handleToolNavigation('/portal/admin/projects')}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        <FaProjectDiagram className="mr-3 h-4 w-4" />
                        Project Management
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

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'dashboard'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                User Management
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profile
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          <>
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

        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaProjectDiagram className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Projects</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.projects?.totalProjects || 0}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaSpinner className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Projects</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.projects?.activeProjects || 0}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaCheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Complete Projects</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats?.projects?.completedProjects || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Service Type Breakdown */}
        {stats?.projects?.byServiceType && Object.keys(stats.projects.byServiceType).length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Projects by Service Type</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(stats.projects.byServiceType).map(([serviceType, data]) => (
                  <div key={serviceType} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2 capitalize">
                      {serviceType.replace(/-/g, ' ')}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total:</span>
                        <span className="text-gray-900 font-medium">{data.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Active:</span>
                        <span className="text-orange-600 font-medium">{data.active}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Completed:</span>
                        <span className="text-green-600 font-medium">{data.completed}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${data.total > 0 ? (data.completed / data.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

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
                orange: 'bg-orange-100 text-orange-600 border-orange-200',
                indigo: 'bg-indigo-100 text-indigo-600 border-indigo-200',
                red: 'bg-red-100 text-red-600 border-red-200'
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

        {/* Cleanup Report */}
        {cleanupReport && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Latest Cleanup Report</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Valid Accounts Retained</p>
                  <p className="text-2xl font-bold text-green-800">{cleanupReport.validAccountsRetained}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Valid Projects Retained</p>
                  <p className="text-2xl font-bold text-blue-800">{cleanupReport.validProjectsRetained}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Entries Removed</p>
                  <p className="text-2xl font-bold text-red-800">{cleanupReport.entriesRemoved}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  Last cleanup: {formatDate(cleanupReport.cleanupTimestamp)}
                </p>
                {cleanupReport.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-600">Errors:</p>
                    <ul className="list-disc list-inside text-sm text-red-600">
                      {cleanupReport.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Valid Accounts Table */}
        {showValidAccounts && (
          <div className="mt-8 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Valid Accounts ({validAccounts.length})</h3>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Activity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {validAccounts.map((account) => (
                      <tr key={account.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            account.type === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {account.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {account.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {account.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            account.status === 'Active' || account.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {account.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(account.lastActivity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

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
          </>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <UserManagementTable
            users={adminUsers}
            onUserUpdate={handleUserUpdate}
            onUserDelete={handleUserDelete}
            onUserCreate={handleUserCreate}
            onBulkAction={handleBulkAction}
            loading={loading}
          />
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Admin Profile</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profile Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="mt-1 text-sm text-gray-900">{currentUser}</div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Admin Level</label>
                  <div className="mt-1">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      Super Admin
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Login</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                  </div>
                </div>
              </div>

              {/* Profile Actions */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Profile Actions</h3>
                
                <div className="space-y-3">
                  <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <FaEdit className="mr-2" />
                    Edit Profile
                  </button>
                  
                  <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <FaShieldAlt className="mr-2" />
                    Change Password
                  </button>
                  
                  <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <FaCog className="mr-2" />
                    Security Settings
                  </button>
                </div>
              </div>
            </div>

            {/* Account Statistics */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Account Statistics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-800">{stats?.totalUsers || 0}</div>
                  <div className="text-sm text-blue-600">Total Users Managed</div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-800">{stats?.activeAdmins || 0}</div>
                  <div className="text-sm text-green-600">Active Admins</div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-800">100%</div>
                  <div className="text-sm text-purple-600">System Uptime</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;