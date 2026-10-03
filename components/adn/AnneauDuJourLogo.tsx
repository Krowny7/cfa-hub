"use client";

import { useEffect, useId, useRef, useState } from "react";
import { INK } from "@/components/ui/InkDefs";
import { anneau as voixAnneau } from "@/lib/voice";
import { axis } from "@/components/adn/AnneauDuJourGeo";
import { EVT_ANNEAU, EVT_TRAIT, OBJECTIF_DU_JOUR } from "@/components/adn/AnneauDuJourEvents";

const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });

/**
 * Le logo vivant de la barre du haut : l'anneau du logo suit la journée,
 * comme les Glyphs de Nothing. Le pinceau s'arrête au nombre de traits du
 * jour ; à l'objectif, c'est le logo exact, et le correcteur y pose son
 * petit sceau rouge dans l'ouverture (règle 3 : il corrige et il valide).
 * Sans réponse aujourd'hui : la piste et la goutte, prêtes.
 *
 * Props :
 * - `repondues` : traits du jour lus par le serveur ; null = inconnu (pas
 *   connecté, lecture en échec) → le logo plein, comme avant
 * - `objectif` : objectif du jour (défaut 40)
 * - `size` : taille de l'anneau en px (défaut 26)
 * - `landing` : point d'atterrissage de l'intro (components/Splash.tsx)
 * - `vivant` : écoute les traits posés ailleurs (défaut true ; false pour
 *   une simple illustration)
 *
 * Il avance tout seul quand une page appelle poserTrait() ou caleAnneau()
 * (components/adn/AnneauDuJourEvents.ts). Au survol ou au focus du lien
 * parent (classe `group`), une étiquette donne le compte : « 26/40 · encore 14 ».
 */
export function AnneauDuJourLogo({
  repondues,
  objectif = OBJECTIF_DU_JOUR,
  size = 26,
  landing = false,
  vivant = true,
}: {
  repondues: number | null;
  objectif?: number;
  size?: number;
  landing?: boolean;
  vivant?: boolean;
}) {
  const [n, setN] = useState<number | null>(repondues);
  // le sceau ne se tamponne que si la journée devient tenue sous nos yeux
  const [vientDeTenir, setVientDeTenir] = useState(false);
  const day = useRef<string>("");
  const maskId = "rl-logo-" + useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    setN(repondues);
  }, [repondues]);

  useEffect(() => {
    if (!vivant) return;
    day.current = DAY.format(new Date());
    // passé minuit (onglet resté ouvert), la journée repart de zéro
    const base = (v: number | null) => {
      const d = DAY.format(new Date());
      if (d !== day.current) {
        day.current = d;
        return 0;
      }
      return v ?? 0;
    };
    const onTrait = (e: Event) => {
      const k = Number((e as CustomEvent<{ n?: number }>).detail?.n ?? 1);
      if (k > 0)
        setN((v) => {
          const before = base(v);
          if (before < objectif && before + k >= objectif) setVientDeTenir(true);
          return before + k;
        });
    };
    const onAnneau = (e: Event) => {
      const r = Number((e as CustomEvent<{ repondues?: number }>).detail?.repondues);
      if (Number.isFinite(r) && r >= 0) {
        day.current = DAY.format(new Date());
        setN(r);
      }
    };
    window.addEventListener(EVT_TRAIT, onTrait);
    window.addEventListener(EVT_ANNEAU, onAnneau);
    return () => {
      window.removeEventListener(EVT_TRAIT, onTrait);
      window.removeEventListener(EVT_ANNEAU, onAnneau);
    };
  }, [vivant, objectif]);

  const g = Math.max(1, objectif);
  const known = n !== null;
  const count = n ?? 0;
  const v = voixAnneau(count, g);
  const tenu = known && count >= g;
  const vide = known && count === 0;
  // part du trait du logo couverte (axe en pathLength 100) ; inconnu = logo plein
  const p = !known || tenu ? 100 : Math.max(2.5, (count / g) * 100);

  return (
    <>
      <svg
        viewBox="0 0 240 240"
        width={size}
        height={size}
        aria-hidden
        className="rl-deco shrink-0 overflow-visible"
        data-rl-logo={landing ? "" : undefined}
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x={-30} y={-30} width={300} height={300}>
            {!vide && (
              <path
                d={axis()}
                pathLength={100}
                fill="none"
                stroke="#fff"
                strokeWidth={48}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={known && !tenu ? "rl-halo rl-touch" : "rl-touch"}
                style={{ strokeDasharray: `${p.toFixed(2)} 140`, animationDelay: ".15s", animationDuration: ".55s" }}
              />
            )}
          </mask>
        </defs>
        <use href={INK.logoTrack} fill="none" stroke="currentColor" strokeOpacity={vide ? 0.3 : 0.16} strokeWidth={9} strokeLinejoin="round" />
        {!vide && (
          <g mask={`url(#${maskId})`}>
            <use href={INK.logoBrush} fill="currentColor" />
            <use href={INK.logoBristles} fill="currentColor" />
          </g>
        )}
        {/* la goutte : chargée au départ quand rien n'est encore tracé, éclaboussée à l'objectif */}
        {(vide || tenu || !known) && <use href={INK.logoSplat} fill="currentColor" />}
        {/* rien encore : la goutte posée au départ du trait */}
        {vide && <circle cx={122} cy={32} r={14} fill="currentColor" />}
        {/* le sceau du correcteur, dans l'ouverture : journée tenue */}
        {tenu && (
          <g className={vientDeTenir ? "rl-stamp" : undefined} style={{ transformOrigin: "60px 62px", transformBox: "view-box" }}>
            <rect x={38} y={40} width={44} height={44} rx={8} transform="rotate(-11 60 62)" fill="var(--pen)" />
            <rect x={47} y={49} width={26} height={26} rx={4} transform="rotate(-11 60 62)" fill="none" stroke="var(--paper)" strokeWidth={5} />
          </g>
        )}
      </svg>
      {known && <span className="sr-only">{`, ${v.aria}`}</span>}
      {known && (
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-[calc(100%+12px)] z-10 whitespace-nowrap rounded-[9px] border border-line px-2.5 py-1.5 font-mono text-[11px] font-medium tracking-[0.01em] text-muted opacity-0 shadow-[var(--shadow-1)] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{ background: "var(--surface-3)" }}
        >
          <span className="font-semibold text-white">Anneau du jour</span> · {v.compte}
          {v.reste ? (
            <>
              {" · "}
              <span style={{ color: "var(--pen)" }}>{v.reste}</span>
            </>
          ) : (
            " · journée tenue"
          )}
        </span>
      )}
    </>
  );
}
