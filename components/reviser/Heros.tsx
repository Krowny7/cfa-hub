import { ArrowRight } from "lucide-react";
import { ActionEncre } from "@/components/ui/SousPage";
import { Illustration } from "@/components/ui/Illustration";
import type { IllustrationNom } from "@/lib/illustrations";
import { RV } from "@/lib/voice-reviser";
import s from "./Heros.module.css";

// La rangée héros des catalogues de Réviser (gabarit A des sous-pages : /fiches, /courses,
// /flashcards, /page-blanche), posée dans le cadre de la page (`premier` de SousPage) : à
// gauche UNE carte « ta suite » (la seule recommandation de la page, son action à l'encre de
// l'espace), à droite la peinture du lieu, son nom en légende. Sans carte (rien à
// reprendre), la peinture prend toute la rangée. Sans état ni requête.

export function HerosLieu({
  illustration,
  position,
  nom,
  children,
}: {
  illustration: IllustrationNom;
  position?: string;
  /** le nom du lieu, en légende de la peinture */
  nom: string;
  /** la carte « ta suite » (CarteSuite), absente s'il n'y a rien à reprendre */
  children?: React.ReactNode;
}) {
  return (
    <div className={s.heros}>
      {children}
      <figure className={s.lieu}>
        <Illustration nom={illustration} position={position} eager />
        <figcaption className={s.legende}>{nom}</figcaption>
      </figure>
    </div>
  );
}

/** La carte « ta suite » : un petit titre, l'icône du format, la recommandation, une ligne, l'action à l'encre. */
export function CarteSuite({
  icone,
  titre,
  ligne,
  action,
}: {
  icone?: React.ReactNode;
  titre: React.ReactNode;
  ligne?: React.ReactNode;
  action: { href: string; label: string };
}) {
  return (
    <section className={"card-hero rl-in " + s.suite} aria-label={RV.taSuite}>
      <div className={s.haut}>
        {icone && (
          <span className={s.icone} aria-hidden>
            {icone}
          </span>
        )}
        <span className="t-eyebrow">{RV.taSuite}</span>
      </div>
      <div className={s.bas}>
        <h2 className={s.titre}>{titre}</h2>
        {ligne && <p className={s.ligne}>{ligne}</p>}
        <div className={s.action}>
          <ActionEncre href={action.href}>
            {action.label} <ArrowRight size={17} aria-hidden />
          </ActionEncre>
        </div>
      </div>
    </section>
  );
}
