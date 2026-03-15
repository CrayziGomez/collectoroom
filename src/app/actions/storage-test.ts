'use server';

// Return configured S3/MinIO storage info for diagnostics.
export async function getStorageBuckets() {
    try {
        const bucket = process.env.S3_BUCKET || 'collectoroom';
        const endpoint = process.env.S3_ENDPOINT || null;
        return { success: true, buckets: [bucket], endpoint };
    } catch (error: any) {
        console.error('Error getting storage info:', error);
        return { success: false, message: error.message };
    }
}
