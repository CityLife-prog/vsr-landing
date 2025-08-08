/**
 * Admin Analytics API Endpoint
 * Provides website analytics data with database storage
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { withSecurity } from '../../../middleware/cors';
import { withServiceStatusCheck } from '../../../middleware/maintenanceMode';
import { secureCookieManager } from '../../../lib/secure-cookie-auth';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

interface AnalyticsData {
  overview: {
    totalVisitors: number;
    visitorChange: number;
    pageViews: number;
    pageViewChange: number;
    quoteRequests: number;
    quoteRequestChange: number;
    conversionRate: number;
    conversionRateChange: number;
    totalLoginAttempts: number;
    successfulLogins: number;
    loginSuccessRate: number;
  };
  historical?: {
    totalVisitors: number;
    pageViews: number;
    quoteRequests: number;
    conversionRate: number;
    lastUpdateDate: string;
  };
  topPages: Array<{
    path: string;
    views: number;
    percentage: number;
  }>;
  trafficSources: Array<{
    source: string;
    visitors: number;
    percentage: number;
  }>;
  deviceBreakdown: Array<{
    device: string;
    percentage: number;
  }>;
  qrCodeScans: Array<{
    type: string;
    employeeName?: string;
    scans: number;
    percentage: number;
  }>;
  loginAttempts: Array<{
    loginType: string;
    attempts: number;
    successful: number;
    successRate: number;
  }>;
}

// Analytics data file path
const analyticsDataFile = path.join(process.cwd(), 'data', 'analytics.json');

// Ensure data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Load analytics data from file
const loadAnalyticsData = (): AnalyticsData => {
  try {
    ensureDataDirectory();
    if (fs.existsSync(analyticsDataFile)) {
      const data = fs.readFileSync(analyticsDataFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading analytics data:', error);
  }
  
  // Return default data if file doesn't exist or error occurred
  return getDefaultAnalyticsData();
};

// Save analytics data to file
const saveAnalyticsData = (data: AnalyticsData) => {
  try {
    ensureDataDirectory();
    fs.writeFileSync(analyticsDataFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving analytics data:', error);
  }
};

// Get default analytics data structure
const getDefaultAnalyticsData = (): AnalyticsData => ({
  overview: {
    totalVisitors: 0,
    visitorChange: 0,
    pageViews: 0,
    pageViewChange: 0,
    quoteRequests: 0,
    quoteRequestChange: 0,
    conversionRate: 0,
    conversionRateChange: 0,
    totalLoginAttempts: 0,
    successfulLogins: 0,
    loginSuccessRate: 0
  },
  topPages: [],
  trafficSources: [
    { source: 'Direct', visitors: 0, percentage: 0 },
    { source: 'Google Search', visitors: 0, percentage: 0 },
    { source: 'Social Media', visitors: 0, percentage: 0 },
    { source: 'QR Code', visitors: 0, percentage: 0 },
    { source: 'Referral', visitors: 0, percentage: 0 }
  ],
  deviceBreakdown: [
    { device: 'Desktop', percentage: 0 },
    { device: 'Mobile', percentage: 0 },
    { device: 'Tablet', percentage: 0 }
  ],
  qrCodeScans: [],
  loginAttempts: []
});

// Calculate percentage change between current and historical data
const calculatePercentageChange = (current: number, historical: number): number => {
  if (historical === 0) return current > 0 ? 100 : 0;
  return ((current - historical) / historical) * 100;
};

// Update historical data daily
const updateHistoricalData = (data: AnalyticsData): void => {
  const today = new Date().toDateString();
  
  if (!data.historical || data.historical.lastUpdateDate !== today) {
    // Store yesterday's data as historical
    data.historical = {
      totalVisitors: data.overview.totalVisitors,
      pageViews: data.overview.pageViews,
      quoteRequests: data.overview.quoteRequests,
      conversionRate: data.overview.conversionRate,
      lastUpdateDate: today
    };
    
    // Reset daily counters (comment out if you want cumulative data)
    // data.overview.totalVisitors = 0;
    // data.overview.pageViews = 0;
    // data.overview.quoteRequests = 0;
  }
  
  // Calculate percentage changes
  if (data.historical) {
    data.overview.visitorChange = calculatePercentageChange(
      data.overview.totalVisitors, 
      data.historical.totalVisitors
    );
    data.overview.pageViewChange = calculatePercentageChange(
      data.overview.pageViews, 
      data.historical.pageViews
    );
    data.overview.quoteRequestChange = calculatePercentageChange(
      data.overview.quoteRequests, 
      data.historical.quoteRequests
    );
    data.overview.conversionRateChange = calculatePercentageChange(
      data.overview.conversionRate, 
      data.historical.conversionRate
    );
  }
};

// Load analytics data on module initialization
let analyticsStore: AnalyticsData = loadAnalyticsData();

// Update historical data on load
updateHistoricalData(analyticsStore);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // For GET requests (viewing analytics), require authentication
    if (req.method === 'GET') {
      // Use secure cookie authentication instead of JWT tokens
      const authResult = await secureCookieManager.getAuthFromCookies(req);
      if (!authResult.success || !authResult.user || authResult.user.role !== 'admin') {
        return res.status(401).json({ 
          error: 'Authentication required or insufficient permissions',
          message: authResult.message
        });
      }
    }

    // For POST requests (tracking), allow without authentication but with basic validation
    if (req.method === 'POST') {
      // Basic rate limiting check (optional)
      const userAgent = req.headers['user-agent'];
      if (!userAgent || userAgent.includes('bot') || userAgent.includes('crawler')) {
        // Optionally block bots, but allow for now
      }
    }

    switch (req.method) {
      case 'GET':
        return res.status(200).json({
          success: true,
          data: analyticsStore
        });

      case 'POST':
        // Update analytics data
        const { action, data } = req.body;
        
        // Debug logging
        console.log('📊 Analytics API received:', { action, data });

        switch (action) {
          case 'page_view':
            // Don't track portal pages - only track homepage and public pages
            if (data.path && (data.path.includes('/portal/') || data.path.includes('/admin/'))) {
              // Skip portal page tracking
              break;
            }
            
            analyticsStore.overview.pageViews += 1;
            // Update top pages
            const page = analyticsStore.topPages.find(p => p.path === data.path);
            if (page) {
              page.views += 1;
            } else if (data.path) {
              // Add new page if it doesn't exist
              analyticsStore.topPages.push({
                path: data.path,
                views: 1,
                percentage: 0
              });
            }
            
            // Recalculate page percentages
            const totalPageViews = analyticsStore.overview.pageViews;
            analyticsStore.topPages.forEach(page => {
              page.percentage = totalPageViews > 0 ? (page.views / totalPageViews) * 100 : 0;
            });
            
            break;

          case 'visitor':
            analyticsStore.overview.totalVisitors += 1;
            
            // Update traffic sources and device breakdown based on visitor data
            if (data.source) {
              const source = analyticsStore.trafficSources.find(s => 
                s.source.toLowerCase().includes(data.source.toLowerCase()) ||
                (data.source === 'direct' && s.source.toLowerCase() === 'direct') ||
                (data.source === 'google_search' && s.source.toLowerCase().includes('google')) ||
                (data.source === 'social_media' && s.source.toLowerCase().includes('social')) ||
                (data.source === 'qr_code' && s.source.toLowerCase().includes('qr')) ||
                (data.source === 'referral' && s.source.toLowerCase().includes('referral'))
              );
              if (source) {
                source.visitors += 1;
              }
            }
            
            // Update device breakdown
            if (data.deviceType) {
              const device = analyticsStore.deviceBreakdown.find(d => 
                d.device.toLowerCase() === data.deviceType.toLowerCase()
              );
              if (device && analyticsStore.overview.totalVisitors > 0) {
                // Track device count (simplified approach)
                const deviceCount = Math.floor((device.percentage / 100) * (analyticsStore.overview.totalVisitors - 1)) + 1;
                device.percentage = (deviceCount / analyticsStore.overview.totalVisitors) * 100;
              }
            }
            
            // Recalculate traffic source percentages
            const totalVisitors = analyticsStore.overview.totalVisitors;
            analyticsStore.trafficSources.forEach(source => {
              source.percentage = totalVisitors > 0 ? (source.visitors / totalVisitors) * 100 : 0;
            });
            
            break;

          case 'quote_request':
            analyticsStore.overview.quoteRequests += 1;
            break;

          case 'button_click':
            // Track button clicks for engagement metrics
            break;

          case 'form_submit':
            // Track form submissions
            if (data.formName === 'quote') {
              analyticsStore.overview.quoteRequests += 1;
            }
            break;

          case 'qr_code_scan':
            // Track QR code scans
            const qrEntry = analyticsStore.qrCodeScans.find(qr => 
              qr.type === data.qrCodeType && 
              (!data.employeeName || qr.employeeName === data.employeeName)
            );
            
            if (qrEntry) {
              qrEntry.scans += 1;
            } else {
              // Add new QR code scan entry
              analyticsStore.qrCodeScans.push({
                type: data.qrCodeType || 'Unknown',
                employeeName: data.employeeName,
                scans: 1,
                percentage: 0
              });
            }
            
            // Also track as visitor from QR Code source
            analyticsStore.overview.totalVisitors += 1;
            const qrSource = analyticsStore.trafficSources.find(s => 
              s.source.toLowerCase().includes('qr')
            );
            if (qrSource) {
              qrSource.visitors += 1;
            }
            break;

          case 'login_attempt':
            // Track login attempts
            analyticsStore.overview.totalLoginAttempts += 1;
            
            if (data.success) {
              analyticsStore.overview.successfulLogins += 1;
            }
            
            // Update login success rate
            analyticsStore.overview.loginSuccessRate = 
              analyticsStore.overview.totalLoginAttempts > 0 
                ? (analyticsStore.overview.successfulLogins / analyticsStore.overview.totalLoginAttempts) * 100 
                : 0;
            
            // Track by login type
            if (data.loginType) {
              const loginEntry = analyticsStore.loginAttempts.find(login => 
                login.loginType === data.loginType
              );
              
              if (loginEntry) {
                loginEntry.attempts += 1;
                if (data.success) {
                  loginEntry.successful += 1;
                }
                loginEntry.successRate = (loginEntry.successful / loginEntry.attempts) * 100;
              } else {
                // Add new login type entry
                analyticsStore.loginAttempts.push({
                  loginType: data.loginType,
                  attempts: 1,
                  successful: data.success ? 1 : 0,
                  successRate: data.success ? 100 : 0
                });
              }
            }
            break;

          case 'reset':
            // Reset all analytics to 0
            analyticsStore = getDefaultAnalyticsData();
            saveAnalyticsData(analyticsStore);
            break;

          default:
            return res.status(400).json({ error: 'Invalid action' });
        }

        // Recalculate percentages for top pages
        const totalViews = analyticsStore.topPages.reduce((sum, page) => sum + page.views, 0);
        analyticsStore.topPages.forEach(page => {
          page.percentage = totalViews > 0 ? (page.views / totalViews) * 100 : 0;
        });

        // Recalculate percentages for traffic sources
        const totalTrafficVisitors = analyticsStore.trafficSources.reduce((sum, source) => sum + source.visitors, 0);
        analyticsStore.trafficSources.forEach(source => {
          source.percentage = totalTrafficVisitors > 0 ? (source.visitors / totalTrafficVisitors) * 100 : 0;
        });

        // Normalize device breakdown percentages
        const deviceTotal = analyticsStore.deviceBreakdown.reduce((sum, device) => sum + device.percentage, 0);
        if (deviceTotal > 0) {
          analyticsStore.deviceBreakdown.forEach(device => {
            device.percentage = (device.percentage / deviceTotal) * 100;
          });
        }

        // Recalculate percentages for QR code scans
        const totalQRScans = analyticsStore.qrCodeScans.reduce((sum, qr) => sum + qr.scans, 0);
        analyticsStore.qrCodeScans.forEach(qr => {
          qr.percentage = totalQRScans > 0 ? (qr.scans / totalQRScans) * 100 : 0;
        });

        // Calculate conversion rate
        if (analyticsStore.overview.totalVisitors > 0) {
          analyticsStore.overview.conversionRate = 
            (analyticsStore.overview.quoteRequests / analyticsStore.overview.totalVisitors) * 100;
        }

        // Update historical data and percentage changes
        updateHistoricalData(analyticsStore);
        
        // Save data to file
        saveAnalyticsData(analyticsStore);

        return res.status(200).json({
          success: true,
          message: 'Analytics updated',
          data: analyticsStore
        });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Export with service status check for analytics module
export default withSecurity(withServiceStatusCheck(handler, 'analytics'));