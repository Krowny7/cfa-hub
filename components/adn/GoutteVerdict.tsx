"use client";

// La goutte d'encre du résultat : quand une copie est rendue (verdict d'un
// duel, copie des 30 du jour, fin de session, examen blanc noté), une goutte
// tombe sur l'écran de résultat, l'encre de la palette de l'espace s'étale en
// tache et le score apparaît dedans, puis l'encre s'efface sur le résultat.
// Environ 2,4 s, « Toucher / une touche » pour passer. Texture et voile : les
// classes .rl-encre de globals.css (lib/palettes.ts).
//
//   <div className="relative">   // le parent porte le résultat et son arrondi
//     <GoutteVerdict cle="duel:abc" mot="Victoire" score="22 – 19" detail="+14 ELO" onFin={…} />
//     …le résultat…
//   </div>
//
// Une seule fois par résultat : `cle` (l'identifiant du résultat) est retenue
// dans sessionStorage ; revenir sur la page de résultat ne la rejoue pas.
// Rien en mode discret ni en mouvement réduit : le résultat s'affiche
// directement (onFin est appelé tout de suite). Elle attend d'être à l'écran
// pour tomber. Pendant qu'elle joue, les cérémonies et Léonard attendent
// (lib/ceremonie-en-cours : marquerGoutte), puis la suite habituelle.
//
// Pendant la goutte, le parent peut cacher son contenu avec la classe
// rl-goutte-cache (globals.css) tant que `onFin` n'a pas été appelé : onFin
// part quand l'encre commence à s'effacer, la suite du résultat se joue
// dessous.
//
// Props
//   cle       identifiant du résultat (une goutte par clé)
//   actif     false : rien (et onFin n'est pas appelé)
//   mot       petit mot au-dessus du score (« Victoire. », « Trait sûr. » : le point final est retiré)
//   score     le score, en grand (« 22 – 19 », « 24/30 »)
//   detail    ligne sous le score (« +14 ELO », « 80 % »)
//   rendueA   heure (ISO) où la copie a été rendue : au-delà de 30 min, c'est
//             une copie qu'on revoit, rien ne se joue
//   palette   force la palette (sinon : celle de la route)
//   fond      fond de la couche avant que l'encre couvre (le parent le cache
//             sinon) ; transparent par défaut
//   rayon     arrondi de la couche (celui du parent par défaut)
//   force     aperçus : ignorer la mémoire de session
//   onFin     l'encre commence à s'effacer (ou rien ne se joue)

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PALETTES, paletteDeChemin, styleDePalette, type PaletteCle } from "@/lib/palettes";
import { finirGoutte, marquerGoutte } from "@/lib/ceremonie-en-cours";
import s from "./GoutteVerdict.module.css";

const VUES = "rl_goutte";
/** la tache est étalée et le score posé vers 1,5 s ; l'encre s'efface à T_SORTIE */
const T_SORTIE = 1900;
const T_FONDU = 450;
/** hors écran plus longtemps : le résultat s'affiche directement */
const T_ATTENTE_MAX = 5000;

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

// clés jouées sur cette page : le double montage du mode strict rejoue la même
// (dans la seconde et demie) ; un retour plus tard sur la page, non
const jouees = new Map<string, number>();

function dejaJouee(cle: string): boolean {
  const deja = jouees.get(cle);
  if (deja !== undefined) return Date.now() - deja > 1500;
  jouees.set(cle, Date.now());
  try {
    const vues = JSON.parse(sessionStorage.getItem(VUES) || "[]") as string[];
    if (vues.includes(cle)) return true;
    sessionStorage.setItem(VUES, JSON.stringify([cle, ...vues].slice(0, 100)));
  } catch {
    // stockage indisponible : on la joue (une fois par affichage)
  }
  return false;
}

function sansMouvement(): boolean {
  if (typeof window === "undefined") return true;
  const h = document.documentElement.dataset;
  if (h.discreet === "1" || h.rlMotion === "off") return true;
  return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

type Etat = "off" | "pret" | "joue" | "sort";

export function GoutteVerdict({
  cle,
  actif = true,
  mot,
  score,
  detail,
  rendueA,
  palette,
  fond,
  rayon,
  force = false,
  onFin,
}: {
  cle: string;
  actif?: boolean;
  mot?: string;
  score: string;
  detail?: string;
  rendueA?: string | null;
  palette?: PaletteCle;
  fond?: string;
  rayon?: string;
  force?: boolean;
  onFin?: () => void;
}) {
  const chemin = usePathname();
  const pal = palette ? PALETTES[palette] : (paletteDeChemin(chemin ?? "") ?? PALETTES["san-romano"]);
  const [etat, setEtat] = useState<Etat>("off");
  const racine = useRef<HTMLDivElement | null>(null);
  const finRef = useRef(onFin);
  finRef.current = onFin;
  const sorti = useRef(false);

  // la décision : jouer, ou laisser le résultat tel quel
  useIso(() => {
    if (!actif) {
      setEtat("off");
      return;
    }
    sorti.current = false;
    const ancienne = rendueA && Date.now() - new Date(rendueA).getTime() > 30 * 60_000;
    if (sansMouvement() || ancienne || (!force && dejaJouee(cle))) {
      setEtat("off");
      finRef.current?.();
      return;
    }
    marquerGoutte(T_SORTIE + T_FONDU + 1500);
    setEtat("pret");
    return () => finirGoutte();
    // une seule fois par résultat
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actif, cle]);

  const sortir = useCallback(() => {
    if (sorti.current) return;
    sorti.current = true;
    setEtat("sort");
    finRef.current?.();
  }, []);

  // elle tombe quand elle est à l'écran ; trop longtemps hors écran, elle renonce
  useEffect(() => {
    if (etat !== "pret") return;
    const el = racine.current;
    const renonce = () => {
      sorti.current = true;
      setEtat("off");
      finirGoutte();
      finRef.current?.();
    };
    if (!el || typeof IntersectionObserver === "undefined") {
      setEtat("joue");
      return;
    }
    let vue = false;
    let partie = false;
    const essayer = () => {
      if (partie || !vue || document.visibilityState !== "visible") return;
      partie = true;
      setEtat("joue");
    };
    const io = new IntersectionObserver(
      (es) => {
        vue = es.some((e) => e.isIntersecting);
        essayer();
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    document.addEventListener("visibilitychange", essayer);
    const t = window.setTimeout(() => {
      if (!partie) renonce();
    }, T_ATTENTE_MAX);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", essayer);
      window.clearTimeout(t);
    };
  }, [etat]);

  // l'encre s'efface à l'heure, ou d'une touche
  useEffect(() => {
    if (etat !== "joue") return;
    marquerGoutte(T_SORTIE + T_FONDU + 300);
    const t = window.setTimeout(sortir, T_SORTIE);
    const passer = () => sortir();
    window.addEventListener("pointerdown", passer, { capture: true, passive: true });
    window.addEventListener("keydown", passer, { capture: true, passive: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("pointerdown", passer, { capture: true });
      window.removeEventListener("keydown", passer, { capture: true });
    };
  }, [etat, sortir]);

  useEffect(() => {
    if (etat !== "sort") return;
    const t = window.setTimeout(() => {
      setEtat("off");
      finirGoutte();
    }, T_FONDU);
    return () => window.clearTimeout(t);
  }, [etat]);

  if (etat === "off") return null;

  return (
    <div
      ref={racine}
      data-goutte-encre=""
      data-palette={pal.key}
      aria-hidden="true"
      className={`${s.racine} ${etat === "joue" || etat === "sort" ? s.joue : ""} ${etat === "sort" ? s.sort : ""}`}
      style={
        {
          ...styleDePalette(pal),
          ...(fond ? { "--goutte-fond": fond } : null),
          ...(rayon ? { "--goutte-rayon": rayon } : null),
        } as React.CSSProperties
      }
    >
      <svg width="0" height="0" focusable="false" style={{ position: "absolute" }} aria-hidden="true">
        <filter id="rl-goutte-bavure" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="40" />
        </filter>
      </svg>
      <span className={s.chute} />
      <span className={`rl-encre ${s.tache}`} data-palette={pal.key} />
      <div className={s.resultat}>
        {mot ? <span className={s.mot}>{mot.endsWith(".") ? mot.slice(0, -1) : mot}</span> : null}
        <span className={s.score}>{score}</span>
        {detail ? <span className={s.detail}>{detail}</span> : null}
      </div>
    </div>
  );
}
