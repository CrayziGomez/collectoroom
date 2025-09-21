
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';

let adminApp: App;

if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
    adminApp = initializeApp({
        credential: cert(serviceAccount)
    });
} else {
    adminApp = getApps()[0];
}

export { adminApp };
