import { useMobile } from '@/context/MobileContext'; // import from the context
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { FaBars, FaTimes, FaChevronDown, FaShieldAlt, FaUser, FaUsers, FaHome } from 'react-icons/fa';
import { demoAuthService } from '@/services/DemoAuthService';
import { isFeatureEnabled, shouldShowComingSoon } from '@/utils/version';

export default function Header() {
  const router = useRouter();
  const { isMobile } = useMobile(); 
  const { } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPortalDropdownOpen, setIsPortalDropdownOpen] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userType, setUserType] = useState<'admin' | 'employee' | 'client' | null>(null);

  useEffect(() => {
    // Check if user has admin access
    checkAdminAccess();
    // Check for any logged in user
    checkCurrentUser();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setIsAdminUser(true);
      }
    } catch {
      // User is not admin
      setIsAdminUser(false);
    }
  };

  const checkCurrentUser = async () => {
    try {
      // Check for admin token
      const adminToken = localStorage.getItem('accessToken');
      if (adminToken) {
        const user = await demoAuthService.verifyToken(adminToken);
        if (user && user.role === 'admin') {
          setCurrentUser(user);
          setUserType('admin');
          return;
        }
      }

      // Check for employee token
      const employeeToken = localStorage.getItem('employeeToken');
      if (employeeToken) {
        const user = await demoAuthService.verifyToken(employeeToken);
        if (user && user.role === 'employee') {
          setCurrentUser(user);
          setUserType('employee');
          return;
        }
      }

      // Check for client token
      const clientToken = localStorage.getItem('clientToken');
      if (clientToken) {
        const user = await demoAuthService.verifyToken(clientToken);
        if (user && user.role === 'client') {
          setCurrentUser(user);
          setUserType('client');
          return;
        }
      }

      // No valid user found
      setCurrentUser(null);
      setUserType(null);
    } catch (error) {
      console.error('Error checking current user:', error);
      setCurrentUser(null);
      setUserType(null);
    }
  };

  const scrollTo = (id: string) => {
    setIsMenuOpen(false);
    setIsPortalDropdownOpen(false);
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 60;
      const elementPosition = el.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    } else {
      router.push(`/#${id}`);
    }
  };

  const handlePortalNavigation = (url: string) => {
    setIsPortalDropdownOpen(false);
    setIsMenuOpen(false);
    router.push(url);
  };

  const handleLogout = () => {
    // Clear the appropriate token
    const tokenKey = userType === 'admin' ? 'accessToken' : 
                    userType === 'employee' ? 'employeeToken' : 'clientToken';
    localStorage.removeItem(tokenKey);
    
    // Reset state
    setCurrentUser(null);
    setUserType(null);
    setIsAdminUser(false);
    
    // Navigate to homepage
    router.push('/');
  };

  const getPortalConfig = () => {
    switch (userType) {
      case 'admin':
        return {
          title: 'Admin Portal',
          icon: FaShieldAlt,
          iconColor: 'text-red-500'
        };
      case 'employee':
        return {
          title: 'Employee Portal',
          icon: FaUser,
          iconColor: 'text-blue-500'
        };
      case 'client':
        return {
          title: 'Client Portal',
          icon: FaUsers,
          iconColor: 'text-green-500'
        };
      default:
        return null;
    }
  };

  const PortalDropdown = () => (
    <div className="relative">
      <button
        onClick={() => setIsPortalDropdownOpen(!isPortalDropdownOpen)}
        onBlur={() => setTimeout(() => setIsPortalDropdownOpen(false), 150)}
        className="flex items-center space-x-1 hover:text-blue-400 focus:outline-none"
      >
        <span>Portal</span>
        <FaChevronDown 
          size={12} 
          className={`transform transition-transform ${isPortalDropdownOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {isPortalDropdownOpen && (
        <div className="absolute top-full left-0 mt-1 bg-gray-800 text-white rounded-lg shadow-lg py-2 min-w-48 z-50">
          {isFeatureEnabled('employee-portal') ? (
            <button
              onClick={() => handlePortalNavigation('/portal/employee/login')}
              className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm font-medium text-white"
            >
              Employee Portal
            </button>
          ) : shouldShowComingSoon('employee') && (
            <div className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-400">
              Employee Portal - Coming Soon!
            </div>
          )}
          
          {isFeatureEnabled('admin-portal') && (
            <button
              onClick={() => handlePortalNavigation('/portal/admin/login')}
              className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm font-medium text-white"
            >
              Admin Portal
            </button>
          )}
          
          {isFeatureEnabled('client-portal') ? (
            <button
              onClick={() => handlePortalNavigation('/portal/client/login')}
              className="block w-full text-left px-4 py-2 hover:bg-gray-700 text-sm font-medium text-white"
            >
              Client Portal
            </button>
          ) : shouldShowComingSoon('client') && (
            <div className="block w-full text-left px-4 py-2 text-sm font-medium text-gray-400">
              Client Portal - Coming Soon!
            </div>
          )}
        </div>
      )}
    </div>
  );

  const MobilePortalMenu = () => (
    <div className="border-t border-gray-600 mt-2 pt-2">
      <div className="text-xs font-semibold text-gray-400 mb-2 px-2">PORTAL ACCESS</div>
      
      {isFeatureEnabled('employee-portal') ? (
        <Link 
          href="/portal/employee/login" 
          className="block w-full text-left hover:text-blue-400 py-1"
          onClick={() => setIsMenuOpen(false)}
        >
          Employee Portal
        </Link>
      ) : shouldShowComingSoon('employee') && (
        <div className="block w-full text-left py-1 text-gray-400">
          Employee Portal - Coming Soon!
        </div>
      )}
      
      {isFeatureEnabled('admin-portal') && (
        <Link 
          href="/portal/admin/login" 
          className="block w-full text-left hover:text-blue-400 py-1"
          onClick={() => setIsMenuOpen(false)}
        >
          Admin Portal
        </Link>
      )}
      
      {isFeatureEnabled('client-portal') ? (
        <Link 
          href="/portal/client/login" 
          className="block w-full text-left hover:text-blue-400 py-1"
          onClick={() => setIsMenuOpen(false)}
        >
          Client Portal
        </Link>
      ) : shouldShowComingSoon('client') && (
        <div className="block w-full text-left py-1 text-gray-400">
          Client Portal - Coming Soon!
        </div>
      )}
    </div>
  );

  // If user is logged in, show portal header
  if (currentUser && userType) {
    const config = getPortalConfig();
    if (config) {
      const IconComponent = config.icon;
      
      return (
        <header className="w-full bg-white text-gray-900 shadow-md fixed top-0 left-0 z-50 h-12 border-b-2 border-gray-200">
          <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
            {/* Left side - Logo and Portal Title */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <Image
                  src="/VSRv2.png"
                  alt="VSR LLC Logo"
                  width={100}
                  height={24}
                  priority
                />
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
                  {currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.email}
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
        </header>
      );
    }
  }

  // Default header for non-logged in users
  return (
    <header className="w-full bg-black text-white shadow-md fixed top-0 left-0 z-50 h-12">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <div>
          <Link href="/" className="flex items-center">
            <Image
              src="/VSRv2.png"
              alt="VSR LLC Logo"
              width={100}
              height={24}
              priority
            />
          </Link>
        </div>

        {!isMobile && (
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            <button onClick={() => scrollTo('featured')} className="hover:text-blue-400">Projects</button>
            <button onClick={() => scrollTo('about')} className="hover:text-blue-400">About</button>
            <button onClick={() => scrollTo('services')} className="hover:text-blue-400">Services</button>
            <button onClick={() => scrollTo('hiring')} className="hover:text-blue-400">Now Hiring</button>
            <PortalDropdown />
            <button onClick={() => scrollTo('footer')} className="hover:text-blue-400">Contact</button>
          </nav>
        )}

        {isMobile && (
          <div className="md:hidden relative">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="focus:outline-none">
              {isMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>
            {isMenuOpen && (
              <div className="absolute top-10 right-0 bg-gray-800 text-white py-2 px-4 rounded shadow-lg z-50 space-y-2 text-sm min-w-48">
                <button onClick={() => scrollTo('featured')} className="block w-full text-left hover:text-blue-400">Projects</button>
                <button onClick={() => scrollTo('about')} className="block w-full text-left hover:text-blue-400">About</button>
                <button onClick={() => scrollTo('services')} className="block w-full text-left hover:text-blue-400">Services</button>
                <button onClick={() => scrollTo('hiring')} className="block w-full text-left hover:text-blue-400">Now Hiring</button>
                <button onClick={() => scrollTo('footer')} className="block w-full text-left hover:text-blue-400">Contact</button>
                <MobilePortalMenu />
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}