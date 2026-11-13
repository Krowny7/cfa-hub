"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Piece } from "@/components/ui/Presentoir";
import s from "./Carrousel.module.css";

// Le carrousel (idée de Théo, 2026-11-12, pour les flashcards) : les matières en anneau de cartes à
// jouer, vu en perspective. On le tourne en faisant défiler à l'horizontale (pavé tactile, ou
// Maj + molette), en le glissant (souris, doigt), aux flèches du clavier, ou en
// cliquant une carte de côté, qui vient devant. La carte de devant s'ouvre ; dessous, seulement le
// nom de sa matière (choix de Théo : rien d'autre). Au repos, l'anneau se cale sur la carte la plus proche. Le dos des
// cartes se voit quand elles passent derrière. Sans mouvement réduit : pas de transition.
// `lancer` (/flashcards, 2026-11-13) : un lancer fait tourner l'anneau selon sa vitesse (la vitesse des
// 80 dernières ms du glissement, projetée sur 250 ms, au plus 5 cartes), puis il ralentit jusqu'à la
// carte la plus proche de la projection (300 à 700 ms selon la distance) ; en mouvement réduit, le
// saut d'avant. `grand` : des cartes de 190 px dès 1200 px de large.

const CALAGE_MS = 140;
/** le lancer : fenêtre de mesure de la vitesse, horizon de projection, distance maximale (en cartes) */
const LANCER_FENETRE_MS = 80;
const LANCER_HORIZON_MS = 250;
const LANCER_MAX = 5;
/** les pixels de glissement pour une carte */
const PX_PAR_CARTE = 110;
/** au-delà, l'anneau garde 12 places et ne montre que les pièces proches de celle de devant */
const PLACES_MAX = 12;

/**
 * L'objet de chaque page (pour qu'on la reconnaisse) : « cartes » (flashcards), « carnet » (fiches),
 * « livret » (cours), « blanche » (page blanche), « livre » (QCM), « tuile » (calculs), « sceau »
 * (examens), « dossier » (cas pratiques), « portrait » (joueurs : leur photo si la pièce a une image),
 * « porte » (Salles).
 */
export type FormeCarrousel = "cartes" | "carnet" | "livret" | "blanche" | "livre" | "tuile" | "sceau" | "dossier" | "portrait" | "porte";

export function Carrousel({
  pieces,
  action,
  depart = 0,
  forme = "cartes",
  onActif,
  lancer = false,
  grand = false,
  conseil,
}: {
  pieces: Piece[];
  action: string;
  depart?: number;
  forme?: FormeCarrousel;
  /** appelé avec l'indice de la pièce de devant, à chaque changement (ex. : le bouton « Défier X » du duel) */
  onActif?: (indice: number) => void;
  /** un lancer fait tourner l'anneau selon sa vitesse (/flashcards) */
  lancer?: boolean;
  /** des cartes de 190 px dès 1200 px de large (/flashcards) */
  grand?: boolean;
  /** la pièce conseillée : sa mention, sur la carte de devant, est entourée à l'encre (#rl-cercle-main) */
  conseil?: string;
}) {
  const n = pieces.length;
  const places = Math.min(Math.max(1, n), PLACES_MAX);
  const pas = 360 / places;
  const [pos, setPos] = useState(depart);
  const [libre, setLibre] = useState(false);
  /** la durée de la rotation après un lancer (null : la transition ordinaire) */
  const [elan, setElan] = useState<number | null>(null);
  /** les derniers points du glissement (temps, x), pour la vitesse du lancer */
  const traces = useRef<{ t: number; x: number }[]>([]);
  const posRef = useRef(depart);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glisse = useRef<{ x: number; depart: number; bouge: boolean } | null>(null);
  /** le dernier geste était un glissement : le clic qui le suit ne doit rien ouvrir */
  const aGlisse = useRef(false);
  const scene = useRef<HTMLDivElement | null>(null);

  const actif = ((Math.round(pos) % n) + n) % n;
  const p = pieces[actif];

  function aller(v: number, transition = true, duree: number | null = null) {
    posRef.current = v;
    setLibre(!transition);
    setElan(duree);
    setPos(v);
  }
  /** au relâcher : la carte la plus proche, ou, après un lancer, la projection de sa vitesse */
  function relacher() {
    const ici = posRef.current;
    const pts = traces.current;
    traces.current = [];
    const calme = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!lancer || calme || pts.length < 2) return aller(Math.round(ici));
    const a = pts[0];
    const b = pts[pts.length - 1];
    const dt = b.t - a.t;
    if (dt <= 0) return aller(Math.round(ici));
    const vitesse = -(b.x - a.x) / dt / PX_PAR_CARTE; // en cartes par ms (glisser à gauche fait avancer)
    const projection = Math.max(-LANCER_MAX, Math.min(LANCER_MAX, vitesse * LANCER_HORIZON_MS));
    const cible = Math.round(ici + projection);
    const distance = Math.abs(cible - ici);
    if (distance < 0.6) return aller(cible);
    aller(cible, true, Math.round(Math.min(700, 300 + distance * 90)));
  }
  function caler() {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => aller(Math.round(posRef.current)), CALAGE_MS);
  }
  /** amène la carte i devant, par le plus court chemin */
  function vers(i: number) {
    const ici = posRef.current;
    const base = ici - (((ici % n) + n) % n);
    let cible = base + i;
    if (cible - ici > n / 2) cible -= n;
    if (ici - cible > n / 2) cible += n;
    aller(cible);
  }

  // défilement horizontal (pavé tactile, Maj + molette) : écouteur non passif pour garder la page immobile
  useEffect(() => {
    const el = scene.current;
    if (!el) return;
    const roue = (e: WheelEvent) => {
      const dx = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0;
      if (!dx) return;
      e.preventDefault();
      aller(posRef.current + dx / 160, false);
      caler();
    };
    el.addEventListener("wheel", roue, { passive: false });
    return () => el.removeEventListener("wheel", roue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  useEffect(() => () => void (minuteur.current && clearTimeout(minuteur.current)), []);

  const rappel = useRef(onActif);
  rappel.current = onActif;
  useEffect(() => {
    if (n) rappel.current?.(actif);
  }, [actif, n]);

  if (!n) return null;
  const rayon = `calc(var(--carte) / 2 / ${Math.tan(Math.PI / Math.max(3, places)).toFixed(4)} + 26px)`;
  /** l'écart (circulaire) d'une pièce à celle de devant */
  const ecart = (i: number) => {
    const d = (((i - pos) % n) + n) % n;
    return d > n / 2 ? d - n : d;
  };

  return (
    <div className={s.carrousel} data-forme={forme} data-grand={grand ? "1" : undefined}>
      <div
        ref={scene}
        className={s.scene}
        role="listbox"
        tabIndex={0}
        aria-label={action}
        aria-activedescendant={`carte-${pieces[actif]?.cle}`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") aller(Math.round(posRef.current) + 1);
          else if (e.key === "ArrowLeft") aller(Math.round(posRef.current) - 1);
          else return;
          e.preventDefault();
        }}
        onPointerDown={(e) => {
          aGlisse.current = false;
          glisse.current = { x: e.clientX, depart: posRef.current, bouge: false };
          traces.current = [{ t: e.timeStamp, x: e.clientX }];
        }}
        onPointerMove={(e) => {
          const g = glisse.current;
          if (!g) return;
          const dx = e.clientX - g.x;
          if (!g.bouge && Math.abs(dx) < 6) return;
          if (!g.bouge) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          g.bouge = true;
          const pts = traces.current;
          pts.push({ t: e.timeStamp, x: e.clientX });
          while (pts.length > 2 && e.timeStamp - pts[0].t > LANCER_FENETRE_MS) pts.shift();
          aller(g.depart - dx / PX_PAR_CARTE, false);
        }}
        onPointerUp={() => {
          aGlisse.current = !!glisse.current?.bouge;
          if (aGlisse.current) relacher();
          glisse.current = null;
        }}
        onPointerCancel={() => {
          glisse.current = null;
          aller(Math.round(posRef.current));
        }}
      >
        <div
          className={s.anneau}
          data-libre={libre ? "1" : undefined}
          style={{
            transform: `translateZ(calc(-1 * ${rayon})) rotateY(${-pos * pas}deg)`,
            ...(elan ? { transition: `transform ${elan}ms cubic-bezier(0.15, 0.8, 0.2, 1)` } : null),
          }}
        >
          {pieces.map((c, i) => {
            // sur un grand anneau (plus de 12 pièces), seules les voisines de devant sont posées
            if (n > PLACES_MAX && Math.abs(ecart(i)) > PLACES_MAX / 2 - 1) return null;
            const devant = i === actif;
            // sur un grand anneau, la place de la pièce la plus proche de devant (stable pendant la rotation)
            const angle = n > PLACES_MAX ? (i + n * Math.round((pos - i) / n)) * pas : i * pas;
            const carte = (
              <>
                <span className={s.recto}>
                  {c.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt="" className={s.photo} draggable={false} />
                  )}
                  <span className={s.coin}>
                    {c.numero}
                    <span className={s.enseigne}>♠</span>
                  </span>
                  <b className={s.code}>{c.code}</b>
                  <span className={s.coinBas}>{c.numero}</span>
                  {devant && c.marque ? (
                    <span className={s.marque}>
                      {c.marque}
                      {conseil === c.cle && (
                        <svg className={s.marqueCercle} viewBox="0 0 120 160" preserveAspectRatio="none" aria-hidden>
                          <use href="#rl-cercle-main" />
                        </svg>
                      )}
                    </span>
                  ) : null}
                </span>
                <span className={s.verso} aria-hidden />
              </>
            );
            return (
              <div
                key={c.cle}
                id={`carte-${c.cle}`}
                role="option"
                aria-selected={devant}
                aria-label={c.titre}
                className={s.place}
                data-devant={devant ? "1" : undefined}
                data-indispo={c.href ? undefined : "1"}
                style={{ transform: `rotateY(${angle}deg) translateZ(${rayon})` }}
              >
                {devant && c.href ? (
                  <Link href={c.href} className={s.carte} draggable={false} onClick={(e) => aGlisse.current && e.preventDefault()}>
                    {carte}
                  </Link>
                ) : (
                  <button type="button" className={s.carte} tabIndex={-1} onClick={() => !aGlisse.current && vers(i)}>
                    {carte}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {p && (
        <p className={s.nom} aria-live="polite">
          {p.titre}
        </p>
      )}
    </div>
  );
}
