import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

type FirebaseWebConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function buildConfig(): FirebaseWebConfig {
  const apiKey = process.env.FIREBASE_API_KEY ?? "";
  const projectId = process.env.FIREBASE_PROJECT_ID ?? "";
  if (!projectId || !apiKey) {
    throw new Error("Firebase configuration is missing. Check FIREBASE_* env vars.");
  }
  return {
    apiKey,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN ?? "doodle-riot.firebaseapp.com",
    projectId,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? "doodle-riot.appspot.com",
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ?? "0",
    appId: process.env.FIREBASE_APP_ID ?? "doodle-riot",
  };
}

let app: FirebaseApp | null = null;
let fbs: Firestore | null = null;

/** Lazily initialize the Firebase app + Firestore (server-side only). */
export function getFbs(): Firestore {
  if (fbs) return fbs;
  const existing = getApps();
  app = existing.length > 0 ? existing[0] : initializeApp(buildConfig());
  fbs = getFirestore(app);
  return fbs;
}
