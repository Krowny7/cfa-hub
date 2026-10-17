// Le Codex : la lecture des mesures v3 (codex_mesures_v3, migration_codex_v3.sql
// §4), rendues par codex_lire sous la clé « v3 » quand la §5 est collée, ou
// par un appel à part sinon (V3 §12.3bis). Module neutre (aucun accès à la
// base) : serveur.ts appelle, les tests vérifient.
//
// Une mesure absente ou mal formée reste INCONNUE (undefined) : le moteur
// tient alors hors jeu les quêtes qui la lisent (V3 §8). La base ne rend une
// clé que si elle sait la calculer (maîtrise unique, file « À revoir »,
// ratures scellées, débrief : migration_v3_profil.sql).

import type { MesuresSql } from "@/lib/codex/moteur";
import { CAPACITES_VIDE, lireCapacites } from "@/lib/codex/reglage";
import type { Capacites } from "@/lib/codex/types";

export type MesuresV3 = { capacites: Capacites } & Pick<
  MesuresSql,
  | "jours_encre_total" | "programmes_menes" | "maitres_total" | "trophees" | "notions_tenues" | "speciaux_matiere"
  | "maitrise_unique" | "revoir" | "ratures_scellees" | "blancs_a_debriefer" | "causes"
>;

/** La base ne sait rien faire de nouveau (fonction absente ou en erreur). */
export const MESURES_V3_VIDES: MesuresV3 = { capacites: CAPACITES_VIDE };

/** Tout ce que la base pourrait savoir faire : le plan des compteurs avant de connaître ses capacités (journal 3). */
export const CAPACITES_TOUTES = Object.fromEntries(Object.keys(CAPACITES_VIDE).map((k) => [k, k === "journal" ? 3 : true])) as Capacites;

const nombre = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : undefined);
const objet = (x: unknown): Record<string, unknown> | undefined => (x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : undefined);

/** Les trophées ([{source, palier, n}]) ; une ligne mal formée est ignorée, autre chose qu'une liste : inconnus. */
function lireTrophees(x: unknown): MesuresSql["trophees"] {
  if (!Array.isArray(x)) return undefined;
  return x.flatMap((l) => {
    const o = objet(l);
    const palier = nombre(o?.palier);
    const n = nombre(o?.n);
    return o && typeof o.source === "string" && palier !== undefined && n !== undefined ? [{ source: o.source, palier, n }] : [];
  });
}

/** Les notions tenues ({notion: {n, j5}}) ; une entrée mal formée est ignorée, autre chose qu'un objet : inconnues. */
function lireNotionsTenues(x: unknown): MesuresSql["notions_tenues"] {
  const d = objet(x);
  if (!d) return undefined;
  const out: NonNullable<MesuresSql["notions_tenues"]> = {};
  for (const [notion, v] of Object.entries(d)) {
    const n = nombre(objet(v)?.n);
    const j5 = nombre(objet(v)?.j5);
    if (n !== undefined && j5 !== undefined) out[notion] = { n, j5 };
  }
  return out;
}

/** Les spéciaux par matière ({serie_bonnes: {m: n}, serie_calculs: {m: n}}) ; autre chose qu'un objet : inconnus. */
function lireSpeciauxMatiere(x: unknown): MesuresSql["speciaux_matiere"] {
  const d = objet(x);
  if (!d) return undefined;
  const parMatiere = (y: unknown) => Object.fromEntries(Object.entries(objet(y) ?? {}).flatMap(([m, n]) => (nombre(n) !== undefined ? [[m, n as number]] : [])));
  return { serie_bonnes: parMatiere(d.serie_bonnes), serie_calculs: parMatiere(d.serie_calculs) };
}

const STATUTS = ["non_mesuree", "provisoire", "mesuree"] as const;

/** La maîtrise unique par matière (maitrise_joueur, V3 §4) ; une matière mal formée est ignorée. */
function lireMaitrise(x: unknown): MesuresSql["maitrise_unique"] {
  const d = objet(x);
  if (!d) return undefined;
  const out: NonNullable<MesuresSql["maitrise_unique"]> = {};
  for (const [m, v] of Object.entries(d)) {
    const o = objet(v);
    const statut = STATUTS.find((s) => s === o?.statut);
    const questions = nombre(o?.questions);
    if (!o || !statut || questions === undefined) continue;
    out[m] = {
      pct: nombre(o.pct) ?? null,
      questions,
      total: nombre(o.total) ?? questions,
      debut: nombre(o.debut) ?? null,
      statut,
      derniere: typeof o.derniere === "string" ? o.derniere : null,
      ancienne: nombre(o.ancienne) ?? null,
    };
  }
  return out;
}

/** La file « À revoir » (revisions_dues, V3 §5.1) : ses comptes ; incomplète : inconnue. */
function lireRevoir(x: unknown): MesuresSql["revoir"] {
  const d = objet(x);
  const [aujourdhui, demain, ratures, rappels] = [d?.aujourdhui, d?.demain, d?.ratures, d?.rappels].map(nombre);
  return aujourdhui !== undefined && demain !== undefined && ratures !== undefined && rappels !== undefined ? { aujourdhui, demain, ratures, rappels } : undefined;
}

/** La répartition des causes d'erreur des débriefs (V3 §7.6), en % ; incomplète : inconnue. */
function lireCauses(x: unknown): MesuresSql["causes"] {
  const d = objet(x);
  const v = (["savoir", "lecture", "calcul", "temps", "chance", "n"] as const).map((k) => nombre(d?.[k]));
  if (v.some((n) => n === undefined)) return undefined;
  const [savoir, lecture, calcul, temps, chance, n] = v as number[];
  return { savoir, lecture, calcul, temps, chance, n };
}

/** Le résultat de codex_mesures_v3 ; autre chose qu'un objet : la base ne sait rien faire de nouveau. */
export function mesuresV3De(data: unknown): MesuresV3 {
  const d = objet(data);
  if (!d) return MESURES_V3_VIDES;
  return {
    capacites: lireCapacites(d.capacites),
    jours_encre_total: nombre(d.jours_encre_total),
    programmes_menes: nombre(d.programmes_menes),
    maitres_total: nombre(d.maitres_total),
    trophees: lireTrophees(d.trophees),
    notions_tenues: lireNotionsTenues(d.notions_tenues),
    speciaux_matiere: lireSpeciauxMatiere(d.speciaux_matiere),
    maitrise_unique: lireMaitrise(d.maitrise),
    revoir: lireRevoir(d.revoir),
    ratures_scellees: nombre(d.ratures_scellees),
    blancs_a_debriefer: nombre(d.blancs_a_debriefer),
    causes: lireCauses(d.causes),
  };
}

/**
 * Les mesures v3 rendues par codex_lire (clé « v3 »), si elles sont celles du
 * programme demandé ; sinon null (le serveur les lit à part).
 */
export function mesuresV3DeLecture(v3: unknown, programme: string): MesuresV3 | null {
  const d = objet(v3);
  return d && d.programme === programme ? mesuresV3De(d) : null;
}

/**
 * La réponse de l'appel à part à codex_mesures_v3 (null : l'appel a levé).
 * Fonction absente (`absente`, baseAbsente côté serveur) : la base ne sait
 * rien faire de nouveau. Une autre erreur : null, en panne. Le calcul
 * s'arrête alors (repli) : sans capacités, des quêtes passeraient hors jeu et
 * un acte se clorait sans elles, pour de bon.
 */
export function mesuresV3DeReponse(r: { data: unknown; error: unknown } | null, absente: boolean): MesuresV3 | null {
  if (!r) return null;
  if (r.error) return absente ? MESURES_V3_VIDES : null;
  return mesuresV3De(r.data);
}

/** Les mesures v3 versées dans les mesures du moteur (clés absentes : inconnues). */
export function avecMesuresV3(mesures: MesuresSql, v3: MesuresV3): MesuresSql {
  const { capacites: _capacites, ...m } = v3;
  return { ...mesures, ...m };
}
