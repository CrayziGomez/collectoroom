'use server';

import { adminStorage } from '@/lib/firebase-admin';

// This is a test function to verify that the admin SDK can access storage
export async function getStorageBuckets() {
    try {
        const [buckets] = await adminStorage.getBuckets();
        return {
            success: true,
            buckets: buckets.map(bucket => bucket.name),
        };
    } catch (error: any) {
        console.error("Error getting storage buckets:", error);
        return {
            success: false,
            message: error.message,
            error: JSON.stringify(error, null, 2), // Stringify the full error
        };
    }
}
