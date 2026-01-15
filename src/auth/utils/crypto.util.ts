import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Encrypts a string using AES-256-GCM
 * @param text - The text to encrypt
 * @param encryptionKey - The encryption key (must be 32 bytes hex string)
 * @returns Encrypted string in format: iv:authTag:encryptedData
 */
export function encrypt(text: string, encryptionKey: string): string {
  // Convert hex key to buffer
  const key = Buffer.from(encryptionKey, 'hex');

  // Generate random IV
  const iv = randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = createCipheriv(ALGORITHM, key, iv);

  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get auth tag
  const authTag = cipher.getAuthTag();

  // Return combined format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a string encrypted with AES-256-GCM
 * @param encryptedText - The encrypted text in format: iv:authTag:encryptedData
 * @param encryptionKey - The encryption key (must be 32 bytes hex string)
 * @returns Decrypted string
 */
export function decrypt(encryptedText: string, encryptionKey: string): string {
  // Convert hex key to buffer
  const key = Buffer.from(encryptionKey, 'hex');

  // Split the encrypted text
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted text format');
  }

  // Convert hex strings to buffers
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  // Create decipher
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  // Decrypt the text
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates a random encryption key (32 bytes)
 * @returns Hex string of 32 random bytes
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}
