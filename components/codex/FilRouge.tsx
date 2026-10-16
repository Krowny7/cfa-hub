"use client";

// Le fil rouge (V3 §1.5) : une ligne par chapitre, sous les chaînes — son nom,
// les paliers déjà tamponnés, le palier en cours avec sa jauge. Commun à tous
// les programmes, il continue après l'examen. Tant que la base ne sait pas
// l'écrire (capacité « fil »), il se lit « à venir » : pas de tampon, ni fête
// ni XP annoncée (la vue met l'XP des paliers à zéro).

import { useId } from "react";
import type { LigneQuete, VueFilRouge } from "@/lib/codex/vue";
import { Sceau, libelleSceau } from "@/components/codex/Sceau";
import { JaugePinceau } from "@/components/codex/JaugePinceau";
import c from "./Carte.module.css";

const TEXTES = {
  titre: "Le fil rouge",
  sous: "Ce qui te suit d'un programme à l'autre, et après l'examen.",
  aVenir: "à venir",
  tamponnes: (n: number) => (n === 0 ? "—" : n === 1 ? "1 palier" : `${n} paliers`),
  palier: (n: number) => `Palier ${n}`,
};

export function FilRouge({ fil, onQuete, titre = true }: { fil: VueFilRouge; onQuete: (l: LigneQuete) => void; titre?: boolean }) {
  const id = useId();
  if (!fil.chapitres.length) return null;
  return (
    <section aria-labelledby={titre ? id : undefined} aria-label={titre ? undefined : TEXTES.titre} data-leonard="filrouge" className="mt-5">
      {titre && (
        <h2 id={id} className={c.colTitre}>
          {TEXTES.titre}
        </h2>
      )}
      <p className="t-micro m-0 mb-2">{TEXTES.sous}</p>
      <ul className={c.colListe}>
        {fil.chapitres.map((ch) => (
          <li key={ch.id} className={c.chaine}>
            <div className="flex items-baseline justify-between gap-2">
              <span className={c.chaineTitre}>{ch.titre}</span>
              <span className={c.mono}>{fil.aVenir ? TEXTES.aVenir : TEXTES.tamponnes(ch.faits)}</span>
            </div>
            {ch.courant && (
              <button type="button" className={c.compacte} onClick={() => onQuete(ch.courant!)} aria-label={libelleSceau(ch.courant)} aria-haspopup="dialog">
                <Sceau l={ch.courant} taille={34} />
                <span className="min-w-0 flex-1">
                  <span className={c.compacteSur}>{TEXTES.palier(ch.courant.palier ?? ch.faits + 1)}</span>
                  <span className={c.compacteTitre}>{ch.courant.titre}</span>
                  {ch.courant.cible > 1 && <JaugePinceau fraction={ch.courant.fraction} or={ch.courant.etat === "active"} className="mt-1.5" />}
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
