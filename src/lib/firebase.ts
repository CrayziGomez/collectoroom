// Compatibility shim for legacy Firebase imports.
// Temporary: provides minimal exports so existing imports don't break the build.
// NOTE: This does NOT connect to Firebase or emulate realtime behavior.
// Migrate callers to Prisma/Clerk/S3 and remove this file when ready.

// Intentionally permissive placeholders for `app` and `db` so imports succeed.
export const app: any = {};
export const db: any = {};

// Helper that throws a clear error for operations that require Firebase runtime.
export function unsupportedFirebaseCall(name = 'Firebase API') {
  throw new Error(`${name} was called but Firebase has been removed from this build. Migrate this caller to Prisma/Clerk/S3.`);
}

export default { app, db };
