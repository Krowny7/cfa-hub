import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { IllustrationAtelier } from "@/components/atelier/IllustrationAtelier";
import { LogoAtelier, type VarianteLogo } from "@/components/atelier/LogoAtelier";
import type { PointsFaiblesData } from "@/lib/points-faibles";
import { ATELIER } from "@/lib/voice-atelier";

// La carte de l'Atelier en tête de S'entraîner (à côté de « Ton point
// faible ») : l'illustration, ce que dure la séance, ce qu'elle contient, un
// seul bouton. Le nom en grand, avec sa marque (LogoAtelier) : l'Atelier est
// un lieu à part. Ordinateur : carte haute, l'illustration à fond perdu en tête
// (16:10) et le bouton en bas, à la hauteur de la colonne voisine.
// Téléphone : compacte, une vignette 4:5 à droite du titre, le bouton
// pleine largeur, dans le premier écran. Sans état : rendue côté serveur.

export function CarteAtelier({ d, logo = "plume", className = "" }: { d: PointsFaiblesData; logo?: VarianteLogo; className?: string }) {
  if (!d.atelier) return null;
  const trois = d.liste.slice(0, 3);
  const enCours = d.atelier.enCours;
  const ratures = trois.some((p) => p.mesures.enCours > 0);
  return (
    <section
      data-leonard="atelier"
      aria-label={ATELIER.nom}
      className={
        "card rl-in grid min-w-0 grid-cols-[minmax(0,1fr)_88px] items-start gap-x-4 gap-y-3 overflow-hidden p-5 " +
        "lg:grid-cols-1 lg:grid-rows-[auto_auto_auto_1fr] lg:gap-y-3.5 lg:p-0 lg:pb-6 " +
        className
      }
    >
      <IllustrationAtelier className="col-start-2 row-span-2 row-start-1 h-[110px] w-[88px] rounded-[14px] lg:col-start-1 lg:row-span-1 lg:aspect-[16/10] lg:h-auto lg:w-full lg:rounded-none lg:border-b lg:border-line" />
      <div className="col-start-1 row-start-1 flex min-w-0 flex-col gap-1.5 lg:row-start-2 lg:px-6 lg:pt-2.5">
        <h2 className="font-brand m-0 flex items-center gap-2 text-[28px] leading-none lg:gap-3 lg:text-[44px]">
          <LogoAtelier variante={logo} className="size-[26px] lg:size-[44px]" />
          {ATELIER.nom}
        </h2>
        <p className="m-0 text-[14px] font-semibold leading-snug lg:text-[15px]">{ATELIER.carteSousTitre(trois.length)}</p>
      </div>
      <p className="t-small col-start-1 row-start-2 m-0 lg:row-start-3 lg:px-6">
        {enCours ? ATELIER.enCoursLigne(enCours.faites) : ATELIER.carteDeroule(ratures, d.atelier.calcul)}
      </p>
      <div className="col-span-2 row-start-3 pt-1 lg:col-span-1 lg:row-start-4 lg:self-end lg:px-6">
        <Link href="/atelier" className="btn btn-primary btn-lg rl-press w-full">
          <LogoAtelier variante={logo} className="size-[19px]" /> {enCours ? ATELIER.reprendre : ATELIER.lancer} <ArrowRight size={17} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
