/**
 * PKCS#1 形式の RSA 秘密鍵を PKCS#8 形式に変換する
 *
 * GitHub App が生成する秘密鍵は PKCS#1 形式（-----BEGIN RSA PRIVATE KEY-----）だが、
 * Cloudflare Workers 環境の universal-github-app-jwt は PKCS#8 形式のみサポートする。
 */

function base64Decode(str: string): Uint8Array {
  const binaryString = atob(str);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function base64Encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function isPKCS1Format(pem: string): boolean {
  return pem.includes('-----BEGIN RSA PRIVATE KEY-----');
}

function isPKCS8Format(pem: string): boolean {
  return pem.includes('-----BEGIN PRIVATE KEY-----');
}

function extractPKCS1Content(pem: string): Uint8Array {
  const lines = pem.split('\n');
  const base64Content = lines
    .filter(
      (line) =>
        !line.startsWith('-----BEGIN') &&
        !line.startsWith('-----END') &&
        line.trim() !== ''
    )
    .join('');
  return base64Decode(base64Content);
}

/**
 * ASN.1 DER 長さエンコーディング
 * - 0-127: 1バイト（長さそのまま）
 * - 128-255: 2バイト（0x81 + 1バイト長）
 * - 256-65535: 3バイト（0x82 + 2バイト長）
 */
function encodeDERLength(length: number): Uint8Array {
  if (length < 128) {
    return new Uint8Array([length]);
  } else if (length < 256) {
    return new Uint8Array([0x81, length]);
  } else {
    return new Uint8Array([0x82, (length >> 8) & 0xff, length & 0xff]);
  }
}

function wrapPKCS8(pkcs1Bytes: Uint8Array): Uint8Array {
  // PKCS#8 structure:
  // SEQUENCE {
  //   INTEGER 0 (version)
  //   SEQUENCE { OID rsaEncryption, NULL }
  //   OCTET STRING { <PKCS#1 key> }
  // }

  const pkcs1Length = pkcs1Bytes.length;

  // Version: INTEGER 0 = [0x02, 0x01, 0x00]
  const version = new Uint8Array([0x02, 0x01, 0x00]);

  // AlgorithmIdentifier: SEQUENCE { OID rsaEncryption, NULL }
  // OID 1.2.840.113549.1.1.1 = [0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01]
  // NULL = [0x05, 0x00]
  const algorithmIdentifier = new Uint8Array([
    0x30,
    0x0d, // SEQUENCE, length 13
    0x06,
    0x09,
    0x2a,
    0x86,
    0x48,
    0x86,
    0xf7,
    0x0d,
    0x01,
    0x01,
    0x01, // OID
    0x05,
    0x00, // NULL
  ]);

  // OCTET STRING header
  const octetStringTag = new Uint8Array([0x04]);
  const octetStringLengthBytes = encodeDERLength(pkcs1Length);

  // Calculate inner content length
  const innerContentLength =
    version.length +
    algorithmIdentifier.length +
    octetStringTag.length +
    octetStringLengthBytes.length +
    pkcs1Length;

  // Outer SEQUENCE header
  const sequenceTag = new Uint8Array([0x30]);
  const sequenceLengthBytes = encodeDERLength(innerContentLength);

  // Total length
  const totalLength =
    sequenceTag.length + sequenceLengthBytes.length + innerContentLength;

  // Build the result
  const result = new Uint8Array(totalLength);
  let offset = 0;

  // Outer SEQUENCE
  result.set(sequenceTag, offset);
  offset += sequenceTag.length;
  result.set(sequenceLengthBytes, offset);
  offset += sequenceLengthBytes.length;

  // Version
  result.set(version, offset);
  offset += version.length;

  // AlgorithmIdentifier
  result.set(algorithmIdentifier, offset);
  offset += algorithmIdentifier.length;

  // OCTET STRING tag and length
  result.set(octetStringTag, offset);
  offset += octetStringTag.length;
  result.set(octetStringLengthBytes, offset);
  offset += octetStringLengthBytes.length;

  // PKCS#1 content
  result.set(pkcs1Bytes, offset);

  return result;
}

function formatPEM(base64: string, type: string): string {
  const lines: string[] = [];
  lines.push(`-----BEGIN ${type}-----`);

  // Split into 64-character lines
  for (let i = 0; i < base64.length; i += 64) {
    lines.push(base64.slice(i, i + 64));
  }

  lines.push(`-----END ${type}-----`);
  return lines.join('\n');
}

/**
 * PKCS#1 形式の PEM を PKCS#8 形式に変換する
 * すでに PKCS#8 形式の場合はそのまま返す
 */
export function convertPKCS1ToPKCS8(pem: string): string {
  // Normalize line endings (handle escaped newlines from env vars)
  const normalizedPem = pem.replace(/\\n/g, '\n').trim();

  // Already PKCS#8 format
  if (isPKCS8Format(normalizedPem)) {
    return normalizedPem;
  }

  // Not PKCS#1 format - return as is (might be an error, but let it fail elsewhere)
  if (!isPKCS1Format(normalizedPem)) {
    return normalizedPem;
  }

  // Extract PKCS#1 content
  const pkcs1Bytes = extractPKCS1Content(normalizedPem);

  // Wrap in PKCS#8 structure
  const pkcs8Bytes = wrapPKCS8(pkcs1Bytes);

  // Encode to base64 and format as PEM
  const base64 = base64Encode(pkcs8Bytes);
  return formatPEM(base64, 'PRIVATE KEY');
}
