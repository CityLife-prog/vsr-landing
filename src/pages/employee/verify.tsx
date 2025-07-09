/**
 * Employee Email Verification Page
 * Handle email verification from verification links
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const EmployeeVerifyPage: React.FC = () => {
  const router = useRouter();
  const { token } = router.query;
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [employeeInfo, setEmployeeInfo] = useState<any>(null);

  useEffect(() => {
    if (token && typeof token === 'string') {
      verifyEmail(token);
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch('/api/employee/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: verificationToken })
      });

      const result = await response.json();

      if (response.ok) {
        setVerificationStatus('success');
        setEmployeeInfo(result.employee);
      } else {
        setVerificationStatus('error');
        setErrorMessage(result.error || 'Verification failed');
      }
    } catch (error) {
      setVerificationStatus('error');
      setErrorMessage('Network error occurred during verification');
    }
  };

  const LoadingState = () => (
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Verifying Your Email</h3>
      <p className="text-gray-600">Please wait while we verify your email address...</p>
    </div>
  );

  const SuccessState = () => (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Email Verified Successfully!</h3>
      <p className="text-gray-600 mb-4">
        Your email has been verified. Your account is now pending admin approval.
      </p>
      
      {employeeInfo && (
        <div className="bg-blue-50 p-4 rounded-md mb-6">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Account Details:</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Name:</strong> {employeeInfo.firstName} {employeeInfo.lastName}</p>
            <p><strong>Employee ID:</strong> {employeeInfo.employeeId}</p>
            <p><strong>Department:</strong> {employeeInfo.department}</p>
            <p><strong>Position:</strong> {employeeInfo.position}</p>
            <p><strong>Status:</strong> <span className="capitalize">{employeeInfo.status}</span></p>
          </div>
        </div>
      )}

      <div className="bg-yellow-50 p-4 rounded-md mb-6">
        <h4 className="text-sm font-medium text-yellow-900 mb-2">What Happens Next?</h4>
        <ol className="text-sm text-yellow-800 list-decimal list-inside space-y-1">
          <li>An administrator will review your account details</li>
          <li>You'll receive an email notification once your account is approved</li>
          <li>Account approval typically takes 1-2 business days</li>
          <li>After approval, you can access your employee dashboard</li>
        </ol>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => router.push('/')}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Return to Homepage
        </button>
        <button
          onClick={() => router.push('/employee/register')}
          className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Register Another Employee
        </button>
      </div>
    </div>
  );

  const ErrorState = () => (
    <div className="text-center">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Verification Failed</h3>
      <p className="text-gray-600 mb-4">{errorMessage}</p>
      
      <div className="bg-red-50 p-4 rounded-md mb-6">
        <h4 className="text-sm font-medium text-red-900 mb-2">Common Issues:</h4>
        <ul className="text-sm text-red-800 list-disc list-inside space-y-1">
          <li>Verification link has expired (links expire after 24 hours)</li>
          <li>Link has already been used</li>
          <li>Invalid or corrupted verification token</li>
        </ul>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => router.push('/employee/register')}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          Register New Account
        </button>
        <button
          onClick={() => router.push('/')}
          className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Return to Homepage
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Email Verification - VSR Employee</title>
        <meta name="description" content="VSR Employee Email Verification" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Employee Email Verification
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            {verificationStatus === 'loading' && <LoadingState />}
            {verificationStatus === 'success' && <SuccessState />}
            {verificationStatus === 'error' && <ErrorState />}
          </div>
        </div>
      </div>
    </>
  );
};

export default EmployeeVerifyPage;