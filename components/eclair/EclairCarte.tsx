import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { ECLAIR_HREF } from "@/lib/eclair";
import { ECLAIR } from "@/lib/voice-z2c";

// Les séries éclair en carte légère (S'entraîner), sous les 30 du jour :
// même allure que la carte des 5 du jour de l'accueil (l'éclair, « 2 min »
// en pastille, une ligne, une action secondaire), mais à volonté et pour soi.
// Sans état.

export function EclairCarte({ today, className = "" }: { today: number; className?: string }) {
  const T = ECLAIR.carte;
  const compte = ECLAIR.aujourdhui(today);
  return (
    <section className={"card rl-in flex min-w-0 items-center gap-4 p-4 sm:p-5 " + className} aria-label={ECLAIR.nom}>
      <span aria-hidden className="hidden h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-surface-2 min-[420px]:grid">
        <Zap size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="t-micro m-0 flex items-center gap-1.5 truncate font-semibold">
          <Zap size={12} aria-hidden className="shrink-0 min-[420px]:hidden" />
          {T.label}
          {compte ? ` · ${compte}` : ""}
        </p>
        <p className="m-0 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[17px] font-bold leading-tight tracking-[-0.01em]">{ECLAIR.nom}</span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[11.5px] font-semibold">≈ 2 min</span>
        </p>
        <p className="t-micro m-0 mt-1">{T.ligne}</p>
      </div>
      <Link href={ECLAIR_HREF} className="btn btn-secondary shrink-0">
        {today > 0 ? T.encore : T.jouer} <ArrowRight size={15} aria-hidden />
      </Link>
    </section>
  );
}
