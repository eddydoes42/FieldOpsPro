/**
 * Device fingerprinting utility for trusted device management
 */

// Generate a unique device fingerprint based on browser characteristics
export function generateDeviceFingerprint(): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 200;
  canvas.height = 50;
  
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint test', 2, 2);
  }
  
  const canvasFingerprint = canvas.toDataURL();
  
  const fingerprint = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages?.join(',') || '',
    platform: navigator.platform,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    canvas: canvasFingerprint.slice(-100), // Last 100 chars to avoid huge string
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack || 'unknown',
    hardwareConcurrency: navigator.hardwareConcurrency || 0,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    webgl: getWebGLFingerprint(),
  };
  
  const fingerprintString = JSON.stringify(fingerprint);
  return btoa(fingerprintString).slice(0, 64); // Base64 encode and truncate
}

// Get WebGL fingerprint for additional uniqueness
function getWebGLFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
    
    if (!gl) return 'no-webgl';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '';
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
    
    return `${vendor}-${renderer}`.slice(0, 50);
  } catch {
    return 'webgl-error';
  }
}

// Check if device fingerprint has changed significantly
export function hasDeviceFingerprintChanged(stored: string, current: string): boolean {
  if (!stored || !current) return true;
  
  try {
    const storedData = JSON.parse(atob(stored));
    const currentData = JSON.parse(atob(current));
    
    // Check critical fields that shouldn't change
    const criticalFields = ['userAgent', 'platform', 'screen', 'webgl'];
    
    for (const field of criticalFields) {
      if (storedData[field] !== currentData[field]) {
        return true;
      }
    }
    
    return false;
  } catch {
    return true; // If parsing fails, consider it changed
  }
}

// Get a user-friendly device name based on the fingerprint
export function getDeviceNameFromFingerprint(fingerprint: string): string {
  try {
    const data = JSON.parse(atob(fingerprint));
    const userAgent = data.userAgent || '';
    
    if (userAgent.includes('Mobile')) {
      if (userAgent.includes('iPhone')) return 'iPhone';
      if (userAgent.includes('Android')) return 'Android Phone';
      return 'Mobile Device';
    }
    
    if (userAgent.includes('Macintosh')) return 'Mac';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Linux')) return 'Linux Computer';
    
    return 'Browser';
  } catch {
    return 'Unknown Device';
  }
}

// Store device token locally for faster subsequent logins
export function storeDeviceToken(token: string): void {
  try {
    localStorage.setItem('device_token', token);
    localStorage.setItem('device_token_timestamp', Date.now().toString());
  } catch {
    // Silently fail if localStorage is not available
  }
}

// Retrieve stored device token
export function getStoredDeviceToken(): string | null {
  try {
    const token = localStorage.getItem('device_token');
    const timestamp = localStorage.getItem('device_token_timestamp');
    
    if (!token || !timestamp) return null;
    
    // Check if token is less than 30 days old
    const tokenAge = Date.now() - parseInt(timestamp);
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    
    if (tokenAge > maxAge) {
      clearStoredDeviceToken();
      return null;
    }
    
    return token;
  } catch {
    return null;
  }
}

// Clear stored device token
export function clearStoredDeviceToken(): void {
  try {
    localStorage.removeItem('device_token');
    localStorage.removeItem('device_token_timestamp');
  } catch {
    // Silently fail if localStorage is not available
  }
}

// Update device token timestamp
export function updateDeviceTokenTimestamp(): void {
  try {
    localStorage.setItem('device_token_timestamp', Date.now().toString());
  } catch {
    // Silently fail if localStorage is not available
  }
}
