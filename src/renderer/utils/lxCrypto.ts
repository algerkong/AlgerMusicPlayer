/**
 * 落雪音乐加密工具
 * 实现 lx.utils.crypto API
 *
 * 提供 MD5、AES、RSA 等加密功能
 */

import CryptoJS from 'crypto-js';
import { JSEncrypt } from 'jsencrypt';

/**
 * MD5 哈希
 */
export const md5 = (str: string): string => {
  return CryptoJS.MD5(str).toString();
};

/**
 * Uint8Array 转 WordArray
 */
const u8ToWordArray = (u8: Uint8Array): CryptoJS.lib.WordArray => {
  const words: number[] = [];
  for (let i = 0; i < u8.length; i += 4) {
    words.push(
      ((u8[i] || 0) << 24) | ((u8[i + 1] || 0) << 16) | ((u8[i + 2] || 0) << 8) | (u8[i + 3] || 0)
    );
  }
  return CryptoJS.lib.WordArray.create(words, u8.length);
};

/**
 * key/iv 归一化：脚本可能传字符串、Buffer（Uint8Array）或 WordArray，
 * ECB 模式下 iv 还可能是 null/undefined
 */
const toKeyWordArray = (
  input: string | Uint8Array | CryptoJS.lib.WordArray | null | undefined
): CryptoJS.lib.WordArray | undefined => {
  if (input == null) return undefined;
  if (typeof input === 'string') return CryptoJS.enc.Utf8.parse(input);
  if (input instanceof Uint8Array) return u8ToWordArray(input);
  return input;
};

/**
 * 生成随机字节（返回16进制字符串）
 */
export const randomBytes = (size: number): string => {
  const array = new Uint8Array(size);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * AES 加密
 *
 * @param buffer - 要加密的数据（字符串或 Buffer）
 * @param mode - 加密模式（如 'cbc'）
 * @param key - 密钥（字符串或 WordArray）
 * @param iv - 初始化向量（字符串或 WordArray）
 * @returns 加密后的 Buffer（Uint8Array）
 */
export const aesEncrypt = (
  buffer: string | Uint8Array,
  mode: string,
  key: string | Uint8Array | CryptoJS.lib.WordArray,
  iv?: string | Uint8Array | CryptoJS.lib.WordArray | null
): Uint8Array => {
  try {
    // 将输入转换为 WordArray
    let wordArray: CryptoJS.lib.WordArray;
    if (typeof buffer === 'string') {
      wordArray = CryptoJS.enc.Utf8.parse(buffer);
    } else {
      // Uint8Array 转 WordArray
      const words: number[] = [];
      for (let i = 0; i < buffer.length; i += 4) {
        words.push(
          ((buffer[i] || 0) << 24) |
            ((buffer[i + 1] || 0) << 16) |
            ((buffer[i + 2] || 0) << 8) |
            (buffer[i + 3] || 0)
        );
      }
      wordArray = CryptoJS.lib.WordArray.create(words, buffer.length);
    }

    // 处理密钥和 IV
    const keyWordArray = toKeyWordArray(key)!;
    const ivWordArray = toKeyWordArray(iv);

    // 根据模式选择加密方式
    const modeObj = getModeFromString(mode);

    // 执行加密
    const encrypted = CryptoJS.AES.encrypt(wordArray, keyWordArray, {
      iv: ivWordArray,
      mode: modeObj,
      padding: CryptoJS.pad.Pkcs7
    });

    // 将结果转换为 Uint8Array
    const ciphertext = encrypted.ciphertext;
    const result = new Uint8Array(ciphertext.words.length * 4);
    for (let i = 0; i < ciphertext.words.length; i++) {
      const word = ciphertext.words[i];
      result[i * 4] = (word >>> 24) & 0xff;
      result[i * 4 + 1] = (word >>> 16) & 0xff;
      result[i * 4 + 2] = (word >>> 8) & 0xff;
      result[i * 4 + 3] = word & 0xff;
    }

    return result.slice(0, ciphertext.sigBytes);
  } catch (error) {
    console.error('[lxCrypto] AES 加密失败:', error);
    throw error;
  }
};

/**
 * AES 解密
 */
export const aesDecrypt = (
  buffer: Uint8Array,
  mode: string,
  key: string | Uint8Array | CryptoJS.lib.WordArray,
  iv?: string | Uint8Array | CryptoJS.lib.WordArray | null
): Uint8Array => {
  try {
    // Uint8Array 转 WordArray
    const words: number[] = [];
    for (let i = 0; i < buffer.length; i += 4) {
      words.push(
        ((buffer[i] || 0) << 24) |
          ((buffer[i + 1] || 0) << 16) |
          ((buffer[i + 2] || 0) << 8) |
          (buffer[i + 3] || 0)
      );
    }
    const ciphertext = CryptoJS.lib.WordArray.create(words, buffer.length);

    // 处理密钥和 IV
    const keyWordArray = toKeyWordArray(key)!;
    const ivWordArray = toKeyWordArray(iv);

    // 根据模式选择解密方式
    const modeObj = getModeFromString(mode);

    // 构造加密对象
    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext
    });

    // 执行解密
    const decrypted = CryptoJS.AES.decrypt(cipherParams, keyWordArray, {
      iv: ivWordArray,
      mode: modeObj,
      padding: CryptoJS.pad.Pkcs7
    });

    // 转换为 Uint8Array
    const result = new Uint8Array(decrypted.words.length * 4);
    for (let i = 0; i < decrypted.words.length; i++) {
      const word = decrypted.words[i];
      result[i * 4] = (word >>> 24) & 0xff;
      result[i * 4 + 1] = (word >>> 16) & 0xff;
      result[i * 4 + 2] = (word >>> 8) & 0xff;
      result[i * 4 + 3] = word & 0xff;
    }

    return result.slice(0, decrypted.sigBytes);
  } catch (error) {
    console.error('[lxCrypto] AES 解密失败:', error);
    throw error;
  }
};

/**
 * RSA 加密
 *
 * @param buffer - 要加密的数据
 * @param publicKey - RSA 公钥（PEM 格式）
 * @returns 加密后的数据（Uint8Array）
 */
export const rsaEncrypt = (buffer: string | Uint8Array, publicKey: string): Uint8Array => {
  try {
    const encrypt = new JSEncrypt();
    encrypt.setPublicKey(publicKey);

    // 转换输入为字符串
    let input: string;
    if (typeof buffer === 'string') {
      input = buffer;
    } else {
      // Uint8Array 转字符串
      input = new TextDecoder().decode(buffer);
    }

    // 执行加密（返回 base64）
    const encrypted = encrypt.encrypt(input);
    if (!encrypted) {
      throw new Error('RSA encryption failed');
    }

    // Base64 解码为 Uint8Array
    const binaryString = atob(encrypted);
    const result = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      result[i] = binaryString.charCodeAt(i);
    }

    return result;
  } catch (error) {
    console.error('[lxCrypto] RSA 加密失败:', error);
    throw error;
  }
};

/**
 * RSA 解密
 */
export const rsaDecrypt = (buffer: Uint8Array, privateKey: string): Uint8Array => {
  try {
    const decrypt = new JSEncrypt();
    decrypt.setPrivateKey(privateKey);

    // Uint8Array 转 Base64
    let binaryString = '';
    for (let i = 0; i < buffer.length; i++) {
      binaryString += String.fromCharCode(buffer[i]);
    }
    const base64 = btoa(binaryString);

    // 执行解密
    const decrypted = decrypt.decrypt(base64);
    if (!decrypted) {
      throw new Error('RSA decryption failed');
    }

    // 字符串转 Uint8Array
    return new TextEncoder().encode(decrypted);
  } catch (error) {
    console.error('[lxCrypto] RSA 解密失败:', error);
    throw error;
  }
};

/**
 * 从字符串获取加密模式
 * 兼容 Node 风格的完整算法名（如 'aes-128-ecb'、'aes-128-cbc'），
 * 落雪脚本传入的 mode 与 Node crypto.createCipheriv 一致
 */
const getModeFromString = (mode: string): CryptoJS.lib.Mode => {
  const modeStr = mode.toLowerCase().split('-').pop() || mode.toLowerCase();
  switch (modeStr) {
    case 'cbc':
      return CryptoJS.mode.CBC;
    case 'cfb':
      return CryptoJS.mode.CFB;
    case 'ctr':
      return CryptoJS.mode.CTR;
    case 'ofb':
      return CryptoJS.mode.OFB;
    case 'ecb':
      return CryptoJS.mode.ECB;
    default:
      console.warn(`[lxCrypto] 未知的加密模式: ${mode}, 使用 CBC`);
      return CryptoJS.mode.CBC;
  }
};

/**
 * SHA1 哈希
 */
export const sha1 = (str: string): string => {
  return CryptoJS.SHA1(str).toString();
};

/**
 * SHA256 哈希
 */
export const sha256 = (str: string): string => {
  return CryptoJS.SHA256(str).toString();
};

/**
 * Base64 编码
 */
export const base64Encode = (data: string | Uint8Array): string => {
  if (typeof data === 'string') {
    return btoa(data);
  } else {
    let binary = '';
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i]);
    }
    return btoa(binary);
  }
};

/**
 * Base64 解码
 */
export const base64Decode = (str: string): Uint8Array => {
  const binaryString = atob(str);
  const result = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    result[i] = binaryString.charCodeAt(i);
  }
  return result;
};
