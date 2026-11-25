import { getApps, initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { get, getDatabase, onValue, ref, serverTimestamp, update } from 'firebase/database';
import type { SyncBackend } from '../store/syncService';

const env = import.meta.env;
const clean = (value: string | undefined): string | undefined => value?.trim() || undefined;

export const firebaseConfig: FirebaseOptions = {
  apiKey: clean(env.VITE_FIREBASE_API_KEY),
  authDomain: clean(env.VITE_FIREBASE_AUTH_DOMAIN),
  databaseURL: clean(env.VITE_FIREBASE_DATABASE_URL),
  projectId: clean(env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: clean(env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: clean(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: clean(env.VITE_FIREBASE_APP_ID),
};

export function isFirebaseConfigured(config: FirebaseOptions = firebaseConfig): boolean {
  return Boolean(config.apiKey && config.databaseURL && config.projectId && config.appId);
}

let backend: SyncBackend | null | undefined;

export function createFirebaseBackend(): SyncBackend | null {
  if (backend !== undefined) return backend;
  if (!isFirebaseConfigured()) {
    console.warn('[firebase] Missing VITE_FIREBASE_* config; running in local-only mode.');
    return (backend = null);
  }

  const app = getApps()[0] ?? initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getDatabase(app);
  let signingIn: Promise<string> | null = null;

  backend = {
    async signIn() {
      await auth.authStateReady();
      if (auth.currentUser) return auth.currentUser.uid;
      signingIn ??= signInAnonymously(auth)
        .then((cred) => cred.user.uid)
        .finally(() => {
          signingIn = null;
        });
      return signingIn;
    },
    read: async (path) => (await get(ref(db, path))).val(),
    update: (path, values) => update(ref(db, path), values),
    listen: (path, onData, onError) =>
      onValue(
        ref(db, path),
        (snap) => onData(snap.val()),
        (err) => onError(err),
      ),
    onConnectionChange: (listener) =>
      onValue(ref(db, '.info/connected'), (snap) => listener(snap.val() === true)),
    serverTimestamp: () => serverTimestamp(),
  };
  return backend;
}
