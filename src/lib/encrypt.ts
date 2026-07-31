import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16
const SALT = 'fashionai-instagram-salt-v1'

function getKey(): Buffer {
  const key = process.env.INSTAGRAM_ENCRYPTION_KEY
  if (!key) throw new Error('INSTAGRAM_ENCRYPTION_KEY environment variable is not set')
  // Derive a 32-byte key from the secret using scrypt
  return crypto.scryptSync(key, SALT, 32)
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string: [12-byte IV][16-byte auth tag][ciphertext]
 */
export function encrypt(text: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

/**
 * Decrypts a base64-encoded string that was encrypted with encrypt().
 */
export function decrypt(encoded: string): string {
  const key = getKey()
  const data = Buffer.from(encoded, 'base64')
  const iv = data.subarray(0, IV_LENGTH)
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = data.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
