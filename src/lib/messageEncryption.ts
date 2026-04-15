import { secureLog } from './secureLogger';

let encKey: CryptoKey | null = null;

// Get or derive the encryption key
async function getEncryptionKey(): Promise<CryptoKey> {
  if (encKey) {
    return encKey;
  }

  try {
    const secret = import.meta.env.VITE_MESSAGE_ENCRYPTION_KEY || 'blackiris-default-key-2024';

    const encoder = new TextEncoder();
    const raw = encoder.encode(secret);
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      raw,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Stable salt for consistent key derivation
    const saltStr = 'blackiris-message-encryption-salt-2024';
    const encoder2 = new TextEncoder();
    const salt = encoder2.encode(saltStr).slice(0, 16);

    encKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    secureLog.debug('[Encryption] Key derived');
    return encKey;
  } catch (error) {
    secureLog.error('[Encryption] Key derivation failed', error as Error);
    throw new Error('Failed to initialize encryption');
  }
}

// Encrypt a message
export async function encryptMessage(content: string): Promise<{ encrypted: string; iv: string }> {
  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(content);

    // Random IV for each encryption
    const iv = new Uint8Array(12);
    crypto.getRandomValues(iv);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      data
    );

    const encArray = new Uint8Array(encrypted);
    const ivArray = new Uint8Array(iv);

    // Convert to base64
    const encStr = btoa(String.fromCharCode.apply(null, Array.from(encArray)));
    const ivStr = btoa(String.fromCharCode.apply(null, Array.from(ivArray)));

    secureLog.debug('[Encryption] Message encrypted');

    return { encrypted: encStr, iv: ivStr };
  } catch (error) {
    secureLog.error('[Encryption] Encryption failed', error as Error);
    throw error;
  }
}

// Decrypt a message
export async function decryptMessage(
  encryptedStr: string,
  ivStr: string
): Promise<{ content: string; verified: boolean; error?: string }> {
  try {
    const key = await getEncryptionKey();

    // Decode from base64
    const encData = new Uint8Array(
      atob(encryptedStr)
        .split('')
        .map((c) => c.charCodeAt(0))
    );
    const iv = new Uint8Array(
      atob(ivStr)
        .split('')
        .map((c) => c.charCodeAt(0))
    );

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encData
    );

    const decoder = new TextDecoder();
    const msg = decoder.decode(decrypted);

    secureLog.debug('[Encryption] Message decrypted');

    return { content: msg, verified: true };
  } catch (error) {
    secureLog.error('[Encryption] Decryption failed', error as Error);
    return {
      content: '',
      verified: false,
      error: 'Decryption failed - invalid data or key',
    };
  }
}

// Clear the encryption key from memory
export function clearEncryptionKey(): void {
  encKey = null;
  (window as any).__encryptionSalt = null;
  secureLog.debug('[Encryption] Key cleared');
}

// Generate sha256 hash of content
export function generateHash(content: string): string {
  return CryptoJS.SHA256(content).toString();
}
