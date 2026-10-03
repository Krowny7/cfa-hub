"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, UserRound } from "lucide-react";
import { friendlyError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { InkRing } from "@/components/ink/InkRing";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

/** Pastille d'étape : numéro, puis coche d'encre une fois faite. */
function StepMark({ n, done }: { n: number; done: boolean }) {
  return (
    <span
      aria-hidden
      className={
        "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold transition-colors " +
        (done ? "bg-white text-black" : "bg-surface-2 text-muted")
      }
    >
      {done ? <Check size={13} strokeWidth={2.8} /> : n}
    </span>
  );
}

// Première connexion : une photo et un pseudo avant d'entrer (le middleware
// y renvoie tant que le profil est incomplet).
export function OnboardingForm({
  initialUsername,
  initialAvatarUrl,
  next,
}: {
  initialUsername: string | null;
  initialAvatarUrl: string | null;
  next: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { t } = useI18n();

  const [username, setUsername] = useState(initialUsername ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [usernameSaved, setUsernameSaved] = useState(Boolean(initialUsername));

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const ready = usernameSaved && Boolean(avatarUrl);

  async function saveUsername() {
    setMsg(null);
    setBusy(true);
    try {
      const trimmed = username.trim();
      if (!USERNAME_RE.test(trimmed)) {
        throw new Error(t("settings.usernameHint"));
      }

      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Not logged in");

      const { error } = await supabase.from("profiles").update({ username: trimmed }).eq("id", user.id);
      if (error) throw error;

      setUsername(trimmed);
      setUsernameSaved(true);
    } catch (e: unknown) {
      setMsg(friendlyError(e, t("common.error")));
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar(file: File) {
    setMsg(null);
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("Not logged in");

      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${user.id}/${Date.now()}.${ext}`;

      const up = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (up.error) throw up.error;

      const pub = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = pub.data.publicUrl;

      const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      if (error) throw error;

      setAvatarUrl(publicUrl);
    } catch (e: unknown) {
      setMsg(friendlyError(e, t("common.error")));
    } finally {
      setBusy(false);
    }
  }

  function handleContinue() {
    if (!ready) {
      setMsg(
        !avatarUrl && !usernameSaved
          ? t("onboarding.missingBoth")
          : !avatarUrl
            ? t("onboarding.missingAvatar")
            : t("onboarding.missingUsername")
      );
      return;
    }
    router.push(next);
  }

  const steps = (avatarUrl ? 1 : 0) + (usernameSaved ? 1 : 0);

  return (
    <div className="mx-auto flex w-full max-w-[460px] flex-col gap-8 pt-2 md:pt-12">
      <header className="flex flex-col items-start gap-5">
        <InkRing size={44} className="rl-pop" />
        <div>
          <p className="t-eyebrow">Bienvenue</p>
          <h1 className="t-h1 rl-in mt-2.5">{t("onboarding.title")}</h1>
          <p className="t-small mt-2.5 max-w-[400px]">Une photo et un pseudo : c&apos;est ce qui te rend reconnaissable dans tes groupes et en duel.</p>
        </div>
      </header>

      <div className="card-hero flex flex-col gap-6 p-6 sm:p-7">
        {/* Étape 1 : la photo */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Ta photo de profil" className="h-16 w-16 rounded-full object-cover shadow-[var(--shadow-1)]" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-full border border-dashed border-line-2 bg-surface-2 text-muted">
                <UserRound size={22} aria-hidden />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[14px] font-semibold">
              <StepMark n={1} done={Boolean(avatarUrl)} /> {t("settings.avatarLabel")}
            </p>
            <p className="t-micro mt-1 pl-8">PNG, JPG ou WebP.</p>
          </div>
          <label className={"btn btn-secondary btn-sm shrink-0 cursor-pointer " + (busy ? "pointer-events-none opacity-45" : "")}>
            {avatarUrl ? "Changer" : "Choisir"}
            <input
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAvatar(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <div className="rule" />

        {/* Étape 2 : le pseudo */}
        <div className="grid gap-3">
          <label htmlFor="onb-username" className="flex items-center gap-2 text-[14px] font-semibold">
            <StepMark n={2} done={usernameSaved} /> {t("settings.usernameLabel")}
          </label>
          <div className="flex gap-2">
            <input
              id="onb-username"
              className="input min-w-0 flex-1"
              placeholder={t("settings.usernamePlaceholder")}
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setUsernameSaved(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !usernameSaved) void saveUsername();
              }}
              disabled={busy}
              autoComplete="nickname"
            />
            <button className="btn btn-secondary shrink-0" onClick={saveUsername} disabled={busy || usernameSaved || !username.trim()} type="button">
              {usernameSaved ? (
                <>
                  <Check size={15} aria-hidden /> Validé
                </>
              ) : busy ? (
                "…"
              ) : (
                "Valider"
              )}
            </button>
          </div>
          <p className="t-micro">3 à 24 caractères : lettres, chiffres ou _.</p>
        </div>

        {msg && (
          <p role="status" className="text-[13.5px] text-pen">
            {msg}
          </p>
        )}

        <div className="flex flex-col gap-3 border-t border-line pt-6">
          <button className="btn btn-primary btn-lg rl-press w-full" onClick={handleContinue} disabled={busy} type="button">
            {t("onboarding.continue")} <ArrowRight size={17} aria-hidden />
          </button>
          <p className="t-micro text-center">
            <span className="font-mono tabular-nums">{steps}/2</span> étapes faites
          </p>
        </div>
      </div>
    </div>
  );
}
