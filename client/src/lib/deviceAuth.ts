// Device Authentication Service
// Provides "Remember This Device" functionality with credential caching

export interface DeviceCredentials {
  deviceId: string;
  deviceName: string;
  fingerprint: string;
  username?: string;
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

  // Remember this device
  rememberDevice(username?: string): DeviceCredentials {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + DeviceAuthService.DEVICE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    
    const credentials: DeviceCredentials = {
      deviceId: this.generateDeviceId(),
      deviceName: this.getDeviceName(),
      fingerprint: this.generateDeviceFingerprint(),
      username: username,
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
  updateDeviceUsage(username?: string): void {
    const existing = this.getDeviceCredentials();
    if (!existing) return;
    
    existing.lastUsed = new Date().toISOString();
    if (username) existing.username = username;
    
    try {
      localStorage.setItem(DeviceAuthService.DEVICE_STORAGE_KEY, JSON.stringify(existing));
    } catch (error) {
      console.error('Error updating device usage:', error);
    }
  }

  // Clear device memory
  clearDeviceMemory(): void {
    try {
      localStorage.removeItem(DeviceAuthService.DEVICE_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing device memory:', error);
    }
  }

  // Check if WebAuthn is supported
  isBiometricSupported(): boolean {
    return !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);
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
            userVerification: 'required'
          },
          timeout: 60000,
          attestation: 'direct'
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
      
      const allowCredentials = stored.map(cred => ({
        id: new Uint8Array(Array.from(atob(cred.credentialId)).map(c => c.charCodeAt(0))),
        type: 'public-key' as const
      }));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          allowCredentials: allowCredentials,
          userVerification: 'required',
          timeout: 60000
        }
      }) as PublicKeyCredential;

      if (!assertion) {
        return null;
      }

      // Find matching credential
      const rawIdArray = Array.from(new Uint8Array(assertion.rawId));
      const credentialId = btoa(String.fromCharCode.apply(null, rawIdArray));
      const matchingCred = stored.find(cred => cred.credentialId === credentialId);
      
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

  // Show device memory prompt
  shouldShowRememberDevicePrompt(): boolean {
    const credentials = this.getDeviceCredentials();
    return !credentials || !credentials.isRemembered;
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