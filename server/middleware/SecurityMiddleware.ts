/**
 * Security Middleware for FieldOps Pro
 * Implements comprehensive security controls with audit logging
 */

import { Request, Response, NextFunction } from 'express';
import { container, SERVICE_NAMES } from '../core/ServiceContainer';
import { ISecurityService, ILogger, IRBACService } from '../core/ServiceContainer';
import { z } from 'zod';

// Extend Express Request type to include security context
declare global {
  namespace Express {
    interface Request {
      securityContext?: {
        userId?: string;
        sessionId?: string;
        riskScore?: number;
        rateLimited?: boolean;
        validatedInput?: boolean;
      };
    }
  }
}

export class SecurityMiddleware {
  private static securityService?: ISecurityService;
  private static logger?: ILogger;
  private static rbacService?: IRBACService;

  static async initialize(): Promise<void> {
    this.securityService = container.get<ISecurityService>(SERVICE_NAMES.SECURITY);
    this.logger = container.get<ILogger>(SERVICE_NAMES.LOGGER);
    this.rbacService = container.get<IRBACService>(SERVICE_NAMES.RBAC);
  }

  // Rate limiting middleware
  static rateLimit(action: string = 'default') {
    return (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user?.claims?.sub || req.ip;
      
      if (!this.securityService?.checkRateLimit(userId, action)) {
        this.logger?.warn('Rate limit exceeded', {
          userId,
          action,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });

        req.securityContext = { ...req.securityContext, rateLimited: true };
        
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: 60 // seconds
        });
      }

      next();
    };
  }

  // Input validation middleware
  static validateInput(schema: z.ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate and sanitize request body
        if (req.body) {
          const isValid = this.securityService?.validateInput(req.body, schema);
          
          if (!isValid) {
            this.logger?.warn('Input validation failed', {
              path: req.path,
              method: req.method,
              userId: req.user?.claims?.sub,
              bodyKeys: Object.keys(req.body || {})
            });

            return res.status(400).json({
              error: 'Validation failed',
              message: 'Invalid input data provided'
            });
          }

          // Sanitize input
          req.body = this.securityService?.sanitizeInput(req.body);
          req.securityContext = { ...req.securityContext, validatedInput: true };
        }

        // Validate query parameters
        if (req.query && Object.keys(req.query).length > 0) {
          req.query = this.securityService?.sanitizeInput(req.query) || req.query;
        }

        next();
      } catch (error) {
        this.logger?.error('Input validation middleware error', error);
        return res.status(500).json({
          error: 'Validation error',
          message: 'An error occurred during input validation'
        });
      }
    };
  }

  // RBAC authorization middleware
  static requirePermission(resource: string, action: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.user?.claims?.sub;
        
        if (!userId) {
          this.logger?.warn('Authorization attempt without user ID', {
            path: req.path,
            method: req.method,
            ip: req.ip
          });
          
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Authentication required'
          });
        }

        const hasPermission = await this.rbacService?.hasPermission(userId, resource, action);
        
        if (!hasPermission) {
          this.logger?.warn('Permission denied', {
            userId,
            resource,
            action,
            path: req.path,
            method: req.method,
            ip: req.ip
          });

          return res.status(403).json({
            error: 'Forbidden',
            message: 'Insufficient permissions for this action'
          });
        }

        // Log successful authorization
        this.logger?.debug('Authorization granted', {
          userId,
          resource,
          action,
          path: req.path
        });

        next();
      } catch (error) {
        this.logger?.error('Authorization middleware error', error, {
          resource,
          action,
          path: req.path
        });
        
        return res.status(500).json({
          error: 'Authorization error',
          message: 'An error occurred during authorization'
        });
      }
    };
  }

  // Security headers middleware
  static securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Set security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
      
      // CSP header
      res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: In production, remove unsafe-*
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'"
      ].join('; '));

      next();
    };
  }

  // Audit logging middleware
  static auditLog() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      
      // Capture response details
      const originalSend = res.send;
      res.send = function(body: any) {
        const duration = Date.now() - startTime;
        
        SecurityMiddleware.logger?.info('API Request Audit', {
          method: req.method,
          path: req.path,
          userId: req.user?.claims?.sub,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          statusCode: res.statusCode,
          duration,
          bodySize: body ? Buffer.byteLength(body, 'utf8') : 0,
          securityContext: req.securityContext,
          timestamp: new Date().toISOString()
        });

        return originalSend.call(this, body);
      };

      next();
    };
  }

  // File upload security middleware
  static secureFileUpload() {
    return (req: Request, res: Response, next: NextFunction) => {
      // This would integrate with multer or similar upload middleware
      if (req.file) {
        const isValid = this.securityService?.validateFileUpload(
          req.file.originalname,
          req.file.buffer
        );

        if (!isValid) {
          this.logger?.warn('Malicious file upload attempt', {
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            userId: req.user?.claims?.sub,
            ip: req.ip
          });

          return res.status(400).json({
            error: 'File validation failed',
            message: 'The uploaded file contains invalid or malicious content'
          });
        }
      }

      next();
    };
  }

  // Risk assessment middleware
  static riskAssessment() {
    return (req: Request, res: Response, next: NextFunction) => {
      let riskScore = 0;

      // Calculate risk based on various factors
      
      // High-risk paths
      const highRiskPaths = ['/api/users', '/api/admin', '/api/companies', '/api/operations'];
      if (highRiskPaths.some(path => req.path.startsWith(path))) {
        riskScore += 30;
      }

      // Suspicious user agents
      const userAgent = req.get('User-Agent') || '';
      if (!userAgent || userAgent.includes('bot') || userAgent.includes('curl')) {
        riskScore += 20;
      }

      // Rate limiting triggered
      if (req.securityContext?.rateLimited) {
        riskScore += 40;
      }

      // Non-standard HTTP methods
      if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        riskScore += 25;
      }

      // Large payloads
      if (req.body && JSON.stringify(req.body).length > 10000) {
        riskScore += 15;
      }

      req.securityContext = { ...req.securityContext, riskScore };

      // Block high-risk requests
      if (riskScore >= 80) {
        this.logger?.error('High-risk request blocked', {
          riskScore,
          path: req.path,
          method: req.method,
          userId: req.user?.claims?.sub,
          ip: req.ip,
          userAgent
        });

        return res.status(403).json({
          error: 'Request blocked',
          message: 'This request has been identified as high-risk and has been blocked'
        });
      }

      // Log medium-risk requests
      if (riskScore >= 50) {
        this.logger?.warn('Medium-risk request detected', {
          riskScore,
          path: req.path,
          userId: req.user?.claims?.sub,
          ip: req.ip
        });
      }

      next();
    };
  }
}

// Convenience function to apply all security middleware
export function applySecurityMiddleware(app: any): void {
  // Initialize middleware
  SecurityMiddleware.initialize();

  // Apply global security middleware
  app.use(SecurityMiddleware.securityHeaders());
  app.use(SecurityMiddleware.auditLog());
  app.use(SecurityMiddleware.riskAssessment());
}

// Common validation schemas
export const CommonSchemas = {
  ID: z.string().uuid('Invalid ID format'),
  
  Email: z.string().email('Invalid email format').max(255),
  
  Name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Invalid name format'),
  
  Phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone format')
    .max(20),
  
  Password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  
  WorkOrderStatus: z.enum(['scheduled', 'confirmed', 'in_progress', 'pending', 'completed', 'cancelled']),
  
  Priority: z.enum(['low', 'medium', 'high', 'urgent']),
  
  Role: z.enum(['operations_director', 'administrator', 'manager', 'dispatcher', 'field_engineer', 'field_agent', 'client']),
  
  CompanyType: z.enum(['service', 'client']),
  
  PaginationQuery: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
};