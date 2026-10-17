"use client";

// Le fil rouge (V3 §1.5) : une ligne par chapitre — son nom, les paliers
// déjà faits, le palier en cours en ligne de quête (après l'examen, en tête
// de « Tout le Codex » ; avant, dans les objectifs longs). Commun à tous
// les programmes, il continue après l'examen. Tant que la base ne sait pas
// l'écrire (capacité « fil »), il se lit « à venir » : pas de tampon, ni fête
// ni XP annoncée (la vue met l'XP des paliers à zéro).

import { useId } from "react";
import type { LigneQuete as Ligne, VueFilRouge } from "@/lib/codex/vue";
import { LigneQuete } from "@/components/codex/LigneQuete";
import c from "./Carte.module.css";

const TEXTES = {
  titre: "Le fil rouge",
  sous: "Ce qui te suit d'un programme à l'autre, et après l'examen.",
  aVenir: "à venir",
  faits: (n: number) => (n === 0 ? "—" : n === 1 ? "1 palier" : `${n} paliers`),
  palier: (n: number) => `Palier ${n}`,
};

export function FilRouge({ fil, onQuete, titre = true }: { fil: VueFilRouge; onQuete: (l: Ligne) => void; titre?: boolean }) {
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
              <span className={c.mono}>{fil.aVenir ? TEXTES.aVenir : TEXTES.faits(ch.faits)}</span>
            </div>
            {ch.courant && <LigneQuete l={ch.courant} onOuvrir={onQuete} sous={TEXTES.palier(ch.courant.palier ?? ch.faits + 1)} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
