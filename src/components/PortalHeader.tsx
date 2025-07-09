import React from 'react';
import { useRouter } from 'next/router';
import { FaShieldAlt, FaUser, FaUsers, FaHome } from 'react-icons/fa';

interface PortalHeaderProps {
  userType: 'admin' | 'employee' | 'client';
  userName?: string;
  userEmail?: string;
}

const PortalHeader: React.FC<PortalHeaderProps> = ({ userType, userName, userEmail }) => {
  const router = useRouter();

  const handleLogout = () => {
    // Clear the appropriate token
    const tokenKey = userType === 'admin' ? 'accessToken' : 
                    userType === 'employee' ? 'employeeToken' : 'clientToken';
    localStorage.removeItem(tokenKey);
    
    // Navigate to homepage
    router.push('/');
  };

  const getPortalConfig = () => {
    switch (userType) {
      case 'admin':
        return {
          title: 'Admin Portal',
          icon: FaShieldAlt,
          iconColor: 'text-red-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'employee':
        return {
          title: 'Employee Portal',
          icon: FaUser,
          iconColor: 'text-blue-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'client':
        return {
          title: 'Client Portal',
          icon: FaUsers,
          iconColor: 'text-green-500',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      default:
        return {
          title: 'Portal',
          icon: FaUser,
          iconColor: 'text-gray-500',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getPortalConfig();
  const IconComponent = config.icon;

  return (
    <div className="bg-white shadow-sm border-b-2 border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Left side - Logo and Portal Title */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <img src="/VSRv2.png" alt="VSR Construction" className="h-8" />
              <div className="flex items-center space-x-2">
                <IconComponent className={`h-6 w-6 ${config.iconColor}`} />
                <h1 className="text-xl font-bold text-gray-900">{config.title}</h1>
              </div>
            </div>
          </div>

          {/* Right side - User info and Home button */}
          <div className="flex items-center space-x-4">
            {/* Welcome message */}
            <div className="text-sm text-gray-700">
              <span className="font-medium">Welcome, </span>
              <span className="text-gray-900">
                {userName || userEmail || `${userType.charAt(0).toUpperCase() + userType.slice(1)}`}
              </span>
            </div>

            {/* Homepage/Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <FaHome className="h-4 w-4" />
              <span>Homepage</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalHeader;