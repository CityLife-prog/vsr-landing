import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import UserManagementTable from '../../../components/admin/UserManagementTable';
import { AdminUser } from '../../../types/admin';

export default function Users() {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);

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
        await loadUsers(token);
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

  const loadUsers = async (token: string) => {
    try {
      // v3: User management simplified - notifications removed as requested
      // Admin users are now managed through SimpleAuthService for better security
      setUsers([]);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Read-only handlers - no actual functionality since this is read-only
  const handleUserUpdate = (userId: string, updates: Partial<AdminUser>) => {
    // This would normally update the user, but we're read-only
    console.log('Read-only mode: Cannot update user', userId);
  };

  const handleUserDelete = (userId: string) => {
    // This would normally delete the user, but we're read-only
    console.log('Read-only mode: Cannot delete user', userId);
  };

  const handleUserCreate = () => {
    // This would normally create a user, but we're read-only
    console.log('Read-only mode: Cannot create user');
  };

  const handleBulkAction = (action: string, userIds: string[], data?: unknown) => {
    // This would normally perform bulk actions, but we're read-only
    console.log('Read-only mode: Cannot perform bulk action', action);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user management...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>User Management - Admin Portal | VSR Construction</title>
        <meta name="description" content="User management and administration" />
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
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            </div>
          </div>

          {/* User Management v3 - Notifications Removed */}
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management Simplified</h2>
            <p className="text-gray-600 mb-4">
              User notifications have been removed from this interface as requested. 
            </p>
            <p className="text-gray-600">
              Admin users are now managed through the SimpleAuthService for improved security and streamlined access control.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}