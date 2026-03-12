/**
 * Storage Service - S3-compatible
 * Replaces Firebase Cloud Storage
 *
 * Works with any S3-compatible service:
 * - MinIO (local dev)
 * - AWS S3
 * - Cloudflare R2
 * - Backblaze B2
 * - DigitalOcean Spaces
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Singleton S3 client
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      forcePathStyle: true, // Required for MinIO
    });
  }
  return s3Client;
}

const BUCKET = process.env.S3_BUCKET || 'collectoroom';

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a file to storage
 */
export async function uploadFile(
  file: Buffer | Uint8Array,
  path: string,
  contentType: string
): Promise<UploadResult> {
  const client = getS3Client();

  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: path,
    Body: file,
    ContentType: contentType,
  }));

  // Generate public URL
  const publicUrl = process.env.S3_PUBLIC_URL
    ? `${process.env.S3_PUBLIC_URL}/${path}`
    : await getSignedUrl(client, new GetObjectCommand({
        Bucket: BUCKET,
        Key: path,
      }), { expiresIn: 60 * 60 * 24 * 365 * 10 }); // 10 years

  return {
    url: publicUrl,
    path,
  };
}

/**
 * Upload an image with auto-generated unique filename
 */
export async function uploadImage(
  file: File,
  basePath: string
): Promise<UploadResult> {
  const extension = file.name.split('.').pop() || 'jpg';
  const filename = `${uuidv4()}.${extension}`;
  const path = `${basePath}/${filename}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  return uploadFile(buffer, path, file.type);
}

/**
 * Upload a card image
 */
export async function uploadCardImage(
  file: File,
  userId: string,
  collectionId: string,
  cardId: string
): Promise<UploadResult> {
  const basePath = `users/${userId}/cards/${cardId}`;
  return uploadImage(file, basePath);
}

/**
 * Upload a site content image (hero, etc.)
 */
export async function uploadSiteImage(
  file: File,
  type: 'hero' | 'content'
): Promise<UploadResult> {
  const basePath = `site-content/${type}`;
  return uploadImage(file, basePath);
}

/**
 * Delete a file from storage
 */
export async function deleteFile(path: string): Promise<void> {
  const client = getS3Client();

  try {
    await client.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: path,
    }));
  } catch (error: any) {
    // Ignore "not found" errors
    if (error.name !== 'NoSuchKey') {
      throw error;
    }
  }
}

/**
 * Delete multiple files
 */
export async function deleteFiles(paths: string[]): Promise<void> {
  await Promise.all(paths.map(path => deleteFile(path)));
}

/**
 * Check if a file exists
 */
export async function fileExists(path: string): Promise<boolean> {
  const client = getS3Client();

  try {
    await client.send(new HeadObjectCommand({
      Bucket: BUCKET,
      Key: path,
    }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a signed URL for private file access
 */
export async function getSignedDownloadUrl(
  path: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getS3Client();

  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: path,
    }),
    { expiresIn }
  );
}
