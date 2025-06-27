// Enhanced Application Form with improved UX and accessibility
// FRONTEND IMPROVEMENT: Modern form with excellent user experience

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { ApplicationFormData } from '@/types';
import { useFormValidation } from '@/hooks/useFormValidation';
import { useFormSubmission } from '@/hooks/useFormSubmission';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import FileUpload from '@/components/ui/FileUpload';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

/**
 * Enhanced Application Form Component
 * IMPROVEMENTS:
 * - Real-time validation with immediate feedback
 * - Accessibility-first design with ARIA support
 * - Modern drag & drop file uploads
 * - Loading states and progress indicators
 * - Comprehensive error handling
 * - Success feedback with clear next steps
 * - Mobile-optimized layout
 * - TypeScript integration for type safety
 */
const EnhancedApplyForm: React.FC = () => {
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  } | null>(null);

  /**
   * Form validation configuration
   * IMPROVEMENT: Comprehensive validation rules with custom messages
   */
  const validationRules = {
    name: {
      required: true,
      minLength: 2,
      maxLength: 100,
    },
    email: {
      required: true,
      pattern: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
      customValidator: (value: unknown) => {
        const str = value as string;
        if (str && !str.includes('@')) {
          return 'Please enter a valid email address';
        }
        return null;
      },
    },
    phone: {
      required: true,
      pattern: /^\(\d{3}\) \d{3}-\d{4}$/,
      customValidator: (value: unknown) => {
        const str = value as string;
        const digits = str.replace(/\D/g, '');
        if (digits.length !== 10) {
          return 'Please enter a valid 10-digit phone number';
        }
        return null;
      },
    },
    experience: {
      required: true,
      minLength: 50,
      maxLength: 2000,
      customValidator: (value: unknown) => {
        const str = value as string;
        if (str && str.trim().split(/\s+/).length < 10) {
          return 'Please provide more detailed experience (at least 10 words)';
        }
        return null;
      },
    },
    resume: {
      required: true,
      customValidator: (value: unknown) => {
        const files = value as File[];
        if (!files || files.length === 0) {
          return 'Please upload your resume';
        }
        const file = files[0];
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
          return 'Please upload a PDF, DOC, or DOCX file';
        }
        if (file.size > 5 * 1024 * 1024) {
          return 'File size must be less than 5MB';
        }
        return null;
      },
    },
  };

  /**
   * Form state management with validation
   * IMPROVEMENT: Integrated validation with real-time feedback
   */
  const {
    values,
    validationState,
    updateField,
    handleSubmit,
    getFieldProps,
    resetForm,
  } = useFormValidation<ApplicationFormData>(
    {
      name: '',
      email: '',
      phone: '',
      experience: '',
      resume: [],
    },
    validationRules
  );

  /**
   * Form submission handling
   * IMPROVEMENT: Centralized submission with error handling
   */
  const {
    submitForm,
    isSubmitting,
    error: submissionError,
    success,
    reset: resetSubmission,
  } = useFormSubmission<FormData>(
    '/api/apply',
    () => {
      setNotification({
        type: 'success',
        message: 'Application submitted successfully! We&apos;ll review your application and get back to you within 2-3 business days.',
      });
      resetForm();
    },
    (error) => {
      setNotification({
        type: 'error',
        message: error || 'Failed to submit application. Please try again.',
      });
    }
  );

  /**
   * Phone number formatting
   * IMPROVEMENT: Real-time formatting for better UX
   */
  const formatPhoneNumber = useCallback((value: string): string => {
    const digits = value.replace(/\D/g, '').substring(0, 10);
    const parts = [];

    if (digits.length > 0) parts.push('(' + digits.substring(0, 3));
    if (digits.length >= 4) parts.push(') ' + digits.substring(3, 6));
    if (digits.length >= 7) parts.push('-' + digits.substring(6, 10));

    return parts.join('');
  }, []);

  /**
   * Form submission handler
   * IMPROVEMENT: Comprehensive form data preparation and validation
   */
  const onSubmit = useCallback(async (formData: ApplicationFormData) => {
    const formDataToSubmit = new FormData();
    formDataToSubmit.append('name', formData.name);
    formDataToSubmit.append('email', formData.email);
    formDataToSubmit.append('phone', formData.phone);
    formDataToSubmit.append('experience', formData.experience);
    
    if (formData.resume && formData.resume.length > 0) {
      formDataToSubmit.append('resume', formData.resume[0]);
    }

    await submitForm(formDataToSubmit);
  }, [submitForm]);

  /**
   * Notification dismissal
   * IMPROVEMENT: User-controlled notification management
   */
  const dismissNotification = useCallback(() => {
    setNotification(null);
    resetSubmission();
  }, [resetSubmission]);

  return (
    <div className="w-full max-w-2xl mx-auto mt-16 px-4">
      {/* Page Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-4">
          Join Our Team
        </h1>
        <p className="text-lg text-gray-300 max-w-lg mx-auto">
          We&apos;re always looking for skilled professionals to join our growing construction team.
          Submit your application below and we&apos;ll get back to you soon.
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div className="mb-6">
          <Alert
            type={notification.type}
            message={notification.message}
            dismissible
            onDismiss={dismissNotification}
          />
        </div>
      )}

      {/* Application Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(onSubmit);
        }}
        className="space-y-6 bg-gray-800 bg-opacity-90 p-8 rounded-xl shadow-2xl"
        noValidate
      >
        {/* Form Fields */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Name Field */}
          <div className="md:col-span-2">
            <Input
              {...getFieldProps('name')}
              id="name"
              name="name"
              label="Full Name"
              placeholder="Enter your full name"
              required
              maxLength={100}
              autoComplete="name"
            />
          </div>

          {/* Email Field */}
          <Input
            {...getFieldProps('email')}
            id="email"
            name="email"
            type="email"
            label="Email Address"
            placeholder="your.email@example.com"
            required
            autoComplete="email"
          />

          {/* Phone Field */}
          <Input
            {...getFieldProps('phone')}
            id="phone"
            name="phone"
            type="tel"
            label="Phone Number"
            placeholder="(123) 456-7890"
            required
            value={formatPhoneNumber(values.phone)}
            onChange={(value) => updateField('phone', formatPhoneNumber(value))}
            autoComplete="tel"
          />
        </div>

        {/* Experience Field */}
        <Textarea
          {...getFieldProps('experience')}
          id="experience"
          name="experience"
          label="Experience & Qualifications"
          placeholder="Tell us about your relevant experience, skills, certifications, and what makes you a great fit for our team..."
          required
          rows={6}
          maxLength={2000}
        />

        {/* Resume Upload */}
        <FileUpload
          id="resume"
          name="resume"
          label="Resume"
          accept=".pdf,.doc,.docx"
          multiple={false}
          files={values.resume || []}
          onChange={(files) => updateField('resume', files)}
          error={validationState.touched.resume ? validationState.errors.resume : undefined}
          maxSize={5 * 1024 * 1024} // 5MB
        />

        {/* Submission Error */}
        {submissionError && !notification && (
          <Alert
            type="error"
            message={submissionError}
            dismissible
            onDismiss={resetSubmission}
          />
        )}

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={!validationState.isValid || isSubmitting}
            loading={isSubmitting}
            className="w-full"
            aria-label={isSubmitting ? 'Submitting application...' : 'Submit application'}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" variant="white" className="mr-2" />
                Submitting Application...
              </>
            ) : (
              'Submit Application'
            )}
          </Button>
        </div>

        {/* Form Footer */}
        <div className="text-center text-sm text-gray-400 pt-4 border-t border-gray-700">
          <p>
            By submitting this application, you agree to our{' '}
            <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline">
              Privacy Policy
            </Link>
            . We&apos;ll keep your information confidential and only use it for hiring purposes.
          </p>
        </div>
      </form>

      {/* Success State */}
      {success && !notification && (
        <div className="mt-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Application Submitted!
          </h3>
          <p className="text-gray-300">
            Thank you for your interest in joining our team. We&apos;ll review your application and contact you within 2-3 business days.
          </p>
        </div>
      )}
    </div>
  );
};

export default EnhancedApplyForm;