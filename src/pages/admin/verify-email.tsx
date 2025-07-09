/**
 * Admin Email Verification Page
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FaCheckCircle, FaTimesCircle, FaSpinner, FaArrowLeft } from 'react-icons/fa';

const VerifyEmailPage: React.FC = () => {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const { token } = router.query;
    
    if (token && typeof token === 'string') {
      verifyEmail(token);
    } else if (router.isReady) {
      setStatus('error');
      setMessage('Invalid verification link.');
    }
  }, [router.query, router.isReady]);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch('/api/admin/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.message);
      }
    } catch {
      setStatus('error');
      setMessage('An error occurred while verifying your email.');
    }
  };

  return (
    <>
      <Head>
        <title>Email Verification - VSR Admin</title>
        <meta name="description" content="VSR Admin Email Verification" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Email Verification</h2>
            <p className="mt-2 text-sm text-gray-600">VSR Admin Account</p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              {status === 'loading' && (
                <>
                  <FaSpinner className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    Verifying your email...
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Please wait while we verify your email address.
                  </p>
                </>
              )}

              {status === 'success' && (
                <>
                  <FaCheckCircle className="mx-auto h-12 w-12 text-green-500" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    Email Verified Successfully!
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {message}
                  </p>
                  <div className="mt-6">
                    <Link
                      href="/admin/login"
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Continue to Login
                    </Link>
                  </div>
                </>
              )}

              {status === 'error' && (
                <>
                  <FaTimesCircle className="mx-auto h-12 w-12 text-red-500" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    Verification Failed
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {message}
                  </p>
                  <div className="mt-6 space-y-3">
                    <Link
                      href="/admin/login"
                      className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Go to Login
                    </Link>
                    <Link
                      href="/admin/forgot-password"
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Request Password Reset
                    </Link>
                  </div>
                </>
              )}
            </div>

            <div className="mt-8 border-t border-gray-200 pt-6">
              <div className="text-center space-y-2">
                <Link
                  href="/admin"
                  className="text-sm text-gray-600 hover:text-gray-500"
                >
                  <FaArrowLeft className="inline mr-1" />
                  Back to Dashboard
                </Link>
                <p className="text-xs text-gray-500">
                  Need help? Contact your system administrator.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VerifyEmailPage;