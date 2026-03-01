import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

/**
 * Security service for encrypting/decrypting sensitive safety plan data
 * Uses AES-256-GCM for authenticated encryption with per-user key derivation
 */
export class EncryptionService {
  private masterKey: Buffer;

  constructor(masterKeyHex: string) {
    if (!masterKeyHex || masterKeyHex.length !== 64) {
      throw new Error('Master key must be 64 hex characters (256 bits)');
    }
    this.masterKey = Buffer.from(masterKeyHex, 'hex');
  }

  /**
   * Derive a user-specific encryption key from the master key
   * Uses PBKDF2 with user ID as salt for key derivation
   */
  private deriveUserKey(userId: string): Buffer {
    const salt = crypto.createHash('sha256').update(userId).digest();
    return crypto.pbkdf2Sync(
      this.masterKey,
      salt,
      PBKDF2_ITERATIONS,
      KEY_LENGTH,
      'sha256'
    );
  }

  /**
   * Encrypt sensitive data for a specific user
   * Returns base64-encoded string: [IV][encrypted data][auth tag]
   */
  encrypt(data: any, userId: string): string {
    try {
      const userKey = this.deriveUserKey(userId);
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, userKey, iv);

      const plaintext = JSON.stringify(data);
      const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final()
      ]);

      const authTag = cipher.getAuthTag();

      // Combine IV + encrypted data + auth tag
      const combined = Buffer.concat([iv, encrypted, authTag]);
      return combined.toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt sensitive data for a specific user
   * Expects base64-encoded string: [IV][encrypted data][auth tag]
   */
  decrypt(encryptedData: string, userId: string): any {
    try {
      const userKey = this.deriveUserKey(userId);
      const combined = Buffer.from(encryptedData, 'base64');

      // Validate minimum buffer length to prevent auth tag truncation attacks
      const minLength = IV_LENGTH + TAG_LENGTH + 1; // IV + tag + at least 1 byte of data
      if (combined.length < minLength) {
        throw new Error('Invalid encrypted data: buffer too short');
      }

      // Extract IV, encrypted data, and auth tag
      const iv = combined.subarray(0, IV_LENGTH);
      const authTag = combined.subarray(combined.length - TAG_LENGTH);
      const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);

      // Verify auth tag is exactly the expected length (prevents truncation attacks)
      if (authTag.length !== TAG_LENGTH) {
        throw new Error(`Invalid auth tag length: expected ${TAG_LENGTH}, got ${authTag.length}`);
      }

      const decipher = crypto.createDecipheriv(ALGORITHM, userKey, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Securely check if data is encrypted (without decrypting)
   */
  isEncrypted(data: string): boolean {
    try {
      const buffer = Buffer.from(data, 'base64');
      // Check if buffer has minimum required length (IV + some data + tag)
      return buffer.length >= IV_LENGTH + TAG_LENGTH + 1;
    } catch {
      return false;
    }
  }
}

// Singleton instance - initialized on first use
let encryptionService: EncryptionService | null = null;

export function getEncryptionService(): EncryptionService {
  if (!encryptionService) {
    const masterKey = process.env.SAFETY_PLAN_MASTER_KEY;
    if (!masterKey) {
      throw new Error('SAFETY_PLAN_MASTER_KEY environment variable not set');
    }
    encryptionService = new EncryptionService(masterKey);
  }
  return encryptionService;
}
