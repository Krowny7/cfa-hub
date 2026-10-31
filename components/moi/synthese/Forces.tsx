import Link from "next/link";
import { Swords, Zap } from "lucide-react";
import { BarreZone } from "@/components/moi/synthese/BarreZone";
import { SceauUni } from "@/components/moi/synthese/Encre";
import { pc } from "@/components/moi/synthese/modele";
import { HREF_DEFI, MIN_NOTION, SEUIL, forces, hrefEntretenir, matiereForte, phraseForces } from "@/components/moi/synthese/modele-bilan";
import type { MatiereSynthese, NotionSynthese } from "@/components/moi/synthese/types";
import { BILAN } from "@/lib/voice-moi-bilan";
import b from "@/components/moi/synthese/Bilan.module.css";
import s from "@/components/moi/synthese/Synthese.module.css";

// La carte « Tes forces » (petite, 4 colonnes) : les 3 notions mesurées les
// plus hautes, à 70 % ou plus, puis « Tes atouts face aux joueurs » (la
// maîtrise de la matière moins la moyenne des joueurs, quand l'écart est
// positif ; masqué sans moyenne fondée), « Défier un ami » en contour et
// « Entretenir mes forces → ». Aucun liquide : la carte n'a pas de bouton
// d'encre. Composant serveur, aucun hook.

const ID = "syn-forces";
const T = BILAN.forces;
const A = T.atouts;

export function Forces({ notions, matieres, className }: { notions: NotionSynthese[]; matieres: MatiereSynthese[] | null; className?: string }) {
  const f = forces(notions, matieres);
  const k = f.lignes.length;
  const phrase = phraseForces(f);
  const entretenir = hrefEntretenir(f.lignes);
  const forte = matiereForte(matieres);
  return (
    <section className={[s.carte, s.petite, b.carteBilan, className].filter(Boolean).join(" ")} aria-labelledby={ID}>
      <header>
        <div className={s.teteBloc}>
          <h2 id={ID} className={"font-brand " + s.titreCarte + " " + s.titreSceau}>
            <SceauUni>
              <Zap size={15} aria-hidden />
            </SceauUni>
            {T.titre}
          </h2>
          <p className={s.sous}>{T.sous(k)}</p>
        </div>
      </header>

      {k > 0 ? (
        <ol className={b.liste} aria-label={T.liste}>
          {f.lignes.map((lg) => (
            <li key={lg.id} className={b.force}>
              <span className={b.nom}>
                <b>{lg.nom}</b>
                <span className={s.mono}>{pc(lg.pct)}</span>
              </span>
              <span className={b.note}>
                {lg.matiere} · {T.auDessus(lg.points)}
              </span>
              <BarreZone valeur={lg.w} ton={lg.ton} aria={T.barreAria(lg.nom, lg.pct, SEUIL)} />
            </li>
          ))}
        </ol>
      ) : (
        <p className={b.vide}>{T.vide(SEUIL, MIN_NOTION)}</p>
      )}

      {f.atouts && (
        <div className={b.encart}>
          <p className={b.etiquette}>{A.titre}</p>
          {f.atouts.liste.length > 0 ? (
            <>
              <ul className={b.atouts} aria-label={A.liste}>
                {f.atouts.liste.map((a) => (
                  <li key={a.cle} className={b.atout}>
                    <b>{a.court}</b>
                    <span className={s.mono}>+{a.points}</span>
                  </li>
                ))}
              </ul>
              <p className={b.note}>{A.note(f.atouts.total, f.atouts.comparables)}</p>
            </>
          ) : (
            <p className={b.note}>{A.aucun}</p>
          )}
        </div>
      )}

      {phrase && (
        <p className={s.pied}>
          <b>{BILAN.pied}</b> {phrase}
        </p>
      )}

      <div className={b.bas}>
        {k > 0 && (
          <Link href={HREF_DEFI} className={b.plus}>
            <Swords size={15} aria-hidden /> {T.defier}
          </Link>
        )}
        <Link href={entretenir ?? forte.href} className={s.lien}>
          {entretenir ? T.entretenir : T.sEntrainer}
        </Link>
      </div>
    </section>
  );
}
