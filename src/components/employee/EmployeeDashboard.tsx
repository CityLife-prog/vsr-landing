/**
 * Employee Dashboard Component
 * Main dashboard interface for verified employees with tools and navigation
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { 
  FaUser, 
  FaClipboardList, 
  FaChartBar, 
  FaCog, 
  FaSignOutAlt,
  FaPlus,
  FaFileAlt,
  FaTools,
  FaTasks,
  FaClock,
  FaMapMarkerAlt
} from 'react-icons/fa';

interface EmployeeInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  employeeId: string;
  department: string;
  position: string;
  status: string;
}

const EmployeeDashboard: React.FC = () => {
  const router = useRouter();
  const { } = useAuth();
  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadEmployeeInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/employee/register');
        return;
      }

      // This would normally fetch from API
      // For demo purposes, using mock data
      setEmployeeInfo({
        id: 'emp-001',
        firstName: 'John',
        lastName: 'Worker',
        email: 'john.worker@vsr.com',
        employeeId: 'EMP001',
        department: 'Operations',
        position: 'Field Technician',
        status: 'active'
      });
    } catch (error) {
      console.error('Failed to load employee info:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadEmployeeInfo();
  }, [loadEmployeeInfo]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    router.push('/');
  };

  const dashboardTools = [
    {
      id: 'service-data',
      title: 'Service Data Entry',
      description: 'Create and manage service records for projects',
      icon: FaClipboardList,
      color: 'blue',
      link: '/employee/projects',
      isActive: true
    },
    {
      id: 'time-tracking',
      title: 'Time Tracking',
      description: 'Log work hours and track time spent on projects',
      icon: FaClock,
      color: 'green',
      link: '/employee/time-tracking',
      isActive: false
    },
    {
      id: 'route-planning',
      title: 'Route Planning',
      description: 'Plan and optimize service routes',
      icon: FaMapMarkerAlt,
      color: 'purple',
      link: '/employee/routes',
      isActive: false
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      description: 'View performance metrics and generate reports',
      icon: FaChartBar,
      color: 'orange',
      link: '/employee/reports',
      isActive: false
    },
    {
      id: 'documents',
      title: 'Documents',
      description: 'Access forms, guidelines, and documentation',
      icon: FaFileAlt,
      color: 'indigo',
      link: '/employee/documents',
      isActive: false
    },
    {
      id: 'tools',
      title: 'Field Tools',
      description: 'Digital tools for field operations',
      icon: FaTools,
      color: 'red',
      link: '/employee/tools',
      isActive: false
    }
  ];

  const quickActions = [
    {
      title: 'New Service Entry',
      description: 'Start a new service data entry',
      icon: FaPlus,
      action: () => router.push('/employee/projects?new=true')
    },
    {
      title: 'View Today\'s Tasks',
      description: 'Check assigned tasks for today',
      icon: FaTasks,
      action: () => router.push('/employee/tasks')
    }
  ];

  if (isLoading) {
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
                VSR Employee Portal
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FaUser className="text-gray-400" />
                <span className="text-sm text-gray-700">
                  {employeeInfo?.firstName} {employeeInfo?.lastName}
                </span>
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
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {employeeInfo?.firstName}!
              </h1>
              <p className="text-gray-600 mt-1">
                {employeeInfo?.position} | {employeeInfo?.department} | ID: {employeeInfo?.employeeId}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Status</div>
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                employeeInfo?.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {employeeInfo?.status?.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <action.icon className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{action.title}</div>
                    <div className="text-sm text-gray-600">{action.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Tools */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboardTools.map((tool) => {
              const IconComponent = tool.icon;
              const colorClasses = {
                blue: 'bg-blue-100 text-blue-600 border-blue-200',
                green: 'bg-green-100 text-green-600 border-green-200',
                purple: 'bg-purple-100 text-purple-600 border-purple-200',
                orange: 'bg-orange-100 text-orange-600 border-orange-200',
                indigo: 'bg-indigo-100 text-indigo-600 border-indigo-200',
                red: 'bg-red-100 text-red-600 border-red-200'
              };

              if (tool.isActive) {
                return (
                  <Link key={tool.id} href={tool.link}>
                    <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 cursor-pointer">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`p-3 rounded-lg ${colorClasses[tool.color as keyof typeof colorClasses]}`}>
                          <IconComponent size={24} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{tool.title}</h3>
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm">{tool.description}</p>
                      <div className="mt-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Available
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              } else {
                return (
                  <div key={tool.id} className="bg-white p-6 rounded-lg shadow border border-gray-200 opacity-60">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`p-3 rounded-lg ${colorClasses[tool.color as keyof typeof colorClasses]}`}>
                        <IconComponent size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{tool.title}</h3>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm">{tool.description}</p>
                    <div className="mt-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* System Information */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <FaCog className="text-blue-600" />
            <h3 className="font-medium text-blue-900">System Information</h3>
          </div>
          <p className="text-blue-700 text-sm mt-1">
            You have access to the Service Data Entry tool. Additional tools will be activated as they become available.
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;