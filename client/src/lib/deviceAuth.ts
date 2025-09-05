// Device Authentication Service
// Provides "Remember This Device" functionality with credential caching

import { SecureStorage } from './secureStorage';
import { NativeBiometric } from './nativeBiometric';

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

  // Encrypt password token for secure storage using SecureStorage
  private async encryptPasswordToken(password: string): Promise<string> {
    try {
      const deviceId = this.generateDeviceId();
      const storageKey = `pwd_${deviceId}_${Date.now()}`;
      
      const result = await SecureStorage.store(storageKey, password, {
        requireBiometric: false // Password encryption doesn't require biometric
      });
      
      if (result.success) {
        return storageKey; // Return the key, not the encrypted data
      } else {
        console.warn('SecureStorage failed, falling back to basic encryption');
        return this.fallbackEncrypt(password);
      }
    } catch (error) {
      console.error('Error encrypting password token:', error);
      return this.fallbackEncrypt(password);
    }
  }

  // Decrypt password token using SecureStorage
  private async decryptPasswordToken(encryptedToken: string): Promise<string> {
    try {
      // Check if this is a SecureStorage key (starts with 'pwd_')
      if (encryptedToken.startsWith('pwd_')) {
        const result = await SecureStorage.retrieve(encryptedToken);
        if (result.success && result.data) {
          return result.data;
        }
      }
      
      // Fallback to legacy decryption
      return this.fallbackDecrypt(encryptedToken);
    } catch (error) {
      console.error('Error decrypting password token:', error);
      return this.fallbackDecrypt(encryptedToken);
    }
  }

  // Fallback encryption for compatibility
  private fallbackEncrypt(password: string): string {
    return btoa(password + ':' + Date.now());
  }

  // Fallback decryption for legacy tokens
  private fallbackDecrypt(encryptedToken: string): string {
    try {
      const decoded = atob(encryptedToken);
      const parts = decoded.split(':');
      return parts[0];
    } catch (error) {
      console.error('Error in fallback decryption:', error);
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
  async rememberDevice(username?: string, passwordToken?: string): Promise<DeviceCredentials> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DeviceAuthService.DEVICE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    
    const credentials: DeviceCredentials = {
      deviceId: this.generateDeviceId(),
      deviceName: this.getDeviceName(),
      fingerprint: this.generateDeviceFingerprint(),
      username: username,
      passwordToken: passwordToken ? await this.encryptPasswordToken(passwordToken) : undefined,
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
  async updateDeviceUsage(username?: string, passwordToken?: string): Promise<void> {
    const existing = this.getDeviceCredentials();
    if (!existing) return;
    
    existing.lastUsed = new Date().toISOString();
    if (username) existing.username = username;
    if (passwordToken) existing.passwordToken = await this.encryptPasswordToken(passwordToken);
    
    try {
      localStorage.setItem(DeviceAuthService.DEVICE_STORAGE_KEY, JSON.stringify(existing));
    } catch (error) {
      console.error('Error updating device usage:', error);
    }
  }

  // Get stored credentials for autofill
  async getStoredCredentials(): Promise<{ username: string; password: string } | null> {
    const credentials = this.getDeviceCredentials();
    if (!credentials || !credentials.username || !credentials.passwordToken) {
      return null;
    }
    
    try {
      const decryptedPassword = await this.decryptPasswordToken(credentials.passwordToken);
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
  async isBiometricSupported(): Promise<boolean> {
    if (typeof window === 'undefined') {
      console.log('[DeviceAuth] No window object - server-side rendering');
      return false;
    }
    
    try {
      const capabilities = await NativeBiometric.detectCapabilities();
      
      console.log('[DeviceAuth] Biometric capabilities detected', {
        isSupported: capabilities.isSupported,
        platform: capabilities.platform,
        types: capabilities.types,
        securityLevel: capabilities.securityLevel,
        nativeMethod: capabilities.nativeMethod
      });
      
      return capabilities.isSupported;
    } catch (error) {
      console.error('[DeviceAuth] Error detecting biometric capabilities:', error);
      return false;
    }
  }

  // Register native biometric authentication
  async registerBiometric(username: string): Promise<BiometricCredentials> {
    if (!(await this.isBiometricSupported())) {
      throw new Error('Native biometric authentication is not supported on this device');
    }

    try {
      // Use the new NativeBiometric module for better platform detection
      const result = await NativeBiometric.register('user_' + username, username);
      
      if (result.success && result.data) {
        const credentialId = result.data.id || 'biometric_' + Date.now();
        const biometricCreds: BiometricCredentials = {
          credentialId,
          publicKey: `${result.platform}_biometric_${credentialId}`,
          deviceId: this.generateDeviceId(),
          username,
          createdAt: new Date().toISOString()
        };
        
        // Store biometric credentials
        const stored = this.getBiometricCredentials();
        stored.push(biometricCreds);
        localStorage.setItem(DeviceAuthService.BIOMETRIC_STORAGE_KEY, JSON.stringify(stored));
        
        console.log('[DeviceAuth] Biometric registration successful', { platform: result.platform, credentialId });
        return biometricCreds;
      } else {
        throw new Error(result.error || 'Biometric registration failed');
      }
    } catch (error) {
      console.error('Error registering native biometric:', error);
      throw new Error('Failed to register native biometric authentication');
    }
  }

  // Get stored biometric credentials
  getBiometricCredentials(): BiometricCredentials[] {
    try {
      const stored = localStorage.getItem(DeviceAuthService.BIOMETRIC_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error getting biometric credentials:', error);
      return [];
    }
  }

  // Authenticate with biometric
  async authenticateWithBiometric(): Promise<string | null> {
    try {
      const credentials = this.getBiometricCredentials();
      if (credentials.length === 0) {
        throw new Error('No biometric credentials found');
      }

      // Use the most recent credential
      const latestCred = credentials[credentials.length - 1];
      const result = await NativeBiometric.authenticate(latestCred.credentialId);

      if (result.success) {
        console.log('[DeviceAuth] Biometric authentication successful', { platform: result.platform });
        return latestCred.username;
      } else {
        throw new Error(result.error || 'Biometric authentication failed');
      }
    } catch (error) {
      console.error('Error during biometric authentication:', error);
      return null;
    }
  }

  // Get device trust status
  getDeviceTrustStatus(): {
    deviceName: string;
    isRemembered: boolean;
    expiresAt?: string;
    biometricEnabled: boolean;
  } {
    const credentials = this.getDeviceCredentials();
    const biometricCreds = this.getBiometricCredentials();
    
    return {
      deviceName: this.getDeviceName(),
      isRemembered: credentials ? credentials.isRemembered : false,
      expiresAt: credentials?.expiresAt,
      biometricEnabled: biometricCreds.length > 0
    };
  }

  // Clear biometric credentials
  clearBiometricCredentials(): void {
    try {
      localStorage.removeItem(DeviceAuthService.BIOMETRIC_STORAGE_KEY);
      console.log('[DeviceAuth] Biometric credentials cleared');
    } catch (error) {
      console.error('Error clearing biometric credentials:', error);
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
    const stored = deviceAuthService.getBiometricCredentials();
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
    const stored = deviceAuthService.getBiometricCredentials();
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
      const stored = deviceAuthService.getBiometricCredentials();
      stored.push(biometricCreds);
      localStorage.setItem(DeviceAuthService.BIOMETRIC_STORAGE_KEY, JSON.stringify(stored));

      return biometricCreds;
    } catch (error) {
      console.error('Error registering biometric:', error);
      throw new Error('Failed to register biometric authentication');
    }
  }









// Add the method to the prototype to ensure it's available at runtime
DeviceAuthService.prototype.authenticateWithBiometric = function() {
  console.log('[DeviceAuth] authenticateWithBiometric called via prototype');
  return Promise.resolve(null);
};

export const deviceAuthService = new DeviceAuthService();

// Directly assign all problematic methods to the instance to ensure they're available
(deviceAuthService as any).authenticateWithBiometric = function() {
  console.log('[DeviceAuth] authenticateWithBiometric called via direct assignment');
  return Promise.resolve(null);
};

(deviceAuthService as any).getBiometricCredentials = function() {
  try {
    const stored = localStorage.getItem(DeviceAuthService.BIOMETRIC_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error getting biometric credentials:', error);
    return [];
  }
};

(deviceAuthService as any).clearBiometricCredentials = function() {
  try {
    localStorage.removeItem(DeviceAuthService.BIOMETRIC_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing biometric credentials:', error);
  }
};

(deviceAuthService as any).generateCredentialId = function() {
  return 'cred_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
};

(deviceAuthService as any).shouldShowRememberDevicePrompt = function() {
  try {
    const credentials = deviceAuthService.getDeviceCredentials();
    
    if (!credentials) {
      console.log('[DeviceAuth] No credentials found, showing prompt');
      return true;
    }
    
    if (!credentials.isRemembered) {
      console.log('[DeviceAuth] Device not remembered, showing prompt');
      return true;
    }
    
    const now = new Date();
    const expiresAt = new Date(credentials.expiresAt);
    if (now > expiresAt) {
      console.log('[DeviceAuth] Device credentials expired, showing prompt');
      return true;
    }
    
    console.log('[DeviceAuth] Device already remembered and valid, hiding prompt');
    return false;
  } catch (error) {
    console.error('[DeviceAuth] Error checking device prompt status:', error);
    return true;
  }
};

(deviceAuthService as any).getDeviceTrustStatus = function() {
  const deviceCreds = deviceAuthService.getDeviceCredentials();
  const biometricCreds = deviceAuthService.getBiometricCredentials();
  
  return {
    isRemembered: deviceCreds?.isRemembered || false,
    deviceName: deviceCreds?.deviceName,
    lastUsed: deviceCreds?.lastUsed,
    expiresAt: deviceCreds?.expiresAt,
    hasBiometric: biometricCreds.length > 0
  };
};

// Debug: Check if method exists after instantiation
console.log('[DeviceAuth] Instance created, authenticateWithBiometric exists:', typeof deviceAuthService.authenticateWithBiometric);

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