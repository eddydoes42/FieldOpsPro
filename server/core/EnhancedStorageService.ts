/**
 * Enhanced Storage Service for FieldOps Pro
 * Wraps the existing storage with enterprise-grade capabilities
 */

import { IService, ILogger, IAuditLogger, container, SERVICE_NAMES } from './ServiceContainer';
import { storage, DatabaseStorage } from '../storage';
import { DatabaseError } from '../middleware/ErrorHandler';

export interface StorageMetrics {
  queries: {
    total: number;
    successful: number;
    failed: number;
    averageTime: number;
  };
  cacheHits: number;
  cacheMisses: number;
  transactions: {
    active: number;
    committed: number;
    rolledBack: number;
  };
}

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number;
  enabled: boolean;
}

export class EnhancedStorageService implements IService {
  private logger?: ILogger;
  private auditLogger?: IAuditLogger;
  private baseStorage: DatabaseStorage;
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private metrics: StorageMetrics = {
    queries: { total: 0, successful: 0, failed: 0, averageTime: 0 },
    cacheHits: 0,
    cacheMisses: 0,
    transactions: { active: 0, committed: 0, rolledBack: 0 }
  };

  private cacheConfig: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5 minutes default
    maxSize: 1000,
    enabled: true
  };

  constructor(storageInstance: DatabaseStorage, cacheConfig?: Partial<CacheConfig>) {
    this.baseStorage = storageInstance;
    if (cacheConfig) {
      this.cacheConfig = { ...this.cacheConfig, ...cacheConfig };
    }
  }

  getName(): string {
    return 'EnhancedStorageService';
  }

  getVersion(): string {
    return '1.0.0';
  }

  async initialize(): Promise<void> {
    this.logger = container.get<ILogger>(SERVICE_NAMES.LOGGER);
    this.auditLogger = container.get<IAuditLogger>(SERVICE_NAMES.AUDIT_LOGGER);
    
    this.logger?.info('Enhanced Storage Service initialized', {
      cacheEnabled: this.cacheConfig.enabled,
      cacheTTL: this.cacheConfig.ttl,
      maxCacheSize: this.cacheConfig.maxSize
    });

    // Start cache cleanup interval
    if (this.cacheConfig.enabled) {
      setInterval(() => this.cleanupCache(), 60000); // Every minute
    }
  }

  // Proxy all storage methods with enhancements
  async withAuditAndMetrics<T>(
    operation: string,
    entityType: string,
    entityId: string | undefined,
    performedBy: string,
    fn: () => Promise<T>,
    previousState?: any
  ): Promise<T> {
    const startTime = Date.now();
    this.metrics.queries.total++;

    try {
      const result = await fn();
      
      const duration = Date.now() - startTime;
      this.updateQueryMetrics(duration, true);
      this.metrics.queries.successful++;

      // Audit logging for write operations
      if (['create', 'update', 'delete'].some(op => operation.includes(op))) {
        await this.auditLogger?.logEvent({
          entityType,
          entityId: entityId || 'unknown',
          action: operation,
          performedBy,
          previousState,
          newState: operation === 'delete' ? null : result,
          metadata: {
            duration,
            timestamp: new Date().toISOString()
          }
        });
      }

      this.logger?.debug(`Storage operation completed: ${operation}`, {
        entityType,
        entityId,
        duration,
        success: true
      });

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateQueryMetrics(duration, false);
      this.metrics.queries.failed++;

      this.logger?.error(`Storage operation failed: ${operation}`, error, {
        entityType,
        entityId,
        duration,
        performedBy
      });

      // Audit failed operations
      await this.auditLogger?.logEvent({
        entityType,
        entityId: entityId || 'unknown',
        action: `${operation}_failed`,
        performedBy,
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          duration,
          timestamp: new Date().toISOString()
        }
      });

      throw new DatabaseError(`Storage operation failed: ${operation}`, { 
        originalError: error,
        entityType,
        entityId 
      });
    }
  }

  // Enhanced caching wrapper
  async withCache<T>(
    cacheKey: string,
    fn: () => Promise<T>,
    customTTL?: number
  ): Promise<T> {
    if (!this.cacheConfig.enabled) {
      return fn();
    }

    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() < cached.timestamp + cached.ttl) {
      this.metrics.cacheHits++;
      this.logger?.debug('Cache hit', { cacheKey });
      return cached.data;
    }

    // Cache miss - fetch data
    this.metrics.cacheMisses++;
    const result = await fn();

    // Store in cache
    const ttl = customTTL || this.cacheConfig.ttl;
    this.queryCache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
      ttl
    });

    // Trim cache if necessary
    if (this.queryCache.size > this.cacheConfig.maxSize) {
      this.trimCache();
    }

    this.logger?.debug('Cache miss - data cached', { cacheKey, ttl });
    return result;
  }

  // Cache management
  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.queryCache.clear();
      this.logger?.info('All cache cleared');
      return;
    }

    let removedCount = 0;
    for (const key of this.queryCache.keys()) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key);
        removedCount++;
      }
    }

    this.logger?.info('Cache invalidated by pattern', { pattern, removedCount });
  }

  // Metrics and monitoring
  getMetrics(): StorageMetrics {
    return { ...this.metrics };
  }

  getCacheStatistics(): any {
    return {
      enabled: this.cacheConfig.enabled,
      size: this.queryCache.size,
      maxSize: this.cacheConfig.maxSize,
      hitRate: this.metrics.cacheHits + this.metrics.cacheMisses > 0 ? 
        this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) : 0,
      hits: this.metrics.cacheHits,
      misses: this.metrics.cacheMisses
    };
  }

  // Health check
  async healthCheck(): Promise<any> {
    try {
      // Test basic connectivity
      const testStart = Date.now();
      await this.baseStorage.getAllCompanies();
      const testDuration = Date.now() - testStart;

      return {
        status: 'healthy',
        database: {
          connected: true,
          responseTime: testDuration
        },
        cache: this.getCacheStatistics(),
        metrics: this.getMetrics(),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        database: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        cache: this.getCacheStatistics(),
        timestamp: new Date().toISOString()
      };
    }
  }

  // Performance optimization methods
  async bulkOperation<T>(
    operations: Array<() => Promise<T>>,
    batchSize: number = 10
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (let i = 0; i < operations.length; i += batchSize) {
      const batch = operations.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(op => op()));
      results.push(...batchResults);
    }

    this.logger?.info('Bulk operation completed', {
      totalOperations: operations.length,
      batchSize,
      batches: Math.ceil(operations.length / batchSize)
    });

    return results;
  }

  // Proxy methods to base storage with enhancements
  async getUser(id: string): Promise<any> {
    return this.withCache(
      `user:${id}`,
      () => this.baseStorage.getUser(id),
      2 * 60 * 1000 // 2 minutes TTL for user data
    );
  }

  async createUser(userData: any, performedBy: string): Promise<any> {
    return this.withAuditAndMetrics(
      'create_user',
      'user',
      undefined,
      performedBy,
      async () => {
        const result = await this.baseStorage.createUser(userData);
        this.invalidateCache('user:');
        return result;
      }
    );
  }

  async updateUser(id: string, userData: any, performedBy: string): Promise<any> {
    const previousState = await this.getUser(id);
    
    return this.withAuditAndMetrics(
      'update_user',
      'user',
      id,
      performedBy,
      async () => {
        const result = await this.baseStorage.updateUser(id, userData);
        this.invalidateCache(`user:${id}`);
        return result;
      },
      previousState
    );
  }

  async deleteUser(id: string, performedBy: string): Promise<void> {
    const previousState = await this.getUser(id);
    
    return this.withAuditAndMetrics(
      'delete_user',
      'user',
      id,
      performedBy,
      async () => {
        await this.baseStorage.deleteUser(id);
        this.invalidateCache(`user:${id}`);
      },
      previousState
    );
  }

  // Private helper methods
  private updateQueryMetrics(duration: number, success: boolean): void {
    const currentAvg = this.metrics.queries.averageTime;
    const total = this.metrics.queries.total;
    
    this.metrics.queries.averageTime = 
      (currentAvg * (total - 1) + duration) / total;
  }

  private cleanupCache(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, value] of this.queryCache.entries()) {
      if (now >= value.timestamp + value.ttl) {
        this.queryCache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.logger?.debug('Cache cleanup completed', { removedCount });
    }
  }

  private trimCache(): void {
    const entries = Array.from(this.queryCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const toRemove = Math.ceil(this.cacheConfig.maxSize * 0.1); // Remove 10%
    for (let i = 0; i < toRemove && entries.length > 0; i++) {
      this.queryCache.delete(entries[i][0]);
    }

    this.logger?.debug('Cache trimmed', { removedCount: toRemove });
  }

  // Transaction support (if needed in the future)
  async withTransaction<T>(fn: () => Promise<T>): Promise<T> {
    this.metrics.transactions.active++;
    
    try {
      const result = await fn();
      this.metrics.transactions.committed++;
      this.metrics.transactions.active--;
      return result;
    } catch (error) {
      this.metrics.transactions.rolledBack++;
      this.metrics.transactions.active--;
      throw error;
    }
  }
}