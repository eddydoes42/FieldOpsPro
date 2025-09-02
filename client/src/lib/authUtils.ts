export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message) ||
         error.message.includes('401') || 
         error.message.toLowerCase().includes('unauthorized') ||
         error.message.toLowerCase().includes('session expired');
}

export const isNetworkError = (error: Error): boolean => {
  return error.message.toLowerCase().includes('network') ||
         error.message.toLowerCase().includes('fetch') ||
         error.message.toLowerCase().includes('connection');
};

export const getErrorMessage = (error: Error): string => {
  if (isUnauthorizedError(error)) {
    return "Your session has expired. Please log in again.";
  }
  
  if (isNetworkError(error)) {
    return "Network connection issue. Please check your internet connection.";
  }
  
  // Parse API error messages
  const match = error.message.match(/^\d+:\s*(.+)$/);
  if (match) {
    return match[1];
  }
  
  return error.message || "An unexpected error occurred";
};

export const handleAuthRedirect = () => {
  window.location.href = "/api/login";
};