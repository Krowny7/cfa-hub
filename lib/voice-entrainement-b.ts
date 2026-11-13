// Voix des sous-pages « S'entraîner B » refaites le 2026-11-13 (direction « le lieu, puis l'objet ») :
// le calendrier des défis du jour (/defi, /defi/cinq), la plaque des séries éclair (/eclair), la
// rangée des dossiers (/cas-pratiques), l'ouverture de l'Atelier (/atelier). Module neutre (ni
// « use client » ni serveur) ; les phrases se composent des données, aucun chiffre écrit en dur.

import { NBSP, nombre, pluriel } from "@/lib/voice";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const JOURS_COURTS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

const majuscule = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Le calendrier des défis du jour. */
export const CALENDRIER = {
  /** les initiales des jours, du lundi au dimanche */
  semaine: ["L", "M", "M", "J", "V", "S", "D"],
  mois: (m: number) => MOIS[m - 1] ?? "",
  /** le titre de la fenêtre de cinq semaines (« Octobre – Novembre ») ; l'année seulement si ce n'est pas celle d'aujourd'hui */
  titreFenetre: (debut: string, fin: string, anneeAujourdhui: number) => {
    const nom = (key: string) => {
      const a = Number(key.slice(0, 4));
      return `${majuscule(MOIS[Number(key.slice(5, 7)) - 1] ?? "")}${a !== anneeAujourdhui ? ` ${a}` : ""}`;
    };
    return debut.slice(0, 7) === fin.slice(0, 7) ? nom(fin) : `${nom(debut)} – ${nom(fin)}`;
  },
  plusTot: "Cinq semaines plus tôt",
  plusTard: "Cinq semaines plus tard",
  /** le 1er du mois porte le mois, sous son numéro : « nov. » */
  moisCourt: (m: number) => MOIS_COURTS[m - 1] ?? "",
  jourCourt: (lundi0: number) => JOURS_COURTS[lundi0] ?? "",
  /** « Vendredi », en haut de la feuille du jour */
  jourLong: (lundi0: number) => majuscule(JOURS[lundi0] ?? ""),
  /** la ligne d'état de la porte : le format (la date est sur la feuille du jour) */
  ligne: (questions: number, minutes: number, cinq: boolean) =>
    `${pluriel(questions, "question", "questions")}${cinq ? " de cours" : ""} · ${nombre(minutes)}${NBSP}min · une copie · les mêmes pour tout le monde`,
  /** le chiffre-héros de la porte : les jours d'affilée avec une copie rendue */
  affilee: (n: number) => (n > 1 ? "jours d'affilée" : "jour d'affilée"),
  /** les 5 du jour : la série d'encre, et ce qu'il reste à faire aujourd'hui pour la tenir */
  encre: (n: number, reste: number) => `${n > 1 ? "jours d'encre" : "jour d'encre"}${reste > 0 ? ` · encore ${pluriel(reste, "question", "questions")}` : ""}`,
  // la feuille du jour
  aujourdhui: "Aujourd'hui",
  rendueA: (heure: string) => `Rendue à ${heure}`,
  /** l'enjeu vrai : le jour se fige à minuit (heure de Paris) */
  seFige: (reste: string) => `Se fige dans ${reste}`,
  /** « 5 h », « 25 min » */
  reste: (minutes: number) => (minutes < 60 ? `${nombre(Math.max(1, Math.round(minutes)))}${NBSP}min` : `${nombre(Math.floor(minutes / 60))}${NBSP}h`),
  copies: (n: number, meilleur: number | null, total: number) =>
    n > 0 ? `${pluriel(n, "copie rendue", "copies rendues")}${meilleur !== null ? ` · la meilleure ${nombre(meilleur)}/${nombre(total)}` : ""}` : "Aucune copie rendue",
  taCopie: "Ta copie",
  rang: (rang: string, joueurs: number) => `${rang} sur ${nombre(joueurs)}`,
  revoir: "Revoir ma copie",
  ratures: (n: number) => pluriel(n, "rature", "ratures"),
  classement: "Le classement du jour",
  toutClassement: "Tout le classement",
  toi: "toi",
  /** le tampon d'un sans-faute (« tenu » veut dire 4 sur 5 ailleurs : ici, c'est le sans-faute) */
  sansFaute: "Sans faute",
  // les cases des jours passés (lecteur d'écran et infobulle)
  caseJouee: (jour: string, score: number, total: number, sansFaute: boolean, revue: string | null) =>
    `${majuscule(jour)} : ${nombre(score)} sur ${nombre(total)}${sansFaute ? ", sans faute" : ""}${revue ? ` · revue ${revue}` : ""}`,
  caseEnCours: (jour: string) => `${majuscule(jour)} : copie en cours, à reprendre`,
  caseManquee: (jour: string, joueurs: number) => `${majuscule(jour)} : pas de copie · ${pluriel(joueurs, "joueur", "joueurs")}`,
  caseAujourdhui: (jour: string) => `${majuscule(jour)} : aujourd'hui`,
  enCours: "en cours",
  /** la case d'aujourd'hui, tant que la copie n'est pas rendue */
  aJouer: "à jouer",
};

/** La plaque des séries éclair. */
export const PLAQUE = {
  /** la ligne d'état de la porte */
  ligne: "Des questions de cours, sans calcul, tirées pour toi · à volonté",
  /** le chiffre-héros : les séries rendues aujourd'hui */
  heros: (n: number) => (n > 1 ? "séries aujourd'hui" : "série aujourd'hui"),
  /** l'enjeu vrai : la série d'encre n'est pas encore tenue aujourd'hui */
  enjeu: (reste: number) => `Série d'encre · encore ${pluriel(reste, "question", "questions")}`,
  /** le haut de la plaque */
  serieN: (n: number) => `Série n°${NBSP}${nombre(n)}`,
  /** au départ : la précision récente, à côté du chiffre en Dela ; sans elle, le numéro de la série */
  recent: "sur tes 20 dernières",
  serie: "série du jour",
  /** sous les cases : la promesse, en Mono */
  promesse: "Corrigées tout de suite · erreurs au carnet",
  /** le bilan */
  justes: "justes",
  cinq: "Les 5 du jour",
  combo: (n: number) => `Combo ×${nombre(n)}`,
  comboAria: (n: number) => `${pluriel(n, "bonne réponse", "bonnes réponses")} d'affilée`,
  xp: (xp: number) => `+${nombre(xp)}${NBSP}XP`,
};

/** La rangée des dossiers (cas pratiques). */
export const DOSSIERS = {
  ligne: (n: number) => `${pluriel(n, "dossier", "dossiers")} de FSA, d'après de vrais comptes annuels`,
  heros: (n: number) => (n > 1 ? "dossiers bouclés" : "dossier bouclé"),
  avancement: (faites: number, total: number) => `${nombre(faites)}/${nombre(total)}`,
  /** à côté de « 3/14 » : le total est déjà écrit */
  faites: "faites",
  boucle: "Bouclé",
  ouvrir: (nom: string) => `Ouvrir le dossier ${nom}`,
  reprendre: (nom: string) => `Reprendre le dossier ${nom}`,
  lecture: (nom: string, faites: number, total: number) => `${nom} : ${nombre(faites)} sur ${nombre(total)} questions`,
};

/** L'ouverture de l'Atelier. */
export const ATELIER_B = {
  /** le chiffre-héros : les notions encore sous le seuil */
  heros: (n: number) => (n > 1 ? "points faibles" : "point faible"),
  /** l'étiquette de la fiche */
  notion: "La notion du jour",
  enCours: "Atelier en cours",
  /** sous les notions d'un Atelier en cours */
  faites: (n: number) => pluriel(n, "réponse donnée", "réponses données"),
  /** la précision de la notion, sous le seuil « tenu » */
  seuil: (pct: number) => `tenu · ${nombre(pct)}${NBSP}%`,
  /** « 2 justes sur 5 · encore 2 pour tenir », comme sur l'ardoise */
  justes: (ok: number, n: number, manque: number) => `${pluriel(ok, "juste", "justes")} sur ${nombre(n)}${manque > 0 ? ` · encore ${nombre(manque)} pour tenir` : ""}`,
  ratures: (n: number) => pluriel(n, "rature en cours", "ratures en cours"),
  /** les autres notions, derrière */
  autres: (n: number) => `${pluriel(n, "autre point faible", "autres points faibles")} derrière`,
};
