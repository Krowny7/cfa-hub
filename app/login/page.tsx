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
    { Icon: BookOpen, title: "Réviser", desc: "Fiches, cours audio, flashcards." },
    { Icon: Target, title: "S'entraîner", desc: "QCM officiels et examens blancs." },
    { Icon: Trophy, title: "Classement", desc: "Duels de 30 questions, ELO." },
    { Icon: User, title: "Moi", desc: "Stats, erreurs, progression." },
  ];

  // Vitrine : le titre, LA carte de connexion (seule action en encre), puis
  // les huit rangs sur une carte sombre (le seul moment en couleur) et les
  // quatre espaces posés sur le papier. Sur téléphone : titre → connexion → reste.
  // Mouvement : l'anneau du logo se trace dans la carte, les rangs montent
  // un à un de Bronze au Top 10, les espaces suivent en cascade.
  return (
    <div className="rl-wide grid items-start gap-x-14 gap-y-10 pb-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:pt-8">
      <PageHero kicker="Ranked Lobby" title={<>Révise, affronte,<br />monte en rang.</>} className="lg:col-start-1 lg:row-start-1">
        {DOMAINS.map((d) => (
          <span key={d.key} className={"chip chip-sm " + (d.ready ? "chip-active" : "chip-quiet")}>
            {d.name}
            <span className="opacity-70">· {d.ready ? d.programs.filter((p) => p.ready).map((p) => p.short).join(", ") : "bientôt"}</span>
          </span>
        ))}
      </PageHero>

      {/* Connexion */}
      <section className="card-hero rl-in grid content-start gap-6 p-7 md:p-9 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-6">
        <div className="grid gap-3">
          <InkRing size={36} title="Ranked Lobby" className="rl-deco rl-ink-draw" />
          <h2 className="t-h1">{t("login.signinTitle")}</h2>
          <p className="t-small">{t("login.signinDesc")}</p>
        </div>

        <button type="button" onClick={signInWithGoogle} disabled={busy} className="btn btn-primary btn-lg w-full">
          <GoogleIcon />
          {busy ? t("login.redirecting") : t("login.googleButton")}
        </button>

        {error ? <div className="text-sm font-semibold text-pen">{error}</div> : null}

        <div className="grid gap-3 border-t border-line pt-5">
          <div className="t-eyebrow">{t("login.firstStepsTitle")}</div>
          <ol className="grid gap-2.5">
            {["Choisis ton pseudo et ta date d'examen.", "Commence par une fiche et son quiz.", "Joue tes 5 parties de placement : ton rang apparaît."].map((step, i) => (
              <li key={i} className="flex items-baseline gap-3 text-[14px] leading-snug">
                <span className="font-mono text-[12px] font-semibold text-muted">0{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="t-micro">{t("login.legalNote")}</p>
      </section>

      {/* Les rangs, puis les espaces */}
      <div className="grid gap-10 lg:col-start-1 lg:row-start-2">
        <section className="card-ink p-6 md:p-7" style={{ ["--tier-glow" as string]: TIERS[2].metal[1] }} aria-label="Les huit rangs">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Huit rangs, de Bronze au Top 10</h2>
            <span className="hidden text-[12px] text-[rgba(255,255,255,.55)] sm:inline">un par domaine</span>
          </div>
          <div className="rl-stagger mt-5 grid grid-cols-4 items-end gap-x-1 gap-y-5 sm:grid-cols-8" style={{ ["--rl-stagger-from" as string]: ".25s" }}>
            {TIERS.map((tier, i) => (
              <div key={tier.key} className="grid justify-items-center gap-2">
                <RankBadge tier={i} size={i >= 4 ? 64 : 56} glow={false} onDark />
                <span className="text-center text-[11px] font-medium leading-tight text-[rgba(255,255,255,.6)]">{tier.name}</span>
              </div>
            ))}
          </div>
        </section>

        <ul className="rl-stagger grid gap-x-8 gap-y-5 sm:grid-cols-2" style={{ ["--rl-stagger-from" as string]: ".5s" }}>
          {spaces.map(({ Icon, title, desc }) => (
            <li key={title} className="flex items-center gap-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] border border-line bg-surface text-white shadow-[var(--shadow-1)]">
                <Icon size={17} strokeWidth={1.9} />
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-[-0.01em]">{title}</div>
                <div className="t-small">{desc}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
