import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK (server-side only)
// Uses project ID for ID token verification — no service account needed for verifyIdToken()
function getAdminApp() {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    // If a service account key is provided (recommended for production), use it
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
            return initializeApp({
                credential: cert(serviceAccount),
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            });
        } catch (e) {
            console.warn('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY, falling back to projectId-only init');
        }
    }

    // Fallback: projectId-only init (sufficient for verifyIdToken)
    return initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
}

const adminApp = getAdminApp();
export const adminAuth = getAuth(adminApp);

/**
 * Verify a Firebase ID token and return the decoded claims.
 * Returns null if the token is invalid or expired.
 */
export async function verifyIdToken(idToken) {
    if (!idToken) return null;
    try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        return decoded;
    } catch (error) {
        console.error('ID token verification failed:', error.message);
        return null;
    }
}
