"use client";

import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { USE_EMULATOR, firebaseApp } from "./client";

let db: Firestore | null = null;

/** Hanya diimpor oleh halaman denah kursi, jadi Firestore SDK tidak membebani halaman lain. */
export function firestore(): Firestore {
  if (db) return db;
  db = getFirestore(firebaseApp());
  if (USE_EMULATOR) connectFirestoreEmulator(db, "127.0.0.1", 8080);
  return db;
}
