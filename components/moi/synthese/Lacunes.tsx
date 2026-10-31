import Link from "next/link";
import { Play, Target, TriangleAlert } from "lucide-react";
import { BarreZone } from "@/components/moi/synthese/BarreZone";
import { Bouton, SceauUni } from "@/components/moi/synthese/Encre";
import { pc } from "@/components/moi/synthese/modele";
import {
  HREF_CARTE,
  MIN_NOTION,
  SEUIL,
  ecartLigne,
  lacunes,
  matiereCible,
  phraseLacunes,
  premiereAGagner,
  texteToutesLesNotions,
} from "@/components/moi/synthese/modele-bilan";
import type { MatiereSynthese, NotionSynthese } from "@/components/moi/synthese/types";
import { BILAN } from "@/lib/voice-moi-bilan";
import b from "@/components/moi/synthese/Bilan.module.css";
import s from "@/components/moi/synthese/Synthese.module.css";

// La carte « Tes lacunes » (petite, 5 colonnes, id="points-faibles") : les 5
// notions mesurées les plus basses, toutes matières, avec « Réviser » (la fiche
// de la notion, sinon son cours) et « S'entraîner » (l'Atelier de la notion).
// Le seul liquide de la carte est le bouton « Atelier sur ta pire notion » ;
// sans notion mesurée, l'état vide dit combien de réponses il faut et propose
// de s'entraîner dans la matière la plus faible. Composant serveur, aucun hook.

const ID = "syn-lacunes";
const T = BILAN.lacunes;

export function Lacunes({ notions, matieres, className }: { notions: NotionSynthese[]; matieres: MatiereSynthese[] | null; className?: string }) {
  const l = lacunes(notions, matieres);
  const k = l.lignes.length;
  const phrase = phraseLacunes(l, premiereAGagner(matieres), matieres);
  const cible = matiereCible(matieres);
  return (
    <section id="points-faibles" className={[s.carte, s.petite, b.carteBilan, className].filter(Boolean).join(" ")} aria-labelledby={ID}>
      <header className={b.entete}>
        <div className={s.teteBloc}>
          <h2 id={ID} className={"font-brand " + s.titreCarte + " " + s.titreSceau}>
            <SceauUni>
              <TriangleAlert size={15} aria-hidden />
            </SceauUni>
            {T.titre}
          </h2>
          <p className={s.sous}>{T.sous(k)}</p>
        </div>
        {l.mesurees > 0 && (
          <p className={b.compteur} aria-label={T.compteurAria(l.sous70, SEUIL)}>
            <b className={"font-brand " + s.surligne}>{l.sous70}</b>
            <span>{T.compteur(SEUIL)}</span>
          </p>
        )}
      </header>

      {k > 0 ? (
        <>
          <ol className={b.liste} aria-label={T.liste}>
            {l.lignes.map((lg) => (
              <li key={lg.id} className={b.lacune}>
                <span className={b.nom}>
                  <b>{lg.nom}</b>
                  <span className={s.mono}>{pc(lg.pct)}</span>
                </span>
                <span className={b.note}>
                  {lg.matiere} · {ecartLigne(lg)}
                </span>
                <BarreZone valeur={lg.w} ton={lg.ton} aria={T.barreAria(lg.nom, lg.pct, SEUIL)} />
                <span className={b.actions}>
                  <Link href={lg.href} className={b.mini} aria-label={T.reviserAria(lg.nom)}>
                    {T.reviser}
                  </Link>
                  <Link href={lg.hrefAtelier} className={b.mini} aria-label={T.entrainerAria(lg.nom)}>
                    {T.entrainer}
                  </Link>
                </span>
              </li>
            ))}
          </ol>
          {phrase && (
            <p className={s.pied}>
              <b>{BILAN.pied}</b> {phrase}
            </p>
          )}
          <div className={b.bas}>
            {l.pire && (
              <Bouton href={l.pire.hrefAtelier} className={b.action} label={T.atelierAria(l.pire.nom)}>
                <Target size={15} aria-hidden /> {T.atelier} <span className={b.duree}>· {T.atelierDuree}</span>
              </Bouton>
            )}
            {/* la carte du programme a besoin des matières : sans elles, pas de lien vers #carte */}
            {matieres && (
              <a href={HREF_CARTE} className={s.lien}>
                {texteToutesLesNotions(l.sous70)}
              </a>
            )}
          </div>
        </>
      ) : (
        <>
          <p className={b.vide}>{T.vide(MIN_NOTION)}</p>
          <div className={b.bas}>
            <Bouton href={cible.href} className={b.action}>
              <Play size={15} aria-hidden /> {T.entrainerEn(cible.court)}
            </Bouton>
          </div>
        </>
      )}
    </section>
  );
}
