import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Firestore,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export type SubscriptionPlan = 'free' | 'pro';
export type ActivationMethod = 'none' | 'payment' | 'redeem' | 'admin';

export interface FirestoreUserProfile {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  plan?: SubscriptionPlan;
  proActivatedAt?: number | null;
  proExpiresAt?: number | null;
  activationMethod?: ActivationMethod;
  isBanned?: boolean;
  celebrationShown?: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export const BOOTSTRAPPED_ADMIN_EMAIL = 'vidushanawood@gmail.com';
export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function normalizeUserProfile(raw: Partial<FirestoreUserProfile>, fallbackUid?: string): FirestoreUserProfile {
  return {
    uid: raw.uid || fallbackUid || '',
    email: (raw.email || '').trim().toLowerCase(),
    displayName: raw.displayName || 'Operator',
    emailVerified: Boolean(raw.emailVerified),
    plan: raw.plan === 'pro' ? 'pro' : 'free',
    proActivatedAt: typeof raw.proActivatedAt === 'number' ? raw.proActivatedAt : null,
    proExpiresAt: typeof raw.proExpiresAt === 'number' ? raw.proExpiresAt : null,
    activationMethod:
      raw.activationMethod === 'payment' ||
      raw.activationMethod === 'redeem' ||
      raw.activationMethod === 'admin'
        ? raw.activationMethod
        : 'none',
    isBanned: Boolean(raw.isBanned),
    celebrationShown: typeof raw.celebrationShown === 'boolean' ? raw.celebrationShown : true,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  };
}

interface ResolvedFirebaseConfig {
  options: FirebaseOptions;
  databaseId?: string;
  source: 'env' | 'applet-config';
}

function resolveFirebaseConfig(): ResolvedFirebaseConfig | null {
  const envApiKey = (import.meta.env.VITE_FIREBASE_API_KEY || '').trim();
  const envAuthDomain = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim();
  const envProjectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();
  const envStorageBucket = (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim();
  const envMessagingSenderId = (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim();
  const envAppId = (import.meta.env.VITE_FIREBASE_APP_ID || '').trim();
  const envDatabaseId = (import.meta.env.VITE_FIREBASE_DATABASE_ID || '').trim();

  // 1. Prefer explicit VITE_FIREBASE_* environment variables (e.g. Netlify deployment)
  if (envApiKey && envProjectId && envAppId) {
    return {
      source: 'env',
      databaseId: envDatabaseId || undefined,
      options: {
        apiKey: envApiKey,
        authDomain: envAuthDomain || `${envProjectId}.firebaseapp.com`,
        projectId: envProjectId,
        storageBucket: envStorageBucket || `${envProjectId}.firebasestorage.app`,
        messagingSenderId: envMessagingSenderId || undefined,
        appId: envAppId,
      },
    };
  }

  // 2. Fallback to provisioned firebase-applet-config.json (ignore remixed placeholder)
  const cfg = appletConfig as {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    firestoreDatabaseId?: string;
  };

  if (
    cfg &&
    cfg.apiKey &&
    cfg.projectId &&
    cfg.projectId !== 'remixed-project-id' &&
    cfg.appId
  ) {
    return {
      source: 'applet-config',
      databaseId: cfg.firestoreDatabaseId || undefined,
      options: {
        apiKey: cfg.apiKey,
        authDomain: cfg.authDomain,
        projectId: cfg.projectId,
        storageBucket: cfg.storageBucket,
        messagingSenderId: cfg.messagingSenderId,
        appId: cfg.appId,
      },
    };
  }

  return null;
}

const resolved = resolveFirebaseConfig();

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreDb: Firestore | null = null;

if (resolved) {
  try {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(resolved.options);
    firebaseAuth = getAuth(firebaseApp);
    firestoreDb = resolved.databaseId
      ? getFirestore(firebaseApp, resolved.databaseId)
      : getFirestore(firebaseApp);
  } catch (err) {
    console.error('Firebase initialization failed:', err);
    firebaseApp = null;
    firebaseAuth = null;
    firestoreDb = null;
  }
}

export const app = firebaseApp;
export const auth = firebaseAuth;
export const db = firestoreDb;
export const isFirebaseConfigured = Boolean(firebaseApp && firebaseAuth && firestoreDb);
export const firebaseProjectId = resolved?.options.projectId || null;
export const firebaseConfigSource = resolved?.source || null;

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid ?? null,
      email: auth?.currentUser?.email ?? null,
      emailVerified: auth?.currentUser?.emailVerified ?? null,
      isAnonymous: auth?.currentUser?.isAnonymous ?? null,
      tenantId: auth?.currentUser?.tenantId ?? null,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Firestore connectivity on startup
async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

/**
 * Clamp and sanitize display name strictly to blueprint constraints (1..80 chars).
 */
export function sanitizeDisplayName(rawName: string | null | undefined, email: string): string {
  const cleaned = (rawName || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (cleaned.length >= 1) return cleaned;
  const fallback = email.split('@')[0]?.replace(/\s+/g, ' ').trim().slice(0, 80) || 'Operator';
  return fallback;
}

/**
 * Persist or merge the verified user's profile in Firestore at users/{uid}.
 * Never writes plaintext passwords; preserves immutable createdAt & existing Pro/Ban state.
 */
export async function syncVerifiedUserProfile(
  user: User,
  preferredDisplayName?: string
): Promise<FirestoreUserProfile | null> {
  if (!db || !user.uid || !user.email || !user.emailVerified) {
    return null;
  }

  // Ensure the Auth ID token reflects email_verified: true before Firestore security rules check it
  try {
    await user.getIdToken(true);
  } catch {
    // Continue and let Firestore handle any token error cleanly
  }

  const uid = user.uid.trim();
  const email = user.email.trim().toLowerCase();
  const displayName = sanitizeDisplayName(preferredDisplayName || user.displayName, email);
  const path = `users/${uid}`;
  const userRef = doc(db, 'users', uid);

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (!existingSnap.exists()) {
    try {
      await setDoc(userRef, {
        uid,
        email,
        displayName,
        emailVerified: true,
        plan: 'free',
        proActivatedAt: null,
        proExpiresAt: null,
        activationMethod: 'none',
        isBanned: false,
        celebrationShown: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  } else {
    const existingData = existingSnap.data() as Partial<FirestoreUserProfile>;
    // If banned, return existing profile immediately without writing so UI can enforce suspension
    if (existingData.isBanned === true) {
      return normalizeUserProfile(existingData, uid);
    }

    const isLegacyDoc = typeof existingData.plan !== 'string';
    const isExpiredPro =
      existingData.plan === 'pro' &&
      typeof existingData.proExpiresAt === 'number' &&
      Date.now() > existingData.proExpiresAt;

    const updatePayload: Record<string, unknown> = {
      email,
      displayName,
      emailVerified: true,
      updatedAt: serverTimestamp(),
    };

    if (isLegacyDoc) {
      updatePayload.plan = 'free';
      updatePayload.proActivatedAt = null;
      updatePayload.proExpiresAt = null;
      updatePayload.activationMethod = 'none';
      updatePayload.isBanned = false;
      updatePayload.celebrationShown = true;
    } else if (isExpiredPro) {
      updatePayload.plan = 'free';
      updatePayload.proExpiresAt = null;
    }

    try {
      await setDoc(userRef, updatePayload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  try {
    const refreshed = await getDoc(userRef);
    if (refreshed.exists()) {
      return normalizeUserProfile(refreshed.data() as Partial<FirestoreUserProfile>, uid);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  return normalizeUserProfile(
    {
      uid,
      email,
      displayName,
      emailVerified: true,
      plan: 'free',
      proActivatedAt: null,
      proExpiresAt: null,
      activationMethod: 'none',
      isBanned: false,
      celebrationShown: true,
    },
    uid
  );
}

export async function fetchUserProfile(uid: string): Promise<FirestoreUserProfile | null> {
  if (!db || !uid) return null;
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? normalizeUserProfile(snap.data() as Partial<FirestoreUserProfile>, uid) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function subscribeToUserProfile(
  uid: string,
  onProfile: (profile: FirestoreUserProfile | null, exists: boolean) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db || !uid) {
    return () => {};
  }
  const path = `users/${uid}`;
  const userRef = doc(db, 'users', uid);
  return onSnapshot(
    userRef,
    (snap) => {
      if (!snap.exists()) {
        onProfile(null, false);
        return;
      }
      onProfile(normalizeUserProfile(snap.data() as Partial<FirestoreUserProfile>, uid), true);
    },
    (error) => {
      console.error(`Firestore snapshot error at ${path}:`, error);
      onError?.(error);
    }
  );
}

export function subscribeToAllUsers(
  onUsers: (users: FirestoreUserProfile[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) {
    return () => {};
  }
  const usersCol = collection(db, 'users');
  return onSnapshot(
    usersCol,
    (snapshot) => {
      const list = snapshot.docs.map((d) =>
        normalizeUserProfile(d.data() as Partial<FirestoreUserProfile>, d.id)
      );
      list.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
      onUsers(list);
    },
    (error) => {
      console.error('Firestore admin users snapshot error:', error);
      onError?.(error);
    }
  );
}

export async function activateUserPro(
  uid: string,
  method: 'payment' | 'redeem',
  durationMs: number = THIRTY_DAYS_MS
): Promise<{ proActivatedAt: number; proExpiresAt: number }> {
  if (!db || !uid) {
    throw new Error('Firebase is not initialized.');
  }
  const now = Date.now();
  const proExpiresAt = now + durationMs;
  const path = `users/${uid}`;
  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        plan: 'pro',
        proActivatedAt: now,
        proExpiresAt,
        activationMethod: method,
        isBanned: false,
        celebrationShown: false,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { proActivatedAt: now, proExpiresAt };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function downgradeExpiredUserToFree(uid: string): Promise<void> {
  if (!db || !uid) return;
  const path = `users/${uid}`;
  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        plan: 'free',
        proExpiresAt: null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markUserCelebrationShown(uid: string): Promise<void> {
  if (!db || !uid) return;
  const path = `users/${uid}`;
  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        celebrationShown: true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminSetUserPlan(
  targetUser: FirestoreUserProfile,
  targetPlan: SubscriptionPlan
): Promise<void> {
  if (!db || !targetUser.uid) return;
  const path = `users/${targetUser.uid}`;
  const now = Date.now();
  const payload =
    targetPlan === 'pro'
      ? {
          plan: 'pro' as const,
          proActivatedAt: now,
          proExpiresAt: now + THIRTY_DAYS_MS,
          activationMethod: 'admin' as const,
          isBanned: Boolean(targetUser.isBanned),
          celebrationShown: false,
          updatedAt: serverTimestamp(),
        }
      : {
          plan: 'free' as const,
          proActivatedAt: targetUser.proActivatedAt ?? null,
          proExpiresAt: null,
          activationMethod: 'none' as const,
          isBanned: Boolean(targetUser.isBanned),
          celebrationShown: true,
          updatedAt: serverTimestamp(),
        };

  try {
    await setDoc(doc(db, 'users', targetUser.uid), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminSetUserBanned(
  targetUser: FirestoreUserProfile,
  isBanned: boolean
): Promise<void> {
  if (!db || !targetUser.uid) return;
  const path = `users/${targetUser.uid}`;
  try {
    await setDoc(
      doc(db, 'users', targetUser.uid),
      {
        plan: targetUser.plan === 'pro' ? 'pro' : 'free',
        proActivatedAt: typeof targetUser.proActivatedAt === 'number' ? targetUser.proActivatedAt : null,
        proExpiresAt: typeof targetUser.proExpiresAt === 'number' ? targetUser.proExpiresAt : null,
        activationMethod: targetUser.activationMethod || 'none',
        isBanned,
        celebrationShown: typeof targetUser.celebrationShown === 'boolean' ? targetUser.celebrationShown : true,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminDeleteUserProfile(uid: string): Promise<void> {
  if (!db || !uid) return;
  const path = `users/${uid}`;
  try {
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export interface ReceiptEmailQueuePayload {
  uid: string;
  to: string;
  transactionId: string;
  planName: string;
  amountPaid: string;
  activationMethod: 'payment' | 'redeem' | 'admin';
  activationDate: string;
  expiryDate: string;
  subject: string;
  text: string;
  html: string;
}

export async function queueReceiptEmailDocument(payload: ReceiptEmailQueuePayload): Promise<void> {
  if (!db || !payload.uid || !payload.transactionId) return;
  const path = `mail/${payload.transactionId}`;
  try {
    await setDoc(doc(db, 'mail', payload.transactionId), {
      uid: payload.uid,
      to: payload.to.trim().toLowerCase(),
      transactionId: payload.transactionId,
      planName: payload.planName.slice(0, 120),
      amountPaid: payload.amountPaid.slice(0, 80),
      activationMethod: payload.activationMethod,
      activationDate: payload.activationDate.slice(0, 60),
      expiryDate: payload.expiryDate.slice(0, 60),
      message: {
        subject: payload.subject.slice(0, 160),
        text: payload.text.slice(0, 4000),
        html: payload.html.slice(0, 12000),
      },
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function mapFirebaseAuthError(error: unknown): {
  message: string;
  suggestTab?: 'signin' | 'signup';
} {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  switch (code) {
    case 'auth/email-already-in-use':
      return {
        message: 'An account with this email already exists. Switch to Sign In to log in.',
        suggestTab: 'signin',
      };
    case 'auth/invalid-email':
      return { message: 'Please enter a valid email address.' };
    case 'auth/weak-password':
      return { message: 'Password is too weak. Please use at least 6 characters.' };
    case 'auth/user-not-found':
      return {
        message: 'No account was found for this email. Switch to Sign Up to create one.',
        suggestTab: 'signup',
      };
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return {
        message: 'Invalid email or password. Please check your credentials and try again.',
      };
    case 'auth/too-many-requests':
      return {
        message: 'Too many attempts. Please wait a minute before trying again.',
      };
    case 'auth/user-disabled':
      return { message: 'This account has been disabled by an administrator.' };
    case 'auth/network-request-failed':
      return { message: 'Network error. Please check your internet connection and try again.' };
    case 'auth/operation-not-allowed':
      return {
        message:
          'Email/Password sign-in is not yet enabled in Firebase Console. Enable Authentication → Sign-in method → Email/Password in your Firebase project.',
      };
    default: {
      const rawMsg = error instanceof Error ? error.message : '';
      if (rawMsg.includes('Missing or insufficient permissions')) {
        return {
          message:
            'Your email was verified, but profile sync needs refreshed permissions. Please tap "Check Verification / Continue" once more.',
        };
      }
      return {
        message: rawMsg || 'Authentication could not be completed. Please try again.',
      };
    }
  }
}
