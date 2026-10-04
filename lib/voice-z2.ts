// Voix « Le Trait », zone Z2 : classement, duels, défi du jour, joueurs.
// Complète lib/voice.ts (lecture seule) dans le même esprit : un mot par
// chose, toujours le chiffre, jamais « raté » ni « Bravo ». Le coordinateur
// pourra fusionner ce module dans lib/voice.ts ; d'ici là, les pages de la
// zone l'importent directement. Module neutre (ni « use client » ni serveur).
//
// DEFI reprend, clé pour clé, l'ancien DAILY_VOICE de lib/daily.ts (qui le
// réexporte sous ce nom pour ne rien casser), plus quelques phrases.

import { DUEL, IA, LEXIQUE, NBSP, SIGNATURE, VIDE, nombre, pct, pluriel, precision, ratures, verdictSession } from "@/lib/voice";

// ---------------------------------------------------------------------------
// « Copier pour l'IA » (duel et défi) : le nom reste, la voix l'entoure

export const COPIER = {
  label: IA.label,
  /** « Copier mes 8 ratures » */
  ratures: (n: number) => `Copier mes ${ratures(n)}`,
  /** retour après la copie (pas de point d'exclamation) */
  fait: "Copié.",
  colle: IA.copie,
  manuel: "Ton navigateur bloque la copie automatique : sélectionne le texte ci-dessous et copie-le.",
} as const;

/** « 6 ratures », « page propre » (une copie rendue) */
export function raturesOuPropre(n: number) {
  return n > 0 ? ratures(n) : "page propre";
}

// ---------------------------------------------------------------------------
// Défi du jour : « Les 30 du jour. »

export const DEFI = {
  title: "Les 30 du jour.",
  /** titre d'un jour passé : « Les 30 du 2 octobre. » */
  titleDay: (jour: string) => `Les 30 du ${jour}.`,
  start: SIGNATURE,
  commencer: "Commencer",
  handedIn: "Copie rendue.",
  counting: "On compte les traits…",
  boardEmpty: "Personne n'a encore rendu sa copie. Le premier trait est à toi.",
  boardEmptyPast: "Personne n'a rendu de copie ce jour-là.",
  boardFrozen: "Classement définitif.",
  missed: "Pas de trait ce jour-là.",
  missedText: "Une copie se trace le jour même. Le classement, lui, reste ouvert.",
  closed: "Ce défi est clos : celui d'aujourd'hui t'attend.",
  historyEmpty: "Ton historique commence aujourd'hui.",
  soonTitle: "Le défi du jour arrive bientôt.",
  soonText: "Chaque jour, les mêmes 30 questions pour tout le monde, une seule copie, et le classement du jour.",
  unavailable: "Le défi du jour n'est pas disponible pour le moment. Réessaie dans un instant.",
  /** l'écart à la tête, quand on est seul ou devant */
  alone: (today: boolean) => (today ? "Seul en lice pour l'instant : le classement se remplit jusqu'à minuit." : "Seul en lice ce jour-là."),
  ahead: (today: boolean) => (today ? "En tête. Tiens ta place jusqu'à minuit." : "En tête ce jour-là."),
  /** la cote vers la 1re place : « encore 3 », « 1:12 d'écart » */
  ecartPoints: (n: number) => `encore${NBSP}${nombre(n)}`,
  ecartTemps: (t: string) => `${t} d'écart`,
  premiere: "1re place",
  /** règles, avant de commencer : [en gras, la suite] */
  rules: (questions: number, minutes: number): [string, string][] => [
    [`${questions} questions`, ", les mêmes et dans le même ordre pour tout le monde."],
    [`${minutes} min, une seule copie`, " : le chrono ne s'arrête plus, même si tu fermes la page."],
    ["Réponses définitives", " ; tu peux passer et revenir. La correction s'ouvre dès ta copie rendue."],
  ],
  confirmHandIn: (blanches: number) =>
    blanches > 0
      ? `Rendre ta copie maintenant ? ${blanches > 1 ? `${blanches} questions sans réponse compteront comme ratures` : "1 question sans réponse comptera comme rature"}. Tu n'auras pas d'autre copie aujourd'hui.`
      : "Rendre ta copie maintenant ?",
  /** ma copie rendue */
  copie: (heure: string | null) => (heure ? `Ta copie · rendue à ${heure}` : "Ta copie"),
  /** « précision 87 % · 4 ratures » */
  ligneCopie: (p: number, n: number) => `${precision(p)} · ${raturesOuPropre(n)}`,
  revoir: "Revoir ma copie",
  /** coches : « Ta copie, question par question » */
  coches: "Ta copie, question par question",
  reviewEmpty: "La correction s'ouvre dès que tu as rendu ta copie. Si c'est déjà le cas, recharge la page dans un instant.",
  hardest: "La plus dure",
  foundBy: (rate: number, moi: boolean) => `trouvée par ${pct(rate)} des joueurs${moi ? ", toi compris" : ""}`,
  /** filtres de la revue */
  mesRatures: IA.mesRatures,
  tout: IA.tout,
  pagePropreTexte: "Aucune rature dans ta copie. Tu peux tout relire dans « Toute la copie ».",
  /** « Copier pour l'IA » du défi */
  iaTexte: "Colle ta copie dans ton IA : bilan par thème et explication de chaque rature, avec le contexte du jour.",
  iaTout: "Toute la copie",
  iaToutSeul: "Copier toute la copie",
  /** la tuile (accueil, S'entraîner) */
  tuile: {
    label: "Défi du jour",
    titre: "Les 30 du jour",
    rendue: "copie rendue",
    enCours: "Copie en cours",
    repondues: (n: number, total: number) => `${n}/${total} répondues`,
    seFige: "se fige à minuit",
    personne: "Personne n'a encore rendu sa copie",
    bientot: "Mêmes questions pour tous, chaque jour.",
    indispo: "Pas de défi pour l'instant.",
    reprendre: "Reprendre ma copie",
  },
} as const;

/** Verdict d'une copie (seuils des fins de session) : « Trait sûr. » */
export const verdictCopie = (score: number, total: number) => verdictSession(score, total).titre;

// ---------------------------------------------------------------------------
// Duel : la partie, son verdict, sa revue

export const PARTIE = {
  /** écran avant de jouer */
  avant: DUEL.avant,
  copieRendue: DUEL.copieRendue,
  /** l'écran juste après la copie : le titre, puis la ligne qui calcule */
  copieRendueTitre: "Copie rendue.",
  compare: "On compare les traits…",
  /** « Le trait est à Hugo P. » (sans double point quand le pseudo finit par un point) */
  attente: (nom: string) => DUEL.attente(nom).replace(/[.][.]$/, "."),
  expire: DUEL.expire,
  revue: DUEL.revue,
  revanche: DUEL.revanche,
  nouveau: DUEL.nouveau,
  trouver: DUEL.trouver,
  /** « Revoir la partie » (en-tête de la revue) */
  revoir: LEXIQUE.revoirLaPartie,
  /** défaite par forfait : ma copie n'a pas été rendue à temps */
  forfaitMoi: "Tu n'as pas pris le pinceau à temps : défaite par forfait.",
  forfaitEux: (nom: string) => `${nom} n'a pas pris le pinceau : victoire par forfait.`,
  /** la question décisive, vue de mon côté */
  decisive: (pourMoi: boolean, nom: string) => (pourMoi ? "là où tu as pris l'avantage pour de bon" : `là où ${nom} a pris l'avantage pour de bon`),
  decisiveMot: "Décisive",
  /** la revue reste ouverte, la liste « à revoir » dure 14 jours */
  fenetre: (jours: number) => `Dans « À revoir » pendant ${jours} jours.`,
  /** placement : le rang ne s'affiche qu'après la 5e partie */
  placement: (joues: number, total: number) => `Placement ${Math.min(joues, total)}/${total} · ta place se dessine`,
  placementTitre: "Placement",
  placementLigne: "Ta place se dessine",
  eloProvisoire: "ELO provisoire",
  /** filtre de la revue */
  mesRatures: IA.mesRatures,
  tout: "Toute la partie",
  pagePropre: LEXIQUE.pagePropre,
  pagePropreTexte: "Aucune rature dans cette partie. Tu peux tout relire dans « Toute la partie ».",
  revueVide: "Correction indisponible",
  revueVideTexte: "La correction s'ouvre quand la partie est terminée pour vous deux. Si c'est déjà le cas, recharge la page dans un instant.",
  /** croisement des deux copies */
  communes: "Ratures communes",
  justeToi: "Juste pour toi seul",
  justeLui: (nom: string) => `Juste pour ${nom} seul`,
  /** une marque de copie, pour les lecteurs d'écran */
  marque: (m: "ok" | "ko" | "none") => (m === "ok" ? "juste" : m === "ko" ? "rature" : "sans réponse"),
  /** étiquette d'une question corrigée */
  etiquette: (m: "ok" | "ko" | "none") => (m === "ok" ? "Juste" : m === "ko" ? "Rature" : "Sans réponse"),
  /** IA, sous la carte sombre de la revue */
  iaTexte: "Colle ta revue dans ton IA : bilan par thème et explication de chaque rature, avec le contexte de la partie.",
  iaTout: "Toute la partie",
  iaToutSeul: "Copier toute la partie",
  annule: "Défi annulé",
  expireTitre: "Partie expirée",
  /** l'enjeu, avant de jouer */
  enjeu: { gagne: "Si tu gagnes", nulle: LEXIQUE.nulle, perd: "Si tu perds" },
  /** le lobby */
  lobbyHasard: "Au hasard",
  lobbyHasardTexte: `Un joueur de ton niveau, les mêmes questions. Personne en vue${NBSP}? Tu joues tout de suite.`,
  recherche: "Recherche…",
  reprendre: "Reprendre ma partie",
  defierTitre: "Défier quelqu'un",
  aucunJoueur: "Aucun joueur ne correspond. Essaie son pseudo exact ou son e-mail.",
  tesDuels: "Tes duels",
  aRevoirTexte: "Chaque partie terminée arrive ici, avec ses questions corrigées et « Copier pour l'IA ».",
  plusAnciennes: "Plus anciennes",
  /** lignes « en cours » */
  teDefie: (nom: string) => `${nom} te défie`,
  aToi: (expire: string) => `à toi le trait · expire dans ${expire}`,
  chercheAdv: "copie rendue · on cherche ton adversaire",
  attendAdv: "en attente d'un adversaire · tu peux déjà jouer",
  /** le match */
  regles: (n: number, minutes: number): [string, string][] => [
    [`${n} questions`, ", les mêmes et dans le même ordre pour vous deux."],
    [`${minutes} min`, " : le chrono ne s'arrête plus, même si tu fermes la page."],
    ["Réponses définitives", " ; tu peux passer et revenir. Scores cachés jusqu'à la fin."],
  ],
  rendreConfirm: (blanches: number) =>
    blanches > 0
      ? `Rendre ta copie maintenant ? ${blanches > 1 ? `${blanches} questions sans réponse compteront comme ratures` : "1 question sans réponse comptera comme rature"}.`
      : "Rendre ta copie maintenant ?",
  /** la carte d'état : défi reçu, attente, clos */
  invite: "Refuser ne coûte rien.",
  chercheTitre: "On cherche ton adversaire",
  attenteReponse: (nom: string) => `En attente de ${nom}`,
  refuseTitre: "Pas de partie cette fois",
  refuse: "Le défi a été refusé ou annulé : rien ne bouge côté ELO.",
  personneAdv: "Aucun adversaire n'a pris le pinceau à temps. Rien ne bouge.",
  correctionAttend: " Tes réponses ne sont pas perdues : ta correction t'attend.",
  revoirReponses: "Revoir tes réponses",
} as const;

/** Le mot de l'issue, sans point : « Victoire », « Défaite », « Nulle ». */
export const motIssue = (won: boolean | null) => (won === true ? "Victoire" : won === false ? "Défaite" : LEXIQUE.nulle);

/** « 8 ratures », « page propre » (liste « À revoir ») */
export const raturesPartie = (n: number | null) => (n === null ? null : n === 0 ? "page propre" : ratures(n));

// ---------------------------------------------------------------------------
// Classement

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
  rangs: "Les 8 rangs",
  rangsSous: "Huit rangs. Un seul sommet.",
  regles: "Comment ça marche",
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
