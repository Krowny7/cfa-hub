import Link from "next/link";
import { User } from "lucide-react";
import { CarteJoueur } from "@/components/moi/synthese/CarteJoueur";
import { CarteProgramme } from "@/components/moi/synthese/CarteProgramme";
import { PAL } from "@/components/moi/synthese/Encre";
import { Objectif } from "@/components/moi/synthese/Objectif";
import { RangeeBilan } from "@/components/moi/synthese/RangeeBilan";
import { RangeeExamen } from "@/components/moi/synthese/RangeeExamen";
import { TesMatieres } from "@/components/moi/synthese/TesMatieres";
import { Trophees } from "@/components/moi/synthese/Trophees";
import type { SyntheseMoi } from "@/components/moi/synthese/types";
import { styleDePalette } from "@/lib/palettes";
import { hrefPersonnaliser } from "@/lib/profil/onglets";
import { SYN } from "@/lib/voice-moi";
import s from "@/components/moi/synthese/Synthese.module.css";

// La page Moi « La synthèse » (maquette D), onglet stats : « Où tu en es » sur
// une seule page, en cartes de papier aux aplats noirs, améthyste et blancs et
// au vrai liquide de la palette « jade » (seulement les boutons d'action
// principaux et les options actives des sélecteurs). De haut en bas : l'en-tête,
// Objectif | Joueur, Tes matières, Lacunes | Forces | Où gagner, la carte du
// programme, Calcul ou théorie | Rythme | Progression, la salle des trophées.
// Une carte dont la source manque se masque et sa rangée se recompose (data-n).
// Composant de présentation serveur : tout vient de `s` (lireSynthese) ; les
// îlots clients (Tes matières, la carte, le rythme, la progression) ne reçoivent
// que des données.

/** Le trait d'encre sous le titre (le même que la maquette). */
function TraitDEncre() {
  return (
    <svg className={s.trait} viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden>
      <path d="M3 8 C60 5.6 120 5.2 180 5.6 C230 6 270 6.6 297 7.2 L297 8.4 C250 9 200 9.6 150 9.4 C90 9.2 40 9.4 3 9.2 Z" fill="currentColor" />
    </svg>
  );
}

export function SyntheseView({ s: d, constance }: { s: SyntheseMoi; /** « Ta constance par matière », lue après la page */ constance?: React.ReactNode }) {
  return (
    <div className={"rl-wide rl-page " + s.cadre}>
      <div className={s.racine} style={styleDePalette(PAL)}>
        <header className={s.entete}>
          <div className={s.enteteTexte}>
            <p className={s.fil}>
              <User size={17} aria-hidden />
              <span>{SYN.fil(d.joueur.nom)}</span>
            </p>
            <h1 className={s.titre}>{SYN.titre}</h1>
            <TraitDEncre />
          </div>
          <nav className={s.compte} aria-label={SYN.compte.label}>
            <Link href="/moi?onglet=reglages">{SYN.compte.reglages}</Link>
            <span aria-hidden>·</span>
            <Link href="/moi?onglet=pieces">{SYN.compte.pieces}</Link>
            <span aria-hidden>·</span>
            <Link href={hrefPersonnaliser(d.joueur.id)}>{SYN.compte.personnaliser}</Link>
            <span aria-hidden>·</span>
            <Link href="/moi?onglet=erreurs">{SYN.compte.carnet}</Link>
          </nav>
        </header>

        <div className={s.rangee}>
          <Objectif className={s.c8} objectif={d.objectif} note={d.note} jn={d.joueur.jn} />
          <CarteJoueur className={s.c4} j={d.joueur} />
        </div>

        {d.matieres && <TesMatieres matieres={d.matieres} globale={d.globale} notions={d.notions} sourceNotions={d.sourceNotions} />}

        <RangeeBilan matieres={d.matieres} notions={d.notions} note={d.note} />

        <CarteProgramme matieres={d.matieres} notions={d.notions} sourceNotions={d.sourceNotions} />

        <RangeeExamen
          calcul={d.calcul}
          rythme={d.rythme}
          progression={d.progression}
          aujourdhui={d.progression?.aujourdhui ?? null}
          examen={d.progression?.examen ?? null}
          ilYa30={d.globale?.ilYa?.[30] ?? null}
          constance={constance}
        />

        {d.trophees && <Trophees t={d.trophees} />}
      </div>
    </div>
  );
}
