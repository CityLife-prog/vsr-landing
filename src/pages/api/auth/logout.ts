/**
 * Logout API Endpoint
 * SECURITY: Uses secure cookie management for proper session termination
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { secureCookieManager } from '../../../lib/secure-cookie-auth';
import { simpleAuthService } from '../../../services/SimpleAuthService';

async function logoutHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} not allowed`,
      error: 'METHOD_NOT_ALLOWED'
    });
  }

  try {
    // Get authentication from cookies
    const authResult = secureCookieManager.getAuthFromCookies(req);
    
    if (authResult.success && authResult.sessionId) {
      // Logout from the authentication service
      await simpleAuthService.logout(`mock_token_${authResult.sessionId}`);
      
      console.log(`User logged out: Session ${authResult.sessionId}`);
    }

    // Clear authentication cookies
    secureCookieManager.clearAuthCookies(res);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    
    // Clear cookies even on error
    secureCookieManager.clearAuthCookies(res);
    
    return res.status(500).json({
      success: false,
      message: 'Logout failed due to server error'
    });
  }
}

// Export secure logout handler
export default logoutHandler;