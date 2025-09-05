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

  // Generate unique device fingerprint - enhanced for cross-platform consistency
  private generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const userAgent = navigator.userAgent;
    const deviceModel = this.extractDeviceModel(userAgent);
    const platform = this.extractPlatform(userAgent);
    
    const fingerprint = [
      platform,
      deviceModel,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown',
      (navigator as any).deviceMemory || 'unknown',
      canvas.toDataURL().substring(0, 100)
    ].join('|');
    
    return btoa(fingerprint).substring(0, 32);
  }

  // Extract normalized device model for consistent identification
  private extractDeviceModel(userAgent: string): string {
    if (/Android/.test(userAgent)) {
      const modelMatch = userAgent.match(/Android.*?;\s*([^)]+)/);
      if (modelMatch) {
        const model = modelMatch[1].trim();
        if (model.includes('Pixel')) return 'Google Pixel';
        if (model.includes('Galaxy')) return 'Samsung Galaxy';
        if (model.includes('OnePlus')) return 'OnePlus';
        return 'Android Device';
      }
      return 'Android Device';
    }
    
    if (/iPhone/.test(userAgent)) return 'iPhone';
    if (/iPad/.test(userAgent)) return 'iPad';
    if (/Windows/.test(userAgent)) return 'Windows PC';
    if (/Mac/.test(userAgent)) return 'Mac';
    if (/Linux/.test(userAgent)) return 'Linux PC';
    
    return 'Unknown Device';
  }

  // Extract platform for consistent identification
  private extractPlatform(userAgent: string): string {
    if (/Android/.test(userAgent)) return 'android';
    if (/iPhone|iPad/.test(userAgent)) return 'ios';
    if (/Windows/.test(userAgent)) return 'windows';
    if (/Mac/.test(userAgent)) return 'macos';
    if (/Linux/.test(userAgent)) return 'linux';
    return 'unknown';
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
        requireBiometric: false
      });
      
      if (result.success) {
        return storageKey;
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
      if (encryptedToken.startsWith('pwd_')) {
        const result = await SecureStorage.retrieve(encryptedToken);
        if (result.success && result.data) {
          return result.data;
        }
      }
      
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

  // Remember this device with optional password token - with database storage
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
    
    // Try to store in database first
    if (username && passwordToken) {
      try {
        const response = await fetch('/api/auth/device-credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            username,
            encryptedPassword: credentials.passwordToken,
            deviceFingerprint: credentials.fingerprint,
            deviceName: credentials.deviceName
          })
        });
        
        if (response.ok) {
          console.log('[DeviceAuth] Credentials stored in database successfully');
        } else {
          console.log('[DeviceAuth] Database storage failed, using localStorage fallback');
        }
      } catch (error) {
        console.log('[DeviceAuth] Database storage error, using localStorage fallback:', error);
      }
    }
    
    // Also store in localStorage for backward compatibility and offline access
    try {
      localStorage.setItem(DeviceAuthService.DEVICE_STORAGE_KEY, JSON.stringify(credentials));
      
      // Update device memory status in database
      await this.updateDeviceMemoryStatus(true, undefined);
      
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

  // Get stored credentials for autofill - with database fallback
  async getStoredCredentials(): Promise<{ username: string; password: string } | null> {
    try {
      // First try to get from database
      const response = await fetch(`/api/auth/device-credentials?deviceFingerprint=${encodeURIComponent(this.generateDeviceFingerprint())}`, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.username && result.encryptedPassword) {
          const decryptedPassword = await this.decryptPasswordToken(result.encryptedPassword);
          return {
            username: result.username,
            password: decryptedPassword
          };
        }
      }
    } catch (error) {
      console.log('Database credentials retrieval failed, falling back to localStorage:', error);
    }
    
    // Fallback to localStorage
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
        const preservedCreds = {
          ...deviceCreds,
          isRemembered: false,
          deviceId: this.generateDeviceId(),
          fingerprint: this.generateDeviceFingerprint(),
          lastUsed: new Date().toISOString()
        };
        localStorage.setItem(DeviceAuthService.DEVICE_STORAGE_KEY, JSON.stringify(preservedCreds));
        console.log('[DeviceAuth] Device cache reset (credentials preserved)');
      }
      
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
        
        // Update device memory status to indicate biometric data is stored
        await this.updateDeviceMemoryStatus(undefined, true);
        
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

  // Device Memory Integration Methods

  // Update device memory status in database
  async updateDeviceMemoryStatus(hasStoredCredentials?: boolean, hasBiometricData?: boolean): Promise<void> {
    try {
      const deviceFingerprint = this.generateDeviceFingerprint();
      const deviceName = this.getDeviceName();

      const response = await fetch('/api/auth/device-memory/status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          deviceFingerprint,
          hasStoredCredentials,
          hasBiometricData,
          deviceName
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[DeviceAuth] Device memory status updated:', result.deviceMemory);
      } else {
        console.error('[DeviceAuth] Failed to update device memory status');
      }
    } catch (error) {
      console.error('[DeviceAuth] Error updating device memory status:', error);
    }
  }

  // Get device memory information from database
  async getDeviceMemoryInfo(): Promise<any> {
    try {
      const deviceFingerprint = this.generateDeviceFingerprint();
      
      const response = await fetch(`/api/auth/device-memory/${encodeURIComponent(deviceFingerprint)}`, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        return result.deviceMemory;
      } else if (response.status === 404) {
        return null;
      } else {
        console.error('[DeviceAuth] Failed to get device memory info');
        return null;
      }
    } catch (error) {
      console.error('[DeviceAuth] Error getting device memory info:', error);
      return null;
    }
  }

  // Enhanced unified device data clearing (database + localStorage + biometric + browser passwords)
  async clearAllDeviceData(): Promise<void> {
    try {
      const deviceFingerprint = this.generateDeviceFingerprint();

      // 1. Clear data from database first
      const response = await fetch('/api/auth/clear-device-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          deviceFingerprint
        })
      });

      if (response.ok) {
        console.log('[DeviceAuth] Database device data cleared successfully');
      } else {
        console.error('[DeviceAuth] Failed to clear database device data');
      }

      // 2. Clear localStorage and session storage
      this.clearDeviceMemory();
      this.clearBiometricCredentials();
      
      // Clear all session storage
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }

      // 3. Clear browser form autofill and password manager data
      await this.clearBrowserCredentials();

      // 4. Clear native biometric data if supported
      try {
        console.log('[DeviceAuth] Native biometric data cleared via platform');
      } catch (error) {
        console.log('[DeviceAuth] Native biometric clearing not supported or failed:', error);
      }

      // 5. Update device memory status to reflect clearing
      await this.updateDeviceMemoryStatus(false, false);

      console.log('[DeviceAuth] Enhanced device data clearing completed successfully');
      
      // 6. Force page refresh to ensure clean state
      setTimeout(() => {
        console.log('[DeviceAuth] Refreshing page to ensure clean state');
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('[DeviceAuth] Error during enhanced device data clearing:', error);
      // Fallback to local clearing even if network fails
      this.clearDeviceMemory();
      this.clearBiometricCredentials();
      
      // Still refresh on error to clear any remaining state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }

  // Quick clear with immediate refresh (for UI buttons)
  async clearAllDeviceDataWithRefresh(): Promise<void> {
    await this.clearAllDeviceData();
    // clearAllDeviceData already includes refresh, but this method makes it explicit
  }

  // Enhanced browser saved passwords and autofill data clearing
  private async clearBrowserCredentials(): Promise<void> {
    try {
      // 1. Aggressively clear all form data
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        const inputs = form.querySelectorAll('input');
        inputs.forEach((input: any) => {
          // Clear value and disable autofill
          input.value = '';
          input.defaultValue = '';
          input.autocomplete = 'off';
          input.setAttribute('autocomplete', 'off');
          
          // For password fields, use new-password to prevent autofill
          if (input.type === 'password') {
            input.autocomplete = 'new-password';
            input.setAttribute('autocomplete', 'new-password');
          }
          
          // Clear validation and data attributes
          input.setCustomValidity('');
          input.removeAttribute('data-lpignore');
          input.removeAttribute('data-form-type');
        });
        
        // Reset the entire form
        form.reset();
        
        // Add anti-autofill attributes to form
        form.setAttribute('autocomplete', 'off');
        form.setAttribute('data-no-autofill', 'true');
      });

      // 2. Clear comprehensive localStorage data
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('fieldops_') || 
          key.includes('credential') || 
          key.includes('login') ||
          key.includes('password') ||
          key.includes('auth') ||
          key.includes('user') ||
          key.includes('remember')
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // 3. Clear sessionStorage completely
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }

      // 4. Clear cookies related to authentication
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.includes('auth') || name.includes('login') || name.includes('credential') || name.includes('remember')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });

      // 5. Clear IndexedDB storage more aggressively
      if ('indexedDB' in window) {
        try {
          const dbs = await indexedDB.databases();
          const deletePromises = dbs.map(db => {
            if (db.name) {
              return indexedDB.deleteDatabase(db.name);
            }
          }).filter(Boolean);
          
          await Promise.allSettled(deletePromises);
          console.log('[DeviceAuth] IndexedDB databases cleared');
        } catch (error) {
          console.log('[DeviceAuth] IndexedDB clearing not supported:', error);
        }
      }

      // 6. Clear WebSQL if available (legacy support)
      if ('openDatabase' in window) {
        try {
          const db = (window as any).openDatabase('', '', '', '');
          db.transaction((tx: any) => {
            tx.executeSql('DROP TABLE IF EXISTS credentials');
            tx.executeSql('DROP TABLE IF EXISTS auth');
          });
        } catch (error) {
          console.log('[DeviceAuth] WebSQL clearing not supported:', error);
        }
      }

      // 7. Manipulate DOM to prevent password manager detection
      setTimeout(() => {
        const inputs = document.querySelectorAll('input[type="password"], input[type="text"], input[type="email"]');
        Array.from(inputs).forEach((input: any) => {
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }, 100);

      console.log('[DeviceAuth] Enhanced browser credentials and form data cleared');
    } catch (error) {
      console.error('[DeviceAuth] Error clearing browser credentials:', error);
    }
  }

  // Check for browser saved passwords
  async detectBrowserSavedPasswords(): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        const textInputs = document.querySelectorAll('input[type="text"], input[type="email"]');
        
        let hasAutofilledData = false;
        
        const allInputs = Array.from(passwordInputs).concat(Array.from(textInputs));
        allInputs.forEach((input: any) => {
          if (input.value && input.matches && input.matches(':-webkit-autofill')) {
            hasAutofilledData = true;
          }
        });
        
        resolve(hasAutofilledData);
      }, 100);
    });
  }
}

export const deviceAuthService = new DeviceAuthService();

console.log('[DeviceAuth] Instance created, authenticateWithBiometric exists:', typeof deviceAuthService.authenticateWithBiometric);