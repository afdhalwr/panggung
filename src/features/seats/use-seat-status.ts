"use client";

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { firebase } from "@/lib/firebase/client";
import type { InventoryDoc, SeatDoc } from "@/lib/schemas";

/** Dengarkan status kursi dan kuota festival suatu event secara real-time. */
export function useSeatStatus(eventId: string) {
  const [seats, setSeats] = useState<Map<string, SeatDoc>>(new Map());
  const [inventory, setInventory] = useState<Map<string, InventoryDoc>>(new Map());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const { db } = firebase();
    const unsubSeats = onSnapshot(
      query(collection(db, "seats"), where("eventId", "==", eventId)),
      (snap) => {
        setSeats(new Map(snap.docs.map((d) => [(d.data() as SeatDoc).seatId, d.data() as SeatDoc])));
        setReady(true);
        setError(false);
      },
      () => setError(true),
    );
    const unsubInv = onSnapshot(
      query(collection(db, "inventory"), where("eventId", "==", eventId)),
      (snap) => setInventory(new Map(snap.docs.map((d) => [(d.data() as InventoryDoc).categoryId, d.data() as InventoryDoc]))),
      () => setError(true),
    );
    return () => {
      unsubSeats();
      unsubInv();
    };
  }, [eventId]);

  // Hold yang kedaluwarsa harus tampil tersedia lagi walau tidak ada perubahan dokumen.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  return { seats, inventory, ready, error, now };
}
