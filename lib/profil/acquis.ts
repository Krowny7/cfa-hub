// Ce que le joueur a fait (l'Acquis), et les conditions qui ouvrent une
// pièce de collection. Pas d'inventaire : une pièce se possède parce que sa
// condition est remplie (questions, pic de palier, sceaux, quêtes du Codex,
// trophées, fil rouge, programme mené).
// Module neutre : les conditions et remplie / dateGagnee servent au client
// comme au serveur ; lireAcquis lit la base avec le client qu'on lui donne
// (le client administrateur, côté serveur). Ce module n'importe rien de
// lib/profil/pieces.ts ni de lib/profil/catalogue.ts à l'exécution : tous
// deux le réexportent (pas d'import circulaire).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DatePalier, EtatSceau } from "@/lib/profil/sceaux";
import type { ProfilStats } from "@/lib/profil/catalogue";
import { lireTrophees, sourcesAuMoins, tropheesAuMoins, type CompteTrophees, type PalierTrophee, type SourceTrophee } from "@/lib/trophees";

// ── Les conditions ─────────────────────────────────────────────────────
/** Les conditions des cadres et des bannières du profil (lib/profil/catalogue.ts). */
export type ConditionProfil =
  | { k: "questions"; n: number }
  /** avoir atteint ce palier (index dans TIERS) au moins une fois */
  | { k: "pic"; palier: number }
  /** n sceaux à la dorure */
  | { k: "dorures"; n: number }
  /** un sceau à ce palier au moins (1 encre, 2 vermillon, 3 dorure) */
  | { k: "sceau"; cle: string; palier: number };

/** Toute condition d'obtention d'une pièce de collection. */
export type Condition =
  | ConditionProfil
  /** une quête du Codex récompensée (codex_progression.etat = 'recompensee'), tous programmes ; « acte:<id> » pour un acte */
  | { k: "codex"; quete: string }
  /** n trophées de palier ≥ palier (source facultative) ; `sources` : nombre de sources distinctes à ce palier */
  | { k: "trophees"; palier: PalierTrophee; n: number; source?: SourceTrophee; sources?: number }
  /** un palier du fil rouge récompensé (fil:<chapitre>:<palier>) */
  | { k: "fil"; chapitre: string; palier: number }
  /** un programme mené (codex_programmes_joueur.statut = 'mene') */
  | { k: "programme"; programme: string }
  | { k: "unDe"; conditions: Condition[] };

// ── L'Acquis ───────────────────────────────────────────────────────────
/** Ce que le joueur a fait : de quoi ouvrir les pièces gagnées. */
export type Acquis = {
  questions: number;
  /** meilleur palier atteint par l'ELO, sans verrou de maîtrise (index dans TIERS ; ProfilStats.picAtteint) */
  pic: number;
  /** ses sceaux (paliers, et dates avec la base) */
  sceaux: EtatSceau[];
  /** la date du premier passage à chaque palier (index dans TIERS) ; null : inconnue */
  datesPic: (string | null)[];
  /** quêtes du Codex récompensées → jour de Paris de la récompense (null : inconnu) ; « acte:<id> » compris ; tous programmes */
  codex: Map<string, string | null>;
  /** la Salle des trophées (null : pas lue) */
  trophees: CompteTrophees | null;
  /** chapitre du fil rouge → plus haut palier récompensé */
  fil: Record<string, number>;
  /** les programmes menés (« finance/cfa-l1 ») */
  programmesMenes: string[];
};

/** Les champs de l'Acquis que seule la base connaît, vides (ni Codex, ni trophées, ni fil rouge, ni programme mené). */
export const champsBaseVides = (): Pick<Acquis, "codex" | "trophees" | "fil" | "programmesMenes"> => ({
  codex: new Map(),
  trophees: null,
  fil: {},
  programmesMenes: [],
});

/** Le palier d'un sceau (0 : pas gagné). */
const palierSceau = (a: Acquis, cle: string): number => a.sceaux.find((e) => e.def.cle === cle)?.palier ?? 0;
/** Les sceaux à la dorure. */
export const dorures = (a: Acquis) => a.sceaux.filter((e) => e.palier === 3).length;

/** Un id de palier du fil rouge : « fil:trophees:4 ». */
export const idFil = (chapitre: string, palier: number) => `fil:${chapitre}:${palier}`;
const FIL = /^fil:([a-z0-9-]+):([1-9][0-9]*)$/;

/** La condition est remplie (null : pièce libre). */
export function remplie(c: Condition | null, a: Acquis): boolean {
  if (!c) return true;
  switch (c.k) {
    case "questions":
      return a.questions >= c.n;
    case "pic":
      return a.pic >= c.palier;
    case "dorures":
      return dorures(a) >= c.n;
    case "sceau":
      return palierSceau(a, c.cle) >= c.palier;
    case "codex":
      return a.codex.has(c.quete);
    case "trophees": {
      if (!a.trophees) return false;
      const lignes = a.trophees.lignes;
      return tropheesAuMoins(lignes, c.palier, c.source) >= c.n && (c.sources == null || sourcesAuMoins(lignes, c.palier).length >= c.sources);
    }
    case "fil":
      return (a.fil[c.chapitre] ?? 0) >= c.palier;
    case "programme":
      return a.programmesMenes.includes(c.programme);
    case "unDe":
      return c.conditions.some((x) => remplie(x, a));
  }
}

/** Le jour où la condition a été remplie, s'il est connu (le pic : rating_events ; les sceaux : la base ; le Codex : la récompense). */
export function dateGagnee(c: Condition | null, a: Acquis): DatePalier | null {
  if (!c || !remplie(c, a)) return null;
  switch (c.k) {
    case "pic": {
      const iso = a.datesPic[c.palier];
      return iso ? { iso, avant: false } : null;
    }
    case "sceau":
      return a.sceaux.find((e) => e.def.cle === c.cle)?.dates?.[c.palier - 1] ?? null;
    case "dorures": {
      // la n-ième dorure, si toutes sont datées
      const dates = a.sceaux.filter((e) => e.palier === 3).map((e) => e.dates?.[2] ?? null);
      if (dates.some((d) => !d)) return null;
      return (dates as DatePalier[]).sort((x, y) => x.iso.localeCompare(y.iso))[c.n - 1] ?? null;
    }
    case "codex": {
      const iso = a.codex.get(c.quete);
      return iso ? { iso, avant: false } : null;
    }
    case "fil": {
      const iso = a.codex.get(idFil(c.chapitre, c.palier));
      return iso ? { iso, avant: false } : null;
    }
    case "unDe": {
      // la plus ancienne, si toutes les conditions remplies sont datées (sinon on ne sait pas laquelle est venue d'abord)
      const dates = c.conditions.filter((x) => remplie(x, a)).map((x) => dateGagnee(x, a));
      if (dates.some((d) => !d)) return null;
      return (dates as DatePalier[]).sort((x, y) => x.iso.localeCompare(y.iso))[0] ?? null;
    }
    case "questions":
    case "trophees":
    case "programme":
      return null;
  }
}

// ── La lecture (serveur) ───────────────────────────────────────────────
const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
/** Un instant de la base ramené au jour de Paris (null : absent ou illisible). */
const jourDe = (iso: string | null | undefined): string | null => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? JOUR_PARIS.format(t) : null;
};

/** Les quêtes récompensées du Codex (la plus ancienne récompense par quête), et le fil rouge qui s'en déduit. */
export function codexDepuis(rows: { quete_id: string; recompensee_le: string | null }[]): Pick<Acquis, "codex" | "fil"> {
  const codex = new Map<string, string | null>();
  const fil: Record<string, number> = {};
  for (const r of rows) {
    if (typeof r.quete_id !== "string" || !r.quete_id) continue;
    const jour = jourDe(r.recompensee_le);
    const avant = codex.get(r.quete_id);
    codex.set(r.quete_id, avant === undefined ? jour : [avant, jour].filter((d): d is string => !!d).sort()[0] ?? null);
    const m = FIL.exec(r.quete_id);
    if (m) fil[m[1]] = Math.max(fil[m[1]] ?? 0, Number(m[2]));
  }
  return { codex, fil };
}

/** Les quêtes récompensées du joueur (contrats du jour exclus : ils n'ouvrent aucune pièce) ; base absente ou souci : rien. */
async function lireCodex(admin: SupabaseClient, userId: string): Promise<Pick<Acquis, "codex" | "fil">> {
  try {
    const { data, error } = await admin
      .from("codex_progression")
      .select("quete_id,recompensee_le")
      .eq("user_id", userId)
      .eq("etat", "recompensee")
      .neq("famille", "contrat")
      .limit(5000);
    if (!error && Array.isArray(data)) return codexDepuis(data as { quete_id: string; recompensee_le: string | null }[]);
  } catch {
    // table absente (migration du Codex pas collée) ou réseau : rien
  }
  return { codex: new Map(), fil: {} };
}

/** Les programmes menés (codex_programmes_joueur, migration_codex_v3.sql) ; table absente : aucun. */
async function lireProgrammesMenes(admin: SupabaseClient, userId: string): Promise<string[]> {
  try {
    const { data, error } = await admin.from("codex_programmes_joueur").select("programme").eq("user_id", userId).eq("statut", "mene");
    if (!error && Array.isArray(data)) return data.map((r: { programme: unknown }) => r.programme).filter((p): p is string => typeof p === "string");
  } catch {
    // table absente ou réseau : aucun
  }
  return [];
}

/**
 * L'Acquis complet d'un joueur : ce que le profil sait déjà (questions, pic,
 * sceaux, dates du pic), plus les quêtes récompensées du Codex, ses trophées
 * et ses programmes menés. Chaque lecture se replie en silence sur le vide :
 * sans les migrations du Codex ou de la v3, l'Acquis vaut celui d'acquisDe.
 * `base.trophees` : les trophées déjà lus par l'appelant (la page Moi les lit
 * une fois pour la Salle et l'étagère) ; absent : lus ici.
 */
export async function lireAcquis(admin: SupabaseClient, userId: string, base: { stats: ProfilStats; sceaux: EtatSceau[]; datesPic: (string | null)[]; trophees?: Promise<CompteTrophees | null> }): Promise<Acquis> {
  const [codex, trophees, programmesMenes] = await Promise.all([lireCodex(admin, userId), base.trophees ?? lireTrophees(admin, userId), lireProgrammesMenes(admin, userId)]);
  return {
    questions: base.stats.questions,
    pic: base.stats.picAtteint,
    sceaux: base.sceaux,
    datesPic: base.datesPic,
    ...codex,
    trophees,
    programmesMenes,
  };
}
