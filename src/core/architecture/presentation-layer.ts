/**
 * Presentation Layer Architecture - API Controllers and Adapters
 * ENTERPRISE PATTERN: MVC with Clean Architecture boundaries
 * 
 * This layer contains:
 * - HTTP controllers and middleware
 * - Request/response transformations
 * - Authentication and authorization
 * - Input validation and sanitization
 */

import { NextApiRequest, NextApiResponse } from 'next';
import {
  ApplicationCoordinator,
  SubmitApplicationCommand,
  GetApplicationQuery,
  ApplicationResult,
  ApplicationContainer
} from './application-layer';

// ================== REQUEST/RESPONSE TYPES ==================

export interface ApiRequest<T = any> extends NextApiRequest {
  body: T;
  user?: AuthenticatedUser;
  requestId: string;
  startTime: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  errors?: string[];
  meta?: {
    requestId: string;
    processingTime: number;
    version: string;
  };
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
}

export interface SubmitApplicationRequest {
  name: string;
  email: string;
  phone: string;
  experience: string;
  resumeFileId?: string;
}

export interface GetApplicationRequest {
  applicationId: string;
}

// ================== BASE CONTROLLER ==================

export abstract class BaseController {
  constructor(
    protected readonly container: ApplicationContainer
  ) {}
  
  protected success<T>(
    data: T,
    meta?: Partial<ApiResponse['meta']>
  ): ApiResponse<T> {
    return {
      success: true,
      data,
      meta: {
        requestId: '',
        processingTime: 0,
        version: '1.0',
        ...meta
      }
    };
  }
  
  protected error(
    errors: string[],
    meta?: Partial<ApiResponse['meta']>
  ): ApiResponse {
    return {
      success: false,
      errors,
      meta: {
        requestId: '',
        processingTime: 0,
        version: '1.0',
        ...meta
      }
    };
  }
  
  protected async executeCommand<T>(
    req: ApiRequest,
    handler: () => Promise<ApplicationResult>
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    
    try {
      const result = await handler();
      const processingTime = Date.now() - startTime;
      
      if (result.success) {
        return this.success(result.data as T, {
          requestId: req.requestId,
          processingTime,
          version: result.metadata?.version
        });
      } else {
        return this.error(result.errors || ['Unknown error'], {
          requestId: req.requestId,
          processingTime,
          version: result.metadata?.version
        });
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return this.error(
        ['Internal server error'],
        {
          requestId: req.requestId,
          processingTime
        }
      );
    }
  }
}

// ================== APPLICATION CONTROLLER ==================

export class ApplicationController extends BaseController {
  private readonly coordinator: ApplicationCoordinator;
  
  constructor(container: ApplicationContainer) {
    super(container);
    this.coordinator = container.getApplicationCoordinator();
  }
  
  async submitApplication(
    req: ApiRequest<SubmitApplicationRequest>,
    res: NextApiResponse<ApiResponse>
  ): Promise<void> {
    const command = new SubmitApplicationCommand(
      req.body.name,
      req.body.email,
      req.body.phone,
      req.body.experience,
      req.body.resumeFileId,
      {
        ipAddress: this.getClientIP(req),
        userAgent: req.headers['user-agent'],
        source: 'web-form'
      }
    );
    
    const response = await this.executeCommand(req, () =>
      this.coordinator.submitApplication(command)
    );
    
    const statusCode = response.success ? 201 : 400;
    res.status(statusCode).json(response);
  }
  
  async getApplication(
    req: ApiRequest<GetApplicationRequest>,
    res: NextApiResponse<ApiResponse>
  ): Promise<void> {
    const query = new GetApplicationQuery(req.query.applicationId as string);
    
    const response = await this.executeCommand(req, () =>
      this.coordinator.getApplication(query)
    );
    
    const statusCode = response.success ? 200 : 404;
    res.status(statusCode).json(response);
  }
  
  private getClientIP(req: ApiRequest): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded)) {
      return forwarded[0];
    }
    return req.socket?.remoteAddress || 'unknown';
  }
}

// ================== MIDDLEWARE ARCHITECTURE ==================

export type MiddlewareFunction = (
  req: ApiRequest,
  res: NextApiResponse,
  next: () => Promise<void>
) => Promise<void>;

export class MiddlewareChain {
  private readonly middlewares: MiddlewareFunction[] = [];
  
  use(middleware: MiddlewareFunction): this {
    this.middlewares.push(middleware);
    return this;
  }
  
  async execute(
    req: ApiRequest,
    res: NextApiResponse,
    handler: (req: ApiRequest, res: NextApiResponse) => Promise<void>
  ): Promise<void> {
    let index = 0;
    
    const next = async (): Promise<void> => {
      if (index < this.middlewares.length) {
        const middleware = this.middlewares[index++];
        await middleware(req, res, next);
      } else {
        await handler(req, res);
      }
    };
    
    await next();
  }
}

// ================== CORE MIDDLEWARE ==================

export class RequestIdMiddleware {
  static create(): MiddlewareFunction {
    return async (req: ApiRequest, res: NextApiResponse, next: () => Promise<void>) => {
      req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      req.startTime = Date.now();
      
      res.setHeader('X-Request-ID', req.requestId);
      
      await next();
    };
  }
}

export class LoggingMiddleware {
  static create(logger: any): MiddlewareFunction {
    return async (req: ApiRequest, res: NextApiResponse, next: () => Promise<void>) => {
      const startTime = Date.now();
      
      logger.info('Request started', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.headers['x-forwarded-for'] || req.socket?.remoteAddress
      });
      
      await next();
      
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      logger.info('Request completed', {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        statusCode,
        duration
      });
    };
  }
}

export class ValidationMiddleware {
  static create<T>(schema: ValidationSchema<T>): MiddlewareFunction {
    return async (req: ApiRequest, res: NextApiResponse, next: () => Promise<void>) => {
      try {
        const validation = await schema.validate(req.body);
        
        if (!validation.isValid) {
          res.status(400).json({
            success: false,
            errors: validation.errors,
            meta: {
              requestId: req.requestId,
              processingTime: Date.now() - req.startTime,
              version: '1.0'
            }
          });
          return;
        }
        
        req.body = validation.data;
        await next();
        
      } catch (error) {
        res.status(400).json({
          success: false,
          errors: ['Invalid request format'],
          meta: {
            requestId: req.requestId,
            processingTime: Date.now() - req.startTime,
            version: '1.0'
          }
        });
      }
    };
  }
}

export class RateLimitMiddleware {
  constructor(
    private readonly rateLimit: RateLimiter,
    private readonly logger: any
  ) {}
  
  create(): MiddlewareFunction {
    return async (req: ApiRequest, res: NextApiResponse, next: () => Promise<void>) => {
      const clientIP = this.getClientIP(req);
      const result = await this.rateLimit.checkLimit(clientIP);
      
      if (!result.allowed) {
        this.logger.warn('Rate limit exceeded', {
          requestId: req.requestId,
          ip: clientIP,
          resetTime: result.resetTime
        });
        
        res.status(429).json({
          success: false,
          errors: ['Too many requests'],
          meta: {
            requestId: req.requestId,
            processingTime: Date.now() - req.startTime,
            version: '1.0'
          }
        });
        return;
      }
      
      await next();
    };
  }
  
  private getClientIP(req: ApiRequest): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded)) {
      return forwarded[0];
    }
    return req.socket?.remoteAddress || 'unknown';
  }
}

export class AuthenticationMiddleware {
  constructor(
    private readonly authService: AuthenticationService,
    private readonly logger: any
  ) {}
  
  create(required = true): MiddlewareFunction {
    return async (req: ApiRequest, res: NextApiResponse, next: () => Promise<void>) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        if (required) {
          res.status(401).json({
            success: false,
            errors: ['Authentication required'],
            meta: {
              requestId: req.requestId,
              processingTime: Date.now() - req.startTime,
              version: '1.0'
            }
          });
          return;
        }
        await next();
        return;
      }
      
      try {
        const token = authHeader.replace('Bearer ', '');
        const user = await this.authService.validateToken(token);
        
        if (!user && required) {
          res.status(401).json({
            success: false,
            errors: ['Invalid authentication token'],
            meta: {
              requestId: req.requestId,
              processingTime: Date.now() - req.startTime,
              version: '1.0'
            }
          });
          return;
        }
        
        req.user = user || undefined;
        await next();
        
      } catch (error) {
        this.logger.error('Authentication error', error as Error, {
          requestId: req.requestId
        });
        
        if (required) {
          res.status(401).json({
            success: false,
            errors: ['Authentication failed'],
            meta: {
              requestId: req.requestId,
              processingTime: Date.now() - req.startTime,
              version: '1.0'
            }
          });
          return;
        }
        
        await next();
      }
    };
  }
}

// ================== VALIDATION ARCHITECTURE ==================

export interface ValidationSchema<T> {
  validate(data: any): Promise<ValidationResult<T>>;
}

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: string[];
}

export class SubmitApplicationSchema implements ValidationSchema<SubmitApplicationRequest> {
  async validate(data: any): Promise<ValidationResult<SubmitApplicationRequest>> {
    const errors: string[] = [];
    
    // Required fields
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
      errors.push('Name is required and must be at least 2 characters');
    }
    
    if (!data.email || typeof data.email !== 'string' || !this.isValidEmail(data.email)) {
      errors.push('Valid email address is required');
    }
    
    if (!data.phone || typeof data.phone !== 'string' || !this.isValidPhone(data.phone)) {
      errors.push('Valid phone number is required');
    }
    
    if (!data.experience || typeof data.experience !== 'string') {
      errors.push('Experience level is required');
    }
    
    // Optional fields validation
    if (data.resumeFileId && typeof data.resumeFileId !== 'string') {
      errors.push('Resume file ID must be a string');
    }
    
    if (errors.length > 0) {
      return { isValid: false, errors };
    }
    
    return {
      isValid: true,
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        phone: data.phone.replace(/\D/g, ''),
        experience: data.experience.trim(),
        resumeFileId: data.resumeFileId
      },
      errors: []
    };
  }
  
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }
  
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  }
}

// ================== SUPPORTING SERVICES ==================

export interface RateLimiter {
  checkLimit(identifier: string): Promise<RateLimitResult>;
}

export interface RateLimitResult {
  allowed: boolean;
  resetTime?: number;
  remaining?: number;
}

export interface AuthenticationService {
  validateToken(token: string): Promise<AuthenticatedUser | null>;
  generateToken(user: AuthenticatedUser): Promise<string>;
  refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }>;
}

// ================== ROUTE FACTORY ==================

export class RouteFactory {
  constructor(
    private readonly container: ApplicationContainer,
    private readonly middlewareChain: MiddlewareChain
  ) {}
  
  createApplicationRoutes(): {
    submitApplication: (req: NextApiRequest, res: NextApiResponse) => Promise<void>;
    getApplication: (req: NextApiRequest, res: NextApiResponse) => Promise<void>;
  } {
    const controller = new ApplicationController(this.container);
    
    return {
      submitApplication: async (req: NextApiRequest, res: NextApiResponse) => {
        await this.middlewareChain.execute(
          req as ApiRequest,
          res,
          controller.submitApplication.bind(controller)
        );
      },
      
      getApplication: async (req: NextApiRequest, res: NextApiResponse) => {
        await this.middlewareChain.execute(
          req as ApiRequest,
          res,
          controller.getApplication.bind(controller)
        );
      }
    };
  }
}

// ================== API CONFIGURATION ==================

export interface ApiConfiguration {
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
  };
  cors: {
    origins: string[];
    methods: string[];
    headers: string[];
  };
  validation: {
    maxRequestSize: number;
    allowedFileTypes: string[];
  };
  logging: {
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    includeRequestBody: boolean;
    includeResponseBody: boolean;
  };
}

export class ApiFactory {
  static create(
    container: ApplicationContainer,
    config: ApiConfiguration
  ): RouteFactory {
    const logger = container.getApplicationLogger();
    const metrics = container.getApplicationMetrics();
    
    // Create rate limiter (would be injected in production)
    const rateLimiter: RateLimiter = {
      async checkLimit(_identifier: string): Promise<RateLimitResult> {
        return { allowed: true }; // Placeholder implementation
      }
    };
    
    // Create authentication service (would be injected in production)
    const authService: AuthenticationService = {
      async validateToken(_token: string): Promise<AuthenticatedUser | null> {
        return null; // Placeholder implementation
      },
      async generateToken(_user: AuthenticatedUser): Promise<string> {
        return ''; // Placeholder implementation
      },
      async refreshToken(_refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
        return { accessToken: '', refreshToken: '' }; // Placeholder implementation
      }
    };
    
    // Build middleware chain
    const middlewareChain = new MiddlewareChain()
      .use(RequestIdMiddleware.create())
      .use(LoggingMiddleware.create(logger))
      .use(new RateLimitMiddleware(rateLimiter, logger).create())
      .use(ValidationMiddleware.create(new SubmitApplicationSchema()))
      .use(new AuthenticationMiddleware(authService, logger).create(false));
    
    return new RouteFactory(container, middlewareChain);
  }
}