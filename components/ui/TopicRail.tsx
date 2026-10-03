"use client";

import Link from "next/link";
import { Copy, FileText, Headphones } from "lucide-react";
import { HScroll } from "@/components/ui/HScroll";
import { SubjectGlyph } from "@/components/ui/SubjectGlyph";
import { INK } from "@/components/ui/InkDefs";

// Sélecteur horizontal des matières d'un programme (les 10 du CFA Niveau I) :
// une carte par matière, chacune avec son visage (rang dans le programme,
// glyphe maison, code en Dela Gothic), sa maîtrise en trait de pinceau qui
// se remplit, une ligne d'info au choix et, pour Réviser, les formats
// disponibles. Noir et blanc : la couleur reste aux rangs. Deux usages :
// - sélection (`onSelect`) : la carte choisie passe à l'encre, la page
//   montre le détail de la matière (composant client uniquement) ;
// - navigation (`href` sur chaque matière) : chaque carte est un lien.
// Les données arrivent toutes prêtes (voir components/reviser/rail.ts).

export type TopicRailItem = {
  key: string;
  /** rang dans le programme officiel, 1–10 */
  index: number;
  name: string;
  /** code court (FSA, EQ…) */
  code: string;
  /** maîtrise 0–100, null = pas encore mesurée */
  pct: number | null;
  /** formats disponibles (Réviser) : à l'encre s'ils existent, en filigrane sinon */
  formats?: { fiche: boolean; course: boolean; cards: boolean } | null;
  /** une ligne discrète sous le chiffre (« moy. 62 % », « 17,5 % de l'examen ») */
  note?: string | null;
  /** repère sur la barre (moyenne des joueurs, 0–100) */
  mark?: number | null;
  /** lien de la carte (mode navigation) */
  href?: string | null;
};

const WEAK_BELOW = 50;
const pad2 = (n: number) => String(n).padStart(2, "0");

const FORMAT_LABELS = { fiche: "fiche", course: "cours", cards: "cartes" } as const;

function formatsLabel(f: NonNullable<TopicRailItem["formats"]>) {
  const on = (Object.keys(FORMAT_LABELS) as (keyof typeof FORMAT_LABELS)[]).filter((k) => f[k]).map((k) => FORMAT_LABELS[k]);
  return on.length ? on.join(", ") : "contenus à venir";
}

/**
 * Maîtrise en trait de pinceau : le tracé complet en filigrane, puis l'encre
 * qui le remplit jusqu'au pourcentage (le même trait que sous les titres).
 * Le repère fin marque la moyenne des joueurs.
 */
function BrushMeter({ pct, mark, on, delay }: { pct: number | null; mark?: number | null; on: boolean; delay: number }) {
  return (
    <span className="relative block h-[9px] min-w-0 flex-1">
      <svg viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden className={"absolute inset-0 h-full w-full " + (on ? "opacity-25" : "opacity-[0.11]")}>
        <use href={INK.swash} fill="currentColor" />
      </svg>
      {pct !== null && pct > 0 && (
        <span className="rl-grow absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%`, animationDelay: `${delay}s` }}>
          <svg viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden className="absolute inset-y-0 left-0 h-full max-w-none" style={{ width: `${10000 / pct}%` }}>
            <use href={INK.swash} fill="currentColor" />
          </svg>
        </span>
      )}
      {mark != null && (
        <span
          aria-hidden
          className={"absolute -bottom-[3px] -top-[3px] w-[2px] -translate-x-1/2 rounded-full " + (on ? "bg-black/55" : "bg-[var(--ink-3)]")}
          style={{ left: `${Math.max(2, Math.min(98, mark))}%` }}
        />
      )}
    </span>
  );
}

function Card({ it, i, on }: { it: TopicRailItem; i: number; on: boolean }) {
  const sub = on ? "text-black/60" : "text-muted";
  return (
    <span className="flex h-full flex-col p-3.5 sm:p-[18px]">
      {/* le visage de la matière : son rang, son glyphe, son code */}
      <span className="flex items-start justify-between gap-2">
        <span className={"font-mono text-[11px] font-semibold tracking-[0.06em] tabular-nums " + sub}>{pad2(it.index)}</span>
        <SubjectGlyph subject={it.key} size={24} className={"-mr-0.5 -mt-0.5 " + (on ? "" : "opacity-90")} />
      </span>
      <span className="font-brand mt-2.5 block text-[28px] leading-[0.95] sm:text-[31px]">{it.code}</span>
      <span className={"mt-2 line-clamp-3 min-h-[2.6em] text-[13px] sm:line-clamp-2 font-semibold leading-[1.3] tracking-[-0.006em] " + (on ? "text-black/85" : "text-body")}>{it.name}</span>

      <span className="mt-auto block pt-4">
        <span className="flex items-center gap-2.5">
          <BrushMeter pct={it.pct} mark={it.mark} on={on} delay={0.25 + i * 0.04} />
          <span className={"shrink-0 font-mono text-[12.5px] font-semibold tabular-nums " + (it.pct === null ? sub : "")}>{it.pct === null ? "—" : `${it.pct} %`}</span>
        </span>
        {it.formats ? (
          <span className={"mt-2 flex items-center gap-2 " + sub} aria-hidden>
            <FileText size={13} className={it.formats.fiche ? "" : "opacity-30"} />
            <Headphones size={13} className={it.formats.course ? "" : "opacity-30"} />
            <Copy size={13} className={it.formats.cards ? "" : "opacity-30"} />
          </span>
        ) : (
          <span className={"t-micro mt-1.5 line-clamp-2 " + sub}>{it.note ?? (it.pct === null ? "pas commencé" : " ")}</span>
        )}
      </span>
    </span>
  );
}

export function TopicRail({
  items,
  label,
  selected,
  onSelect,
  actionLabel,
  controls,
  surface = "card",
  bleed = "page",
  className = "",
}: {
  items: TopicRailItem[];
  /** nom de la rangée (lecteurs d'écran) */
  label: string;
  /** clé de la matière choisie (mode sélection) */
  selected?: string | null;
  onSelect?: (key: string) => void;
  /** préfixe du nom accessible des liens (« Session ciblée ») */
  actionLabel?: string;
  /** id du panneau piloté par la sélection */
  controls?: string;
  /** « card » sur le papier, « quiet » à l'intérieur d'une carte */
  surface?: "card" | "quiet";
  bleed?: React.ComponentProps<typeof HScroll>["bleed"];
  className?: string;
}) {
  const quiet = surface === "quiet";
  const focusIndex = selected ? items.findIndex((it) => it.key === selected) : -1;

  return (
    <HScroll label={label} bleed={bleed} focusIndex={focusIndex} itemClassName={quiet ? "w-[138px] sm:w-[196px]" : "w-[154px] sm:w-[204px]"} gapClassName="gap-2.5 sm:gap-3.5" className={className}>
      {items.map((it, i) => {
        const on = it.key === selected;
        // Survol propre à la rangée (pas .rl-lift) : son ombre reste assez
        // courte pour ne pas être coupée par le cadre de défilement.
        const base =
          "group/topic block h-full w-full rounded-[18px] text-left transition-[background-color,color,box-shadow,translate,scale] duration-300 ease-[var(--ease-out)] active:scale-[0.98] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 ";
        const look = on
          ? "border border-white bg-white text-black shadow-[0_12px_22px_-12px_rgba(17,17,17,0.55)]"
          : quiet
            ? "card-quiet hover:-translate-y-0.5 hover:bg-surface hover:shadow-[inset_0_0_0_1px_var(--line),0_12px_24px_-14px_rgba(17,17,17,0.22)]"
            : "card hover:-translate-y-0.5 hover:shadow-[var(--edge),0_1px_2px_rgba(17,17,17,0.04),0_14px_26px_-14px_rgba(17,17,17,0.26)]";
        const desc = [
          `${pad2(it.index)}, ${it.name}`,
          it.pct === null ? "maîtrise pas encore mesurée" : `maîtrise ${it.pct} %${it.pct < WEAK_BELOW ? ", à renforcer" : ""}`,
          it.note,
          it.mark != null && !it.note?.includes("moy") ? `moyenne des joueurs ${it.mark} %` : null,
          it.formats ? formatsLabel(it.formats) : null,
        ]
          .filter(Boolean)
          .join(" · ");

        if (onSelect) {
          return (
            <button
              key={it.key}
              type="button"
              aria-pressed={on}
              aria-controls={controls}
              aria-label={desc}
              onClick={() => onSelect(it.key)}
              className={base + look + " min-h-[184px] sm:min-h-[196px]"}
            >
              <Card it={it} i={i} on={on} />
            </button>
          );
        }
        return (
          <Link
            key={it.key}
            href={it.href ?? "#"}
            aria-label={actionLabel ? `${actionLabel} : ${desc}` : desc}
            className={base + look + " min-h-[184px] sm:min-h-[196px]"}
          >
            <Card it={it} i={i} on={false} />
          </Link>
        );
      })}
    </HScroll>
  );
}
