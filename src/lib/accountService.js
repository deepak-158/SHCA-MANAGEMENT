import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Secondary app instance used only for creating new user accounts
// This prevents the admin from being signed out when creating accounts
function getSecondaryApp() {
    const existing = getApps().find(app => app.name === 'accountCreator');
    if (existing) return existing;
    return initializeApp(firebaseConfig, 'accountCreator');
}

/**
 * Create a Firebase Auth account and a Firestore user document.
 * Uses a secondary Firebase app so the current admin session is unaffected.
 *
 * @param {string} email - Login email for the new user
 * @param {string} password - Temporary password
 * @param {object} userData - { name, role, mustChangePassword, ... }
 * @returns {{ uid: string }} The created user's UID
 */
export async function createUserAccount(email, password, userData) {
    const secondaryApp = getSecondaryApp();
    const secondaryAuth = getAuth(secondaryApp);

    // Create the Firebase Auth account
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = credential.user.uid;

    // Sign out from the secondary instance (cleanup)
    await secondaryAuth.signOut();

    // Create the Firestore user document (used for role checking on login)
    await setDoc(doc(db, 'users', uid), {
        ...userData,
        email,
        uid,
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
    });

    return { uid };
}
