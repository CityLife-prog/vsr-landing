// API documentation and versioning system
// BACKEND IMPROVEMENT: Professional API documentation and versioning

import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from './logger';

/**
 * API version configuration
 * IMPROVEMENT: Structured API versioning for backward compatibility
 */
export const API_VERSIONS = {
  v1: '1.0.0',
  v2: '2.0.0', // Future version
} as const;

export type ApiVersion = keyof typeof API_VERSIONS;

export interface ApiEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  version: ApiVersion;
  description: string;
  parameters?: ApiParameter[];
  requestBody?: ApiSchema;
  responses: Record<number, ApiResponse>;
  examples?: ApiExample[];
  deprecated?: boolean;
  deprecationDate?: string;
  replacedBy?: string;
}

export interface ApiParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'formData';
  type: 'string' | 'number' | 'boolean' | 'file' | 'array';
  required: boolean;
  description: string;
  example?: unknown;
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    enum?: string[];
  };
}

export interface ApiSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  properties?: Record<string, ApiSchema>;
  items?: ApiSchema;
  required?: string[];
  description?: string;
  example?: unknown;
}

export interface ApiResponse {
  description: string;
  schema?: ApiSchema;
  examples?: Record<string, unknown>;
}

export interface ApiExample {
  title: string;
  description: string;
  request?: unknown;
  response?: unknown;
}

/**
 * API Documentation Registry
 * IMPROVEMENT: Centralized API documentation with OpenAPI compatibility
 */
export class ApiDocumentation {
  private static instance: ApiDocumentation;
  private endpoints: Map<string, ApiEndpoint> = new Map();

  private constructor() {
    this.initializeEndpoints();
  }

  public static getInstance(): ApiDocumentation {
    if (!ApiDocumentation.instance) {
      ApiDocumentation.instance = new ApiDocumentation();
    }
    return ApiDocumentation.instance;
  }

  /**
   * Initialize built-in endpoint documentation
   * IMPROVEMENT: Self-documenting API endpoints
   */
  private initializeEndpoints(): void {
    // Application submission endpoint
    this.registerEndpoint({
      path: '/api/v1/apply',
      method: 'POST',
      version: 'v1',
      description: 'Submit job application with resume upload',
      parameters: [
        {
          name: 'name',
          in: 'formData',
          type: 'string',
          required: true,
          description: 'Full name of the applicant',
          example: 'John Doe',
          validation: { minLength: 2, maxLength: 100 }
        },
        {
          name: 'email',
          in: 'formData',
          type: 'string',
          required: true,
          description: 'Email address of the applicant',
          example: 'john.doe@example.com',
          validation: { pattern: '^[^@]+@[^@]+\\.[^@]+$' }
        },
        {
          name: 'phone',
          in: 'formData',
          type: 'string',
          required: true,
          description: 'Phone number in US format',
          example: '(555) 123-4567',
          validation: { pattern: '^\\(\\d{3}\\) \\d{3}-\\d{4}$' }
        },
        {
          name: 'experience',
          in: 'formData',
          type: 'string',
          required: true,
          description: 'Detailed work experience and qualifications',
          example: 'I have 5 years of experience in construction...',
          validation: { minLength: 50, maxLength: 2000 }
        },
        {
          name: 'resume',
          in: 'formData',
          type: 'file',
          required: true,
          description: 'Resume file (PDF, DOC, or DOCX)',
          validation: { 
            enum: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
          }
        }
      ],
      responses: {
        200: {
          description: 'Application submitted successfully',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Application submitted successfully' },
              applicationId: { type: 'string', example: 'app_1640995200000_abc123' }
            }
          }
        },
        400: {
          description: 'Invalid input data',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', example: 'Name is required' },
              validationErrors: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        },
        413: {
          description: 'File too large',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', example: 'File size exceeds 5MB limit' }
            }
          }
        },
        429: {
          description: 'Rate limit exceeded',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', example: 'Too many requests. Please try again later.' }
            }
          }
        },
        500: {
          description: 'Internal server error',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string', example: 'Internal server error' }
            }
          }
        }
      },
      examples: [
        {
          title: 'Successful Application Submission',
          description: 'Example of a successful job application with all required fields',
          request: {
            name: 'John Doe',
            email: 'john.doe@example.com',
            phone: '(555) 123-4567',
            experience: 'I have 5 years of experience in commercial construction, specializing in concrete work and project management. I am certified in OSHA safety protocols and have experience with heavy machinery operation.',
            resume: '[Binary file data]'
          },
          response: {
            success: true,
            message: 'Application submitted successfully',
            applicationId: 'app_1640995200000_abc123'
          }
        }
      ]
    });

    // Quote request endpoint
    this.registerEndpoint({
      path: '/api/v1/quote',
      method: 'POST',
      version: 'v1',
      description: 'Submit quote request with project photos',
      parameters: [
        {
          name: 'fullName',
          in: 'formData',
          type: 'string',
          required: true,
          description: 'Full name of the client',
          example: 'Jane Smith',
          validation: { minLength: 2, maxLength: 100 }
        },
        {
          name: 'email',
          in: 'formData',
          type: 'string',
          required: true,
          description: 'Email address of the client',
          example: 'jane.smith@example.com'
        },
        {
          name: 'phone',
          in: 'formData',
          type: 'string',
          required: true,
          description: 'Phone number in US format',
          example: '(555) 987-6543'
        },
        {
          name: 'service',
          in: 'formData',
          type: 'string',
          required: true,
          description: 'Type of service requested',
          validation: {
            enum: [
              'concrete-asphalt',
              'landscaping', 
              'snow-ice-removal',
              'painting',
              'demolition'
            ]
          }
        },
        {
          name: 'details',
          in: 'formData',
          type: 'string',
          required: true,
          description: 'Detailed description of the project',
          validation: { minLength: 20, maxLength: 2000 }
        },
        {
          name: 'photos',
          in: 'formData',
          type: 'array',
          required: false,
          description: 'Project photos (JPEG, PNG, GIF, WebP)',
          validation: {
            enum: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
          }
        }
      ],
      responses: {
        200: {
          description: 'Quote request submitted successfully',
          schema: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string', example: 'Quote request submitted successfully' },
              quoteId: { type: 'string', example: 'quote_1640995200000_xyz789' }
            }
          }
        },
        400: {
          description: 'Invalid input data'
        },
        413: {
          description: 'File too large'
        },
        429: {
          description: 'Rate limit exceeded'
        },
        500: {
          description: 'Internal server error'
        }
      }
    });

    // Health check endpoint
    this.registerEndpoint({
      path: '/api/v1/health',
      method: 'GET',
      version: 'v1',
      description: 'System health check and status information',
      responses: {
        200: {
          description: 'System is healthy',
          schema: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'healthy' },
              timestamp: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
              version: { type: 'string', example: '1.0.0' },
              uptime: { type: 'number', example: 86400 },
              services: {
                type: 'object',
                properties: {
                  database: { type: 'string', example: 'healthy' },
                  email: { type: 'string', example: 'healthy' },
                  storage: { type: 'string', example: 'healthy' }
                }
              }
            }
          }
        },
        503: {
          description: 'System is unhealthy',
          schema: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'unhealthy' },
              errors: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        }
      }
    });
  }

  /**
   * Register a new API endpoint
   * IMPROVEMENT: Dynamic endpoint registration for extensibility
   */
  public registerEndpoint(endpoint: ApiEndpoint): void {
    const key = `${endpoint.method}:${endpoint.path}`;
    this.endpoints.set(key, endpoint);
    
    logger.info('API endpoint registered', {
      metadata: {
        method: endpoint.method,
        path: endpoint.path,
        version: endpoint.version
      }
    });
  }

  /**
   * Get endpoint documentation
   * IMPROVEMENT: Runtime API introspection
   */
  public getEndpoint(method: string, path: string): ApiEndpoint | undefined {
    const key = `${method.toUpperCase()}:${path}`;
    return this.endpoints.get(key);
  }

  /**
   * Generate OpenAPI specification
   * IMPROVEMENT: Standards-compliant API documentation
   */
  public generateOpenApiSpec(): object {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: 'VSR Landing API',
        description: 'API for VSR Construction Services landing page',
        version: API_VERSIONS.v1,
        contact: {
          name: 'VSR Construction Services',
          email: 'info@vsrconstruction.com'
        }
      },
      servers: [
        {
          url: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
          description: 'Main API server'
        }
      ],
      paths: {} as Record<string, Record<string, {
        summary: string;
        description: string;
        parameters?: Array<{
          name: string;
          in: string;
          required: boolean;
          description: string;
          schema: { type: string };
        }>;
        responses: Record<string, {
          description: string;
          content?: Record<string, { schema: { $ref: string } }>;
        }>;
        deprecated?: boolean;
      }>>,
      components: {
        schemas: {
          Error: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: { type: 'string' },
              code: { type: 'string' }
            }
          },
          Success: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              message: { type: 'string' }
            }
          }
        }
      }
    };

    // Convert endpoints to OpenAPI paths
    this.endpoints.forEach((endpoint) => {
      const pathKey = endpoint.path.replace('/api/v1', '');
      if (!spec.paths[pathKey]) {
        spec.paths[pathKey] = {};
      }

      spec.paths[pathKey][endpoint.method.toLowerCase()] = {
        summary: endpoint.description,
        description: endpoint.description,
        parameters: endpoint.parameters?.map(param => ({
          name: param.name,
          in: param.in,
          required: param.required,
          description: param.description,
          schema: {
            type: param.type,
            example: param.example,
            ...param.validation
          }
        })),
        responses: endpoint.responses,
        deprecated: endpoint.deprecated || false
      };
    });

    return spec;
  }

  /**
   * Generate API documentation HTML
   * IMPROVEMENT: Self-hosted API documentation
   */
  public generateDocumentationHtml(): string {
    const endpoints = Array.from(this.endpoints.values());
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VSR Landing API Documentation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; line-height: 1.6; }
        .header { border-bottom: 2px solid #e1e5e9; padding-bottom: 20px; margin-bottom: 40px; }
        .endpoint { margin-bottom: 40px; padding: 20px; border: 1px solid #e1e5e9; border-radius: 8px; }
        .method { display: inline-block; padding: 4px 8px; border-radius: 4px; font-weight: bold; color: white; }
        .method.POST { background-color: #28a745; }
        .method.GET { background-color: #007bff; }
        .method.PUT { background-color: #ffc107; color: black; }
        .method.DELETE { background-color: #dc3545; }
        .deprecated { opacity: 0.6; }
        .parameter { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .required { color: #dc3545; font-weight: bold; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>VSR Landing API Documentation</h1>
        <p>Version: ${API_VERSIONS.v1}</p>
        <p>Base URL: ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}</p>
    </div>
    
    ${endpoints.map(endpoint => `
        <div class="endpoint ${endpoint.deprecated ? 'deprecated' : ''}">
            <h2>
                <span class="method ${endpoint.method}">${endpoint.method}</span>
                ${endpoint.path}
                ${endpoint.deprecated ? '<span style="color: #dc3545;"> (DEPRECATED)</span>' : ''}
            </h2>
            <p>${endpoint.description}</p>
            
            ${endpoint.parameters && endpoint.parameters.length > 0 ? `
                <h3>Parameters</h3>
                ${endpoint.parameters.map(param => `
                    <div class="parameter">
                        <strong>${param.name}</strong>
                        ${param.required ? '<span class="required">*</span>' : ''}
                        <em>(${param.type}, ${param.in})</em>
                        <p>${param.description}</p>
                        ${param.example ? `<pre>Example: ${JSON.stringify(param.example, null, 2)}</pre>` : ''}
                    </div>
                `).join('')}
            ` : ''}
            
            <h3>Responses</h3>
            ${Object.entries(endpoint.responses).map(([code, response]) => `
                <h4>HTTP ${code}</h4>
                <p>${response.description}</p>
                ${response.schema ? `<pre>${JSON.stringify(response.schema, null, 2)}</pre>` : ''}
            `).join('')}
            
            ${endpoint.examples && endpoint.examples.length > 0 ? `
                <h3>Examples</h3>
                ${endpoint.examples.map(example => `
                    <h4>${example.title}</h4>
                    <p>${example.description}</p>
                    ${example.request ? `<pre>Request:\n${JSON.stringify(example.request, null, 2)}</pre>` : ''}
                    ${example.response ? `<pre>Response:\n${JSON.stringify(example.response, null, 2)}</pre>` : ''}
                `).join('')}
            ` : ''}
        </div>
    `).join('')}
</body>
</html>
    `;
  }

  /**
   * Get all endpoints
   * IMPROVEMENT: API discovery and introspection
   */
  public getAllEndpoints(): ApiEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Validate request against endpoint specification
   * IMPROVEMENT: Runtime request validation
   */
  public validateRequest(method: string, path: string, req: NextApiRequest): {
    valid: boolean;
    errors: string[];
  } {
    const endpoint = this.getEndpoint(method, path);
    if (!endpoint) {
      return { valid: false, errors: ['Endpoint not found'] };
    }

    const errors: string[] = [];

    // Validate required parameters
    endpoint.parameters?.forEach(param => {
      if (param.required) {
        let value: unknown;
        
        switch (param.in) {
          case 'query':
            value = req.query[param.name];
            break;
          case 'header':
            value = req.headers[param.name.toLowerCase()];
            break;
          case 'formData':
            value = (req as NextApiRequest & { body: Record<string, unknown> }).body?.[param.name];
            break;
        }

        if (value === undefined || value === null || value === '') {
          errors.push(`Required parameter '${param.name}' is missing`);
        }
      }
    });

    return { valid: errors.length === 0, errors };
  }
}

// Export singleton instance
export const apiDocs = ApiDocumentation.getInstance();

/**
 * API versioning middleware
 * IMPROVEMENT: Automatic API version handling
 */
export function withApiVersion(version: ApiVersion = 'v1') {
  return function(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>) {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      // Add version information to request
      (req as NextApiRequest & { apiVersion: string }).apiVersion = version;
      
      // Add version headers to response
      res.setHeader('API-Version', API_VERSIONS[version]);
      res.setHeader('Supported-Versions', Object.values(API_VERSIONS).join(', '));
      
      // Validate request if endpoint is documented
      const endpoint = apiDocs.getEndpoint(req.method || 'GET', req.url || '');
      if (endpoint) {
        const validation = apiDocs.validateRequest(req.method || 'GET', req.url || '', req);
        if (!validation.valid) {
          logger.warn('API request validation failed', {
            endpoint: req.url,
            method: req.method,
            metadata: { errors: validation.errors }
          });
          
          return res.status(400).json({
            success: false,
            error: 'Invalid request parameters',
            validationErrors: validation.errors
          });
        }
      }

      return handler(req, res);
    };
  };
}

export default apiDocs;