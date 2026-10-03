"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

/** Déconnexion puis retour à la page de connexion (aussi utilisé par le menu du profil). */
export async function signOutAndLeave() {
  await createClient().auth.signOut();
  window.location.href = "/login";
}

export function SignOutButton() {
  return (
    <button
      type="button"
      title="Se déconnecter"
      aria-label="Se déconnecter"
      className="icon-btn border-transparent bg-transparent text-muted shadow-none hover:text-white"
      onClick={signOutAndLeave}
    >
      <LogOut size={16} strokeWidth={1.9} />
    </button>
  );
}
