/**
 * JWT Token Management System
 * Comprehensive JWT token creation, validation, and management
 */

import * as crypto from 'crypto';
import {
  JWTPayload,
  JWTHeader,
  JWTConfig,
  TokenType,
  TokenPair,
  DecodedToken,
  User,
  AuthenticationError,
  AuthErrorCode
} from './types';

// JWT Implementation without external dependencies
export class JWTManager {
  private config: JWTConfig;
  private revokedTokens = new Set<string>();
  private refreshTokens = new Map<string, { userId: string; expiresAt: Date }>();

  constructor(config: JWTConfig) {
    this.config = config;
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.secret && !this.config.privateKey) {
      throw new Error('JWT secret or private key is required');
    }
    
    if (this.config.algorithm.startsWith('RS') && !this.config.privateKey) {
      throw new Error('Private key is required for RSA algorithms');
    }
    
    if (this.config.algorithm.startsWith('HS') && !this.config.secret) {
      throw new Error('Secret is required for HMAC algorithms');
    }
  }

  /**
   * Generate a token pair (access + refresh)
   */
  async generateTokenPair(user: User, sessionId?: string): Promise<TokenPair> {
    const accessToken = await this.generateAccessToken(user, sessionId);
    const refreshToken = await this.generateRefreshToken(user, sessionId);
    
    // Store refresh token
    const refreshPayload = this.decodeToken(refreshToken);
    this.refreshTokens.set(refreshToken, {
      userId: user.id,
      expiresAt: new Date(refreshPayload.payload.exp * 1000)
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.accessTokenTTL,
      tokenType: 'Bearer'
    };
  }

  /**
   * Generate access token
   */
  async generateAccessToken(user: User, sessionId?: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.config.accessTokenTTL;

    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map(r => r.name),
      permissions: user.permissions.map(p => p.name),
      iat: now,
      exp: exp,
      aud: this.config.audience,
      iss: this.config.issuer,
      jti: this.generateJTI(),
      type: TokenType.ACCESS,
      sessionId
    };

    return this.signToken(payload);
  }

  /**
   * Generate refresh token
   */
  async generateRefreshToken(user: User, sessionId?: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.config.refreshTokenTTL;

    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map(r => r.name),
      permissions: [], // Refresh tokens don't need permissions
      iat: now,
      exp: exp,
      aud: this.config.audience,
      iss: this.config.issuer,
      jti: this.generateJTI(),
      type: TokenType.REFRESH,
      sessionId
    };

    return this.signToken(payload);
  }

  /**
   * Generate email verification token
   */
  async generateEmailVerificationToken(user: User): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.config.emailVerificationTTL;

    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      roles: [],
      permissions: [],
      iat: now,
      exp: exp,
      aud: this.config.audience,
      iss: this.config.issuer,
      jti: this.generateJTI(),
      type: TokenType.EMAIL_VERIFICATION
    };

    return this.signToken(payload);
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(user: User): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.config.passwordResetTTL;

    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      roles: [],
      permissions: [],
      iat: now,
      exp: exp,
      aud: this.config.audience,
      iss: this.config.issuer,
      jti: this.generateJTI(),
      type: TokenType.PASSWORD_RESET
    };

    return this.signToken(payload);
  }

  /**
   * Validate and decode token
   */
  async validateToken(token: string): Promise<DecodedToken> {
    try {
      const decoded = this.decodeToken(token);
      
      // Check if token is revoked
      if (this.revokedTokens.has(decoded.payload.jti)) {
        throw new AuthenticationError(
          'Token has been revoked',
          AuthErrorCode.TOKEN_REVOKED
        );
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (decoded.payload.exp < now) {
        throw new AuthenticationError(
          'Token has expired',
          AuthErrorCode.TOKEN_EXPIRED
        );
      }

      // Verify signature
      const isValid = await this.verifySignature(token);
      if (!isValid) {
        throw new AuthenticationError(
          'Invalid token signature',
          AuthErrorCode.TOKEN_INVALID
        );
      }

      decoded.isValid = true;
      decoded.isExpired = false;
      decoded.expiresAt = new Date(decoded.payload.exp * 1000);

      return decoded;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      
      throw new AuthenticationError(
        'Invalid token format',
        AuthErrorCode.TOKEN_INVALID
      );
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    const decoded = await this.validateToken(refreshToken);
    
    if (decoded.payload.type !== TokenType.REFRESH) {
      throw new AuthenticationError(
        'Invalid token type for refresh',
        AuthErrorCode.TOKEN_INVALID
      );
    }

    // Check if refresh token exists in our store
    const tokenData = this.refreshTokens.get(refreshToken);
    if (!tokenData) {
      throw new AuthenticationError(
        'Refresh token not found',
        AuthErrorCode.TOKEN_INVALID
      );
    }

    // Remove old refresh token
    this.refreshTokens.delete(refreshToken);
    
    // Would need to fetch user from database in real implementation
    // For now, create minimal user object from token
    const user: User = {
      id: decoded.payload.sub,
      email: decoded.payload.email,
      roles: [], // Would be fetched from DB
      permissions: [], // Would be fetched from DB
      isActive: true,
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return this.generateTokenPair(user, decoded.payload.sessionId);
  }

  /**
   * Revoke a token
   */
  async revokeToken(token: string): Promise<void> {
    const decoded = this.decodeToken(token);
    this.revokedTokens.add(decoded.payload.jti);
    
    // If it's a refresh token, remove from store
    if (decoded.payload.type === TokenType.REFRESH) {
      this.refreshTokens.delete(token);
    }
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllTokensForUser(userId: string): Promise<void> {
    // Add all refresh tokens for this user to revoked list
    for (const [token, data] of this.refreshTokens.entries()) {
      if (data.userId === userId) {
        const decoded = this.decodeToken(token);
        this.revokedTokens.add(decoded.payload.jti);
        this.refreshTokens.delete(token);
      }
    }
  }

  /**
   * Clean up expired tokens
   */
  cleanupExpiredTokens(): void {
    const now = new Date();
    
    // Clean up expired refresh tokens
    for (const [token, data] of this.refreshTokens.entries()) {
      if (data.expiresAt < now) {
        this.refreshTokens.delete(token);
      }
    }

    // Clean up old revoked tokens (keep for 24 hours)
    const cutoff = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    const revokedToRemove: string[] = [];
    
    for (const jti of this.revokedTokens) {
      try {
        // Try to decode the JTI to get timestamp
        const parts = jti.split('_');
        if (parts.length >= 2) {
          const timestamp = parseInt(parts[1], 10);
          if (timestamp < cutoff) {
            revokedToRemove.push(jti);
          }
        }
      } catch {
        // If we can't parse, keep it for safety
      }
    }
    
    revokedToRemove.forEach(jti => this.revokedTokens.delete(jti));
  }

  /**
   * Get token information without validation
   */
  decodeToken(token: string): DecodedToken {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }

    const header = this.base64UrlDecode(parts[0]);
    const payload = this.base64UrlDecode(parts[1]);

    const parsedHeader: JWTHeader = JSON.parse(header);
    const parsedPayload: JWTPayload = JSON.parse(payload);

    const now = Math.floor(Date.now() / 1000);
    const isExpired = parsedPayload.exp < now;

    return {
      header: parsedHeader,
      payload: parsedPayload,
      isValid: false, // Will be set during validation
      isExpired,
      expiresAt: new Date(parsedPayload.exp * 1000)
    };
  }

  /**
   * Sign a JWT payload
   */
  private async signToken(payload: JWTPayload): Promise<string> {
    const header: JWTHeader = {
      alg: this.config.algorithm,
      typ: 'JWT'
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signature = await this.createSignature(signingInput);
    const encodedSignature = this.base64UrlEncode(signature);

    return `${signingInput}.${encodedSignature}`;
  }

  /**
   * Create signature for token
   */
  private async createSignature(signingInput: string): Promise<string> {
    if (this.config.algorithm.startsWith('HS')) {
      // HMAC signatures
      const hmac = crypto.createHmac(
        this.config.algorithm.replace('HS', 'sha'),
        this.config.secret
      );
      hmac.update(signingInput);
      return hmac.digest('base64');
    } else if (this.config.algorithm.startsWith('RS')) {
      // RSA signatures
      const sign = crypto.createSign(
        this.config.algorithm.replace('RS', 'RSA-SHA')
      );
      sign.update(signingInput);
      return sign.sign(this.config.privateKey!, 'base64');
    } else {
      throw new Error(`Unsupported algorithm: ${this.config.algorithm}`);
    }
  }

  /**
   * Verify token signature
   */
  private async verifySignature(token: string): Promise<boolean> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    const signingInput = `${parts[0]}.${parts[1]}`;
    const signature = this.base64UrlDecode(parts[2]);

    try {
      if (this.config.algorithm.startsWith('HS')) {
        // HMAC verification
        const expectedSignature = await this.createSignature(signingInput);
        return crypto.timingSafeEqual(
          Buffer.from(signature, 'base64'),
          Buffer.from(expectedSignature, 'base64')
        );
      } else if (this.config.algorithm.startsWith('RS')) {
        // RSA verification
        const verify = crypto.createVerify(
          this.config.algorithm.replace('RS', 'RSA-SHA')
        );
        verify.update(signingInput);
        return verify.verify(this.config.publicKey!, signature, 'base64');
      } else {
        return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Generate unique JWT ID
   */
  private generateJTI(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}_${random}`;
  }

  /**
   * Base64 URL encode
   */
  private base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Base64 URL decode
   */
  private base64UrlDecode(str: string): string {
    str += new Array(5 - str.length % 4).join('=');
    return Buffer.from(str.replace(/\-/g, '+').replace(/_/g, '/'), 'base64').toString();
  }

  /**
   * Get statistics about tokens
   */
  getTokenStats(): {
    revokedTokens: number;
    activeRefreshTokens: number;
    refreshTokensByUser: Record<string, number>;
  } {
    const refreshTokensByUser: Record<string, number> = {};
    
    for (const data of this.refreshTokens.values()) {
      refreshTokensByUser[data.userId] = (refreshTokensByUser[data.userId] || 0) + 1;
    }

    return {
      revokedTokens: this.revokedTokens.size,
      activeRefreshTokens: this.refreshTokens.size,
      refreshTokensByUser
    };
  }
}

// JWT Utility Functions
export class JWTUtils {
  /**
   * Extract token from Authorization header
   */
  static extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Extract token from cookie
   */
  static extractTokenFromCookie(cookies: Record<string, string>, cookieName: string = 'accessToken'): string | null {
    return cookies[cookieName] || null;
  }

  /**
   * Create authorization header
   */
  static createAuthorizationHeader(token: string): string {
    return `Bearer ${token}`;
  }

  /**
   * Check if token is close to expiry
   */
  static isTokenCloseToExpiry(token: DecodedToken, thresholdMinutes: number = 5): boolean {
    const now = Date.now();
    const expiryTime = token.expiresAt.getTime();
    const thresholdMs = thresholdMinutes * 60 * 1000;
    
    return (expiryTime - now) <= thresholdMs;
  }

  /**
   * Get time until token expires
   */
  static getTimeUntilExpiry(token: DecodedToken): number {
    return Math.max(0, token.expiresAt.getTime() - Date.now());
  }

  /**
   * Validate email from token
   */
  static validateEmailToken(token: DecodedToken, expectedEmail: string): boolean {
    return token.payload.type === TokenType.EMAIL_VERIFICATION &&
           token.payload.email === expectedEmail &&
           !token.isExpired;
  }

  /**
   * Validate password reset token
   */
  static validatePasswordResetToken(token: DecodedToken, expectedEmail: string): boolean {
    return token.payload.type === TokenType.PASSWORD_RESET &&
           token.payload.email === expectedEmail &&
           !token.isExpired;
  }
}

// Default JWT configuration
export const DEFAULT_JWT_CONFIG: Partial<JWTConfig> = {
  algorithm: 'HS256',
  accessTokenTTL: 15 * 60, // 15 minutes
  refreshTokenTTL: 7 * 24 * 60 * 60, // 7 days
  emailVerificationTTL: 24 * 60 * 60, // 24 hours
  passwordResetTTL: 60 * 60, // 1 hour
  issuer: 'vsr-landing',
  audience: 'vsr-users'
};