"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_EMULATOR === "1";

export function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(config);
}
