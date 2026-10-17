// Le Codex vu de Moi (Codex simplifié, ajustement C) : le Codex n'est plus
// un onglet de la barre, on y entre par la tuile de Moi. Elle dit où en est
// le joueur (« 37 quêtes faites · 2 140 XP gagnés dans le Codex », ce qui
// attend « Récupérer ») ; le bloc « Codex » plus bas garde l'historique,
// replié, les quêtes faites jour par jour.
// Une seule lecture légère de codex_progression (ses lignes, par la policy
// « select own ») : pas de calcul du moteur, pas de client admin. Sans la
// table (migration_codex.sql) ou au moindre souci : `disponible` faux, et
// la tuile se contente du lien vers le Codex. Rien ne lève.
// Ce qui attend « Récupérer » suit la règle de la vue du Codex : une ligne
// « terminee » (récompense différée) ; et, hors mode sobre, une ligne
// « recompensee » pas encore vue, non rétroactive, qui rapporte quelque
// chose (le repli d'avant le SQL de Récupérer).
// Module serveur en pratique (il lit le catalogue du Codex pour les titres).

import type { SupabaseClient } from "@supabase/supabase-js";
import { ACTES, catalogueCodex, contenuDuProgramme } from "@/lib/codex/catalogue";
import { modeleDeContrat, nomActe, titreClair, titreContrat } from "@/lib/codex/titres-clairs";
import type { Quete } from "@/lib/codex/types";

/** Une ligne de codex_progression, telle que Moi la lit. */
export type LigneCodexMoi = {
  quete_id: string;
  periode: string;
  etat: string;
  xp: number | string | null;
  cosmetique: string | null;
  titre: string | null;
  vu: boolean | null;
  retro: boolean | null;
  terminee_le: string | null;
  recompensee_le: string | null;
};

/** Une quête (ou un acte) faite, dans l'historique. */
export type QueteFaite = { cle: string; titre: string; xp: number };

/** Un jour de l'historique ; `jour` null : les quêtes comptées d'office à l'arrivée dans le Codex (rétroactives). */
export type JourCodex = { jour: string | null; quetes: QueteFaite[] };

export type CodexMoi = {
  /** la table est là et la lecture a réussi */
  disponible: boolean;
  /** les quêtes faites (à récupérer comprises), sans les actes ni les miroirs */
  faites: number;
  /** l'XP déjà versée par le Codex (quêtes et actes) */
  xp: number;
  /** ce qui attend « Récupérer » */
  aRecuperer: number;
  /** l'historique, du plus récent au plus ancien, au plus HISTORIQUE_MAX quêtes ; les rétroactives en dernier */
  historique: JourCodex[];
  /** les quêtes faites au-delà de HISTORIQUE_MAX, non listées */
  plusAnciennes: number;
};

export const CODEX_MOI_VIDE: CodexMoi = { disponible: false, faites: 0, xp: 0, aRecuperer: 0, historique: [], plusAnciennes: 0 };

/** Au plus tant de quêtes dans l'historique (le reste se dit « et N plus anciennes »). */
export const HISTORIQUE_MAX = 60;
/** Au plus tant de lignes lues (un joueur assidu en a quelques centaines). */
const LIGNES_MAX = 2000;

const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });

/** Le jour de Paris d'un horodatage (AAAA-MM-JJ) ; null : illisible. */
function jourDe(horodatage: string | null): string | null {
  const t = horodatage ? Date.parse(horodatage) : NaN;
  return Number.isFinite(t) ? JOUR_PARIS.format(new Date(t)) : null;
}

const xpDe = (l: Pick<LigneCodexMoi, "xp">) => Math.max(0, Number(l.xp) || 0);
const rapporte = (l: LigneCodexMoi) => xpDe(l) > 0 || !!l.cosmetique || !!l.titre;
const faite = (l: LigneCodexMoi) => l.etat === "terminee" || l.etat === "recompensee";

// ── Les titres ─────────────────────────────────────────────────────────

let catalogue: Map<string, Quete> | null = null;
/** Le catalogue du CFA I, lu à la première demande. */
const quetes = () => (catalogue ??= new Map(catalogueCodex(contenuDuProgramme()).map((q) => [q.id, q])));

/** Une quête qui en reflète une autre (Quete.miroir) : comptée avec celle qui paie. */
const estMiroir = (id: string) => !!quetes().get(id)?.miroir;

/**
 * Le titre d'une ligne, en clair : le titre clair de la quête (titres-clairs),
 * le nom de l'acte, ou celui d'un contrat ; un contrat dont les paramètres ne
 * sont plus connus se dit « Quête du jour ».
 */
export function titreLigne(id: string): string {
  const acte = id.startsWith("acte:") ? ACTES.find((a) => `acte:${a.id}` === id) : undefined;
  if (acte) return nomActe(acte);
  const q = quetes().get(id);
  if (q) return titreClair(q);
  if (id.startsWith("contrat:trio:")) return "Les 3 quêtes du jour";
  if (id.startsWith("contrat:hebdo:")) return "Quête de la semaine";
  const modele = modeleDeContrat(id);
  if (modele) return titreContrat(modele, {}) ?? "Quête du jour";
  return "Une quête du Codex";
}

// ── Le compte et l'historique ──────────────────────────────────────────

/** Le Codex de Moi d'après les lignes du joueur (pur : testé sans base). */
export function codexMoiDe(lignes: LigneCodexMoi[], o: { sobre: boolean; titre?: (id: string) => string }): CodexMoi {
  const titre = o.titre ?? titreLigne;
  const utiles = lignes.filter((l) => !estMiroir(l.quete_id));
  const faites = utiles.filter(faite);
  const aRecuperer = utiles.filter(
    (l) => l.etat === "terminee" || (!o.sobre && l.etat === "recompensee" && !l.vu && !l.retro && rapporte(l) && !l.quete_id.startsWith("exploit:sceau:")),
  ).length;
  const xp = utiles.filter((l) => l.etat === "recompensee").reduce((s, l) => s + xpDe(l), 0);

  // les plus récentes d'abord ; les rétroactives (comptées d'office) à part, en dernier
  const datees = faites
    .filter((l) => !l.retro)
    .map((l) => ({ l, t: Date.parse(l.terminee_le ?? l.recompensee_le ?? "") || 0 }))
    .sort((a, b) => b.t - a.t || a.l.quete_id.localeCompare(b.l.quete_id))
    .map((x) => x.l);
  const ordre = [...datees, ...faites.filter((l) => l.retro)];
  const montrees = ordre.slice(0, HISTORIQUE_MAX);
  const historique: JourCodex[] = [];
  for (const l of montrees) {
    const jour = l.retro ? null : jourDe(l.terminee_le ?? l.recompensee_le);
    const dernier = historique[historique.length - 1];
    const q: QueteFaite = { cle: `${l.quete_id}|${l.periode}`, titre: titre(l.quete_id), xp: xpDe(l) };
    if (dernier && dernier.jour === jour) dernier.quetes.push(q);
    else historique.push({ jour, quetes: [q] });
  }
  return {
    disponible: true,
    faites: faites.filter((l) => !l.quete_id.startsWith("acte:")).length,
    xp,
    aRecuperer,
    historique,
    plusAnciennes: Math.max(0, ordre.length - montrees.length),
  };
}

/** Lit le Codex de Moi (une requête, sans calcul) ; repli silencieux : CODEX_MOI_VIDE. */
export async function lireCodexMoi(supabase: SupabaseClient, userId: string, o: { sobre: boolean }): Promise<CodexMoi> {
  try {
    const { data, error } = await supabase
      .from("codex_progression")
      .select("quete_id,periode,etat,xp,cosmetique,titre,vu,retro,terminee_le,recompensee_le")
      .eq("user_id", userId)
      .in("etat", ["terminee", "recompensee"])
      .order("terminee_le", { ascending: false, nullsFirst: false })
      .limit(LIGNES_MAX);
    // table absente (migration_codex.sql pas collée) ou autre souci : la tuile reste un lien
    if (error) return CODEX_MOI_VIDE;
    return codexMoiDe((data ?? []) as LigneCodexMoi[], o);
  } catch {
    return CODEX_MOI_VIDE;
  }
}
