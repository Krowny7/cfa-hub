"use client";

import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";

export function SignOutButton() {
  const supabase = createClient();
  const { t } = useI18n();

  return (
    <button
      className="whitespace-nowrap rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
      type="button"
      onClick={async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
      }}
    >
      {t("auth.logout")}
    </button>
  );
}
