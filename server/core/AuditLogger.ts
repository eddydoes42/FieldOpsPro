/**
 * Audit Logger Service for FieldOps Pro
 * Provides comprehensive audit trail functionality with security focus
 */

import { IAuditLogger, IService, ILogger, container, SERVICE_NAMES } from './ServiceContainer';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuditQuery {
  entityType?: string;
  entityId?: string;
  action?: string;
  performedBy?: string;
  dateFrom?: Date;
  dateTo?: Date;
  riskLevel?: string;
  limit?: number;
  offset?: number;
}

export class AuditLogger implements IAuditLogger, IService {
  private logger?: ILogger;
  private auditEntries: AuditLogEntry[] = [];
  private readonly maxEntries = 50000; // Keep last 50k audit entries
  private criticalAuditQueue: AuditLogEntry[] = [];

  constructor() {}

  getName(): string {
    return 'AuditLogger';
  }

  getVersion(): string {
    return '1.0.0';
  }

  async initialize(): Promise<void> {
    this.logger = container.get<ILogger>(SERVICE_NAMES.LOGGER);
    this.logger?.info('Audit Logger initialized', {
      maxEntries: this.maxEntries,
      retentionPolicy: 'memory-based'
    });

    // Process critical audit queue periodically
    setInterval(() => this.processCriticalAuditQueue(), 5000); // Every 5 seconds
  }

  async logEvent(config: {
    entityType: string;
    entityId: string;
    action: string;
    performedBy: string;
    previousState?: any;
    newState?: any;
    reason?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        id: this.generateAuditId(),
        timestamp: new Date(),
        entityType: config.entityType,
        entityId: config.entityId,
        action: config.action,
        performedBy: config.performedBy,
        previousState: this.sanitizeState(config.previousState),
        newState: this.sanitizeState(config.newState),
        reason: config.reason,
        metadata: config.metadata,
        riskLevel: this.calculateRiskLevel(config)
      };

      // Add to audit log
      this.auditEntries.push(auditEntry);

      // Trim if necessary
      if (this.auditEntries.length > this.maxEntries) {
        this.auditEntries.shift();
      }

      // Queue critical entries for immediate processing
      if (auditEntry.riskLevel === 'critical' || auditEntry.riskLevel === 'high') {
        this.criticalAuditQueue.push(auditEntry);
      }

      // Log to standard logger
      this.logger?.info('Audit event logged', {
        entityType: auditEntry.entityType,
        entityId: auditEntry.entityId,
        action: auditEntry.action,
        performedBy: auditEntry.performedBy,
        riskLevel: auditEntry.riskLevel,
        timestamp: auditEntry.timestamp.toISOString()
      });

      // Immediate alerts for critical events
      if (auditEntry.riskLevel === 'critical') {
        this.handleCriticalAuditEvent(auditEntry);
      }

    } catch (error) {
      this.logger?.error('Failed to log audit event', error instanceof Error ? error : new Error(String(error)), config);
      throw error;
    }
  }

  // Query audit logs
  queryAuditLogs(query: AuditQuery): Promise<AuditLogEntry[]> {
    return Promise.resolve(this.queryAuditLogsSync(query));
  }

  private queryAuditLogsSync(query: AuditQuery): AuditLogEntry[] {
    let filteredEntries = [...this.auditEntries];

    // Apply filters
    if (query.entityType) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.entityType === query.entityType
      );
    }

    if (query.entityId) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.entityId === query.entityId
      );
    }

    if (query.action) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.action === query.action
      );
    }

    if (query.performedBy) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.performedBy === query.performedBy
      );
    }

    if (query.riskLevel) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.riskLevel === query.riskLevel
      );
    }

    if (query.dateFrom) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.timestamp >= query.dateFrom!
      );
    }

    if (query.dateTo) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.timestamp <= query.dateTo!
      );
    }

    // Sort by timestamp (newest first)
    filteredEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    
    return filteredEntries.slice(offset, offset + limit);
  }

  // Security-focused audit queries
  getSecurityAuditTrail(userId?: string, hours: number = 24): Promise<AuditLogEntry[]> {
    const dateFrom = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const securityActions = [
      'login', 'logout', 'authentication_failed', 'authorization_denied',
      'role_changed', 'impersonation_started', 'impersonation_stopped',
      'password_changed', 'account_locked', 'account_unlocked',
      'permission_escalation', 'sensitive_data_access'
    ];

    return Promise.resolve(this.auditEntries.filter(entry => {
      const matchesTimeframe = entry.timestamp >= dateFrom;
      const matchesUser = !userId || entry.performedBy === userId;
      const isSecurityAction = securityActions.some(action => 
        entry.action.includes(action)
      );
      const isHighRisk = entry.riskLevel === 'high' || entry.riskLevel === 'critical';

      return matchesTimeframe && matchesUser && (isSecurityAction || isHighRisk);
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
  }

  // Compliance reporting
  generateComplianceReport(dateFrom: Date, dateTo: Date): Promise<any> {
    const complianceEntries = this.auditEntries.filter(entry => 
      entry.timestamp >= dateFrom && entry.timestamp <= dateTo
    );

    const report = {
      reportPeriod: {
        from: dateFrom.toISOString(),
        to: dateTo.toISOString()
      },
      summary: {
        totalEvents: complianceEntries.length,
        criticalEvents: complianceEntries.filter(e => e.riskLevel === 'critical').length,
        highRiskEvents: complianceEntries.filter(e => e.riskLevel === 'high').length,
        uniqueUsers: new Set(complianceEntries.map(e => e.performedBy)).size,
        entityTypes: new Set(complianceEntries.map(e => e.entityType)).size
      },
      riskDistribution: this.calculateRiskDistribution(complianceEntries),
      topUsers: this.getTopUsersByActivity(complianceEntries),
      criticalEvents: complianceEntries
        .filter(e => e.riskLevel === 'critical')
        .slice(0, 20), // Latest 20 critical events
      securityEvents: complianceEntries.filter(e => 
        e.action.includes('security') || 
        e.action.includes('auth') ||
        e.riskLevel === 'critical'
      ),
      dataAccessEvents: complianceEntries.filter(e => 
        e.action.includes('access') || 
        e.action.includes('read') ||
        e.action.includes('export')
      )
    };

    this.logger?.info('Compliance report generated', {
      period: report.reportPeriod,
      totalEvents: report.summary.totalEvents,
      criticalEvents: report.summary.criticalEvents
    });

    return Promise.resolve(report);
  }

  // Performance and integrity methods
  getAuditStatistics(): any {
    return {
      totalEntries: this.auditEntries.length,
      maxCapacity: this.maxEntries,
      utilizationPercentage: (this.auditEntries.length / this.maxEntries) * 100,
      criticalQueueSize: this.criticalAuditQueue.length,
      oldestEntry: this.auditEntries.length > 0 ? this.auditEntries[0].timestamp : null,
      newestEntry: this.auditEntries.length > 0 ? 
        this.auditEntries[this.auditEntries.length - 1].timestamp : null,
      riskLevelDistribution: this.calculateRiskDistribution(this.auditEntries)
    };
  }

  async exportAuditTrail(format: 'json' | 'csv' = 'json', query?: AuditQuery): Promise<string> {
    const entries = query ? 
      await this.queryAuditLogs(query) : 
      [...this.auditEntries].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (format === 'json') {
      return JSON.stringify(entries, null, 2);
    } else {
      // CSV export
      const headers = [
        'timestamp', 'entityType', 'entityId', 'action', 'performedBy', 
        'riskLevel', 'reason', 'metadata'
      ].join(',');
      
      const rows = entries.map(entry => [
        entry.timestamp.toISOString(),
        entry.entityType,
        entry.entityId,
        entry.action,
        entry.performedBy,
        entry.riskLevel || 'low',
        `"${(entry.reason || '').replace(/"/g, '""')}"`,
        `"${JSON.stringify(entry.metadata || {}).replace(/"/g, '""')}"`
      ].join(','));

      return [headers, ...rows].join('\n');
    }
  }

  // Private helper methods
  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeState(state: any): any {
    if (!state) return state;

    // Remove sensitive fields
    const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'key'];
    const sanitized = JSON.parse(JSON.stringify(state));

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          obj[key] = sanitizeObject(obj[key]);
        }
      }
      return obj;
    };

    return sanitizeObject(sanitized);
  }

  private calculateRiskLevel(config: any): 'low' | 'medium' | 'high' | 'critical' {
    let score = 0;

    // High-risk entity types
    const highRiskEntities = ['user', 'company', 'security', 'permission', 'role'];
    if (highRiskEntities.includes(config.entityType.toLowerCase())) {
      score += 20;
    }

    // High-risk actions
    const highRiskActions = [
      'delete', 'create', 'login_failed', 'permission_denied', 
      'role_changed', 'impersonation', 'data_export'
    ];
    if (highRiskActions.some(action => config.action.toLowerCase().includes(action))) {
      score += 30;
    }

    // Critical actions
    const criticalActions = [
      'delete_user', 'delete_company', 'security_breach', 
      'unauthorized_access', 'data_breach'
    ];
    if (criticalActions.some(action => config.action.toLowerCase().includes(action))) {
      score += 50;
    }

    // Operations Director actions are always medium+ risk
    if (config.performedBy === 'operations_director' || 
        (config.metadata && config.metadata.role === 'operations_director')) {
      score += 15;
    }

    if (score >= 70) return 'critical';
    if (score >= 40) return 'high';
    if (score >= 20) return 'medium';
    return 'low';
  }

  private calculateRiskDistribution(entries: AuditLogEntry[]): any {
    const distribution = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    entries.forEach(entry => {
      const level = entry.riskLevel || 'low';
      distribution[level]++;
    });

    return distribution;
  }

  private getTopUsersByActivity(entries: AuditLogEntry[], limit: number = 10): any[] {
    const userActivity = new Map<string, number>();
    
    entries.forEach(entry => {
      const count = userActivity.get(entry.performedBy) || 0;
      userActivity.set(entry.performedBy, count + 1);
    });

    return Array.from(userActivity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([userId, count]) => ({ userId, activityCount: count }));
  }

  private handleCriticalAuditEvent(entry: AuditLogEntry): void {
    this.logger?.error('CRITICAL AUDIT EVENT', undefined, {
      auditId: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      performedBy: entry.performedBy,
      timestamp: entry.timestamp,
      metadata: entry.metadata
    });

    // Additional critical event handling would go here
    // - Send alerts to administrators
    // - Trigger security protocols
    // - Log to external systems
  }

  private async processCriticalAuditQueue(): Promise<void> {
    if (this.criticalAuditQueue.length === 0) return;

    try {
      const criticalEntries = [...this.criticalAuditQueue];
      this.criticalAuditQueue = [];

      // Process critical entries
      for (const entry of criticalEntries) {
        // In production, this would:
        // - Send to external SIEM systems
        // - Trigger real-time alerts
        // - Write to secure audit database
        
        this.logger?.warn('Processing critical audit entry', {
          auditId: entry.id,
          entityType: entry.entityType,
          action: entry.action,
          riskLevel: entry.riskLevel
        });
      }

    } catch (error) {
      this.logger?.error('Failed to process critical audit queue', error instanceof Error ? error : new Error(String(error)));
    }
  }
}