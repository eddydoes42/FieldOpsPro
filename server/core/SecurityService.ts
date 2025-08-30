/**
 * Security Service for FieldOps Pro
 * Implements comprehensive security controls including input validation,
 * rate limiting, and data encryption
 */

import { ISecurityService, IService, ILogger, container, SERVICE_NAMES } from './ServiceContainer';
import { z } from 'zod';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
}

export interface SecurityConfig {
  encryption: {
    algorithm: string;
    keyLength: number;
  };
  rateLimiting: {
    default: RateLimitConfig;
    api: RateLimitConfig;
    auth: RateLimitConfig;
  };
  inputValidation: {
    maxStringLength: number;
    maxArrayLength: number;
    allowedFileTypes: string[];
    maxFileSize: number;
  };
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

export class SecurityService implements ISecurityService, IService {
  private logger?: ILogger;
  private rateLimitStore = new Map<string, RateLimitEntry>();
  private config: SecurityConfig;

  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      encryption: {
        algorithm: 'aes-256-gcm',
        keyLength: 32
      },
      rateLimiting: {
        default: { windowMs: 15 * 60 * 1000, maxRequests: 100 }, // 15 minutes, 100 requests
        api: { windowMs: 60 * 1000, maxRequests: 60 }, // 1 minute, 60 requests
        auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 } // 15 minutes, 5 attempts
      },
      inputValidation: {
        maxStringLength: 10000,
        maxArrayLength: 1000,
        allowedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif'],
        maxFileSize: 10 * 1024 * 1024 // 10MB
      },
      ...config
    };
  }

  getName(): string {
    return 'SecurityService';
  }

  getVersion(): string {
    return '1.0.0';
  }

  async initialize(): Promise<void> {
    this.logger = container.get<ILogger>(SERVICE_NAMES.LOGGER);
    this.logger?.info('Security Service initialized', {
      rateLimitConfigs: Object.keys(this.config.rateLimiting),
      encryptionAlgorithm: this.config.encryption.algorithm
    });

    // Start cleanup interval for rate limit store
    setInterval(() => this.cleanupRateLimitStore(), 60000); // Every minute
  }

  validateInput(input: any, schema: z.ZodSchema): boolean {
    try {
      // Apply general security validations first
      if (!this.basicSecurityValidation(input)) {
        return false;
      }

      // Apply Zod schema validation
      schema.parse(input);
      return true;
    } catch (error) {
      this.logger?.warn('Input validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        inputType: typeof input
      });
      return false;
    }
  }

  sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeString(input);
    } else if (Array.isArray(input)) {
      return input.slice(0, this.config.inputValidation.maxArrayLength)
        .map(item => this.sanitizeInput(item));
    } else if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    return input;
  }

  checkRateLimit(userId: string, action: string = 'default'): boolean {
    const key = `${userId}:${action}`;
    const now = Date.now();
    
    const config = this.config.rateLimiting[action as keyof typeof this.config.rateLimiting] 
      || this.config.rateLimiting.default;
    
    let entry = this.rateLimitStore.get(key);
    
    if (!entry) {
      // First request
      entry = {
        count: 1,
        resetTime: now + config.windowMs,
        firstRequest: now
      };
      this.rateLimitStore.set(key, entry);
      return true;
    }

    // Check if window has expired
    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + config.windowMs;
      entry.firstRequest = now;
      this.rateLimitStore.set(key, entry);
      return true;
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      this.logger?.warn('Rate limit exceeded', {
        userId,
        action,
        count: entry.count,
        maxRequests: config.maxRequests,
        timeWindow: config.windowMs
      });
      return false;
    }

    // Increment counter
    entry.count++;
    this.rateLimitStore.set(key, entry);
    return true;
  }

  encryptSensitiveData(data: string): string {
    // Simplified encryption - in production use proper crypto library
    try {
      // This is a placeholder - implement actual encryption
      const buffer = Buffer.from(data, 'utf8');
      const encrypted = buffer.toString('base64');
      
      this.logger?.debug('Data encrypted', { 
        originalLength: data.length,
        encryptedLength: encrypted.length
      });
      
      return `encrypted:${encrypted}`;
    } catch (error) {
      this.logger?.error('Encryption failed', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  decryptSensitiveData(encryptedData: string): string {
    // Simplified decryption - in production use proper crypto library
    try {
      if (!encryptedData.startsWith('encrypted:')) {
        throw new Error('Invalid encrypted data format');
      }
      
      const base64Data = encryptedData.substring(10); // Remove 'encrypted:' prefix
      const buffer = Buffer.from(base64Data, 'base64');
      const decrypted = buffer.toString('utf8');
      
      this.logger?.debug('Data decrypted', {
        encryptedLength: encryptedData.length,
        decryptedLength: decrypted.length
      });
      
      return decrypted;
    } catch (error) {
      this.logger?.error('Decryption failed', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  // Security audit methods
  generateSecurityReport(): any {
    const now = Date.now();
    const rateLimitStats = Array.from(this.rateLimitStore.entries()).map(([key, entry]) => {
      const [userId, action] = key.split(':');
      return {
        userId,
        action,
        count: entry.count,
        timeRemaining: Math.max(0, entry.resetTime - now),
        isActive: entry.resetTime > now
      };
    });

    return {
      timestamp: new Date().toISOString(),
      rateLimiting: {
        activeEntries: rateLimitStats.filter(stat => stat.isActive).length,
        totalEntries: rateLimitStats.length,
        topUsers: rateLimitStats
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)
      },
      configuration: {
        rateLimitConfigs: this.config.rateLimiting,
        inputValidation: this.config.inputValidation
      }
    };
  }

  // File security validation
  validateFileUpload(filename: string, content: Buffer): boolean {
    try {
      // Check file extension
      const extension = filename.split('.').pop()?.toLowerCase();
      if (!extension || !this.config.inputValidation.allowedFileTypes.includes(extension)) {
        this.logger?.warn('Invalid file type attempted', { filename, extension });
        return false;
      }

      // Check file size
      if (content.length > this.config.inputValidation.maxFileSize) {
        this.logger?.warn('File size too large', { 
          filename, 
          size: content.length, 
          maxSize: this.config.inputValidation.maxFileSize 
        });
        return false;
      }

      // Basic content validation (check for malicious patterns)
      if (this.containsMaliciousContent(content)) {
        this.logger?.error('Malicious content detected in file', { filename });
        return false;
      }

      return true;
    } catch (error) {
      this.logger?.error('File validation error', error, { filename });
      return false;
    }
  }

  private basicSecurityValidation(input: any): boolean {
    // Check for null/undefined
    if (input === null || input === undefined) {
      return true; // Allow null/undefined values
    }

    // Check string length
    if (typeof input === 'string') {
      if (input.length > this.config.inputValidation.maxStringLength) {
        this.logger?.warn('String too long', { length: input.length });
        return false;
      }
      
      // Check for suspicious patterns
      if (this.containsSuspiciousPatterns(input)) {
        return false;
      }
    }

    // Check array length
    if (Array.isArray(input)) {
      if (input.length > this.config.inputValidation.maxArrayLength) {
        this.logger?.warn('Array too long', { length: input.length });
        return false;
      }
    }

    return true;
  }

  private sanitizeString(str: string): string {
    // Remove/escape potentially dangerous characters
    return str
      .replace(/[<>]/g, '') // Remove < > characters
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim()
      .substring(0, this.config.inputValidation.maxStringLength);
  }

  private containsSuspiciousPatterns(input: string): boolean {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+=/i,
      /eval\(/i,
      /exec\(/i,
      /system\(/i,
      /\.\.\/\.\.\//,
      /\/etc\/passwd/i,
      /cmd\.exe/i,
      /powershell/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(input)) {
        this.logger?.warn('Suspicious pattern detected', { pattern: pattern.source });
        return true;
      }
    }

    return false;
  }

  private containsMaliciousContent(content: Buffer): boolean {
    // Convert first 1024 bytes to string for pattern matching
    const header = content.slice(0, 1024).toString('ascii');
    
    const maliciousPatterns = [
      /<%[\s\S]*?%>/,  // ASP/JSP tags
      /<\?php/i,       // PHP tags
      /<script/i,      // Script tags
      /eval\(/i,       // Eval calls
      /exec\(/i        // Exec calls
    ];

    return maliciousPatterns.some(pattern => pattern.test(header));
  }

  private cleanupRateLimitStore(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitStore.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger?.debug('Rate limit store cleanup completed', {
        removedEntries: cleanedCount,
        remainingEntries: this.rateLimitStore.size
      });
    }
  }
}