import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseHeaders: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  const testingHeaders = getTestingRoleHeaders();
  
  const res = await fetch(url, {
    method,
    headers: { ...baseHeaders, ...testingHeaders },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
// Get testing role from localStorage for API headers
function getTestingRoleHeaders(): Record<string, string> {
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
    
    return headers;
  }
  return {};
}

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers = getTestingRoleHeaders();
    
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
