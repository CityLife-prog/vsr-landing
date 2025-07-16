/**
 * Client-side Analytics Tracking Utility
 * Tracks user interactions and sends data to analytics API
 */

interface AnalyticsEvent {
  action: 'page_view' | 'visitor' | 'quote_request' | 'button_click' | 'form_submit' | 'qr_code_scan' | 'login_attempt';
  data?: {
    path?: string;
    referrer?: string;
    userAgent?: string;
    timestamp?: string;
    buttonText?: string;
    formName?: string;
    deviceType?: string;
    source?: string;
    qrCodeType?: string;
    employeeName?: string;
    loginType?: string;
    success?: boolean;
  };
}

class AnalyticsTracker {
  private sessionId: string;
  private hasTrackedVisitor: boolean = false;
  private baseUrl: string;

  constructor() {
    // Generate session ID
    this.sessionId = this.generateSessionId();
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    // Track visitor on first load
    if (typeof window !== 'undefined' && !this.hasTrackedVisitor) {
      this.trackVisitor();
      this.hasTrackedVisitor = true;
    }
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getDeviceType(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private getTrafficSource(): string {
    if (typeof window === 'undefined') return 'direct';
    
    // Check for QR code parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('qr') || urlParams.get('source') === 'qr') {
      return 'qr_code';
    }
    
    const referrer = document.referrer;
    if (!referrer) return 'direct';
    
    const hostname = new URL(referrer).hostname;
    
    if (hostname.includes('google')) return 'google_search';
    if (hostname.includes('facebook') || hostname.includes('twitter') || hostname.includes('instagram') || hostname.includes('linkedin')) return 'social_media';
    if (hostname !== window.location.hostname) return 'referral';
    
    return 'direct';
  }

  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Show in console for development
      if (process.env.NODE_ENV !== 'production') {
        console.log('📊 Analytics Event:', event);
      }

      // Send to server in production or when explicitly enabled
      if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true') {
        console.log('📊 Sending analytics event to server:', event);
        const response = await fetch('/api/admin/analytics', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event)
        });
        
        if (response.ok) {
          console.log('📊 Analytics event sent successfully');
        } else {
          console.error('📊 Analytics event failed:', response.status, response.statusText);
        }
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }

  trackPageView(path?: string): void {
    if (typeof window === 'undefined') return;
    
    const currentPath = path || window.location.pathname;
    
    // Don't track portal pages - only track homepage and public pages
    if (currentPath.includes('/portal/') || currentPath.includes('/admin/')) {
      return;
    }
    
    // Prevent duplicate page view tracking in the same session for the same path
    const sessionKey = `analytics_page_${currentPath}_${Date.now()}`;
    const recentTrack = sessionStorage.getItem(`analytics_recent_page`);
    const currentTime = Date.now();
    
    if (recentTrack) {
      const [lastPath, lastTime] = recentTrack.split('|');
      // Only track if it's a different page or more than 5 seconds have passed
      if (lastPath === currentPath && currentTime - parseInt(lastTime) < 5000) {
        return;
      }
    }
    
    sessionStorage.setItem('analytics_recent_page', `${currentPath}|${currentTime}`);
    
    this.sendEvent({
      action: 'page_view',
      data: {
        path: currentPath,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        deviceType: this.getDeviceType(),
        source: this.getTrafficSource()
      }
    });
  }

  trackVisitor(): void {
    if (typeof window === 'undefined') return;
    
    // Check if we've already tracked this visitor in this session
    const trackedInSession = sessionStorage.getItem('analytics_visitor_tracked');
    if (trackedInSession) return;
    
    this.sendEvent({
      action: 'visitor',
      data: {
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        deviceType: this.getDeviceType(),
        source: this.getTrafficSource()
      }
    });
    
    // Mark as tracked for this session
    sessionStorage.setItem('analytics_visitor_tracked', 'true');
  }

  trackQuoteRequest(): void {
    this.sendEvent({
      action: 'quote_request',
      data: {
        timestamp: new Date().toISOString(),
        deviceType: this.getDeviceType()
      }
    });
  }

  trackButtonClick(buttonText: string): void {
    this.sendEvent({
      action: 'button_click',
      data: {
        buttonText,
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        timestamp: new Date().toISOString(),
        deviceType: this.getDeviceType()
      }
    });
  }

  trackFormSubmit(formName: string): void {
    this.sendEvent({
      action: 'form_submit',
      data: {
        formName,
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        timestamp: new Date().toISOString(),
        deviceType: this.getDeviceType()
      }
    });
  }

  trackQRCodeScan(qrCodeType: string, employeeName?: string): void {
    this.sendEvent({
      action: 'qr_code_scan',
      data: {
        qrCodeType,
        employeeName,
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        referrer: typeof window !== 'undefined' ? document.referrer : '',
        timestamp: new Date().toISOString(),
        deviceType: this.getDeviceType(),
        source: this.getTrafficSource()
      }
    });
  }

  trackLoginAttempt(loginType: string, success: boolean): void {
    this.sendEvent({
      action: 'login_attempt',
      data: {
        loginType,
        success,
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        timestamp: new Date().toISOString(),
        deviceType: this.getDeviceType()
      }
    });
  }
}

// Create singleton instance
const analytics = new AnalyticsTracker();

export default analytics;