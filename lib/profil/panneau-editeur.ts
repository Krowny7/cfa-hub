// Le panneau de gauche, tel que l'éditeur le recompose à chaque choix du
// joueur (components/profil/EditeurBanniere.tsx) : sans rien relire en base
// et sans charger le catalogue des pièces. Le serveur prépare une fois les
// DONNÉES (donneesPanneau, lib/profil/panneau-vue.ts : le rang, la valeur de
// chaque statistique, chaque badge proposable déjà décrit) ; le navigateur
// les assemble avec le choix en cours (assemblerPanneau) pour l'aperçu de la
// carte. Même règle que le profil : le choix du joueur est la loi, avec deux
// replis (aucun badge choisi : les trois sceaux les plus rares ; aucune
// statistique : celles de la maquette).
// Module neutre (client et serveur) ; les types de panneau-vue.ts sont
// importés comme types seulement (rien du catalogue n'est chargé).

import { BADGES_MAX, STATS_DEFAUT, STATS_MAX, STATS_PANNEAU, formaterStat, statPanneau, type CleStat, type Panneau } from "@/lib/profil/banniere";
import type { BadgeVue, PanneauVue, RangVue } from "@/lib/profil/panneau-vue";

/** Ce que le serveur prépare pour l'éditeur : tout le panneau, sauf ce que le joueur est en train de choisir. */
export type DonneesPanneau = {
  nom: string;
  /** le rang et son métal (le cadre de la bannière et les filets du panneau le prennent) */
  rang: RangVue;
  metal: string;
  /** la valeur brute de chaque statistique (null : inconnue, un tiret) */
  valeurs: Record<CleStat, number | null>;
  /** chaque badge qu'il peut mettre (gagné, ou déjà porté), décrit, par identifiant */
  badges: Record<string, BadgeVue>;
  /** ce que le site pose quand il n'a rien choisi : ses sceaux les plus rares */
  repli: BadgeVue[];
};

/** Les statistiques d'un panneau, complétées à trois avec celles de la maquette (sans doublon) ; les inconnues sont retirées. */
export function statsCompletees(stats: readonly string[] | null | undefined): CleStat[] {
  const out: CleStat[] = [];
  for (const s of stats ?? []) if (STATS_PANNEAU.some((x) => x.cle === s) && !out.includes(s as CleStat)) out.push(s as CleStat);
  for (const s of [...STATS_DEFAUT, ...STATS_PANNEAU.map((x) => x.cle)]) if (out.length < STATS_MAX && !out.includes(s)) out.push(s);
  return out.slice(0, STATS_MAX);
}

/** Le panneau à dessiner : les badges et statistiques choisis (ou leurs replis), avec leurs vraies valeurs. `titre` : le titre porté, lisible (celui du brouillon). */
export function assemblerPanneau(d: DonneesPanneau, p: Panneau, titre: string | null = null): PanneauVue {
  const choisis = p.badges.map((id) => d.badges[id]).filter((b): b is BadgeVue => !!b);
  // comme le profil (statsDuPanneau) : ce qui est choisi tel quel, les statistiques de la maquette si rien ne l'est
  const cles: readonly CleStat[] = p.stats.length ? p.stats : STATS_DEFAUT;
  return {
    nom: d.nom,
    titre,
    rang: d.rang,
    metal: d.metal,
    badges: (choisis.length ? choisis : d.repli).slice(0, BADGES_MAX),
    stats: cles.slice(0, STATS_MAX).map((cle) => ({ cle, etiquette: statPanneau(cle).etiquette, valeur: formaterStat(cle, d.valeurs[cle]) })),
  };
}
