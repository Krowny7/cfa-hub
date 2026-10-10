"use client";

// La cérémonie du sans-faute : quand une copie revient à 100 %. Courte
// (environ 3 s), passable d'un toucher ou d'Échap.
//
//   <CeremonieSansFaute score={30} total={30} epreuve="Défi du jour" cle="defi:2026-10-10" />
//
// Les coches s'écrivent au stylo rouge (une par question, 30 au plus), le
// sceau « Sans faute » se pose d'un coup de tampon, le score s'affiche avec
// « 100 % », souligné d'une ligne d'encre. Ni or ni confettis : l'or
// appartient aux rangs.
//
// Une seule fois par résultat : `cle` (épreuve et jour, ou empreinte de la
// copie) est retenue sur l'appareil ; une copie revue ne rejoue rien. Rien en
// mode discret ; image fixe en mouvement réduit. Pendant qu'elle se joue,
// Léonard attend (lib/ceremonie-en-cours).
//
// Props
//   score, total   ne joue que si score === total (et total > 0)
//   epreuve        petite ligne du haut (« Défi du jour », « Les 5 du jour »…)
//   cle            identifiant du résultat (une seule cérémonie par clé)
//   rendueA        heure (ISO) où la copie a été rendue : au-delà de 30 min,
//                  c'est une copie qu'on revoit, rien ne se joue
//   force          aperçus : ignorer la clé
//   figer          aperçus : l'image à l'instant t (secondes), sans fin automatique
//   onFin          appelé quand elle s'efface

import { useCallback, useEffect, useRef, useState } from "react";
import { finirCeremonie, marquerCeremonie } from "@/lib/ceremonie-en-cours";
import { Sceau } from "./Sceau";
import { jouerSon, vibrer } from "./sound";
import s from "./CeremonieSansFaute.module.css";

const VUS = "rl_sans_faute";
const DUREE = 3200;
// l'horloge des gestes (secondes)
const T_COCHES = 0.25;
const D_COCHES = 0.85;
const T_SCEAU = 1.2;
const T_SCORE = 1.6;
const T_LIGNE = 1.8;
const T_MOT = 2.05;
const T_INDICE = 2.3;

// clés jouées sur cette page : le double montage du mode strict (dans la
// seconde) rejoue la même ; un retour plus tard sur la copie, non
const jouees = new Map<string, number>();

function dejaVue(cle: string): boolean {
  const deja = jouees.get(cle);
  if (deja !== undefined) return Date.now() - deja > 1000;
  jouees.set(cle, Date.now());
  try {
    const vus = JSON.parse(localStorage.getItem(VUS) || "[]") as string[];
    if (vus.includes(cle)) return true;
    localStorage.setItem(VUS, JSON.stringify([cle, ...vus].slice(0, 200)));
  } catch {
    // stockage indisponible : on la joue (une fois par affichage)
  }
  return false;
}

function reduit(): boolean {
  if (typeof window === "undefined") return true;
  if (document.documentElement.dataset.rlMotion === "off") return true;
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

const d = (t: number) => ({ "--d": `${t}s` }) as React.CSSProperties;

export function CeremonieSansFaute({
  score,
  total,
  epreuve,
  cle,
  rendueA,
  force = false,
  figer,
  onFin,
}: {
  score: number;
  total: number;
  epreuve: string;
  cle: string;
  rendueA?: string | null;
  force?: boolean;
  figer?: number;
  onFin?: () => void;
}) {
  const parfait = total > 0 && score === total;
  const [etat, setEtat] = useState<"rien" | "joue" | "sort">("rien");
  const fini = useRef(false);

  const fermer = useCallback(() => {
    if (fini.current) return;
    fini.current = true;
    finirCeremonie();
    setEtat("sort");
    window.setTimeout(() => {
      setEtat("rien");
      onFin?.();
    }, reduit() ? 0 : 320);
  }, [onFin]);

  useEffect(() => {
    if (!parfait) return;
    if (document.documentElement.dataset.discreet === "1") return;
    if (!force && rendueA && Date.now() - new Date(rendueA).getTime() > 30 * 60_000) return;
    if (!force && dejaVue("sf:" + cle)) return;
    fini.current = false;
    setEtat("joue");
    if (figer !== undefined) return;
    marquerCeremonie(DUREE);
    if (!reduit()) {
      jouerSon("stylo", { moment: "ceremonie", variante: "tic", duree: D_COCHES, dans: T_COCHES, volume: 0.6 });
      jouerSon("tampon", { moment: "ceremonie", dans: T_SCEAU + 0.18 });
      window.setTimeout(() => vibrer(14), (T_SCEAU + 0.18) * 1000);
    }
    const t = window.setTimeout(fermer, DUREE);
    return () => window.clearTimeout(t);
    // une seule fois par clé
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parfait, cle]);

  useEffect(() => {
    if (etat !== "joue") return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") fermer();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [etat, fermer]);

  if (etat === "rien") return null;

  const n = Math.min(total, 30);
  const colonnes = n <= 10 ? n : 10;
  const tailleCoche = n <= 5 ? 34 : n <= 10 ? 26 : 20;
  const pas = n > 1 ? D_COCHES / (n - 1) : 0;

  return (
    <div
      className={`${s.voile} ${etat === "sort" ? s.sortie : ""} ${figer !== undefined ? s.fige : ""}`}
      style={figer !== undefined ? ({ "--t": `${figer}s` } as React.CSSProperties) : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={`Sans faute : ${score} sur ${total}, 100 %`}
      onClick={fermer}
    >
      <div className={s.scene}>
        <p className={s.epreuve} style={d(0.1)}>
          {epreuve}
        </p>
        <div className={s.coches} style={{ gridTemplateColumns: `repeat(${colonnes}, ${tailleCoche}px)` }} aria-hidden="true">
          {Array.from({ length: n }, (_, i) => (
            <svg key={i} className={s.coche} width={tailleCoche} height={tailleCoche} viewBox="0 0 24 24" fill="none">
              <path d="M4.5 12.5 L9.6 18 L20 5.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={d(T_COCHES + i * pas)} />
            </svg>
          ))}
        </div>
        <div className={s.sceau} style={d(T_SCEAU)}>
          <Sceau forme="long" texte="Sans faute" sous={`${score}/${total} · 100 %`} taille={230} angle={-5} pose={false} son={false} />
        </div>
        <p className={s.score} style={d(T_SCORE)}>
          {score}/{total}
          <small>100 %</small>
        </p>
        <svg className={s.ligne} viewBox="0 0 260 10" preserveAspectRatio="none" fill="none" aria-hidden="true">
          <path d="M3 6.5 C 60 3.2, 120 7.6, 180 4.8 S 240 5.6, 257 4.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={d(T_LIGNE)} />
        </svg>
        <p className={s.mot} style={d(T_MOT)}>
          Pas une rature.
        </p>
        <p className={s.indice} style={d(T_INDICE)}>
          Toucher pour continuer
        </p>
      </div>
    </div>
  );
}
