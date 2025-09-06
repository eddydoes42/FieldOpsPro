/**
 * Biometric authentication utility using WebAuthn API
 * Improved for production readiness and server integration
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

// ---------- Utility Functions ----------

// Base64URL encoding/decoding per WebAuthn spec
function base64UrlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4 ? '='.repeat(4 - (base64.length % 4)) : '';
  return new Uint8Array(atob(base64 + pad).split('').map(c => c.charCodeAt(0)));
}

// Check if WebAuthn is supported
export function isBiometricSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'PublicKeyCredential' in window &&
    typeof navigator.credentials?.create === 'function' &&
    typeof navigator.credentials?.get === 'function'
  );
}

// Silent check for platform authenticator availability
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  try {
    return !!(await (window.PublicKeyCredential as any)
      ?.isUserVerifyingPlatformAuthenticatorAvailable?.());
  } catch {
    return false;
  }
}

// Detect likely biometric type (fallback only)
function detectBiometricType(): 'fingerprint' | 'face' | 'unknown' {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('iphone') || ua.includes('ipad')) return 'face';
  if (ua.includes('android') || ua.includes('windows') || ua.includes('mac')) return 'fingerprint';
  return 'unknown';
}

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Browser';
}

// ---------- Registration ----------

export async function registerBiometric(userId: string, userName: string): Promise<BiometricAuthResult> {
  if (!isBiometricSupported()) {
    return { success: false, error: 'Biometric authentication not supported' };
  }

  try {
    // Fetch challenge/options from server
    const resp = await fetch(`/api/webauthn/register?userId=${encodeURIComponent(userId)}&username=${encodeURIComponent(userName)}`);
    const options = await resp.json();

    // Convert challenge & user.id from Base64URL to Uint8Array
    options.publicKey.challenge = base64UrlDecode(options.publicKey.challenge);
    options.publicKey.user.id = base64UrlDecode(options.publicKey.user.id);

    const credential = await navigator.credentials.create(options) as PublicKeyCredential;
    if (!credential) return { success: false, error: 'Failed to create credential' };

    // Send credential to server for verification
    const verificationResp = await fetch('/api/webauthn/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        attResp: {
          id: credential.id,
          rawId: base64UrlEncode(credential.rawId),
          type: credential.type,
          response: {
            attestationObject: base64UrlEncode((credential.response as AuthenticatorAttestationResponse).attestationObject),
            clientDataJSON: base64UrlEncode((credential.response as AuthenticatorAttestationResponse).clientDataJSON),
          },
        },
      }),
    });

    const verification = await verificationResp.json();
    return { success: verification.success, credential };
  } catch (error: any) {
    console.error('Biometric registration error:', error);
    return { success: false, error: mapWebAuthnError(error) };
  }
}

// ---------- Authentication ----------

export async function authenticateBiometric(userId: string): Promise<BiometricAuthResult> {
  if (!isBiometricSupported()) {
    return { success: false, error: 'Biometric authentication not supported' };
  }

  try {
    // Fetch challenge/options from server
    const resp = await fetch(`/api/webauthn/authenticate?userId=${encodeURIComponent(userId)}`);
    const options = await resp.json();

    options.publicKey.challenge = base64UrlDecode(options.publicKey.challenge);
    if (options.publicKey.allowCredentials) {
      options.publicKey.allowCredentials = options.publicKey.allowCredentials.map((cred: any) => ({
        ...cred,
        id: base64UrlDecode(cred.id),
      }));
    }

    const credential = await navigator.credentials.get(options) as PublicKeyCredential;
    if (!credential) return { success: false, error: 'Authentication failed' };

    // Send credential to server for verification
    const verificationResp = await fetch('/api/webauthn/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        authResp: {
          id: credential.id,
          rawId: base64UrlEncode(credential.rawId),
          type: credential.type,
          response: {
            authenticatorData: base64UrlEncode((credential.response as AuthenticatorAssertionResponse).authenticatorData),
            clientDataJSON: base64UrlEncode((credential.response as AuthenticatorAssertionResponse).clientDataJSON),
            signature: base64UrlEncode((credential.response as AuthenticatorAssertionResponse).signature),
            userHandle: credential.response.userHandle
              ? base64UrlEncode(credential.response.userHandle)
              : null,
          },
        },
      }),
    });

    const verification = await verificationResp.json();
    return { success: verification.success, credential };
  } catch (error: any) {
    console.error('Biometric authentication error:', error);
    return { success: false, error: mapWebAuthnError(error) };
  }
}

// ---------- Display Helper ----------

export function getCredentialDisplayInfo(credential: PublicKeyCredential): BiometricCredential {
  return {
    id: base64UrlEncode(credential.rawId),
    type: detectBiometricType(),
    name: `${detectBiometricType() === 'face' ? 'Face ID' :
           detectBiometricType() === 'fingerprint' ? 'Touch ID' : 'Biometric'} on ${getBrowserName()}`,
    createdAt: new Date(),
  };
}

// ---------- Helper Functions for Compatibility ----------

export async function getAvailableBiometricTypes(): Promise<string[]> {
  if (!isBiometricSupported()) return [];
  
  const type = detectBiometricType();
  return [type];
}

export function credentialToServerFormat(credential: PublicKeyCredential) {
  return {
    id: credential.id,
    publicKey: base64UrlEncode((credential.response as AuthenticatorAttestationResponse).attestationObject),
    attestationObject: base64UrlEncode((credential.response as AuthenticatorAttestationResponse).attestationObject),
    clientDataJSON: base64UrlEncode((credential.response as AuthenticatorAttestationResponse).clientDataJSON),
  };
}

export function authResponseToServerFormat(credential: PublicKeyCredential) {
  return {
    id: credential.id,
    rawId: base64UrlEncode(credential.rawId),
    response: {
      authenticatorData: base64UrlEncode((credential.response as AuthenticatorAssertionResponse).authenticatorData),
      clientDataJSON: base64UrlEncode((credential.response as AuthenticatorAssertionResponse).clientDataJSON),
      signature: base64UrlEncode((credential.response as AuthenticatorAssertionResponse).signature),
      userHandle: credential.response.userHandle ? base64UrlEncode(credential.response.userHandle) : null,
    },
  };
}

export function setBiometricPreference(enabled: boolean): void {
  localStorage.setItem('biometric-preference', enabled ? 'enabled' : 'disabled');
}

export function getBiometricPreference(): boolean {
  return localStorage.getItem('biometric-preference') === 'enabled';
}

export function clearBiometricData(): void {
  localStorage.removeItem('biometric-preference');
  // Clear any other biometric-related data
}

// ---------- Error Mapping ----------

function mapWebAuthnError(error: any): string {
  if (error?.name === 'NotAllowedError') return 'Authentication was cancelled or timed out';
  if (error?.name === 'InvalidStateError') return 'Credential already registered';
  if (error?.name === 'SecurityError') return 'Security constraints prevented authentication';
  return 'An unexpected error occurred during biometric authentication';
}