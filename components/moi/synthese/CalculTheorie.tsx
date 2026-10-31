import { Calculator } from "lucide-react";
import { Bouton, SceauUni } from "@/components/moi/synthese/Encre";
import { pc } from "@/components/moi/synthese/modele";
import { hrefSessionCalculs, matieresComparables, plusBasses, resumeCalcul, zoneBarre } from "@/components/moi/synthese/modele-examen";
import type { CalculSynthese } from "@/components/moi/synthese/types";
import { EXA } from "@/lib/voice-moi-examen";
import s from "@/components/moi/synthese/Synthese.module.css";
import m from "@/components/moi/synthese/Examen.module.css";

// La carte « Calcul ou théorie » (petite, 3 colonnes) : ta maîtrise des
// questions sans calcul et avec calcul (60 dernières réponses de chaque type,
// moyenne pondérée par les poids officiels, sur les matières mesurées des deux
// côtés), l'écart entre les deux, ce qu'il veut dire et le bouton d'encre
// « Session de calculs » sur tes deux matières les plus basses avec calcul. Sous
// 3 matières comparables : un état vide, avec le même bouton. Composant
// serveur, aucun hook.

const ID = "syn-calcul";
const PISTE = { r: m.zR, a: m.zA, e: m.zE } as const;
const PASTILLE = { r: m.etatR, a: m.etatA, e: m.etatE } as const;

/** Un genre de question : son nom, sa valeur et sa piste de zones, le seuil de 70 % en pointillé. */
function Genre({ nom, p }: { nom: string; p: number }) {
  const z = zoneBarre(p);
  return (
    <div className={m.genre}>
      <span className={m.genreTete}>
        <b className={m.genreNom}>{nom}</b>
        <b className={`font-brand ${m.genreValeur}`}>{pc(p)}</b>
      </span>
      <span className={m.zp} role="img" aria-label={EXA.calcul.aria(nom, Math.round(p))}>
        {z.w > 0 && <i className={PISTE[z.ton]} style={{ width: `${z.w}%` }} />}
        <span className={m.seuil} />
      </span>
    </div>
  );
}

export function CalculTheorie({ calcul, className }: { calcul: CalculSynthese; className?: string }) {
  const r = resumeCalcul(calcul);
  const href = hrefSessionCalculs(r ? r.faibles : plusBasses(calcul, "avec"));
  return (
    <section className={[s.carte, s.petite, className].filter(Boolean).join(" ")} aria-labelledby={ID}>
      <header className={m.entete}>
        <h2 id={ID} className={`font-brand ${s.titreCarte} ${m.titre}`}>
          <SceauUni>
            <Calculator size={15} aria-hidden />
          </SceauUni>
          {EXA.calcul.titre}
        </h2>
        <p className={s.sous}>{EXA.calcul.sous}</p>
      </header>
      {r ? (
        <>
          <div className={m.genres}>
            <Genre nom={EXA.calcul.sans} p={r.sans} />
            <Genre nom={EXA.calcul.avec} p={r.avec} />
          </div>
          <p>
            <span className={`${m.etat} ${PASTILLE[r.ton]}`}>{r.pastille}</span>
          </p>
          <p className={s.pied}>
            <b>{EXA.pied}</b> {r.phrase}
          </p>
        </>
      ) : (
        <p className={m.vide}>{EXA.calcul.vide(matieresComparables(calcul))}</p>
      )}
      <Bouton href={href} className={`${m.boutonPetit} ${m.bas}`}>
        <Calculator size={15} aria-hidden /> {EXA.calcul.session}
      </Bouton>
    </section>
  );
}
