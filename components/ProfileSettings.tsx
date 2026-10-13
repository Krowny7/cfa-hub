"use client";

import { useEffect, useMemo, useState } from "react";
import { UserRound } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { PhotoProfil } from "@/components/profil/PhotoProfil";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

// Réglages du profil : photo (bucket « avatars ») et pseudo.
export function ProfileSettings() {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth.user;
        if (!user) return;

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("username,avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;

        const p = profile as { username: string | null; avatar_url: string | null } | null;
        setUsername(p?.username ?? "");
        setAvatarUrl(p?.avatar_url ?? null);
      } catch (e: unknown) {
        setMsg(`${friendlyError(e, t("common.error"))}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase, t]);

  async function saveUsername() {
    setMsg(null);
    setBusy(true);
    try {
      const next = username.trim();
      if (!USERNAME_RE.test(next)) {
        throw new Error(t("settings.usernameHint"));
      }

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Not logged in");

      const { error } = await supabase.from("profiles").update({ username: next }).eq("id", user.id);
      if (error) throw error;

      setMsg(t("settings.updated"));
    } catch (e: unknown) {
      setMsg(`${friendlyError(e, t("common.error"))}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-col gap-5 p-[22px]">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-muted">
        <UserRound size={15} aria-hidden />
        {t("settings.profileTitle")}
      </h3>

      {/* Photo (recadrage et envoi : components/profil/PhotoProfil) */}
      <PhotoProfil
        avatarUrl={avatarUrl}
        nom={username || null}
        disabled={loading || busy}
        onEnregistre={(url) => {
          setAvatarUrl(url);
          setMsg(t("settings.updated"));
        }}
      />

      <div className="border-t border-line" />

      {/* Pseudo */}
      <div>
        <label htmlFor="rl-username" className="text-[14px] font-semibold">
          {t("settings.usernameLabel")}
        </label>
        <div className="mt-0.5 text-[12.5px] text-muted">{t("settings.usernameHint")}</div>
        <div className="mt-3 flex gap-2">
          <input
            id="rl-username"
            className="input flex-1"
            placeholder={t("settings.usernamePlaceholder")}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading || busy}
          />
          <button className="btn btn-primary shrink-0" onClick={saveUsername} disabled={loading || busy} type="button">
            {busy ? "…" : t("settings.update")}
          </button>
        </div>
      </div>

      {msg && (
        <div role="status" className="text-[13px] font-medium">
          {msg}
        </div>
      )}
    </div>
  );
}
