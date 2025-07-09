/**
 * Admin Employee Management Page
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { 
  FaArrowLeft, 
  FaUsers, 
  FaCheck, 
  FaTimes, 
  FaEye, 
  FaClipboardCheck,
  FaUserClock,
  FaUserCheck 
} from 'react-icons/fa';
import EmployeeApprovalSystem from '../../components/admin/EmployeeApprovalSystem';
import { EmployeeAccount } from '../../types/admin';

const AdminEmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.error('No access token found');
        return;
      }

      const response = await fetch('/api/admin/employees?action=pending', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load employees');
      }

      const employeeData = await response.json();
      setEmployees(employeeData);
    } catch (error) {
      console.error('Failed to load employees:', error);
      // Fallback to mock data for demo
      const mockEmployees: EmployeeAccount[] = [
        {
          id: '1',
          email: 'john.smith@company.com',
          firstName: 'John',
          lastName: 'Smith',
          employeeId: 'EMP001',
          department: 'Operations',
          position: 'Field Technician',
          status: 'pending',
          verificationStatus: 'email_verified',
          hireDate: new Date('2024-01-15'),
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          permissions: [],
          roles: []
        },
        {
          id: '2',
          email: 'sarah.johnson@company.com',
          firstName: 'Sarah',
          lastName: 'Johnson',
          employeeId: 'EMP002',
          department: 'Operations',
          position: 'Equipment Operator',
          status: 'pending',
          verificationStatus: 'email_verified',
          hireDate: new Date('2024-01-20'),
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          permissions: [],
          roles: []
        },
        {
          id: '3',
          email: 'mike.wilson@company.com',
          firstName: 'Mike',
          lastName: 'Wilson',
          employeeId: 'EMP003',
          department: 'Maintenance',
          position: 'Site Supervisor',
          status: 'pending',
          verificationStatus: 'email_verified',
          hireDate: new Date('2023-12-01'),
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          permissions: [],
          roles: []
        }
      ];
      setEmployees(mockEmployees);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (employeeId: string, notes?: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`/api/admin/employees?employeeId=${employeeId}&action=approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes })
      });

      if (response.ok) {
        const approvedEmployee = await response.json();
        setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
        alert('Employee approved successfully!');
      } else {
        throw new Error('Failed to approve employee');
      }
    } catch (error) {
      console.error('Failed to approve employee:', error);
      alert('Failed to approve employee. Please try again.');
    }
  };

  const handleReject = async (employeeId: string, reason: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(`/api/admin/employees?employeeId=${employeeId}&action=reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
        alert('Employee application rejected.');
      } else {
        throw new Error('Failed to reject employee');
      }
    } catch (error) {
      console.error('Failed to reject employee:', error);
      alert('Failed to reject employee. Please try again.');
    }
  };

  const handleBulkApprove = async (employeeIds: string[], notes?: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('/api/admin/bulk-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          action: 'approve_employees', 
          targets: employeeIds, 
          data: { notes } 
        })
      });

      if (response.ok) {
        const result = await response.json();
        setEmployees(prev => prev.filter(emp => !employeeIds.includes(emp.id)));
        alert(`Bulk approval completed: ${result.successful}/${result.total} employees approved`);
      } else {
        throw new Error('Failed to bulk approve employees');
      }
    } catch (error) {
      console.error('Failed to bulk approve employees:', error);
      alert('Failed to bulk approve employees. Please try again.');
    }
  };

  const handleBulkReject = async (employeeIds: string[], reason: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('/api/admin/bulk-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          action: 'reject_employees', 
          targets: employeeIds, 
          data: { reason } 
        })
      });

      if (response.ok) {
        const result = await response.json();
        setEmployees(prev => prev.filter(emp => !employeeIds.includes(emp.id)));
        alert(`Bulk rejection completed: ${result.successful}/${result.total} employees rejected`);
      } else {
        throw new Error('Failed to bulk reject employees');
      }
    } catch (error) {
      console.error('Failed to bulk reject employees:', error);
      alert('Failed to bulk reject employees. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'terminated': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerificationColor = (status: string) => {
    switch (status) {
      case 'unverified': return 'bg-red-100 text-red-800';
      case 'email_verified': return 'bg-yellow-100 text-yellow-800';
      case 'admin_approved': return 'bg-blue-100 text-blue-800';
      case 'fully_verified': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const pendingCount = employees.filter(emp => emp.status === 'pending').length;
  const activeCount = employees.filter(emp => emp.status === 'active').length;
  const totalCount = employees.length;

  return (
    <>
      <Head>
        <title>Employee Management - VSR Admin</title>
        <meta name="description" content="Manage employee accounts and approvals" />
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
                <h1 className="text-xl font-bold text-gray-900">Employee Management</h1>
              </div>
              {pendingCount > 0 && (
                <div className="flex items-center space-x-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                  <FaClipboardCheck />
                  <span className="text-sm font-medium">{pendingCount} Pending Approval</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Enhanced Employee Approval System */}
          <EmployeeApprovalSystem
            employees={employees}
            onApprove={handleApprove}
            onReject={handleReject}
            onBulkApprove={handleBulkApprove}
            onBulkReject={handleBulkReject}
            loading={loading}
          />
        </div>
      </div>
    </>
  );
};

export default AdminEmployeesPage;