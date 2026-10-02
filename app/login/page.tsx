"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { InkRing } from "@/components/ink/InkRing";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#fff" d="M24 44c11.05 0 20-8.95 20-20S35.05 4 24 4 4 12.95 4 24s8.95 20 20 20Z" />
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.651 32.657 29.2 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.06 0 5.842 1.154 7.962 3.038l5.657-5.657C34.915 6.053 29.69 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917Z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691 12.88 19.51C14.567 15.33 18.656 12 24 12c3.06 0 5.842 1.154 7.962 3.038l5.657-5.657C34.915 6.053 29.69 4 24 4c-7.682 0-14.39 4.33-17.694 10.691Z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.58 0 10.692-2.144 14.543-5.643l-6.713-5.68C29.86 34.246 27.04 35.2 24 35.2c-5.17 0-9.602-3.317-11.273-7.92l-6.53 5.03C9.46 39.556 16.19 44 24 44Z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.8 2.537-2.42 4.69-4.673 6.12l.003-.002 6.713 5.68C36.87 40.23 44 35 44 24c0-1.341-.138-2.651-.389-3.917Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setError(null);
    setBusy(true);

    try {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) throw error;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("common.error"));
      setBusy(false);
    }
  }

  const features = [
    { title: t("nav.library"), desc: t("login.libraryDesc") },
    { title: t("login.entrainementTitle"), desc: t("login.entrainementDesc") },
    { title: t("login.groupsTitle"), desc: t("login.groupsDesc") },
  ];

  return (
    <div className="grid gap-7 md:ml-[calc((100%-min(1120px,calc(100vw-4rem)))/2)] md:w-[min(1120px,calc(100vw-4rem))] lg:grid-cols-[1.35fr_1fr]">
      {/* La planche « encre » : l'anneau, le nom, les annotations */}
      <section className="card order-2 grid gap-7 p-7 md:p-9 lg:order-1">
        <span className="panel-label w-fit">{t("login.studyHub")}</span>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <InkRing size={124} className="rl-deco shrink-0" title="Ranked Lobby" />
          <div>
            <h1 className="rl-hero font-display text-[46px] leading-[0.95] tracking-tight md:text-[50px]">
              RANKED
              <br />
              LOBBY
            </h1>
            <p className="note mt-4 text-white/75">le savoir se conquiert.</p>
            <p className="note mt-1 pl-5 text-white/60">→ {t("login.heroSuffix")}</p>
          </div>
        </div>

        <p className="max-w-[60ch] text-[15px] leading-relaxed text-white/80">{t("login.heroDesc")}</p>

        <div className="grid gap-4 border-t-2 border-white pt-5 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title}>
              <div className="kicker mb-1.5">{f.title}</div>
              <div className="text-[13px] leading-relaxed text-white/70">{f.desc}</div>
            </div>
          ))}
        </div>

        <p className="note text-white/60">{t("login.tipStartBy")}</p>
      </section>

      {/* Connexion */}
      <section className="card order-1 grid content-start gap-5 self-start p-7 md:p-9 lg:order-2">
        <h2 className="font-display text-[30px] leading-none">{t("login.signinTitle")}</h2>
        <p className="text-sm text-white/80">{t("login.signinDesc")}</p>

        <button type="button" onClick={signInWithGoogle} disabled={busy} className="btn btn-primary w-full py-3.5 text-[15px]">
          <GoogleIcon />
          {busy ? t("login.redirecting") : t("login.googleButton")}
        </button>

        {error ? <div className="text-sm font-bold text-red-500">{error}</div> : null}

        <div className="card-soft p-4">
          <div className="kicker mb-2">{t("login.firstStepsTitle")}</div>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-white/80">
            <li>{t("login.step1")}</li>
            <li>{t("login.step2")}</li>
            <li>{t("login.step3")}</li>
          </ol>
        </div>

        <div className="text-xs text-white/60">{t("login.legalNote")}</div>
      </section>
    </div>
  );
}
