// Voix « Le Trait » : le lexique de Ranked Lobby et ses phrases prêtes à
// l'emploi. Direction A1 retenue le 3 octobre, avec deux emprunts : le
// lexique du duel de « La Partie » (nulle, revoir la partie, précision) et la
// ligne du verrou de « La Conquête » (« L'ELO ne suffit plus : il faut savoir »).
//
// Module neutre (ni « use client » ni serveur) : toutes les pages l'importent,
// pour qu'une chose n'ait qu'un mot, partout.
//
// Garde-fous de la voix :
// - 90 % de silence : navigation, réglages, filtres et légal restent simples ;
// - toujours le chiffre (« Trait tenu. » est suivi de « 23 sur 32 ») ;
// - jamais « raté », « échec », « oups », « Bravo », ni emoji ; un point
//   d'exclamation au plus, pour un sans-faute ;
// - l'anneau ne se ferme jamais (règle 2) : à l'objectif, la journée est
//   « tenue », et le bout qui manque est toujours nommé ;
// - pas de mot japonais (ni enso, ni dojo), une seule image par écran.

// ---------------------------------------------------------------------------
// Devise, signature, lexique

export const DEVISE = "Le savoir se conquiert.";
export const SIGNATURE = "À toi le trait.";

/** Un mot par chose. Les pages lisent ces termes au lieu de les réécrire. */
export const LEXIQUE = {
  /** l'objectif du jour */
  anneau: "Anneau du jour",
  /** une question répondue */
  trait: "trait",
  traits: "traits",
  /** la série (jours d'affilée) */
  jourEncre: "jour d'encre",
  joursEncre: "jours d'encre",
  /** une erreur */
  rature: "rature",
  ratures: "ratures",
  /** corriger une erreur plus tard */
  reprendre: "reprendre",
  /** aucune erreur */
  pagePropre: "Page propre.",
  maitrise: "maîtrise",
  rang: "rang",
  /** montée de palier */
  sceau: "sceau",
  /** placement */
  placement: "trouver ta place",
  duel: "duel",
  /** à l'intérieur d'un duel */
  partie: "partie",
  nulle: "Nulle",
  revoirLaPartie: "Revoir la partie",
  revanche: "Revanche",
  precision: "précision",
  /** total des questions répondues */
  traitsTraces: "traits tracés",
  /** trophées d'entraînement */
  tampons: "tampons",
  /** nom donné par l'utilisateur : on ne le change pas */
  copierIA: "Copier pour l'IA",
} as const;

// ---------------------------------------------------------------------------
// Petits formats (déterministes : même rendu côté serveur et navigateur)

/** espace insécable (avant « % », entre milliers) */
export const NBSP = String.fromCharCode(160);

/** « 4 812 » */
export function nombre(n: number): string {
  const s = String(Math.round(Math.abs(n)));
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += NBSP;
    out += s[i];
  }
  return (n < 0 ? "−" : "") + out;
}

/** « 54 % » */
export function pct(n: number): string {
  return `${Math.round(n)}${NBSP}%`;
}

/** « +18 », « −9 », « 0 » (vrai signe moins) */
export function signe(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${nombre(r)}` : r < 0 ? `−${nombre(-r)}` : "0";
}

/** Accord en nombre, à la française (0 et 1 au singulier) : « 1 trait », « 14 traits ». */
export function pluriel(n: number, un: string, plusieurs: string): string {
  return `${nombre(n)} ${Math.abs(n) <= 1 ? un : plusieurs}`;
}

/** « 5 min 30 », « 45 s », « 1 h 02 » */
export function duree(secondes: number): string {
  const s = Math.max(0, Math.round(secondes));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r ? `${m} min ${String(r).padStart(2, "0")}` : `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m % 60).padStart(2, "0")}`;
}

export const traits = (n: number) => pluriel(n, "trait", "traits");
export const ratures = (n: number) => pluriel(n, "rature", "ratures");
export const questions = (n: number) => pluriel(n, "question", "questions");
export const joursEncre = (n: number) => pluriel(n, "jour d'encre", "jours d'encre");
/** « encore 14 » : la cote du bout qui reste */
export const encore = (n: number) => `encore ${nombre(n)}`;
/** « encore 14 traits » */
export const encoreTraits = (n: number) => `encore ${traits(n)}`;

/** « J-212 », « Jour J » ; null si la date est passée ou inconnue. */
export function jourJ(joursRestants: number | null | undefined): string | null {
  if (joursRestants === null || joursRestants === undefined || joursRestants < 0) return null;
  return joursRestants === 0 ? "Jour J" : `J-${joursRestants}`;
}

const prenomDe = (nom: string | null | undefined) => (nom ? nom.trim().split(/ +/)[0] : "");
const avecPrenom = (phrase: string, nom: string | null | undefined) => {
  const p = prenomDe(nom);
  return p ? phrase.replace(/[.]$/, `, ${p}.`) : phrase;
};

// ---------------------------------------------------------------------------
// L'anneau du jour (moment 1)

/** Heure (Paris) à partir de laquelle l'encre du jour « sèche » s'il n'y a rien eu. */
export const HEURE_ENCRE_SECHE = 20;

export type EtatAnneau = "vide" | "entame" | "tenu" | "bonus";

export type Anneau = {
  etat: EtatAnneau;
  /** « 26/40 » */
  compte: string;
  /** cote rouge du bout qui reste : « encore 14 » (null quand la journée est tenue) */
  reste: string | null;
  /** « +6 en bonus » au-delà de l'objectif */
  bonus: string | null;
  /** phrase sous l'anneau */
  ligne: string;
  /** texte complet pour les lecteurs d'écran */
  aria: string;
};

export function anneau(repondues: number, objectif: number): Anneau {
  const n = Math.max(0, Math.round(repondues));
  const g = Math.max(1, Math.round(objectif));
  const manque = Math.max(0, g - n);
  const etat: EtatAnneau = n === 0 ? "vide" : n < g ? "entame" : n === g ? "tenu" : "bonus";
  const compte = `${nombre(n)}/${nombre(g)}`;
  const ligne =
    etat === "vide"
      ? "Ton premier trait du jour t'attend."
      : etat === "entame"
        ? `Encore ${traits(manque)} pour tenir ta journée.`
        : "Journée tenue. Le dernier bout, c'est demain.";
  return {
    etat,
    compte,
    reste: manque > 0 ? encore(manque) : null,
    bonus: n > g ? `${signe(n - g)} en bonus` : null,
    ligne,
    aria: `${LEXIQUE.anneau} : ${nombre(n)} sur ${nombre(g)}${manque > 0 ? `, ${encore(manque)}` : ", journée tenue"}`,
  };
}

/** Le premier trait du jour : « Premier trait. 39 à venir. » */
export const premierTrait = (objectif: number) => `Premier trait. ${nombre(Math.max(0, objectif - 1))} à venir.`;

// ---------------------------------------------------------------------------
// Les bâtons (moment 2) : la série en jours d'encre

/** fait : le bâton du jour est tracé · attente : pas encore, la journée continue · sec : le soir, rien encore */
export type EtatJour = "fait" | "attente" | "sec";

/** État du bâton du jour, à partir des réponses du jour et de l'heure de Paris. */
export function etatDuJour(reponduesAujourdhui: number, heureParis: number): EtatJour {
  if (reponduesAujourdhui > 0) return "fait";
  return heureParis >= HEURE_ENCRE_SECHE ? "sec" : "attente";
}

export function serie(jours: number, jour: EtatJour): { titre: string; ligne: string } {
  const j = Math.max(0, Math.round(jours));
  if (j === 0 && jour !== "fait") return { titre: "Papier blanc", ligne: "Un trait suffit pour commencer." };
  const titre = j === 1 ? "1 jour" : `${nombre(j)} jours`;
  if (jour === "fait") {
    const palier = j === 100 ? "Cent traits." : j === 30 ? "Un mois d'encre." : j === 7 ? "Une semaine d'encre." : null;
    return { titre, ligne: palier ?? "ton trait d'aujourd'hui est tracé" };
  }
  if (jour === "sec") return { titre, ligne: "encre sèche ce soir · une question suffit" };
  return { titre, ligne: "le trait du jour reste à tracer" };
}

export const ENCRE = {
  /** titre d'accueil, le soir, série en jeu */
  neLaissePasSecher: "Ne laisse pas sécher l'encre.",
  /** série perdue */
  aSeche: "L'encre a séché. Un trait suffit pour repartir.",
  /** bouton du soir */
  uneQuestion: "Une question · 30 secondes",
} as const;

/** Le retour après 3 jours d'absence (texte simple, sans « tu nous as manqué »). */
export function retour(ouReprendre?: string | null): string {
  return ouReprendre
    ? `L'encre a un peu séché. On reprend où tu t'étais arrêté : ${ouReprendre}.`
    : "L'encre a un peu séché. Cinq questions pour te remettre en main.";
}

// ---------------------------------------------------------------------------
// Accueil

/**
 * Titre d'accueil : il dit l'objectif (« Encore 14 traits, Théo. »).
 * @param heure heure de Paris (0–23), pour l'encre qui sèche le soir
 * @param serie jours d'encre en jeu (le soir, si rien n'a été fait)
 */
export function titreAccueil({
  nom,
  repondues,
  objectif,
  heure = 12,
  serie: jours = 0,
}: {
  nom?: string | null;
  repondues: number;
  objectif: number;
  heure?: number;
  serie?: number;
}): string {
  if (repondues <= 0 && jours > 0 && heure >= HEURE_ENCRE_SECHE) return ENCRE.neLaissePasSecher;
  if (repondues <= 0) return avecPrenom(SIGNATURE, nom);
  if (repondues < objectif) return avecPrenom(`Encore ${traits(objectif - repondues)}.`, nom);
  return avecPrenom("Journée tenue.", nom);
}

/** Ligne de contexte sous le titre : « J-212 · 6 jours d'encre », « Fixe ton jour J ». */
export function ligneContexte({ joursAvantExamen, serie: jours = 0 }: { joursAvantExamen?: number | null; serie?: number }): string {
  const parts = [jourJ(joursAvantExamen) ?? "Fixe ton jour J"];
  if (jours > 0) parts.push(joursEncre(jours));
  return parts.join(" · ");
}

export const ACCUEIL = {
  repriseSurTitre: (il: string) => `Ton dernier trait · ${il}`,
  premierUsage: { surTitre: "Première goutte", titre: "Ouvre ta première fiche", texte: "Une page, puis son quiz. Le reste suit." },
  defiRecu: (nom: string) => `${nom} te défie · à toi le trait`,
  duelParDefaut: "Lance un duel · même épreuve, 30 questions",
} as const;

/** Tuile des erreurs : « Ratures · 12 à reprendre », ou « Page propre. ». */
export function tuileRatures(n: number): { label: string; valeur: string } {
  return { label: "Ratures", valeur: n > 0 ? `${nombre(n)} à reprendre` : LEXIQUE.pagePropre };
}

/** « maîtrise 54 % · il reste 46 % » */
export function maitrise(p: number): string {
  const v = Math.max(0, Math.min(100, Math.round(p)));
  return `maîtrise ${pct(v)} · il reste ${pct(100 - v)}`;
}

/** « précision 73 % » */
export const precision = (p: number) => `précision ${pct(p)}`;

// ---------------------------------------------------------------------------
// Fin de session (copie corrigée)

/** Seuil de réussite déjà utilisé par les sessions (PASS_THRESHOLD). */
export const SEUIL = 70;

export type VerdictSession = {
  /** « Trait tenu. » */
  titre: string;
  /** « 23 sur 32, au-dessus des 70 %. 9 ratures à reprendre. » */
  ligne: string;
  /** sous 50 % seulement : « C'est fait pour ça. … » */
  appui: string | null;
  /** action principale : « Reprendre mes 9 ratures » (null si page propre) */
  action: string | null;
  niveau: "propre" | "sur" | "tenu" | "tremble" | "jet";
};

export function verdictSession(justes: number, total: number): VerdictSession {
  const t = Math.max(0, total);
  const j = Math.max(0, Math.min(t, justes));
  const err = t - j;
  const p = t > 0 ? (j / t) * 100 : 0;
  const niveau: VerdictSession["niveau"] = t > 0 && err === 0 ? "propre" : p >= 85 ? "sur" : p >= SEUIL ? "tenu" : p >= 50 ? "tremble" : "jet";
  const titre = { propre: "Page propre.", sur: "Trait sûr.", tenu: "Trait tenu.", tremble: "Le trait tremble.", jet: "Premier jet." }[niveau];
  const base = `${nombre(j)} sur ${nombre(t)}`;
  const ligne =
    niveau === "propre"
      ? `${base}.`
      : `${base}, ${p >= SEUIL ? "au-dessus" : "sous"} des ${SEUIL}${NBSP}%. ${err > 1 ? `${nombre(err)} ratures à reprendre` : "1 rature à reprendre"}.`;
  return {
    titre,
    ligne,
    appui: niveau === "jet" ? "C'est fait pour ça. Reprends tes ratures une par une." : null,
    action: err > 0 ? `Reprendre mes ${ratures(err)}` : null,
    niveau,
  };
}

/** Sur-titre : « Session · 32 questions · 41 min » */
export function surTitreSession(type: string, total: number, minutes?: number | null): string {
  return [type, questions(total), minutes ? duree(minutes * 60) : null].filter(Boolean).join(" · ");
}

/** Lien avec l'anneau : « +32 traits · journée tenue » */
export function ligneAnneauSession(ajoutes: number, journeeTenue: boolean): string {
  return `+${traits(ajoutes)}${journeeTenue ? " · journée tenue" : ""}`;
}

/** « Par matière · le plus fragile : Derivatives, 2/6 » */
export function plusFragile(matiere: string, justes: number, total: number): string {
  return `Par matière · le plus fragile : ${matiere}, ${justes}/${total}`;
}

export const IA = {
  label: LEXIQUE.copierIA,
  sousLigne: "tes ratures, avec leur contexte",
  mesRatures: "Mes ratures",
  tout: "Toute la copie",
  copie: "Copié. Colle-le dans ton IA.",
} as const;

// ---------------------------------------------------------------------------
// Duel : la partie

export const DUEL = {
  trouver: "Trouver un adversaire",
  avant: SIGNATURE,
  copieRendue: "Copie rendue. On compare les traits…",
  attente: (adversaire: string) => `Le trait est à ${adversaire}.`,
  sansFaute: "Sans rature.",
  revanche: LEXIQUE.revanche,
  nouveau: "Nouveau duel",
  expire: "Personne n'a pris le pinceau. Rien ne bouge.",
  revue: (n: number) => (n > 0 ? `${LEXIQUE.revoirLaPartie} · ${ratures(n)}` : LEXIQUE.revoirLaPartie),
} as const;

export type IssueDuel = "victoire" | "defaite" | "nulle";

export type VerdictDuel = {
  /** le mot au pinceau : « Victoire. », « Défaite. », « Nulle. » */
  mot: string;
  /** une phrase, toujours chiffrée */
  phrase: string;
  /** défaite : « −9. Ça se reprend : tes 12 ratures d'abord. » */
  rebond: string | null;
  /** bouton de revue : « Revoir la partie · 8 ratures » */
  revue: string;
};

export function verdictDuel({
  issue,
  moi,
  lui,
  adversaire,
  tempsMoi,
  tempsLui,
  deltaElo,
  ratures: nRatures = 0,
  forfait = false,
}: {
  issue: IssueDuel;
  /** mon score */
  moi: number;
  /** son score */
  lui: number;
  adversaire: string;
  /** temps de copie, en secondes (départage) */
  tempsMoi?: number | null;
  tempsLui?: number | null;
  deltaElo?: number | null;
  ratures?: number;
  forfait?: boolean;
}): VerdictDuel {
  const ecart = tempsMoi != null && tempsLui != null ? Math.abs(tempsMoi - tempsLui) : null;
  let phrase: string;
  if (issue === "victoire") {
    phrase = forfait
      ? `Victoire par forfait : ${adversaire} n'a pas pris le pinceau.`
      : moi === lui
        ? `${nombre(moi)} partout. Tu as été plus rapide${ecart ? ` de ${duree(ecart)}` : ""}.`
        : `${nombre(moi)} contre ${nombre(lui)}. Ton trait était plus sûr.`;
  } else if (issue === "defaite") {
    phrase =
      moi === lui
        ? `${nombre(moi)} partout. ${adversaire} a été plus rapide${ecart ? ` de ${duree(ecart)}` : ""}.`
        : `${nombre(moi)} contre ${nombre(lui)}. ${adversaire} a eu le trait plus sûr.`;
  } else {
    phrase = `${nombre(moi)} partout, à la seconde près. C'est rare.`;
  }
  const rebond =
    issue === "defaite"
      ? `${deltaElo ? `${signe(deltaElo)}. ` : ""}Ça se reprend${nRatures > 0 ? ` : tes ${ratures(nRatures)} d'abord` : ""}.`
      : null;
  const mot = issue === "victoire" ? "Victoire." : issue === "defaite" ? "Défaite." : `${LEXIQUE.nulle}.`;
  return { mot, phrase, rebond, revue: DUEL.revue(nRatures) };
}

// ---------------------------------------------------------------------------
// Rang : montée, descente, placement, verrou

/** La ligne du verrou, vérité de marque : le rang se gagne en duel, l'élite exige de savoir. */
export const VERROU = "L'ELO ne suffit plus : il faut savoir.";

/** « Le prochain bout : Diamant » */
export const prochainBout = (palier: string) => `Le prochain bout : ${palier}`;

/** « 88 points avant Platine » */
export const pointsAvant = (points: number, palier: string) => `${pluriel(points, "point", "points")} avant ${palier}`;

export type MomentRang = { titre: string; phrase: string };

/** Montée de palier : « Platine. » + « Le sceau est posé. Prochaine marche : Diamant, 150 points et 60 % de maîtrise. » */
export function montee({ palier, suivant, points, maitriseRequise }: { palier: string; suivant?: string | null; points?: number | null; maitriseRequise?: number | null }): MomentRang {
  let phrase = "Le sceau est posé.";
  if (suivant) {
    const conditions = [points ? pluriel(points, "point", "points") : null, maitriseRequise ? `${pct(maitriseRequise)} de maîtrise` : null].filter(Boolean).join(" et ");
    phrase += ` Prochaine marche : ${suivant}${conditions ? `, ${conditions}` : ""}.`;
  } else {
    phrase += " Au sommet. Le trait continue.";
  }
  return { titre: `${palier}.`, phrase };
}

/** Montée de division : « Or I. Un trait de plus. » */
export const monteeDivision = (rang: string): MomentRang => ({ titre: `${rang}.`, phrase: "Un trait de plus." });

/** Descente : jamais de cérémonie, une ligne calme. */
export function descente(rang: string, pointsPourRevenir?: number | null): MomentRang {
  return {
    titre: `Tu repasses ${rang}.`,
    phrase: pointsPourRevenir ? `${pluriel(pointsPourRevenir, "point", "points")} pour revenir. Un palier perdu, pas le savoir.` : "Un palier perdu, pas le savoir. Ça se reprend.",
  };
}

/** Pendant le placement : « Placement 3/5 · ta place se dessine » */
export const placement = (joues: number, total = 5) => `Placement ${Math.min(joues, total)}/${total} · ta place se dessine`;

/** Fin du placement : « Ta place : Or III. » */
export const finPlacement = (rang: string): MomentRang => ({
  titre: `Ta place : ${rang}.`,
  phrase: "Cinq parties pour la trouver, toutes les autres pour la dépasser.",
});

/** Verrou de maîtrise : « Diamant t'attend à 60 % de maîtrise. Tu es à 54 %. » + VERROU */
export function verrou(palier: string, requise: number, actuelle: number): MomentRang {
  return { titre: `${palier} t'attend à ${pct(requise)} de maîtrise. Tu es à ${pct(actuelle)}.`, phrase: VERROU };
}

export const SOMMET = "Au sommet. Le trait continue.";

/** Moments signature : à la veille de l'examen. */
export const veilleJourJ = (total: number) => `${traits(total)} pour en arriver là. Demain, c'est toi qui tiens le pinceau.`;

// ---------------------------------------------------------------------------
// Erreur rayée (moment 6)

export const RATURE = {
  reprise: "Rature reprise.",
  /** bandeau d'une demi-seconde : « Rayée de ton carnet · plus que 11 » */
  rayee: (reste: number) => (reste > 0 ? `Rayée de ton carnet · plus que ${nombre(reste)}` : "Rayée de ton carnet · page propre"),
  semaine: (n: number) => `${pluriel(n, "rayée", "rayées")} cette semaine`,
  depuisToujours: (n: number) => `${pluriel(n, "rature reprise", "ratures reprises")} depuis le début`,
  dimanche: (n: number) => `${ratures(n)} cette semaine. Reprends-les avant lundi.`,
} as const;

// ---------------------------------------------------------------------------
// États vides, 404, connexion

export const VIDE = {
  ratures: LEXIQUE.pagePropre,
  semaine: "Papier blanc cette semaine. Un trait suffit.",
  radar: "Ton tracé se dessine dès 5 questions par matière.",
  duels: "Aucune partie encore. Le premier trait est à toi.",
  adversaires: "Personne à défier pour l'instant. Invite quelqu'un qui pense pouvoir te battre.",
  /** au survol d'un domaine « bientôt » */
  domaineFerme: "Ton rang y partira de zéro.",
  duelsBientot: "Les duels arrivent. Ton ELO attend sa première partie.",
} as const;

export const INTROUVABLE = {
  titre: "Cette page n'a jamais été tracée.",
  action: "Revenir à l'accueil",
} as const;

export const CONNEXION = {
  titre: DEVISE,
  sousTitre: "Révise trait par trait. Mesure-toi en duel. Ton rang dit le reste.",
  carteTitre: "Entre dans le lobby",
  carteTexte: "Un compte Google suffit. Ton premier trait est à deux clics.",
  etapesTitre: "Tes trois premiers traits",
  etapes: ["Choisis ton nom de joueur et ton jour J.", "Ouvre une fiche, fais son quiz.", "Joue 5 parties de placement : ta place se dessine."],
  rangs: "Huit rangs. Un seul sommet.",
  rangsSous: "un par domaine",
  /** présentation de l'espace Moi */
  moi: "Ton encre, tes ratures, ta courbe.",
} as const;

// ---------------------------------------------------------------------------
// Annexe A1 : les phrases signature, telles quelles

export const ANNEXE = [
  DEVISE,
  SIGNATURE,
  // « Anneau fermé. Le grand, jamais. » : réservé à un texte sur le grand
  // anneau ; pour l'objectif du jour, dire « Journée tenue. » (règle 2).
  "Anneau fermé. Le grand, jamais.",
  ENCRE.neLaissePasSecher,
  ENCRE.aSeche,
  LEXIQUE.pagePropre,
  "Le trait tremble.",
  "Trait tenu.",
  "Trait sûr.",
  "Premier jet.",
  "Ça se reprend.",
  VERROU,
  "Ta place : Or III. Cinq parties pour la trouver, toutes les autres pour la dépasser.",
  "Le sceau est posé.",
  CONNEXION.rangs,
  CONNEXION.carteTitre + ".",
  INTROUVABLE.titre,
] as const;
