"use client";

import dynamic from "next/dynamic";
import { AuthProvider } from "@/features/auth/auth-provider";

// Toaster baru dibutuhkan setelah ada interaksi, jadi dimuat terpisah dari bundle awal.
const Toaster = dynamic(() => import("sonner").then((m) => m.Toaster), { ssr: false });

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          classNames: {
            toast: "!bg-surface !text-fg !border !border-line !rounded-2xl",
            description: "!text-muted",
          },
        }}
      />
    </AuthProvider>
  );
}
