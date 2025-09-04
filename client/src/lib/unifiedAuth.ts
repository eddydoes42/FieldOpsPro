// Unified Authentication Service
// Connects biometric, device memory, and credential flows

import { deviceAuthService } from './deviceAuth';

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  method: 'biometric' | 'stored' | 'manual';
  credentials?: AuthCredentials;
  error?: string;
}

class UnifiedAuthService {
  
  // Attempt automatic login using available methods
  async attemptAutoLogin(): Promise<AuthResult> {
    console.log('[UnifiedAuth] Attempting automatic login...');
    
    // 1. Try biometric authentication first (if available and set up)
    if (deviceAuthService.isBiometricSupported()) {
      const biometricCredentials = deviceAuthService.getBiometricCredentials();
      if (biometricCredentials.length > 0) {
        console.log('[UnifiedAuth] Attempting biometric login...');
        try {
          const username = await deviceAuthService.authenticateWithBiometric();
          if (username) {
            // Get stored credentials for the authenticated user
            const storedCreds = deviceAuthService.getStoredCredentials();
            if (storedCreds && storedCreds.username === username) {
              return {
                success: true,
                method: 'biometric',
                credentials: storedCreds
              };
            }
            return {
              success: true,
              method: 'biometric',
              credentials: { username, password: '' } // Password would need to be handled separately
            };
          }
        } catch (error) {
          console.log('[UnifiedAuth] Biometric login failed, trying stored credentials...');
        }
      }
    }
    
    // 2. Try stored credentials if biometric fails or isn't available
    const storedCredentials = deviceAuthService.getStoredCredentials();
    if (storedCredentials) {
      console.log('[UnifiedAuth] Using stored credentials...');
      return {
        success: true,
        method: 'stored',
        credentials: storedCredentials
      };
    }
    
    // 3. No automatic login available
    console.log('[UnifiedAuth] No automatic login methods available');
    return {
      success: false,
      method: 'manual',
      error: 'No saved authentication methods available'
    };
  }
  
  // Check if any form of automatic login is available
  hasAutoLoginCapabilities(): boolean {
    // Check biometric availability
    const hasBiometric = deviceAuthService.isBiometricSupported() && 
                        deviceAuthService.getBiometricCredentials().length > 0;
    
    // Check stored credentials
    const hasStoredCreds = deviceAuthService.hasStoredCredentials();
    
    return hasBiometric || hasStoredCreds;
  }
  
  // Get auto-login status for UI display
  getAutoLoginStatus(): {
    hasBiometric: boolean;
    hasStoredCredentials: boolean;
    isDeviceRemembered: boolean;
    deviceName: string;
  } {
    const trustStatus = deviceAuthService.getDeviceTrustStatus();
    
    return {
      hasBiometric: deviceAuthService.isBiometricSupported() && trustStatus.hasBiometric,
      hasStoredCredentials: deviceAuthService.hasStoredCredentials(),
      isDeviceRemembered: trustStatus.isRemembered,
      deviceName: trustStatus.deviceName || 'This Device'
    };
  }
  
  // Save successful login for future use
  async saveSuccessfulLogin(credentials: AuthCredentials, enableBiometric: boolean = false): Promise<void> {
    try {
      // Always save device credentials for autofill
      deviceAuthService.rememberDevice(credentials.username, credentials.password);
      
      // Set up biometric if requested
      if (enableBiometric && deviceAuthService.isBiometricSupported()) {
        try {
          await deviceAuthService.registerBiometric(credentials.username);
          console.log('[UnifiedAuth] Biometric authentication set up successfully');
        } catch (biometricError) {
          console.error('[UnifiedAuth] Failed to set up biometric authentication:', biometricError);
          throw new Error('Failed to set up biometric authentication');
        }
      }
      
      console.log('[UnifiedAuth] Login credentials saved successfully');
    } catch (error) {
      console.error('[UnifiedAuth] Failed to save login credentials:', error);
      throw error;
    }
  }
  
  // Clear all saved authentication data
  clearSavedAuth(): void {
    deviceAuthService.clearDeviceMemory();
    deviceAuthService.clearBiometricCredentials();
    console.log('[UnifiedAuth] All saved authentication data cleared');
  }
  
  // Check if we should show the device memory prompt
  shouldShowDevicePrompt(): boolean {
    return deviceAuthService.shouldShowRememberDevicePrompt();
  }
}

export const unifiedAuthService = new UnifiedAuthService();