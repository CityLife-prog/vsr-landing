import React, { useState } from 'react';
import { FaEye, FaEyeSlash, FaLock, FaExclamationTriangle, FaCheck } from 'react-icons/fa';
import SimplePasswordField from '../SimplePasswordField';
import { validatePassword } from '../../utils/passwordValidation';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (currentPassword: string, newPassword: string) => Promise<boolean>;
  userEmail: string;
  isFirstLogin?: boolean;
}

export default function PasswordChangeModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  userEmail, 
  isFirstLogin = false 
}: PasswordChangeModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password validation using comprehensive system
  const passwordValidation = validatePassword(newPassword);
  const isValid = passwordValidation.isValid;
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) {
      setError('Please enter your current password');
      return;
    }

    if (!isValid) {
      const requiredFailed = passwordValidation.requirements.failed
        .filter(r => r.severity === 'required')
        .map(r => r.description);
      setError(`Password validation failed: ${requiredFailed.join(', ')}`);
      return;
    }

    if (!passwordsMatch) {
      setError('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const success = await onSubmit(currentPassword, newPassword);
      if (success) {
        // Reset form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      }
    } catch (err) {
      setError('Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center space-x-3 mb-6">
          {isFirstLogin ? (
            <FaExclamationTriangle className="h-6 w-6 text-orange-500" />
          ) : (
            <FaLock className="h-6 w-6 text-blue-500" />
          )}
          <h2 className="text-xl font-bold text-gray-900">
            {isFirstLogin ? 'Password Change Required' : 'Change Password'}
          </h2>
        </div>

        {isFirstLogin && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-orange-800">
              <strong>First Login Detected:</strong> For security reasons, you must change your password before accessing the admin portal.
            </p>
          </div>
        )}

        <div className="mb-4">
          <p className="text-sm text-gray-600">Account: <strong>{userEmail}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your current password"
                required
              />
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <SimplePasswordField
              password={newPassword}
              onPasswordChange={setNewPassword}
              placeholder="Enter new password"
              required={true}
              className=""
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm your new password"
                required
              />
            </div>
            {confirmPassword && (
              <div className="mt-1">
                {passwordsMatch ? (
                  <div className="flex items-center space-x-1 text-green-600 text-xs">
                    <FaCheck className="h-3 w-3" />
                    <span>Passwords match</span>
                  </div>
                ) : (
                  <div className="text-red-600 text-xs">
                    <span>Passwords do not match</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            {!isFirstLogin && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={!isValid || !passwordsMatch || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}