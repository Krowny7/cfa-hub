import type { CSSProperties } from "react";
import type { PastilleVue } from "@/lib/codex/carte";
import type { VueBranche } from "@/lib/codex/vue";
import { TEXTES_CAP } from "@/lib/codex/cap";
import c from "./Carte.module.css";

// La pastille d'une matière (V3 §10.1) : un anneau de progression (les
// étapes faites de la branche sur leur total), la maîtrise au centre
// (« ≈ » si provisoire, un tiret si pas encore mesurée), le sigle et la
// zone à côté (`carte` : sur la carte dézoomée, le texte compense le zoom)
// ou dessous (`grille` : la grille 2 × 5 du téléphone). L'encre pâlit avec
// les jours sans toucher la matière (opacité de 1 à 0,4). Sans état :
// serveur ou client.

const R = 42;

/** Le pourcentage tel qu'il tient dans l'anneau : « 52 % », « ≈52 % », « – ». */
const auCentre = (p: Pick<PastilleVue, "pct">) => (p.pct.startsWith("pas") ? "–" : p.pct.replace("≈ ", "≈"));

export function PastilleMatiere({
  p,
  forme,
  onClick,
  presse,
  style,
  className,
}: {
  p: PastilleVue;
  forme: "carte" | "grille";
  onClick?: () => void;
  /** la branche est ouverte (grille du téléphone) */
  presse?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  const zone = p.zone ? TEXTES_CAP.zone[p.zone] : p.pct;
  const label = `${p.nom} : ${p.pct}${p.zone ? `, ${TEXTES_CAP.zone[p.zone]}` : ""}, ${p.faites} étape${p.faites > 1 ? "s" : ""} sur ${p.total}${p.maitre ? ", Maître" : ""}${p.touchee ? `, ${p.touchee}` : ""}`;
  return (
    <button
      type="button"
      className={`${c.pastille} ${forme === "carte" ? c.pastilleCarte : c.pastilleGrille} ${className ?? ""}`}
      data-zone={p.zone ?? "aucune"}
      style={{ ...style, ["--encre" as string]: p.opacite }}
      onClick={onClick}
      aria-label={label}
      aria-pressed={presse}
      title={p.touchee ?? undefined}
    >
      <span className={c.pastilleAnneau}>
        <svg viewBox="0 0 100 100" aria-hidden focusable="false">
          <circle cx="50" cy="50" r={R} className={c.pastillePiste} />
          <circle cx="50" cy="50" r={R} pathLength={100} className={c.pastilleArc} strokeDasharray={`${Math.round(p.fraction * 100)} 100`} transform="rotate(-90 50 50)" />
        </svg>
        <span className={c.pastillePct} aria-hidden>
          {auCentre(p)}
        </span>
      </span>
      <span className={c.pastilleMots} aria-hidden>
        <span className={`font-brand ${c.pastilleSigle}`}>
          {p.court}
          {p.maitre ? " ♛" : ""}
        </span>
        <span className={c.pastilleZone}>{zone}</span>
      </span>
    </button>
  );
}

/** Les notions d'une matière, en petites feuilles : non vue (contour), vue (trait), tenue (pleine). */
export function FeuillesNotions({ notions, noms = false }: { notions: VueBranche["notions"]; noms?: boolean }) {
  if (!notions.length) return null;
  const n = { tenue: notions.filter((x) => x.etat === "tenue").length, vue: notions.filter((x) => x.etat !== "non_vue").length };
  return (
    <div className={c.feuilles}>
      <p className="t-micro m-0">
        {notions.length} notions · {n.vue} vue{n.vue > 1 ? "s" : ""} · {n.tenue} tenue{n.tenue > 1 ? "s" : ""}
      </p>
      <ul className={c.feuillesListe} data-noms={noms ? "1" : undefined}>
        {notions.map((x) => (
          <li key={x.id} title={`${x.court} : ${ETAT_NOTION[x.etat]}`}>
            <svg viewBox="0 0 24 24" className={c.feuille} data-etat={x.etat} aria-hidden focusable="false">
              <path d="M4 20C4 10 10 4 20 4c0 10-6 16-16 16Z" />
              <path d="M5 19 15 9" className={c.nervure} />
            </svg>
            <span className={noms ? undefined : "sr-only"}>
              {x.court}
              <span className="sr-only"> : {ETAT_NOTION[x.etat]}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const ETAT_NOTION = { non_vue: "pas encore vue", vue: "vue", tenue: "tenue" } as const;
