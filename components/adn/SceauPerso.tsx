import { useId } from "react";
import s from "./SceauPerso.module.css";

// Sceau personnel : les initiales du joueur, en réserve dans un tampon
// d'encre noire. Il remplace l'avatar « TC » dans un rond gris (Moi,
// classement, duels). Chaque joueur a sa petite variation, tirée de son nom :
// forme du bord, inclinaison, grain.
//
//   <SceauPerso nom="theo_cfa" taille={40} />
//
// Props
//   nom      pseudo ou nom affiché (initiales : « theo_cfa » → TC, « Camille » → CA)
//   taille   côté en px (défaut 40) ; ≤ 34 px : version simplifiée, sans filet ni grain
//   ton      "ink" (noir, défaut : la main du joueur) | "pen" (rouge)
//   initiales  pour forcer les lettres (une ou deux)
//   className, title
// Composant sans état ni « use client » (seulement useId, permis côté
// serveur) : utilisable partout. Mode discret : il reste tel quel.

/** Initiales d'un pseudo : deux mots → leurs premières lettres ; un mot → ses deux premières. */
export function initiales(nom: string | null | undefined): string {
  const clean = (nom ?? "")
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .replace(/@.*$/, "");
  const mots = clean.split(/[^A-Za-z0-9]+/).filter((m) => /[A-Za-z]/.test(m));
  if (!mots.length) return "";
  if (mots.length === 1) {
    const m = mots[0];
    // « CamilleRoux » → CR ; sinon les deux premières lettres
    const caps = m.match(/[A-Z]/g);
    if (caps && caps.length >= 2 && m[0] === caps[0]) return (caps[0] + caps[1]).toUpperCase();
    return m.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
  }
  return (mots[0][0] + mots[1].replace(/[^A-Za-z]/g, "")[0]).toUpperCase();
}

function hash(t: string) {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function SceauPerso({
  nom,
  taille = 40,
  ton = "ink",
  initiales: forcees,
  className = "",
  title,
}: {
  nom: string | null | undefined;
  taille?: number;
  ton?: "ink" | "pen";
  initiales?: string;
  className?: string;
  title?: string;
}) {
  const lettres = (forcees ?? initiales(nom)).slice(0, 2).toUpperCase();
  const h = hash((nom ?? "").toLowerCase());
  const petit = taille <= 34;
  const v = h % 3;
  const rot = ((h >>> 3) % 9) - 4; // −4° à +4°
  const gx = (h >>> 7) % 120;
  const gy = (h >>> 13) % 120;
  // repère 100 × 100 : deux lettres tiennent dans le filet intérieur
  const fs = lettres.length > 1 ? (petit ? 42 : 34) : petit ? 52 : 44;
  // useId est permis côté serveur : chaque masque a son identifiant
  const id = "kbp" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const forme = petit ? [s.s0, s.s1, s.s2][v] : [s.f0, s.f1, s.f2][v];
  return (
    <span
      role="img"
      aria-label={title ?? (nom ? `Sceau de ${nom}` : "Sceau")}
      className={`${s.perso} ${forme} ${petit ? s.petit : ""} ${ton === "pen" ? s.pen : ""} ${className}`}
      style={{ width: taille, height: taille, rotate: `${rot}deg`, ["--gx" as string]: `${-gx}px`, ["--gy" as string]: `${-gy}px` }}
    >
      <span className={s.encre}>
        <svg viewBox="0 0 100 100" aria-hidden>
          {lettres ? (
            <defs>
              {/* les lettres sont en réserve : le fond transparaît, sur papier comme sur carte */}
              <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={100} height={100}>
                <rect width={100} height={100} fill="#fff" />
                <text x={50} y={50 + fs * 0.36} textAnchor="middle" fontSize={fs} fill="#000" className={s.txt} letterSpacing={lettres.length > 1 ? -1 : 0}>
                  {lettres}
                </text>
              </mask>
            </defs>
          ) : null}
          <rect width={100} height={100} fill="currentColor" mask={lettres ? `url(#${id})` : undefined} />
        </svg>
      </span>
    </span>
  );
}
