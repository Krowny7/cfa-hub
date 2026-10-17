// Les trophées : la Salle des trophées. Un trophée récompense une
// performance de qualité, jamais un volume ; il se compte (on peut en avoir
// plusieurs du même type), en quatre paliers : bronze, argent, or, diamant.
// « 1 or » veut dire « or ou mieux ». Rien ne se perd.
// Module neutre (client et serveur). Les trophées se calculent en base
// (get_user_trophees, mes_trophees_depuis, migration_v3_profil.sql §2) ;
// SOURCES_TROPHEE en dit les règles à l'écran, dans les mêmes termes. Tant
// que cette section n'est pas collée, seuls les trophées d'entraînement
// ciblé se comptent, comme aujourd'hui (get_user_practice_trophies).

import type { SupabaseClient } from "@supabase/supabase-js";
import { trophyTier } from "@/lib/practiceTopics";

/** D'où vient un trophée. */
export type SourceTrophee = "ciblee" | "blanc" | "trente" | "cinq" | "drill" | "fiche" | "atelier" | "duel" | "revoir";
/** 1 bronze, 2 argent, 3 or, 4 diamant. */
export type PalierTrophee = 1 | 2 | 3 | 4;
export type ClePalierTrophee = "bronze" | "argent" | "or" | "diamant";

export const PALIERS_TROPHEE: { palier: PalierTrophee; cle: ClePalierTrophee; nom: string }[] = [
  { palier: 1, cle: "bronze", nom: "Bronze" },
  { palier: 2, cle: "argent", nom: "Argent" },
  { palier: 3, cle: "or", nom: "Or" },
  { palier: 4, cle: "diamant", nom: "Diamant" },
];

/** Les sources, dans l'ordre d'affichage. */
export const ORDRE_SOURCES_TROPHEE: readonly SourceTrophee[] = ["ciblee", "blanc", "trente", "cinq", "drill", "fiche", "atelier", "duel", "revoir"];

export const estSourceTrophee = (s: unknown): s is SourceTrophee => typeof s === "string" && (ORDRE_SOURCES_TROPHEE as readonly string[]).includes(s);
export const estPalierTrophee = (p: unknown): p is PalierTrophee => p === 1 || p === 2 || p === 3 || p === 4;
/** « or » → 3. */
export const palierTrophee = (cle: ClePalierTrophee): PalierTrophee => PALIERS_TROPHEE.find((p) => p.cle === cle)!.palier;

/**
 * Chaque source : son nom (« Trophée d'or · Les 30 du jour »), la règle de
 * chacun de ses paliers (les seuils de migration_v3_profil.sql §2, pour
 * l'infobulle) et la page où le gagner. Une source ne donne pas forcément
 * les quatre paliers.
 */
export const SOURCES_TROPHEE: Record<SourceTrophee, { nom: string; regle: Partial<Record<PalierTrophee, string>>; lien: string }> = {
  ciblee: {
    nom: "Entraînement ciblé",
    regle: {
      1: "une séance réussie à 70 % ou plus",
      2: "2 matières ou plus, à 70 % ou plus",
      3: "4 matières ou plus, à 70 % ou plus, sur 30 questions ou plus",
      4: "7 matières ou plus, à 70 % ou plus, sur 60 questions ou plus",
    },
    lien: "/practice",
  },
  blanc: {
    nom: "Examen blanc",
    regle: {
      1: "60 % ou plus à la première copie (30 questions au moins)",
      2: "70 % ou plus",
      3: "80 % ou plus",
      4: "90 % ou plus, sur 90 questions ou plus",
    },
    lien: "/mock-exams",
  },
  trente: { nom: "Les 30 du jour", regle: { 1: "21/30 ou plus", 2: "24/30 ou plus", 3: "27/30 ou plus", 4: "30/30" }, lien: "/defi" },
  cinq: { nom: "Les 5 du jour", regle: { 1: "5/5" }, lien: "/defi/cinq" },
  drill: {
    nom: "Page de drill",
    regle: { 1: "90 % ou plus au premier passage complet de la page", 2: "100 % au premier passage complet de la page" },
    lien: "/fiches",
  },
  fiche: {
    nom: "Fiche entière",
    regle: { 3: "toutes les pages de drill de la fiche à 80 % ou plus (meilleur passage)", 4: "toutes les pages de drill de la fiche à 100 %" },
    lien: "/fiches",
  },
  atelier: { nom: "L'Atelier", regle: { 1: "70 % ou plus et 3 ratures rayées", 2: "80 % ou plus et 5 ratures rayées" }, lien: "/atelier" },
  duel: { nom: "Duel sans faute", regle: { 1: "un duel gagné avec la mention « Sans-faute »" }, lien: "/duel" },
  // /revoir renvoie à la reprise du carnet tant que la section §3b n'est pas collée
  revoir: { nom: "À revoir", regle: { 1: "90 % ou plus sur 15 questions ou plus", 2: "100 % sur 25 questions ou plus" }, lien: "/revoir" },
};

/**
 * Le palier d'une séance d'entraînement ciblé réussie (70 % ou plus) : celui
 * de trophyTier selon le nombre de matières, plafonné par la taille de la
 * séance (moins de 30 questions : l'argent au plus ; moins de 60 : l'or au
 * plus). Même règle que _trophee_ciblee en base, pour la fin de séance.
 */
export function palierCiblee(matieres: number, total: number): PalierTrophee {
  const brut = PALIER_DU_TIER[trophyTier(Math.max(1, Math.floor(matieres) || 1)).key] ?? 1;
  const plafond: PalierTrophee = total >= 60 ? 4 : total >= 30 ? 3 : 2;
  return Math.min(brut, plafond) as PalierTrophee;
}

/** Une ligne de la Salle : n trophées d'une source à un palier (dernier : le plus récent, s'il est connu). */
export type LigneTrophee = { source: SourceTrophee; palier: PalierTrophee; n: number; dernier?: string | null };

export type CompteTrophees = {
  lignes: LigneTrophee[];
  total: number;
  /** nombre de trophées à chaque palier exact */
  parPalier: Record<PalierTrophee, number>;
  /** nombre de trophées de palier p ou mieux (de la source, si elle est donnée) */
  auMoins: (p: PalierTrophee, source?: SourceTrophee) => number;
  /** les sources où le joueur a au moins un or (ou mieux) */
  sources: SourceTrophee[];
};

/**
 * Nombre de trophées de palier p ou mieux, de la source si elle est donnée.
 * Fonction pure sur les lignes : elle sert aussi à un compte venu du serveur
 * (une fonction, comme CompteTrophees.auMoins, ne passe pas d'un composant
 * serveur à un composant client).
 */
export function tropheesAuMoins(lignes: LigneTrophee[], p: PalierTrophee, source?: SourceTrophee): number {
  return lignes.reduce((t, l) => (l.palier >= p && (!source || l.source === source) ? t + l.n : t), 0);
}

/** Les sources (dans l'ordre d'affichage) qui ont au moins un trophée de palier p ou mieux. */
export function sourcesAuMoins(lignes: LigneTrophee[], p: PalierTrophee): SourceTrophee[] {
  return ORDRE_SOURCES_TROPHEE.filter((s) => tropheesAuMoins(lignes, p, s) > 0);
}

/** Le compte de la Salle : lignes valides seulement, une par (source, palier), dans l'ordre d'affichage. */
export function compter(lignes: LigneTrophee[]): CompteTrophees {
  const par = new Map<string, LigneTrophee>();
  for (const l of lignes) {
    const n = Math.floor(Number(l.n));
    if (!estSourceTrophee(l.source) || !estPalierTrophee(l.palier) || !(n > 0)) continue;
    const cle = `${l.source}|${l.palier}`;
    const avant = par.get(cle);
    const dernier = [avant?.dernier ?? null, l.dernier ?? null].filter((d): d is string => !!d).sort().pop() ?? null;
    par.set(cle, { source: l.source, palier: l.palier, n: (avant?.n ?? 0) + n, dernier });
  }
  const propres = [...par.values()].sort((x, y) => ORDRE_SOURCES_TROPHEE.indexOf(x.source) - ORDRE_SOURCES_TROPHEE.indexOf(y.source) || x.palier - y.palier);
  const parPalier: Record<PalierTrophee, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const l of propres) parPalier[l.palier] += l.n;
  return {
    lignes: propres,
    total: propres.reduce((t, l) => t + l.n, 0),
    parPalier,
    auMoins: (p, source) => tropheesAuMoins(propres, p, source),
    sources: sourcesAuMoins(propres, 3),
  };
}

/** Le palier d'un trophée d'entraînement ciblé selon trophyTier (bronze 1 matière … diamant 7 et plus). */
const PALIER_DU_TIER: Record<string, PalierTrophee> = { bronze: 1, silver: 2, gold: 3, diamond: 4 };

/**
 * Les lignes de get_user_practice_trophies (séances ciblées réussies à 70 %,
 * groupées par nombre de matières), palier = trophyTier(topic_count). Le
 * plafond par taille de séance ne s'y applique pas : ces trophées restent
 * comptés tels qu'ils s'affichent aujourd'hui.
 */
export function lignesCiblees(rows: { topic_count: number | null; trophy_count: number | string | null }[]): LigneTrophee[] {
  return rows.map((r) => ({ source: "ciblee" as const, palier: PALIER_DU_TIER[trophyTier(Number(r.topic_count) || 1).key] ?? 1, n: Number(r.trophy_count) || 0 }));
}

/** Les lignes de get_user_trophees ou de trophees_joueur (n est un bigint : nombre ou texte) ; compter écarte les lignes invalides. */
export function lignesTrophees(rows: { source: unknown; palier: unknown; n: unknown }[]): LigneTrophee[] {
  return rows.map((r) => ({ source: r.source as SourceTrophee, palier: Number(r.palier) as PalierTrophee, n: Number(r.n) || 0 }));
}

/**
 * La mesure « trophees » du Codex : le nombre de trophées de palier `palier`
 * ou mieux (bronze par défaut), de la source si elle est donnée, sur les
 * lignes de trophees_joueur (les mesures v3 du Codex). Les lignes invalides
 * ne comptent pas.
 */
export function mesureTrophees(
  lignes: { source: unknown; palier: unknown; n: unknown }[],
  filtre: { palier?: ClePalierTrophee; source?: SourceTrophee } = {},
): number {
  return compter(lignesTrophees(lignes)).auMoins(palierTrophee(filtre.palier ?? "bronze"), filtre.source);
}

/**
 * Les trophées d'un joueur, lus par le client donné (agrégats seulement :
 * ni date, ni libellé). Toutes les sources par get_user_trophees
 * (`complet: true`) ; sans la section §2, le repli get_user_practice_trophies
 * (source ciblee seule, `complet: false` : l'écran écrit alors en petit que
 * les autres trophées arrivent). Au moindre souci : un compte vide, sans bruit.
 */
export async function lireTrophees(supabase: SupabaseClient, userId: string): Promise<CompteTrophees & { complet: boolean }> {
  try {
    const { data, error } = await supabase.rpc("get_user_trophees", { p_user_id: userId });
    if (!error && Array.isArray(data)) return { ...compter(lignesTrophees(data)), complet: true };
  } catch {
    // réseau ou base : le repli ci-dessous
  }
  try {
    const { data, error } = await supabase.rpc("get_user_practice_trophies", { p_user_id: userId });
    if (!error && Array.isArray(data)) return { ...compter(lignesCiblees(data)), complet: false };
  } catch {
    // réseau ou base : le compte vide ci-dessous
  }
  return { ...compter([]), complet: false };
}

/** Un trophée tout juste gagné, pour l'annonce (« Trophée d'or · Les 30 du jour »). */
export type TropheeGagne = { source: SourceTrophee; palier: PalierTrophee; ref: string };

/** « Or » : le nom d'un palier. */
export const nomPalier = (p: PalierTrophee): string => PALIERS_TROPHEE[p - 1].nom;

const DE_PALIER: Record<PalierTrophee, string> = { 1: "de bronze", 2: "d'argent", 3: "d'or", 4: "de diamant" };

/** « Trophée d'or · Les 30 du jour ». */
export const nomTrophee = (t: { source: SourceTrophee; palier: PalierTrophee }): string => `Trophée ${DE_PALIER[t.palier]} · ${SOURCES_TROPHEE[t.source].nom}`;

/**
 * Les lignes de l'annonce de fin de séance : d'abord les trophées que l'écran
 * connaît déjà (calculés sur place, affichés sans attendre la base), chacun
 * remplacé par celui de la base de même source et de même palier s'il y est
 * (son libellé fait foi) ; puis les autres trophées de la base, dans leur
 * ordre. `max` lignes au plus ; `reste` compte celles qui n'y tiennent pas.
 */
export function annonceTrophees(base: TropheeGagne[], connus: TropheeGagne[] = [], max = 3): { lignes: TropheeGagne[]; reste: number } {
  const restants = [...base];
  const tous = connus.map((c) => {
    const i = restants.findIndex((b) => b.source === c.source && b.palier === c.palier);
    return i < 0 ? c : restants.splice(i, 1)[0];
  });
  tous.push(...restants);
  const m = Math.max(0, max);
  return { lignes: tous.slice(0, m), reste: Math.max(0, tous.length - m) };
}

/** Une ligne du détail « Par source » de la Salle : le nombre de trophées à chaque palier (null : la source ne donne pas ce palier) et sa règle. */
export type LigneSalle = { source: SourceTrophee; nom: string; total: number; cases: { palier: PalierTrophee; n: number | null; regle: string | null }[] };

/** Le détail « Par source » : une ligne par source (toutes, ou celles données), dans l'ordre d'affichage. */
export function tableauSalle(lignes: LigneTrophee[], sources: readonly SourceTrophee[] = ORDRE_SOURCES_TROPHEE): LigneSalle[] {
  return ORDRE_SOURCES_TROPHEE.filter((s) => sources.includes(s)).map((source) => {
    const def = SOURCES_TROPHEE[source];
    const cases = PALIERS_TROPHEE.map(({ palier }) => {
      const regle = def.regle[palier] ?? null;
      const n = lignes.reduce((t, l) => (l.source === source && l.palier === palier ? t + l.n : t), 0);
      // un trophée compté à un palier que la règle ne donne pas (ancien compte) reste affiché
      return { palier, n: regle !== null || n > 0 ? n : null, regle };
    });
    return { source, nom: def.nom, total: cases.reduce((t, c) => t + (c.n ?? 0), 0), cases };
  });
}

/**
 * Les trophées du joueur connecté gagnés depuis un instant (ISO), du plus
 * ancien au plus récent : mes_trophees_depuis, avec le client du joueur (la
 * base lit auth.uid()). Sans la section §2, ou au moindre souci : aucun,
 * sans bruit (pas d'annonce).
 */
export async function mesTropheesDepuis(supabase: SupabaseClient, depuisIso: string): Promise<TropheeGagne[]> {
  if (!Number.isFinite(Date.parse(depuisIso))) return [];
  try {
    const { data, error } = await supabase.rpc("mes_trophees_depuis", { p_depuis: depuisIso });
    if (error || !Array.isArray(data)) return [];
    return (data as { source: unknown; palier: unknown; ref: unknown }[]).flatMap((r) => {
      const palier = Number(r.palier);
      return estSourceTrophee(r.source) && estPalierTrophee(palier) ? [{ source: r.source, palier, ref: typeof r.ref === "string" ? r.ref : "" }] : [];
    });
  } catch {
    return [];
  }
}
