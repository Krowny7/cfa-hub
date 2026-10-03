"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useI18n } from "@/components/I18nProvider";
import { BookOpen, Target, Trophy, User } from "lucide-react";
import { InkRing } from "@/components/ink/InkRing";
import { PageHero } from "@/components/ui/Titles";
import { RankBadge } from "@/components/ui/RankBadge";
import { TIERS } from "@/lib/ranks";
import { DOMAINS } from "@/lib/domains";

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

  const spaces = [
    { Icon: BookOpen, title: "Réviser", desc: "Fiches, cours complets avec audio, flashcards." },
    { Icon: Target, title: "S'entraîner", desc: "QCM officiels, sessions ciblées, examens blancs." },
    { Icon: Trophy, title: "Classement", desc: "Duels de 30 questions et examens classés : ton ELO bouge." },
    { Icon: User, title: "Moi", desc: "Tes stats, tes erreurs, ta progression matière par matière." },
  ];

  return (
    <div className="rl-wide grid items-start gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-12 lg:pt-6">
      {/* Présentation : titre au pinceau, les rangs, les quatre espaces */}
      <section className="order-2 grid gap-8 lg:order-1">
        <PageHero kicker="Ranked Lobby" title={<>Révise, affronte,<br />monte en rang.</>}>
          {DOMAINS.map((d) => (
            <span key={d.key} className={"chip " + (d.ready ? "chip-active" : "")}>
              {d.name}
              <span className={d.ready ? "opacity-70" : "text-muted"}>· {d.ready ? d.programs.filter((p) => p.ready).map((p) => p.short).join(", ") : "bientôt"}</span>
            </span>
          ))}
        </PageHero>

        <div className="card p-5">
          <div className="kicker mb-3">Huit rangs, de Bronze au Top 10</div>
          <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
            {TIERS.map((tier, i) => (
              <div key={tier.key} className="rl-pop grid justify-items-center gap-1" style={{ animationDelay: `${0.15 + i * 0.07}s` }}>
                <RankBadge tier={i} size={i >= 4 ? 50 : 42} glow={false} />
                <span className="text-[11px] font-semibold text-muted">{tier.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {spaces.map(({ Icon, title, desc }, i) => (
            <div key={title} className="card-soft rl-in flex gap-3 p-4" style={{ animationDelay: `${0.2 + i * 0.08}s` }}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white text-black">
                <Icon size={17} strokeWidth={2.1} />
              </span>
              <div>
                <div className="text-[15px] font-bold">{title}</div>
                <div className="text-[13px] leading-relaxed text-muted">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Connexion */}
      <section className="card rl-in order-1 grid content-start gap-5 p-7 md:p-8 lg:sticky lg:top-24 lg:order-2">
        <div className="flex items-center gap-3">
          <InkRing size={40} title="Ranked Lobby" />
          <h2 className="text-[28px] font-extrabold leading-none tracking-[-0.03em]">{t("login.signinTitle")}</h2>
        </div>
        <p className="text-[15px] text-muted">{t("login.signinDesc")}</p>

        <button type="button" onClick={signInWithGoogle} disabled={busy} className="btn btn-primary rl-press w-full py-3.5 text-[15px]">
          <GoogleIcon />
          {busy ? t("login.redirecting") : t("login.googleButton")}
        </button>

        {error ? <div className="text-sm font-semibold text-pen">{error}</div> : null}

        <div className="rounded-[14px] bg-surface-2 p-4">
          <div className="kicker mb-2">{t("login.firstStepsTitle")}</div>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>Choisis ton pseudo et ta date d&apos;examen.</li>
            <li>Commence par une fiche de révision et son quiz.</li>
            <li>Joue tes 5 parties de placement pour obtenir ton rang.</li>
          </ol>
        </div>

        <div className="text-xs text-muted">{t("login.legalNote")}</div>
      </section>
    </div>
  );
}
