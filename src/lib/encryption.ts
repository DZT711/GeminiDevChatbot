import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
// Ensure we use a stable encryption key derived safely from the environment secret
const ENCRYPTION_KEY = crypto.createHash('sha256')
  .update(process.env.JWT_SECRET || 'fallback-encryption-key-for-dev-123456')
  .digest();

const IV_LENGTH = 16;

/**
 * Encrypts a plain-text API key using AES-256-CBC.
 */
export function encryptKey(text: string): string {
  if (!text) return '';
  // If already encrypted, don't encrypt again
  if (text.startsWith('enc::')) return text;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return format as enc::iv:cipher
  return `enc::${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted API key back to plain-text.
 */
export function decryptKey(encryptedText: string): string {
  if (!encryptedText) return '';
  if (!encryptedText.startsWith('enc::')) {
    // Return original key if it was stored prior to encryption feature
    return encryptedText;
  }

  try {
    const parts = encryptedText.slice(5).split(':');
    if (parts.length !== 2) return encryptedText;

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt API key:', err);
    return encryptedText; // Fallback
  }
}
