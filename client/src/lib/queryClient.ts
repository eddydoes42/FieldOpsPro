import { QueryClient, QueryFunction, MutationOptions } from "@tanstack/react-query";
import { isUnauthorizedError } from "./authUtils";
import { generateDeviceFingerprint } from "./device-fingerprint";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Enhanced error handler for mutations
export const handleMutationError = (error: Error, showToast?: (params: any) => void) => {
  if (isUnauthorizedError(error)) {
    showToast?.({
      title: "Session Expired",
      description: "Your session has expired. Redirecting to login...",
      variant: "destructive",
    });
    setTimeout(() => {
      window.location.href = "/api/login";
    }, 1500);
    return;
  }
  
  // Handle other common errors
  showToast?.({
    title: "Error",
    description: error.message || "An unexpected error occurred",
    variant: "destructive",
  });
};

// Query key factory for consistent cache management
export const queryKeys = {
  // User related queries
  auth: () => ['/api/auth/user'] as const,
  users: () => ['/api/users'] as const,
  usersPaginated: (page: number, limit: number) => ['/api/users', { page, limit }] as const,
  usersByCompany: (companyId: string) => ['/api/users/company', companyId] as const,
  
  // Company related queries
  companies: () => ['/api/companies'] as const,
  company: (id: string) => ['/api/companies', id] as const,
  
  // Operations Director queries
  operationsStats: () => ['/api/operations/stats'] as const,
  budgetSummary: () => ['/api/operations/budget-summary'] as const,
  serviceFeesSummary: () => ['/api/operations/service-fee-summary'] as const,
  recentUsers: () => ['/api/operations/recent-users'] as const,
  
  // Access and approval requests
  accessRequests: () => ['/api/access-requests'] as const,
  approvalRequests: () => ['/api/approval-requests'] as const,
  
  // Work orders
  workOrders: () => ['/api/work-orders'] as const,
  workOrder: (id: string) => ['/api/work-orders', id] as const,
  workOrdersByCompany: (companyId: string) => ['/api/work-orders/company', companyId] as const,
  workOrdersByAssignee: (assigneeId: string) => ['/api/work-orders/assignee', assigneeId] as const,
  
  // Messages
  messages: () => ['/api/messages'] as const,
  jobMessages: (workOrderId: string) => ['/api/job-messages', workOrderId] as const,
  
  // Time tracking
  timeEntries: () => ['/api/time-entries'] as const,
  activeTimeEntry: () => ['/api/time-entries/active'] as const,
  
  // Job network
  jobNetwork: () => ['/api/job-network'] as const,
  exclusiveNetwork: () => ['/api/exclusive-network'] as const,
  
  // Dashboard stats
  dashboardStats: () => ['/api/dashboard/stats'] as const,
  projectManagerStats: () => ['/api/project-manager/stats'] as const,
  
  // Projects
  projects: () => ['/api/projects'] as const,
  project: (id: string) => ['/api/projects', id] as const,
  
  // Project health monitoring
  projectHealthSummary: () => ['/api/project-health-summary'] as const,
} as const;

// Performance monitoring
let performanceMetrics: { [key: string]: number[] } = {};

const trackPerformance = (queryKey: string, duration: number) => {
  if (!performanceMetrics[queryKey]) {
    performanceMetrics[queryKey] = [];
  }
  performanceMetrics[queryKey].push(duration);
  
  // Keep only last 100 measurements per query
  if (performanceMetrics[queryKey].length > 100) {
    performanceMetrics[queryKey] = performanceMetrics[queryKey].slice(-100);
  }
  
  // Log slow queries (over 2 seconds)
  if (duration > 2000) {
    console.warn(`Slow query detected: ${queryKey} took ${duration}ms`);
  }
};

export const getPerformanceMetrics = () => {
  const summary: { [key: string]: { avg: number; max: number; count: number } } = {};
  
  Object.entries(performanceMetrics).forEach(([key, times]) => {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);
    summary[key] = { avg: Math.round(avg), max, count: times.length };
  });
  
  return summary;
};

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseHeaders: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  const requestHeaders = getRequestHeaders();
  
  const res = await fetch(url, {
    method,
    headers: { ...baseHeaders, ...requestHeaders },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
// Get testing role and device fingerprint headers for API requests
function getRequestHeaders(): Record<string, string> {
  if (typeof window !== 'undefined') {
    const testingRole = localStorage.getItem('testingRole');
    const testingCompanyType = localStorage.getItem('testingCompanyType');
    
    const headers: Record<string, string> = {};
    
    if (testingRole) {
      headers['x-testing-role'] = testingRole;
      console.log('Adding testing role header:', testingRole);
    }
    
    if (testingCompanyType) {
      headers['x-testing-company-type'] = testingCompanyType;
      console.log('Adding testing company type header:', testingCompanyType);
    }
    
    // Add device fingerprint for device recognition
    try {
      const deviceFingerprint = generateDeviceFingerprint();
      headers['x-device-fingerprint'] = deviceFingerprint;
    } catch (error) {
      console.warn('Failed to generate device fingerprint:', error);
    }
    
    return headers;
  }
  return {};
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const startTime = performance.now();
    const queryKeyStr = Array.isArray(queryKey) ? queryKey.join("/") : String(queryKey);
    const headers = getRequestHeaders();
    
    try {
      const res = await fetch(queryKeyStr, {
        credentials: "include",
        headers,
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      
      // Track performance
      const duration = performance.now() - startTime;
      trackPerformance(queryKeyStr, duration);
      
      return data;
    } catch (error) {
      const duration = performance.now() - startTime;
      trackPerformance(`${queryKeyStr}:error`, duration);
      throw error;
    }
  };

// Enhanced cache invalidation utilities
export const invalidateRelatedQueries = async (queryClient: QueryClient, resource: string) => {
  switch (resource) {
    case 'users':
      await queryClient.invalidateQueries({ queryKey: queryKeys.users() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.recentUsers() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.operationsStats() });
      break;
    case 'companies':
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.operationsStats() });
      break;
    case 'workOrders':
      await queryClient.invalidateQueries({ queryKey: queryKeys.workOrders() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      break;
    case 'accessRequests':
      await queryClient.invalidateQueries({ queryKey: queryKeys.accessRequests() });
      await queryClient.invalidateQueries({ queryKey: queryKeys.approvalRequests() });
      break;
    default:
      // Fallback: invalidate by pattern
      await queryClient.invalidateQueries({ 
        predicate: (query) => query.queryKey[0] === `/api/${resource}` 
      });
  }
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes default stale time
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection time (was cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (isUnauthorizedError(error as Error)) return false;
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry on auth errors or client errors (4xx)
        if (isUnauthorizedError(error as Error)) return false;
        if (error.message.includes('4')) return false;
        return failureCount < 1;
      },
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});
