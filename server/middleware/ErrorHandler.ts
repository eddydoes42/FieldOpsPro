/**
 * Centralized Error Handler for FieldOps Pro
 * Implements comprehensive error handling with audit logging and user feedback
 */

import { Request, Response, NextFunction } from 'express';
import { container, SERVICE_NAMES } from '../core/ServiceContainer';
import { ILogger, IAuditLogger } from '../core/ServiceContainer';
import { z } from 'zod';

export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  FILE_UPLOAD = 'FILE_UPLOAD_ERROR',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC_ERROR',
  SYSTEM = 'SYSTEM_ERROR'
}

export class ApplicationError extends Error {
  public type: ErrorType;
  public statusCode: number;
  public isOperational: boolean;
  public context?: any;
  public userId?: string;
  public timestamp: Date;

  constructor(
    message: string,
    type: ErrorType,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.context = context;
    this.timestamp = new Date();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, context?: any) {
    super(message, ErrorType.VALIDATION, 400, true, context);
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Authentication required', context?: any) {
    super(message, ErrorType.AUTHENTICATION, 401, true, context);
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'Insufficient permissions', context?: any) {
    super(message, ErrorType.AUTHORIZATION, 403, true, context);
  }
}

export class NotFoundError extends ApplicationError {
  constructor(message: string = 'Resource not found', context?: any) {
    super(message, ErrorType.NOT_FOUND, 404, true, context);
  }
}

export class ConflictError extends ApplicationError {
  constructor(message: string, context?: any) {
    super(message, ErrorType.CONFLICT, 409, true, context);
  }
}

export class DatabaseError extends ApplicationError {
  constructor(message: string, context?: any) {
    super(message, ErrorType.DATABASE, 500, true, context);
  }
}

export class BusinessLogicError extends ApplicationError {
  constructor(message: string, context?: any) {
    super(message, ErrorType.BUSINESS_LOGIC, 422, true, context);
  }
}

export class ErrorHandler {
  private static logger?: ILogger;
  private static auditLogger?: IAuditLogger;

  static async initialize(): Promise<void> {
    this.logger = container.get<ILogger>(SERVICE_NAMES.LOGGER);
    this.auditLogger = container.get<IAuditLogger>(SERVICE_NAMES.AUDIT_LOGGER);
  }

  // Main error handling middleware
  static handle() {
    return (error: Error, req: Request, res: Response, next: NextFunction) => {
      try {
        // Handle different error types
        if (error instanceof ApplicationError) {
          this.handleApplicationError(error, req, res);
        } else if (error instanceof z.ZodError) {
          this.handleValidationError(error, req, res);
        } else if (error.name === 'UnauthorizedError') {
          this.handleAuthError(error, req, res);
        } else {
          this.handleUnknownError(error, req, res);
        }
      } catch (handlerError) {
        // If error handler fails, log and send generic response
        this.logger?.error('Error handler failed', handlerError);
        res.status(500).json({
          error: 'Internal server error',
          message: 'An unexpected error occurred',
          requestId: this.generateRequestId()
        });
      }
    };
  }

  private static handleApplicationError(error: ApplicationError, req: Request, res: Response): void {
    const userId = req.user?.claims?.sub;
    error.userId = userId;

    // Log error with appropriate level
    const logLevel = error.statusCode >= 500 ? 'error' : 'warn';
    
    this.logger?.[logLevel](`Application Error: ${error.type}`, error, {
      userId,
      path: req.path,
      method: req.method,
      statusCode: error.statusCode,
      context: error.context,
      stack: error.stack
    });

    // Audit log for security-related errors
    if (this.isSecurityError(error.type)) {
      this.auditLogger?.logEvent({
        entityType: 'security',
        entityId: req.path,
        action: 'error_occurred',
        performedBy: userId || 'anonymous',
        metadata: {
          errorType: error.type,
          statusCode: error.statusCode,
          message: error.message,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        }
      });
    }

    // Send response
    const response = this.formatErrorResponse(error, req);
    res.status(error.statusCode).json(response);
  }

  private static handleValidationError(error: z.ZodError, req: Request, res: Response): void {
    const validationError = new ValidationError('Input validation failed', {
      issues: error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }))
    });

    this.handleApplicationError(validationError, req, res);
  }

  private static handleAuthError(error: Error, req: Request, res: Response): void {
    const authError = new AuthenticationError(error.message, {
      originalError: error.name
    });

    this.handleApplicationError(authError, req, res);
  }

  private static handleUnknownError(error: Error, req: Request, res: Response): void {
    const systemError = new ApplicationError(
      'An unexpected error occurred',
      ErrorType.SYSTEM,
      500,
      false,
      {
        originalMessage: error.message,
        originalStack: error.stack,
        errorName: error.name
      }
    );

    this.handleApplicationError(systemError, req, res);
  }

  private static formatErrorResponse(error: ApplicationError, req: Request): any {
    const requestId = this.generateRequestId();
    
    const baseResponse = {
      error: error.type,
      message: error.message,
      statusCode: error.statusCode,
      timestamp: error.timestamp.toISOString(),
      requestId
    };

    // Add context for development/debugging (exclude in production)
    if (process.env.NODE_ENV !== 'production') {
      return {
        ...baseResponse,
        context: error.context,
        stack: error.stack,
        path: req.path,
        method: req.method
      };
    }

    // Add validation details for client-side handling
    if (error.type === ErrorType.VALIDATION && error.context) {
      return {
        ...baseResponse,
        validationErrors: error.context.issues
      };
    }

    return baseResponse;
  }

  private static isSecurityError(errorType: ErrorType): boolean {
    return [
      ErrorType.AUTHENTICATION,
      ErrorType.AUTHORIZATION,
      ErrorType.RATE_LIMIT
    ].includes(errorType);
  }

  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Async error wrapper for route handlers
  static asyncWrapper(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Graceful shutdown error handler
  static handleUncaughtException(error: Error): void {
    this.logger?.error('Uncaught Exception', error, {
      processInfo: {
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    });

    // Attempt graceful shutdown
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  }

  static handleUnhandledRejection(reason: any, promise: Promise<any>): void {
    this.logger?.error('Unhandled Promise Rejection', new Error(reason), {
      promise: promise.toString(),
      reason
    });
  }

  // Health check for error handling system
  static getHealthStatus(): any {
    return {
      errorHandler: {
        status: 'operational',
        initialized: !!(this.logger && this.auditLogger),
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Convenience functions for throwing specific errors
export const throwValidationError = (message: string, context?: any): never => {
  throw new ValidationError(message, context);
};

export const throwAuthError = (message?: string, context?: any): never => {
  throw new AuthenticationError(message, context);
};

export const throwAuthzError = (message?: string, context?: any): never => {
  throw new AuthorizationError(message, context);
};

export const throwNotFoundError = (message?: string, context?: any): never => {
  throw new NotFoundError(message, context);
};

export const throwConflictError = (message: string, context?: any): never => {
  throw new ConflictError(message, context);
};

export const throwDatabaseError = (message: string, context?: any): never => {
  throw new DatabaseError(message, context);
};

export const throwBusinessError = (message: string, context?: any): never => {
  throw new BusinessLogicError(message, context);
};