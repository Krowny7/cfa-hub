// Le Codex : le FIL ROUGE (V3 §1.5). Sept chapitres communs à tous les
// programmes (programme « global ») et sans fin : des paliers listés, puis un
// pas constant. Il fait progresser le joueur d'un programme à l'autre, et
// encore après l'examen.
// Les ids « fil:<chapitre>:<n> » désignent le n-ième palier : on n'insère
// JAMAIS un palier intermédiaire (le sens d'un id publié changerait). Un
// palier nouveau s'ajoute après le dernier listé, et le pas ne change jamais
// (scripts/codex/ids-publies.json fige les 12 premiers et leurs seuils).
// Le moteur instancie tous les paliers atteints et pas encore récompensés,
// plus le suivant : un joueur avancé reçoit tout d'un coup, en une seule
// cérémonie (le rattrapage, V3 §1.9), jamais un palier par calcul.
// Module neutre et pur.

import { CADRES, MOTIFS, type Condition } from "@/lib/profil/catalogue";
import { PROGRAMME_GLOBAL } from "@/lib/codex/programmes/ids";
import type { CosmetiqueCodex, FiltreMesure, Prerequis, Quete, TypeMesure } from "@/lib/codex/types";

export type ChapitreFil = {
  id: string;
  titre: string;
  pourquoi: string;
  mesure: TypeMesure;
  filtre?: FiltreMesure;
  /** les seuils listés, croissants (à filtre égal) */
  paliers: number[];
  /** au-delà du dernier palier listé : + pas, à l'infini */
  pas: number;
  xp: (n: number) => number;
  titrePalier: (n: number, seuil: number) => string;
  /** la consigne du palier, à l'impératif */
  consigne: (n: number, seuil: number) => string;
  /** palier → clé de la pièce qu'il donne (« titre:… » : un titre) */
  pieces?: Record<number, string>;
  /** absent : ouvert dès l'acte 0 du programme du joueur (le prologue de CFA I) */
  ouvert?: Prerequis[];
  /** un filtre qui change avec le palier (trophées : l'or, puis le diamant) */
  filtrePalier?: (n: number) => FiltreMesure;
};

/** Les paliers figés par chapitre (ids publiés, vérification du catalogue). */
export const PALIERS_PUBLIES = 12;

/** « 10000 » → « 10 000 » (espace fine insécable, comme le reste du site). */
const milliers = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const listeOu = (l: number[], n: number, apres: number) => l[n - 1] ?? apres;

const XP_TROPHEES = [60, 120, 150, 300, 450, 600];
const XP_ENTRETIEN = [100, 200, 300, 400];

export const CHAPITRES_FIL: ChapitreFil[] = [
  {
    id: "questions",
    titre: "Le copiste",
    pourquoi: "Les apprentis recopiaient les maîtres jusqu'à ce que la main sache seule.",
    mesure: "questions_total",
    paliers: [1000, 2500, 5000, 10000, 20000],
    pas: 10000,
    xp: (n) => Math.min(500, 60 + 40 * n),
    titrePalier: (_, s) => `${milliers(s)} questions`,
    consigne: (_, s) => `Réponds à ${milliers(s)} questions, tous programmes confondus.`,
    pieces: { 4: "titre:copiste" },
  },
  {
    id: "encre",
    titre: "L'encre de toute une vie",
    pourquoi: "La régularité plutôt que l'exploit : chaque jour d'encre compte, même loin de l'examen.",
    mesure: "jours_encre_total",
    paliers: [30, 60, 100, 150, 200, 300],
    pas: 100,
    xp: (n) => Math.min(500, 50 + 50 * n),
    titrePalier: (_, s) => `${milliers(s)} jours d'encre`,
    consigne: (_, s) => `Valide ${milliers(s)} jours d'encre (10 questions ou plus dans la journée).`,
    pieces: { 3: "cadre:plume", 6: "titre:encre-vie" },
  },
  {
    id: "maitres",
    titre: "La galerie des maîtres",
    pourquoi: "Une matière tenue à 85 %, c'est un tableau accroché pour de bon.",
    mesure: "maitres_total",
    paliers: [1, 3, 5, 10, 15, 20],
    pas: 5,
    xp: (n) => Math.min(600, 100 + 80 * n),
    titrePalier: (_, s) => (s === 1 ? "Un premier maître" : `${s} maîtres`),
    consigne: (_, s) => (s === 1 ? "Mène une branche de matière jusqu'à « Maître de… »." : `Mène ${s} branches de matière jusqu'à « Maître de… », tous programmes confondus.`),
    pieces: { 2: "folio:galerie" },
  },
  {
    id: "programmes",
    titre: "La route de Milan",
    pourquoi: "Léonard a quitté Florence pour Milan : un programme fini en ouvre un autre.",
    mesure: "programmes_menes",
    paliers: [1, 2, 3],
    pas: 1,
    xp: () => 400,
    titrePalier: (_, s) => (s === 1 ? "Un programme mené" : `${s} programmes menés`),
    consigne: (_, s) => (s === 1 ? "Mène un programme jusqu'au bout." : `Mène ${s} programmes jusqu'au bout.`),
    pieces: { 1: "banniere:route-milan" },
  },
  {
    id: "trophees",
    titre: "La salle des trophées",
    pourquoi: "Un trophée récompense une séance de qualité, jamais le volume.",
    mesure: "trophees",
    // 1 or, 5 or, puis 1, 10, 25, 50 diamants, puis +25 diamants : croissants à filtre égal
    paliers: [1, 5, 1, 10, 25, 50],
    pas: 25,
    filtrePalier: (n) => ({ palier: n <= 2 ? "or" : "diamant" }),
    xp: (n) => listeOu(XP_TROPHEES, n, 600),
    titrePalier: (n, s) => (n <= 2 ? (s === 1 ? "Un trophée d'or" : `${s} trophées d'or`) : s === 1 ? "Un diamant" : `${s} diamants`),
    consigne: (n, s) => (n <= 2 ? `Gagne ${s === 1 ? "un trophée" : `${s} trophées`} d'or ou mieux.` : `Gagne ${s === 1 ? "un trophée" : `${s} trophées`} diamant.`),
    pieces: { 3: "cadre:diamant-taille", 4: "titre:collectionneur", 5: "banniere:salle-trophees" },
  },
  {
    id: "collection",
    titre: "Le cabinet de curiosités",
    pourquoi: "Chaque pièce gagnée raconte un moment de ta préparation.",
    mesure: "pieces_possedees",
    paliers: [5, 10, 20, 35, 50],
    pas: 15,
    xp: (n) => Math.min(400, 50 + 50 * n),
    titrePalier: (_, s) => `${s} pièces de collection`,
    consigne: (_, s) => `Réunis ${s} pièces de collection : cadres, bannières, titres et folios gagnés.`,
    pieces: { 3: "folio:cabinet" },
  },
  {
    id: "entretien",
    titre: "Garder la main",
    pourquoi: "Après l'examen, deux jours par semaine suffisent pour ne rien perdre.",
    mesure: "semaines_entretien",
    paliers: [4, 12, 26, 52],
    pas: 26,
    xp: (n) => listeOu(XP_ENTRETIEN, n, 400),
    titrePalier: (_, s) => `${s} semaines de main gardée`,
    consigne: (_, s) => `Tiens ${s} semaines à 2 jours d'encre ou plus, une fois l'examen passé.`,
    pieces: { 2: "titre:entretien" },
    ouvert: [{ k: "apresExamen" }],
  },
];

/** Les pièces que donne le fil rouge (COSMETIQUES_CODEX, lib/codex/catalogue.ts). */
export const PIECES_FIL: CosmetiqueCodex[] = [
  { cle: "titre:copiste", type: "titre", nom: "Copiste", description: "A recopié dix mille questions, tous programmes confondus." },
  { cle: "cadre:plume", type: "cadre", nom: "Plume", description: "Une plume d'oie qui trace le tour du sceau, trait après trait.", anime: true },
  { cle: "titre:encre-vie", type: "titre", nom: "Encre de toute une vie", description: "Trois cents jours d'encre, et la main ne tremble pas." },
  { cle: "folio:galerie", type: "folio", nom: "La galerie des maîtres", description: "Une planche du carnet : les portraits des maîtres, accrochés en rang." },
  { cle: "banniere:route-milan", type: "banniere", nom: "La route de Milan", description: "La route qui quitte Florence vers le nord, un programme derrière soi.", anime: true },
  { cle: "cadre:diamant-taille", type: "cadre", nom: "Diamant taillé", description: "Des facettes qui accrochent la lumière autour du sceau.", anime: true },
  { cle: "titre:collectionneur", type: "titre", nom: "Collectionneur", description: "Dix trophées diamant sur l'étagère." },
  { cle: "banniere:salle-trophees", type: "banniere", nom: "La salle des trophées", description: "Une galerie de vitrines où passe la lumière.", anime: true },
  { cle: "folio:cabinet", type: "folio", nom: "Le cabinet de curiosités", description: "Une planche du carnet : les tiroirs ouverts d'un cabinet de curiosités." },
  { cle: "titre:entretien", type: "titre", nom: "La main gardée", description: "A gardé la main douze semaines après l'examen." },
];

export const idFil = (chapitre: string, n: number) => `fil:${chapitre}:${n}`;

/** « fil:encre:3 » → { chapitre: "encre", n: 3 } ; null si ce n'est pas un palier du fil. */
export function palierFilDe(id: string): { chapitre: string; n: number } | null {
  const m = /^fil:([a-z-]+):(\d+)$/.exec(id);
  return m ? { chapitre: m[1], n: Number(m[2]) } : null;
}

/** Le seuil du n-ième palier : listé, sinon le dernier listé plus (n − listés) pas. */
export function seuilFil(c: ChapitreFil, n: number): number {
  const l = c.paliers.length;
  return n <= l ? c.paliers[n - 1] : c.paliers[l - 1] + (n - l) * c.pas;
}

/** Le filtre de la mesure au n-ième palier. */
export const filtreFil = (c: ChapitreFil, n: number): FiltreMesure | undefined => (c.filtrePalier ? c.filtrePalier(n) : c.filtre);

/** Le plus haut palier récompensé (ou terminé) de chaque chapitre, d'après codex_progression. */
export function paliersRecompenses(progression: { quete_id: string; etat: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of progression) {
    const p = palierFilDe(l.quete_id);
    if (p && (l.etat === "recompensee" || l.etat === "terminee")) out[p.chapitre] = Math.max(out[p.chapitre] ?? 0, p.n);
  }
  return out;
}

/** Le n-ième palier d'un chapitre, en quête (famille « fil », programme « global »). */
export function queteFil(c: ChapitreFil, n: number, ouverture: Prerequis[]): Quete {
  const seuil = seuilFil(c, n);
  const filtre = filtreFil(c, n);
  const piece = c.pieces?.[n];
  return {
    id: idFil(c.id, n),
    famille: "fil",
    programme: PROGRAMME_GLOBAL,
    // pas de « chaine » : les ids de chapitre croisent ceux des chaînes (« encre ») ; le chapitre se lit dans l'id
    palier: n,
    ordre: n,
    titre: c.titrePalier(n, seuil),
    consigne: c.consigne(n, seuil),
    pourquoi: c.pourquoi,
    objectif: { k: "mesure", mesure: c.mesure, seuil, ...(filtre ? { filtre } : {}) },
    prerequis: n > 1 ? [{ k: "quete", id: idFil(c.id, n - 1) }] : (c.ouvert ?? ouverture),
    recompense: { xp: c.xp(n), ...(piece ? (piece.startsWith("titre:") ? { titre: piece } : { cosmetique: piece }) : {}) },
    repetition: "unique",
    visibilite: "visible",
    nouvelle: "v3",
  };
}

/** Garde-fou : le plus haut palier qu'un calcul instancie (au-delà, au calcul suivant). */
const PALIER_MAX_CALCUL = 200;

/**
 * Le plus haut palier atteint d'un chapitre, les paliers pris dans l'ordre
 * (le n-ième ne compte que si les précédents le sont) : `valeur(filtre)` rend
 * la mesure sous ce filtre (null : inconnue → 0).
 */
export function palierAtteint(c: ChapitreFil, valeur: (filtre: FiltreMesure | undefined) => number | null, depuis = 0): number {
  let n = depuis;
  while (n < PALIER_MAX_CALCUL) {
    const v = valeur(filtreFil(c, n + 1));
    if (v === null || v < seuilFil(c, n + 1)) break;
    n++;
  }
  return n;
}

/**
 * Les paliers du fil à suivre : pour chaque chapitre, tous les paliers
 * atteints et pas encore récompensés, plus le suivant (au moins le palier en
 * cours et celui d'après), et les paliers récompensés dont la fanfare n'a pas
 * été jouée (pour la fête). `atteints` : chapitre → plus haut palier atteint
 * (absent : inconnu, seulement le palier en cours et le suivant).
 * `ouverture` : ce qui ouvre le premier palier (l'acte 0 du programme du joueur).
 */
export function quetesFilRouge(progression: { quete_id: string; etat: string; vu?: boolean }[], o: { ouverture: Prerequis[]; atteints?: Record<string, number> }): Quete[] {
  const faits = paliersRecompenses(progression);
  const aFeter = progression.flatMap((l) => {
    const p = l.etat === "recompensee" && l.vu === false ? palierFilDe(l.quete_id) : null;
    return p ? [p] : [];
  });
  return CHAPITRES_FIL.flatMap((c) => {
    const k = faits[c.id] ?? 0;
    const dernier = Math.min(Math.max(k + 2, (o.atteints?.[c.id] ?? 0) + 1), k + PALIER_MAX_CALCUL);
    const fetes = aFeter.filter((p) => p.chapitre === c.id && p.n <= k).map((p) => p.n).sort((a, b) => a - b);
    return [...fetes, ...Array.from({ length: dernier - k }, (_, i) => k + 1 + i)].map((n) => queteFil(c, n, o.ouverture));
  });
}

/** Les premiers paliers de chaque chapitre (vérification du catalogue, ids publiés). */
export const paliersFil = (ouverture: Prerequis[], n = PALIERS_PUBLIES): Quete[] =>
  CHAPITRES_FIL.flatMap((c) => Array.from({ length: n }, (_, i) => queteFil(c, i + 1, ouverture)));

// ── Les pièces possédées (mesure « pieces_possedees ») ─────────────────
// Ce que le moteur sait voir : les pièces et titres versés par le Codex
// (codex_progression), les pièces des sceaux (cadres et bannières à
// condition de sceau ou de dorures, lib/profil/catalogue.ts) et les pièces
// d'état des trophées (copie locale de V3 §3.3, point 4 : lib/profil/pieces.ts
// les déclare côté profil). Les pièces de questions et de rang n'y sont pas :
// l'étagère du profil en compte un peu plus (écart assumé, V3 §3.4).

export type TropheesLus = { source: string; palier: number; n: number }[];

/** Trophées de palier ≥ p (1 bronze … 4 diamant), d'une source si donnée. */
export const tropheesAuMoins = (t: TropheesLus, p: number, source?: string) => t.filter((x) => x.palier >= p && (!source || x.source === source)).reduce((s, x) => s + x.n, 0);

const PIECES_TROPHEES: { cle: string; ok: (t: TropheesLus) => boolean }[] = [
  { cle: "cadre:diamant-taille", ok: (t) => tropheesAuMoins(t, 4) >= 1 },
  { cle: "banniere:salle-trophees", ok: (t) => tropheesAuMoins(t, 3) >= 10 },
  { cle: "titre:collectionneur", ok: (t) => tropheesAuMoins(t, 4) >= 10 },
  { cle: "cadre:vitrine-or", ok: (t) => new Set(t.filter((x) => x.palier >= 3 && x.n > 0).map((x) => x.source)).size >= 4 },
];

/** Une pièce du profil ouverte par les sceaux (palier d'un sceau, ou nombre de dorures). */
function parSceaux(c: Condition | null | undefined, sceaux: Record<string, number>): boolean {
  if (!c) return false;
  if (c.k === "sceau") return (sceaux[c.cle] ?? 0) >= c.palier;
  if (c.k === "dorures") return Object.values(sceaux).filter((p) => p >= 3).length >= c.n;
  return false;
}

export function compterPiecesCodex(p: { progression: { etat: string; cosmetique: string | null; titre: string | null }[]; sceaux?: Record<string, number>; trophees?: TropheesLus }): number {
  const cles = new Set<string>();
  for (const l of p.progression) {
    if (l.etat !== "recompensee" && l.etat !== "terminee") continue;
    if (l.cosmetique) cles.add(l.cosmetique);
    if (l.titre) cles.add(l.titre);
  }
  const sceaux = p.sceaux ?? {};
  for (const c of CADRES) if (parSceaux(c.condition, sceaux)) cles.add(`cadre:${c.key}`);
  for (const m of MOTIFS) if (parSceaux(m.condition, sceaux)) cles.add(`banniere:${m.key}`);
  for (const x of PIECES_TROPHEES) if (p.trophees && x.ok(p.trophees)) cles.add(x.cle);
  return cles.size;
}
