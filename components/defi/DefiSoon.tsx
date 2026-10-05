import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DefiHeading, Filigrane } from "@/components/defi/parts";
import { parisDay } from "@/lib/daily";
import { voixDefi } from "@/lib/voice-z2c";

// Tant que migration_daily_challenge.sql n'est pas appliquée (ou si le
// serveur ne répond pas) : un état propre au lieu d'une erreur.
export function DefiSoon({ variant = "soon", format = "trente" }: { variant?: "soon" | "error"; format?: "trente" | "cinq" }) {
  // la voix de ce défi : les 30 du jour ou les 5 du jour
  const DEFI = voixDefi(format);
  const today = parisDay();
  return (
    <div className="rl-page">
      <DefiHeading day={today} today={today} isToday />
      <section className="card-ink rl-in flex min-h-[240px] flex-col gap-4 p-6 md:p-8">
        <Filigrane />
        <span className="relative text-[12.5px] font-semibold text-[rgba(255,255,255,.58)] first-letter:uppercase">
          {variant === "soon" ? DEFI.tuile.etatBientot : DEFI.tuile.etatIndispo}
        </span>
        <h2 className="relative m-0 text-[28px] font-extrabold leading-tight tracking-[-0.025em] md:text-[34px]">
          {variant === "soon" ? DEFI.soonTitle : DEFI.silence}
        </h2>
        <p className="relative m-0 max-w-[520px] text-[15px] leading-normal text-[rgba(255,255,255,.68)]">
          {variant === "soon" ? DEFI.soonText : DEFI.unavailable}
        </p>
        <div className="relative mt-auto flex flex-wrap gap-2.5">
          <Link href="/entrainement" className="btn btn-lg btn-on-ink">
            {DEFI.enAttendant} <ArrowRight size={16} aria-hidden />
          </Link>
          <Link href="/duel" className="btn btn-lg btn-on-ink-ghost">
            {DEFI.lancerDuel}
          </Link>
        </div>
      </section>
    </div>
  );
}
