// Les textes des blocs Journal, Progression et Carnet de jours de la page de
// profil (components/profil/blocs/Journal.tsx, Progression.tsx, Carnet.tsx).
// Ceux qui existent déjà ne sont pas recopiés : BLOCS_PROFIL (voice-blocs :
// le jeton, le score, « Tout le journal », « Visible par »), JOURNAL
// (voice-profil : la courbe, le carnet, le fil). Jamais « il » ni « elle »
// pour le joueur : son prénom. Module neutre.

import { nombre, pluriel } from "@/lib/voice";

export const BLOCS_JOURNAL = {
  // ── Journal ──
  /** la cellule de la demi-bande */
  elo90: "ELO · 90 j",
  /** la mesure du jeton : « ELO gagné en 90 jours · Inès +84 · toi +12 » */
  eloGagne: "ELO gagné en 90 jours",
  /** chez soi, la petite ligne : « 12 matchs » */
  matchs: (n: number) => pluriel(n, "match", "matchs"),
  /** le lien de la demi-bande */
  toutJournalCourt: "Tout le journal ›",
  /** l'infobulle d'un croisement des deux courbes */
  teDepasse: (nom: string, jour: string) => `${nom} t'a dépassé le ${jour}`,
  tuDepasses: (nom: string, jour: string) => `Tu as dépassé ${nom} le ${jour}`,

  // ── Progression ──
  seances: "Séances",
  /** la mesure du jeton : « 5 dernières séances · Inès 78 % · toi 69 % » */
  cinqDernieres: "5 dernières séances",
  /** chez soi, la petite ligne : « 12 séances » */
  nSeances: (n: number) => pluriel(n, "séance", "séances"),
  /** l'infobulle de la courbe, seule */
  courbeSeances: (nom: string) => `Les séances de ${nom}, 60 derniers jours`,
  tesSeances: "Tes séances, 60 derniers jours",

  // ── Carnet de jours ──
  carnet: "Carnet",
  carnetDeJours: "Carnet de jours",
  serie: "Série",
  record: "Record",
  septJours: "7 jours",
  /** les mesures des jetons */
  joursEncre: "Jours d'encre",
  septDerniers: "7 derniers jours",
  /** « 23 j » */
  j: (n: number) => `${nombre(n)} j`,
  /** Journal fermé : la micro-mention */
  carnetPrive: "Carnet privé",
  /** chez soi, sous les jours d'encre (demi-bande) */
  sur52: "sur 52 sem.",
  /** chez soi, sous la série (demi-bande) : « record 41 j » */
  recordCourt: (n: number) => `record ${nombre(n)} j`,
  /** chez soi, mini-tuile : « 212 j d'encre » */
  dEncre: (n: number) => `${nombre(n)} j d'encre`,
  /** chez soi, mini-tuile : « série 23 j · record 41 j » */
  serieRecord: (serie: number, record: number) => `série ${nombre(serie)} j · record ${nombre(record)} j`,
  /** l'infobulle d'un jour : « mar. 7 oct. · Inès 42 · toi 30 » */
  jourCompare: (jour: string, nom: string, lui: number, toi: number) => `${jour} · ${nom} ${nombre(lui)} · toi ${nombre(toi)}`,
  /** sans toi : « mar. 7 oct. · Inès 42 » */
  jourSeul: (jour: string, nom: string, n: number) => `${jour} · ${nom} ${nombre(n)}`,
  /** l'infobulle du score en semaines */
  scoreSemaines: (toi: number, lui: number, egal: number, nom: string) =>
    `Semaines où tu as fait plus de questions : ${nombre(toi)} · ${nom} : ${nombre(lui)} · égalité : ${nombre(egal)}`,
  /** l'en-tête de ton carnet, en colonne */
  toi: "toi",
  /** le carnet en colonne : lu à voix haute */
  carnetDe: (nom: string) => `Le carnet de ${nom}, 52 semaines`,
  tonCarnet: "Ton carnet, 52 semaines",
  /** les jours de la semaine, du dimanche au samedi (getUTCDay) */
  joursSemaine: ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."] as readonly string[],
} as const;
