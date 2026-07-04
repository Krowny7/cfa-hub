"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="currentColor"
        opacity="0.2"
        d="M24 44c11.05 0 20-8.95 20-20S35.05 4 24 4 4 12.95 4 24s8.95 20 20 20Z"
      />
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
        options: { redirectTo }
      });

      if (error) throw error;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("common.error"));
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* LEFT: Value prop */}
      <section className="card order-2 p-8 lg:order-1">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs">
          <span className="h-2 w-2 rounded-full bg-blue-400/80" />
          {t("login.studyHub")}
        </div>

        <h1 className="mt-5 text-3xl font-semibold leading-tight">
          CFA Hub — <span className="opacity-80">{t("login.heroSuffix")}</span>
        </h1>

        <p className="mt-3 text-sm text-white/80">{t("login.heroDesc")}</p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className="card-soft p-4">
            <div className="text-sm font-semibold">{t("nav.library")}</div>
            <div className="mt-1 text-xs opacity-70">{t("login.libraryDesc")}</div>
          </div>

          <div className="card-soft p-4">
            <div className="text-sm font-semibold">{t("nav.flashcards")}</div>
            <div className="mt-1 text-xs opacity-70">{t("login.flashcardsDesc")}</div>
          </div>

          <div className="card-soft p-4">
            <div className="text-sm font-semibold">{t("login.quizzesTitle")}</div>
            <div className="mt-1 text-xs opacity-70">{t("login.quizzesDesc")}</div>
          </div>

          <div className="card-soft p-4">
            <div className="text-sm font-semibold">{t("login.groupsTitle")}</div>
            <div className="mt-1 text-xs opacity-70">{t("login.groupsDesc")}</div>
          </div>
        </div>

        <div className="mt-6 text-xs text-white/60">{t("login.tipStartBy")}</div>
      </section>

      {/* RIGHT: Sign in */}
      <section className="card order-1 p-8 lg:order-2">
        <h2 className="text-lg font-semibold">{t("login.signinTitle")}</h2>
        <p className="mt-2 text-sm text-white/80">{t("login.signinDesc")}</p>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy}
          className="btn mt-5 w-full bg-white text-black hover:bg-white/90"
        >
          <GoogleIcon />
          {busy ? t("login.redirecting") : t("login.googleButton")}
        </button>

        {error ? <div className="mt-3 text-sm text-red-100">{error}</div> : null}

        <div className="mt-6 card-soft p-4">
          <div className="text-sm font-semibold">{t("login.firstStepsTitle")}</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-white/80">
            <li>{t("login.step1")}</li>
            <li>{t("login.step2")}</li>
            <li>{t("login.step3")}</li>
          </ol>
        </div>

        <div className="mt-4 text-xs text-white/60">{t("login.legalNote")}</div>
      </section>
    </div>
  );
}
