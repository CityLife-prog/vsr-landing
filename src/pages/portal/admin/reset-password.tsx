/**
 * Admin Password Reset Page
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import { validatePassword } from '@/utils/passwordValidation';

const ResetPasswordPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const { token: queryToken } = router.query;
    if (queryToken && typeof queryToken === 'string') {
      setToken(queryToken);
    }
  }, [router.query]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password using comprehensive validation
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      const requiredFailed = passwordValidation.requirements.failed
        .filter(r => r.severity === 'required')
        .map(r => r.description);
      setError(`Password validation failed: ${requiredFailed.join(', ')}`);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // Store token and redirect after a short delay
        localStorage.setItem('accessToken', data.token);
        setTimeout(() => {
          router.push('/portal/admin/dashboard');
        }, 2000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <>
        <Head>
          <title>Invalid Reset Link | Admin Portal</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>

        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="rounded-md bg-red-50 p-4">
                <h3 className="text-sm font-medium text-red-800">Invalid Reset Link</h3>
                <p className="mt-2 text-sm text-red-700">
                  This password reset link is invalid or has expired.
                </p>
              </div>
              <div className="mt-6 text-center">
                <Link
                  href="/portal/admin/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Request a new reset link
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (success) {
    return (
      <>
        <Head>
          <title>Password Reset Successfully | Admin Portal</title>
          <meta name="robots" content="noindex, nofollow" />
        </Head>

        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Password Reset Successfully
                    </h3>
                    <p className="mt-2 text-sm text-green-700">
                      Your password has been updated. Redirecting to admin dashboard...
                    </p>
                  </div>
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
        <title>Reset Password | Admin Portal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set New Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your new secure password
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="mt-1">
                  <PasswordStrengthIndicator
                    password={password}
                    onPasswordChange={setPassword}
                    placeholder="Enter new password"
                    required={true}
                    showGenerator={true}
                    className=""
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
                  />
                </div>
              </div>


              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
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
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/portal/admin/login"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                ← Back to login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ResetPasswordPage;