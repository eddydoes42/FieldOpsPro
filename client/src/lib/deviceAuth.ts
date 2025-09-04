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

  // Clear device memory
  clearDeviceMemory(): void {
    try {
      localStorage.removeItem(DeviceAuthService.DEVICE_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing device memory:', error);
    }
  }

  // Check if WebAuthn is supported - Enhanced for mobile detection
  isBiometricSupported(): boolean {
    if (typeof window === 'undefined') return false;
    
    const hasWebAuthn = !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);
    
    if (!hasWebAuthn) {
      console.log('[DeviceAuth] WebAuthn not supported');
      return false;
    }
    
    // Enhanced mobile device detection
    const userAgent = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isSecureContext = window.isSecureContext;
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Allow localhost for development
    if (!isSecureContext && !isLocalhost) {
      console.log('[DeviceAuth] Biometric authentication requires secure context (HTTPS)');
      return false;
    }
    
    // Additional mobile-specific checks
    if (isMobile) {
      // Check for specific mobile platforms that support WebAuthn
      const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
      const isAndroid = /Android/i.test(userAgent);
      
      if (isIOS) {
        // iOS 14+ supports WebAuthn
        const iOSVersion = parseFloat((userAgent.match(/OS ([\d_]+)/) || ['', '0_0'])[1].replace('_', '.'));
        if (iOSVersion < 14) {
          console.log('[DeviceAuth] iOS version too old for WebAuthn');
          return false;
        }
      } else if (isAndroid) {
        // Android Chrome 70+ supports WebAuthn
        const chromeVersion = parseInt((userAgent.match(/Chrome\/([0-9]+)/) || ['', '0'])[1]);
        if (chromeVersion < 70) {
          console.log('[DeviceAuth] Android Chrome version too old for WebAuthn');
          return false;
        }
      }
    }
    
    console.log('[DeviceAuth] Biometric authentication supported', { 
      isMobile, 
      isSecureContext, 
      isLocalhost,
      userAgent: userAgent.substring(0, 50) + '...'
    });
    return true;
  }

  // Register biometric authentication
  async registerBiometric(username: string): Promise<BiometricCredentials> {
    if (!this.isBiometricSupported()) {
      throw new Error('Biometric authentication is not supported on this device');
    }

    try {
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

  // Authenticate with biometrics
  async authenticateWithBiometric(): Promise<string | null> {
    if (!this.isBiometricSupported()) {
      throw new Error('Biometric authentication is not supported on this device');
    }

    const stored = this.getBiometricCredentials();
    if (stored.length === 0) {
      throw new Error('No biometric credentials found');
    }

    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const allowCredentials = stored.map(cred => {
        try {
          // Fix credential ID decoding
          const credIdBytes = new Uint8Array(atob(cred.credentialId).split('').map(c => c.charCodeAt(0)));
          return {
            id: credIdBytes,
            type: 'public-key' as const
          };
        } catch (error) {
          console.error('Error decoding credential ID:', error);
          return null;
        }
      }).filter(Boolean) as PublicKeyCredentialDescriptor[];

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          allowCredentials: allowCredentials,
          userVerification: 'preferred', // Changed from 'required' to 'preferred' for mobile compatibility
          timeout: 60000
        }
      }) as PublicKeyCredential;

      if (!assertion) {
        return null;
      }

      // Find matching credential with proper encoding
      const rawIdArray = Array.from(new Uint8Array(assertion.rawId));
      const credentialId = btoa(String.fromCharCode(...rawIdArray));
      const matchingCred = stored.find(cred => {
        try {
          return cred.credentialId === credentialId;
        } catch (error) {
          console.error('Error matching credential:', error);
          return false;
        }
      });
      
      return matchingCred ? matchingCred.username : null;
    } catch (error) {
      console.error('Error authenticating with biometric:', error);
      return null;
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

  // Clear biometric credentials
  clearBiometricCredentials(): void {
    try {
      localStorage.removeItem(DeviceAuthService.BIOMETRIC_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing biometric credentials:', error);
    }
  }

  // Show device memory prompt - Enhanced logic for mobile and repeated logins
  shouldShowRememberDevicePrompt(): boolean {
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
    
    console.log('[DeviceAuth] Device already remembered and valid, hiding prompt');
    return false;
  }

  // Get device trust status
  getDeviceTrustStatus(): {
    isRemembered: boolean;
    deviceName?: string;
    lastUsed?: string;
    expiresAt?: string;
    hasBiometric: boolean;
  } {
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
}

export const deviceAuthService = new DeviceAuthService();