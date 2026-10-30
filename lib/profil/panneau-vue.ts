// Ce que le panneau de gauche de la bannière affiche (components/profil/
// PanneauJoueur.tsx), en données simples et sérialisables : le pseudo, le titre
// porté, le rang, les trois badges et les trois statistiques avec leurs vraies
// valeurs. panneauVue les assemble à partir de ce que le joueur a choisi
// (composition.panneau : lib/profil/banniere.ts) et de ce que la page sait déjà
// de lui (son ELO, sa place, ses statistiques, ses sceaux, ses trophées).
// Le choix du joueur est la loi, avec deux replis : aucun badge choisi, le
// site pose d'office ses trois sceaux les plus rares (posesDe) ; un badge qu'on
// ne sait plus dessiner (sceau retiré du catalogue, titre disparu) est sauté.
// Module serveur en pratique : il connaît toutes les pièces (les titres).

import type { ProfilStats } from "@/lib/profil/catalogue";
import { STATS_DEFAUT, STATS_MAX, BADGES_MAX, formaterStat, genreBadge, idBadgeSceau, statPanneau, valeursPanneau, type CleStat, type ExtrasPanneau, type GenreBadge, type Panneau } from "@/lib/profil/banniere";
import type { DonneesPanneau } from "@/lib/profil/panneau-editeur";
import { piecesDuType } from "@/lib/profil/pieces";
import { defSceau, posesDe, type EtatSceau } from "@/lib/profil/sceaux";
import { PLACEMENT_GAMES, TIERS, rankFor } from "@/lib/ranks";
import { SOURCES_TROPHEE, nomPalier, estPalierTrophee, estSourceTrophee } from "@/lib/trophees";
import { PALIERS, nomSceau } from "@/lib/voice-profil";

/** Un badge du panneau, prêt à dessiner. `palier` : 1 à 3 pour un sceau (encre, vermillon, dorure), 1 à 4 pour un trophée (bronze à diamant), 0 pour un titre. */
export type BadgeVue = { id: string; genre: GenreBadge; nom: string; detail: string | null; palier: number };
/** Une statistique du panneau : sa clé, son étiquette en capitales, sa valeur écrite (« 1 612 », « 12 j », « — »). */
export type StatVue = { cle: CleStat; etiquette: string; valeur: string };
/** Le rang : l'index du palier (l'insigne), son nom (« Platine II »), et pendant le placement, « Placement 3/5 ». */
export type RangVue = { tier: number; nom: string; provisoire: string | null };
export type PanneauVue = {
  nom: string;
  titre: string | null;
  rang: RangVue;
  /** le métal du rang (le cadre de la bannière et les filets du panneau le prennent) */
  metal: string;
  badges: BadgeVue[];
  stats: StatVue[];
};

const majuscule = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/**
 * Le badge qu'un identifiant désigne (« sceau:assiduite », « trophee:ciblee:3 »,
 * « titre:maitre:fsa »), dessiné d'après ce qu'on sait du joueur (`etats`, pour
 * le palier de ses sceaux) ; null : introuvable.
 */
export function badgeVue(id: string, etats: EtatSceau[] = []): BadgeVue | null {
  const genre = genreBadge(id);
  if (genre === "sceau") {
    const cle = id.slice("sceau:".length);
    const def = defSceau(cle);
    if (!def) return null;
    const palier = Math.max(1, etats.find((e) => e.def.cle === cle)?.palier ?? 1);
    return { id, genre, nom: nomSceau(def), detail: majuscule(PALIERS[palier]), palier };
  }
  if (genre === "trophee") {
    const [, source, p] = id.split(":");
    const palier = Number(p);
    if (!estSourceTrophee(source) || !estPalierTrophee(palier)) return null;
    return { id, genre, nom: SOURCES_TROPHEE[source].nom, detail: nomPalier(palier), palier };
  }
  if (genre === "titre") {
    const nue = id.slice("titre:".length);
    const piece = piecesDuType("titre").find((p) => p.nue === nue);
    return piece ? { id, genre, nom: piece.nom, detail: null, palier: 0 } : null;
  }
  return null;
}

/** Les badges à afficher : ceux que le joueur a choisis ; sinon ses trois sceaux les plus rares (ou ceux qu'il a posés sur son profil : `pins`). */
export function badgesDuPanneau(panneau: Panneau | null | undefined, etats: EtatSceau[], pins: string[] | null = null): BadgeVue[] {
  const choisis = (panneau?.badges ?? []).map((id) => badgeVue(id, etats)).filter((b): b is BadgeVue => !!b);
  if (choisis.length) return choisis.slice(0, BADGES_MAX);
  return posesDe(etats, pins, BADGES_MAX)
    .map((e) => badgeVue(idBadgeSceau(e.def.cle), etats))
    .filter((b): b is BadgeVue => !!b);
}

/** Les statistiques à afficher, avec leurs vraies valeurs ; aucune choisie : celles de la maquette (ELO, duels gagnés, sceaux). */
export function statsDuPanneau(panneau: Panneau | null | undefined, stats: ProfilStats, extras: Partial<ExtrasPanneau> = {}): StatVue[] {
  const cles = panneau?.stats?.length ? panneau.stats : STATS_DEFAUT;
  const valeurs = valeursPanneau(stats, extras);
  return cles.slice(0, STATS_MAX).map((cle) => ({ cle, etiquette: statPanneau(cle).etiquette, valeur: formaterStat(cle, valeurs[cle]) }));
}

/** Tout le panneau d'un joueur. */
export function panneauVue(a: {
  /** ce que le joueur a choisi (composition.panneau) ; absent : les trois sceaux les plus rares et les statistiques de la maquette */
  panneau?: Panneau | null;
  nom: string;
  titre?: string | null;
  elo: number;
  mastery: number | null;
  place: number | null;
  gamesPlayed: number;
  stats: ProfilStats;
  /** ce que ProfilStats ne sait pas : maîtrise, temps, trophées… (lu par la page qui dessine) */
  extras?: Partial<ExtrasPanneau>;
  etats: EtatSceau[];
  /** les sceaux posés sur le profil, pour le repli des badges */
  pins?: string[] | null;
}): PanneauVue {
  const { rang, metal } = rangVue(a.elo, a.mastery, a.place, a.gamesPlayed);
  return {
    nom: a.nom,
    titre: a.titre ?? null,
    rang,
    metal,
    badges: badgesDuPanneau(a.panneau, a.etats, a.pins ?? null),
    stats: statsDuPanneau(a.panneau, a.stats, { elo: a.elo, place: a.place, sceaux: a.etats.filter((e) => e.palier > 0).length, maitrise: a.mastery, ...a.extras }),
  };
}

/** Le rang à dessiner (l'index du palier, son nom, le placement en cours) et le métal de son palier. */
function rangVue(elo: number, mastery: number | null, place: number | null, gamesPlayed: number): { rang: RangVue; metal: string } {
  const r = rankFor(elo, mastery, place);
  const joues = Math.min(gamesPlayed, PLACEMENT_GAMES);
  return {
    rang: { tier: r.tierIndex, nom: `${r.tier.name}${r.division ? " " + r.division : ""}`, provisoire: gamesPlayed < PLACEMENT_GAMES ? `Placement ${joues}/${PLACEMENT_GAMES}` : null },
    metal: TIERS[r.tierIndex].metal[1],
  };
}

/**
 * Ce que l'éditeur de bannière (Personnaliser) reçoit pour recomposer le
 * panneau à chaque choix, sans relire la base (lib/profil/panneau-editeur.ts :
 * assemblerPanneau) : le rang, la valeur de chaque statistique, et chaque
 * badge proposable décrit (`ids` : les identifiants gagnés, plus ceux déjà
 * portés ; un identifiant qu'on ne sait plus dessiner est sauté), avec le repli
 * du site (les sceaux les plus rares ou posés).
 */
export function donneesPanneau(a: {
  nom: string;
  elo: number;
  mastery: number | null;
  place: number | null;
  gamesPlayed: number;
  stats: ProfilStats;
  extras?: Partial<ExtrasPanneau>;
  etats: EtatSceau[];
  pins?: string[] | null;
  ids: readonly string[];
}): DonneesPanneau {
  const { rang, metal } = rangVue(a.elo, a.mastery, a.place, a.gamesPlayed);
  const badges: Record<string, BadgeVue> = {};
  for (const id of a.ids) {
    const v = badgeVue(id, a.etats);
    if (v) badges[id] = v;
  }
  return {
    nom: a.nom,
    rang,
    metal,
    valeurs: valeursPanneau(a.stats, { elo: a.elo, place: a.place, sceaux: a.etats.filter((e) => e.palier > 0).length, maitrise: a.mastery, ...a.extras }),
    badges,
    repli: badgesDuPanneau(null, a.etats, a.pins ?? null),
  };
}
