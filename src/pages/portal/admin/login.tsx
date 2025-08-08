import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaShieldAlt } from 'react-icons/fa';
import PasswordChangeModal from '../../../components/admin/PasswordChangeModal';
import { useAnalyticsContext } from '../../../components/AnalyticsProvider';

export default function AdminLogin() {
  const router = useRouter();
  const { trackLoginAttempt } = useAnalyticsContext();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        // Track successful login
        trackLoginAttempt('admin', true);
        
        if (data.requiresPasswordChange) {
          // Store user info and show password change modal
          setPendingUser(data.user);
          setShowPasswordChangeModal(true);
        } else {
          // Normal login - proceed to dashboard
          localStorage.setItem('accessToken', data.token);
          router.push('/portal/admin/dashboard');
        }
      } else {
        // Track failed login
        trackLoginAttempt('admin', false);
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      // Track failed login due to network error
      trackLoginAttempt('admin', false);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    if (!pendingUser) return false;

    try {
      // Get CSRF token from cookie
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
        return null;
      };
      
      const csrfToken = getCookie('vsr_csrf_token');
      
      const response = await fetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify({
          email: pendingUser.email,
          currentPassword,
          newPassword,
          csrfToken
        })
      });

      const data = await response.json();

      if (data.success) {
        // Password changed successfully - store token and redirect
        localStorage.setItem('accessToken', data.token);
        setShowPasswordChangeModal(false);
        setPendingUser(null);
        router.push('/portal/admin/dashboard');
        return true;
      } else {
        setError(data.message || 'Password change failed');
        return false;
      }
    } catch (err) {
      setError('Network error during password change. Please try again.');
      return false;
    }
  };


  return (
    <>
      <Head>
        <title>Admin Portal - Login | VSR Construction</title>
        <meta name="description" content="Admin portal login for VSR Construction" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="mx-auto h-12 w-auto flex justify-center">
              <img src="/VSRv2.png" alt="VSR Construction" className="h-12" />
            </div>
            <div className="flex justify-center mt-4">
              <div className="flex items-center space-x-2">
                <FaShieldAlt className="h-6 w-6 text-red-500" />
                <h2 className="text-center text-3xl font-extrabold text-white">
                  Admin Portal
                </h2>
              </div>
            </div>
            <p className="mt-2 text-center text-sm text-gray-400">
              Administrative access required
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Username
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-600 bg-gray-800 rounded-md placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter admin username"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-600 bg-gray-800 rounded-md placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter admin password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <FaEyeSlash className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    ) : (
                      <FaEye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Admin Sign in'}
              </button>
            </div>

            <div className="text-center space-y-4">
              
              <Link
                href="/portal/admin/forgot-password"
                className="text-sm text-red-400 hover:text-red-300"
              >
                Forgot password?
              </Link>
            </div>
          </form>
        </div>
      </div>

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={showPasswordChangeModal}
        onClose={() => {
          setShowPasswordChangeModal(false);
          setPendingUser(null);
        }}
        onSubmit={handlePasswordChange}
        userEmail={pendingUser?.email || ''}
        isFirstLogin={true}
      />
    </>
  );
}