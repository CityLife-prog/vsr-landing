import { useMobile } from '@/context/MobileContext'; // import from the context
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { FaBars, FaTimes, FaChevronDown, FaShieldAlt, FaUser, FaUsers, FaHome, FaEdit, FaPhoneAlt, FaQuestionCircle, FaCog } from 'react-icons/fa';
import { simpleAuthService } from '@/services/SimpleAuthService';
import { isFeatureEnabled, shouldShowComingSoon } from '@/utils/version';
import { useAnalyticsContext } from '@/components/AnalyticsProvider';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { validatePassword } from '../utils/passwordValidation';

export default function Header() {
  const router = useRouter();
  const { isMobile } = useMobile(); 
  const { } = useAuth();
  const { trackButtonClick } = useAnalyticsContext();
  const { t } = useTranslation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPortalDropdownOpen, setIsPortalDropdownOpen] = useState(false);
  const portalDropdownRef = useRef<HTMLDivElement>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userType, setUserType] = useState<'admin' | 'employee' | 'client' | null>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    // Check if user has admin access
    checkAdminAccess();
    // Check for any logged in user
    checkCurrentUser();
  }, []);

  // Set loading to false once user check is complete
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingUser(false);
    }, 100); // Small delay to ensure user state is loaded
    
    return () => clearTimeout(timer);
  }, [currentUser, userType]);

  // Add an effect to listen for storage changes (when user logs in/out)
  useEffect(() => {
    const handleStorageChange = () => {
      checkCurrentUser();
      checkAdminAccess();
    };

    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Also check on focus (when user comes back to tab)
    window.addEventListener('focus', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (portalDropdownRef.current && !portalDropdownRef.current.contains(event.target as Node)) {
        setIsPortalDropdownOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };

    if (isPortalDropdownOpen || isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPortalDropdownOpen, isProfileDropdownOpen]);

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
      // Helper function to decode JWT token client-side
      const decodeToken = (token: string) => {
        try {
          const payload = token.split('.')[1];
          const decoded = JSON.parse(atob(payload));
          return decoded;
        } catch {
          return null;
        }
      };

      // Check for admin token
      const adminToken = localStorage.getItem('accessToken');
      if (adminToken) {
        const decoded = decodeToken(adminToken);
        if (decoded && decoded.role === 'admin') {
          setCurrentUser({
            id: decoded.userId,
            email: decoded.email,
            firstName: decoded.firstName,
            lastName: decoded.lastName,
            role: decoded.role
          });
          setUserType('admin');
          setIsLoadingUser(false);
          return;
        }
      }

      // Check for employee token
      const employeeToken = localStorage.getItem('employeeToken');
      if (employeeToken) {
        const decoded = decodeToken(employeeToken);
        if (decoded && decoded.role === 'employee') {
          setCurrentUser({
            id: decoded.userId,
            email: decoded.email,
            firstName: decoded.firstName,
            lastName: decoded.lastName,
            role: decoded.role
          });
          setUserType('employee');
          setIsLoadingUser(false);
          return;
        }
      }

      // Check for client token
      const clientToken = localStorage.getItem('clientToken');
      if (clientToken) {
        const decoded = decodeToken(clientToken);
        if (decoded && decoded.role === 'client') {
          setCurrentUser({
            id: decoded.userId,
            email: decoded.email,
            firstName: decoded.firstName,
            lastName: decoded.lastName,
            role: decoded.role
          });
          setUserType('client');
          setIsLoadingUser(false);
          return;
        }
      }

      // No valid user found
      setCurrentUser(null);
      setUserType(null);
      setIsLoadingUser(false);
    } catch (error) {
      console.error('Error checking current user:', error);
      setCurrentUser(null);
      setUserType(null);
      setIsLoadingUser(false);
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
    <div className="relative" ref={portalDropdownRef}>
      <button
        onClick={() => setIsPortalDropdownOpen(!isPortalDropdownOpen)}
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

  // Only show admin portal header on portal pages
  const isPortalPage = router.pathname.startsWith('/portal/');
  const isHomepage = router.pathname === '/' || router.pathname === '' || router.pathname.startsWith('/es') || router.pathname.startsWith('/fr') || router.pathname.startsWith('/de') || router.pathname.startsWith('/zh');
  
  // Debug logging
  console.log('Header Debug:', {
    pathname: router.pathname,
    isPortalPage,
    isHomepage,
    currentUser: !!currentUser,
    userType,
    isLoadingUser,
    showPortalHeader: !isLoadingUser && currentUser && userType && isPortalPage && !isHomepage
  });
  
  // Show loading state while checking user status on portal pages
  if (isLoadingUser && isPortalPage) {
    return (
      <header className="w-full bg-black text-white shadow-md fixed top-0 left-0 z-50 h-12">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-center">
          <div className="animate-pulse text-sm">Loading...</div>
        </div>
      </header>
    );
  }
  
  // If user is logged in AND on a portal page (but NOT homepage), show portal header
  if (!isLoadingUser && currentUser && userType && isPortalPage && !isHomepage) {
    const config = getPortalConfig();
    if (config) {
      const IconComponent = config.icon;
      
      return (
        <header className="w-full bg-black text-white shadow-md fixed top-0 left-0 z-50 h-12">
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
                  <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
                  <span className="text-sm font-medium text-white">{config.title}</span>
                </div>
              </div>
            </div>

            {/* Right side - User info and buttons */}
            <div className="flex items-center space-x-4">
              {/* Welcome message */}
              <div className="text-sm text-gray-300">
                <span className="font-medium">Welcome, </span>
                <span className="text-white">
                  {currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.email}
                </span>
              </div>

              {/* Back to Homepage button */}
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              >
                <FaHome className="h-3 w-3" />
                <span>Homepage</span>
              </button>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileDropdownRef}>
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center space-x-1 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                >
                  <FaCog className="h-3 w-3" />
                  <span>Profile</span>
                  <FaChevronDown className={`h-2 w-2 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 text-white rounded-md shadow-lg py-1 z-50 border border-gray-600">
                    <button
                      onClick={() => {
                        setShowPasswordModal(true);
                        setIsProfileDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-700"
                    >
                      <FaCog className="inline mr-2" />
                      Change Password
                    </button>
                  </div>
                )}
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
              >
                <span>Logout</span>
              </button>
            </div>
          </div>
        </header>
      );
    }
  }


  // Password Change Modal
  const PasswordChangeModal = () => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (newPassword !== confirmPassword) {
        setError('New passwords do not match');
        return;
      }

      // Validate password using comprehensive validation
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        const requiredFailed = passwordValidation.requirements.failed
          .filter(r => r.severity === 'required')
          .map(r => r.description);
        setError(`Password validation failed: ${requiredFailed.join(', ')}`);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await fetch('/api/admin/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: currentUser?.email,
            currentPassword,
            newPassword
          }),
        });

        const data = await response.json();

        if (data.success) {
          alert('Password changed successfully!');
          setShowPasswordModal(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        } else {
          setError(data.message || 'Failed to change password');
        }
      } catch (error) {
        setError('An error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const closeModal = () => {
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    };

    if (!showPasswordModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 text-white rounded-lg w-full max-w-md mx-4 relative">
          {/* Close button in top right corner */}
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes className="h-5 w-5" />
          </button>
          
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">Change Password</h2>
            
            <form onSubmit={handlePasswordChange}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  New Password
                </label>
                <div className="text-white">
                  <PasswordStrengthIndicator
                    password={newPassword}
                    onPasswordChange={setNewPassword}
                    placeholder="Enter new password"
                    required={true}
                    showGenerator={true}
                    className=""
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={8}
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-900 border border-red-600 text-red-300 rounded">
                  {error}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

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
            <button onClick={() => scrollTo('featured')} className="hover:text-blue-400">
              {t('nav.projects', 'Projects')}
            </button>
            <button onClick={() => scrollTo('about')} className="hover:text-blue-400">
              {t('nav.about', 'About')}
            </button>
            <button onClick={() => scrollTo('services')} className="hover:text-blue-400">
              {t('nav.services', 'Services')}
            </button>
            <button onClick={() => scrollTo('hiring')} className="hover:text-blue-400">
              {t('nav.hiring', 'Now Hiring')}
            </button>
            <button onClick={() => scrollTo('footer')} className="hover:text-blue-400">
              {t('nav.contact', 'Contact')}
            </button>
            <PortalDropdown />
            {/* Show admin portal button if logged in */}
            {currentUser && userType === 'admin' && (
              <button
                onClick={() => router.push('/portal/admin/dashboard')}
                className="flex items-center space-x-1 text-blue-400 hover:text-blue-300"
              >
                <FaShieldAlt className="h-3 w-3" />
                <span>Admin Portal</span>
              </button>
            )}
            <LanguageSwitcher />
          </nav>
        )}

        {isMobile && (
          <div className="md:hidden relative">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="focus:outline-none">
              {isMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>
            {isMenuOpen && (
              <div className="absolute top-10 right-0 bg-gray-800 text-white py-2 px-4 rounded shadow-lg z-50 space-y-2 text-sm min-w-48">
                <button onClick={() => scrollTo('featured')} className="block w-full text-left hover:text-blue-400">
                  {t('nav.projects', 'Projects')}
                </button>
                <button onClick={() => scrollTo('about')} className="block w-full text-left hover:text-blue-400">
                  {t('nav.about', 'About')}
                </button>
                <button onClick={() => scrollTo('services')} className="block w-full text-left hover:text-blue-400">
                  {t('nav.services', 'Services')}
                </button>
                <button onClick={() => scrollTo('hiring')} className="block w-full text-left hover:text-blue-400">
                  {t('nav.hiring', 'Now Hiring')}
                </button>
                <button onClick={() => scrollTo('footer')} className="block w-full text-left hover:text-blue-400">
                  {t('nav.contact', 'Contact')}
                </button>
                <div className="border-t border-gray-600 mt-2 pt-2">
                  <div className="text-xs font-semibold text-gray-400 mb-2">LANGUAGE</div>
                  <LanguageSwitcher className="w-full" showLabel={true} />
                </div>
                {/* Show admin portal link if logged in */}
                {currentUser && userType === 'admin' && (
                  <div className="border-t border-gray-600 mt-2 pt-2">
                    <div className="text-xs font-semibold text-gray-400 mb-2">ADMIN ACCESS</div>
                    <button
                      onClick={() => {
                        router.push('/portal/admin/dashboard');
                        setIsMenuOpen(false);
                      }}
                      className="flex items-center space-x-2 w-full text-left hover:text-blue-400 py-1"
                    >
                      <FaShieldAlt className="h-3 w-3" />
                      <span>Admin Portal</span>
                    </button>
                  </div>
                )}
                <MobilePortalMenu />
              </div>
            )}
          </div>
        )}
      </div>
      <PasswordChangeModal />
    </header>
  );
}