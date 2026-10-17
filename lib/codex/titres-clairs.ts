// Le Codex : les TITRES CLAIRS (Codex simplifié, règle d'écriture « l'action
// d'abord, l'histoire dans les fêtes »). Un titre dit ce qu'il faut faire, en
// 40 caractères au plus : un verbe, ou un chiffre et un objet du site, avec la
// matière nommée. On peut faire la quête sans ouvrir son détail.
// Les identifiants et les titres du catalogue ne changent pas : l'affichage
// lit titreClair(q), qui se replie sur le titre du catalogue pour une quête
// inconnue d'ici, et la recherche de la carte lit les deux noms. Les noms
// d'exploits restent imagés (ce sont des objets de collection) : seule leur
// énigme se lit en clair. Trois mots maison seulement : trait, rature et
// jour d'encre (plus « notion tenue »).
// Les chiffres des branches, du fil rouge et de la semaine d'encre se lisent
// dans l'objectif de la quête : le titre ne peut pas mentir sur un seuil.
// Module neutre et pur (serveur et navigateur).

import { catalogueCodex, contenuDuProgramme, type ContenuMatiere } from "@/lib/codex/catalogue";
import { de, gabarit } from "@/lib/codex/elision";
import { CHAPITRES_FIL, filtreFil, palierFilDe, seuilFil } from "@/lib/codex/fil-rouge";
import { notionParId } from "@/lib/notions";
import { romain } from "@/lib/voice-codex";
import type { Acte, Objectif, Quete } from "@/lib/codex/types";

/** La longueur maximale d'un titre (règle d'écriture, §4.1). */
export const TITRE_MAX = 40;

/** Les paramètres d'un contrat du jour (ContratTire["params"], lib/codex/moteur.ts). */
export type ParamsContrat = Partial<Record<"matiere" | "notion" | "fiche", string>>;

/**
 * Ce que le titre d'une quête peut demander en plus d'elle : les paramètres
 * d'un contrat du jour (la notion et la fiche n'y sont pas), et le contenu du
 * programme quand ce n'est pas le CFA I (le nom court des matières).
 */
export type ContexteTitre = { params?: ParamsContrat; contenu?: ContenuMatiere[] };

/**
 * Ce que lit un titre clair : une quête, ou une ligne de la vue (LigneQuete,
 * lib/codex/vue.ts), qui n'a pas l'objectif : il se lit alors dans le
 * catalogue du CFA I, et la cible d'une ligne remplace son seuil.
 */
export type QueteTitree = Pick<Quete, "id" | "titre" | "famille"> & Partial<Pick<Quete, "objectif" | "matiere" | "etape" | "indice">> & { cible?: number };

/** « 1000 » → « 1 000 » (espace fine insécable, comme le fil rouge). */
const milliers = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

// ── Les quêtes à id fixe (CFA I) ───────────────────────────────────────

/** Les étapes d'une chaîne au long cours : « longcours:<chaine>:<n> » → titre. */
const etapes = (chaine: string, titres: string[]): Record<string, string> => Object.fromEntries(titres.map((t, i) => [`longcours:${chaine}:${i + 1}`, t]));

const programme = (n: number) => `Programme entier à ${n} % de maîtrise`;
const rappels = (n: number) => `${milliers(n)} questions réussies 7 jours après`;

/**
 * Le titre clair de chaque quête visible à id fixe du CFA I : la trame, les
 * chaînes au long cours, les contrats de la semaine et le débrief. Un miroir
 * (Quete.miroir) porte le titre de la quête qui paie : c'est la même.
 */
export const TITRES_CLAIRS: Readonly<Record<string, string>> = {
  // prologue
  "trame:prologue:premier-trait": "Répondre à ta première question",
  "trame:prologue:jour-j": "Fixer ton jour J et ton objectif",
  "trame:prologue:dix": "Répondre à 10 questions",
  "trame:prologue:premiere-seance": "Finir une séance entière",
  "trame:prologue:visite": "Suivre la visite de Léonard",
  // acte I : les outils, dans l'ordre qu'on veut
  "trame:a1:fiche": "Lire une fiche et passer son drill",
  "trame:a1:cinq": "Rendre les 5 du jour",
  "trame:a1:rature": "Corriger ta première rature",
  "trame:a1:atelier": "Faire ta première séance d'Atelier",
  "trame:a1:duel": "Jouer ton premier duel",
  "trame:a1:calcul": "Répondre juste à 5 calculs",
  "trame:a1:cours": "Écouter 15 min d'un cours",
  // acte II : les dix matières
  "trame:a2:trois": "10 questions dans 3 matières",
  "trame:a2:dix": "10 questions dans chaque matière",
  "trame:a2:ciblee": "Réussir une séance ciblée à 70 %",
  "trame:a2:serie": "3 jours d'encre d'affilée",
  "trame:a2:drill": "Finir toutes les pages d'une fiche",
  // acte III : couvrir et retenir
  "trame:a3:maitrises": "3 matières à 60 % de maîtrise",
  "trame:a3:ratures": "Corriger 20 ratures",
  "trame:a3:rappels": rappels(20),
  "trame:a3:tenues": "Tenir 25 notions du programme",
  "trame:a3:atelier": "Faire 3 séances d'Atelier",
  // acte IV : le premier examen blanc
  "trame:a4:blanc": "Rendre un premier examen blanc",
  "trame:a4:semaines": "4 semaines à 4 jours d'encre",
  "trame:a4:moitie": programme(50),
  "trame:a4:remontee": "Remonter une matière de 10 points",
  // acte V : le programme à 60 %
  "trame:a5:blanc": "Réussir un examen blanc à 60 %",
  "trame:a5:programme": programme(60),
  "trame:a5:carnet": "50 ratures en cours au plus",
  "trame:a5:tenues": "Tenir 75 % des notions",
  // acte VI : le niveau de l'examen
  "trame:a6:programme": programme(70),
  "trame:a6:blancs": "Réussir 2 examens blancs à 70 %",
  "trame:a6:palette": "Les 10 matières à 65 % ou plus",
  "trame:a6:ethique": "Ethics solide : 75 % de maîtrise",
  // le dernier mois
  "trame:ep:blanc": "Rendre un examen blanc de 90 questions",
  "trame:ep:carnet": "20 ratures en cours au plus",
  "trame:ep:ethique": "40 questions d'Ethics en 2 semaines",
  "trame:ep:veille": "Les 5 du jour ou une série éclair",
  "trame:ep:malle": "Cocher 5 cases de la malle",
  "trame:ep:lendemain": "Voir le chemin parcouru",

  // les chaînes au long cours (les retirées n'ont pas de titre clair : elles ne s'affichent plus)
  ...etapes("compas", [30, 45, 60, 70, 80].map(programme)),
  ...etapes("metier", [1, 3, 5, 8].map((n) => `${n} ${n > 1 ? "matières" : "matière"} à 70 % de maîtrise`)),
  ...etapes("memoire", [10, 50, 150, 400, 1000].map(rappels)),
  ...etapes("carnet", ([[100, 500], [60, 1000], [30, 2000]] as const).map(([r, q]) => `${r} ratures au plus, dès ${milliers(q)} questions`)),
  ...etapes("commandes", ["Rendre un premier examen blanc", "Rendre 3 examens blancs", "Réussir un examen blanc à 70 %", "Réussir 3 examens blancs à 70 %", "Réussir un examen blanc à 80 %"]),
  ...etapes("encre", [2, 4, 8, 12, 20].map((n) => `${n} semaines à 4 jours d'encre`)),
  ...etapes("remontee", ["Remonter une matière de 10 points", "Remonter 3 matières de 10 points", "Remonter 5 matières de 10 points"]),
  ...etapes("rythme", [1, 4, 8, 16].map((n) => `Tenir ton rythme ${n} ${n > 1 ? "semaines" : "semaine"}`)),
  ...etapes("main-juste", [5, 15, 40, 100, 200].map((n) => `Réussir ${n} séances à 70 %`)),
  ...etapes("carte-tenue", [10, 25, 50, 75, 100].map((n) => (n === 100 ? "Tenir toutes les notions" : `Tenir ${n} % des notions`))),
  ...etapes("joute", ["Jouer 5 duels", "Jouer 25 duels", "Atteindre Or au classement", "Atteindre Platine au classement", "Atteindre Diamant au classement"]),

  // les contrats de la semaine (la semaine d'encre et le banquier se lisent dans la quête : TITRES_DYNAMIQUES)
  "contrat:hebdo:pigments": "Répondre juste dans 6 matières",
  "contrat:hebdo:commande": "Rendre un examen blanc cette semaine",
  "contrat:hebdo:copiste-revoir": "Vider « À revoir » 5 jours",
  "contrat:hebdo:copiste-scellees": "15 ratures corrigées pour de bon",
  "contrat:hebdo:ingenieur-blanc": "Un demi-examen blanc cette semaine",
  "contrat:hebdo:ingenieur-trente": "Rendre 2 fois les 30 du jour",
  "contrat:debrief": "Classer les erreurs de ton examen blanc",
};

/** Le premier seuil d'un objectif (le premier de « tous » ou « unDe ») ; null s'il n'en a pas. */
function seuilDe(o: Objectif | undefined): number | null {
  if (!o) return null;
  if (o.k === "tous" || o.k === "unDe") return o.objectifs.length ? seuilDe(o.objectifs[0]) : null;
  return typeof o.seuil === "number" ? o.seuil : null;
}

/** Les quêtes à id fixe dont un chiffre ou la matière se lit dans la quête elle-même. */
const TITRES_DYNAMIQUES: Record<string, (q: QueteTitree, o: ContexteTitre) => string | null> = {
  // la cible de la semaine : 3, 4 ou 5 jours (quetesSemaine)
  "contrat:hebdo:encre": (q) => `${q.cible ?? seuilDe(objectifDe(q)) ?? 5} jours d'encre cette semaine`,
  "contrat:hebdo:banquier": (q, o) => {
    const m = matiereDe(q.matiere, o.contenu);
    const s = q.cible ?? seuilDe(objectifDe(q));
    return m && s !== null ? `+5 points en ${m.court} : ${s} %` : null;
  },
};

/**
 * Le choix de la semaine (COMMANDES, le lundi) : le nom imagé reste, le
 * résumé dit ce que la semaine demande.
 */
export const RESUMES_SEMAINE: Readonly<Record<string, string>> = {
  banquier: "+5 points dans ta matière lourde la plus faible.",
  copiste: "Vider « À revoir » 5 jours et corriger 15 ratures pour de bon.",
  ingenieur: "Un demi-examen blanc et 2 fois les 30 du jour.",
};

/** Le résumé clair d'un choix de la semaine (repli : celui du catalogue). */
export const resumeSemaine = (c: { id: string; resume: string }): string => RESUMES_SEMAINE[c.id] ?? c.resume;

// ── Les contrats du jour ───────────────────────────────────────────────
// Un gabarit par modèle (MODELES_CONTRATS) ; {matiere} et {fiche} y sont le
// nom court de la matière (« FSA »), {notion} le nom court de la notion.

/** Le titre clair d'un contrat du jour, par modèle. */
export const TITRES_CONTRATS: Readonly<Record<string, string>> = {
  "notion-faible": "8 justes sur {notion}",
  "matiere-faible": "Séance ciblée en {matiere} à 65 %",
  "drill-page": "Page de drill de {fiche} à 70 %",
  atelier: "Faire une séance d'Atelier",
  calculs: "10 calculs justes en {matiere}",
  ratures: "Corriger 5 ratures",
  "ratures-vieilles": "Corriger 3 ratures de plus de 7 jours",
  rappel: "10 questions vues il y a 7 jours ou plus",
  "matiere-oubliee": "Reprendre {matiere} : 15 questions",
  cours: "Écouter 20 min du cours de {matiere}",
  flashcards: "Réviser 30 flashcards",
  cinq: "Réussir 4 des 5 du jour",
  eclair: "Réussir 2 séries éclair à 4/5",
  duel: "Jouer un duel",
  defi: "Rendre les 30 du jour",
  reprise: "Reprendre en douceur : 10 questions",
};

/** Quand le gabarit dépasse 40 caractères avec son paramètre (une notion au nom long) : le titre sans lui. */
const CONTRATS_SANS_PARAMETRE: Readonly<Record<string, string>> = {
  "notion-faible": "8 justes sur ta notion faible",
};

/** « contrat:<modèle>:<AAAA-MM-JJ> » → le modèle ; null pour un autre id. */
export const modeleDeContrat = (id: string): string | null => /^contrat:([a-z-]+):\d{4}-\d{2}-\d{2}$/.exec(id)?.[1] ?? null;

/** Le titre clair d'un contrat du jour, ses paramètres remplis ; null si l'un manque. */
export function titreContrat(modele: string, params: ParamsContrat, contenu?: ContenuMatiere[]): string | null {
  const g = TITRES_CONTRATS[modele];
  if (!g) return null;
  const liste = contenu ?? contenuParDefaut();
  const valeurs = {
    matiere: liste.find((m) => m.key === params.matiere)?.court,
    fiche: liste.find((m) => m.fiche === params.fiche)?.court,
    notion: notionParId(params.notion)?.court,
  };
  const t = gabarit(g, valeurs);
  if (t.includes("{")) return null;
  return t.length <= TITRE_MAX ? t : (CONTRATS_SANS_PARAMETRE[modele] ?? null);
}

// ── Le contenu et le catalogue du CFA I, lus à la demande ──────────────

let contenuCfa: ContenuMatiere[] | null = null;
/** Le contenu du CFA I, lu à la première demande (jamais au chargement : le catalogue importe ce qui l'importe). */
const contenuParDefaut = () => (contenuCfa ??= contenuDuProgramme());

let catalogueCfa: Map<string, Quete> | null = null;
/** L'objectif d'une quête ; pour une ligne de la vue, celui du catalogue du CFA I (lu à la première demande). */
const objectifDe = (q: QueteTitree): Objectif | undefined =>
  q.objectif ?? (catalogueCfa ??= new Map(catalogueCodex(contenuParDefaut()).map((x) => [x.id, x]))).get(q.id)?.objectif;

function matiereDe(cle: string | undefined, contenu?: ContenuMatiere[]): ContenuMatiere | null {
  return cle ? ((contenu ?? contenuParDefaut()).find((m) => m.key === cle) ?? null) : null;
}

// ── Les branches de matière ────────────────────────────────────────────

/** L'épreuve signature d'une branche (SIGNATURES_CFA_L1, ou la règle générique). */
function titreSignature(o: Objectif, court: string): string | null {
  if (o.k === "compteur" && o.evenement === "drill_page_terminee") return `Une page de drill ${de(court)} à 100 %`;
  if (o.k !== "special" || typeof o.seuil !== "number") return null;
  if (o.cle === "serie_calculs_matiere") return `${o.seuil} calculs sans faute en ${court}`;
  if (o.cle === "serie_bonnes_matiere") return `${o.seuil} questions sans faute en ${court}`;
  return null;
}

/** Le titre d'une étape de branche, la matière nommée, son seuil lu dans l'objectif. */
function titreBranche(q: QueteTitree, m: ContenuMatiere): string | null {
  const c = m.court;
  const o = objectifDe(q);
  if (!o) return null;
  const s = seuilDe(o);
  switch (q.etape) {
    case "entree": return `${s} questions en ${c}`;
    case "cours": return `Écouter ${s} min du cours ${de(c)}`;
    case "fiche": return o.k === "compteur" && o.evenement === "fiche_ouverte" ? `Lire la fiche ${c}` : `Passer une page de drill en ${c}`;
    case "drill": return `Finir tout le drill ${de(c)}`;
    case "flashcards": return `Réviser ${s} flashcards ${de(c)}`;
    case "ciblee": return `Séance ciblée en ${c} à 70 %`;
    case "serie": return `${s} justes sur 20 en ${c}`;
    // retirée (les notions tenues la remplacent) : gardée pour une ligne ancienne
    case "tour": return `Voir toutes les notions ${de(c)}`;
    case "carte": return m.notions > 0 ? `Tenir les ${m.notions} notions ${de(c)}` : `Tenir toutes les notions ${de(c)}`;
    case "maitrise60":
    case "maitrise75": return `${c} à ${s} % de maîtrise`;
    case "signature": return titreSignature(o, c);
    case "maitre": return `${c} à ${s} %, toutes notions vues`;
    default: return null;
  }
}

// ── Le fil rouge ───────────────────────────────────────────────────────

/** Le titre clair d'un palier du fil rouge, par chapitre (seuil lu dans fil-rouge.ts). */
const TITRES_FIL: Record<string, (seuil: number, or: boolean) => string> = {
  questions: (s) => `Répondre à ${milliers(s)} questions`,
  encre: (s) => `${milliers(s)} jours d'encre au total`,
  maitres: (s) => (s === 1 ? "1 titre « Maître de… »" : `${s} titres « Maître de… »`),
  programmes: (s) => (s === 1 ? "Mener un programme au bout" : `Mener ${s} programmes au bout`),
  trophees: (s, or) => `${s} ${s > 1 ? "trophées" : "trophée"} ${or ? "d'or" : "diamant"}`,
  collection: (s) => `${s} pièces de collection`,
  entretien: (s) => `${s} semaines à 2 jours d'encre`,
};

function titreFil(id: string): string | null {
  const p = palierFilDe(id);
  const c = p && CHAPITRES_FIL.find((x) => x.id === p.chapitre);
  const t = c && TITRES_FIL[c.id];
  return c && t ? t(seuilFil(c, p.n), filtreFil(c, p.n)?.palier === "or") : null;
}

/** Le nom clair d'un chapitre du fil rouge (« Fil rouge · Trophées · 3 sur 7 »). */
export const TITRES_CHAPITRES_FIL: Readonly<Record<string, string>> = {
  questions: "Questions",
  encre: "Jours d'encre",
  maitres: "Titres de maître",
  programmes: "Programmes menés",
  trophees: "Trophées",
  collection: "Collection",
  entretien: "Après l'examen",
};

/** Le nom clair d'une chaîne au long cours (« Objectifs longs »), retirées comprises. */
export const TITRES_CHAINES: Readonly<Record<string, string>> = {
  compas: "Maîtrise du programme",
  metier: "Matières à 70 %",
  memoire: "Rappels à 7 jours",
  carnet: "Ratures en cours",
  commandes: "Examens blancs",
  encre: "Régularité",
  remontee: "Matières remontées",
  rythme: "Ton rythme",
  "main-juste": "Séances réussies",
  "carte-tenue": "Notions tenues",
  joute: "Duels et classement",
  // retirées
  carte: "Notions vues",
  justesse: "Séances justes",
  calculs: "Calculs",
  sources: "Pages de drill",
  atelier: "Atelier",
  trentaine: "Les 30 du jour",
};

// ── Les exploits : le nom reste, l'énigme se lit ───────────────────────

/** L'énigme lisible des exploits « indice » : elle nomme l'outil et laisse deviner le seuil. */
export const ENIGMES_CLAIRES: Readonly<Record<string, string>> = {
  "exploit:joconde": "Un sans-faute sur une séance de 20 questions ou plus.",
  "exploit:phenix": "Les 30 du jour : une chute un jour, la revanche le lendemain.",
  "exploit:uomo-universale": "Répondre dans les 10 matières la même semaine.",
  "exploit:vitruve": "Les 10 matières, toutes très haut en même temps.",
  "exploit:miroir": "Réussir enfin une question ratée 3 fois.",
  "exploit:premier-sur-l-echafaudage": "Les 5 du jour, avant tout le monde.",
  "exploit:velin-immacule": "Plus aucune rature en cours, après 1 000 questions.",
  "exploit:rythme": "Un examen blanc à la vitesse de l'examen.",
  "exploit:grand-chelem": "Des trophées d'or sur 4 chemins différents.",
};

/** L'énigme d'un exploit, lisible (repli : celle du catalogue). */
export const enigmeClaire = (q: Pick<Quete, "id" | "indice">): string | null => ENIGMES_CLAIRES[q.id] ?? q.indice ?? null;

// ── Le titre clair d'une quête ─────────────────────────────────────────

/**
 * Le titre clair d'une quête, null si ce fichier ne lui en donne pas (un
 * exploit garde son nom ; le test exige un titre pour toute quête visible).
 */
export function titreClairDe(q: QueteTitree, o: ContexteTitre = {}): string | null {
  const dyn = TITRES_DYNAMIQUES[q.id];
  if (dyn) return dyn(q, o);
  const fixe = TITRES_CLAIRS[q.id];
  if (fixe) return fixe;
  if (q.famille === "exploit") return q.titre;
  if (q.famille === "fil") return titreFil(q.id);
  if (q.famille === "branche") {
    const m = matiereDe(q.matiere, o.contenu);
    return m ? titreBranche(q, m) : null;
  }
  const modele = modeleDeContrat(q.id);
  if (modele) return titreContrat(modele, { ...(q.matiere ? { matiere: q.matiere } : {}), ...o.params }, o.contenu);
  return null;
}

/** Le titre à afficher : le titre clair, sinon celui du catalogue. */
export const titreClair = (q: QueteTitree, o: ContexteTitre = {}): string => titreClairDe(q, o) ?? q.titre;

/** Sans accents ni majuscules, pour chercher. */
const plat = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** La recherche de la carte : le texte est-il dans le titre clair ou dans celui du catalogue ? */
export function correspond(q: QueteTitree, recherche: string, o: ContexteTitre = {}): boolean {
  const r = plat(recherche.trim());
  return !r || plat(titreClair(q, o)).includes(r) || plat(q.titre).includes(r);
}

// ── Les actes ──────────────────────────────────────────────────────────

/** Les actes du CFA I : un titre clair et leur but, en une phrase. */
const ACTES_CLAIRS: Readonly<Record<string, { titre: string; but: string }>> = {
  prologue: { titre: "Premiers pas", but: "Répondre à 10 questions et finir une première séance." },
  acte1: { titre: "Découvrir les outils", but: "Essayer 4 outils du site sur 7, dans l'ordre que tu veux." },
  acte2: { titre: "Les 10 matières", but: "10 questions dans chaque matière, puis une séance ciblée à 70 %." },
  acte3: { titre: "Couvrir et retenir", but: "3 matières à 60 %, 20 ratures corrigées et 25 notions tenues." },
  acte4: { titre: "Premier examen blanc", but: "Un examen blanc, 4 semaines régulières et la moitié du programme." },
  acte5: { titre: "Programme à 60 %", but: "Ouvert à 8 matières validées : programme et examen blanc à 60 %." },
  acte6: { titre: "Niveau examen", but: "Programme à 70 %, 2 examens blancs réussis et Ethics à 75 %." },
  epilogue: { titre: "Dernier mois", but: "Examen blanc, ratures et Ethics, puis du repos avant le jour J." },
};

/** Les actes de la trame générique (« <slug>/g<n> », lib/codex/programmes/generique.ts) : leur but est déjà clair. */
const ACTES_GENERIQUES_CLAIRS = ["Premiers pas", "Toutes les matières", "La moitié des notions", "80 % des notions", "Le programme entier"];

const numeroGenerique = (id: string): number | null => {
  const m = /\/g(\d+)$/.exec(id);
  return m ? Number(m[1]) : null;
};

/** Le titre clair d'un acte (« Les 10 matières »), sinon celui du catalogue. */
export function titreActe(a: Pick<Acte, "id" | "titre">): string {
  const g = numeroGenerique(a.id);
  return ACTES_CLAIRS[a.id]?.titre ?? (g !== null ? ACTES_GENERIQUES_CLAIRS[g] : undefined) ?? a.titre;
}

/** Le but d'un acte, en une phrase (repli : le but du catalogue). */
export const butActe = (a: Pick<Acte, "id" | "but">): string => ACTES_CLAIRS[a.id]?.but ?? a.but;

/** « Prologue · Premiers pas », « Acte II · Les 10 matières », « Dernier mois ». */
export function nomActe(a: Pick<Acte, "id" | "titre" | "numero">): string {
  const t = titreActe(a);
  if (a.numero === 99) return t;
  return `${a.numero === 0 ? "Prologue" : `Acte ${romain(a.numero)}`} · ${t}`;
}
