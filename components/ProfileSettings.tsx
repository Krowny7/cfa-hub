"use client";

import { useEffect, useMemo, useState } from "react";
import { Crop, UserRound } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { SceauPerso } from "@/components/adn/SceauPerso";
import { RecadragePhoto } from "@/components/ui/RecadragePhoto";
import { enregistrerPhotoProfil } from "@/lib/profil/photo";
import type { PhotoRecadree } from "@/lib/profil/recadrage";

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
  // ce qu'on recadre : le fichier qui vient d'être choisi, ou l'adresse de la photo actuelle
  const [aRecadrer, setARecadrer] = useState<File | string | null>(null);

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

  // La photo recadrée (RecadragePhoto) part à la place de l'original ; en cas
  // d'échec, l'erreur remonte à la fenêtre, qui reste ouverte.
  async function envoyerPhoto(photo: PhotoRecadree) {
    setMsg(null);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) throw new Error("Not logged in");
    setAvatarUrl(await enregistrerPhotoProfil(supabase, user.id, photo));
    setMsg(t("settings.updated"));
  }

  return (
    <div className="card flex flex-col gap-5 p-[22px]">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-muted">
        <UserRound size={15} aria-hidden />
        {t("settings.profileTitle")}
      </h3>

      {/* Photo */}
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Ta photo de profil" className="h-16 w-16 shrink-0 rounded-full object-cover shadow-[var(--shadow-1)]" />
        ) : (
          // Sans photo, ton sceau d'initiales en tient lieu (la photo est facultative).
          <SceauPerso nom={username || null} taille={64} className="shrink-0" title="Ton sceau" />
        )}
        <div className="min-w-0">
          <div className="text-[14px] font-semibold">{t("settings.avatarLabel")}</div>
          <div className="mt-0.5 text-[12.5px] text-muted">{t("settings.avatarHint")}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className={"btn btn-secondary min-h-[36px] cursor-pointer text-[13px] " + (loading || busy ? "pointer-events-none opacity-45" : "")}>
              {avatarUrl ? "Changer de photo" : "Ajouter une photo (facultatif)"}
              <input
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={loading || busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setARecadrer(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            {avatarUrl && (
              <button type="button" className="btn btn-ghost min-h-[36px] text-[13px]" disabled={loading || busy} onClick={() => setARecadrer(avatarUrl)}>
                <Crop size={14} aria-hidden /> Recadrer
              </button>
            )}
          </div>
        </div>
      </div>

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

      <RecadragePhoto source={aRecadrer} onValider={envoyerPhoto} onFermer={() => setARecadrer(null)} />
    </div>
  );
}
