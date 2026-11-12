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

const CALAGE_MS = 140;
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
}: {
  pieces: Piece[];
  action: string;
  depart?: number;
  forme?: FormeCarrousel;
  /** appelé avec l'indice de la pièce de devant, à chaque changement (ex. : le bouton « Défier X » du duel) */
  onActif?: (indice: number) => void;
}) {
  const n = pieces.length;
  const places = Math.min(Math.max(1, n), PLACES_MAX);
  const pas = 360 / places;
  const [pos, setPos] = useState(depart);
  const [libre, setLibre] = useState(false);
  const posRef = useRef(depart);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glisse = useRef<{ x: number; depart: number; bouge: boolean } | null>(null);
  /** le dernier geste était un glissement : le clic qui le suit ne doit rien ouvrir */
  const aGlisse = useRef(false);
  const scene = useRef<HTMLDivElement | null>(null);

  const actif = ((Math.round(pos) % n) + n) % n;
  const p = pieces[actif];

  function aller(v: number, transition = true) {
    posRef.current = v;
    setLibre(!transition);
    setPos(v);
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
    <div className={s.carrousel} data-forme={forme}>
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
        }}
        onPointerMove={(e) => {
          const g = glisse.current;
          if (!g) return;
          const dx = e.clientX - g.x;
          if (!g.bouge && Math.abs(dx) < 6) return;
          if (!g.bouge) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          g.bouge = true;
          aller(g.depart - dx / 110, false);
        }}
        onPointerUp={() => {
          aGlisse.current = !!glisse.current?.bouge;
          if (aGlisse.current) aller(Math.round(posRef.current));
          glisse.current = null;
        }}
        onPointerCancel={() => {
          glisse.current = null;
          aller(Math.round(posRef.current));
        }}
      >
        <div className={s.anneau} data-libre={libre ? "1" : undefined} style={{ transform: `translateZ(calc(-1 * ${rayon})) rotateY(${-pos * pas}deg)` }}>
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
