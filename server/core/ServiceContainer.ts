/**
 * Dependency Injection Container for FieldOps Pro
 * Implements centralized service management with explicit interface contracts
 */

export interface IService {
  initialize?(): Promise<void>;
  getName(): string;
  getVersion(): string;
}

export interface ILogger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
  getRecentLogs(count: number): any[];
  getSecurityLogs(): any[];
}

export interface IEventBus {
  emit(event: string, data: any): void;
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler: (data: any) => void): void;
  getRegisteredEvents(): string[];
  getHandlerCount(event: string): number;
}

export interface IAuditLogger {
  logEvent(config: {
    entityType: string;
    entityId: string;
    action: string;
    performedBy: string;
    previousState?: any;
    newState?: any;
    reason?: string;
    metadata?: any;
  }): Promise<void>;
}

export interface ISecurityService {
  validateInput(input: any, schema: any): boolean;
  sanitizeInput(input: any): any;
  checkRateLimit(userId: string, action: string): boolean;
  encryptSensitiveData(data: string): string;
  decryptSensitiveData(encryptedData: string): string;
  generateSecurityReport(): any;
}

export interface IRBACService {
  hasPermission(userId: string, resource: string, action: string): Promise<boolean>;
  isOperationsDirector(userId: string): Promise<boolean>;
  getEffectiveRole(userId: string, context?: any): Promise<string>;
  logPermissionCheck(userId: string, resource: string, action: string, granted: boolean): void;
  generatePermissionAuditReport(): Promise<any>;
}

// Service registry types
type ServiceFactory<T> = () => T;
type ServiceInstance<T> = T;

class ServiceContainer {
  private services = new Map<string, any>();
  private factories = new Map<string, ServiceFactory<any>>();
  private singletons = new Map<string, any>();

  // Register a factory for lazy instantiation
  register<T extends IService>(name: string, factory: ServiceFactory<T>): void {
    this.factories.set(name, factory);
  }

  // Register a singleton instance
  registerSingleton<T extends IService>(name: string, instance: T): void {
    this.singletons.set(name, instance);
  }

  // Get a service instance with proper typing
  get<T>(name: string): T {
    // Check if it's a singleton first
    if (this.singletons.has(name)) {
      return this.singletons.get(name) as T;
    }

    // Check if we have an instance cached
    if (this.services.has(name)) {
      return this.services.get(name) as T;
    }

    // Create from factory
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service '${name}' not registered`);
    }

    const instance = factory();
    this.services.set(name, instance);
    return instance as T;
  }

  // Initialize all services
  async initialize(): Promise<void> {
    const initPromises: Promise<void>[] = [];

    for (const [name, instance] of Array.from(this.singletons.entries())) {
      if (instance.initialize) {
        initPromises.push(instance.initialize());
      }
    }

    for (const [name, factory] of Array.from(this.factories.entries())) {
      const instance = factory();
      if (instance.initialize) {
        initPromises.push(instance.initialize());
      }
      this.services.set(name, instance);
    }

    await Promise.all(initPromises);
  }

  // Clear all services (for testing)
  clear(): void {
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
  }
}

// Global container instance
export const container = new ServiceContainer();

// Service names constants
export const SERVICE_NAMES = {
  LOGGER: 'logger',
  EVENT_BUS: 'eventBus',
  AUDIT_LOGGER: 'auditLogger',
  SECURITY: 'security',
  RBAC: 'rbac',
  STORAGE: 'storage'
} as const;