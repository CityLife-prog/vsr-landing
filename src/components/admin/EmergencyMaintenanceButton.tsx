/**
 * Emergency Maintenance Button - "The Big Red Button"
 * Super Admin emergency site shutdown functionality
 */

import React, { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaShieldAlt, FaSpinner, FaBolt } from 'react-icons/fa';

interface EmergencyMaintenanceButtonProps {
  userEmail: string;
}

export default function EmergencyMaintenanceButton({ userEmail }: EmergencyMaintenanceButtonProps) {
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emergencyData, setEmergencyData] = useState<any>(null);

  // Only show for super admin
  if (userEmail !== 'citylife32@outlook.com') {
    return null;
  }

  useEffect(() => {
    checkEmergencyStatus();
  }, []);

  const checkEmergencyStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/admin/emergency-maintenance', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setIsEmergencyActive(result.data.isEmergencyActive);
        setEmergencyData(result.data);
      }
    } catch (error) {
      console.error('Failed to check emergency status:', error);
    }
  };

  const handleEmergencyToggle = async () => {
    const action = isEmergencyActive ? 'disable' : 'enable';
    
    if (action === 'enable') {
      // Emergency activation confirmation
      const confirmed = confirm(
        '🚨 EMERGENCY SITE SHUTDOWN 🚨\n\n' +
        'This will IMMEDIATELY shut down the entire website for all users.\n\n' +
        '⚠️  WARNING: This action will:\n' +
        '• Block all user access to the site\n' +
        '• Disable all services and modules\n' +
        '• Show maintenance page to all visitors\n' +
        '• Only allow super admin access\n\n' +
        'Are you absolutely sure you want to proceed?'
      );

      if (!confirmed) return;

      const reason = prompt(
        'Enter emergency maintenance reason (required):\n\n' +
        'This will be displayed to users on the maintenance page.'
      );

      if (!reason || reason.trim() === '') {
        alert('Emergency shutdown cancelled - reason is required.');
        return;
      }

      const estimatedDuration = prompt(
        'Estimated duration (optional):\n\n' +
        'Examples: "30 minutes", "2 hours", "Unknown"\n' +
        'Leave blank for "Unknown"'
      );

      const finalConfirm = confirm(
        `🚨 FINAL CONFIRMATION 🚨\n\n` +
        `Reason: ${reason}\n` +
        `Duration: ${estimatedDuration || 'Unknown'}\n\n` +
        `Type "EMERGENCY SHUTDOWN" to confirm:`
      );

      if (!finalConfirm) {
        alert('Emergency shutdown cancelled.');
        return;
      }

      const confirmText = prompt('Type "EMERGENCY SHUTDOWN" to confirm:');
      if (confirmText !== 'EMERGENCY SHUTDOWN') {
        alert('Emergency shutdown cancelled - invalid confirmation.');
        return;
      }

      setLoading(true);

      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/admin/emergency-maintenance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'enable',
            reason: reason.trim(),
            estimatedDuration: estimatedDuration?.trim() || 'Unknown'
          })
        });

        const result = await response.json();

        if (result.success) {
          setIsEmergencyActive(true);
          setEmergencyData(result.data);
          alert('🚨 EMERGENCY MAINTENANCE ACTIVATED\n\nThe site is now offline for all users.');
        } else {
          alert(`Failed to activate emergency maintenance: ${result.message}`);
        }
      } catch (error) {
        console.error('Error activating emergency maintenance:', error);
        alert('Error occurred while activating emergency maintenance.');
      } finally {
        setLoading(false);
      }

    } else {
      // Emergency deactivation
      const confirmed = confirm(
        '✅ RESTORE SITE ACCESS\n\n' +
        'This will restore normal site operation and allow all users to access the website.\n\n' +
        'Are you sure you want to deactivate emergency maintenance?'
      );

      if (!confirmed) return;

      setLoading(true);

      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch('/api/admin/emergency-maintenance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            action: 'disable'
          })
        });

        const result = await response.json();

        if (result.success) {
          setIsEmergencyActive(false);
          setEmergencyData(result.data);
          alert('✅ EMERGENCY MAINTENANCE DEACTIVATED\n\nNormal site operation has been restored.');
        } else {
          alert(`Failed to deactivate emergency maintenance: ${result.message}`);
        }
      } catch (error) {
        console.error('Error deactivating emergency maintenance:', error);
        alert('Error occurred while deactivating emergency maintenance.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="bg-gradient-to-r from-red-900 to-red-800 rounded-lg p-6 border-2 border-red-600">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <FaShieldAlt className="h-8 w-8 text-red-300" />
            <FaBolt className="absolute -top-1 -right-1 h-4 w-4 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Emergency Maintenance</h3>
            <p className="text-red-200 text-sm">Super Admin Only - Site Shutdown</p>
          </div>
        </div>
        
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          isEmergencyActive 
            ? 'bg-red-600 text-white border border-red-400' 
            : 'bg-green-600 text-white border border-green-400'
        }`}>
          {isEmergencyActive ? '🚨 EMERGENCY ACTIVE' : '✅ SITE OPERATIONAL'}
        </div>
      </div>

      {/* Emergency Status */}
      {isEmergencyActive && emergencyData?.maintenanceMode && (
        <div className="mb-4 p-4 bg-red-800 rounded-lg border border-red-600">
          <div className="flex items-start space-x-2 mb-2">
            <FaExclamationTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div>
              <h4 className="text-white font-semibold">Emergency Maintenance Active</h4>
              <p className="text-red-200 text-sm mt-1">{emergencyData.maintenanceMode.message}</p>
            </div>
          </div>
          <div className="text-xs text-red-300 space-y-1 ml-7">
            <p><strong>Activated:</strong> {new Date(emergencyData.maintenanceMode.enabledAt).toLocaleString()}</p>
            <p><strong>Duration:</strong> {emergencyData.maintenanceMode.estimatedDuration}</p>
            <p><strong>Reason:</strong> {emergencyData.maintenanceMode.reason}</p>
          </div>
        </div>
      )}

      {/* The Big Red Button */}
      <div className="text-center">
        <button
          onClick={handleEmergencyToggle}
          disabled={loading}
          className={`relative w-full py-6 px-8 rounded-xl font-bold text-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
            isEmergencyActive
              ? 'bg-green-600 hover:bg-green-500 text-white border-4 border-green-400 shadow-lg'
              : 'bg-red-600 hover:bg-red-500 text-white border-4 border-red-400 shadow-2xl animate-pulse'
          }`}
          style={{
            boxShadow: isEmergencyActive 
              ? '0 0 30px rgba(34, 197, 94, 0.5)' 
              : '0 0 30px rgba(239, 68, 68, 0.8)'
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-3">
              <FaSpinner className="h-6 w-6 animate-spin" />
              <span>Processing...</span>
            </div>
          ) : isEmergencyActive ? (
            <div className="flex items-center justify-center space-x-3">
              <FaShieldAlt className="h-6 w-6" />
              <span>RESTORE SITE ACCESS</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-3">
              <FaExclamationTriangle className="h-6 w-6" />
              <span>🚨 EMERGENCY SHUTDOWN 🚨</span>
            </div>
          )}
        </button>
        
        <p className="text-red-200 text-xs mt-3 italic">
          {isEmergencyActive 
            ? 'Click to restore normal site operation'
            : 'The Big Red Button - Immediate site shutdown for emergencies'
          }
        </p>
      </div>

      {/* Warning */}
      <div className="mt-4 p-3 bg-yellow-900 bg-opacity-50 border border-yellow-600 rounded-lg">
        <div className="flex items-start space-x-2">
          <FaExclamationTriangle className="h-4 w-4 text-yellow-400 mt-0.5" />
          <div className="text-yellow-200 text-xs">
            <p className="font-semibold mb-1">Emergency Use Only</p>
            <p>
              This button immediately shuts down the entire website. Use only in genuine emergencies 
              such as security breaches, critical system failures, or other urgent situations requiring 
              immediate site access prevention.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}