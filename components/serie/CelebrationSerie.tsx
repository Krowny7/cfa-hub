"use client";

// Le palier de 7 jours de la série d'encre : une petite célébration, une fois
// par série. Légère : le chiffre, un trait d'encre et une phrase (pas de
// coches ni de sceau, c'est la cérémonie du sans-faute qui les porte). Elle
// emprunte à celle-ci son voile et ses gestes (CeremonieSansFaute.module.css)
// et son mécanisme (lib/ceremonie-en-cours : Léonard attend la fin ; la goutte
// d'encre du résultat passe d'abord). Passable d'un toucher ou d'Échap.
// Rien en mode discret ; image fixe en mouvement réduit. À la fin, Léonard
// peut féliciter (signal « serie-sept »).
//
//   <CelebrationSerie serie={7} cle="2026-10-06" doubleDeja={false} />
//
// Props
//   serie       la série d'aujourd'hui compris ; ne joue qu'à 7 jours ou plus
//   cle         identifiant de la série (son premier jour) : une seule fois par clé
//   doubleDeja  l'XP est déjà doublée aujourd'hui (la série à la veille a 7 jours)
//   force       aperçus : ignorer la clé retenue
//   figer       aperçus : l'image à l'instant t (secondes), sans fin automatique

import { useCallback, useEffect, useRef, useState } from "react";
import { finirCeremonie, marquerCeremonie, resteGoutte } from "@/lib/ceremonie-en-cours";
import { signalerLeonard } from "@/lib/leonard/signal";
import { SERIE } from "@/lib/voice-serie";
import { jouerSon } from "@/components/adn/sound";
import s from "@/components/adn/CeremonieSansFaute.module.css";

const VUS = "rl_serie_sept";
const DUREE = 2800;
const T_NOMBRE = 0.35;
const T_LIGNE = 0.8;
const T_MOT = 1.1;
const T_INDICE = 1.5;

// clés jouées sur cette page : le double montage du mode strict rejoue la même, un retour plus tard non
const jouees = new Map<string, number>();

function dejaVue(cle: string): boolean {
  const deja = jouees.get(cle);
  if (deja !== undefined) return Date.now() - deja > 1000;
  jouees.set(cle, Date.now());
  try {
    const vus = JSON.parse(localStorage.getItem(VUS) || "[]") as string[];
    if (vus.includes(cle)) return true;
    localStorage.setItem(VUS, JSON.stringify([cle, ...vus].slice(0, 40)));
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

export function CelebrationSerie({ serie, cle, doubleDeja, force = false, figer }: { serie: number; cle: string; doubleDeja: boolean; force?: boolean; figer?: number }) {
  const atteint = serie >= 7;
  const [etat, setEtat] = useState<"rien" | "joue" | "sort">("rien");
  const fini = useRef(false);

  const fermer = useCallback(() => {
    if (fini.current) return;
    fini.current = true;
    finirCeremonie();
    setEtat("sort");
    window.setTimeout(() => {
      setEtat("rien");
      if (figer === undefined) signalerLeonard({ evt: "serie-sept", delai: 500 }, "serie-sept:" + cle);
    }, reduit() ? 0 : 320);
  }, [cle, figer]);

  useEffect(() => {
    if (!atteint) return;
    if (document.documentElement.dataset.discreet === "1") return;
    const attente = figer === undefined ? resteGoutte() : 0;
    const minuteurs: number[] = [];
    const demarrer = () => {
      if (!force && dejaVue("s7:" + cle)) return;
      fini.current = false;
      setEtat("joue");
      if (figer !== undefined) return;
      marquerCeremonie(DUREE);
      if (!reduit()) minuteurs.push(window.setTimeout(() => jouerSon("tampon", { moment: "ceremonie", volume: 0.7 }), T_NOMBRE * 1000 + 120));
      minuteurs.push(window.setTimeout(fermer, DUREE));
    };
    const attendre = () => {
      if (resteGoutte() > 0) minuteurs.push(window.setTimeout(attendre, 200));
      else demarrer();
    };
    if (attente > 0) attendre();
    else demarrer();
    return () => minuteurs.forEach((m) => window.clearTimeout(m));
    // une seule fois par clé
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atteint, cle]);

  useEffect(() => {
    if (etat !== "joue") return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") fermer();
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [etat, fermer]);

  if (etat === "rien") return null;

  return (
    <div
      className={`${s.voile} ${etat === "sort" ? s.sortie : ""} ${figer !== undefined ? s.fige : ""}`}
      style={figer !== undefined ? ({ "--t": `${figer}s` } as React.CSSProperties) : undefined}
      role="dialog"
      aria-modal="true"
      aria-label={`${SERIE.celebration.sur} : ${SERIE.jours(serie)}`}
      onClick={fermer}
    >
      <div className={s.scene}>
        <p className={s.epreuve} style={d(0.1)}>
          {SERIE.celebration.sur}
        </p>
        <p className={s.score} style={{ ...d(T_NOMBRE), fontSize: "clamp(72px, 22vw, 120px)" }}>
          {serie}
          <small>{serie > 1 ? "jours" : "jour"}</small>
        </p>
        <svg className={s.ligne} viewBox="0 0 260 10" preserveAspectRatio="none" fill="none" aria-hidden="true">
          <path d="M3 6.5 C 60 3.2, 120 7.6, 180 4.8 S 240 5.6, 257 4.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={d(T_LIGNE)} />
        </svg>
        <p className={s.mot} style={d(T_MOT)}>
          {SERIE.jours(serie)}. {doubleDeja ? SERIE.celebration.mot : "Dès demain, ton XP est doublée."}
        </p>
        <p className={s.indice} style={d(T_INDICE)}>
          {SERIE.celebration.indice}
        </p>
      </div>
    </div>
  );
}
