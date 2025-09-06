import { Router } from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { 
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';
import { storage } from './storage';
import { nanoid } from 'nanoid';

const router = Router();

// Configuration for WebAuthn
const rpName = 'FieldOps Pro';
const rpID = process.env.NODE_ENV === 'production' 
  ? process.env.REPLIT_DOMAIN?.replace('https://', '') || 'localhost'
  : 'localhost';
const origin = process.env.NODE_ENV === 'production'
  ? `https://${rpID}`
  : `http://localhost:5000`;

// Base64URL helper functions
function base64UrlEncode(buffer: Uint8Array): string {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  str = (str + '===').slice(0, str.length + (str.length % 4));
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  return new Uint8Array(Buffer.from(str, 'base64'));
}

// Registration Challenge Generation
router.get('/register', async (req, res) => {
  try {
    const { userId, username } = req.query;
    
    if (!userId || !username) {
      return res.status(400).json({ error: 'Missing userId or username' });
    }

    // Get existing credentials for this user
    const existingCredentials = await storage.getWebAuthnCredentials(userId as string);
    
    const excludeCredentials = existingCredentials.map(cred => ({
      id: base64UrlDecode(cred.credentialId),
      type: 'public-key' as const,
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: userId as string,
      userName: username as string,
      userDisplayName: username as string,
      excludeCredentials,
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      supportedAlgorithmIDs: [-7, -257], // ES256, RS256
    });

    // Store challenge temporarily (you might want to use Redis in production)
    req.session.challenge = options.challenge;
    req.session.userId = userId;

    // Convert challenge to base64url for client
    const clientOptions = {
      ...options,
      publicKey: {
        ...options,
        challenge: base64UrlEncode(new Uint8Array(Buffer.from(options.challenge, 'base64'))),
        user: {
          ...options.user,
          id: base64UrlEncode(new Uint8Array(Buffer.from(options.user.id))),
        },
      },
    };

    res.json({ publicKey: clientOptions });
  } catch (error) {
    console.error('WebAuthn registration generation error:', error);
    res.status(500).json({ error: 'Failed to generate registration options' });
  }
});

// Registration Verification
router.post('/register', async (req, res) => {
  try {
    const { userId, attResp } = req.body;
    const expectedChallenge = req.session.challenge;
    
    if (!expectedChallenge || req.session.userId !== userId) {
      return res.status(400).json({ error: 'Invalid session or challenge' });
    }

    const verification = await verifyRegistrationResponse({
      response: attResp as RegistrationResponseJSON,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
      
      // Store the credential
      await storage.saveWebAuthnCredential({
        userId,
        credentialId: base64UrlEncode(credentialID),
        publicKey: base64UrlEncode(credentialPublicKey),
        counter,
        deviceType: 'platform',
        backedUp: false,
        transports: attResp.response.transports || [],
        credentialName: `${getBrowserName(req.headers['user-agent'] || '')} Biometric`,
        isActive: true,
      });

      // Clear session data
      delete req.session.challenge;
      delete req.session.userId;

      res.json({ success: true, verified: true });
    } else {
      res.json({ success: false, error: 'Verification failed' });
    }
  } catch (error) {
    console.error('WebAuthn registration verification error:', error);
    res.status(500).json({ error: 'Registration verification failed' });
  }
});

// Authentication Challenge Generation
router.get('/authenticate', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Get user's credentials
    const userCredentials = await storage.getWebAuthnCredentials(userId as string);
    
    if (userCredentials.length === 0) {
      return res.status(404).json({ error: 'No credentials found for user' });
    }

    const allowCredentials = userCredentials
      .filter(cred => cred.isActive)
      .map(cred => ({
        id: base64UrlDecode(cred.credentialId),
        type: 'public-key' as const,
        transports: cred.transports as AuthenticatorTransport[],
      }));

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'required',
    });

    // Store challenge
    req.session.challenge = options.challenge;
    req.session.userId = userId;

    // Convert for client
    const clientOptions = {
      ...options,
      publicKey: {
        ...options,
        challenge: base64UrlEncode(new Uint8Array(Buffer.from(options.challenge, 'base64'))),
        allowCredentials: options.allowCredentials?.map(cred => ({
          ...cred,
          id: base64UrlEncode(cred.id),
        })),
      },
    };

    res.json({ publicKey: clientOptions });
  } catch (error) {
    console.error('WebAuthn authentication generation error:', error);
    res.status(500).json({ error: 'Failed to generate authentication options' });
  }
});

// Authentication Verification
router.post('/authenticate', async (req, res) => {
  try {
    const { userId, authResp } = req.body;
    const expectedChallenge = req.session.challenge;
    
    if (!expectedChallenge || req.session.userId !== userId) {
      return res.status(400).json({ error: 'Invalid session or challenge' });
    }

    // Get the credential from database
    const credential = await storage.getWebAuthnCredentialById(authResp.id);
    
    if (!credential || !credential.isActive) {
      return res.status(404).json({ error: 'Credential not found or inactive' });
    }

    const verification = await verifyAuthenticationResponse({
      response: authResp as AuthenticationResponseJSON,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: base64UrlDecode(credential.credentialId),
        credentialPublicKey: base64UrlDecode(credential.publicKey),
        counter: credential.counter,
      },
      requireUserVerification: true,
    });

    if (verification.verified) {
      // Update counter
      await storage.updateWebAuthnCredentialCounter(
        credential.id, 
        verification.authenticationInfo.newCounter
      );

      // Update last used
      await storage.updateWebAuthnCredentialLastUsed(credential.id);

      // Clear session
      delete req.session.challenge;
      delete req.session.userId;

      res.json({ success: true, verified: true });
    } else {
      res.json({ success: false, error: 'Authentication failed' });
    }
  } catch (error) {
    console.error('WebAuthn authentication verification error:', error);
    res.status(500).json({ error: 'Authentication verification failed' });
  }
});

// Helper function to detect browser name
function getBrowserName(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Browser';
}

export default router;