/**
 * Password Strength Indicator Component
 * Real-time visual feedback for password complexity
 * Client-side only implementation using passwordValidation utility
 */

import React, { useEffect, useState } from 'react';
import { validatePassword, generateSecurePassword, PasswordValidationResult } from '../utils/passwordValidation';
import { FaEye, FaEyeSlash, FaSync, FaCheck, FaTimes, FaExclamationTriangle } from 'react-icons/fa';
import { FaInfoCircle as FaInfo } from 'react-icons/fa';

interface PasswordStrengthIndicatorProps {
  password: string;
  onPasswordChange: (password: string) => void;
  placeholder?: string;
  required?: boolean;
  showGenerator?: boolean;
  className?: string;
}

export default function PasswordStrengthIndicator({
  password,
  onPasswordChange,
  placeholder = "Enter password",
  required = false,
  showGenerator = true,
  className = ""
}: PasswordStrengthIndicatorProps) {
  const [validation, setValidation] = useState<PasswordValidationResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (password) {
      const result = validatePassword(password);
      setValidation(result);
    } else {
      setValidation(null);
    }
  }, [password]);

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'very-weak': return 'bg-red-600';
      case 'weak': return 'bg-red-400';
      case 'fair': return 'bg-yellow-400';
      case 'good': return 'bg-blue-400';
      case 'strong': return 'bg-green-400';
      case 'very-strong': return 'bg-green-600';
      default: return 'bg-gray-300';
    }
  };

  const getStrengthText = (strength: string) => {
    switch (strength) {
      case 'very-weak': return 'Very Weak';
      case 'weak': return 'Weak';
      case 'fair': return 'Fair';
      case 'good': return 'Good';
      case 'strong': return 'Strong';
      case 'very-strong': return 'Very Strong';
      default: return '';
    }
  };

  const generatePassword = () => {
    const newPassword = generateSecurePassword(16);
    onPasswordChange(newPassword);
  };

  const estimateCrackTime = (password: string): string => {
    const result = validatePassword(password);
    if (result.score < 20) return '< 1 second';
    if (result.score < 40) return '< 1 minute';
    if (result.score < 60) return '< 1 hour';
    if (result.score < 80) return '< 1 day';
    if (result.score < 95) return '< 1 year';
    return '> 100 years';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Password Input */}
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full px-4 py-3 pr-24 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
        />
        
        {/* Toggle Password Visibility */}
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
        >
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </button>

        {/* Password Generator */}
        {showGenerator && (
          <button
            type="button"
            onClick={generatePassword}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-400 transition-colors"
            title="Generate secure password"
          >
            <FaSync />
          </button>
        )}
      </div>

      {/* Strength Meter */}
      {validation && (
        <div className="space-y-2">
          {/* Strength Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(validation.strength)}`}
                style={{ width: `${validation.score}%` }}
              />
            </div>
            <span className="text-xs text-gray-300 w-16">
              {validation.score}%
            </span>
          </div>

          {/* Strength Label and Details Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${
                validation.isValid ? 'text-green-400' : 'text-red-400'
              }`}>
                {getStrengthText(validation.strength)}
                {validation.isValid && <FaCheck className="inline ml-1" />}
                {!validation.isValid && <FaTimes className="inline ml-1" />}
              </span>
              
              {validation.strength !== 'very-weak' && (
                <span className="text-xs text-gray-500">
                  • Crack time: {estimateCrackTime(password)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <FaInfo />
              {showDetails ? 'Hide' : 'Show'} Details
            </button>
          </div>

          {/* Detailed Requirements */}
          {showDetails && (
            <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
              {/* Requirements */}
              <div>
                <h4 className="text-sm font-medium text-white mb-2">Requirements:</h4>
                <div className="space-y-1">
                  {validation.requirements.failed.filter(r => r.severity === 'required').map(req => (
                    <div key={req.id} className="flex items-center gap-2 text-xs">
                      <FaTimes className="text-red-400 w-3 h-3" />
                      <span className="text-red-400">{req.description}</span>
                    </div>
                  ))}
                  {validation.requirements.met.filter(r => r.severity === 'required').map(req => (
                    <div key={req.id} className="flex items-center gap-2 text-xs">
                      <FaCheck className="text-green-400 w-3 h-3" />
                      <span className="text-green-400">{req.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {validation.requirements.failed.filter(r => r.severity === 'recommended').length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-yellow-400 mb-2">Recommendations:</h4>
                  <div className="space-y-1">
                    {validation.requirements.failed.filter(r => r.severity === 'recommended').map(req => (
                      <div key={req.id} className="flex items-center gap-2 text-xs">
                        <FaExclamationTriangle className="text-yellow-400 w-3 h-3" />
                        <span className="text-yellow-400">{req.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {validation.suggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-blue-400 mb-2">Suggestions:</h4>
                  <ul className="space-y-1">
                    {validation.suggestions.map((suggestion, index) => (
                      <li key={index} className="text-xs text-blue-300 ml-4">
                        • {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Password Tips */}
              <div className="border-t border-gray-700 pt-3">
                <h4 className="text-sm font-medium text-gray-400 mb-2">💡 Tips for Strong Passwords:</h4>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Use a passphrase: "Coffee!Morning@Beach2025"</li>
                  <li>• Mix uppercase, lowercase, numbers, and symbols</li>
                  <li>• Avoid personal information (names, birthdays)</li>
                  <li>• Use unique passwords for each account</li>
                  <li>• Consider using a password manager</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Error for Required Field */}
      {required && validation && !validation.isValid && (
        <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <FaTimes className="text-red-400 mt-0.5 w-4 h-4" />
            <div>
              <p className="text-red-400 text-sm font-medium">Password does not meet requirements</p>
              <ul className="text-red-300 text-xs mt-1 space-y-1">
                {validation.requirements.failed
                  .filter(r => r.severity === 'required')
                  .slice(0, 3)
                  .map(req => (
                    <li key={req.id}>• {req.description}</li>
                  ))}
                {validation.requirements.failed.filter(r => r.severity === 'required').length > 3 && (
                  <li>• ... and {validation.requirements.failed.filter(r => r.severity === 'required').length - 3} more</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {validation && validation.isValid && validation.strength === 'very-strong' && (
        <div className="bg-green-900 bg-opacity-20 border border-green-700 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <FaCheck className="text-green-400 w-4 h-4" />
            <p className="text-green-400 text-sm">Excellent! Your password is very strong.</p>
          </div>
        </div>
      )}
    </div>
  );
}