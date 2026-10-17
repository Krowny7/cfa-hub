// Le cap, en tête de /codex (V3 §4.6, §4.7) : la préparation à l'examen en
// une ligne, la règle des matières (un segment par matière, large comme son
// poids, hachuré tant qu'elle n'est pas mesurée), les trois fuites et « Y
// aller » sur la première. Le détail par matière se déplie. Un trait et des
// hachures, jamais une jauge remplie d'encre. Tout le texte vient de
// lib/codex/cap.ts : l'écran ne calcule rien.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TEXTES_CAP, aideMatiereCap, enTeteCap, ligneFuites, ligneMatiereCap, pctCap, titreFuites, type VueCap } from "@/lib/codex/cap";
import s from "./Cap.module.css";

export function Cap({ cap }: { cap: VueCap }) {
  return (
    <section className={s.cap} aria-label={TEXTES_CAP.titre} data-leonard="cap">
      <p className={s.ligne}>{enTeteCap(cap)}</p>

      <ol className={s.regle} aria-label="La préparation, matière par matière">
        {cap.matieres.map((m) => (
          <li
            key={m.cle}
            className={s.segment}
            data-zone={m.zone ?? "aucune"}
            data-hachure={m.statut !== "mesuree" ? "1" : undefined}
            style={{ flexGrow: m.part }}
            title={`${m.court} · ${pctCap(m)}${aideMatiereCap(m) ? ` (${aideMatiereCap(m)})` : ""}`}
          >
            <span className="sr-only">{ligneMatiereCap(m)}</span>
          </li>
        ))}
      </ol>

      <div className={s.fuites}>
        {cap.fuites.length ? (
          <p className="t-small m-0 min-w-0 flex-1">
            <span className={s.fuitesTitre}>{titreFuites(cap.fuites.length)}</span> <span className={s.chiffres}>{ligneFuites(cap.fuites)}</span>
          </p>
        ) : (
          <p className="t-small m-0 min-w-0 flex-1">{TEXTES_CAP.aucuneFuite}</p>
        )}
        {cap.destination && (
          <Link href={cap.destination.href} className={`btn rl-press shrink-0 ${s.aller}`} title={cap.destination.raison ?? undefined}>
            {cap.destination.libelle} <ArrowRight size={16} aria-hidden />
          </Link>
        )}
      </div>

      <p className="t-micro m-0">{TEXTES_CAP.pronostic}</p>
      {cap.provisoire && <p className="t-micro m-0">{TEXTES_CAP.provisoire}</p>}

      <details className={s.detail}>
        <summary className={s.resume}>{TEXTES_CAP.detail}</summary>
        <ul className={s.matieres}>
          {cap.matieres.map((m) => (
            <li key={m.cle} className={s.matiere} title={aideMatiereCap(m) ?? undefined}>
              <span className={s.pastille} data-zone={m.zone ?? "aucune"} data-hachure={m.statut !== "mesuree" ? "1" : undefined} aria-hidden />
              <span className="t-small min-w-0">{ligneMatiereCap(m)}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
