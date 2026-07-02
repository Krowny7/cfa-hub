"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const supabase = createClient();

  return (
    <button
      type="button"
      title="Se déconnecter"
      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/[0.06] hover:text-white/70"
      onClick={async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
      }}
    >
      <LogOut size={15} />
    </button>
  );
}
