/**
 * Admin Change Password Page
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FaEye, FaEyeSlash, FaCheck, FaTimes } from 'react-icons/fa';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const ChangePasswordPage: React.FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isForced, setIsForced] = useState(false);

  const passwordRequirements: PasswordRequirement[] = [
    {
      label: 'At least 8 characters long',
      test: (password) => password.length >= 8
    },
    {
      label: 'Contains uppercase letter',
      test: (password) => /[A-Z]/.test(password)
    },
    {
      label: 'Contains lowercase letter',
      test: (password) => /[a-z]/.test(password)
    },
    {
      label: 'Contains number',
      test: (password) => /\d/.test(password)
    },
    {
      label: 'Contains special character',
      test: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }
  ];

  useEffect(() => {
    const { email: emailParam, forced } = router.query;
    if (emailParam && typeof emailParam === 'string') {
      setEmail(emailParam);
    }
    if (forced === 'true') {
      setIsForced(true);
    }
  }, [router.query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      setLoading(false);
      return;
    }

    const allRequirementsMet = passwordRequirements.every(req => req.test(newPassword));
    if (!allRequirementsMet) {
      setError('Please meet all password requirements.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          currentPassword: isForced ? undefined : currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/portal/admin/login');
        }, 3000);
      } else {
        setError(data.message);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <>
        <Head>
          <title>Password Changed - VSR Admin</title>
        </Head>
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <FaCheck className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  Password Changed Successfully!
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Your password has been updated. You will be redirected to the login page.
                </p>
                <div className="mt-6">
                  <Link
                    href="/portal/admin/login"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                  >
                    Continue to Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Change Password - VSR Admin</title>
        <meta name="description" content="Change your VSR admin password" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              {isForced ? 'Set New Password' : 'Change Password'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isForced 
                ? 'You must change your default password to continue.'
                : 'Update your admin account password'
              }
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    readOnly
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 bg-gray-50 sm:text-sm text-gray-900"
                  />
                </div>
              </div>

              {!isForced && (
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      required={!isForced}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <FaEyeSlash className="h-5 w-5 text-gray-400" /> : <FaEye className="h-5 w-5 text-gray-400" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <FaEyeSlash className="h-5 w-5 text-gray-400" /> : <FaEye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <FaEyeSlash className="h-5 w-5 text-gray-400" /> : <FaEye className="h-5 w-5 text-gray-400" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Password Requirements:</h4>
                <ul className="space-y-2">
                  {passwordRequirements.map((requirement, index) => {
                    const isMet = requirement.test(newPassword);
                    return (
                      <li key={index} className="flex items-center">
                        {isMet ? (
                          <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                        ) : (
                          <FaTimes className="h-4 w-4 text-gray-400 mr-2" />
                        )}
                        <span className={`text-sm ${isMet ? 'text-green-700' : 'text-gray-600'}`}>
                          {requirement.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <div className="text-sm text-red-600">
                  Passwords do not match.
                </div>
              )}

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Error
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Changing Password...' : 'Change Password'}
                </button>
              </div>
            </form>

            {!isForced && (
              <div className="mt-6">
                <div className="text-center">
                  <Link
                    href="/portal/admin/dashboard"
                    className="text-sm text-blue-600 hover:text-blue-500"
                  >
                    ← Back to Admin Console
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ChangePasswordPage;