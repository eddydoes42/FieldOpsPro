/**
 * Security Enforcement Service for FieldOps Pro
 * Implements comprehensive security policies and enforcement mechanisms
 */

import { container, SERVICE_NAMES, IService, ILogger, IAuditLogger, IRBACService, ISecurityService } from '../core/ServiceContainer';
import { EVENTS } from '../core/EventBus';

export interface SecurityPolicy {
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  rules: SecurityRule[];
}

export interface SecurityRule {
  type: 'rate_limit' | 'permission' | 'data_access' | 'authentication' | 'file_upload';
  conditions: any;
  action: 'allow' | 'deny' | 'audit' | 'alert';
  message?: string;
}

export interface SecurityViolation {
  id: string;
  timestamp: Date;
  userId?: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: any;
  ipAddress?: string;
  userAgent?: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export class SecurityEnforcementService implements IService {
  private logger?: ILogger;
  private auditLogger?: IAuditLogger;
  private rbacService?: IRBACService;
  private securityService?: ISecurityService;
  
  private policies: Map<string, SecurityPolicy> = new Map();
  private violations: SecurityViolation[] = [];
  private readonly maxViolations = 10000;

  constructor() {
    this.initializeDefaultPolicies();
  }

  getName(): string {
    return 'SecurityEnforcementService';
  }

  getVersion(): string {
    return '1.0.0';
  }

  async initialize(): Promise<void> {
    this.logger = container.get<ILogger>(SERVICE_NAMES.LOGGER);
    this.auditLogger = container.get<IAuditLogger>(SERVICE_NAMES.AUDIT_LOGGER);
    this.rbacService = container.get<IRBACService>(SERVICE_NAMES.RBAC);
    this.securityService = container.get<ISecurityService>(SERVICE_NAMES.SECURITY);

    this.logger?.info('Security Enforcement Service initialized', {
      policiesCount: this.policies.size,
      policies: Array.from(this.policies.keys())
    });

    // Start violation cleanup
    setInterval(() => this.cleanupViolations(), 60000); // Every minute
  }

  // Policy Management
  addPolicy(policy: SecurityPolicy): void {
    this.policies.set(policy.name, policy);
    this.logger?.info('Security policy added', { policyName: policy.name, severity: policy.severity });
  }

  removePolicy(policyName: string): void {
    this.policies.delete(policyName);
    this.logger?.info('Security policy removed', { policyName });
  }

  enablePolicy(policyName: string): void {
    const policy = this.policies.get(policyName);
    if (policy) {
      policy.enabled = true;
      this.logger?.info('Security policy enabled', { policyName });
    }
  }

  disablePolicy(policyName: string): void {
    const policy = this.policies.get(policyName);
    if (policy) {
      policy.enabled = false;
      this.logger?.info('Security policy disabled', { policyName });
    }
  }

  // Security Enforcement
  async enforceSecurityPolicies(context: {
    userId?: string;
    action: string;
    resource: string;
    ipAddress?: string;
    userAgent?: string;
    data?: any;
  }): Promise<boolean> {
    let allowed = true;
    const violations: SecurityViolation[] = [];

    for (const [policyName, policy] of this.policies) {
      if (!policy.enabled) continue;

      const violation = await this.checkPolicyViolation(policy, context);
      if (violation) {
        violations.push(violation);
        
        if (policy.severity === 'critical' || policy.severity === 'high') {
          allowed = false;
        }
      }
    }

    // Process violations
    for (const violation of violations) {
      await this.handleSecurityViolation(violation, context);
    }

    return allowed;
  }

  private async checkPolicyViolation(
    policy: SecurityPolicy, 
    context: any
  ): Promise<SecurityViolation | null> {
    for (const rule of policy.rules) {
      const violationDetails = await this.evaluateRule(rule, context);
      
      if (violationDetails) {
        return {
          id: this.generateViolationId(),
          timestamp: new Date(),
          userId: context.userId,
          violationType: `${policy.name}_${rule.type}`,
          severity: policy.severity,
          details: violationDetails,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          resolved: false
        };
      }
    }

    return null;
  }

  private async evaluateRule(rule: SecurityRule, context: any): Promise<any | null> {
    switch (rule.type) {
      case 'rate_limit':
        return this.evaluateRateLimitRule(rule, context);
      
      case 'permission':
        return await this.evaluatePermissionRule(rule, context);
      
      case 'data_access':
        return this.evaluateDataAccessRule(rule, context);
      
      case 'authentication':
        return this.evaluateAuthenticationRule(rule, context);
      
      case 'file_upload':
        return this.evaluateFileUploadRule(rule, context);
      
      default:
        this.logger?.warn('Unknown security rule type', { ruleType: rule.type });
        return null;
    }
  }

  private evaluateRateLimitRule(rule: SecurityRule, context: any): any | null {
    if (!context.userId) return null;
    
    const rateLimitOk = this.securityService?.checkRateLimit(context.userId, context.action);
    
    if (!rateLimitOk) {
      return {
        rule: rule.type,
        userId: context.userId,
        action: context.action,
        message: 'Rate limit exceeded'
      };
    }
    
    return null;
  }

  private async evaluatePermissionRule(rule: SecurityRule, context: any): Promise<any | null> {
    if (!context.userId) return null;
    
    const hasPermission = await this.rbacService?.hasPermission(
      context.userId, 
      context.resource, 
      context.action
    );
    
    if (!hasPermission) {
      return {
        rule: rule.type,
        userId: context.userId,
        resource: context.resource,
        action: context.action,
        message: 'Permission denied'
      };
    }
    
    return null;
  }

  private evaluateDataAccessRule(rule: SecurityRule, context: any): any | null {
    // Check for sensitive data access patterns
    const sensitivePatterns = ['password', 'secret', 'token', 'key', 'credential'];
    const dataString = JSON.stringify(context.data || {}).toLowerCase();
    
    for (const pattern of sensitivePatterns) {
      if (dataString.includes(pattern)) {
        return {
          rule: rule.type,
          pattern,
          message: 'Sensitive data access detected'
        };
      }
    }
    
    return null;
  }

  private evaluateAuthenticationRule(rule: SecurityRule, context: any): any | null {
    // Check for authentication anomalies
    if (!context.userId && context.action !== 'login') {
      return {
        rule: rule.type,
        action: context.action,
        message: 'Unauthenticated access to protected resource'
      };
    }
    
    return null;
  }

  private evaluateFileUploadRule(rule: SecurityRule, context: any): any | null {
    // File upload security checks would go here
    return null;
  }

  // Violation Handling
  private async handleSecurityViolation(violation: SecurityViolation, context: any): Promise<void> {
    // Store violation
    this.violations.push(violation);
    
    // Trim if necessary
    if (this.violations.length > this.maxViolations) {
      this.violations.shift();
    }

    // Log violation
    this.logger?.warn('Security policy violation', {
      violationId: violation.id,
      type: violation.violationType,
      severity: violation.severity,
      userId: violation.userId,
      details: violation.details
    });

    // Audit log
    await this.auditLogger?.logEvent({
      entityType: 'security',
      entityId: violation.id,
      action: 'security_violation',
      performedBy: violation.userId || 'anonymous',
      metadata: {
        violationType: violation.violationType,
        severity: violation.severity,
        details: violation.details,
        ipAddress: violation.ipAddress,
        userAgent: violation.userAgent
      }
    });

    // Emit security event
    const eventBus = container.get(SERVICE_NAMES.EVENT_BUS);
    eventBus.emit(EVENTS.SECURITY_BREACH_DETECTED, {
      violation,
      context,
      timestamp: new Date()
    });

    // Handle critical violations immediately
    if (violation.severity === 'critical') {
      await this.handleCriticalViolation(violation, context);
    }
  }

  private async handleCriticalViolation(violation: SecurityViolation, context: any): Promise<void> {
    this.logger?.error('CRITICAL SECURITY VIOLATION', undefined, {
      violationId: violation.id,
      type: violation.violationType,
      userId: violation.userId,
      details: violation.details,
      context
    });

    // Additional critical violation handling:
    // - Lock user account
    // - Send immediate alerts
    // - Trigger incident response
    // - Block IP address
  }

  // Violation Management
  getViolations(filters?: {
    userId?: string;
    severity?: string;
    resolved?: boolean;
    limit?: number;
  }): SecurityViolation[] {
    let filtered = [...this.violations];

    if (filters?.userId) {
      filtered = filtered.filter(v => v.userId === filters.userId);
    }

    if (filters?.severity) {
      filtered = filtered.filter(v => v.severity === filters.severity);
    }

    if (filters?.resolved !== undefined) {
      filtered = filtered.filter(v => v.resolved === filters.resolved);
    }

    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  resolveViolation(violationId: string, resolvedBy: string): boolean {
    const violation = this.violations.find(v => v.id === violationId);
    if (violation) {
      violation.resolved = true;
      violation.resolvedAt = new Date();
      violation.resolvedBy = resolvedBy;
      
      this.logger?.info('Security violation resolved', {
        violationId,
        resolvedBy,
        type: violation.violationType
      });
      
      return true;
    }
    
    return false;
  }

  // Statistics and Reporting
  getSecurityStatistics(): any {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const last7d = now - 7 * 24 * 60 * 60 * 1000;

    const recent24h = this.violations.filter(v => v.timestamp.getTime() > last24h);
    const recent7d = this.violations.filter(v => v.timestamp.getTime() > last7d);

    return {
      totalViolations: this.violations.length,
      resolvedViolations: this.violations.filter(v => v.resolved).length,
      unresolvedViolations: this.violations.filter(v => !v.resolved).length,
      last24Hours: {
        total: recent24h.length,
        critical: recent24h.filter(v => v.severity === 'critical').length,
        high: recent24h.filter(v => v.severity === 'high').length,
        medium: recent24h.filter(v => v.severity === 'medium').length,
        low: recent24h.filter(v => v.severity === 'low').length
      },
      last7Days: {
        total: recent7d.length,
        critical: recent7d.filter(v => v.severity === 'critical').length,
        high: recent7d.filter(v => v.severity === 'high').length,
        medium: recent7d.filter(v => v.severity === 'medium').length,
        low: recent7d.filter(v => v.severity === 'low').length
      },
      topViolationTypes: this.getTopViolationTypes(),
      topUsers: this.getTopViolatingUsers()
    };
  }

  // Private helper methods
  private initializeDefaultPolicies(): void {
    // Operations Director Protection Policy
    this.addPolicy({
      name: 'operations_director_protection',
      description: 'Enhanced monitoring for Operations Director actions',
      severity: 'high',
      enabled: true,
      rules: [
        {
          type: 'permission',
          conditions: { role: 'operations_director' },
          action: 'audit',
          message: 'Operations Director action requires audit'
        }
      ]
    });

    // Rate Limiting Policy
    this.addPolicy({
      name: 'api_rate_limiting',
      description: 'Prevent API abuse through rate limiting',
      severity: 'medium',
      enabled: true,
      rules: [
        {
          type: 'rate_limit',
          conditions: { threshold: 100, window: '15m' },
          action: 'deny',
          message: 'Rate limit exceeded'
        }
      ]
    });

    // Data Access Policy
    this.addPolicy({
      name: 'sensitive_data_access',
      description: 'Monitor access to sensitive data',
      severity: 'high',
      enabled: true,
      rules: [
        {
          type: 'data_access',
          conditions: { patterns: ['password', 'secret', 'token'] },
          action: 'audit',
          message: 'Sensitive data access detected'
        }
      ]
    });
  }

  private generateViolationId(): string {
    return `violation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private cleanupViolations(): void {
    // Remove old resolved violations (older than 30 days)
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const initialCount = this.violations.length;
    
    this.violations = this.violations.filter(v => 
      !v.resolved || v.timestamp.getTime() > cutoff
    );

    const removedCount = initialCount - this.violations.length;
    if (removedCount > 0) {
      this.logger?.debug('Security violations cleanup', { removedCount });
    }
  }

  private getTopViolationTypes(): any[] {
    const typeCount = new Map<string, number>();
    
    this.violations.forEach(v => {
      const count = typeCount.get(v.violationType) || 0;
      typeCount.set(v.violationType, count + 1);
    });

    return Array.from(typeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));
  }

  private getTopViolatingUsers(): any[] {
    const userCount = new Map<string, number>();
    
    this.violations.forEach(v => {
      if (v.userId) {
        const count = userCount.get(v.userId) || 0;
        userCount.set(v.userId, count + 1);
      }
    });

    return Array.from(userCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([userId, count]) => ({ userId, violationCount: count }));
  }
}