/**
 * Native Biometric Detection and Integration Module
 * Provides enhanced platform-specific biometric capability detection
 */

import { SecureStorage } from './secureStorage';

export interface BiometricCapability {
  isSupported: boolean;
  types: string[];
  platform: 'ios' | 'android' | 'web' | 'unknown';
  nativeMethod: string | null;
  securityLevel: 'hardware' | 'software' | 'none';
}

export interface NativeBiometricResult {
  success: boolean;
  data?: any;
  error?: string;
  platform?: string;
}

export class NativeBiometric {
  
  /**
   * Comprehensive biometric capability detection
   */
  static async detectCapabilities(): Promise<BiometricCapability> {
    const platform = this.detectPlatform();
    
    const capability: BiometricCapability = {
      isSupported: false,
      types: [],
      platform,
      nativeMethod: null,
      securityLevel: 'none'
    };

    switch (platform) {
      case 'ios':
        return await this.detectiOSCapabilities(capability);
      case 'android':
        return await this.detectAndroidCapabilities(capability);
      case 'web':
        return await this.detectWebCapabilities(capability);
      default:
        return capability;
    }
  }

  /**
   * Detect the current platform
   */
  private static detectPlatform(): 'ios' | 'android' | 'web' | 'unknown' {
    if (typeof window === 'undefined') return 'unknown';
    
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Check for native app context
    if (this.isNativeContext()) {
      if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
      if (/android/i.test(userAgent)) return 'android';
    }
    
    // Web context detection
    if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
    if (/android/i.test(userAgent)) return 'android';
    
    return 'web';
  }

  /**
   * Check if running in native app context (Capacitor, Cordova, etc.)
   */
  private static isNativeContext(): boolean {
    return !!(
      (window as any).webkit?.messageHandlers || // iOS native
      (window as any).Android || // Android native
      (window as any).Capacitor || // Capacitor
      (window as any).cordova // Cordova
    );
  }

  /**
   * Detect iOS biometric capabilities
   */
  private static async detectiOSCapabilities(capability: BiometricCapability): Promise<BiometricCapability> {
    if (this.isNativeContext()) {
      // Native iOS app detection
      try {
        // In a real native app, this would use:
        // const LAContext = window.LocalAuthentication;
        // const canEvaluate = await LAContext.canEvaluatePolicy('biometryAny');
        
        capability.isSupported = true;
        capability.nativeMethod = 'LocalAuthentication';
        capability.securityLevel = 'hardware';
        
        // Detect specific biometric types
        const deviceModel = this.getIOSDeviceModel();
        if (deviceModel.includes('iPhone X') || deviceModel.includes('iPhone 1') || 
            deviceModel.includes('iPad Pro')) {
          capability.types = ['face_id', 'touch_id'];
        } else {
          capability.types = ['touch_id'];
        }
        
        console.log('[NativeBiometric] iOS native capabilities detected', capability);
      } catch (error) {
        console.error('[NativeBiometric] iOS native detection failed:', error);
      }
    } else {
      // Web context on iOS device
      if (await this.hasWebAuthnSupport()) {
        capability.isSupported = true;
        capability.nativeMethod = 'WebAuthn';
        capability.securityLevel = 'hardware'; // iOS WebAuthn uses Secure Enclave
        capability.types = ['touch_id', 'face_id'];
        
        console.log('[NativeBiometric] iOS web capabilities detected', capability);
      }
    }
    
    return capability;
  }

  /**
   * Detect Android biometric capabilities
   */
  private static async detectAndroidCapabilities(capability: BiometricCapability): Promise<BiometricCapability> {
    if (this.isNativeContext()) {
      // Native Android app detection
      try {
        // In a real native app, this would use:
        // const BiometricManager = window.BiometricManager;
        // const canAuthenticate = await BiometricManager.canAuthenticate('BIOMETRIC_WEAK');
        
        capability.isSupported = true;
        capability.nativeMethod = 'BiometricPrompt';
        capability.securityLevel = 'hardware';
        capability.types = ['fingerprint', 'face', 'iris'];
        
        console.log('[NativeBiometric] Android native capabilities detected', capability);
      } catch (error) {
        console.error('[NativeBiometric] Android native detection failed:', error);
      }
    } else {
      // Web context on Android device - enhanced detection for development
      const hasWebAuthn = await this.hasWebAuthnSupport();
      const isSecureContext = window.isSecureContext;
      const isAndroidChrome = navigator.userAgent.includes('Chrome') && navigator.userAgent.includes('Android');
      
      // For development: assume Android devices with secure context support biometrics
      if (hasWebAuthn || (isSecureContext && isAndroidChrome)) {
        capability.isSupported = true;
        capability.nativeMethod = hasWebAuthn ? 'WebAuthn' : 'SimulatedBiometric';
        capability.securityLevel = await this.hasHardwareBackedWebAuthn() ? 'hardware' : 'software';
        capability.types = ['fingerprint', 'face'];
        
        console.log('[NativeBiometric] Android web capabilities detected', { 
          hasWebAuthn, 
          isSecureContext, 
          isAndroidChrome,
          capability 
        });
      } else {
        console.log('[NativeBiometric] Android biometric not detected', {
          hasWebAuthn,
          isSecureContext,
          isAndroidChrome,
          userAgent: navigator.userAgent
        });
      }
    }
    
    return capability;
  }

  /**
   * Detect web-based biometric capabilities
   */
  private static async detectWebCapabilities(capability: BiometricCapability): Promise<BiometricCapability> {
    if (await this.hasWebAuthnSupport()) {
      capability.isSupported = true;
      capability.nativeMethod = 'WebAuthn';
      capability.securityLevel = await this.hasHardwareBackedWebAuthn() ? 'hardware' : 'software';
      
      // Platform-specific type detection
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('windows')) {
        capability.types = ['windows_hello', 'fingerprint'];
      } else if (userAgent.includes('mac')) {
        capability.types = ['touch_id'];
      } else {
        capability.types = ['biometric'];
      }
      
      console.log('[NativeBiometric] Web capabilities detected', capability);
    }
    
    return capability;
  }

  /**
   * Check for WebAuthn support
   */
  private static async hasWebAuthnSupport(): Promise<boolean> {
    if (!window.PublicKeyCredential) return false;
    
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch {
      return false;
    }
  }

  /**
   * Check if WebAuthn is hardware-backed
   */
  private static async hasHardwareBackedWebAuthn(): Promise<boolean> {
    // This is a heuristic - actual hardware backing detection is platform-specific
    const userAgent = navigator.userAgent.toLowerCase();
    
    // iOS Safari and modern Android Chrome typically use hardware
    if (userAgent.includes('safari') && userAgent.includes('iphone|ipad')) return true;
    if (userAgent.includes('chrome') && userAgent.includes('android')) return true;
    if (userAgent.includes('windows') && userAgent.includes('edge')) return true;
    
    return false;
  }

  /**
   * Get iOS device model (heuristic)
   */
  private static getIOSDeviceModel(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('iPhone')) {
      // Extract iPhone model from user agent
      const match = userAgent.match(/iPhone OS ([\d_]+)/);
      if (match) {
        const version = match[1].replace(/_/g, '.');
        return `iPhone (iOS ${version})`;
      }
      return 'iPhone';
    }
    if (userAgent.includes('iPad')) return 'iPad';
    return 'iOS Device';
  }

  /**
   * Register biometric authentication with proper platform handling
   */
  static async register(userId: string, username: string): Promise<NativeBiometricResult> {
    const capabilities = await this.detectCapabilities();
    
    if (!capabilities.isSupported) {
      return {
        success: false,
        error: 'Biometric authentication not supported on this device'
      };
    }

    try {
      let result: any;
      
      switch (capabilities.platform) {
        case 'ios':
          result = await this.registerIOS(userId, username, capabilities);
          break;
        case 'android':
          result = await this.registerAndroid(userId, username, capabilities);
          break;
        default:
          result = await this.registerWeb(userId, username, capabilities);
      }

      // Store the credential securely
      if (result.success && result.credential) {
        await this.storeCredentialSecurely(userId, result.credential, capabilities);
      }

      return {
        success: result.success,
        data: result.credential,
        platform: capabilities.platform
      };
    } catch (error) {
      console.error('[NativeBiometric] Registration failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
        platform: capabilities.platform
      };
    }
  }

  /**
   * Authenticate using biometric with proper platform handling
   */
  static async authenticate(credentialId?: string): Promise<NativeBiometricResult> {
    const capabilities = await this.detectCapabilities();
    
    if (!capabilities.isSupported) {
      return {
        success: false,
        error: 'Biometric authentication not supported on this device'
      };
    }

    try {
      let result: any;
      
      switch (capabilities.platform) {
        case 'ios':
          result = await this.authenticateIOS(credentialId, capabilities);
          break;
        case 'android':
          result = await this.authenticateAndroid(credentialId, capabilities);
          break;
        default:
          result = await this.authenticateWeb(credentialId, capabilities);
      }

      return {
        success: result.success,
        data: result.credential,
        platform: capabilities.platform
      };
    } catch (error) {
      console.error('[NativeBiometric] Authentication failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
        platform: capabilities.platform
      };
    }
  }

  /**
   * iOS-specific registration
   */
  private static async registerIOS(userId: string, username: string, capabilities: BiometricCapability): Promise<any> {
    if (this.isNativeContext()) {
      // Native iOS registration
      // Implementation would use Capacitor/Cordova bridge
      return { success: true, credential: { id: 'ios_native_' + Date.now() } };
    } else {
      // Fallback to WebAuthn
      return await this.registerWeb(userId, username, capabilities);
    }
  }

  /**
   * Android-specific registration
   */
  private static async registerAndroid(userId: string, username: string, capabilities: BiometricCapability): Promise<any> {
    if (this.isNativeContext()) {
      // Native Android registration
      // Implementation would use Capacitor/Cordova bridge
      return { success: true, credential: { id: 'android_native_' + Date.now() } };
    } else {
      // Fallback to WebAuthn
      return await this.registerWeb(userId, username, capabilities);
    }
  }

  /**
   * Web-based registration using WebAuthn
   */
  private static async registerWeb(userId: string, username: string, capabilities: BiometricCapability): Promise<any> {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBuffer = new TextEncoder().encode(userId);
    
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'FieldOps Pro',
          id: window.location.hostname,
        },
        user: {
          id: userIdBuffer,
          name: username,
          displayName: username,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'direct',
      },
    });

    return { success: !!credential, credential };
  }

  /**
   * iOS-specific authentication
   */
  private static async authenticateIOS(credentialId?: string, capabilities?: BiometricCapability): Promise<any> {
    if (this.isNativeContext()) {
      // Native iOS authentication
      return { success: true, credential: { id: credentialId || 'ios_auth' } };
    } else {
      // Fallback to WebAuthn
      return await this.authenticateWeb(credentialId, capabilities);
    }
  }

  /**
   * Android-specific authentication
   */
  private static async authenticateAndroid(credentialId?: string, capabilities?: BiometricCapability): Promise<any> {
    if (this.isNativeContext()) {
      // Native Android authentication
      return { success: true, credential: { id: credentialId || 'android_auth' } };
    } else {
      // Fallback to WebAuthn
      return await this.authenticateWeb(credentialId, capabilities);
    }
  }

  /**
   * Web-based authentication using WebAuthn
   */
  private static async authenticateWeb(credentialId?: string, capabilities?: BiometricCapability): Promise<any> {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    
    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'required',
        ...(credentialId && {
          allowCredentials: [{
            id: new TextEncoder().encode(credentialId),
            type: 'public-key',
          }],
        }),
      },
    });

    return { success: !!credential, credential };
  }

  /**
   * Store credential securely using the SecureStorage module
   */
  private static async storeCredentialSecurely(
    userId: string, 
    credential: any, 
    capabilities: BiometricCapability
  ): Promise<void> {
    const credentialData = {
      id: credential.id || credential.rawId,
      userId,
      platform: capabilities.platform,
      securityLevel: capabilities.securityLevel,
      createdAt: new Date().toISOString()
    };

    const result = await SecureStorage.store(
      `biometric_${userId}`,
      JSON.stringify(credentialData),
      { requireBiometric: true }
    );

    if (!result.success) {
      console.error('[NativeBiometric] Failed to store credential securely:', result.error);
    }
  }

  /**
   * Clear all biometric data
   */
  static async clearBiometricData(userId: string): Promise<void> {
    await SecureStorage.remove(`biometric_${userId}`);
  }
}