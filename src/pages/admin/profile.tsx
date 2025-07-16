import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { FaArrowLeft, FaUser, FaEnvelope, FaKey, FaSave } from 'react-icons/fa';
import PasswordStrengthIndicator from '@/components/PasswordStrengthIndicator';
import { validatePassword } from '@/utils/passwordValidation';

export default function ProfileManagement() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    adminLevel: '',
    lastLoginAt: '',
    isActive: true
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfile({
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          email: data.user.email,
          adminLevel: data.user.adminLevel,
          lastLoginAt: data.user.lastLoginAt,
          isActive: data.user.isActive
        });
      } else {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: profile.firstName,
          lastName: profile.lastName
        })
      });

      if (response.ok) {
        setMessage('Profile updated successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to update profile');
      }
    } catch (error) {
      setMessage('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }

    // Validate password using comprehensive validation
    const passwordValidation = validatePassword(passwordData.newPassword);
    if (!passwordValidation.isValid) {
      const requiredFailed = passwordValidation.requirements.failed
        .filter(r => r.severity === 'required')
        .map(r => r.description);
      setMessage(`Password validation failed: ${requiredFailed.join(', ')}`);
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (response.ok) {
        setMessage('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setMessage(''), 3000);
      } else {
        const data = await response.json();
        setMessage(data.message || 'Failed to change password');
      }
    } catch (error) {
      setMessage('Error changing password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Profile Management - VSR Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/admin')}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                >
                  <FaArrowLeft />
                  <span>Back to Admin Dashboard</span>
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Profile Management</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile Information */}
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center mb-6">
                <FaUser className="text-blue-500 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Admin Level
                  </label>
                  <input
                    type="text"
                    value={profile.adminLevel.replace('_', ' ')}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 capitalize"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Login
                  </label>
                  <input
                    type="text"
                    value={profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString() : 'Never'}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center"
                >
                  <FaSave className="mr-2" />
                  {saving ? 'Saving...' : 'Update Profile'}
                </button>
              </form>
            </div>

            {/* Password Change */}
            <div className="bg-white border rounded-lg p-6">
              <div className="flex items-center mb-6">
                <FaKey className="text-orange-500 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <PasswordStrengthIndicator
                    password={passwordData.newPassword}
                    onPasswordChange={(newPassword) => setPasswordData(prev => ({ ...prev, newPassword }))}
                    placeholder="Enter new password"
                    required={true}
                    showGenerator={true}
                    className=""
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-900"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:bg-orange-400 flex items-center justify-center"
                >
                  <FaKey className="mr-2" />
                  {saving ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}