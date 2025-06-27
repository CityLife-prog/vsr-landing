// Enhanced Mobile Context with comprehensive responsive design support
// FRONTEND IMPROVEMENT: Advanced responsive design detection

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { MobileContextValue } from '@/types';

/**
 * Enhanced mobile context with comprehensive device detection
 * IMPROVEMENTS:
 * - Multiple breakpoint detection (mobile, tablet, desktop)
 * - Screen width tracking for advanced responsive logic
 * - Orientation detection
 * - Performance optimized with debounced resize handling
 * - TypeScript integration with proper interfaces
 */
const MobileContext = createContext<MobileContextValue>({
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  screenWidth: 1024,
  orientation: 'landscape',
});

/**
 * Enhanced Mobile Provider with advanced responsive features
 * IMPROVEMENT: Comprehensive device and screen state management
 */
export const MobileProvider = ({ children }: { children: ReactNode }) => {
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    typeof window !== 'undefined' && window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  );

  /**
   * Debounced resize handler for performance
   * IMPROVEMENT: Prevents excessive re-renders during window resize
   */
  const handleResize = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    setScreenWidth(width);
    setOrientation(height > width ? 'portrait' : 'landscape');
  }, []);

  /**
   * Debounce utility for resize events
   * IMPROVEMENT: Performance optimization for resize events
   */
  const debounce = useCallback((func: () => void, wait: number) => {
    let timeout: NodeJS.Timeout;
    return () => {
      clearTimeout(timeout);
      timeout = setTimeout(func, wait);
    };
  }, []);

  const debouncedHandleResize = useCallback(() => debounce(handleResize, 100)(), [handleResize, debounce]);

  useEffect(() => {
    // Initial check
    handleResize();

    // Add event listeners
    window.addEventListener('resize', debouncedHandleResize);
    window.addEventListener('orientationchange', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', debouncedHandleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [debouncedHandleResize, handleResize]);

  /**
   * Computed responsive states
   * IMPROVEMENT: Clear breakpoint definitions matching Tailwind CSS
   */
  const contextValue: MobileContextValue = {
    isMobile: screenWidth < 768,        // Tailwind 'md' breakpoint
    isTablet: screenWidth >= 768 && screenWidth < 1024,  // Between 'md' and 'lg'
    isDesktop: screenWidth >= 1024,    // Tailwind 'lg' breakpoint and above
    screenWidth,
    orientation,
  };

  return (
    <MobileContext.Provider value={contextValue}>
      {children}
    </MobileContext.Provider>
  );
};

/**
 * Enhanced hook for responsive design
 * IMPROVEMENT: Rich responsive state information
 */
export const useMobile = () => {
  const context = useContext(MobileContext);
  
  if (!context) {
    throw new Error('useMobile must be used within a MobileProvider');
  }
  
  return context;
};

/**
 * Utility hook for specific breakpoint detection
 * IMPROVEMENT: Convenient breakpoint-specific hooks
 */
export const useBreakpoint = (breakpoint: 'sm' | 'md' | 'lg' | 'xl' | '2xl') => {
  const { screenWidth } = useMobile();
  
  const breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  };
  
  return screenWidth >= breakpoints[breakpoint];
};

/**
 * Hook for orientation-specific logic
 * IMPROVEMENT: Orientation-aware components
 */
export const useOrientation = () => {
  const { orientation } = useMobile();
  return {
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    orientation,
  };
};
