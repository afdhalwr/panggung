import type { Metadata } from "next";
import { RequireAuth } from "@/features/auth/require-auth";
import { ProfileForms } from "./profile-forms";

export const metadata: Metadata = { title: "Profil", robots: { index: false } };

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileForms />
    </RequireAuth>
  );
}
