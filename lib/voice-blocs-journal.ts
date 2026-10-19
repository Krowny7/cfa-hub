// Les textes des blocs Journal, Progression et Carnet de jours de la page de
// profil (components/profil/blocs/Journal.tsx, Progression.tsx, Carnet.tsx).
// Ceux qui existent déjà ne sont pas recopiés : BLOCS_PROFIL (voice-blocs :
// « Tout le journal », « Visible par »), JOURNAL (voice-profil : la courbe,
// le carnet, le fil). Aucune comparaison avec celui qui regarde : chez soi et
// chez un autre, les mêmes mots. Jamais « il » ni « elle » pour le joueur :
// son prénom. Module neutre.

import { nombre, pct, pluriel } from "@/lib/voice";

export const BLOCS_JOURNAL = {
  // ── Journal ──
  /** l'étiquette de la tuile : la courbe d'ELO et ses événements */
  titreCourbe: "Journal · ELO 90 j",
  /** la cellule de la demi-bande */
  elo90: "ELO · 90 j",
  /** la petite ligne de la demi-bande : « 12 matchs » */
  matchs: (n: number) => pluriel(n, "match", "matchs"),
  /** le lien de la demi-bande */
  toutJournalCourt: "Tout le journal ›",
  /** l'infobulle d'une ligne de la légende : « 12 oct. · Sceau Assiduité » */
  ligneBulle: (jour: string, titre: string) => `${jour} · ${titre}`,

  // ── Progression ──
  seances: "Séances",
  /** sous l'étiquette, à côté du grand chiffre */
  moyenne5: "moyenne des 5 dernières",
  /** les trois repères de la colonne, sous la courbe : « 14 » séances, « 92 % » meilleure, « 82 % » dernière */
  nbSeances: "séances",
  meilleure: "meilleure",
  derniere: "dernière",
  /** la petite ligne de la demi-bande : « 12 séances » */
  nSeances: (n: number) => pluriel(n, "séance", "séances"),
  /** l'étiquette des barres : « Séances · 12 dernières » */
  dernieres: (n: number) => `Séances · ${n} dernières`,
  /** la ligne de seuil, sous les barres */
  seuil: (p: number) => `seuil ${pct(p)}`,
  /** l'infobulle d'une barre ou d'un point : « 12 oct. · 82 % » */
  seanceBulle: (jour: string, p: number) => `${jour} · ${pct(p)}`,
  /** l'infobulle de la courbe, lue à voix haute */
  courbeSeances: (nom: string) => `Les séances de ${nom}`,
  barresSeances: (nom: string) => `Les dernières séances de ${nom}, une barre chacune`,

  // ── Carnet de jours ──
  carnet: "Carnet",
  carnetDeJours: "Carnet de jours",
  serie: "Série",
  record: "Record",
  /** « 23 j » */
  j: (n: number) => `${nombre(n)} j`,
  /** sous le grand chiffre : « jours d'encre » ; l'étiquette d'une cellule : « Jours d'encre » */
  joursEncre: "jours d'encre",
  joursEncreMaj: "Jours d'encre",
  /** l'infobulle du chiffre, et sa légende en toutes lettres : « jours d'encre sur 52 semaines » */
  surSemaines: (n: number) => `sur ${nombre(n)} semaines`,
  joursEncreSur: (n: number) => `jours d'encre sur ${nombre(n)} semaines`,
  /** la ligne du bas : « série 12 j · record 31 j » (en texte seul : infobulle, lecture) */
  serieRecord: (serie: number, record: number) => `série ${nombre(serie)} j · record ${nombre(record)} j`,
  /** les mêmes mots, pour la ligne composée (les chiffres en gras) */
  serieMin: "série",
  recordMin: "record",
  /** Journal fermé : la micro-mention */
  carnetPrive: "Carnet privé",
  /** demi-bande, sous les jours d'encre */
  sur52: "sur 52 sem.",
  /** demi-bande, sous la série : « record 41 j » */
  recordCourt: (n: number) => `record ${nombre(n)} j`,
  /** la grille, lue à voix haute */
  grilleDe: (nom: string, moi: boolean) => (moi ? "Ton carnet de jours" : `Le carnet de jours de ${nom}`),
  /** la légende de la grille */
  moins: "moins",
  plus: "plus",
  /** les initiales des jours, du lundi au dimanche (la colonne) */
  initialesJours: ["L", "M", "M", "J", "V", "S", "D"] as readonly string[],
} as const;
