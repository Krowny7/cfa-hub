"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/browser";

export function SignOutButton() {
  const supabase = createClient();

  return (
    <button
      type="button"
      title="Se déconnecter"
      aria-label="Se déconnecter"
      className="rl-press grid h-[38px] w-[38px] place-items-center rounded-[12px] text-muted hover:bg-surface-2 hover:text-white"
      onClick={async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
      }}
    >
      <LogOut size={16} />
    </button>
  );
}
