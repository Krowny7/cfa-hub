import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DuelHeading, DuelHowItWorks, InkWatermark } from "@/components/duel/parts";

// Tant que la migration des duels n'est pas appliquée : un état propre au
// lieu d'une erreur.
export function DuelSoon() {
  return (
    <div className="grid gap-8 md:gap-10">
      <DuelHeading />
      <section className="card-ink rl-in flex min-h-[260px] flex-col gap-4 p-6 md:p-8">
        <InkWatermark />
        <span className="relative text-[13px] font-semibold text-[rgba(255,255,255,.6)]">Bientôt</span>
        <h2 className="relative m-0 text-[28px] font-extrabold leading-tight tracking-[-0.02em] md:text-[34px]">
          Les duels arrivent bientôt
        </h2>
        <p className="relative m-0 max-w-[560px] text-[15px] leading-normal text-[rgba(255,255,255,.7)]">
          La mise en place côté serveur est en attente (migration des duels). Dès qu&apos;elle est appliquée, tu pourras défier
          un joueur au hasard ou un ami sur 30 questions d&apos;examen, et ton ELO bougera enfin.
        </p>
        <div className="relative mt-auto">
          <Link
            href="/classement"
            className="rl-press inline-flex h-12 items-center gap-2 rounded-[12px] bg-[#fff] px-[22px] text-[15px] font-bold text-[#111]"
          >
            Voir le classement <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>
      <DuelHowItWorks />
    </div>
  );
}
