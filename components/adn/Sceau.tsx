"use client";

// Sceau : un tampon d'encre qui se pose (gestes « tamponner » et « s'étaler »).
// Rouge par défaut : c'est la main du correcteur, qui valide (règle 3).
//
//   <Sceau texte="TENU" sous="3·10" />                     hexagone plein, mots en réserve
//   <Sceau forme="long" texte="Éclair" sous="PLUS RAPIDE · 31:38" />   mention, contour double
//   <SceauJour date={new Date()} />                        « TENU · 3·10 » (journée tenue)
//   <SceauMention mention="sansFaute" detail="ETHICS · 5/5" />
//   <SceauDivision palier="Or" division="I" />
//
// Props communes
//   texte        le mot (Dela Gothic)            sur / sous   petites lignes (Geist Mono)
//   forme        "hex" (jour, division) | "long" (mentions)
//   plein        hexagone plein (défaut) ; long : contour double (défaut false)
//   ton          "pen" (rouge, défaut) | "ink" (noir) | "gaufre" (relief à sec
//                dans le papier, sans encre : pas encore gagné) | "dorure"
//                (dorure à chaud, reflet lent, figé en mouvement réduit)
//   taille       largeur en px (hex 84, long 176), ou "remplir" (slot `sceau` de
//                l'AnneauDuJour)                         angle   inclinaison en degrés
//   pose         true : le coup de tampon joue au montage ; "vue" : à l'arrivée
//                à l'écran ; false : déjà posé (défaut "vue")
//   delai        secondes avant le coup          son   "micro" (défaut, muet par
//                défaut), "ceremonie", ou false
// Un seul sceau par écran, et seulement pour un vrai accomplissement.
// Mouvement réduit : posé d'emblée, sans tache.
// L'hexagone vient des tracés partagés (InkDefs, <use>) : la collection du
// profil en pose 16 par page sans les recopier.

import { useId, useRef } from "react";
import { INK } from "@/components/ui/InkDefs";
import { SEAL_LONG, SEAL_LONG_IN } from "./paths-moments";
import { jouerSon, type SonMoment } from "./sound";
import { EASE_OUT, STAMP_KF, mouvementReduit, useIso } from "./sound-timeline";
import s from "./Sceau.module.css";

export type SceauProps = {
  texte: string;
  sur?: string;
  sous?: string;
  forme?: "hex" | "long";
  plein?: boolean;
  ton?: "pen" | "ink" | "gaufre" | "dorure";
  /** largeur en px, ou "remplir" : la largeur de son conteneur (slot de l'anneau du jour) */
  taille?: number | "remplir";
  angle?: number;
  pose?: boolean | "vue";
  delai?: number;
  son?: SonMoment | false;
  className?: string;
  title?: string;
};

// largeur approximative d'un texte (en em) : Dela Gothic est large, Geist Mono régulière
const largeurDela = (t: string) => Array.from(t).reduce((w, c) => w + (c === " " ? 0.32 : c === "·" ? 0.4 : /[IJ1]/.test(c) ? 0.5 : /[MWÆŒ]/.test(c) ? 1.02 : /[a-zà-ÿ]/.test(c) ? 0.66 : 0.82), 0);
const largeurMono = (t: string, ls: number) => t.length * (0.6 + ls);

export function Sceau({
  texte,
  sur,
  sous,
  forme = "hex",
  plein,
  ton = "pen",
  taille,
  angle,
  pose = "vue",
  delai = 0,
  son = "micro",
  className = "",
  title,
}: SceauProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const box = useRef<HTMLSpanElement | null>(null);
  const tache = useRef<HTMLSpanElement | null>(null);
  const long = forme === "long";
  const solid = plein ?? !long;
  const remplir = taille === "remplir";
  const w = typeof taille === "number" ? taille : long ? 176 : 84;
  const h = long ? (w * 100) / 240 : w;
  const rot = angle ?? (long ? -3 : -7);
  // grain décalé d'un sceau à l'autre : chaque impression est unique
  const seed = Array.from(texte + (sous ?? "")).reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7);

  useIso(() => {
    const el = box.current;
    if (!el || pose === false || mouvementReduit()) return;
    let anims: Animation[] = [];
    let timer = 0;
    const go = () => {
      anims = [
        el.animate(STAMP_KF, { duration: 420, delay: delai * 1000, easing: EASE_OUT, fill: "backwards" }),
        ...(tache.current
          ? [
              tache.current.animate(
                [
                  { opacity: 1, transform: "scale(.45)" },
                  { opacity: 0, transform: "scale(1.25)" },
                ],
                { duration: 900, delay: delai * 1000 + 160, easing: EASE_OUT },
              ),
            ]
          : []),
      ];
      if (son) timer = window.setTimeout(() => jouerSon("tampon", { moment: son }), delai * 1000 + 170);
    };
    if (pose === true) {
      go();
      return () => {
        anims.forEach((a) => a.cancel());
        clearTimeout(timer);
      };
    }
    // « vue » : caché jusqu'à l'arrivée à l'écran, puis le coup de tampon
    const hold = el.animate([{ opacity: 0 }, { opacity: 0 }], { duration: 1, fill: "forwards" });
    const io = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.isIntersecting)) return;
        io.disconnect();
        hold.cancel();
        go();
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      hold.cancel();
      anims.forEach((a) => a.cancel());
      clearTimeout(timer);
    };
  }, [pose, delai, son]);

  const label = title ?? [sur, texte, sous].filter(Boolean).join(" · ");
  const mask = `${uid}m`;

  // mise en page du texte dans le repère du tracé
  let body: React.ReactNode;
  if (!long) {
    // hexagone 120 × 120 : zone utile ~ 78 de large
    const avail = 60;
    const fs = Math.min(sur ? 34 : 24, avail / Math.max(1, largeurDela(texte)));
    const yMain = sur ? (sous ? 71 : 78) : sous ? 62 : 69;
    const fsSmall = (t: string) => Math.min(15, 66 / Math.max(1, largeurMono(t, 0.06)));
    body = (
      <>
        {sur ? (
          <text x={60} y={sous ? 42 : 46} textAnchor="middle" className={s.mono} fontSize={fsSmall(sur)} letterSpacing={0.8}>
            {sur}
          </text>
        ) : null}
        <text x={60} y={yMain} textAnchor="middle" className={s.txt} fontSize={fs}>
          {texte}
        </text>
        {sous ? (
          <text x={60} y={sur ? 90 : 83} textAnchor="middle" className={s.mono} fontSize={fsSmall(sous)} letterSpacing={0.8}>
            {sous}
          </text>
        ) : null}
      </>
    );
  } else {
    // allongé 240 × 100 : zone utile ~ 168 × 60
    const fs = Math.min(sous ? 30 : 36, 158 / Math.max(1, largeurDela(texte)));
    const fsSous = Math.min(13.5, 158 / Math.max(1, largeurMono(sous ?? "", 0.1)));
    body = (
      <>
        <text x={120} y={sous ? 55 : 63} textAnchor="middle" className={s.txt} fontSize={fs}>
          {texte}
        </text>
        {sous ? (
          <text x={120} y={77} textAnchor="middle" className={s.mono} fontSize={fsSous} letterSpacing={1.3}>
            {sous}
          </text>
        ) : null}
      </>
    );
  }

  const vb = long ? "0 0 240 100" : "0 0 120 120";
  // le contour et le filet : partagés (InkDefs) pour l'hexagone, en ligne pour l'allongé
  type Trait = { fill?: string; stroke?: string; strokeWidth?: number; strokeLinejoin?: "round"; mask?: string };
  const outer = (p: Trait) => (long ? <path d={SEAL_LONG} {...p} /> : <use href={INK.sealHex} {...p} />);
  const inner = (p: Trait) => (long ? <path d={SEAL_LONG_IN} {...p} /> : <use href={INK.sealHexIn} {...p} />);
  // dorure : un dégradé d'or, et un reflet qui passe lentement (CSS : figé en mouvement réduit)
  const dore = ton === "dorure";
  const encre = dore ? `url(#${uid}o)` : "currentColor";
  const or = dore ? (
    <>
      <linearGradient id={`${uid}o`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F7E19A" />
        <stop offset=".48" stopColor="#D7A640" />
        <stop offset="1" stopColor="#8C5E16" />
      </linearGradient>
      <linearGradient id={`${uid}r`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity={0} />
        <stop offset=".5" stopColor="#fff" stopOpacity={0.7} />
        <stop offset="1" stopColor="#fff" stopOpacity={0} />
      </linearGradient>
      <clipPath id={`${uid}c`}>{outer({})}</clipPath>
    </>
  ) : null;
  const reflet = dore ? (
    <polygon className={s.reflet} points={`26,-10 52,-10 26,${long ? 110 : 130} 0,${long ? 110 : 130}`} fill={`url(#${uid}r)`} clipPath={`url(#${uid}c)`} style={{ ["--fin" as string]: long ? "260px" : "150px" }} />
  ) : null;
  const tonClasse = ton === "ink" ? s.ink : ton === "gaufre" ? s.gaufre : dore ? s.dorure : "";
  return (
    <span
      ref={box}
      role="img"
      aria-label={label}
      className={`${s.sceau} ${tonClasse} ${className}`}
      style={{ ...(remplir ? { width: "100%", height: "auto", aspectRatio: long ? "240 / 100" : "1 / 1" } : { width: w, height: h }), rotate: `${rot}deg`, ["--gx" as string]: `${-(seed % 90)}px`, ["--gy" as string]: `${-((seed * 7) % 90)}px` }}
    >
      <span ref={tache} aria-hidden className={`${s.tache} rl-deco`} />
      <span aria-hidden className={s.encre}>
        <svg viewBox={vb} aria-hidden>
          {solid ? (
            <>
              <defs>
                {/* les mots et le filet sont en réserve : le papier transparaît */}
                <mask id={mask} maskUnits="userSpaceOnUse" x={-10} y={-10} width={long ? 260 : 140} height={long ? 120 : 140}>
                  <rect x={-10} y={-10} width={long ? 260 : 140} height={long ? 120 : 140} fill="#fff" />
                  <g fill="#000">{body}</g>
                  {inner({ fill: "none", stroke: "#000", strokeWidth: long ? 2.4 : 2.6, strokeLinejoin: "round" })}
                </mask>
                {or}
              </defs>
              <g mask={`url(#${mask})`}>
                {outer({ fill: encre })}
                {reflet}
              </g>
            </>
          ) : (
            <>
              {or && <defs>{or}</defs>}
              {outer({ fill: "none", stroke: encre, strokeWidth: long ? 6 : 6.5, strokeLinejoin: "round" })}
              {inner({ fill: "none", stroke: encre, strokeWidth: long ? 1.8 : 2, strokeLinejoin: "round" })}
              <g fill={encre}>{body}</g>
            </>
          )}
        </svg>
      </span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Variantes prêtes à l'emploi

/** « TENU · 3·10 » : la journée tenue, posée dans l'ouverture de l'anneau du jour. */
export function SceauJour({ date, ...p }: { date: Date | string } & Omit<SceauProps, "texte" | "sous">) {
  const d = typeof date === "string" ? new Date(date) : date;
  const jm = Number.isNaN(d.getTime()) ? "" : `${d.getDate()}·${d.getMonth() + 1}`;
  return <Sceau texte="TENU" sous={jm || undefined} title={`Journée tenue${jm ? ` le ${d.getDate()}/${d.getMonth() + 1}` : ""}`} {...p} />;
}

export type MentionDuel = "eclair" | "sansFaute" | "remontada" | "sangFroid";

export const MENTIONS: Record<MentionDuel, { mot: string; sous: string; dit: string }> = {
  eclair: { mot: "Éclair", sous: "LE PLUS RAPIDE", dit: "Éclair : le plus rapide" },
  sansFaute: { mot: "Sans faute", sous: "UNE MATIÈRE", dit: "Sans faute : une matière à 100 %" },
  remontada: { mot: "Remontada", sous: "MENÉ, PUIS GAGNÉ", dit: "Remontada : mené, puis gagné" },
  sangFroid: { mot: "Sang-froid", sous: "LES 5 DERNIÈRES", dit: "Sang-froid : les 5 dernières justes" },
};

/** Mention de fin de duel (deux au plus par duel), sceau allongé. */
export function SceauMention({ mention, detail, ...p }: { mention: MentionDuel; detail?: string } & Omit<SceauProps, "texte" | "sous" | "forme">) {
  const m = MENTIONS[mention];
  return <Sceau forme="long" texte={m.mot} sous={detail ? detail.toUpperCase() : m.sous} title={detail ? `${m.mot} : ${detail}` : m.dit} {...p} />;
}

/** Division gagnée : « OR » au-dessus, le chiffre romain au centre. */
export function SceauDivision({ palier, division, ...p }: { palier: string; division: string } & Omit<SceauProps, "texte" | "sur">) {
  return <Sceau sur={palier.toUpperCase()} texte={division} title={`${palier} ${division}`} {...p} />;
}
