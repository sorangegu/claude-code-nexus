/**
 * API 密钥加密工具函数
 * 使用 Web Crypto API 提供安全的加密/解密功能
 */

// 将字符串转换为 ArrayBuffer
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(str);
  const buffer = new ArrayBuffer(uint8Array.length);
  const view = new Uint8Array(buffer);
  view.set(uint8Array);
  return buffer;
}

// 将 ArrayBuffer 转换为字符串
function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

// 将 ArrayBuffer 转换为 Base64 字符串
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// 将 Base64 字符串转换为 ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// 从密钥字符串生成 CryptoKey
async function getKey(keyString: string): Promise<CryptoKey> {
  const keyData = stringToArrayBuffer(keyString);

  // 如果密钥长度不是32字节，则进行哈希处理
  let keyBuffer: ArrayBuffer;
  if (keyData.byteLength !== 32) {
    keyBuffer = await crypto.subtle.digest("SHA-256", keyData);
  } else {
    keyBuffer = keyData;
  }

  return await crypto.subtle.importKey("raw", keyBuffer, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/**
 * 加密 API 密钥
 * @param plaintext 明文 API 密钥
 * @param keyString 加密密钥
 * @returns 加密后的 Base64 字符串（包含 IV）
 */
export async function encryptApiKey(plaintext: string, keyString: string): Promise<string> {
  try {
    const key = await getKey(keyString);
    const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCM 使用 12 字节 IV
    const plaintextBuffer = stringToArrayBuffer(plaintext);

    const encryptedBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, plaintextBuffer);

    // 将 IV 和加密数据合并
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    return arrayBufferToBase64(combined.buffer);
  } catch (error) {
    console.error("加密失败:", error);
    throw new Error("API 密钥加密失败");
  }
}

/**
 * 解密 API 密钥
 * @param encryptedData 加密的 Base64 字符串
 * @param keyString 解密密钥
 * @returns 解密后的明文 API 密钥
 */
export async function decryptApiKey(encryptedData: string, keyString: string): Promise<string> {
  try {
    const key = await getKey(keyString);
    const combinedBuffer = base64ToArrayBuffer(encryptedData);

    // 分离 IV 和加密数据
    const iv = combinedBuffer.slice(0, 12);
    const encryptedBuffer = combinedBuffer.slice(12);

    const decryptedBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, encryptedBuffer);

    return arrayBufferToString(decryptedBuffer);
  } catch (error) {
    console.error("解密失败:", error);
    throw new Error("API 密钥解密失败");
  }
}

/**
 * 为前端显示生成掩码 API 密钥
 * @param apiKey 完整的 API 密钥
 * @returns 掩码后的 API 密钥
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "*".repeat(apiKey.length);
  }

  const start = apiKey.substring(0, 4);
  const end = apiKey.substring(apiKey.length - 4);
  const middle = "*".repeat(Math.max(4, apiKey.length - 8));

  return `${start}${middle}${end}`;
}

/**
 * 生成用户专属的 API 密钥
 * @returns 随机生成的 API 密钥
 */
export function generateUserApiKey(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return "ak-" + Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
