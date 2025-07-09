/**
 * Admin Users Management Page
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { FaArrowLeft, FaUsers, FaPlus, FaEdit, FaTrash, FaShieldAlt, FaUserTie } from 'react-icons/fa';
import UserManagementTable from '../../components/admin/UserManagementTable';
import { AdminUser } from '../../types/admin';

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.error('No access token found');
        return;
      }

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const userData = await response.json();
      setUsers(userData);
    } catch (error) {
      console.error('Failed to load users:', error);
      // Fallback to mock data for demo
      const mockUsers: AdminUser[] = [
        {
          id: '1',
          email: 'citylife32@outlook.com',
          firstName: 'Development',
          lastName: 'Admin',
          adminLevel: 'super_admin',
          isActive: true,
          lastLoginAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          isEmailVerified: true,
          roles: [],
          permissions: [],
          managementPermissions: [],
          canManageUsers: true,
          canManageEmployees: true,
          canAccessTraining: true,
          canViewReports: true,
          canManageSystem: true
        },
        {
          id: '2',
          email: 'marcus@vsrsnow.com',
          firstName: 'Marcus',
          lastName: 'VSR',
          adminLevel: 'admin',
          isActive: true,
          lastLoginAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          isEmailVerified: true,
          roles: [],
          permissions: [],
          managementPermissions: [],
          canManageUsers: true,
          canManageEmployees: true,
          canAccessTraining: true,
          canViewReports: true,
          canManageSystem: false
        },
        {
          id: '3',
          email: 'zack@vsrsnow.com',
          firstName: 'Zack',
          lastName: 'VSR',
          adminLevel: 'admin',
          isActive: true,
          lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
          isEmailVerified: true,
          roles: [],
          permissions: [],
          managementPermissions: [],
          canManageUsers: true,
          canManageEmployees: true,
          canAccessTraining: true,
          canViewReports: true,
          canManageSystem: false
        }
      ];
      setUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  const handleUserUpdate = async (userId: string, updates: Partial<AdminUser>) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ updates })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(prev => prev.map(user => user.id === userId ? updatedUser : user));
        alert('User updated successfully');
      } else {
        throw new Error('Failed to update user');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    }
  };

  const handleUserDelete = async (userId: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        alert('User deleted successfully');
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleUserCreate = () => {
    alert('User creation functionality would be implemented here');
  };

  const handleBulkAction = async (action: string, userIds: string[], data?: any) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('/api/admin/bulk-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, targets: userIds, data })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`${action} completed: ${result.successful}/${result.total} users processed`);
        loadUsers(); // Refresh the data
      } else {
        throw new Error(`Failed to execute ${action}`);
      }
    } catch (error) {
      console.error(`Error executing ${action}:`, error);
      alert(`Failed to execute ${action}`);
    }
  };

  return (
    <>
      <Head>
        <title>User Management - VSR Admin</title>
        <meta name="description" content="Manage admin users and permissions" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <Link 
                  href="/admin"
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                  <FaArrowLeft />
                  <span>Back to Dashboard</span>
                </Link>
                <h1 className="text-xl font-bold text-gray-900">User Management</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaShieldAlt className="h-8 w-8 text-red-600" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Super Admins</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {users.filter(u => u.adminLevel === 'super_admin').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaUserTie className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Admins</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {users.filter(u => u.adminLevel === 'admin').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaUsers className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-5">
                  <p className="text-sm font-medium text-gray-500">Active Users</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {users.filter(u => u.isActive).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced User Management Table */}
          <UserManagementTable
            users={users}
            onUserUpdate={handleUserUpdate}
            onUserDelete={handleUserDelete}
            onUserCreate={handleUserCreate}
            onBulkAction={handleBulkAction}
            loading={loading}
          />
        </div>
      </div>
    </>
  );
};

export default AdminUsersPage;