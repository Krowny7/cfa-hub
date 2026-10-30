// La voix de « la partie de cartes » (/flashcards/partie) : Léonard de Vinci,
// croupier, distribue les flashcards comme un jeu de casino. Les entrées sur
// les pages Flashcards, l'écran « Prépare ta partie », la table (phrases de
// Léonard, commandes), le bilan.
//
// Module neutre (ni « use client » ni serveur). Mêmes garde-fous que
// lib/voice.ts : toujours le chiffre, jamais « raté » ni « Bravo », pas de
// point d'exclamation, le bout qui reste toujours nommé ; les libellés
// fonctionnels (boutons, réglages) restent simples. Léonard parle court et
// avec un peu de malice, sans jamais se moquer de la personne.

import { nombre, pluriel } from "@/lib/voice";
import type { NiveauBilan, SituationTable } from "@/lib/flashcards/partie";

const s = (n: number) => (n > 1 ? "s" : "");

/** Les 10 matières telles qu'elles s'écrivent sur les puces des réglages, avec leur abréviation du bilan. */
export const MATIERES_PARTIE: Record<string, { nom: string; abrege: string }> = {
  ethics: { nom: "Ethics", abrege: "ETH" },
  quant: { nom: "Quant", abrege: "QUANT" },
  economics: { nom: "Economics", abrege: "ECO" },
  corporate: { nom: "Corporate Issuers", abrege: "CORP" },
  fsa: { nom: "FSA", abrege: "FSA" },
  equity: { nom: "Equity", abrege: "EQ" },
  fixed_income: { nom: "Fixed Income", abrege: "FI" },
  derivatives: { nom: "Derivatives", abrege: "DER" },
  alternatives: { nom: "Alternatives", abrege: "ALT" },
  portfolio: { nom: "Portfolio Mgmt", abrege: "PM" },
};

// ---------------------------------------------------------------------------
// Les entrées : la page Flashcards et la page d'une matière

export const PARTIE_ENTREE = {
  titre: "La partie de cartes",
  /** carte de la page Flashcards */
  ligne: "Léonard distribue des mains de cartes face cachée. Tu cherches la réponse, tu retournes, tu dis si tu maîtrises : un jeton par carte maîtrisée.",
  /** avec une matière déjà choisie */
  ligneMatiere: (matiere: string) => `Une partie sur ${matiere} : Léonard distribue, tu retournes, tu gagnes un jeton par carte maîtrisée.`,
  action: "Jouer",
  actionMatiere: "Partie de cartes",
  /** le petit titre de la carte, au-dessus du titre */
  surTitre: "Léonard · croupier",
  aide: "Une partie de flashcards où Léonard de Vinci est le croupier",
  /** le sceau de la carte */
  jetons: "jetons",
} as const;

// ---------------------------------------------------------------------------
// « Prépare ta partie »

export const PARTIE_REGLAGES = {
  surTitre: "Partie de cartes",
  titre: "Prépare ta partie",
  sous: "Choisis tes cartes ; Léonard s'occupe de la donne.",
  croupier: "Léonard · croupier",
  matieres: "Matières",
  paquets: "Paquets",
  paquetsCoches: (n: number, sur: number) => `${n} paquet${s(n)} coché${s(n)} sur ${sur}`,
  /** les 4 mains/cartes sur la puce d'un paquet : « 1/4 · Instruments, émission & marchés » */
  paquet: (numero: number | null, total: number, theme: string) => (numero ? `${numero}/${total} · ${theme}` : theme),
  paquetCartes: (n: number) => `${n} cartes`,
  aucunPaquet: "Coche au moins une matière pour voir ses paquets.",
  matiereVide: "bientôt",
  mains: "Nombre de mains",
  parMain: "Cartes par main",
  moinsParMain: "Une carte de moins par main",
  plusParMain: "Une carte de plus par main",
  seulementNon: "Seulement les cartes non maîtrisées",
  melanger: "Mélanger les cartes",
  distribuer: "Distribuer",
  distribution: "Léonard bat les cartes…",
  /** les jetons en jeu, dans le panneau de Léonard */
  jetonsEnJeu: (n: number) => ({ chiffre: nombre(n), ligne1: `jeton${s(n)} à gagner,`, ligne2: "un par carte maîtrisée" }),
  jetonsAlt: (n: number) => `${pluriel(n, "jeton", "jetons")} à gagner, un par carte maîtrisée`,
  /** la ligne sous les réglages */
  resume: (r: { total: number; mains: number; parMain: number; vivier: number; melange: boolean; toutMaitrise: boolean }) => {
    if (r.total > 0) {
      return `${pluriel(r.mains, "main", "mains")} de ${pluriel(r.parMain, "carte", "cartes")} : ${pluriel(r.total, "carte tirée", "cartes tirées")} parmi ${nombre(r.vivier)}, ${r.melange ? "mélangées" : "dans l'ordre des paquets"}.`;
    }
    return r.toutMaitrise ? "Tout est maîtrisé dans cette sélection. Décoche « Seulement les cartes non maîtrisées » pour rejouer." : "Aucune carte à distribuer pour l'instant.";
  },
  /** les phrases de Léonard sur l'écran des réglages (et sa pose) */
  bulle: {
    debut: "Dis-moi ce que tu veux réviser, je distribue.",
    vide: "Sans paquet, je n'ai rien à distribuer.",
    toutMaitrise: "Tout est déjà maîtrisé ici. Bien. Choisis d'autres paquets, ou rejoue les anciens.",
    longue: "Une longue partie. J'aime cette ambition.",
    nonMaitrisees: "Seulement ce qui te résiste : voilà de l'honnêteté.",
  },
  erreurDonne: "Léonard n'a pas pu aller chercher les cartes. Vérifie ta connexion et redistribue.",
  retour: "Flashcards",
} as const;

/** La pose et la phrase de Léonard sur l'écran des réglages. */
export function leonardReglages(r: { total: number; vivier: number; paquets: number; seulementNon: boolean }): { pose: "moqueur" | "fier" | "etonne" | "decu"; bulle: string } {
  const b = PARTIE_REGLAGES.bulle;
  if (r.paquets === 0) return { pose: "decu", bulle: b.vide };
  if (r.total === 0) return { pose: "moqueur", bulle: r.seulementNon ? b.toutMaitrise : b.vide };
  if (r.total >= 30) return { pose: "etonne", bulle: b.longue };
  if (r.seulementNon) return { pose: "fier", bulle: b.nonMaitrisees };
  return { pose: "moqueur", bulle: b.debut };
}

// ---------------------------------------------------------------------------
// La table

export const PARTIE_TABLE = {
  croupier: "Léonard · croupier",
  /** « Carte 3 / 9 » */
  rang: (rang: number, total: number) => `Carte ${nombre(rang)} / ${nombre(total)}`,
  main: (n: number, total: number) => `Main ${nombre(n)} sur ${nombre(total)}`,
  /** l'état d'une carte pour le lecteur d'écran */
  etatCarte: (rang: number, total: number, etat: "cachee" | "recto" | "verso" | "ok" | "ko") =>
    `Carte ${nombre(rang)} sur ${nombre(total)} : ` +
    (etat === "cachee" ? "face cachée, touche pour la soulever" : etat === "recto" ? "question affichée, touche pour voir la réponse" : etat === "verso" ? "réponse affichée" : etat === "ok" ? "maîtrisée" : "pas encore maîtrisée"),
  consigne: "Soulève une carte.",
  cmdRecto: { titre: "Cherche la réponse", sous: "Puis retourne la carte." },
  cmdVerso: { titre: "Tu l'avais ?", sous: "Compare avec ta réponse." },
  retourner: "Retourner",
  maitrisee: "Maîtrisée",
  pasEncore: "Pas encore",
  mainSuivante: "Main suivante",
  voirBilan: "Voir le bilan",
  abandonner: "Quitter la partie",
  /** les jetons : le rack de Léonard, ta plaque */
  rack: "Le rack de Léonard",
  plaque: "Ta plaque",
  jetonsGagnes: (n: number, total: number) => `${pluriel(n, "jeton", "jetons")} gagné${s(n)} sur ${nombre(total)}`,
  serie: (n: number) => `Série de ${nombre(n)}`,
  pastilles: (ok: number, total: number) => `${pluriel(ok, "carte maîtrisée", "cartes maîtrisées")} sur ${nombre(total)}`,
  touches: "1 maîtrisée · 2 pas encore · Espace retourne",
  /** la barre du haut */
  hud: { titre: "Partie de cartes", main: "Main", maitrisees: "Maîtrisées", recommencer: "Recommencer", parametres: "Paramètres" },
  /** la touche annoncée sur les boutons */
  toucheEspace: "Espace",
  /** sur le tapis */
  pileKo: "À revoir",
  pileOk: "Maîtrisées",
  /** la plaque du joueur et le rack de Léonard */
  toi: "Toi",
  plaqueJetons: (n: number) => `${nombre(n)} jeton${s(n)} gagné${s(n)}`,
  rackEtiquette: "Léonard",
  rackJetons: (n: number) => `${nombre(n)} jeton${s(n)}`,
  serieX: (n: number) => `Série ×${nombre(n)}`,
  plusUn: "+1",
  /** le dos d'une carte */
  dos: "Ranked Lobby",
  dosMarque: "RL",
  /** la consigne quand une main est jouée */
  mainJouee: "Main jouée.",
} as const;

/** Ce que dit Léonard à la table, selon où en est la main (même situation que sa pose : poseLeonard). */
export function bulleTable(x: SituationTable & { totalCartes?: number }): string {
  const toutJuge = x.tailleMain > 0 && x.jugeesMain >= x.tailleMain;
  const reussie = x.maitriseesMain * 3 >= x.tailleMain * 2;
  const derniere = x.main >= x.nbMains - 1;
  if (toutJuge) {
    if (derniere) return "Fin de partie. Voyons le tableau.";
    return reussie ? "Belle main. Je redistribue ?" : "Main difficile. On enchaîne ?";
  }
  if (x.ouverte === "verso") return "Alors, tu l'avais ? Sois honnête avec toi-même.";
  if (x.ouverte === "recto") return "Cherche la réponse toi-même, puis retourne la carte.";
  if (x.dernier === true) return x.serie >= 3 ? `Série de ${nombre(x.serie)}. Continue.` : "Bien joué : un jeton pour toi.";
  if (x.dernier === false) return "Pas encore. Elle reviendra. Une autre ?";
  return x.main === 0 ? `${pluriel(x.tailleMain, "carte", "cartes")}, face cachée. Choisis-en une.` : "Nouvelle donne. Choisis ta carte.";
}

// ---------------------------------------------------------------------------
// Le bilan

export const PARTIE_BILAN = {
  surTitre: "Partie de cartes · fin de partie",
  titre: "Bilan de la partie",
  jetonsGagnes: "jetons gagnés",
  sousScore: (pct: number) => `un jeton par carte maîtrisée, soit ${nombre(pct)} % de la partie`,
  sur: (total: number) => `/ ${nombre(total)}`,
  recap: (mains: number, cartes: number, jetons: number) => [pluriel(mains, "main", "mains"), pluriel(cartes, "carte", "cartes"), `${pluriel(jetons, "jeton", "jetons")} en jeu`],
  /** une ligne par matière : « 2 / 3 », « Sans faute » */
  fraction: (ok: number, total: number) => `${nombre(ok)} / ${nombre(total)}`,
  mot: (ok: number, total: number) => (total > 0 && ok === total ? "Sans faute" : ok === 0 ? "À reprendre" : `${nombre(ok)} maîtrisée${s(ok)}`),
  ligneAlt: (ok: number, total: number) => `${pluriel(ok, "carte maîtrisée", "cartes maîtrisées")} sur ${nombre(total)}`,
  pileAlt: (n: number, total: number) => `${pluriel(n, "jeton gagné", "jetons gagnés")} sur ${nombre(total)}`,
  aRevoir: (n: number) => `À revoir (${nombre(n)})`,
  rienARevoir: "Rien à revoir : la page est propre.",
  nouvelle: "Nouvelle partie",
  rejouer: (n: number) => `Rejouer les non maîtrisées (${nombre(n)})`,
  /** la phrase de Léonard au bilan */
  bulle: (niveau: NiveauBilan, gagnes: number, total: number) => {
    if (niveau === "sans-faute") return `Sans faute : ${pluriel(gagnes, "jeton", "jetons")} pour toi, et pas un de moins.`;
    if (niveau === "bon") return `Magnifique. Tu étais prêt ; la banque te doit ${pluriel(gagnes, "jeton", "jetons")}.`;
    if (niveau === "moyen") return `${nombre(gagnes)} sur ${nombre(total)}. Un bon début : les autres cartes m'ont l'air de t'attendre.`;
    return "Hmm. Les cartes ne mentent pas. Reprenons celles qui t'ont résisté.";
  },
} as const;
