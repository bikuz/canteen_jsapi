import { randomBytes } from 'crypto';

export const generateCode = (length: number = 10): string => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-'; // Match nanoid's default set
  return Array.from(randomBytes(length), (byte) => chars[byte % chars.length]).join('');
};

export const generateShortId = (prefix: string, suffixlength: number = 5): string => {
  const datePrefix = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const randomSuffix = generateCode(suffixlength); // Same length as nanoid
  return `${prefix}${datePrefix}-${randomSuffix}`;
};
