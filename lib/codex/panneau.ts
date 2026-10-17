// Le panneau « Aujourd'hui », derrière le sceau de la barre du haut (Codex
// simplifié, 17 octobre 2026 ; il remplace « Tes quêtes », V3 §9.2). Trois
// zones au plus, sous la ligne de niveau :
//  1. « À récupérer · 3 » : les quêtes faites qui attendent le clic
//     (lib/codex/recuperer ; la pastille chiffrée du sceau en est le compte) ;
//  2. « La suite » : l'étape en cours de la séance du jour, sa durée, l'XP des
//     quêtes du jour qu'elle remplit, et « Commencer » ;
//  3. en pied, « Fait aujourd'hui : 4 · +230 XP ▸ » et « Ouvrir le Codex → ».
// Les quêtes ne sont qu'un guide secondaire : plus de prochaine quête, de
// contrats ni de long cours ici (tout est dans /codex). Le sceau ne porte plus
// d'arcs ni de « ! » ; « 14 à revoir » devient la pastille de l'onglet Réviser.
// Les récompenses versées d'office (mode sobre, quête sans XP) ne s'annoncent
// plus : elles sont acquittées sans bruit à l'ouverture et se lisent dans
// « Fait aujourd'hui ».
// Léger (quelques lignes, pas la vue entière, qui pèse une centaine de Ko).
// Module neutre (serveur et navigateur).

import type { VueSeance } from "@/lib/codex/seance";
import type { LigneQuete, VueCodex, VueContrat } from "@/lib/codex/vue";
import { FAIT_VIDE, LIGNES_MONTREES, cleRecuperer, xpAVerser, type ARecuperer, type FaitAujourdhui } from "@/lib/codex/recuperer";

/** L'étape en cours de la séance : « Refaire 14 questions ratées · 10 min · +10 XP ». */
export type SuitePanneau = {
  titre: string;
  href: string;
  /** minutes */
  duree: number;
  /** l'XP des quêtes du jour pas encore remplies que ce bloc fait avancer (0 : aucune) */
  xp: number;
};

export type Panneau = {
  disponible: boolean;
  jour: string;
  /** les récompenses versées d'office pas encore vues : acquittées sans bruit à l'ouverture (codexVus(cles)) */
  versees: { n: number; xp: number; cles: string[] } | null;
  /** la file « À revoir » : la pastille de l'onglet Réviser (revisions_dues ; repli : les ratures en cours, 25 au plus ; null : rien de connu) */
  revoir: { aujourdhui: number; demain: number } | null;
  /** la séance du jour (V3 §6) : « La suite » du panneau et la pastille « Séance 2/3 · Continuer → » */
  seance: { lancee: boolean; faits: number; total: number; suivant: SuitePanneau | null } | null;
  /** le jour J (V3 §7.4) : le panneau se réduit à « Bonne chance », Léonard ne surgit pas (attribut data-jour-j) */
  jourJ: boolean;
  /**
   * « Récupérer » (lib/codex/recuperer) : combien de quêtes attendent le clic
   * (la pastille du sceau), l'XP qu'il versera, et les premières (le bloc en
   * montre trois ; le clic récupère tout)
   */
  recuperer: { n: number; xp: number; items: ARecuperer[] };
  /** « Fait aujourd'hui : 4 · +230 XP » */
  fait: FaitAujourdhui;
};

export const PANNEAU_VIDE: Panneau = {
  disponible: false, jour: "", versees: null, revoir: null, seance: null, jourJ: false, recuperer: { n: 0, xp: 0, items: [] }, fait: FAIT_VIDE,
};

const cleDe = (l: Pick<LigneQuete, "id" | "periode">) => `${l.id}|${l.periode}`;

/** Toutes les quêtes de la vue (une même quête peut y figurer deux fois : la clé les dédoublonne). */
const toutesLignes = (vue: VueCodex): LigneQuete[] => [
  ...vue.contrats.map((c) => c.ligne), ...(vue.debrief ? [vue.debrief] : []), ...vue.trame.flatMap((a) => a.quetes), ...vue.branches.flatMap((b) => b.etapes), ...vue.longCours.flatMap((c) => c.paliers), ...vue.filRouge.chapitres.flatMap((c) => c.recents), ...vue.exploits, ...vue.hebdo,
];

/**
 * Les récompenses versées pas encore vues (hors sceaux du profil, qui ont
 * leur cérémonie), et les actes clos ; sans ce qui attend « Récupérer » (le
 * clic en accuse réception : l'ouverture du panneau ne doit pas l'acquitter).
 */
function aAcquitter(vue: VueCodex): { lignes: LigneQuete[]; actes: VueCodex["trame"] } {
  const vues = new Set<string>((vue.aRecuperer ?? []).map(cleRecuperer));
  const lignes: LigneQuete[] = [];
  for (const l of toutesLignes(vue)) {
    const k = cleDe(l);
    if (!l.aFeter || vues.has(k) || l.id.startsWith("exploit:sceau:")) continue;
    vues.add(k);
    lignes.push(l);
  }
  return { lignes, actes: vue.trame.filter((a) => a.aFeter && !vues.has(`acte:${a.acte.id}|`)) };
}

export function panneauDe(vue: VueCodex): Panneau {
  if (!vue.disponible) return PANNEAU_VIDE;
  // le jour J : rien à faire, rien à annoncer, seulement « Bonne chance » (V3 §7.4)
  if (vue.moment === "jourJ") return { ...PANNEAU_VIDE, disponible: true, jour: vue.jour, jourJ: true };
  const { lignes, actes } = aAcquitter(vue);
  const versees = lignes.length || actes.length
    // l'XP d'un acte clos entre dans le total (elle en était oubliée)
    ? { n: lignes.length, xp: vue.sobre ? 0 : lignes.reduce((s, l) => s + (l.xpVersee ?? l.xp), 0) + actes.reduce((s, a) => s + a.acte.recompense.xp, 0), cles: [...new Set([...lignes.map((l) => l.id), ...actes.map((a) => `acte:${a.acte.id}`)])] }
    : null;
  const enAttente = vue.aRecuperer ?? [];
  return {
    disponible: true,
    jour: vue.jour,
    versees,
    revoir: vue.revoir,
    seance: seancePanneau(vue.seance, vue.contrats),
    jourJ: false,
    recuperer: { n: enAttente.length, xp: vue.sobre ? 0 : xpAVerser(enAttente), items: enAttente.slice(0, LIGNES_MONTREES) },
    fait: vue.faitAujourdhui ?? FAIT_VIDE,
  };
}

/**
 * La séance du jour pour « La suite » du panneau et la pastille « Séance 2/3
 * · Continuer → » (V3 §6.4) : lancée ou non, où elle en est, et le bloc
 * suivant (le premier pas fait ; aucun une fois la séance finie), avec sa
 * durée et l'XP des quêtes du jour pas encore remplies qu'il fait avancer
 * (`contrats` : ceux de la vue). null : pas de séance.
 */
export function seancePanneau(s: VueSeance | null, contrats: VueContrat[] = []): Panneau["seance"] {
  if (!s || !s.blocs.length) return null;
  const b = s.finie ? undefined : s.blocs.find((x) => !s.faits.includes(x.genre));
  const xp = b ? contrats.filter((c) => b.contrats.includes(c.ligne.id) && c.ligne.etat !== "terminee").reduce((n, c) => n + c.ligne.xp, 0) : 0;
  return {
    lancee: s.lancee,
    faits: s.blocs.filter((x) => s.faits.includes(x.genre)).length,
    total: s.blocs.length,
    suivant: b ? { titre: b.titre, href: b.destination.href, duree: b.duree, xp } : null,
  };
}

/**
 * L'événement du navigateur qui dit « le Codex a bougé » : émis par FeteCodex
 * juste après codexPoint() (la fin d'un outil), par la séance du jour après
 * un geste et par « Récupérer » ; le sceau et la pastille de la barre du haut
 * relisent alors le panneau.
 */
export const EVENEMENT_CODEX_POINT = "rl:codex-point";

/** Le chemin d'un lien, sans la requête ni l'ancre (« /practice?topic=fsa » → « /practice »). */
export const cheminDe = (href: string) => href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";

/**
 * La pastille « Séance 2/3 · Continuer → » de la barre du haut (V3 §6.4) :
 * seulement si la séance du jour est lancée (en base, ou dans ce navigateur
 * quand la base ne la garde pas : `lanceeIci`), pas finie, pas masquée pour
 * la journée, et que la page courante n'est pas déjà la destination du bloc
 * en cours. `rang` : le bloc en cours (le premier pas fait). null : rien à montrer.
 */
export function pastilleSeance(s: Panneau["seance"], chemin: string, o: { masquee?: boolean; lanceeIci?: boolean } = {}): { rang: number; total: number; href: string } | null {
  if (!s || !s.suivant || o.masquee || !(s.lancee || o.lanceeIci)) return null;
  if (cheminDe(chemin) === cheminDe(s.suivant.href)) return null;
  return { rang: Math.min(s.total, s.faits + 1), total: s.total, href: s.suivant.href };
}

/** Le panneau une fois les récompenses versées d'office acquittées (codexVus). */
export const panneauAcquitte = (p: Panneau): Panneau => ({ ...p, versees: null });

// ── L'instantané (codex_vue_cache, migration_codex_v3.sql §6) ──────────

/** La forme du panneau gardé : à changer dès que Panneau change, pour qu'un instantané d'avant ne soit jamais relu. */
export const VERSION_PANNEAU = 4;
/** Un instantané plus vieux ne sert plus. */
export const CACHE_PANNEAU_MS = 10 * 60_000;

/** Le panneau tel qu'il se garde. */
export const panneauAGarder = (p: Panneau) => ({ version: VERSION_PANNEAU, panneau: p });

/**
 * Le panneau gardé, s'il sert encore : du même jour, de moins de 10 min, pas
 * marqué « à recalculer » (fin d'un outil, récompenses annoncées), de la même
 * forme. null : il faut recalculer.
 */
export function panneauDuCache(ligne: unknown, jour: string, maintenant: number): Panneau | null {
  const l = ligne as { jour?: unknown; panneau?: unknown; calcule_le?: unknown; a_recalculer?: unknown } | null;
  if (!l || typeof l !== "object" || l.a_recalculer !== false || String(l.jour ?? "").slice(0, 10) !== jour) return null;
  const quand = typeof l.calcule_le === "string" ? Date.parse(l.calcule_le) : NaN;
  if (!(maintenant - quand >= 0 && maintenant - quand < CACHE_PANNEAU_MS)) return null;
  const g = l.panneau as { version?: unknown; panneau?: Panneau } | null;
  return g && g.version === VERSION_PANNEAU && g.panneau && g.panneau.disponible === true && g.panneau.jour === jour ? g.panneau : null;
}
