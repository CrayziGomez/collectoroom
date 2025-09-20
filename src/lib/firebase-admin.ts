
import * as admin from 'firebase-admin';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

export function initFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return;
  }

  if (!serviceAccount) {
    throw new Error(
      'Firebase service account credentials are not set in the environment variables.'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}
