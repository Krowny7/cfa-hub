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
  const { locale } = useI18n();

  const isFr = locale === "fr";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setError(null);
    setBusy(true);
    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback`
          : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo
        }
      });

      if (error) throw error;
      // Redirection gérée par Supabase OAuth.
    } catch (e: any) {
      setError(e?.message ?? (isFr ? "Erreur de connexion." : "Login error."));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT - Hero */}
        <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs opacity-90">
            <span className="h-2 w-2 rounded-full bg-white/60" />
            {isFr ? "Espace d’étude centralisé" : "Centralized study hub"}
          </div>

          <h1 className="mt-4 text-3xl font-semibold leading-tight">
            {isFr ? (
              <>
                CFA Hub —{" "}
                <span className="opacity-80">
                  flashcards, PDFs et QCM au même endroit.
                </span>
              </>
            ) : (
              <>
                CFA Hub —{" "}
                <span className="opacity-80">
                  flashcards, PDFs & quizzes in one place.
                </span>
              </>
            )}
          </h1>

          <p className="mt-3 text-sm opacity-70">
            {isFr
              ? "Connecte-toi pour retrouver tes sets, partager avec tes groupes et suivre ton ELO."
              : "Sign in to access your sets, share with groups, and track your ELO."}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm font-semibold">
                {isFr ? "Organisation" : "Organization"}
              </div>
              <div className="mt-1 text-xs opacity-70">
                {isFr
                  ? "Dossiers, visibilité (privé/groupe/public), recherche."
                  : "Folders, visibility (private/group/public), search."}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm font-semibold">
                {isFr ? "Apprentissage" : "Learning"}
              </div>
              <div className="mt-1 text-xs opacity-70">
                {isFr
                  ? "Flashcards rapides, PDFs, QCM avec correction."
                  : "Fast flashcards, PDFs, quizzes with feedback."}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm font-semibold">{isFr ? "Groupes" : "Groups"}</div>
              <div className="mt-1 text-xs opacity-70">
                {isFr
                  ? "Partage multi-groupes, contrôle via RLS."
                  : "Multi-group sharing, enforced by RLS."}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm font-semibold">{isFr ? "Progression" : "Progress"}</div>
              <div className="mt-1 text-xs opacity-70">
                {isFr
                  ? "ELO + historique des tentatives."
                  : "ELO + attempt history."}
              </div>
            </div>
          </div>

          <div className="mt-6 text-xs opacity-60">
            {isFr
              ? "Sécurité : authentification via Google, et accès contrôlé côté base de données."
              : "Security: Google authentication, database-level access control."}
          </div>
        </section>

        {/* RIGHT - Login Card */}
        <section className="rounded-2xl border border-white/10 p-8">
          <h2 className="text-xl font-semibold">{isFr ? "Connexion" : "Sign in"}</h2>
          <p className="mt-2 text-sm opacity-70">
            {isFr
              ? "Connecte-toi avec Google pour accéder à ton espace."
              : "Sign in with Google to access your workspace."}
          </p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={busy}
            className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-50"
          >
            <GoogleIcon />
            {busy
              ? isFr
                ? "Connexion…"
                : "Signing in…"
              : isFr
                ? "Se connecter avec Google"
                : "Continue with Google"}
          </button>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs opacity-75">
            <div className="font-semibold opacity-90">{isFr ? "Astuce dev" : "Dev tip"}</div>
            <div className="mt-1">
              {isFr ? (
                <>
                  En local, ajoute cette URL dans <span className="font-mono">Redirect URLs</span> Supabase :{" "}
                  <span className="font-mono opacity-90">http://localhost:3000/auth/callback</span>
                </>
              ) : (
                <>
                  Locally, add this URL in Supabase <span className="font-mono">Redirect URLs</span>:{" "}
                  <span className="font-mono opacity-90">http://localhost:3000/auth/callback</span>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}