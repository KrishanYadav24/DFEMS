import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Vault root directory
export const VAULT_DIR = path.resolve(__dirname, '../../vault/evidence');

// Ensure base vault exists
if (!fs.existsSync(VAULT_DIR)) {
  fs.mkdirSync(VAULT_DIR, { recursive: true });
}

/**
 * Computes cryptographic SHA-256 hash from raw binary bytes (Buffer).
 * Adheres strictly to ISO 27037 / DA2 requirements: hashes actual file bytes,
 * never metadata, paths, or filenames.
 *
 * @param {Buffer} buffer - Raw file bytes
 * @returns {string} 64-character lowercase hex SHA-256 digest
 */
export function computeBytesHash(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('File content must be provided as a binary Buffer.');
  }
  return crypto.createHash('sha256').update(buffer).digest('hex').toLowerCase();
}

/**
 * Computes SHA-256 hash by streaming directly from a file on disk.
 *
 * @param {string} absolutePath
 * @returns {Promise<string>}
 */
export async function computeFileHashFromDisk(absolutePath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(absolutePath)) {
      return reject(new Error(`Evidence file not found on disk at: ${absolutePath}`));
    }
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(absolutePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex').toLowerCase()));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Securely stores an evidence file in the isolated evidence vault.
 * Computes the SHA-256 cryptographic digest before writing to disk.
 *
 * @param {Buffer} fileBuffer - Raw uploaded file bytes
 * @param {number|string} caseId - Parent case ID
 * @param {string} originalName - Original filename from seized device / intake
 * @returns {Promise<{ filePath: string, absolutePath: string, fileSize: number, sha256: string }>}
 */
export async function storeVaultFile(fileBuffer, caseId, originalName) {
  const safeCaseDir = path.join(VAULT_DIR, `case_${caseId}`);
  if (!fs.existsSync(safeCaseDir)) {
    await fs.promises.mkdir(safeCaseDir, { recursive: true });
  }

  // Compute hash strictly from file bytes
  const sha256 = computeBytesHash(fileBuffer);
  const fileSize = fileBuffer.length;

  // Sanitize filename to prevent directory traversal
  const ext = path.extname(originalName || '');
  const baseName = path.basename(originalName || 'evidence_file', ext).replace(/[^a-zA-Z0-9_-]/g, '_');
  const uniquePrefix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const storedFileName = `${baseName}_${uniquePrefix}${ext}`;
  const absolutePath = path.join(safeCaseDir, storedFileName);

  // Relative storage path for portability across environments
  const relativePath = `vault/evidence/case_${caseId}/${storedFileName}`;

  await fs.promises.writeFile(absolutePath, fileBuffer);

  return {
    filePath: relativePath,
    absolutePath,
    fileSize,
    sha256,
  };
}

/**
 * Resolves a stored relative or absolute path to an existing absolute file path in the vault.
 * Prevents directory traversal attacks.
 *
 * @param {string} storedPath
 * @returns {string} Absolute validated path
 */
export function resolveVaultPath(storedPath) {
  if (!storedPath) {
    throw new Error('No file path provided.');
  }

  // If already absolute and starts with VAULT_DIR
  if (path.isAbsolute(storedPath)) {
    const normalized = path.normalize(storedPath);
    if (!normalized.startsWith(path.normalize(VAULT_DIR))) {
      throw new Error('Access denied: File path points outside authorized evidence vault.');
    }
    return normalized;
  }

  // Resolve relative from backend directory
  const backendRoot = path.resolve(__dirname, '../../');
  const resolved = path.resolve(backendRoot, storedPath);
  const normalizedVault = path.normalize(VAULT_DIR);

  if (!resolved.startsWith(normalizedVault)) {
    throw new Error('Access denied: File path traversal attempt detected.');
  }

  return resolved;
}
