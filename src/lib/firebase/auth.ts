"use client";

import type { Auth } from "firebase/auth";

let authPromise: Promise<Auth> | null = null;

/**
 * Firebase Auth (dan firebase/app) dimuat secara lazy lewat dynamic import, supaya SDK-nya
 * tidak ikut bundle awal halaman publik seperti beranda dan detail konser.
 */
export function getFirebaseAuth(): Promise<Auth> {
  authPromise ??= Promise.all([import("./client"), import("firebase/auth")]).then(
    ([{ firebaseApp, USE_EMULATOR }, { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, connectAuthEmulator }]) => {
      // Tanpa popupRedirectResolver: tidak memuat skrip apis.google.com yang hanya perlu untuk login popup.
      const auth = initializeAuth(firebaseApp(), { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
      if (USE_EMULATOR) connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      return auth;
    },
  );
  return authPromise;
}
