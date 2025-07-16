/**
 * Version Control System for VSR Landing
 * Controls feature visibility based on NEXT_PUBLIC_VERSION environment variable
 */

export type Version = 'v1' | 'v2' | 'v3' | 'v4';

export const getCurrentVersion = (): Version => {
  const version = process.env.NEXT_PUBLIC_VERSION;
  
  switch (version) {
    case '1':
      return 'v1';
    case '2':
      return 'v2';
    case '3':
      return 'v3';
    case '4':
      return 'v4';
    default:
      return 'v1'; // Default to v1 (last pull from github)
  }
};

export const isFeatureEnabled = (feature: string): boolean => {
  const currentVersion = getCurrentVersion();
  
  const featureMap: Record<string, Version[]> = {
    // v1 Features: Last pull from github (everything that was working before)
    'landing-page': ['v1', 'v2', 'v3', 'v4'],
    'admin-portal': ['v1', 'v2', 'v3', 'v4'],
    'admin-business-cards': ['v1', 'v2', 'v3', 'v4'],
    'admin-analytics': ['v1', 'v2', 'v3', 'v4'],
    'admin-profile': ['v1', 'v2', 'v3', 'v4'],
    'employee-portal': ['v1', 'v3', 'v4'],
    'employee-dashboard': ['v1', 'v3', 'v4'],
    'employee-snow-removal': ['v1', 'v3', 'v4'],
    'employee-projects': ['v1', 'v3', 'v4'],
    'employee-tools': ['v1', 'v4'],
    'employee-calendar': ['v1', 'v4'],
    'employee-messages': ['v1', 'v4'],
    'employee-reports': ['v1', 'v4'],
    'employee-profile': ['v1', 'v4'],
    'client-portal': ['v1', 'v3', 'v4'],
    'client-dashboard': ['v1', 'v3', 'v4'],
    'admin-users': ['v3', 'v4'], // Moved to v3+
    'admin-employees': ['v1', 'v3', 'v4'],
    'admin-projects': ['v1', 'v3', 'v4'],
    'admin-dashboard-full': ['v1', 'v3', 'v4'],
    'admin-calendar': ['v1', 'v4'],
    'admin-messages': ['v1', 'v4'],
    'admin-database': ['v1', 'v4'],
    'admin-settings': ['v1', 'v4'],
    'admin-reports': ['v1', 'v4'],
    'admin-system': ['v1', 'v4'],
    'admin-employee-tools': ['v1', 'v4'],
    'admin-website-content': ['v1', 'v4'],
    'projects-page': ['v1', 'v2', 'v3', 'v4'], // Enable projects page in v2 with full screen map
    'socials': ['v1', 'v3', 'v4'],
    'galleries': ['v1', 'v3', 'v4'],
    
    // v2 Features: Landing page + Admin portal (business cards, analytics, admin profile, user management) ONLY
    'portal-coming-soon': ['v2'], // Only show "coming soon" in v2
    
    // Employee approvals moved to v3+
    'employee-approvals': ['v3', 'v4'],
    'client-management': ['v3', 'v4'],
    'system-management': ['v4'],
    
    // Additional v4 only features
    'client-messages': ['v4'],
    'client-profile': ['v4'],
    'client-reports': ['v4'],
    'client-projects': ['v4'],
  };
  
  const enabledVersions = featureMap[feature];
  return enabledVersions ? enabledVersions.includes(currentVersion) : false;
};

export const getVersionInfo = () => {
  const currentVersion = getCurrentVersion();
  
  const versionInfo = {
    v1: {
      name: 'Original',
      description: 'Last pull from GitHub - everything that was working before',
      features: [
        'Main landing page',
        'Full admin portal',
        'Complete employee portal',
        'Complete client portal',
        'All existing tools and features',
        'Projects page',
        'Social media integration',
        'Gallery features'
      ]
    },
    v2: {
      name: 'Core',
      description: 'Landing page and basic admin portal only',
      features: [
        'Main landing page',
        'Admin portal login',
        'Admin business cards tool',
        'Admin analytics dashboard',
        'Admin profile management',
        'Quote and update request management',
        'Portal coming soon messages for employee/client'
      ]
    },
    v3: {
      name: 'Extended',
      description: 'All working and in-progress features',
      features: [
        'All v2 features',
        'Projects page with zipcode grouping',
        'Social media integration',
        'Gallery features',
        'Employee portal and dashboard',
        'Snow removal tool',
        'Client portal and dashboard',
        'User management',
        'Employee management'
      ]
    },
    v4: {
      name: 'Complete',
      description: 'All portal features including utilities',
      features: [
        'All v3 features',
        'Employee tools, calendar, messages',
        'Admin system management',
        'Database and settings access',
        'Complete reporting system',
        'Full client portal features',
        'Website content management'
      ]
    }
  };
  
  return {
    current: currentVersion,
    info: versionInfo[currentVersion],
    all: versionInfo
  };
};

export const shouldShowComingSoon = (_portalType: 'employee' | 'client'): boolean => {
  const currentVersion = getCurrentVersion();
  return currentVersion === 'v2' && isFeatureEnabled('portal-coming-soon');
};