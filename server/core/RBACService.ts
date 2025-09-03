/**
 * Role-Based Access Control Service for FieldOps Pro
 * Implements comprehensive RBAC with Operations Director global bypass
 */

import { IRBACService, IService, ILogger, container, SERVICE_NAMES } from './ServiceContainer';
import { User } from '../../shared/schema';

export interface Permission {
  resource: string;
  action: string;
  conditions?: any[];
}

export interface RoleDefinition {
  name: string;
  permissions: Permission[];
  inherits?: string[];
  level: number; // Hierarchy level (higher = more privileged)
}

export interface PermissionCheckResult {
  granted: boolean;
  reason: string;
  bypassUsed?: boolean;
  appliedRole?: string;
}

export class RBACService implements IRBACService, IService {
  private logger?: ILogger;
  private storage?: any;
  private roleDefinitions = new Map<string, RoleDefinition>();
  private permissionCache = new Map<string, PermissionCheckResult>();
  private readonly cacheExpiry = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeRoles();
  }

  getName(): string {
    return 'RBACService';
  }

  getVersion(): string {
    return '1.0.0';
  }

  async initialize(): Promise<void> {
    this.logger = container.get<ILogger>(SERVICE_NAMES.LOGGER);
    this.storage = container.get<any>(SERVICE_NAMES.STORAGE);
    this.logger?.info('RBAC Service initialized', {
      roleCount: this.roleDefinitions.size,
      roles: Array.from(this.roleDefinitions.keys())
    });
  }

  private initializeRoles(): void {
    // Operations Director - God Mode
    this.roleDefinitions.set('operations_director', {
      name: 'operations_director',
      level: 1000,
      permissions: [
        { resource: '*', action: '*' } // Global bypass
      ]
    });

    // Service Company Hierarchy
    this.roleDefinitions.set('administrator', {
      name: 'administrator',
      level: 900,
      permissions: [
        // Service Company Administrator permissions (full access)
        { resource: 'users', action: '*' },
        { resource: 'workOrders', action: '*' },
        { resource: 'companies', action: 'read' },
        { resource: 'companies', action: 'update' },
        { resource: 'jobNetwork', action: '*' },
        { resource: 'issues', action: '*' },
        { resource: 'messaging', action: '*' },
        { resource: 'reports', action: '*' },
        { resource: 'analytics', action: '*' },
        // Client Company Administrator permissions (limited - handled by company context)
        { resource: 'workOrders', action: 'create', conditions: ['client_company'] },
        { resource: 'workOrders', action: 'read', conditions: ['own_company'] },
        { resource: 'fieldAgents', action: 'read' },
        { resource: 'serviceCompanies', action: 'read' }
      ]
    });

    this.roleDefinitions.set('project_manager', {
      name: 'project_manager',
      level: 850,
      permissions: [
        { resource: 'users', action: 'read' },
        { resource: 'users', action: 'update' },
        { resource: 'workOrders', action: '*' },
        { resource: 'companies', action: 'read' },
        { resource: 'jobNetwork', action: '*' },
        { resource: 'issues', action: '*' },
        { resource: 'messaging', action: '*' },
        { resource: 'reports', action: '*' },
        { resource: 'analytics', action: 'read' }
      ]
    });

    this.roleDefinitions.set('manager', {
      name: 'manager',
      level: 800,
      permissions: [
        { resource: 'users', action: 'read' },
        { resource: 'users', action: 'update' },
        { resource: 'workOrders', action: '*' },
        { resource: 'jobNetwork', action: '*' },
        { resource: 'issues', action: '*' },
        { resource: 'messaging', action: '*' },
        { resource: 'reports', action: 'read' }
      ]
    });

    this.roleDefinitions.set('dispatcher', {
      name: 'dispatcher',
      level: 700,
      permissions: [
        { resource: 'users', action: 'read' },
        { resource: 'workOrders', action: '*' },
        { resource: 'jobNetwork', action: 'read' },
        { resource: 'issues', action: 'read' },
        { resource: 'issues', action: 'update' },
        { resource: 'messaging', action: '*' }
      ]
    });

    this.roleDefinitions.set('field_engineer', {
      name: 'field_engineer',
      level: 600,
      permissions: [
        { resource: 'workOrders', action: 'read' },
        { resource: 'workOrders', action: 'update' },
        { resource: 'users', action: 'read' },
        { resource: 'fieldAgents', action: 'promote' },
        { resource: 'messaging', action: '*' },
        { resource: 'documents', action: '*' }
      ]
    });

    this.roleDefinitions.set('field_agent', {
      name: 'field_agent',
      level: 500,
      permissions: [
        { resource: 'workOrders', action: 'read', conditions: ['assigned_to_user'] },
        { resource: 'workOrders', action: 'update', conditions: ['assigned_to_user'] },
        { resource: 'messaging', action: 'read' },
        { resource: 'messaging', action: 'create' },
        { resource: 'documents', action: 'read' },
        { resource: 'documents', action: 'upload' },
        { resource: 'profile', action: 'update', conditions: ['own_profile'] }
      ]
    });

    // Note: administrator role now serves both service and client companies
    // Client company administrators have same base role but different permissions based on company context
  }

  async hasPermission(userId: string, resource: string, action: string, context?: any): Promise<boolean> {
    const result = await this.checkPermission(userId, resource, action, context);
    this.logPermissionCheck(userId, resource, action, result.granted);
    return result.granted;
  }

  async checkPermission(userId: string, resource: string, action: string, context?: any): Promise<PermissionCheckResult> {
    // Check cache first
    const cacheKey = `${userId}:${resource}:${action}`;
    const cached = this.permissionCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    try {
      // Get user and check if Operations Director
      const user = await this.getUser(userId);
      if (!user) {
        const result: PermissionCheckResult = {
          granted: false,
          reason: 'User not found'
        };
        this.cacheResult(cacheKey, result);
        return result;
      }

      // Operations Director bypass (including during role testing mode)
      if (await this.isOperationsDirector(userId)) {
        const isRoleTesting = await this.isInRoleTestingMode(userId, context);
        const result: PermissionCheckResult = {
          granted: true,
          reason: isRoleTesting ? 'Operations Director global bypass (role testing)' : 'Operations Director global bypass',
          bypassUsed: true,
          appliedRole: 'operations_director'
        };
        this.cacheResult(cacheKey, result);
        return result;
      }

      // Get effective role (considering role testing)
      const effectiveRole = await this.getEffectiveRole(userId);
      const roleDefinition = this.roleDefinitions.get(effectiveRole);

      if (!roleDefinition) {
        const result: PermissionCheckResult = {
          granted: false,
          reason: `Role '${effectiveRole}' not defined`
        };
        this.cacheResult(cacheKey, result);
        return result;
      }

      // Check permissions
      const hasPermission = this.checkRolePermissions(roleDefinition, resource, action, user);
      const result: PermissionCheckResult = {
        granted: hasPermission,
        reason: hasPermission ? 'Permission granted by role' : 'Permission denied by role',
        appliedRole: effectiveRole
      };

      this.cacheResult(cacheKey, result);
      return result;

    } catch (error) {
      this.logger?.error('Error checking permission', error as Error, { userId, resource, action });
      const result: PermissionCheckResult = {
        granted: false,
        reason: 'Error during permission check'
      };
      return result;
    }
  }

  private checkRolePermissions(role: RoleDefinition, resource: string, action: string, user: User): boolean {
    for (const permission of role.permissions) {
      // Check for wildcard permissions
      if (permission.resource === '*' && permission.action === '*') {
        return true;
      }
      
      if ((permission.resource === resource || permission.resource === '*') &&
          (permission.action === action || permission.action === '*')) {
        
        // Check conditions if present
        if (permission.conditions) {
          return this.evaluateConditions(permission.conditions, user, resource);
        }
        
        return true;
      }
    }
    
    return false;
  }

  private evaluateConditions(conditions: any[], user: User, resource: string): boolean {
    for (const condition of conditions) {
      switch (condition) {
        case 'assigned_to_user':
          // This would need additional context about the specific resource instance
          return true; // Simplified for now
        case 'own_company':
          return true; // Simplified for now
        case 'own_profile':
          return true; // Simplified for now
        default:
          this.logger?.warn('Unknown permission condition', { condition });
          return false;
      }
    }
    return true;
  }

  async isOperationsDirector(userId: string): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      return user?.roles?.includes('operations_director') || false;
    } catch (error) {
      this.logger?.error('Error checking Operations Director status', error as Error, { userId });
      return false;
    }
  }

  async getEffectiveRole(userId: string, context?: any): Promise<string> {
    try {
      // Check if in role testing mode
      const testingContext = await this.getRoleTestingContext(userId);
      if (testingContext) {
        return testingContext.role;
      }

      // Get user's primary role
      const user = await this.getUser(userId);
      if (!user?.roles || user.roles.length === 0) {
        return 'field_agent'; // Default role
      }

      // Return highest privilege role
      const userRoles = user.roles.map((role: string) => this.roleDefinitions.get(role))
        .filter(Boolean) as RoleDefinition[];
      
      if (userRoles.length === 0) {
        return 'field_agent';
      }

      userRoles.sort((a, b) => b.level - a.level);
      return userRoles[0].name;

    } catch (error) {
      this.logger?.error('Error getting effective role', error as Error, { userId });
      return 'field_agent';
    }
  }

  logPermissionCheck(userId: string, resource: string, action: string, granted: boolean): void {
    this.logger?.info('Permission check', {
      userId,
      resource,
      action,
      granted,
      timestamp: new Date().toISOString()
    });
  }

  // Helper methods (integrated with actual storage)
  private async getUser(userId: string): Promise<any | null> {
    try {
      if (!this.storage) {
        this.logger?.warn('Storage service not available for user lookup', { userId });
        return null;
      }
      return await this.storage.getUser(userId);
    } catch (error) {
      this.logger?.error('Error fetching user from storage', error as Error, { userId });
      return null;
    }
  }

  private async isInRoleTestingMode(userId: string, context?: any): Promise<boolean> {
    // Check if user is currently in role testing mode by looking for testing headers
    if (context?.req?.headers) {
      const testingRole = context.req.headers['x-testing-role'];
      const testingCompanyType = context.req.headers['x-testing-company-type'];
      return !!(testingRole && testingCompanyType);
    }
    
    // Also check if user is Operations Director and has testing context globally
    // This is a fallback for when context might not have request headers
    try {
      const user = await this.getUser(userId);
      if (user?.roles?.includes('operations_director') && !user.companyId) {
        // For Operations Directors, we need to check if they're actively testing
        // Since they have global bypass, we should allow access by default
        return false; // Operations Directors should not be restricted by role testing mode
      }
    } catch (error) {
      this.logger?.error('Error checking user for role testing mode', error as Error, { userId });
    }
    
    return false;
  }

  private async getRoleTestingContext(userId: string): Promise<any> {
    // Get current role testing context
    // This would integrate with the role impersonation service
    return null;
  }

  private isCacheValid(result: any): boolean {
    // Simple cache validation - in production would use timestamps
    return true;
  }

  private cacheResult(key: string, result: PermissionCheckResult): void {
    this.permissionCache.set(key, result);
    
    // Clear cache after expiry
    setTimeout(() => {
      this.permissionCache.delete(key);
    }, this.cacheExpiry);
  }

  // Administrative methods
  getRoleHierarchy(): { role: string; level: number }[] {
    return Array.from(this.roleDefinitions.values())
      .map(role => ({ role: role.name, level: role.level }))
      .sort((a, b) => b.level - a.level);
  }

  getPermissionsForRole(roleName: string): Permission[] {
    const role = this.roleDefinitions.get(roleName);
    return role ? role.permissions : [];
  }

  // Audit methods
  async generatePermissionAuditReport(): Promise<any> {
    return {
      timestamp: new Date().toISOString(),
      roles: Array.from(this.roleDefinitions.entries()).map(([name, definition]) => ({
        name,
        level: definition.level,
        permissionCount: definition.permissions.length,
        permissions: definition.permissions
      })),
      cacheStats: {
        entriesCount: this.permissionCache.size
      }
    };
  }
}