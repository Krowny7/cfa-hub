import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DefiHeading } from "@/components/defi/parts";
import { InkWatermark } from "@/components/duel/parts";
import { DAILY_VOICE, parisDay } from "@/lib/daily";

// Tant que migration_daily_challenge.sql n'est pas appliquée (ou si le
// serveur ne répond pas) : un état propre au lieu d'une erreur.
export function DefiSoon({ variant = "soon" }: { variant?: "soon" | "error" }) {
  const today = parisDay();
  return (
    <div className="rl-page">
      <DefiHeading day={today} today={today} isToday />
      <section className="card-ink rl-in flex min-h-[240px] flex-col gap-4 p-6 md:p-8">
        <InkWatermark />
        <span className="relative text-[12.5px] font-semibold text-[rgba(255,255,255,.58)]">{variant === "soon" ? "Bientôt" : "Indisponible"}</span>
        <h2 className="relative m-0 text-[28px] font-extrabold leading-tight tracking-[-0.025em] md:text-[34px]">
          {variant === "soon" ? DAILY_VOICE.soonTitle : "Le défi du jour ne répond pas."}
        </h2>
        <p className="relative m-0 max-w-[520px] text-[15px] leading-normal text-[rgba(255,255,255,.68)]">
          {variant === "soon" ? DAILY_VOICE.soonText : DAILY_VOICE.unavailable}
        </p>
        <div className="relative mt-auto flex flex-wrap gap-2.5">
          <Link href="/entrainement" className="btn btn-lg btn-on-ink">
            S&apos;entraîner en attendant <ArrowRight size={16} aria-hidden />
          </Link>
          <Link href="/duel" className="btn btn-lg btn-on-ink-ghost">
            Lancer un duel
          </Link>
        </div>
      </section>
    </div>
  );
}
