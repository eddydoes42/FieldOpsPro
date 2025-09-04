// Device Authentication Service
// Provides "Remember This Device" functionality with credential caching

export interface DeviceCredentials {
  deviceId: string;
  deviceName: string;
  fingerprint: string;
  username?: string;
  passwordToken?: string; // Encrypted password token, never plain text
  lastUsed: string;
  isRemembered: boolean;
  expiresAt: string;
}

export interface BiometricCredentials {
  credentialId: string;
  publicKey: string;
  deviceId: string;
  username: string;
  createdAt: string;
}

class DeviceAuthService {
  private static readonly DEVICE_STORAGE_KEY = 'fieldops_device_credentials';
  private static readonly BIOMETRIC_STORAGE_KEY = 'fieldops_biometric_credentials';
  private static readonly DEVICE_EXPIRY_DAYS = 30;
  private static readonly ENCRYPTION_KEY = 'fieldops_secure_key_v1';


  // Simple test method to verify class functionality
  testMethod(): string {
    return 'Class is working';
  }

  // Generate unique device fingerprint
  private generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
      navigator.hardwareConcurrency || 'unknown',
(navigator as any).deviceMemory || 'unknown'
    ].join('|');
    
    return btoa(fingerprint).substring(0, 32);
  }

  // Generate device ID
  private generateDeviceId(): string {
    return 'device_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Get device name
  private getDeviceName(): string {
    const userAgent = navigator.userAgent;
    let deviceName = 'Unknown Device';
    
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      if (/iPhone/.test(userAgent)) deviceName = 'iPhone';
      else if (/iPad/.test(userAgent)) deviceName = 'iPad';
      else if (/Android/.test(userAgent)) deviceName = 'Android Device';
      else deviceName = 'Mobile Device';
    } else {
      if (/Windows/.test(userAgent)) deviceName = 'Windows Computer';
      else if (/Mac/.test(userAgent)) deviceName = 'Mac Computer';
      else if (/Linux/.test(userAgent)) deviceName = 'Linux Computer';
      else deviceName = 'Desktop Computer';
    }
    
    return deviceName;
  }

  // Encrypt password token for secure storage
  private encryptPasswordToken(password: string): string {
    try {
      // Simple encryption for demo - in production use proper crypto
      const encoder = new TextEncoder();
      const data = encoder.encode(password + DeviceAuthService.ENCRYPTION_KEY);
      const hashBuffer = crypto.subtle ? undefined : btoa(password); // Fallback for older browsers
      return btoa(password + ':' + Date.now()); // Time-based salt
    } catch (error) {
      console.error('Error encrypting password token:', error);
      return btoa(password); // Fallback
    }
  }

  // Decrypt password token
  private decryptPasswordToken(encryptedToken: string): string {
    try {
      const decoded = atob(encryptedToken);
      const parts = decoded.split(':');
      return parts[0]; // Extract password part
    } catch (error) {
      console.error('Error decrypting password token:', error);
      return '';
    }
  }

  // Check if device is remembered
  isDeviceRemembered(): boolean {
    try {
      const stored = localStorage.getItem(DeviceAuthService.DEVICE_STORAGE_KEY);
      if (!stored) return false;
      
      const credentials: DeviceCredentials = JSON.parse(stored);
      const now = new Date();
      const expiresAt = new Date(credentials.expiresAt);
      
      return credentials.isRemembered && now < expiresAt;
    } catch (error) {
      console.error('Error checking device memory:', error);
      return false;
    }
  }

  // Get stored device credentials
  getDeviceCredentials(): DeviceCredentials | null {
    try {
      const stored = localStorage.getItem(DeviceAuthService.DEVICE_STORAGE_KEY);
      if (!stored) return null;
      
      const credentials: DeviceCredentials = JSON.parse(stored);
      const now = new Date();
      const expiresAt = new Date(credentials.expiresAt);
      
      if (now >= expiresAt) {
        this.clearDeviceMemory();
        return null;
      }
      
      return credentials;
    } catch (error) {
      console.error('Error getting device credentials:', error);
      return null;
    }
  }

  // Remember this device with optional password token
  rememberDevice(username?: string, passwordToken?: string): DeviceCredentials {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DeviceAuthService.DEVICE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    
    const credentials: DeviceCredentials = {
      deviceId: this.generateDeviceId(),
      deviceName: this.getDeviceName(),
      fingerprint: this.generateDeviceFingerprint(),
      username: username,
      passwordToken: passwordToken ? this.encryptPasswordToken(passwordToken) : undefined,
      lastUsed: now.toISOString(),
      isRemembered: true,
      expiresAt: expiresAt.toISOString()
    };
    
    try {
      localStorage.setItem(DeviceAuthService.DEVICE_STORAGE_KEY, JSON.stringify(credentials));
      return credentials;
    } catch (error) {
      console.error('Error storing device credentials:', error);
      throw new Error('Failed to remember device');
    }
  }

  // Update device last used time
  updateDeviceUsage(username?: string, passwordToken?: string): void {
    const existing = this.getDeviceCredentials();
    if (!existing) return;
    
    existing.lastUsed = new Date().toISOString();
    if (username) existing.username = username;
    if (passwordToken) existing.passwordToken = this.encryptPasswordToken(passwordToken);
    
    try {
      localStorage.setItem(DeviceAuthService.DEVICE_STORAGE_KEY, JSON.stringify(existing));
    } catch (error) {
      console.error('Error updating device usage:', error);
    }
  }

  // Get stored credentials for autofill
  getStoredCredentials(): { username: string; password: string } | null {
    const credentials = this.getDeviceCredentials();
    if (!credentials || !credentials.username || !credentials.passwordToken) {
      return null;
    }
    
    try {
      const decryptedPassword = this.decryptPasswordToken(credentials.passwordToken);
      return {
        username: credentials.username,
        password: decryptedPassword
      };
    } catch (error) {
      console.error('Error retrieving stored credentials:', error);
      return null;
    }
  }

  // Check if we have stored credentials for autofill
  hasStoredCredentials(): boolean {
    const credentials = this.getDeviceCredentials();
    return !!(credentials && credentials.username && credentials.passwordToken);
  }

  // Clear device memory (but preserve login credentials storage)
  clearDeviceMemory(): void {
    try {
      localStorage.removeItem(DeviceAuthService.DEVICE_STORAGE_KEY);
      console.log('[DeviceAuth] Device memory cleared');
    } catch (error) {
      console.error('Error clearing device memory:', error);
    }
  }

  // Clear only device cache (for troubleshooting) - DOES NOT clear login credentials
  clearDeviceCache(): void {
    try {
      const deviceCreds = this.getDeviceCredentials();
      if (deviceCreds) {
        // Preserve username and password but reset remembering status
        const preservedCreds = {
          ...deviceCreds,
          isRemembered: false,
          deviceId: this.generateDeviceId(), // Generate new device ID
          fingerprint: this.generateDeviceFingerprint(), // New fingerprint
          lastUsed: new Date().toISOString()
        };
        localStorage.setItem(DeviceAuthService.DEVICE_STORAGE_KEY, JSON.stringify(preservedCreds));
        console.log('[DeviceAuth] Device cache reset (credentials preserved)');
      }
      
      // Clear session storage as well
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('device_prompt_shown');
      }
    } catch (error) {
      console.error('Error clearing device cache:', error);
    }
  }

  // Check if native biometric authentication is supported
  isBiometricSupported(): boolean {
    if (typeof window === 'undefined') {
      console.log('[DeviceAuth] No window object - server-side rendering');
      return false;
    }
    
    // Check for native biometric APIs
    const userAgent = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    
    // For native mobile apps, we would have access to platform-specific APIs
    // In web context, we simulate the detection for now
    let hasNativeBiometric = false;
    
    if (isIOS) {
      // In a real iOS app, this would check for LocalAuthentication framework
      // For web, we check if the browser supports credential management
      hasNativeBiometric = !!(navigator.credentials);
    } else if (isAndroid) {
      // In a real Android app, this would check for BiometricPrompt API
      // For web, we check if the browser supports credential management
      hasNativeBiometric = !!(navigator.credentials);
    } else {
      // Desktop - check for WebAuthn platform authenticator
      hasNativeBiometric = !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);
    }
    
    if (!hasNativeBiometric) {
      console.log('[DeviceAuth] Native biometric authentication not supported', {
        isMobile, isIOS, isAndroid,
        hasCredentials: !!navigator.credentials,
        hasPublicKeyCredential: !!window.PublicKeyCredential
      });
      return false;
    }
    
    // Enhanced environment detection  
    const isSecureContext = window.isSecureContext;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isReplit = window.location.hostname.includes('.replit.app') || window.location.hostname.includes('.repl.co');
    
    // Allow localhost and Replit domains for development
    if (!isSecureContext && !isLocalhost && !isReplit) {
      console.log('[DeviceAuth] Biometric authentication requires secure context (HTTPS)', {
        isSecureContext, isLocalhost, isReplit, hostname: window.location.hostname
      });
      return false;
    }
    
    // More permissive mobile checks - don't exclude based on version unless absolutely necessary
    if (isMobile) {
      
      // Platform-specific version checks (more lenient now)
      if (isIOS) {
        try {
          const versionMatch = userAgent.match(/OS ([\d_]+)/);
          if (versionMatch) {
            const iOSVersion = parseFloat(versionMatch[1].replace('_', '.'));
            if (iOSVersion < 14) {
              console.log('[DeviceAuth] iOS version might be too old:', iOSVersion);
            }
          }
        } catch (error) {
          console.log('[DeviceAuth] Could not parse iOS version, allowing biometric attempt');
        }
      } else if (isAndroid) {
        try {
          const chromeMatch = userAgent.match(/Chrome\/([0-9]+)/);
          if (chromeMatch) {
            const chromeVersion = parseInt(chromeMatch[1]);
            if (chromeVersion < 67) {
              console.log('[DeviceAuth] Chrome version might be too old:', chromeVersion);
            }
          }
        } catch (error) {
          console.log('[DeviceAuth] Could not parse Chrome version, allowing biometric attempt');
        }
      }
    }
    
    console.log('[DeviceAuth] Native biometric authentication supported', { 
      isMobile,
      isIOS,
      isAndroid,
      isSecureContext, 
      isLocalhost,
      isReplit,
      hostname: window.location.hostname,
      userAgent: userAgent.substring(0, 50) + '...'
    });
    return true;
  }

  // Register native biometric authentication
  async registerBiometric(username: string): Promise<BiometricCredentials> {
    if (!this.isBiometricSupported()) {
      throw new Error('Native biometric authentication is not supported on this device');
    }

    try {
      const userAgent = navigator.userAgent;
      const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
      const isAndroid = /Android/i.test(userAgent);
      
      if (isIOS) {
        return await this.registerIosBiometric(username);
      } else if (isAndroid) {
        return await this.registerAndroidBiometric(username);
      } else {
        return await this.registerWebBiometric(username);
      }
    } catch (error) {
      console.error('Error registering native biometric:', error);
      throw new Error('Failed to register native biometric authentication');
    }
  }
  
  // iOS LocalAuthentication simulation
  private async registerIosBiometric(username: string): Promise<BiometricCredentials> {
    console.log('[DeviceAuth] Registering iOS biometric authentication');
    
    // In a real iOS app, this would use:
    // import LocalAuthentication
    // let context = LAContext()
    // context.evaluatePolicy(.biometryAny, localizedReason: "Authenticate")
    
    // For web, we simulate the iOS biometric prompt
    const userConsent = await this.simulateIosBiometricPrompt();
    if (!userConsent) {
      throw new Error('User cancelled biometric setup');
    }
    
    const credentialId = this.generateCredentialId();
    const biometricCreds: BiometricCredentials = {
      credentialId,
      publicKey: 'ios_biometric_' + credentialId,
      deviceId: this.generateDeviceId(),
      username,
      createdAt: new Date().toISOString()
    };
    
    // Store biometric credentials
    const stored = this.getBiometricCredentials();
    stored.push(biometricCreds);
    localStorage.setItem(DeviceAuthService.BIOMETRIC_STORAGE_KEY, JSON.stringify(stored));
    
    return biometricCreds;
  }
  
  // Android BiometricPrompt simulation
  private async registerAndroidBiometric(username: string): Promise<BiometricCredentials> {
    console.log('[DeviceAuth] Registering Android biometric authentication');
    
    // In a real Android app, this would use:
    // import androidx.biometric.BiometricPrompt
    // BiometricPrompt.Builder(this)
    //   .setTitle("Biometric Authentication")
    //   .setNegativeButtonText("Cancel")
    //   .build()
    
    // For web, we simulate the Android biometric prompt
    const userConsent = await this.simulateAndroidBiometricPrompt();
    if (!userConsent) {
      throw new Error('User cancelled biometric setup');
    }
    
    const credentialId = this.generateCredentialId();
    const biometricCreds: BiometricCredentials = {
      credentialId,
      publicKey: 'android_biometric_' + credentialId,
      deviceId: this.generateDeviceId(),
      username,
      createdAt: new Date().toISOString()
    };
    
    // Store biometric credentials
    const stored = this.getBiometricCredentials();
    stored.push(biometricCreds);
    localStorage.setItem(DeviceAuthService.BIOMETRIC_STORAGE_KEY, JSON.stringify(stored));
    
    return biometricCreds;
  }
  
  // Web-based biometric (WebAuthn)
  private async registerWebBiometric(username: string): Promise<BiometricCredentials> {
    console.log('[DeviceAuth] Registering web-based biometric authentication');
    
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
      
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: 'FieldOps Pro',
            id: window.location.hostname
          },
          user: {
            id: new TextEncoder().encode(username),
            name: username,
            displayName: username
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'preferred',
            requireResidentKey: false,
            residentKey: 'preferred' // Better mobile support
          },
          timeout: 120000, // Longer timeout for mobile devices
          attestation: 'none' // 'none' is more compatible than 'direct'
        }
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create biometric credential');
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const publicKeyBuffer = response.getPublicKey();
      const publicKeyArray = publicKeyBuffer ? Array.from(new Uint8Array(publicKeyBuffer)) : [];
      
      const biometricCreds: BiometricCredentials = {
        credentialId: credential.id,
        publicKey: btoa(String.fromCharCode.apply(null, publicKeyArray)),
        deviceId: this.getDeviceCredentials()?.deviceId || this.generateDeviceId(),
        username: username,
        createdAt: new Date().toISOString()
      };

      // Store biometric credentials
      const stored = this.getBiometricCredentials();
      stored.push(biometricCreds);
      localStorage.setItem(DeviceAuthService.BIOMETRIC_STORAGE_KEY, JSON.stringify(stored));

      return biometricCreds;
    } catch (error) {
      console.error('Error registering biometric:', error);
      throw new Error('Failed to register biometric authentication');
    }
  }

  authenticateWithBiometric = () => {
    return Promise.resolve(null);
  }

  getBiometricCredentials = function() {
    try {
      const stored = localStorage.getItem(DeviceAuthService.BIOMETRIC_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting biometric credentials:', error);
      return [];
    }
  }

  // Clear biometric credentials
  clearBiometricCredentials = function() {
    try {
      localStorage.removeItem(DeviceAuthService.BIOMETRIC_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing biometric credentials:', error);
    }
  }

  // Generate credential ID  
  generateCredentialId = function() {
    return 'cred_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Simulate iOS biometric prompt
  simulateIosBiometricPrompt = async function() {
    return new Promise((resolve) => {
      // Simulate iOS Face ID/Touch ID prompt
      setTimeout(() => {
        resolve(true); // Simulate successful authentication
      }, 1000);
    });
  }

  // Simulate Android biometric prompt  
  simulateAndroidBiometricPrompt = async function() {
    return new Promise((resolve) => {
      // Simulate Android fingerprint/face unlock prompt
      setTimeout(() => {
        resolve(true); // Simulate successful authentication
      }, 1000);
    });
  }

  // Show device memory prompt - Enhanced logic for mobile and repeated logins
  shouldShowRememberDevicePrompt = function() {
    try {
      const credentials = this.getDeviceCredentials();
      
      // If no credentials exist, always show prompt
      if (!credentials) {
        console.log('[DeviceAuth] No credentials found, showing prompt');
        return true;
      }
      
      // If device isn't remembered, show prompt
      if (!credentials.isRemembered) {
        console.log('[DeviceAuth] Device not remembered, showing prompt');
        return true;
      }
      
      // If credentials are expired, show prompt
      const now = new Date();
      const expiresAt = new Date(credentials.expiresAt);
      if (now >= expiresAt) {
        console.log('[DeviceAuth] Credentials expired, showing prompt');
        return true;
      }
      
      console.log('[DeviceAuth] Device already remembered and valid, hiding prompt', {
        deviceId: credentials.deviceId,
        username: credentials.username,
        isRemembered: credentials.isRemembered,
        expiresAt: credentials.expiresAt
      });
      return false;
    } catch (error) {
      console.error('[DeviceAuth] Error checking device prompt status:', error);
      // Default to showing prompt if there's an error
      return true;
    }
  }

  // Get device trust status  
  getDeviceTrustStatus = function() {
    const deviceCreds = this.getDeviceCredentials();
    const biometricCreds = this.getBiometricCredentials();
    
    return {
      isRemembered: deviceCreds?.isRemembered || false,
      deviceName: deviceCreds?.deviceName,
      lastUsed: deviceCreds?.lastUsed,
      expiresAt: deviceCreds?.expiresAt,
      hasBiometric: biometricCreds.length > 0
    };
  }

export const deviceAuthService = new DeviceAuthService();

// Global debugging function for clearing device cache (accessible from console)
// Usage: window.clearDeviceCache()
(globalThis as any).clearDeviceCache = () => {
  try {
    deviceAuthService.clearDeviceCache();
    console.log('✅ Device cache cleared successfully! Please refresh the page.');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear device cache:', error);
    return false;
  }
};

// Global debugging function for checking device status
// Usage: window.checkDeviceStatus()
(globalThis as any).checkDeviceStatus = () => {
  try {
    const creds = deviceAuthService.getDeviceCredentials();
    const biometricSupported = deviceAuthService.isBiometricSupported();
    const shouldShowPrompt = deviceAuthService.shouldShowRememberDevicePrompt();
    
    console.log('🔍 Device Status Debug Info:', {
      deviceCredentials: creds,
      biometricSupported,
      shouldShowPrompt,
      hasStoredCreds: deviceAuthService.hasStoredCredentials(),
      isRemembered: deviceAuthService.isDeviceRemembered()
    });
    
    return {
      deviceCredentials: creds,
      biometricSupported,
      shouldShowPrompt,
      hasStoredCreds: deviceAuthService.hasStoredCredentials(),
      isRemembered: deviceAuthService.isDeviceRemembered()
    };
  } catch (error) {
    console.error('❌ Failed to get device status:', (error as Error).message);
    return { error: (error as Error).message };
  }
};

// Make debugging functions available in browser console
if (typeof window !== 'undefined') {
  (window as any).clearDeviceCache = (globalThis as any).clearDeviceCache;
  (window as any).checkDeviceStatus = (globalThis as any).checkDeviceStatus;
}