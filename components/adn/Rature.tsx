"use client";

// L'erreur rayée (moment 6) : quand une question du carnet d'erreurs est
// enfin juste, on la raye d'un trait de pinceau noir ; on n'efface rien.
//
//   <Rature rayee={ok}>Modified duration and convexity…</Rature>
//      un trait de pinceau par ligne du texte ; il se trace (0,35 s,
//      « scritch ») quand `rayee` passe à true ; déjà rayée au montage :
//      posée sans geste. trait "a" | "b" : deux gestes, alternés d'une ligne à l'autre
//   <CompteurBarre avant={12} apres={11} libelle="à reprendre" />
//      11 en grand, l'ancien 12 rayé à côté ; taille = corps du grand chiffre
//   <ChiffreRaye valeur="12" />
//      dans une ligne de texte : l'ancien chiffre, rayé au corps de la ligne
//   <RatureBandeau reste={11} rateeLe="28 sept." />
//      le bandeau du quiz : « Rayée de ton carnet · plus que 11 » ; il se
//      retire seul après `duree` ms (défaut 2600 ; 0 = reste), sans jamais
//      bloquer (pointer-events: none). onFin à la sortie.
// Sons coupés par défaut (moment fréquent : « micro »). Mouvement réduit :
// tout est posé.

import { useEffect, useId, useRef, useState } from "react";
import { RATURE } from "@/lib/voice";
import { RATURE_A, RATURE_B, RATURE_NUM } from "./paths-moments";
import { jouerSon, type SonMoment } from "./sound";
import { EASE_INK, EASE_OUT, mouvementReduit, useIso } from "./sound-timeline";
import s from "./Rature.module.css";

/** Trait de pinceau révélé par un masque (vrai <path> animé dans le masque). */
function TraitMasque({
  d,
  vb,
  axe,
  className,
  axisRef,
  refCb,
  style,
}: {
  d: string;
  vb: string;
  axe: string;
  className?: string;
  axisRef: React.RefObject<SVGPathElement | null>;
  refCb?: (el: SVGPathElement | null) => void;
  style?: React.CSSProperties;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [, , w, h] = vb.split(" ").map(Number);
  return (
    <svg viewBox={vb} preserveAspectRatio="none" aria-hidden className={className} style={style}>
      <defs>
        <mask id={`${id}r`} maskUnits="userSpaceOnUse" x={-10} y={-h} width={w + 20} height={h * 3}>
          <path
            ref={(el) => {
              axisRef.current = el;
              refCb?.(el);
            }}
            d={axe}
            fill="none"
            stroke="#fff"
            strokeWidth={h * 1.8}
            pathLength={100}
            strokeDasharray="100 100"
          />
        </mask>
      </defs>
      <path d={d} fill="currentColor" mask={`url(#${id}r)`} />
    </svg>
  );
}

const tracer = (el: SVGPathElement | null, delay: number, dur: number) =>
  el?.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: dur * 1000, delay: delay * 1000, easing: EASE_INK, fill: "backwards" });

export function Rature({
  rayee,
  children,
  trait = "a",
  son = "micro",
  className = "",
}: {
  rayee: boolean;
  children: React.ReactNode;
  trait?: "a" | "b";
  son?: SonMoment | false;
  className?: string;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  const txt = useRef<HTMLSpanElement | null>(null);
  const axes = useRef<(SVGPathElement | null)[]>([]);
  const bloc = useRef<SVGPathElement | null>(null);
  const [lignes, setLignes] = useState<{ x: number; y: number; w: number; h: number }[] | null>(null);
  const avant = useRef(rayee);
  const aTracer = useRef(false);

  // une rayure par ligne du texte (mesurée, et remesurée si la largeur change)
  useIso(() => {
    if (!rayee) {
      setLignes(null);
      return;
    }
    const mesure = () => {
      const b = box.current?.getBoundingClientRect();
      const rs = txt.current?.getClientRects();
      if (!b || !rs) return;
      const out: { x: number; y: number; w: number; h: number }[] = [];
      for (const r of Array.from(rs)) {
        if (r.width < 4) continue;
        const last = out[out.length - 1];
        if (last && Math.abs(last.y - (r.top - b.top)) < 3) {
          last.w = Math.max(last.x + last.w, r.right - b.left) - last.x;
          continue;
        }
        out.push({ x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height });
      }
      setLignes((prev) => (prev && JSON.stringify(prev) === JSON.stringify(out) ? prev : out.slice(0, 6)));
    };
    mesure();
    const ro = new ResizeObserver(mesure);
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, [rayee]);

  // le geste ne joue que si la ligne se raye sous nos yeux
  useIso(() => {
    const etait = avant.current;
    avant.current = rayee;
    if (!rayee || etait) return;
    if (son) jouerSon("stylo", { variante: "rature", moment: son });
    if (!mouvementReduit()) aTracer.current = true;
  }, [rayee, son]);
  useIso(() => {
    if (!aTracer.current || !lignes) return;
    aTracer.current = false;
    const n = Math.max(1, lignes.length);
    const anims = axes.current.slice(0, n).map((el, i) => tracer(el, (i * 0.26) / n, 0.34 / Math.sqrt(n)));
    return () => anims.forEach((a) => a?.cancel());
  }, [lignes]);

  return (
    <div ref={box} className={`${s.ligne} ${className}`} data-rayee={rayee ? "1" : "0"}>
      <span ref={txt} className={s.contenu}>
        {children}
      </span>
      {rayee && lignes
        ? lignes.map((l, i) => {
            const hS = Math.max(9, l.h * 0.78);
            return (
              <TraitMasque
                key={i}
                d={(i % 2 ? trait === "a" : trait === "b") ? RATURE_B : RATURE_A}
                vb="0 0 400 24"
                axe="M2 12 L398 12"
                axisRef={{ current: null }}
                refCb={(el) => (axes.current[i] = el)}
                className={s.traitLigne}
                style={{ left: l.x - 5, top: l.y + l.h * 0.56 - hS / 2, width: l.w + 10, height: hS }}
              />
            );
          })
        : null}
      {/* avant la mesure (rendu serveur) : une rayure sur la première ligne */}
      {rayee && !lignes ? <TraitMasque d={trait === "a" ? RATURE_A : RATURE_B} vb="0 0 400 24" axe="M2 12 L398 12" axisRef={bloc} className={s.trait} /> : null}
      {rayee ? <span className="sr-only">(rayée)</span> : null}
    </div>
  );
}

export function CompteurBarre({
  avant,
  apres,
  libelle,
  taille = 48,
  anime = true,
  className = "",
}: {
  avant: number;
  apres: number;
  libelle?: string;
  taille?: number;
  anime?: boolean;
  className?: string;
}) {
  const axis = useRef<SVGPathElement | null>(null);
  const neuf = useRef<HTMLSpanElement | null>(null);
  const change = avant !== apres;
  useIso(() => {
    if (!anime || !change || mouvementReduit()) return;
    const a = [
      tracer(axis.current, 0.05, 0.3),
      neuf.current?.animate(
        [
          { opacity: 0, transform: "translateY(-0.18em)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 300, delay: 220, easing: EASE_OUT, fill: "backwards" },
      ),
    ];
    return () => a.forEach((x) => x?.cancel());
  }, [anime, change, avant, apres]);
  return (
    <span className={`${s.compteur} ${className}`} style={{ ["--kb-fs" as string]: `${taille}px` }} aria-label={`${apres}${libelle ? " " + libelle : ""}, avant ${avant}`}>
      <span ref={neuf} className={s.neuf} aria-hidden>
        {apres}
      </span>
      {change ? (
        <span className={s.ancien} aria-hidden>
          {avant}
          <TraitMasque d={RATURE_NUM} vb="0 0 100 30" axe="M2 16 L98 16" axisRef={axis} />
        </span>
      ) : null}
      {libelle ? (
        <span className={s.libelle} aria-hidden>
          {libelle}
        </span>
      ) : null}
    </span>
  );
}

export function ChiffreRaye({ valeur, anime = true }: { valeur: string; anime?: boolean }) {
  const axis = useRef<SVGPathElement | null>(null);
  useIso(() => {
    if (!anime || mouvementReduit()) return;
    const a = tracer(axis.current, 0.05, 0.3);
    return () => a?.cancel();
  }, [anime]);
  return (
    <span className={s.chiffre}>
      {valeur}
      <TraitMasque d={RATURE_NUM} vb="0 0 100 30" axe="M2 16 L98 16" axisRef={axis} />
    </span>
  );
}

export function RatureBandeau({
  reste,
  rateeLe,
  duree = 2600,
  son = "micro",
  onFin,
  className = "",
}: {
  reste: number;
  /** « 28 sept. » : la date de l'erreur, si on la connaît */
  rateeLe?: string | null;
  duree?: number;
  son?: SonMoment | false;
  onFin?: () => void;
  className?: string;
}) {
  const box = useRef<HTMLDivElement | null>(null);
  const axis = useRef<SVGPathElement | null>(null);
  const [parti, setParti] = useState(false);
  const fin = useRef(onFin);
  fin.current = onFin;

  useIso(() => {
    const reduit = mouvementReduit();
    const anims: (Animation | undefined)[] = [];
    if (!reduit) {
      anims.push(
        box.current?.animate(
          [
            { opacity: 0, transform: "translateY(8px) scale(.98)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 200, easing: EASE_OUT, fill: "backwards" },
        ),
        tracer(axis.current, 0.08, 0.35),
      );
    }
    if (son) jouerSon("stylo", { variante: "rature", moment: son, dans: 0.08 });
    return () => anims.forEach((a) => a?.cancel());
  }, [son]);

  useEffect(() => {
    if (!duree) return;
    const t = window.setTimeout(() => {
      const el = box.current;
      const out = mouvementReduit() ? null : el?.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(4px)" }], { duration: 260, easing: EASE_OUT, fill: "forwards" });
      const done = () => {
        setParti(true);
        fin.current?.();
      };
      if (out) out.onfinish = done;
      else done();
    }, duree);
    return () => window.clearTimeout(t);
  }, [duree]);

  if (parti) return null;
  const [titre, ...suite] = RATURE.rayee(reste).split(" · ");
  const sous = [rateeLe ? `ratée le ${rateeLe}, juste aujourd'hui` : null, suite.join(" · ") || null].filter(Boolean).join(" · ");
  return (
    <div ref={box} role="status" aria-live="polite" className={`${s.bandeau} ${className}`}>
      <TraitMasque d={RATURE_NUM} vb="0 0 100 30" axe="M2 16 L98 16" axisRef={axis} />
      <div>
        <div className={s.titre}>{titre}</div>
        {sous ? <div className={s.sous}>{sous}</div> : null}
      </div>
    </div>
  );
}
