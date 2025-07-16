/**
 * Advanced User Management Table Component
 * Enhanced table with search, filtering, bulk actions, and pagination
 */

import React, { useState, useEffect } from 'react';
import { 
  FaSearch, 
  FaSort, 
  FaUsers,
  FaUserTie,
  FaShieldAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaEyeSlash,
  FaUserCheck,
  FaUserTimes,
  FaKey
} from 'react-icons/fa';
import { AdminUser } from '../../types/admin';

interface UserManagementTableProps {
  users: AdminUser[];
  onUserUpdate: (userId: string, updates: Partial<AdminUser>) => void;
  onUserDelete: (userId: string) => void;
  onUserCreate: () => void;
  onBulkAction: (action: string, userIds: string[], data?: unknown) => void;
  loading?: boolean;
}

interface SortConfig {
  field: keyof AdminUser;
  direction: 'asc' | 'desc';
}

const UserManagementTable: React.FC<UserManagementTableProps> = ({
  users,
  onUserUpdate,
  onUserDelete,
  onUserCreate,
  onBulkAction,
  loading = false
}) => {
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>(users);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'createdAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterLevel, setFilterLevel] = useState<'all' | 'super_admin' | 'admin' | 'manager'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [passwordVisibility, setPasswordVisibility] = useState<{[key: string]: boolean}>({});
  const [newUserData, setNewUserData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    adminLevel: 'manager' as 'super_admin' | 'admin' | 'manager',
    isActive: true
  });

  useEffect(() => {
    let filtered = users;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply level filter
    if (filterLevel !== 'all') {
      filtered = filtered.filter(user => user.adminLevel === filterLevel);
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(user => 
        filterStatus === 'active' ? user.isActive : !user.isActive
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [users, searchTerm, filterLevel, filterStatus, sortConfig]);

  const handleSort = (field: keyof AdminUser) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(userId)) {
        newSelected.delete(userId);
      } else {
        newSelected.add(userId);
      }
      return newSelected;
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.id)));
    }
  };

  const handleBulkAction = (action: string, data?: unknown) => {
    if (selectedUsers.size === 0) return;
    
    onBulkAction(action, Array.from(selectedUsers), data);
    setSelectedUsers(new Set());
  };

  const handleCreateUser = () => {
    setShowCreateModal(true);
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleViewUser = (user: AdminUser) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const togglePasswordVisibility = (userId: string) => {
    setPasswordVisibility(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleSubmitNewUser = () => {
    onUserCreate();
    setShowCreateModal(false);
    setNewUserData({
      firstName: '',
      lastName: '',
      email: '',
      adminLevel: 'manager',
      isActive: true
    });
  };

  const handleSubmitEditUser = () => {
    if (selectedUser) {
      onUserUpdate(selectedUser.id, selectedUser);
      setShowEditModal(false);
      setSelectedUser(null);
    }
  };

  const getAdminLevelIcon = (level: string) => {
    switch (level) {
      case 'super_admin': return FaShieldAlt;
      case 'admin': return FaUserTie;
      case 'manager': return FaUsers;
      default: return FaUsers;
    }
  };

  const getAdminLevelColor = (level: string) => {
    switch (level) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'manager': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTimeAgo = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header with Search and Filters */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-medium text-gray-900">User Management</h2>
            <span className="text-sm text-gray-500">
              {filteredUsers.length} of {users.length} users
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Read-Only View</span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Levels</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>


      {/* Table */}
      {loading ? (
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading users...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('firstName')}
                >
                  <div className="flex items-center space-x-1">
                    <span>User</span>
                    <FaSort className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('adminLevel')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Level</span>
                    <FaSort className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('isActive')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Status</span>
                    <FaSort className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('lastLoginAt')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Last Login</span>
                    <FaSort className="h-3 w-3" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Created</span>
                    <FaSort className="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Default Password
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentUsers.map((user) => {
                const IconComponent = getAdminLevelIcon(user.adminLevel);
                
                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <IconComponent className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAdminLevelColor(user.adminLevel)}`}>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLoginAt ? formatTimeAgo(user.lastLoginAt) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center bg-gray-50 rounded-lg px-3 py-2">
                          <FaKey className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm font-mono text-gray-700">
                            {passwordVisibility[user.id] ? (user.password || 'demo123') : '••••••••'}
                          </span>
                          <button
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="ml-2 text-gray-500 hover:text-gray-700"
                            title={passwordVisibility[user.id] ? 'Hide password' : 'Show password'}
                          >
                            {passwordVisibility[user.id] ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 border rounded text-sm ${
                    page === currentPage
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredUsers.length === 0 && !loading && (
        <div className="text-center py-12">
          <FaUsers className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterLevel !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding a new user.'
            }
          </p>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={newUserData.firstName}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={newUserData.lastName}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Level</label>
                <select
                  value={newUserData.adminLevel}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, adminLevel: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitNewUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit User</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={selectedUser.firstName}
                  onChange={(e) => setSelectedUser(prev => prev ? ({ ...prev, firstName: e.target.value }) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={selectedUser.lastName}
                  onChange={(e) => setSelectedUser(prev => prev ? ({ ...prev, lastName: e.target.value }) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser(prev => prev ? ({ ...prev, email: e.target.value }) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Level</label>
                <select
                  value={selectedUser.adminLevel}
                  onChange={(e) => setSelectedUser(prev => prev ? ({ ...prev, adminLevel: e.target.value as any }) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedUser.isActive}
                    onChange={(e) => setSelectedUser(prev => prev ? ({ ...prev, isActive: e.target.checked }) : null)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEditUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">User Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{selectedUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Admin Level</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAdminLevelColor(selectedUser.adminLevel)}`}>
                  {selectedUser.adminLevel.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  selectedUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {selectedUser.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Login</label>
                <p className="text-gray-900">{selectedUser.lastLoginAt ? formatTimeAgo(selectedUser.lastLoginAt) : 'Never'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="text-gray-900">{formatDate(selectedUser.createdAt)}</p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementTable;