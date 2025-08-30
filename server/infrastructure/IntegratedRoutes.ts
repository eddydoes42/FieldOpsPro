/**
 * Integrated Routes for FieldOps Pro
 * Connects the enhanced infrastructure with existing application routes
 */

import type { Express } from 'express';
import { SecurityMiddleware, CommonSchemas } from '../middleware/SecurityMiddleware';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { container, SERVICE_NAMES } from '../core/ServiceContainer';
import { ILogger, IAuditLogger, IRBACService } from '../core/ServiceContainer';
import { z } from 'zod';

export class IntegratedRoutes {
  private static logger?: ILogger;
  private static auditLogger?: IAuditLogger;
  private static rbacService?: IRBACService;

  static async initialize(app: Express): Promise<void> {
    this.logger = container.get<ILogger>(SERVICE_NAMES.LOGGER);
    this.auditLogger = container.get<IAuditLogger>(SERVICE_NAMES.AUDIT_LOGGER);
    this.rbacService = container.get<IRBACService>(SERVICE_NAMES.RBAC);

    // Apply security middleware globally
    this.setupGlobalMiddleware(app);
    
    // Setup infrastructure routes
    this.setupInfrastructureRoutes(app);
    
    // Apply error handling
    this.setupErrorHandling(app);

    this.logger?.info('Integrated routes initialized successfully');
  }

  private static setupGlobalMiddleware(app: Express): void {
    // Security headers
    app.use(SecurityMiddleware.securityHeaders());
    
    // Audit logging
    app.use(SecurityMiddleware.auditLog());
    
    // Risk assessment
    app.use(SecurityMiddleware.riskAssessment());
    
    // Rate limiting for API routes
    app.use('/api', SecurityMiddleware.rateLimit('api'));
    
    // Authentication rate limiting
    app.use('/api/auth', SecurityMiddleware.rateLimit('auth'));
  }

  private static setupInfrastructureRoutes(app: Express): void {
    // Health check endpoint
    app.get('/api/health', (req, res) => {
      try {
        const healthStatus = {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          environment: process.env.NODE_ENV || 'development'
        };

        res.json(healthStatus);
      } catch (error) {
        res.status(500).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Infrastructure status endpoint (Operations Director only)
    app.get('/api/infrastructure/status', 
      SecurityMiddleware.requirePermission('infrastructure', 'read'),
      ErrorHandler.asyncWrapper(async (req, res) => {
        const userId = req.user?.claims?.sub;
        
        const infrastructureStatus = {
          services: {
            logger: this.logger?.getName() || 'unknown',
            auditLogger: this.auditLogger?.getName() || 'unknown',
            rbac: this.rbacService?.getName() || 'unknown'
          },
          audit: this.auditLogger?.getAuditStatistics(),
          permissions: await this.rbacService?.generatePermissionAuditReport(),
          timestamp: new Date().toISOString()
        };

        await this.auditLogger?.logEvent({
          entityType: 'infrastructure',
          entityId: 'status',
          action: 'status_accessed',
          performedBy: userId || 'anonymous',
          metadata: { endpoint: '/api/infrastructure/status' }
        });

        res.json(infrastructureStatus);
      })
    );

    // Audit logs endpoint (Operations Director only)
    app.get('/api/audit-logs',
      SecurityMiddleware.requirePermission('audit', 'read'),
      SecurityMiddleware.validateInput(z.object({
        entityType: z.string().optional(),
        entityId: z.string().optional(),
        action: z.string().optional(),
        performedBy: z.string().optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
        riskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional(),
        limit: z.coerce.number().min(1).max(1000).default(100),
        offset: z.coerce.number().min(0).default(0)
      })),
      ErrorHandler.asyncWrapper(async (req, res) => {
        const userId = req.user?.claims?.sub;
        const query = req.query as any;

        // Convert date strings to Date objects
        if (query.dateFrom) query.dateFrom = new Date(query.dateFrom);
        if (query.dateTo) query.dateTo = new Date(query.dateTo);

        const auditLogs = await this.auditLogger?.queryAuditLogs(query);

        await this.auditLogger?.logEvent({
          entityType: 'audit',
          entityId: 'logs',
          action: 'audit_logs_accessed',
          performedBy: userId || 'anonymous',
          metadata: { 
            query: { ...query, dateFrom: query.dateFrom?.toISOString(), dateTo: query.dateTo?.toISOString() },
            resultCount: auditLogs?.length || 0 
          }
        });

        res.json({
          auditLogs: auditLogs || [],
          query,
          timestamp: new Date().toISOString()
        });
      })
    );

    // Security audit trail endpoint (Operations Director only)
    app.get('/api/security/audit-trail',
      SecurityMiddleware.requirePermission('security', 'read'),
      SecurityMiddleware.validateInput(z.object({
        userId: z.string().uuid().optional(),
        hours: z.coerce.number().min(1).max(168).default(24) // Max 1 week
      })),
      ErrorHandler.asyncWrapper(async (req, res) => {
        const currentUserId = req.user?.claims?.sub;
        const { userId, hours } = req.query as any;

        const securityTrail = await this.auditLogger?.getSecurityAuditTrail(userId, Number(hours));

        await this.auditLogger?.logEvent({
          entityType: 'security',
          entityId: 'audit_trail',
          action: 'security_audit_accessed',
          performedBy: currentUserId || 'anonymous',
          metadata: { 
            targetUserId: userId,
            hours: Number(hours),
            resultCount: securityTrail?.length || 0 
          }
        });

        res.json({
          securityAuditTrail: securityTrail || [],
          query: { userId, hours },
          timestamp: new Date().toISOString()
        });
      })
    );

    // Compliance report endpoint (Operations Director only)
    app.post('/api/compliance/report',
      SecurityMiddleware.requirePermission('compliance', 'read'),
      SecurityMiddleware.validateInput(z.object({
        dateFrom: z.string().datetime(),
        dateTo: z.string().datetime(),
        format: z.enum(['json', 'csv']).default('json')
      })),
      ErrorHandler.asyncWrapper(async (req, res) => {
        const userId = req.user?.claims?.sub;
        const { dateFrom, dateTo, format } = req.body;

        const report = await this.auditLogger?.generateComplianceReport(
          new Date(dateFrom),
          new Date(dateTo)
        );

        await this.auditLogger?.logEvent({
          entityType: 'compliance',
          entityId: 'report',
          action: 'compliance_report_generated',
          performedBy: userId || 'anonymous',
          metadata: { 
            dateFrom,
            dateTo,
            format,
            totalEvents: report?.summary?.totalEvents || 0
          }
        });

        if (format === 'csv') {
          const csvData = await this.auditLogger?.exportAuditTrail('csv', {
            dateFrom: new Date(dateFrom),
            dateTo: new Date(dateTo)
          });

          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${dateFrom}-${dateTo}.csv"`);
          res.send(csvData);
        } else {
          res.json(report);
        }
      })
    );

    // Role hierarchy endpoint (Operations Director only)
    app.get('/api/roles/hierarchy',
      SecurityMiddleware.requirePermission('roles', 'read'),
      ErrorHandler.asyncWrapper(async (req, res) => {
        const userId = req.user?.claims?.sub;
        
        const hierarchy = this.rbacService?.getRoleHierarchy();

        await this.auditLogger?.logEvent({
          entityType: 'roles',
          entityId: 'hierarchy',
          action: 'role_hierarchy_accessed',
          performedBy: userId || 'anonymous',
          metadata: { endpoint: '/api/roles/hierarchy' }
        });

        res.json({
          roleHierarchy: hierarchy || [],
          timestamp: new Date().toISOString()
        });
      })
    );

    // Permission check endpoint (for debugging)
    app.post('/api/permissions/check',
      SecurityMiddleware.validateInput(z.object({
        resource: z.string(),
        action: z.string(),
        userId: z.string().uuid().optional()
      })),
      ErrorHandler.asyncWrapper(async (req, res) => {
        const currentUserId = req.user?.claims?.sub;
        const { resource, action, userId } = req.body;
        
        const targetUserId = userId || currentUserId;
        if (!targetUserId) {
          return res.status(400).json({ error: 'User ID required' });
        }

        const hasPermission = await this.rbacService?.hasPermission(targetUserId, resource, action);
        const effectiveRole = await this.rbacService?.getEffectiveRole(targetUserId);

        await this.auditLogger?.logEvent({
          entityType: 'permission',
          entityId: `${resource}:${action}`,
          action: 'permission_checked',
          performedBy: currentUserId || 'anonymous',
          metadata: { 
            resource,
            action,
            targetUserId,
            hasPermission,
            effectiveRole
          }
        });

        res.json({
          resource,
          action,
          userId: targetUserId,
          hasPermission: hasPermission || false,
          effectiveRole,
          timestamp: new Date().toISOString()
        });
      })
    );

    this.logger?.info('Infrastructure routes registered');
  }

  private static setupErrorHandling(app: Express): void {
    // Global error handler (must be last)
    app.use(ErrorHandler.handle());
  }

  // Enhanced middleware for specific resource types
  static workOrderMiddleware() {
    return [
      SecurityMiddleware.rateLimit('workOrder'),
      SecurityMiddleware.validateInput(CommonSchemas.ID),
      SecurityMiddleware.requirePermission('workOrders', 'read')
    ];
  }

  static userManagementMiddleware(action: string) {
    return [
      SecurityMiddleware.rateLimit('userManagement'),
      SecurityMiddleware.requirePermission('users', action)
    ];
  }

  static companyManagementMiddleware(action: string) {
    return [
      SecurityMiddleware.rateLimit('companyManagement'),
      SecurityMiddleware.requirePermission('companies', action)
    ];
  }

  // Audit wrapper for existing routes
  static auditWrapper(entityType: string, action: string) {
    return ErrorHandler.asyncWrapper(async (req: any, res: any, next: any) => {
      const userId = req.user?.claims?.sub;
      const entityId = req.params.id || req.body.id || 'unknown';

      await this.auditLogger?.logEvent({
        entityType,
        entityId,
        action,
        performedBy: userId || 'anonymous',
        metadata: {
          method: req.method,
          path: req.path,
          timestamp: new Date().toISOString()
        }
      });

      next();
    });
  }
}