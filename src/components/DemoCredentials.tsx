// Demo Credentials Display Component
// WARNING: DELETE before production

import React, { useState } from 'react';
import Link from 'next/link';
import { FaEye, FaEyeSlash, FaUser, FaShieldAlt, FaUsers } from 'react-icons/fa';

const DemoCredentials: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  const demoAccounts = [
    {
      role: 'Admin',
      email: 'demo.admin@vsrsnow.com',
      password: 'demo123',
      loginUrl: '/portal/admin/login',
      icon: FaShieldAlt,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      role: 'Employee',
      email: 'demo.employee@vsrsnow.com',
      password: 'demo123',
      loginUrl: '/portal/employee/login',
      icon: FaUser,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      role: 'Client',
      email: 'demo.client@vsrsnow.com',
      password: 'demo123',
      loginUrl: '/portal/client/login',
      icon: FaUsers,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    }
  ];

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
        >
          🚀 Demo Accounts
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Demo Accounts</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <FaEyeSlash className="h-4 w-4" />
          </button>
        </div>
        
        <div className="text-xs text-red-600 mb-3 font-medium">
          ⚠️ FOR DEVELOPMENT ONLY - DELETE BEFORE PRODUCTION
        </div>
        
        <div className="space-y-2">
          {demoAccounts.map((account) => {
            const IconComponent = account.icon;
            return (
              <div
                key={account.role}
                className={`p-3 rounded-lg border ${account.bgColor} ${account.borderColor}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <IconComponent className={`h-4 w-4 ${account.color}`} />
                    <span className="font-medium text-gray-900">{account.role}</span>
                  </div>
                  <Link
                    href={account.loginUrl}
                    className={`text-xs px-2 py-1 rounded ${account.color} hover:opacity-80 transition-opacity`}
                  >
                    Login →
                  </Link>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <div><strong>Email:</strong> {account.email}</div>
                  <div><strong>Password:</strong> {account.password}</div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-3 text-xs text-gray-500">
          Each portal has a "🚀 One-Click Demo" button for instant access
        </div>
      </div>
    </div>
  );
};

export default DemoCredentials;