import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { normalizeVisibility, type Visibility } from "@/lib/content/visibility";

// En-tête des pages de contenu (un QCM, un set de flashcards, un document)
// et petits outils d'affichage partagés par les listes : libellés de
// visibilité, titres découpés, rattachement d'un dossier « (Système) » à
// l'une des 10 matières, ligne repliable « Gérer ». Module neutre (pas de
// "use client") : utilisable depuis les pages serveur comme depuis les
// composants client.

/* ------------------------------------------------------------------ */
/* Visibilité                                                          */
/* ------------------------------------------------------------------ */

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  private: "Privé",
  group: "Groupe",
  groups: "Groupes",
  public: "Public",
};

export function visibilityLabel(value: string | null | undefined) {
  return VISIBILITY_LABEL[normalizeVisibility(value)];
}

export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  const cls = visibility === "private" ? "badge-private" : visibility === "public" ? "badge-public" : "badge-shared";
  return <span className={`badge ${cls}`}>{VISIBILITY_LABEL[visibility]}</span>;
}

/* ------------------------------------------------------------------ */
/* Titres et dossiers                                                  */
/* ------------------------------------------------------------------ */

/** Nom de dossier sans son suffixe technique : « Fixed Income (Système) » → « Fixed Income ». */
export function cleanFolderName(name: string | null | undefined): string | null {
  if (!name) return null;
  const clean = name.replace(/\s*\((Système|Systeme|Officiel|System)\)\s*$/i, "").trim();
  return clean || name;
}

export type TitleParts = {
  /** le titre à afficher */
  main: string;
  /** repère court : « Page 3 », « Set 2/4 » */
  lead: string | null;
  kind: "drill" | "set";
  order: number | null;
};

/**
 * Découpe les titres des contenus Système, longs et répétitifs :
 * « FSA — Drill Fiche Page 3 (Inventories) » → Page 3 · Inventories ;
 * « FSA — Flashcards 2/4 (Flux de trésorerie) » → Set 2/4 · Flux de trésorerie.
 * Un titre libre reste tel quel.
 */
export function splitTitle(title: string): TitleParts {
  const t = (title ?? "").trim();
  const drill = /Drill Fiche Page ([0-9]+)(?:\s*\((.+)\))?\s*$/.exec(t);
  if (drill) return { main: drill[2]?.trim() || `Page ${drill[1]}`, lead: `Page ${drill[1]}`, kind: "drill", order: Number(drill[1]) };
  const deck = /Flashcards ([0-9]+)\s*\/\s*([0-9]+)(?:\s*\((.+)\))?\s*$/.exec(t);
  if (deck) return { main: deck[3]?.trim() || t, lead: `Set ${deck[1]}/${deck[2]}`, kind: "set", order: Number(deck[1]) };
  return { main: t, lead: null, kind: "set", order: null };
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n > 1 ? many : one}`;
}

/* ------------------------------------------------------------------ */
/* Les 10 matières du CFA Niveau I                                     */
/* ------------------------------------------------------------------ */

export type CfaSubject = { key: string; name: string; short: string; aliases: string[] };

// Ordre officiel du programme. Les dossiers « (Système) » existent en
// français et en anglais selon le script qui les a créés : on accepte les
// deux noms (comparaison sans accents ni casse).
export const CFA_SUBJECTS: CfaSubject[] = [
  { key: "ethics", name: "Ethics", short: "Ethics", aliases: ["ethics", "ethique et standards professionnels", "ethical and professional standards"] },
  { key: "quant", name: "Quantitative Methods", short: "Quant", aliases: ["quantitative methods", "methodes quantitatives"] },
  { key: "economics", name: "Economics", short: "Economics", aliases: ["economics", "economie"] },
  { key: "corporate", name: "Corporate Issuers", short: "Corporate", aliases: ["corporate issuers", "finance d'entreprise", "entreprise"] },
  { key: "fsa", name: "Financial Statement Analysis", short: "FSA", aliases: ["financial statement analysis", "analyse des etats financiers"] },
  { key: "equity", name: "Equity Investments", short: "Equity", aliases: ["equity", "equity investments", "investissements en actions"] },
  { key: "fixed_income", name: "Fixed Income", short: "Fixed Income", aliases: ["fixed income", "revenu fixe"] },
  { key: "derivatives", name: "Derivatives", short: "Derivatives", aliases: ["derivatives", "instruments derives"] },
  { key: "alternatives", name: "Alternative Investments", short: "Alternatives", aliases: ["alternative investments", "investissements alternatifs"] },
  { key: "portfolio", name: "Portfolio Management", short: "Portfolio", aliases: ["portfolio management", "gestion de portefeuille"] },
];

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .trim();
}

/** Matière d'un dossier « (Système) », en français ou en anglais. */
export function subjectOfFolder(folder: string | null | undefined): CfaSubject | null {
  const base = cleanFolderName(folder);
  if (!base) return null;
  const n = norm(base);
  return CFA_SUBJECTS.find((s) => s.aliases.includes(n)) ?? null;
}

/** Matière d'après le début d'un titre (« Méthodes Quantitatives — Approfondi »). */
export function subjectOfTitle(title: string | null | undefined): CfaSubject | null {
  if (!title) return null;
  const n = norm(title);
  return CFA_SUBJECTS.find((s) => s.aliases.some((a) => n === a || n.startsWith(a + " —") || n.startsWith(a + " -"))) ?? null;
}

/** Matière d'une clé (« fsa ») ou d'un nom de dossier (anciens liens ?subject=…). */
export function subjectFromParam(param: string | null | undefined): CfaSubject | null {
  if (!param) return null;
  return CFA_SUBJECTS.find((s) => s.key === param) ?? subjectOfFolder(param);
}

/* ------------------------------------------------------------------ */
/* Regroupements pour les listes (données sérialisables)               */
/* ------------------------------------------------------------------ */

export type ContentItem = { id: string; title: string; folder: string | null; visibility?: string | null };
export type ItemMeta = { count?: number | null; done?: number | null };

export type BrowserRow = {
  id: string;
  title: string;
  main: string;
  lead: string | null;
  kind: "drill" | "set";
  order: number | null;
  count: number | null;
  done: number | null;
  visibility: string | null;
};

export type BrowserGroup = { key: string; name: string; short: string; rows: BrowserRow[] };

function toRow(it: ContentItem, meta?: ItemMeta): BrowserRow {
  const p = splitTitle(it.title);
  return {
    id: it.id,
    title: it.title,
    main: p.main,
    lead: p.lead,
    kind: p.kind,
    order: p.order,
    count: meta?.count ?? null,
    done: meta?.done ?? null,
    visibility: it.visibility ?? null,
  };
}

function compareRows(a: BrowserRow, b: BrowserRow) {
  if (a.kind !== b.kind) return a.kind === "set" ? -1 : 1;
  if (a.order !== null && b.order !== null && a.order !== b.order) return a.order - b.order;
  return a.title.localeCompare(b.title, "fr", { numeric: true });
}

/**
 * Range des contenus Système par matière, dans l'ordre du programme. Les
 * 10 matières sont toujours présentes (vides = « bientôt ») ; les dossiers
 * qui ne correspondent à aucune matière (« Mocks Officiels »…) suivent.
 */
export function groupBySubject(items: ContentItem[], meta: Record<string, ItemMeta> = {}): BrowserGroup[] {
  const groups = new Map<string, BrowserGroup>();
  for (const s of CFA_SUBJECTS) groups.set(s.key, { key: s.key, name: s.name, short: s.short, rows: [] });
  const extra = new Map<string, BrowserGroup>();
  for (const it of items) {
    const subject = subjectOfFolder(it.folder) ?? subjectOfTitle(it.title);
    const row = toRow(it, meta[it.id]);
    if (subject) {
      groups.get(subject.key)!.rows.push(row);
      continue;
    }
    const name = cleanFolderName(it.folder) ?? "Autres";
    const key = "x-" + norm(name).replace(/[^a-z0-9]+/g, "-");
    if (!extra.has(key)) extra.set(key, { key, name, short: name, rows: [] });
    extra.get(key)!.rows.push(row);
  }
  const out = [...groups.values(), ...[...extra.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"))];
  for (const g of out) g.rows.sort(compareRows);
  return out;
}

/** Range des contenus par dossier (contenu créé par les utilisateurs), « sans dossier » d'abord. */
export function groupByFolder(
  items: ContentItem[],
  rootLabel: string,
  meta: Record<string, ItemMeta> = {},
  extraFolderNames: string[] = []
): BrowserGroup[] {
  const groups = new Map<string, BrowserGroup>();
  const add = (name: string) => {
    if (!groups.has(name)) groups.set(name, { key: "f-" + norm(name).replace(/[^a-z0-9]+/g, "-"), name, short: name, rows: [] });
    return groups.get(name)!;
  };
  for (const name of extraFolderNames) add(cleanFolderName(name) ?? name);
  for (const it of items) add(cleanFolderName(it.folder) ?? rootLabel).rows.push(toRow(it, meta[it.id]));
  const out = [...groups.values()].sort((a, b) =>
    a.name === rootLabel ? -1 : b.name === rootLabel ? 1 : a.name.localeCompare(b.name, "fr")
  );
  for (const g of out) g.rows.sort(compareRows);
  return out;
}

/* ------------------------------------------------------------------ */
/* En-tête d'une page de contenu                                       */
/* ------------------------------------------------------------------ */

export function ContentDetailHeader({
  backHref,
  backLabel,
  title,
  eyebrow,
  meta,
  visibility,
  folderName,
  rightSlot,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  /** petite ligne au-dessus du titre (matière, page…) */
  eyebrow?: string | null;
  /** métadonnées sur une ligne ; par défaut : visibilité · dossier */
  meta?: (string | null | undefined | false)[];
  visibility?: Visibility | string | null;
  folderName?: string | null;
  rightSlot?: ReactNode;
}) {
  const parts = (meta ?? [visibility !== undefined ? visibilityLabel(visibility) : null, cleanFolderName(folderName)]).filter(
    (p): p is string => typeof p === "string" && p.length > 0
  );

  return (
    <header className="flex flex-col gap-5">
      <div className="flex min-h-[34px] items-center justify-between gap-3">
        <Link
          href={backHref}
          className="t-small -ml-1 inline-flex w-fit items-center gap-1 rounded-lg px-1 font-semibold transition-colors hover:text-white"
        >
          <ChevronLeft size={16} aria-hidden />
          {backLabel}
        </Link>
        {rightSlot ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{rightSlot}</div> : null}
      </div>
      <div className="min-w-0">
        {eyebrow && <p className="t-eyebrow mb-3">{eyebrow}</p>}
        <h1 className="t-h1 rl-in m-0 break-words">{title}</h1>
        {parts.length > 0 && <p className="t-micro mt-3">{parts.join(" · ")}</p>}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Ligne repliable (« Gérer », « Toutes les cartes »…) et champ        */
/* ------------------------------------------------------------------ */

/** Une ligne d'une carte « Gérer » : icône, titre, sous-titre ; le contenu se déplie dessous. */
export function DisclosureRow({
  icon,
  title,
  sub,
  children,
  defaultOpen = false,
}: {
  icon?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group" open={defaultOpen || undefined}>
      <summary className="rl-row flex cursor-pointer list-none items-center gap-4 px-5 py-4 md:px-6">
        {icon && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-surface-2">{icon}</span>}
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold leading-tight tracking-[-0.01em]">{title}</span>
          {sub && <span className="t-micro mt-1 block">{sub}</span>}
        </span>
        <ChevronDown size={17} aria-hidden className="shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" />
      </summary>
      <div className="border-t border-line px-5 py-6 md:px-6">{children}</div>
    </details>
  );
}

/** Champ de formulaire : libellé, aide facultative, contrôle. */
export function Field({ label, hint, htmlFor, children }: { label: ReactNode; hint?: ReactNode; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <label htmlFor={htmlFor} className="text-[13.5px] font-semibold leading-tight">
        {label}
        {hint && <span className="t-micro ml-2 font-medium">{hint}</span>}
      </label>
      {children}
    </div>
  );
}
