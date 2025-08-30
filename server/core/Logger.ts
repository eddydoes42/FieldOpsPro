/**
 * Centralized Logging Service for FieldOps Pro
 * Provides structured logging with audit trail capabilities
 */

import { ILogger, IService } from './ServiceContainer';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  meta?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  userId?: string;
  sessionId?: string;
  requestId?: string;
  module?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableAuditTrail: boolean;
  format: 'json' | 'text';
}

export class Logger implements ILogger, IService {
  private config: LoggerConfig;
  private logEntries: LogEntry[] = [];
  private readonly maxEntries = 10000; // Keep last 10k entries in memory

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      enableAuditTrail: true,
      format: 'json',
      ...config
    };
  }

  getName(): string {
    return 'Logger';
  }

  getVersion(): string {
    return '1.0.0';
  }

  async initialize(): Promise<void> {
    this.info('Logger initialized', { config: this.config });
  }

  debug(message: string, meta?: any): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  info(message: string, meta?: any): void {
    this.log(LogLevel.INFO, message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log(LogLevel.WARN, message, meta);
  }

  error(message: string, error?: Error, meta?: any): void {
    const errorInfo = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : undefined;

    this.log(LogLevel.ERROR, message, meta, errorInfo);
  }

  private log(level: LogLevel, message: string, meta?: any, error?: any): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      meta,
      error,
      module: this.getCallerModule()
    };

    // Store in memory for audit trail
    if (this.config.enableAuditTrail) {
      this.logEntries.push(entry);
      if (this.logEntries.length > this.maxEntries) {
        this.logEntries.shift(); // Remove oldest entry
      }
    }

    // Console output
    if (this.config.enableConsole) {
      this.writeToConsole(entry);
    }

    // File output (would be implemented for production)
    if (this.config.enableFile) {
      this.writeToFile(entry);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    
    if (this.config.format === 'json') {
      console.log(JSON.stringify({
        timestamp,
        level: levelName,
        message: entry.message,
        meta: entry.meta,
        error: entry.error,
        module: entry.module
      }));
    } else {
      const metaStr = entry.meta ? ` ${JSON.stringify(entry.meta)}` : '';
      const errorStr = entry.error ? ` ERROR: ${entry.error.message}` : '';
      console.log(`[${timestamp}] ${levelName}: ${entry.message}${metaStr}${errorStr}`);
    }
  }

  private writeToFile(entry: LogEntry): void {
    // File logging implementation would go here
    // For now, just ensure the interface is in place
  }

  private getCallerModule(): string {
    const stack = new Error().stack;
    if (!stack) return 'unknown';

    const lines = stack.split('\n');
    // Skip the first 4 lines to get to the actual caller
    for (let i = 4; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('/server/') && !line.includes('/core/')) {
        const match = line.match(/\/server\/([^\/]+)/);
        return match ? match[1] : 'unknown';
      }
    }
    
    return 'unknown';
  }

  // Audit trail methods
  getRecentLogs(limit: number = 100): LogEntry[] {
    return this.logEntries.slice(-limit);
  }

  getLogsByLevel(level: LogLevel, limit: number = 100): LogEntry[] {
    return this.logEntries
      .filter(entry => entry.level >= level)
      .slice(-limit);
  }

  getLogsByTimeRange(start: Date, end: Date): LogEntry[] {
    return this.logEntries.filter(entry => 
      entry.timestamp >= start && entry.timestamp <= end
    );
  }

  // Security audit specific methods
  getSecurityLogs(): LogEntry[] {
    return this.logEntries.filter(entry => 
      entry.message.toLowerCase().includes('security') ||
      entry.message.toLowerCase().includes('auth') ||
      entry.message.toLowerCase().includes('permission') ||
      entry.level === LogLevel.ERROR
    );
  }

  exportAuditTrail(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logEntries, null, 2);
    } else {
      // CSV export
      const headers = 'timestamp,level,message,module,error\n';
      const rows = this.logEntries.map(entry => 
        `${entry.timestamp.toISOString()},${LogLevel[entry.level]},"${entry.message}",${entry.module},"${entry.error?.message || ''}"`
      ).join('\n');
      return headers + rows;
    }
  }
}