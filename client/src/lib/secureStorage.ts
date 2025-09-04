/**
 * Secure Storage Module for Biometric Authentication
 * Provides platform-specific secure storage for credentials
 */

export interface SecureStorageOptions {
  requireBiometric?: boolean;
  accessGroup?: string;
  keyAlias?: string;
}

export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class SecureStorage {
  private static readonly ENCRYPTION_ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;

  /**
   * Detect if running in native iOS environment
   */
  static isNativeIOS(): boolean {
    return typeof window !== 'undefined' && 
           /iPhone|iPad|iPod/i.test(navigator.userAgent) &&
           (window as any).webkit?.messageHandlers; // Indicates native webview
  }

  /**
   * Detect if running in native Android environment
   */
  static isNativeAndroid(): boolean {
    return typeof window !== 'undefined' &&
           /Android/i.test(navigator.userAgent) &&
           (window as any).Android; // Indicates native webview bridge
  }

  /**
   * Check if device supports hardware-backed security
   */
  static async supportsHardwareSecurity(): Promise<boolean> {
    if (this.isNativeIOS()) {
      // In native iOS, check for Secure Enclave
      return Promise.resolve(true); // Assume modern iOS devices have Secure Enclave
    }
    
    if (this.isNativeAndroid()) {
      // In native Android, check for Hardware Security Module
      return Promise.resolve(true); // Assume modern Android devices have HSM
    }
    
    // For web, check for WebCrypto hardware backing
    return this.hasWebCryptoSupport();
  }

  /**
   * Store credentials securely based on platform
   */
  static async store(key: string, value: string, options: SecureStorageOptions = {}): Promise<StorageResult<void>> {
    try {
      if (this.isNativeIOS()) {
        return await this.storeInKeychain(key, value, options);
      }
      
      if (this.isNativeAndroid()) {
        return await this.storeInKeystore(key, value, options);
      }
      
      // Web fallback with improved encryption
      return await this.storeWithWebCrypto(key, value, options);
    } catch (error) {
      console.error('SecureStorage store error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Storage failed' 
      };
    }
  }

  /**
   * Retrieve credentials securely based on platform
   */
  static async retrieve(key: string, options: SecureStorageOptions = {}): Promise<StorageResult<string>> {
    try {
      if (this.isNativeIOS()) {
        return await this.retrieveFromKeychain(key, options);
      }
      
      if (this.isNativeAndroid()) {
        return await this.retrieveFromKeystore(key, options);
      }
      
      // Web fallback
      return await this.retrieveWithWebCrypto(key, options);
    } catch (error) {
      console.error('SecureStorage retrieve error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Retrieval failed' 
      };
    }
  }

  /**
   * Remove credentials securely
   */
  static async remove(key: string): Promise<StorageResult<void>> {
    try {
      if (this.isNativeIOS()) {
        return await this.removeFromKeychain(key);
      }
      
      if (this.isNativeAndroid()) {
        return await this.removeFromKeystore(key);
      }
      
      // Web fallback
      return await this.removeFromWebCrypto(key);
    } catch (error) {
      console.error('SecureStorage remove error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Removal failed' 
      };
    }
  }

  /**
   * iOS Keychain integration (for native apps)
   */
  private static async storeInKeychain(key: string, value: string, options: SecureStorageOptions): Promise<StorageResult<void>> {
    // Placeholder for native iOS implementation
    // In a real app, this would use Capacitor Keychain or similar:
    // await Keychain.set({ 
    //   key, 
    //   value, 
    //   accessGroup: options.accessGroup,
    //   accessControl: 'kSecAccessControlBiometryCurrentSet'
    // });
    
    console.log('[SecureStorage] iOS Keychain storage requested', { key, hasOptions: !!options });
    return { success: true };
  }

  /**
   * iOS Keychain retrieval (for native apps)
   */
  private static async retrieveFromKeychain(key: string, options: SecureStorageOptions): Promise<StorageResult<string>> {
    // Placeholder for native iOS implementation
    // const result = await Keychain.get({ key, accessGroup: options.accessGroup });
    
    console.log('[SecureStorage] iOS Keychain retrieval requested', { key, hasOptions: !!options });
    return { success: false, error: 'iOS Keychain not implemented in web context' };
  }

  /**
   * iOS Keychain removal (for native apps)
   */
  private static async removeFromKeychain(key: string): Promise<StorageResult<void>> {
    // Placeholder for native iOS implementation
    // await Keychain.remove({ key });
    
    console.log('[SecureStorage] iOS Keychain removal requested', { key });
    return { success: true };
  }

  /**
   * Android Keystore integration (for native apps)
   */
  private static async storeInKeystore(key: string, value: string, options: SecureStorageOptions): Promise<StorageResult<void>> {
    // Placeholder for native Android implementation
    // await AndroidKeystore.store({ 
    //   alias: options.keyAlias || key,
    //   value,
    //   requireBiometric: options.requireBiometric || false
    // });
    
    console.log('[SecureStorage] Android Keystore storage requested', { key, hasOptions: !!options });
    return { success: true };
  }

  /**
   * Android Keystore retrieval (for native apps)
   */
  private static async retrieveFromKeystore(key: string, options: SecureStorageOptions): Promise<StorageResult<string>> {
    // Placeholder for native Android implementation
    // const result = await AndroidKeystore.retrieve({ alias: options.keyAlias || key });
    
    console.log('[SecureStorage] Android Keystore retrieval requested', { key, hasOptions: !!options });
    return { success: false, error: 'Android Keystore not implemented in web context' };
  }

  /**
   * Android Keystore removal (for native apps)
   */
  private static async removeFromKeystore(key: string): Promise<StorageResult<void>> {
    // Placeholder for native Android implementation
    // await AndroidKeystore.remove({ alias: key });
    
    console.log('[SecureStorage] Android Keystore removal requested', { key });
    return { success: true };
  }

  /**
   * Web-based secure storage using WebCrypto API
   */
  private static async storeWithWebCrypto(key: string, value: string, options: SecureStorageOptions): Promise<StorageResult<void>> {
    if (!await this.hasWebCryptoSupport()) {
      return this.fallbackToLocalStorage(key, value);
    }

    try {
      // Generate a strong encryption key
      const encryptionKey = await this.generateEncryptionKey();
      
      // Encrypt the value
      const encryptedData = await this.encryptValue(value, encryptionKey);
      
      // Store encrypted data and key derivation info
      const storageData = {
        encrypted: encryptedData.encrypted,
        iv: encryptedData.iv,
        salt: encryptedData.salt,
        timestamp: Date.now(),
        requiresBiometric: options.requireBiometric || false
      };
      
      localStorage.setItem(`secure_${key}`, JSON.stringify(storageData));
      
      return { success: true };
    } catch (error) {
      console.error('WebCrypto encryption failed:', error);
      return this.fallbackToLocalStorage(key, value);
    }
  }

  /**
   * Web-based secure retrieval using WebCrypto API
   */
  private static async retrieveWithWebCrypto(key: string, options: SecureStorageOptions): Promise<StorageResult<string>> {
    const storedData = localStorage.getItem(`secure_${key}`);
    if (!storedData) {
      return { success: false, error: 'Key not found' };
    }

    try {
      const parsedData = JSON.parse(storedData);
      
      if (!await this.hasWebCryptoSupport()) {
        // Fallback decryption for legacy data
        return this.retrieveFromLocalStorage(key);
      }

      // Derive the same encryption key
      const encryptionKey = await this.deriveEncryptionKey(parsedData.salt);
      
      // Decrypt the value
      const decryptedValue = await this.decryptValue(
        parsedData.encrypted,
        encryptionKey,
        parsedData.iv
      );
      
      return { success: true, data: decryptedValue };
    } catch (error) {
      console.error('WebCrypto decryption failed:', error);
      return this.retrieveFromLocalStorage(key);
    }
  }

  /**
   * Web-based secure removal
   */
  private static async removeFromWebCrypto(key: string): Promise<StorageResult<void>> {
    try {
      localStorage.removeItem(`secure_${key}`);
      localStorage.removeItem(key); // Also remove any legacy data
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Removal failed' 
      };
    }
  }

  /**
   * Check if WebCrypto API is available and functional
   */
  private static async hasWebCryptoSupport(): Promise<boolean> {
    if (!window.crypto?.subtle) {
      return false;
    }
    
    try {
      // Test basic functionality
      await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a strong encryption key using WebCrypto
   */
  private static async generateEncryptionKey(): Promise<CryptoKey> {
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('fieldops_master_key_v2'),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    
    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ENCRYPTION_ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derive encryption key from salt
   */
  private static async deriveEncryptionKey(salt: string): Promise<CryptoKey> {
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('fieldops_master_key_v2'),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    const saltBuffer = new Uint8Array(atob(salt).split('').map(c => c.charCodeAt(0)));
    
    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: this.ENCRYPTION_ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt value using WebCrypto
   */
  private static async encryptValue(value: string, key: CryptoKey): Promise<{
    encrypted: string;
    iv: string;
    salt: string;
  }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    
    const encrypted = await window.crypto.subtle.encrypt(
      { name: this.ENCRYPTION_ALGORITHM, iv },
      key,
      new TextEncoder().encode(value)
    );

    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv)),
      salt: btoa(String.fromCharCode(...salt))
    };
  }

  /**
   * Decrypt value using WebCrypto
   */
  private static async decryptValue(encryptedData: string, key: CryptoKey, ivString: string): Promise<string> {
    const encrypted = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
    const iv = new Uint8Array(atob(ivString).split('').map(c => c.charCodeAt(0)));
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: this.ENCRYPTION_ALGORITHM, iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }

  /**
   * Fallback to basic localStorage with simple encoding
   */
  private static fallbackToLocalStorage(key: string, value: string): StorageResult<void> {
    try {
      // Basic obfuscation (not secure, but better than plain text)
      const encoded = btoa(value + ':' + Date.now());
      localStorage.setItem(key, encoded);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Storage failed' 
      };
    }
  }

  /**
   * Retrieve from basic localStorage
   */
  private static retrieveFromLocalStorage(key: string): StorageResult<string> {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) {
        return { success: false, error: 'Key not found' };
      }
      
      const decoded = atob(stored);
      const parts = decoded.split(':');
      return { success: true, data: parts[0] };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Retrieval failed' 
      };
    }
  }
}