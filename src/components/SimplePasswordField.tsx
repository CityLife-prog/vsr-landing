/**
 * Simple Password Field - Temporary replacement for troubleshooting
 */

import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

interface SimplePasswordFieldProps {
  password: string;
  onPasswordChange: (password: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function SimplePasswordField({
  password,
  onPasswordChange,
  placeholder = "Enter password",
  required = false,
  className = ""
}: SimplePasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className="w-full px-4 py-3 pr-12 rounded-lg bg-gray-800 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
        />
        
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
        >
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>
      
      {/* Basic password requirements */}
      {password && (
        <div className="text-xs text-gray-400">
          <p>Password must be at least 8 characters long</p>
        </div>
      )}
    </div>
  );
}