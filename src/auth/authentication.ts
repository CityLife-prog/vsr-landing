/**
 * Authentication Service
 * Core authentication logic with session management
 */

import * as crypto from 'crypto';
import {
  User,
  Session,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  ChangePasswordRequest,
  ResetPasswordRequest,
  ResetPasswordConfirmRequest,
  AuthenticationResult,
  TokenPair,
  DecodedToken,
  AuthenticationService,
  SessionService,
  UserService,
  SecurityService,
  DeviceInfo,
  AuthenticationError,
  AuthErrorCode,
  SecurityEvent,
  SecurityEventType,
  SecuritySeverity,
  AuthConfig
} from './types';
import { JWTManager } from './jwt';
import { PasswordManager } from './password';

export class AuthenticationServiceImpl implements AuthenticationService {
  private jwtManager: JWTManager;
  private passwordManager: PasswordManager;
  private config: AuthConfig;

  constructor(
    config: AuthConfig,
    private userService: UserService,
    private sessionService: SessionService,
    private securityService: SecurityService
  ) {
    this.config = config;
    this.jwtManager = new JWTManager(config.jwt);
    this.passwordManager = new PasswordManager(config.password);
  }

  /**
   * Authenticate user with email and password
   */
  async login(request: LoginRequest): Promise<AuthenticationResult> {
    const startTime = Date.now();
    
    try {
      // Rate limiting check
      const rateLimitKey = `login:${request.email}:${request.deviceInfo?.ip}`;
      if (await this.securityService.isRateLimited(rateLimitKey)) {
        await this.logSecurityEvent({
          type: SecurityEventType.RATE_LIMIT_EXCEEDED,
          ip: request.deviceInfo?.ip || 'unknown',
          userAgent: request.deviceInfo?.userAgent || 'unknown',
          timestamp: new Date(),
          details: { email: request.email, rateLimitKey },
          severity: SecuritySeverity.MEDIUM
        });

        throw new AuthenticationError(
          'Too many login attempts. Please try again later.',
          AuthErrorCode.RATE_LIMITED
        );
      }

      // Find user by email
      const user = await this.userService.findByEmail(request.email);
      if (!user) {
        await this.incrementRateLimit(rateLimitKey);
        await this.logSecurityEvent({
          type: SecurityEventType.LOGIN_FAILURE,
          ip: request.deviceInfo?.ip || 'unknown',
          userAgent: request.deviceInfo?.userAgent || 'unknown',
          timestamp: new Date(),
          details: { email: request.email, reason: 'User not found' },
          severity: SecuritySeverity.LOW
        });

        throw new AuthenticationError(
          'Invalid email or password',
          AuthErrorCode.INVALID_CREDENTIALS
        );
      }

      // Check if account is locked
      if (await this.securityService.isAccountLocked(user.id)) {
        await this.logSecurityEvent({
          type: SecurityEventType.LOGIN_FAILURE,
          userId: user.id,
          ip: request.deviceInfo?.ip || 'unknown',
          userAgent: request.deviceInfo?.userAgent || 'unknown',
          timestamp: new Date(),
          details: { email: request.email, reason: 'Account locked' },
          severity: SecuritySeverity.HIGH
        });

        throw new AuthenticationError(
          'Account is locked due to security reasons',
          AuthErrorCode.ACCOUNT_LOCKED
        );
      }

      // Check if account is active
      if (!user.isActive) {
        await this.logSecurityEvent({
          type: SecurityEventType.LOGIN_FAILURE,
          userId: user.id,
          ip: request.deviceInfo?.ip || 'unknown',
          userAgent: request.deviceInfo?.userAgent || 'unknown',
          timestamp: new Date(),
          details: { email: request.email, reason: 'Account disabled' },
          severity: SecuritySeverity.MEDIUM
        });

        throw new AuthenticationError(
          'Account is disabled',
          AuthErrorCode.ACCOUNT_DISABLED
        );
      }

      // Verify password
      const isValidPassword = await this.passwordManager.verifyPassword(
        request.password,
        user.id // Assuming password hash is stored and retrieved by user service
      );

      if (!isValidPassword) {
        await this.incrementRateLimit(rateLimitKey);
        
        // Check for brute force attempt
        const attempts = await this.securityService.incrementRateLimit(`failed_login:${user.id}`);
        if (attempts >= this.config.password.maxAttempts) {
          await this.securityService.lockAccount(user.id, 'Too many failed login attempts');
          
          await this.logSecurityEvent({
            type: SecurityEventType.ACCOUNT_LOCKED,
            userId: user.id,
            ip: request.deviceInfo?.ip || 'unknown',
            userAgent: request.deviceInfo?.userAgent || 'unknown',
            timestamp: new Date(),
            details: { email: request.email, attempts },
            severity: SecuritySeverity.HIGH
          });
        }

        await this.logSecurityEvent({
          type: SecurityEventType.LOGIN_FAILURE,
          userId: user.id,
          ip: request.deviceInfo?.ip || 'unknown',
          userAgent: request.deviceInfo?.userAgent || 'unknown',
          timestamp: new Date(),
          details: { email: request.email, reason: 'Invalid password', attempts },
          severity: SecuritySeverity.MEDIUM
        });

        throw new AuthenticationError(
          'Invalid email or password',
          AuthErrorCode.INVALID_CREDENTIALS
        );
      }

      // Check email verification if required
      if (!user.isEmailVerified && this.config.security.requireEmailVerification) {
        throw new AuthenticationError(
          'Email verification required',
          AuthErrorCode.EMAIL_NOT_VERIFIED
        );
      }

      // Create session
      const session = await this.createSession(user, request.deviceInfo);

      // Generate tokens
      const tokens = await this.jwtManager.generateTokenPair(user, session.id);

      // Update user last login
      await this.userService.update(user.id, {
        lastLoginAt: new Date()
      });

      // Log successful login
      await this.logSecurityEvent({
        type: SecurityEventType.LOGIN_SUCCESS,
        userId: user.id,
        sessionId: session.id,
        ip: request.deviceInfo?.ip || 'unknown',
        userAgent: request.deviceInfo?.userAgent || 'unknown',
        timestamp: new Date(),
        details: { 
          email: request.email,
          duration: Date.now() - startTime,
          rememberMe: request.rememberMe
        },
        severity: SecuritySeverity.LOW
      });

      // Clean up login attempt tracking is handled by security service internally

      return {
        success: true,
        user,
        session,
        tokens
      };

    } catch (error) {
      if (error instanceof AuthenticationError) {
        return {
          success: false,
          error
        };
      }

      // Log unexpected error
      await this.logSecurityEvent({
        type: SecurityEventType.LOGIN_FAILURE,
        ip: request.deviceInfo?.ip || 'unknown',
        userAgent: request.deviceInfo?.userAgent || 'unknown',
        timestamp: new Date(),
        details: { 
          email: request.email,
          error: error instanceof Error ? error.message : String(error)
        },
        severity: SecuritySeverity.HIGH
      });

      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(request: RegisterRequest): Promise<RegisterResponse> {
    try {
      // Check if user already exists
      const existingUser = await this.userService.findByEmail(request.email);
      if (existingUser) {
        throw new AuthenticationError(
          'User with this email already exists',
          AuthErrorCode.EMAIL_ALREADY_EXISTS
        );
      }

      // Validate password
      const passwordValidation = await this.passwordManager.validatePassword(request.password);
      if (!passwordValidation.isValid) {
        throw new AuthenticationError(
          `Password validation failed: ${passwordValidation.errors.join(', ')}`,
          AuthErrorCode.PASSWORD_TOO_WEAK,
          { errors: passwordValidation.errors }
        );
      }

      // Hash password
      const passwordHash = await this.passwordManager.hashPassword(request.password);

      // Create user
      const userData: Partial<User> = {
        email: request.email,
        username: request.username,
        firstName: request.firstName,
        lastName: request.lastName,
        isActive: true,
        isEmailVerified: false,
        roles: [], // Will be assigned default role
        permissions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const user = await this.userService.create(userData);

      // Store password hash (implementation depends on your storage strategy)
      await this.passwordManager.storePasswordHash(user.id, passwordHash);

      // Generate email verification token if required
      let requiresEmailVerification = false;
      if (this.config.security.requireEmailVerification) {
        const verificationToken = await this.jwtManager.generateEmailVerificationToken(user);
        // Send verification email (implementation depends on your email service)
        await this.sendVerificationEmail(user.email, verificationToken);
        requiresEmailVerification = true;
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        requiresEmailVerification,
        message: requiresEmailVerification 
          ? 'Account created successfully. Please check your email for verification.'
          : 'Account created successfully.'
      };

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      throw new AuthenticationError(
        'Registration failed',
        AuthErrorCode.REGISTRATION_FAILED,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Logout user and invalidate session
   */
  async logout(sessionId: string): Promise<void> {
    try {
      // Find and delete session
      const session = await this.sessionService.findById(sessionId);
      if (session) {
        await this.sessionService.delete(sessionId);

        // Revoke all tokens for this session
        await this.jwtManager.revokeAllTokensForUser(session.userId);

        // Log logout event
        await this.logSecurityEvent({
          type: SecurityEventType.LOGOUT,
          userId: session.userId,
          sessionId: session.id,
          ip: session.deviceInfo.ip,
          userAgent: session.deviceInfo.userAgent,
          timestamp: new Date(),
          details: { sessionDuration: Date.now() - session.createdAt.getTime() },
          severity: SecuritySeverity.LOW
        });
      }
    } catch (error) {
      // Log error but don't throw - logout should always succeed
      console.error('Logout error:', error);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(request: RefreshTokenRequest): Promise<TokenPair> {
    try {
      const newTokens = await this.jwtManager.refreshAccessToken(request.refreshToken);

      // Log token refresh
      const decoded = this.jwtManager.decodeToken(request.refreshToken);
      await this.logSecurityEvent({
        type: SecurityEventType.TOKEN_REFRESH,
        userId: decoded.payload.sub,
        sessionId: decoded.payload.sessionId,
        ip: 'unknown', // Would need to be passed from request
        userAgent: 'unknown', // Would need to be passed from request
        timestamp: new Date(),
        details: { tokenType: 'refresh' },
        severity: SecuritySeverity.LOW
      });

      return newTokens;
    } catch {
      throw new AuthenticationError(
        'Token refresh failed',
        AuthErrorCode.TOKEN_INVALID
      );
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, request: ChangePasswordRequest): Promise<void> {
    try {
      // Verify current password
      const isValidCurrentPassword = await this.passwordManager.verifyPassword(
        request.currentPassword,
        userId
      );

      if (!isValidCurrentPassword) {
        throw new AuthenticationError(
          'Current password is incorrect',
          AuthErrorCode.INVALID_CREDENTIALS
        );
      }

      // Validate new password
      const passwordValidation = await this.passwordManager.validatePassword(request.newPassword);
      if (!passwordValidation.isValid) {
        throw new AuthenticationError(
          `Password validation failed: ${passwordValidation.errors.join(', ')}`,
          AuthErrorCode.PASSWORD_TOO_WEAK,
          { errors: passwordValidation.errors }
        );
      }

      // Check password reuse
      const isPasswordReused = await this.passwordManager.isPasswordReused(
        userId,
        request.newPassword
      );
      
      if (isPasswordReused) {
        throw new AuthenticationError(
          'Cannot reuse a recent password',
          AuthErrorCode.PASSWORD_REUSE
        );
      }

      // Hash new password
      const newPasswordHash = await this.passwordManager.hashPassword(request.newPassword);

      // Update password
      await this.passwordManager.storePasswordHash(userId, newPasswordHash);

      // Revoke all existing tokens to force re-authentication
      await this.jwtManager.revokeAllTokensForUser(userId);

      // Log password change
      await this.logSecurityEvent({
        type: SecurityEventType.PASSWORD_CHANGE,
        userId: userId,
        ip: 'unknown', // Would need to be passed from request
        userAgent: 'unknown', // Would need to be passed from request
        timestamp: new Date(),
        details: { method: 'user_initiated' },
        severity: SecuritySeverity.MEDIUM
      });

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      throw new AuthenticationError(
        'Password change failed',
        AuthErrorCode.PASSWORD_CHANGE_FAILED
      );
    }
  }

  /**
   * Request password reset
   */
  async resetPassword(request: ResetPasswordRequest): Promise<void> {
    try {
      const user = await this.userService.findByEmail(request.email);
      if (!user) {
        // Don't reveal if email exists
        return;
      }

      // Generate password reset token
      const resetToken = await this.jwtManager.generatePasswordResetToken(user);

      // Send reset email (implementation depends on your email service)
      await this.sendPasswordResetEmail(user.email, resetToken);

      // Log password reset request
      await this.logSecurityEvent({
        type: SecurityEventType.PASSWORD_RESET,
        userId: user.id,
        ip: 'unknown', // Would need to be passed from request
        userAgent: 'unknown', // Would need to be passed from request
        timestamp: new Date(),
        details: { email: request.email, method: 'email' },
        severity: SecuritySeverity.MEDIUM
      });

    } catch (error) {
      // Don't throw errors to prevent email enumeration
      console.error('Password reset error:', error);
    }
  }

  /**
   * Confirm password reset with token
   */
  async confirmResetPassword(request: ResetPasswordConfirmRequest): Promise<void> {
    try {
      // Validate reset token
      const decoded = await this.jwtManager.validateToken(request.token);
      
      if (decoded.payload.type !== 'password_reset') {
        throw new AuthenticationError(
          'Invalid reset token',
          AuthErrorCode.TOKEN_INVALID
        );
      }

      const userId = decoded.payload.sub;
      const userEmail = decoded.payload.email;

      // Validate new password
      const passwordValidation = await this.passwordManager.validatePassword(request.newPassword);
      if (!passwordValidation.isValid) {
        throw new AuthenticationError(
          `Password validation failed: ${passwordValidation.errors.join(', ')}`,
          AuthErrorCode.PASSWORD_TOO_WEAK,
          { errors: passwordValidation.errors }
        );
      }

      // Hash new password
      const newPasswordHash = await this.passwordManager.hashPassword(request.newPassword);

      // Update password
      await this.passwordManager.storePasswordHash(userId, newPasswordHash);

      // Revoke the reset token
      await this.jwtManager.revokeToken(request.token);

      // Revoke all existing tokens
      await this.jwtManager.revokeAllTokensForUser(userId);

      // Unlock account if it was locked
      await this.securityService.unlockAccount(userId);

      // Log password reset completion
      await this.logSecurityEvent({
        type: SecurityEventType.PASSWORD_RESET,
        userId: userId,
        ip: 'unknown', // Would need to be passed from request
        userAgent: 'unknown', // Would need to be passed from request
        timestamp: new Date(),
        details: { email: userEmail, method: 'token_confirmation' },
        severity: SecuritySeverity.MEDIUM
      });

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      throw new AuthenticationError(
        'Password reset confirmation failed',
        AuthErrorCode.PASSWORD_RESET_FAILED
      );
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      // Validate verification token
      const decoded = await this.jwtManager.validateToken(token);
      
      if (decoded.payload.type !== 'email_verification') {
        throw new AuthenticationError(
          'Invalid verification token',
          AuthErrorCode.TOKEN_INVALID
        );
      }

      const userId = decoded.payload.sub;

      // Update user email verification status
      await this.userService.update(userId, {
        isEmailVerified: true
      });

      // Revoke the verification token
      await this.jwtManager.revokeToken(token);

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      throw new AuthenticationError(
        'Email verification failed',
        AuthErrorCode.EMAIL_VERIFICATION_FAILED
      );
    }
  }

  /**
   * Validate token
   */
  async validateToken(token: string): Promise<DecodedToken> {
    return this.jwtManager.validateToken(token);
  }

  /**
   * Revoke token
   */
  async revokeToken(token: string): Promise<void> {
    await this.jwtManager.revokeToken(token);

    // Log token revocation
    const decoded = this.jwtManager.decodeToken(token);
    await this.logSecurityEvent({
      type: SecurityEventType.TOKEN_REVOKED,
      userId: decoded.payload.sub,
      sessionId: decoded.payload.sessionId,
      ip: 'unknown', // Would need to be passed from request
      userAgent: 'unknown', // Would need to be passed from request
      timestamp: new Date(),
      details: { tokenType: decoded.payload.type },
      severity: SecuritySeverity.LOW
    });
  }

  /**
   * Revoke all tokens for user
   */
  async revokeAllTokens(userId: string): Promise<void> {
    await this.jwtManager.revokeAllTokensForUser(userId);

    // Delete all sessions for user
    await this.sessionService.deleteByUserId(userId);

    // Log mass token revocation
    await this.logSecurityEvent({
      type: SecurityEventType.TOKEN_REVOKED,
      userId: userId,
      ip: 'unknown', // Would need to be passed from request
      userAgent: 'unknown', // Would need to be passed from request
      timestamp: new Date(),
      details: { tokenType: 'all', reason: 'security_action' },
      severity: SecuritySeverity.HIGH
    });
  }

  /**
   * Create session for user
   */
  private async createSession(user: User, deviceInfo?: DeviceInfo): Promise<Session> {
    // Check concurrent session limit
    if (this.config.session.maxConcurrentSessions > 0) {
      const existingSessions = await this.sessionService.findByUserId(user.id);
      
      if (existingSessions.length >= this.config.session.maxConcurrentSessions) {
        // Remove oldest sessions
        const sessionsToRemove = existingSessions
          .sort((a, b) => a.lastActiveAt.getTime() - b.lastActiveAt.getTime())
          .slice(0, existingSessions.length - this.config.session.maxConcurrentSessions + 1);
        
        for (const session of sessionsToRemove) {
          await this.sessionService.delete(session.id);
        }
      }
    }

    const sessionData: Partial<Session> = {
      userId: user.id,
      deviceInfo: deviceInfo || {
        userAgent: 'unknown',
        ip: 'unknown'
      },
      createdAt: new Date(),
      lastActiveAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.jwt.refreshTokenTTL * 1000),
      isActive: true
    };

    return this.sessionService.create(sessionData);
  }

  /**
   * Log security event
   */
  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      await this.securityService.logEvent(event);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Increment rate limit counter
   */
  private async incrementRateLimit(key: string): Promise<void> {
    try {
      await this.securityService.incrementRateLimit(key);
    } catch (error) {
      console.error('Failed to increment rate limit:', error);
    }
  }

  /**
   * Send verification email (placeholder)
   */
  private async sendVerificationEmail(email: string, token: string): Promise<void> {
    // Implementation would depend on your email service
    console.log(`Verification email would be sent to ${email} with token: ${token}`);
  }

  /**
   * Send password reset email (placeholder)
   */
  private async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // Implementation would depend on your email service
    console.log(`Password reset email would be sent to ${email} with token: ${token}`);
  }
}

// Session Manager
export class SessionManager implements SessionService {
  private sessions = new Map<string, Session>();

  async create(sessionData: Partial<Session>): Promise<Session> {
    const session: Session = {
      id: this.generateSessionId(),
      userId: sessionData.userId!,
      deviceInfo: sessionData.deviceInfo!,
      createdAt: sessionData.createdAt || new Date(),
      lastActiveAt: sessionData.lastActiveAt || new Date(),
      expiresAt: sessionData.expiresAt!,
      isActive: sessionData.isActive ?? true,
      metadata: sessionData.metadata
    };

    this.sessions.set(session.id, session);
    return session;
  }

  async findById(id: string): Promise<Session | null> {
    return this.sessions.get(id) || null;
  }

  async findByUserId(userId: string): Promise<Session[]> {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId && session.isActive);
  }

  async update(id: string, sessionData: Partial<Session>): Promise<Session> {
    const existingSession = this.sessions.get(id);
    if (!existingSession) {
      throw new Error('Session not found');
    }

    const updatedSession = { ...existingSession, ...sessionData };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async delete(id: string): Promise<void> {
    this.sessions.delete(id);
  }

  async deleteExpired(): Promise<number> {
    const now = new Date();
    let deletedCount = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async deleteByUserId(userId: string): Promise<number> {
    let deletedCount = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  }
}