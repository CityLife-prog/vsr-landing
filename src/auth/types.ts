/**
 * Authentication System Types
 * Core types and interfaces for JWT, RBAC, and security
 */

// User and Authentication Types
export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  roles: Role[];
  permissions: Permission[];
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: unknown;
}

// JWT Types
export interface JWTPayload {
  sub: string; // Subject (user ID)
  email: string;
  roles: string[];
  permissions: string[];
  iat: number; // Issued at
  exp: number; // Expiration
  aud: string; // Audience
  iss: string; // Issuer
  jti: string; // JWT ID
  type: TokenType;
  sessionId?: string;
}

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  API_KEY = 'api_key'
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface DecodedToken {
  payload: JWTPayload;
  header: JWTHeader;
  isValid: boolean;
  isExpired: boolean;
  expiresAt: Date;
}

export interface JWTHeader {
  alg: string;
  typ: string;
  kid?: string;
}

// Authentication Configuration
export interface AuthConfig {
  jwt: JWTConfig;
  password: PasswordConfig;
  session: SessionConfig;
  security: SecurityConfig;
  rbac: RBACConfig;
}

export interface JWTConfig {
  secret: string;
  publicKey?: string;
  privateKey?: string;
  algorithm: 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512';
  issuer: string;
  audience: string;
  accessTokenTTL: number; // in seconds
  refreshTokenTTL: number; // in seconds
  emailVerificationTTL: number;
  passwordResetTTL: number;
}

export interface PasswordConfig {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  hashRounds: number;
  maxAttempts: number;
  lockoutDuration: number; // in seconds
}

export interface SessionConfig {
  maxConcurrentSessions: number;
  slidingExpiration: boolean;
  requireReauth: boolean;
  reauthInterval: number; // in seconds
  trackDevices: boolean;
}

export interface SecurityConfig {
  rateLimiting: RateLimitConfig;
  bruteForceProtection: BruteForceConfig;
  cors: CORSConfig;
  csrf: CSRFConfig;
  encryption: EncryptionConfig;
  requireEmailVerification?: boolean;
}

export interface RateLimitConfig {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests: boolean;
  skipFailedRequests: boolean;
  keyGenerator?: (req: unknown) => string;
}

export interface BruteForceConfig {
  enabled: boolean;
  freeRetries: number;
  minWait: number;
  maxWait: number;
  lifetime: number;
}

export interface CORSConfig {
  enabled: boolean;
  origin: string | string[] | boolean;
  credentials: boolean;
  methods: string[];
  allowedHeaders: string[];
}

export interface CSRFConfig {
  enabled: boolean;
  cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
}

export interface EncryptionConfig {
  algorithm: string;
  keyDerivation: {
    iterations: number;
    salt: string;
  };
}

export interface RBACConfig {
  enableHierarchy: boolean;
  enableInheritance: boolean;
  enableContextualPermissions: boolean;
  cachePermissions: boolean;
  cacheTTL: number;
}

// Authentication Request/Response Types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: DeviceInfo;
}

export interface LoginResponse {
  user: Omit<User, 'roles' | 'permissions'>;
  tokens: TokenPair;
  requiresTwoFactor?: boolean;
  twoFactorMethods?: string[];
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  agreeToTerms: boolean;
}

export interface RegisterResponse {
  user: Omit<User, 'roles' | 'permissions'>;
  requiresEmailVerification: boolean;
  message: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ResetPasswordConfirmRequest {
  token: string;
  newPassword: string;
}

export interface DeviceInfo {
  userAgent: string;
  ip: string;
  fingerprint?: string;
  platform?: string;
  browser?: string;
}

// Authorization Types
export interface AuthContext {
  user: User;
  session: Session;
  token: DecodedToken;
  permissions: Permission[];
  roles: Role[];
  isAuthenticated: boolean;
  deviceInfo?: DeviceInfo;
}

export interface Session {
  id: string;
  userId: string;
  deviceInfo: DeviceInfo;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

export interface AuthenticationResult {
  success: boolean;
  user?: User;
  session?: Session;
  tokens?: TokenPair;
  error?: AuthenticationError;
  requiresTwoFactor?: boolean;
}

export interface AuthorizationResult {
  granted: boolean;
  reason?: string;
  requiredPermissions?: string[];
  missingPermissions?: string[];
}

// Security Types
export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  sessionId?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details: Record<string, unknown>;
  severity: SecuritySeverity;
}

export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET = 'password_reset',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  TOKEN_REFRESH = 'token_refresh',
  TOKEN_REVOKED = 'token_revoked',
  PERMISSION_DENIED = 'permission_denied',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error Types
export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code: AuthErrorCode,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public requiredPermissions: string[],
    public missingPermissions: string[]
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class SecurityError extends Error {
  constructor(
    message: string,
    public eventType: SecurityEventType,
    public severity: SecuritySeverity
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED = 'ACCOUNT_DISABLED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  EMAIL_VERIFICATION_FAILED = 'EMAIL_VERIFICATION_FAILED',
  REGISTRATION_FAILED = 'REGISTRATION_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
  PASSWORD_REUSE = 'PASSWORD_REUSE',
  PASSWORD_CHANGE_FAILED = 'PASSWORD_CHANGE_FAILED',
  PASSWORD_RESET_FAILED = 'PASSWORD_RESET_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  TWO_FACTOR_REQUIRED = 'TWO_FACTOR_REQUIRED',
  DEVICE_NOT_TRUSTED = 'DEVICE_NOT_TRUSTED'
}

// Service Interfaces
export interface AuthenticationService {
  login(request: LoginRequest): Promise<AuthenticationResult>;
  register(request: RegisterRequest): Promise<RegisterResponse>;
  logout(sessionId: string): Promise<void>;
  refreshToken(request: RefreshTokenRequest): Promise<TokenPair>;
  changePassword(userId: string, request: ChangePasswordRequest): Promise<void>;
  resetPassword(request: ResetPasswordRequest): Promise<void>;
  confirmResetPassword(request: ResetPasswordConfirmRequest): Promise<void>;
  verifyEmail(token: string): Promise<void>;
  validateToken(token: string): Promise<DecodedToken>;
  revokeToken(token: string): Promise<void>;
  revokeAllTokens(userId: string): Promise<void>;
}

export interface AuthorizationService {
  authorize(context: AuthContext, resource: string, action: string): Promise<AuthorizationResult>;
  hasPermission(user: User, permission: string): Promise<boolean>;
  hasRole(user: User, role: string): Promise<boolean>;
  getUserPermissions(userId: string): Promise<Permission[]>;
  getUserRoles(userId: string): Promise<Role[]>;
  checkPermissions(userId: string, permissions: string[]): Promise<boolean[]>;
}

export interface UserService {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(userData: Partial<User>): Promise<User>;
  update(id: string, userData: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
  addRole(userId: string, roleId: string): Promise<void>;
  removeRole(userId: string, roleId: string): Promise<void>;
  addPermission(userId: string, permissionId: string): Promise<void>;
  removePermission(userId: string, permissionId: string): Promise<void>;
}

export interface RoleService {
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  create(roleData: Partial<Role>): Promise<Role>;
  update(id: string, roleData: Partial<Role>): Promise<Role>;
  delete(id: string): Promise<void>;
  addPermission(roleId: string, permissionId: string): Promise<void>;
  removePermission(roleId: string, permissionId: string): Promise<void>;
}

export interface PermissionService {
  findById(id: string): Promise<Permission | null>;
  findByName(name: string): Promise<Permission | null>;
  create(permissionData: Partial<Permission>): Promise<Permission>;
  update(id: string, permissionData: Partial<Permission>): Promise<Permission>;
  delete(id: string): Promise<void>;
  findByResource(resource: string): Promise<Permission[]>;
}

export interface SessionService {
  create(session: Partial<Session>): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  findByUserId(userId: string): Promise<Session[]>;
  update(id: string, sessionData: Partial<Session>): Promise<Session>;
  delete(id: string): Promise<void>;
  deleteExpired(): Promise<number>;
  deleteByUserId(userId: string): Promise<number>;
}

export interface SecurityService {
  logEvent(event: SecurityEvent): Promise<void>;
  detectSuspiciousActivity(userId: string, deviceInfo: DeviceInfo): Promise<boolean>;
  isRateLimited(key: string): Promise<boolean>;
  incrementRateLimit(key: string): Promise<number>;
  lockAccount(userId: string, reason: string): Promise<void>;
  unlockAccount(userId: string): Promise<void>;
  isAccountLocked(userId: string): Promise<boolean>;
}

// Middleware and Decorator Types
export interface AuthMiddleware {
  authenticate(req: unknown, res: unknown, next: unknown): Promise<void>;
  authorize(permissions: string[]): (req: unknown, res: unknown, next: unknown) => Promise<void>;
  requireRole(roles: string[]): (req: unknown, res: unknown, next: unknown) => Promise<void>;
  rateLimit(options?: RateLimitConfig): (req: unknown, res: unknown, next: unknown) => Promise<void>;
}

export interface AuthGuard {
  canActivate(context: unknown): Promise<boolean>;
}

// Utility Types
export type ResourceAction = `${string}:${string}`;
export type PermissionString = string;
export type RoleString = string;

// Constants
export const DEFAULT_PERMISSIONS = {
  // User permissions
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',
  
  // Quote permissions
  QUOTE_READ: 'quote:read',
  QUOTE_WRITE: 'quote:write',
  QUOTE_DELETE: 'quote:delete',
  QUOTE_APPROVE: 'quote:approve',
  
  // Admin permissions
  ADMIN_USERS: 'admin:users',
  ADMIN_ROLES: 'admin:roles',
  ADMIN_PERMISSIONS: 'admin:permissions',
  ADMIN_SYSTEM: 'admin:system',
  
  // System permissions
  SYSTEM_HEALTH: 'system:health',
  SYSTEM_METRICS: 'system:metrics',
  SYSTEM_LOGS: 'system:logs'
} as const;

export const DEFAULT_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  GUEST: 'guest'
} as const;