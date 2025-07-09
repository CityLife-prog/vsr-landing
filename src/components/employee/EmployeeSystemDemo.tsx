/**
 * Employee System Demo Component
 * Demonstrates the complete employee registration and approval workflow
 */

import React, { useState } from 'react';
import Link from 'next/link';

const EmployeeSystemDemo: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    {
      id: 1,
      title: 'Employee Registration',
      description: 'New employees register with company details',
      action: 'Go to Registration',
      link: '/employee/register',
      status: 'available'
    },
    {
      id: 2,
      title: 'Email Verification',
      description: 'Employee receives and clicks verification email',
      action: 'View Demo Email',
      link: '#',
      status: 'demo'
    },
    {
      id: 3,
      title: 'Admin Review',
      description: 'Admin reviews and approves/rejects the application',
      action: 'Admin Console',
      link: '/admin/login',
      status: 'available'
    },
    {
      id: 4,
      title: 'Account Activation',
      description: 'Approved employees receive access to dashboard',
      action: 'Employee Dashboard',
      link: '#',
      status: 'coming-soon'
    }
  ];

  const StepCard = ({ step, isActive }: { step: typeof steps[0], isActive: boolean }) => (
    <div className={`bg-white p-6 rounded-lg shadow-md border-2 ${
      isActive ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
          isActive ? 'bg-blue-500' : 'bg-gray-400'
        }`}>
          {step.id}
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          step.status === 'available' ? 'bg-green-100 text-green-800' :
          step.status === 'demo' ? 'bg-blue-100 text-blue-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {step.status === 'available' ? 'Available' :
           step.status === 'demo' ? 'Demo' : 'Coming Soon'}
        </span>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
      <p className="text-gray-600 mb-4">{step.description}</p>
      
      {step.status === 'available' ? (
        <Link 
          href={step.link}
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          {step.action}
        </Link>
      ) : step.status === 'demo' ? (
        <button
          onClick={() => setCurrentStep(2)}
          className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
        >
          {step.action}
        </button>
      ) : (
        <span className="inline-block px-4 py-2 bg-gray-100 text-gray-500 rounded">
          {step.action}
        </span>
      )}
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">VSR Employee Management System</h1>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Complete employee onboarding workflow with registration, email verification, and admin approval process.
        </p>
      </div>

      {/* Workflow Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {steps.map((step) => (
          <StepCard key={step.id} step={step} isActive={currentStep === step.id} />
        ))}
      </div>

      {/* Demo Email Modal */}
      {currentStep === 2 && (
        <div className="bg-white border rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Demo: Email Verification</h3>
            <button 
              onClick={() => setCurrentStep(1)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          
          <div className="bg-gray-50 p-4 rounded border">
            <div className="text-sm text-gray-600 mb-2">
              <strong>From:</strong> VSR &lt;noreply@vsr.com&gt;<br/>
              <strong>To:</strong> john.worker@example.com<br/>
              <strong>Subject:</strong> VSR Employee Account - Email Verification Required
            </div>
            
            <div className="bg-white p-4 rounded border mt-4">
              <h4 className="text-lg font-semibold mb-2">Welcome to VSR!</h4>
              <p className="mb-4">Hello John Worker,</p>
              <p className="mb-4">Your employee account has been created. Please verify your email address to continue with the approval process.</p>
              
              <div className="bg-gray-100 p-3 rounded mb-4">
                <strong>Employee Details:</strong><br/>
                Employee ID: EMP001<br/>
                Department: Operations<br/>
                Position: Field Technician<br/>
                Hire Date: 1/15/2024
              </div>
              
              <div className="mb-4">
                <Link
                  href="/employee/verify?token=demo-token-123"
                  className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700"
                >
                  Verify Email Address
                </Link>
              </div>
              
              <p className="text-sm text-gray-600">
                After email verification, your account will be reviewed by an administrator for final approval.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* System Features */}
      <div className="bg-gray-50 rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">System Features</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Self-Service Registration</h3>
            <p className="text-gray-600">Employees can register their own accounts with comprehensive validation</p>
          </div>
          
          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Email Verification</h3>
            <p className="text-gray-600">Automated email verification ensures valid contact information</p>
          </div>
          
          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Admin Approval</h3>
            <p className="text-gray-600">Secure approval workflow with admin review and notification system</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-8 text-center">
        <h3 className="text-lg font-semibold mb-4">Quick Access</h3>
        <div className="space-x-4">
          <Link 
            href="/employee/register"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Employee Registration
          </Link>
          <Link 
            href="/admin/login"
            className="inline-block px-6 py-3 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Access Admin Console
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EmployeeSystemDemo;