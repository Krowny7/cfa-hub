// Les textes du bandeau « Rapport de force » (components/profil/
// RapportDeForce.tsx, RapportMemoire.tsx) : sur le profil d'un autre joueur,
// entre les onglets et les blocs, la réponse en une seconde à « est-il
// chaud, comparé à moi ? ». Les textes communs aux écarts (l'infobulle
// « Mesure · Inès 4 812 · toi 3 120 », le rattrapage, le score, l'aperçu)
// sont dans lib/voice-blocs.ts et ne sont pas recopiés. Jamais « il » ni
// « elle » : le prénom du joueur. Module neutre.

import { nombre, pct, signe } from "@/lib/voice";

export const RAPPORT = {
  /** le nom du bandeau (aria-label de la section) */
  label: (nom: string) => `Rapport de force avec ${nom}`,
  /** les étiquettes des 5 cellules, fixes sur tous les profils */
  titre: "Rapport de force",
  elo: "ELO",
  maitrise: "Maîtrise",
  questions: "Questions",
  serie: "Série",

  /** « 23 j » */
  jours: (n: number) => `${nombre(n)} j`,
  /** « 64 % » */
  pct: (n: number) => pct(n),
  /** une valeur absente (maîtrise pas encore mesurée) */
  sansValeur: "—",
  /** l'infobulle d'un chiffre que la personne regardée n'a pas encore */
  pasMesureeLui: (nom: string) => `${nom} : pas encore mesurée`,

  /** dans l'infobulle de l'ELO : « enjeu du prochain duel +22 / −10 » */
  enjeu: (gain: number, perte: number) => `enjeu du prochain duel ${signe(gain)} / ${signe(perte)}`,
  /** dans l'infobulle de la série : « 23 j (record 41 j) » */
  serieRecord: (serie: number, record: number) => `${nombre(serie)} j (record ${nombre(record)} j)`,

  /** une cellule qui mène à son bloc : « ELO 1 480 : voir le Journal » */
  aller: (mesure: string, chiffre: string, ou: string) => `${mesure} ${chiffre} : ${ou}`,
  vers: {
    journal: "voir le Journal",
    radar: "voir le radar des matières",
    reponses: "voir les questions répondues",
    carnet: "voir le carnet de jours",
  } as Record<string, string>,

  /** depuis ta dernière visite : la flèche (10 px) et son infobulle « Le 12 oct. : toi −150 » */
  monte: "▲",
  baisse: "▼",
  depuis: (jour: string, avant: string) => `Le ${jour} : ${avant}`,
};
