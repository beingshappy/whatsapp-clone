// Generate a random key for encryption
export const generateEncryptionKey = async (): Promise<string> => {
  const key = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
  const exported = await window.crypto.subtle.exportKey("raw", key)
  return Array.from(new Uint8Array(exported))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Encrypt a message using AES-256-GCM
export const encryptMessage = async (message: string, keyHex: string): Promise<string> => {
  try {
    // Convert hex key to Uint8Array
    const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))

    // Import the key
    const key = await window.crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"])

    // Generate random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12))

    // Encrypt the message
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data)

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)

    // Convert to hex string
    return Array.from(combined)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  } catch (error) {
    console.error("[v0] Encryption error:", error)
    return message // Fallback to unencrypted
  }
}

// Decrypt a message using AES-256-GCM
export const decryptMessage = async (encryptedHex: string, keyHex: string): Promise<string> => {
  try {
    // Convert hex strings to Uint8Array
    const encryptedBytes = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))
    const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g)!.map((byte) => Number.parseInt(byte, 16)))

    // Extract IV (first 12 bytes) and encrypted data
    const iv = encryptedBytes.slice(0, 12)
    const encrypted = encryptedBytes.slice(12)

    // Import the key
    const key = await window.crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["decrypt"])

    // Decrypt the message
    const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted)

    // Convert to string
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    console.error("[v0] Decryption error:", error)
    return encryptedHex // Return as-is if decryption fails
  }
}

// Hash a string using SHA-256
export const hashString = async (str: string): Promise<string> => {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Generate a secure random token
export const generateSecureToken = (): string => {
  const array = new Uint8Array(32)
  window.crypto.getRandomValues(array)
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
