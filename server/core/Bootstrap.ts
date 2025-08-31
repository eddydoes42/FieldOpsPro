/**
 * Bootstrap Infrastructure for FieldOps Pro
 * Initializes all core services with dependency injection and proper error handling
 */

import { container, SERVICE_NAMES, ILogger, IEventBus, ISecurityService, IRBACService } from './ServiceContainer';
import { Logger, LogLevel } from './Logger';
import { EventBus, EVENTS } from './EventBus';
import { RBACService } from './RBACService';
import { SecurityService } from './SecurityService';
import { AuditLogger } from './AuditLogger';
import { ErrorHandler } from '../middleware/ErrorHandler';
import { SecurityMiddleware } from '../middleware/SecurityMiddleware';

export class FieldOpsBootstrap {
  private static isInitialized = false;
  private static startTime = Date.now();

  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('FieldOps Pro has already been initialized');
    }

    try {
      console.log('🚀 Initializing FieldOps Pro Infrastructure...');

      // 1. Initialize Logger first (other services depend on it)
      await this.initializeLogger();
      
      // 2. Initialize Event Bus (for inter-service communication)
      await this.initializeEventBus();
      
      // 3. Initialize Audit Logger
      await this.initializeAuditLogger();
      
      // 4. Initialize Security Service
      await this.initializeSecurityService();
      
      // 5. Initialize RBAC Service
      await this.initializeRBACService();
      
      // 6. Initialize Error Handler
      await this.initializeErrorHandler();
      
      // 7. Initialize Security Middleware
      await this.initializeSecurityMiddleware();
      
      // 8. Set up global error handlers
      this.setupGlobalErrorHandlers();
      
      // 9. Register event listeners
      this.registerEventListeners();

      this.isInitialized = true;
      const initTime = Date.now() - this.startTime;
      
      const logger = container.get<ILogger>(SERVICE_NAMES.LOGGER);
      logger.info('FieldOps Pro Infrastructure initialized successfully', {
        initializationTime: `${initTime}ms`,
        services: this.getRegisteredServices(),
        environment: process.env.NODE_ENV || 'development'
      });

      console.log(`✅ FieldOps Pro Infrastructure ready in ${initTime}ms`);
      
    } catch (error) {
      console.error('❌ Failed to initialize FieldOps Pro Infrastructure:', error);
      throw error;
    }
  }

  private static async initializeLogger(): Promise<void> {
    const logger = new Logger({
      level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
      enableConsole: true,
      enableFile: process.env.NODE_ENV === 'production',
      enableAuditTrail: true,
      format: 'json'
    });

    container.registerSingleton(SERVICE_NAMES.LOGGER, logger);
    await logger.initialize();
    console.log('  ✓ Logger service initialized');
  }

  private static async initializeEventBus(): Promise<void> {
    const logger = container.get<ILogger>(SERVICE_NAMES.LOGGER);
    const eventBus = new EventBus(logger);
    
    container.registerSingleton(SERVICE_NAMES.EVENT_BUS, eventBus);
    await eventBus.initialize();
    console.log('  ✓ Event Bus initialized');
  }

  private static async initializeAuditLogger(): Promise<void> {
    const auditLogger = new AuditLogger();
    
    container.registerSingleton(SERVICE_NAMES.AUDIT_LOGGER, auditLogger);
    await auditLogger.initialize();
    console.log('  ✓ Audit Logger initialized');
  }

  private static async initializeSecurityService(): Promise<void> {
    const securityService = new SecurityService({
      rateLimiting: {
        default: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
        api: { windowMs: 60 * 1000, maxRequests: 60 },
        auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 }
      },
      inputValidation: {
        maxStringLength: 10000,
        maxArrayLength: 1000,
        allowedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png', 'gif'],
        maxFileSize: 10 * 1024 * 1024 // 10MB
      }
    });

    container.registerSingleton(SERVICE_NAMES.SECURITY, securityService);
    await securityService.initialize();
    console.log('  ✓ Security service initialized');
  }

  private static async initializeRBACService(): Promise<void> {
    const rbacService = new RBACService();
    
    container.registerSingleton(SERVICE_NAMES.RBAC, rbacService);
    await rbacService.initialize();
    console.log('  ✓ RBAC service initialized');
  }

  private static async initializeErrorHandler(): Promise<void> {
    await ErrorHandler.initialize();
    console.log('  ✓ Error Handler initialized');
  }

  private static async initializeSecurityMiddleware(): Promise<void> {
    await SecurityMiddleware.initialize();
    console.log('  ✓ Security Middleware initialized');
  }

  private static setupGlobalErrorHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', ErrorHandler.handleUncaughtException);
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', ErrorHandler.handleUnhandledRejection);
    
    // Graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => this.gracefulShutdown('SIGINT'));
    
    console.log('  ✓ Global error handlers registered');
  }

  private static registerEventListeners(): void {
    const eventBus = container.get<IEventBus>(SERVICE_NAMES.EVENT_BUS);
    const logger = container.get<ILogger>(SERVICE_NAMES.LOGGER);

    // Security event listeners
    eventBus.on(EVENTS.SECURITY_BREACH_DETECTED, (data) => {
      logger.error('Security breach detected', undefined, data);
      // Additional security response logic would go here
    });

    eventBus.on(EVENTS.RATE_LIMIT_EXCEEDED, (data) => {
      logger.warn('Rate limit exceeded', data);
      // Rate limit response logic
    });

    eventBus.on(EVENTS.UNAUTHORIZED_ACCESS, (data) => {
      logger.warn('Unauthorized access attempt', data);
      // Unauthorized access response logic
    });

    // Role impersonation event listeners
    eventBus.on(EVENTS.ROLE_IMPERSONATION_STARTED, (data) => {
      logger.info('Role impersonation started', data);
    });

    eventBus.on(EVENTS.ROLE_IMPERSONATION_STOPPED, (data) => {
      logger.info('Role impersonation stopped', data);
    });

    // Work order event listeners
    eventBus.on(EVENTS.WORK_ORDER_CREATED, (data) => {
      logger.info('Work order created', data);
    });

    eventBus.on(EVENTS.WORK_ORDER_STATUS_CHANGED, (data) => {
      logger.info('Work order status changed', data);
    });

    console.log('  ✓ Event listeners registered');
  }

  private static async gracefulShutdown(signal: string): Promise<void> {
    const logger = container.get<ILogger>(SERVICE_NAMES.LOGGER);
    
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    
    try {
      // Cleanup logic would go here
      // - Close database connections
      // - Finish pending requests
      // - Save in-memory data
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', error as Error);
      process.exit(1);
    }
  }

  private static getRegisteredServices(): string[] {
    return Object.values(SERVICE_NAMES);
  }

  // Health check endpoint data
  static getHealthStatus(): any {
    if (!this.isInitialized) {
      return {
        status: 'unhealthy',
        message: 'Infrastructure not initialized',
        timestamp: new Date().toISOString()
      };
    }

    const uptime = Date.now() - this.startTime;
    
    return {
      status: 'healthy',
      uptime: `${Math.floor(uptime / 1000)}s`,
      services: {
        logger: 'operational',
        eventBus: 'operational',
        security: 'operational',
        rbac: 'operational',
        errorHandler: 'operational'
      },
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  // Development/debug utilities
  static async generateSystemReport(): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('System not initialized');
    }

    const logger = container.get<ILogger>(SERVICE_NAMES.LOGGER);
    const eventBus = container.get<IEventBus>(SERVICE_NAMES.EVENT_BUS);
    const securityService = container.get<ISecurityService>(SERVICE_NAMES.SECURITY);
    const rbacService = container.get<IRBACService>(SERVICE_NAMES.RBAC);

    return {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      environment: process.env.NODE_ENV || 'development',
      services: {
        logger: {
          recentLogs: logger.getRecentLogs(50),
          securityLogs: logger.getSecurityLogs()
        },
        eventBus: {
          registeredEvents: eventBus.getRegisteredEvents(),
          eventCounts: eventBus.getRegisteredEvents().map(event => ({
            event,
            handlerCount: eventBus.getHandlerCount(event)
          }))
        },
        security: securityService.generateSecurityReport(),
        rbac: await rbacService.generatePermissionAuditReport()
      },
      process: {
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        platform: process.platform,
        nodeVersion: process.version
      }
    };
  }
}

// Export for external usage
export { container, SERVICE_NAMES } from './ServiceContainer';
export { EVENTS } from './EventBus';
export { ErrorHandler } from '../middleware/ErrorHandler';
export { SecurityMiddleware, CommonSchemas } from '../middleware/SecurityMiddleware';