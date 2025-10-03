'use server';

import { adminStorage } from '@/lib/firebase-admin';

export async function runStorageTest(): Promise<string[]> {
  const logs: string[] = [];
  logs.push('--- Starting Storage Upload Test ---');

  try {
    logs.push('[SUCCESS] Step 1: Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    logs.push(`[FAIL] Step 1: Firebase Admin SDK initialization failed. Error: ${error.message}`);
    logs.push('--- Test Aborted ---');
    return logs;
  }

  let bucket;
  try {
    bucket = adminStorage.bucket();
    logs.push(`[SUCCESS] Step 2: Storage bucket obtained. Bucket name: ${bucket.name}`);
  } catch (error: any) {
    logs.push(`[FAIL] Step 2: Failed to get storage bucket. Error: ${error.message}`);
    logs.push('--- Test Aborted ---');
    return logs;
  }

  try {
    const testFileName = `storage-test/test-upload-${Date.now()}.txt`;
    const fileRef = bucket.file(testFileName);
    const fileContents = `This is a test file uploaded at ${new Date().toISOString()}. If you see this, the upload was successful.`;
    const fileBuffer = Buffer.from(fileContents);

    logs.push(`[INFO] Step 3: Attempting to upload buffer to path: ${testFileName}`);

    await fileRef.save(fileBuffer, {
      metadata: {
        contentType: 'text/plain',
      },
    });
    logs.push('[SUCCESS] Step 4: fileRef.save() command completed without error.');

    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires: '01-01-2100',
    });
    logs.push(`[SUCCESS] Step 5: Successfully generated signed URL: ${signedUrl.substring(0, 100)}...`);

  } catch (error: any) {
    logs.push(`[FAIL] Step 3/4/5: An error occurred during file upload or URL signing. This is likely the point of failure. Error: ${error.message}`);
  }

  logs.push('--- Test Complete ---');
  return logs;
}
