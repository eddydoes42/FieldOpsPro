/**
 * Central Event Bus for FieldOps Pro
 * Handles all inter-module communication and event-driven workflows
 */

import { IEventBus, IService, ILogger } from './ServiceContainer';

export interface EventPayload {
  timestamp: Date;
  source: string;
  userId?: string;
  sessionId?: string;
  metadata?: any;
}

export interface WorkOrderEvent extends EventPayload {
  workOrderId: string;
  previousStatus?: string;
  newStatus?: string;
}

export interface UserEvent extends EventPayload {
  targetUserId: string;
  action: string;
}

export interface SecurityEvent extends EventPayload {
  level: 'info' | 'warning' | 'critical';
  riskScore?: number;
}

export interface RoleImpersonationEvent extends EventPayload {
  originalUserId: string;
  impersonatedUserId: string;
  role: string;
  companyType: 'service' | 'client';
}

export class EventBus implements IEventBus, IService {
  private handlers = new Map<string, Array<(data: any) => void>>();
  private logger?: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger;
  }

  getName(): string {
    return 'EventBus';
  }

  getVersion(): string {
    return '1.0.0';
  }

  async initialize(): Promise<void> {
    this.logger?.info('EventBus initialized', { 
      registeredEvents: Array.from(this.handlers.keys()) 
    });
  }

  emit(event: string, data: any): void {
    const handlers = this.handlers.get(event) || [];
    
    this.logger?.debug(`Event emitted: ${event}`, { 
      handlerCount: handlers.length,
      data: this.sanitizeEventData(data)
    });

    // Add standard event metadata
    const enrichedData = {
      ...data,
      timestamp: new Date(),
      eventName: event
    };

    handlers.forEach(handler => {
      try {
        handler(enrichedData);
      } catch (error) {
        this.logger?.error(`Error in event handler for ${event}`, error, { data });
      }
    });
  }

  on(event: string, handler: (data: any) => void): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);

    this.logger?.debug(`Event handler registered for: ${event}`, {
      totalHandlers: this.handlers.get(event)!.length
    });
  }

  off(event: string, handler: (data: any) => void): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        this.logger?.debug(`Event handler removed for: ${event}`);
      }
    }
  }

  // Get all registered events (for debugging)
  getRegisteredEvents(): string[] {
    return Array.from(this.handlers.keys());
  }

  // Get handler count for an event
  getHandlerCount(event: string): number {
    return this.handlers.get(event)?.length || 0;
  }

  private sanitizeEventData(data: any): any {
    // Remove sensitive information from logs
    const sanitized = { ...data };
    
    // Remove passwords, tokens, etc.
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

// Event name constants
export const EVENTS = {
  // Work Order Events
  WORK_ORDER_CREATED: 'workOrder.created',
  WORK_ORDER_ASSIGNED: 'workOrder.assigned',
  WORK_ORDER_STATUS_CHANGED: 'workOrder.statusChanged',
  WORK_ORDER_COMPLETED: 'workOrder.completed',
  
  // User Events
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_ROLE_CHANGED: 'user.roleChanged',
  USER_SUSPENDED: 'user.suspended',
  
  // Security Events
  SECURITY_BREACH_DETECTED: 'security.breachDetected',
  RATE_LIMIT_EXCEEDED: 'security.rateLimitExceeded',
  UNAUTHORIZED_ACCESS: 'security.unauthorizedAccess',
  
  // Role Impersonation Events
  ROLE_IMPERSONATION_STARTED: 'roleImpersonation.started',
  ROLE_IMPERSONATION_STOPPED: 'roleImpersonation.stopped',
  
  // Document Events
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_ACCESSED: 'document.accessed',
  
  // Issue Events
  ISSUE_CREATED: 'issue.created',
  ISSUE_ESCALATED: 'issue.escalated',
  ISSUE_RESOLVED: 'issue.resolved'
} as const;