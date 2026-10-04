// Voix « Le Trait », morceau Z2a : le classement, les joueurs, les profils
// publics et la cérémonie de rang. Complète lib/voice.ts (lecture seule)
// dans le même esprit : un mot par chose, toujours le chiffre, jamais
// « Bravo ». Le coordinateur pourra fusionner ce module dans lib/voice.ts ;
// d'ici là, les composants du classement l'importent directement.
// Module neutre (ni « use client » ni serveur).

import { LEXIQUE, NBSP, VIDE, nombre, pct, pluriel } from "@/lib/voice";

// ---------------------------------------------------------------------------
// L'espace Classement

export const CLASSEMENT = {
  titre: (domaine: string) => `Ton rang en ${domaine}`,
  vide: "Le classement se trace au premier match.",
  videTexte: "Lance un duel ou passe un examen blanc classé pour y entrer.",
  personne: "Personne n'a encore joué : tout le monde part de la même ligne.",
  chercher: "Chercher un joueur",
  courbeVide: "Ta courbe se trace à ton premier duel ou examen classé.",
  courbe: (n: number) => (n <= 1 ? "Ton ELO · dernière partie" : `Ton ELO · ${nombre(n)} dernières parties`),
  depuis: (date: string) => `depuis le ${date}`,
  lancer: "Lancer un duel",
  defier: "Défier quelqu'un",
  podium: "Podium",
  suivants: (n: number) => `Voir les ${nombre(n)} suivants`,
  replier: "Replier",
  rangs: "Les 8 rangs",
  rangsSous: "Huit rangs. Un seul sommet.",
  rangsPlacement: "ta place se dessine pendant le placement",
  regles: "Comment ça marche",
  reglesSous: "ELO, maîtrise, placement",
  duelsVide: VIDE.duels,
  duelsVideTexte: "30 questions type examen, les mêmes pour les deux. Le meilleur score gagne, puis le plus rapide.",
  duelsLancer: "Lancer la première",
  enCoursVide: "Aucune partie en cours.",
  aRevoirVide: (jours: number) => `Aucune partie ces ${jours} derniers jours.`,
  aRevoirSous: (jours: number) => `${jours} jours après chaque partie`,
  tousDuels: "Tous tes duels",
  examenVide: "Aucun de prévu pour l'instant",
  examenVideTexte: "Il s'affichera ici dès qu'il sera planifié. Il fait bouger ton ELO comme un duel.",
  examensPassesVide: "Pas encore d'examen classé terminé.",
  tousExamens: "Tous les examens blancs",
} as const;

/** « 4e sur 42 · maîtrise 54 % » (la ligne sous le panneau du rang) */
export function ligneRang({ place, joueurs, maitrise: m }: { place: number | null; joueurs: number | null; maitrise: number | null }): string {
  const parts: string[] = [];
  parts.push(place !== null ? `${place === 1 ? "1er" : `${place}e`}${joueurs ? ` sur ${nombre(joueurs)}` : ""}` : "pas encore classé");
  if (m !== null) parts.push(`maîtrise ${pct(m)}`);
  return parts.join(" · ");
}

/** « Platine · encore 88 » : la cote rouge du prochain palier sur la courbe */
export const coteProchain = (palier: string, points: number) => `${palier} · encore${NBSP}${nombre(points)}`;

/** « 12 parties classées » */
export const partiesClassees = (n: number) => pluriel(n, "partie classée", "parties classées");

/** « 42 joueurs · Finance » */
export const joueursDomaine = (n: number, domaine: string) => `${pluriel(n, "joueur", "joueurs")} · ${domaine}`;

/** Le mot de l'issue d'un duel, sans point : « Victoire », « Défaite », « Nulle ». */
export const motIssue = (won: boolean | null) => (won === true ? "Victoire" : won === false ? "Défaite" : LEXIQUE.nulle);

/** Ligne d'un défi reçu : « Karim H. te défie · à toi le trait » */
export const teDefie = (nom: string) => `${nom} te défie · à toi le trait`;

// ---------------------------------------------------------------------------
// La rivalité : qui tu peux dépasser, qui te talonne (classement réel)

export const RIVALITE = {
  /** l'écart au joueur juste devant : « 38 points devant » (au stylo rouge) */
  devant: (points: number) => `${pluriel(points, "point", "points")} devant`,
  /** « Nadia T. te talonne à 24 points » */
  derriere: (nom: string, points: number) => `${nom} te talonne à ${pluriel(points, "point", "points")}`,
  /** à égalité de points */
  egalite: (nom: string) => `${nom}, à égalité`,
  aDepasser: "À dépasser",
  enTete: "En tête. Le trait continue.",
} as const;

// ---------------------------------------------------------------------------
// Les joueurs (/people) et le profil public (/people/<id>)

export const JOUEURS = {
  titre: "Joueurs",
  kicker: "Classement",
  filtre: "Quels joueurs",
  tous: "Tous",
  groupes: "Mes groupes",
  chercher: "Chercher un joueur",
  placeholder: "Chercher un pseudo…",
  bouton: "Chercher",
  aucun: (q: string) => `Personne ne répond à « ${q} ». Essaie son pseudo exact.`,
  sansGroupe: "Tu n'es dans aucun groupe",
  sansGroupeLien: "Créer ou rejoindre un groupe",
  limite: "Les 200 premiers pseudos, par ordre alphabétique.",
  top: (domaine: string) => `Top 10 · ${domaine}`,
  complet: "Classement complet",
  /** profil public */
  retour: "Joueurs",
  kickerMoi: "Ton profil public",
  kickerAutre: "Joueur",
  defier: (nom: string) => `Défier ${nom}`,
  reglages: "Mes réglages",
  /** « encore 310 XP avant le niveau 13 » */
  niveauSuivant: (xp: number, niveau: number) => `encore${NBSP}${nombre(xp)}${NBSP}XP avant le niveau ${niveau}`,
  groupesCommun: (n: number) => pluriel(n, "groupe en commun", "groupes en commun"),
} as const;
