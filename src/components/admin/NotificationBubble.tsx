/**
 * Notification Bubble Component
 * Shows notification badges with count
 */

import React from 'react';

interface NotificationBubbleProps {
  count: number;
  color?: 'red' | 'yellow' | 'blue' | 'green' | 'orange';
  size?: 'sm' | 'md' | 'lg';
}

const NotificationBubble: React.FC<NotificationBubbleProps> = ({ 
  count, 
  color = 'red', 
  size = 'md' 
}) => {
  if (count <= 0) return null;

  const colorClasses = {
    red: 'bg-red-500 text-white',
    yellow: 'bg-yellow-500 text-white',
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    orange: 'bg-orange-500 text-white'
  };

  const sizeClasses = {
    sm: 'h-4 w-4 text-xs',
    md: 'h-5 w-5 text-xs',
    lg: 'h-6 w-6 text-sm'
  };

  return (
    <div 
      className={`
        ${colorClasses[color]} 
        ${sizeClasses[size]} 
        rounded-full 
        flex 
        items-center 
        justify-center 
        font-bold 
        absolute 
        -top-1 
        -right-1 
        border-2 
        border-white
        shadow-lg
        animate-pulse
      `}
    >
      {count > 99 ? '99+' : count}
    </div>
  );
};

export default NotificationBubble;