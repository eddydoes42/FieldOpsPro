/**
 * Biometric authentication utility using WebAuthn API
 */

export interface BiometricCredential {
  id: string;
  type: 'fingerprint' | 'face' | 'unknown';
  name: string;
  createdAt: Date;
}

export interface BiometricAuthResult {
  success: boolean;
  credential?: PublicKeyCredential;
  error?: string;
}

// Check if biometric authentication is supported
export function isBiometricSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'navigator' in window &&
    'credentials' in navigator &&
    'create' in navigator.credentials &&
    'get' in navigator.credentials &&
    typeof navigator.credentials.create === 'function' &&
    typeof navigator.credentials.get === 'function'
  );
}

// Check what types of biometric authentication are available
export async function getAvailableBiometricTypes(): Promise<string[]> {
  if (!isBiometricSupported()) {
    return [];
  }

  try {
    // Check if platform authenticator is available (built-in biometrics)
    const available = await (navigator.credentials as any).get({
      publicKey: {
        challenge: new Uint8Array(32),
        timeout: 1000,
        userVerification: 'required',
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required'
        }
      }
    }).catch(() => null);
    
    const types: string[] = [];
    
    // Most platform authenticators support multiple types
    if (available || await isPlatformAuthenticatorAvailable()) {
      // Check user agent for hints about biometric types
      const userAgent = navigator.userAgent.toLowerCase();
      
      if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        types.push('face', 'fingerprint');
      } else if (userAgent.includes('android')) {
        types.push('fingerprint', 'face');
      } else if (userAgent.includes('windows')) {
        types.push('fingerprint', 'face');
      } else if (userAgent.includes('mac')) {
        types.push('fingerprint');
      } else {
        types.push('biometric');
      }
    }
    
    return types;
  } catch {
    return [];
  }
}

// Check if platform authenticator is available
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isBiometricSupported()) {
    return false;
  }

  try {
    const available = await (window.PublicKeyCredential as any)?.isUserVerifyingPlatformAuthenticatorAvailable?.();
    return Boolean(available);
  } catch {
    return false;
  }
}

// Generate challenge for authentication
function generateChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

// Convert string to Uint8Array
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Convert Uint8Array to base64
function uint8ArrayToBase64(buffer: Uint8Array): string {
  return btoa(String.fromCharCode.apply(null, Array.from(buffer)));
}

// Convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  return new Uint8Array(atob(base64).split('').map(char => char.charCodeAt(0)));
}

// Register a new biometric credential
export async function registerBiometric(userId: string, userName: string): Promise<BiometricAuthResult> {
  if (!isBiometricSupported()) {
    return { success: false, error: 'Biometric authentication not supported' };
  }

  try {
    const challenge = generateChallenge();
    const userIdBuffer = stringToUint8Array(userId);
    
    const createCredentialOptions: CredentialCreationOptions = {
      publicKey: {
        challenge,
        rp: {
          name: 'FieldOps Pro',
          id: window.location.hostname,
        },
        user: {
          id: userIdBuffer,
          name: userName,
          displayName: userName,
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
    };

    const credential = await navigator.credentials.create(createCredentialOptions) as PublicKeyCredential;
    
    if (!credential) {
      return { success: false, error: 'Failed to create credential' };
    }

    return { success: true, credential };
  } catch (error: any) {
    console.error('Biometric registration error:', error);
    return { 
      success: false, 
      error: error.name === 'NotAllowedError' 
        ? 'User cancelled biometric registration'
        : 'Failed to register biometric authentication'
    };
  }
}

// Authenticate using biometric
export async function authenticateBiometric(credentialId?: string): Promise<BiometricAuthResult> {
  if (!isBiometricSupported()) {
    return { success: false, error: 'Biometric authentication not supported' };
  }

  try {
    const challenge = generateChallenge();
    
    const getCredentialOptions: CredentialRequestOptions = {
      publicKey: {
        challenge,
        timeout: 60000,
        userVerification: 'required',
        ...(credentialId && {
          allowCredentials: [{
            id: base64ToUint8Array(credentialId),
            type: 'public-key',
          }],
        }),
      },
    };

    const credential = await navigator.credentials.get(getCredentialOptions) as PublicKeyCredential;
    
    if (!credential) {
      return { success: false, error: 'Authentication failed' };
    }

    return { success: true, credential };
  } catch (error: any) {
    console.error('Biometric authentication error:', error);
    return { 
      success: false, 
      error: error.name === 'NotAllowedError' 
        ? 'User cancelled biometric authentication'
        : 'Biometric authentication failed'
    };
  }
}

// Get credential info for UI display
export function getCredentialDisplayInfo(credential: PublicKeyCredential): BiometricCredential {
  const id = uint8ArrayToBase64(new Uint8Array(credential.rawId));
  
  // Try to determine biometric type from user agent
  const userAgent = navigator.userAgent.toLowerCase();
  let type: 'fingerprint' | 'face' | 'unknown' = 'unknown';
  
  if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
    type = 'face'; // Face ID is more common on iOS
  } else if (userAgent.includes('android') || userAgent.includes('windows') || userAgent.includes('mac')) {
    type = 'fingerprint'; // Touch ID / fingerprint more common
  }
  
  return {
    id,
    type,
    name: `${type === 'face' ? 'Face ID' : type === 'fingerprint' ? 'Touch ID' : 'Biometric'} on ${getBrowserName()}`,
    createdAt: new Date(),
  };
}

// Get browser name for display
function getBrowserName(): string {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  
  return 'Browser';
}

// Convert credential to format for server storage
export function credentialToServerFormat(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAttestationResponse;
  
  return {
    id: uint8ArrayToBase64(new Uint8Array(credential.rawId)),
    publicKey: uint8ArrayToBase64(new Uint8Array(response.getPublicKey()!)),
    attestationObject: uint8ArrayToBase64(new Uint8Array(response.attestationObject)),
    clientDataJSON: uint8ArrayToBase64(new Uint8Array(response.clientDataJSON)),
  };
}

// Convert authentication response to format for server verification
export function authResponseToServerFormat(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAssertionResponse;
  
  return {
    id: uint8ArrayToBase64(new Uint8Array(credential.rawId)),
    authenticatorData: uint8ArrayToBase64(new Uint8Array(response.authenticatorData)),
    clientDataJSON: uint8ArrayToBase64(new Uint8Array(response.clientDataJSON)),
    signature: uint8ArrayToBase64(new Uint8Array(response.signature)),
    userHandle: response.userHandle ? uint8ArrayToBase64(new Uint8Array(response.userHandle)) : null,
  };
}

// Store biometric preference locally
export function setBiometricPreference(enabled: boolean): void {
  try {
    localStorage.setItem('biometric_enabled', enabled.toString());
  } catch {
    // Silently fail if localStorage is not available
  }
}

// Get biometric preference
export function getBiometricPreference(): boolean {
  try {
    return localStorage.getItem('biometric_enabled') === 'true';
  } catch {
    return false;
  }
}

// Clear biometric data
export function clearBiometricData(): void {
  try {
    localStorage.removeItem('biometric_enabled');
    localStorage.removeItem('biometric_credentials');
  } catch {
    // Silently fail if localStorage is not available
  }
}
