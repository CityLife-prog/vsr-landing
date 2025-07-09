/**
 * Admin Console Component
 * Main admin dashboard and management interface
 */

import React, { useState, useEffect } from 'react';
import { AdminUser, AdminDashboardStats, EmployeeAccount } from '../../types/admin';
import { AdminUserService } from '../../services/AdminUserService';

interface AdminConsoleProps {
  currentUser: AdminUser;
}

const AdminConsole: React.FC<AdminConsoleProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardStats, setDashboardStats] = useState<AdminDashboardStats | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [pendingEmployees, setPendingEmployees] = useState<EmployeeAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const adminService = new AdminUserService();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [stats, users, pending] = await Promise.all([
        adminService.getAdminDashboardStats(),
        adminService.getAdminUsers(),
        adminService.getPendingEmployeeAccounts()
      ]);

      setDashboardStats(stats);
      setAdminUsers(users);
      setPendingEmployees(pending);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeApproval = async (employeeId: string, notes?: string) => {
    try {
      await adminService.approveEmployeeAccount(employeeId, currentUser.id, notes);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error approving employee:', error);
    }
  };

  const handleEmployeeRejection = async (employeeId: string, reason: string) => {
    try {
      await adminService.rejectEmployeeAccount(employeeId, currentUser.id, reason);
      await loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error rejecting employee:', error);
    }
  };

  const DashboardTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Total Users</h3>
          <p className="text-3xl font-bold text-blue-600">{dashboardStats?.totalUsers || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Total Employees</h3>
          <p className="text-3xl font-bold text-green-600">{dashboardStats?.totalEmployees || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
          <p className="text-3xl font-bold text-yellow-600">{dashboardStats?.pendingApprovals || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Active Admins</h3>
          <p className="text-3xl font-bold text-purple-600">{dashboardStats?.activeAdmins || 0}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              dashboardStats?.systemHealth.status === 'healthy' ? 'bg-green-500' :
              dashboardStats?.systemHealth.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm font-medium">
              Status: {dashboardStats?.systemHealth.status || 'Unknown'}
            </span>
          </div>
          <span className="text-sm text-gray-600">
            Last Check: {dashboardStats?.systemHealth.lastHealthCheck?.toLocaleString() || 'Never'}
          </span>
        </div>
      </div>
    </div>
  );

  const AdminUsersTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Admin Users</h3>
        {currentUser.canManageUsers && (
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Add Admin User
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Admin Level
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {adminUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.adminLevel === 'super_admin' ? 'bg-red-100 text-red-800' :
                    user.adminLevel === 'admin' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user.adminLevel.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {currentUser.canManageUsers && user.id !== currentUser.id && (
                    <div className="space-x-2">
                      <button className="text-blue-600 hover:text-blue-900">Edit</button>
                      {!user.metadata?.isDefaultAdmin && (
                        <button className="text-red-600 hover:text-red-900">Delete</button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const EmployeeApprovalsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Pending Employee Approvals</h3>

      {pendingEmployees.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow text-center">
          <p className="text-gray-500">No pending employee approvals</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pendingEmployees.map((employee) => (
                <tr key={employee.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {employee.firstName} {employee.lastName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.employeeId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.department}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="space-x-2">
                      <button
                        onClick={() => handleEmployeeApproval(employee.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleEmployeeRejection(employee.id, 'Admin rejected')}
                        className="text-red-600 hover:text-red-900"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const TrainingTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Training Management</h3>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600 mb-4">
          Training module management will be moved here from the main application.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Manage Training Modules</h4>
            <p className="text-sm text-gray-600 mb-3">Create, edit, and organize training content</p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Manage Modules
            </button>
          </div>
          <div className="border border-gray-200 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">View Progress</h4>
            <p className="text-sm text-gray-600 mb-3">Monitor employee training progress</p>
            <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              View Progress
            </button>
          </div>
          <div className="border border-gray-200 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Assign Training</h4>
            <p className="text-sm text-gray-600 mb-3">Assign specific training to employees</p>
            <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
              Assign Training
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Console</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {currentUser.firstName}! Manage your VSR system from here.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'dashboard', name: 'Dashboard', icon: '📊' },
            { id: 'admin-users', name: 'Admin Users', icon: '👥', show: currentUser.canManageUsers },
            { id: 'employee-approvals', name: 'Employee Approvals', icon: '✅', show: currentUser.canManageEmployees },
            { id: 'training', name: 'Training', icon: '📚', show: currentUser.canAccessTraining }
          ].filter(tab => tab.show !== false).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'admin-users' && currentUser.canManageUsers && <AdminUsersTab />}
        {activeTab === 'employee-approvals' && currentUser.canManageEmployees && <EmployeeApprovalsTab />}
        {activeTab === 'training' && currentUser.canAccessTraining && <TrainingTab />}
      </div>
    </div>
  );
};

export default AdminConsole;