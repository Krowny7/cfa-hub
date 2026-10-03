import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DuelHeading, DuelHowItWorks, InkWatermark } from "@/components/duel/parts";

// Tant que la migration des duels n'est pas appliquée : un état propre au
// lieu d'une erreur.
export function DuelSoon() {
  return (
    <div className="rl-page">
      <div className="flex flex-col gap-8 md:gap-10">
        <DuelHeading />
        <section className="card-ink rl-in flex min-h-[240px] flex-col gap-4 p-6 md:p-8">
          <InkWatermark />
          <span className="relative text-[12.5px] font-semibold text-[rgba(255,255,255,.58)]">Bientôt</span>
          <h2 className="relative m-0 text-[28px] font-extrabold leading-tight tracking-[-0.025em] md:text-[34px]">Les duels arrivent bientôt</h2>
          <p className="relative m-0 max-w-[520px] text-[15px] leading-normal text-[rgba(255,255,255,.68)]">
            Dès que la mise en place côté serveur est faite, tu pourras défier un joueur au hasard ou un ami, et ton ELO bougera enfin.
          </p>
          <div className="relative mt-auto">
            <Link href="/classement" className="btn btn-lg btn-on-ink">
              Voir le classement <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        </section>
      </div>
      <DuelHowItWorks />
    </div>
  );
}
