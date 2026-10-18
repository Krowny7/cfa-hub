// Les textes des blocs de la page de profil (components/profil/BlocsProfil.tsx),
// à chacun des 3 formats. Ceux qui existent déjà ailleurs ne sont pas
// recopiés : JOURNAL et CASE_VIDE (voice-profil), SAISONS (voice-saisons),
// les textes des chiffres clés (Vitrine d'avant, repris dans
// pieceVitrine) et ceux de la Salle des trophées. Module neutre.

import { nombre, pluriel } from "@/lib/voice";
import { ordinal } from "@/components/classement/format";
import type { Visibilite } from "@/lib/profil/catalogue";

export const BLOCS_PROFIL = {
  // l'état vide d'un bloc dans Personnaliser (texte de l'éditeur d'avant)
  carte: "Carte",
  carteVide: "Ta carte est vide : écris-y un titre, ou mets-lui une image, dans ses réglages.",
  rienAMontrer: " : rien à montrer pour l'instant. Le bloc apparaîtra sur ta page dès qu'il aura du contenu.",
  rienAMontrerCourt: "rien pour l'instant",

  // la grammaire des écarts (lib/profil/ecart.ts, components/profil/blocs/commun.tsx)
  /** l'aperçu « voir comme les autres » : l'écart se montrera à la personne qui regarde */
  apercuEcart: "Ici, l'écart avec la personne qui regarde",
  /** « Tu mènes dans 1, Inès dans 2, égalité dans 1 » */
  scoreBulle: (toi: number, lui: number, egal: number, nom: string) => `Tu mènes dans ${toi}, ${nom} dans ${lui}${egal ? `, égalité dans ${egal}` : ""}`,
  /** « Questions · Inès 4 812 · toi 3 120 » */
  bulle: (mesure: string, nom: string, lui: string, toi: string) => `${mesure} · ${nom} ${lui} · toi ${toi}`,
  /** le rattrapage d'un écart rouge */
  rattrapageElo: (n: number, nom: string) => `≈ ${n} victoire${n > 1 ? "s" : ""} contre ${nom} pour passer devant`,
  rattrapageQuestions: (jours: number) => `À ton rythme : ${jours} jour${jours > 1 ? "s" : ""}`,
  /** « Sem. du 6 oct. · Inès 214 · toi 260 » */
  semaineBulle: (debut: string, nom: string, lui: number, toi: number) => `Sem. du ${debut} · ${nom} ${nombre(lui)} · toi ${nombre(toi)}`,
  /** le double trait, sans légende */
  doubleTrait: (nom: string) => `Épais : ${nom} · fin : toi`,
  pasMesure: "toi : pas encore mesuré",
  leDetail: "Le détail",

  // Chiffres clés
  chiffres: "Chiffres clés",

  // Radar
  tesMatieres: "Tes matières",
  faceMoyenne: "face à la moyenne des joueurs",
  comparer: "Me comparer",
  comparerImpossible: "Aucune de tes matières n'est encore mesurée",
  arreter: "Arrêter",
  toi: "toi",
  enTete: (matiere: string) => `${matiere} en tête`,
  plusSure: "Plus sûre",
  aReprendre: "À reprendre",
  aReprendreMin: "à reprendre",
  tesPlusSures: "Tes plus sûres",
  dixMatieres: "Les 10 matières",
  ordreMatieres: "Matières, de la plus sûre à la moins sûre",
  radarDe: (nom: string, moi: boolean) => (moi ? "Tes 10 matières" : `Les 10 matières de ${nom}`),

  // Amis
  amis: "Amis",
  gererAmis: "Gérer mes amis",
  sansAmiMoi: "Pas encore d'amis : ajoute les joueurs que tu croises en duel ou au classement.",
  sansAmi: "Pas encore d'amis.",

  // Questions répondues
  reponses: "Questions répondues",
  justes: (p: number | null) => (p === null ? "—" : `${nombre(p)} % justes`),
  totalTexte: (p: number | null) => (p === null ? "réponses, toutes sources" : `réponses, toutes sources · ${nombre(p)} % de bonnes réponses`),
  sansReponse: "Aucune réponse pour l'instant.",
  incomplet: "Au moins : certaines sources ne se lisent pas ici.",
  parSource: "Réponses par source",
  detailMatieres: "Le détail par matière",

  // Trophées
  trophees: "Trophées",

  // Folio
  folio: "Folio",
  planche: "Planche portée",
  sansFolio: "Aucun folio porté",
  sansFolioTexte: "Choisis-en un dans Moi › Mes pièces : il se pose ici, avec son anecdote.",

  // Journal
  journal: "Journal",
  repereJournal: (ecart: string) => `${ecart} ELO · 90 j`,
  toutJournal: "Tout le journal",
  visiblePar: (v: Visibilite) => `Visible par : ${v === "public" ? "tous" : v === "friends" ? "tes amis" : "toi seul"} · Moi › Réglages`,

  // Saisons
  saisons: "Saisons",
  gravees: (n: number) => pluriel(n, "gravée", "gravées"),
  tesSaisons: "Tes saisons",
  sesSaisons: "Ses saisons",
  place: (place: number, joueurs: number | null) => `${ordinal(place)}${joueurs ? ` sur ${nombre(joueurs)}` : ""}`,

  // Médias
  image: "Image du joueur",
  gif: "GIF",
  video: "Vidéo du joueur",
} as const;
