import { useEffect, useRef } from 'react';
import { getPerformanceMetrics } from '@/lib/queryClient';

interface PerformanceMetrics {
  pageLoadTime: number;
  renderTime: number;
  queryCount: number;
  slowQueries: string[];
}

export const usePerformanceMonitoring = (componentName: string) => {
  const renderStartTime = useRef<number>(performance.now());
  const mountTime = useRef<number | null>(null);

  useEffect(() => {
    // Component mounted
    mountTime.current = performance.now();
    const renderTime = mountTime.current - renderStartTime.current;
    
    // Log component performance
    if (renderTime > 1000) { // Log if render takes more than 1 second
      console.warn(`Slow render detected in ${componentName}: ${Math.round(renderTime)}ms`);
    }

    // Log query performance every 30 seconds
    const metricsInterval = setInterval(() => {
      const metrics = getPerformanceMetrics();
      const slowQueries = Object.entries(metrics)
        .filter(([_, data]) => data.avg > 1000)
        .map(([query, _]) => query);

      if (slowQueries.length > 0) {
        console.warn(`Slow queries detected:`, slowQueries);
      }
    }, 30000);

    return () => {
      clearInterval(metricsInterval);
    };
  }, [componentName]);

  const getComponentMetrics = (): PerformanceMetrics => {
    const currentTime = performance.now();
    const pageLoadTime = currentTime - performance.timeOrigin;
    const renderTime = mountTime.current ? mountTime.current - renderStartTime.current : 0;
    
    const queryMetrics = getPerformanceMetrics();
    const queryCount = Object.values(queryMetrics).reduce((sum, data) => sum + data.count, 0);
    const slowQueries = Object.entries(queryMetrics)
      .filter(([_, data]) => data.avg > 1000)
      .map(([query, _]) => query);

    return {
      pageLoadTime: Math.round(pageLoadTime),
      renderTime: Math.round(renderTime),
      queryCount,
      slowQueries
    };
  };

  return { getComponentMetrics };
};

// React Query performance hook
export const useQueryPerformance = () => {
  const getQueryStats = () => {
    const metrics = getPerformanceMetrics();
    const totalQueries = Object.values(metrics).reduce((sum, data) => sum + data.count, 0);
    const averageTime = Object.values(metrics).reduce((sum, data) => sum + data.avg, 0) / Object.keys(metrics).length || 0;
    const slowestQuery = Object.entries(metrics).reduce((slowest, [query, data]) => 
      data.max > (slowest?.max || 0) ? { query, ...data } : slowest, null);

    return {
      totalQueries,
      averageTime: Math.round(averageTime),
      slowestQuery: slowestQuery ? {
        query: slowestQuery.query,
        maxTime: slowestQuery.max,
        avgTime: Math.round(slowestQuery.avg)
      } : null
    };
  };

  return { getQueryStats };
};