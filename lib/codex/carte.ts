// Le Codex : la carte en trois niveaux de zoom (V3 §10.1, cran 7). Module
// neutre et pur : ce que la carte montre selon l'échelle de la vue (le
// tronc et les dix pastilles de matière dézoomé, les étapes et leur glyphe
// au zoom moyen, leurs noms au zoom fort), le texte trop petit qu'on masque,
// l'encre d'une matière qui pâlit avec les jours sans y toucher, l'encre
// sèche des quêtes tamponnées depuis longtemps, les filtres et la
// recherche. L'écran (components/codex/CarteCodex.tsx, PastilleMatiere.tsx)
// l'applique ; la palette de commandes (components/nav/CommandPalette.tsx)
// cherche les quêtes ici.

import { joursDepuis, pctCap, type VueCap } from "@/lib/codex/cap";
import type { EtapeBranche } from "@/lib/codex/types";
import type { LigneQuete, VueBranche, VueCodex } from "@/lib/codex/vue";

// ── Les trois niveaux ──────────────────────────────────────────────────

/** Les seuils d'échelle : dézoomé sous 0,55 ; moyen de 0,55 à 1,1 ; fort au-dessus. */
export const ECHELLES = { moyen: 0.55, fort: 1.1 } as const;

export type NiveauCarte = 1 | 2 | 3;

/** Le niveau de la carte à l'échelle `s` : 1 dézoomé, 2 moyen, 3 fort. */
export function niveauDe(s: number): NiveauCarte {
  return s < ECHELLES.moyen ? 1 : s <= ECHELLES.fort ? 2 : 3;
}

/** Aucun texte sous 12 px à l'écran. */
export const TEXTE_MIN = 12;

/** Un texte de `px` (taille CSS dans la carte) se lit à l'échelle `s` : px × s ≥ 12. Sinon on le masque, on ne le réduit pas. */
export const lisible = (px: number, s: number) => px * s >= TEXTE_MIN - 1e-9;

/** Les tailles de texte (fixes, dans la carte) à masquer à l'échelle `s`. */
export function taillesCachees(s: number, tailles: readonly number[]): number[] {
  return tailles.filter((px) => !lisible(px, s));
}

// ── Les étapes au zoom moyen ───────────────────────────────────────────

/** Le glyphe d'une étape : F fiche, D drill, ◎ séance ciblée (ou série juste), S signature, ♛ Maître ; rien pour les autres. */
export function glypheEtape(etape: EtapeBranche | undefined): string | undefined {
  switch (etape) {
    case "fiche": return "F";
    case "drill": return "D";
    case "ciblee":
    case "serie": return "◎";
    case "signature": return "S";
    case "maitre": return "♛";
    default: return undefined;
  }
}

// ── L'encre ────────────────────────────────────────────────────────────

/** L'encre d'une matière pâlit avec les jours sans y toucher : 1 − min(0,6 ; jours / 30). Inconnue : pleine. */
export function opaciteFraicheur(jours: number | null): number {
  if (jours === null || !Number.isFinite(jours)) return 1;
  return Math.round((1 - Math.min(0.6, Math.max(0, jours) / 30)) * 100) / 100;
}

/** Une quête tamponnée depuis plus de 14 jours : son encre a séché (vermillon adouci), la carte crie l'avenir. */
export const SECHE_APRES = 14;

export function seche(l: Pick<LigneQuete, "etat" | "termineeLe">, jour: string): boolean {
  if (l.etat !== "terminee") return false;
  const j = joursDepuis(l.termineeLe, jour);
  return j !== null && j > SECHE_APRES;
}

// ── Les pastilles de matière ───────────────────────────────────────────

export type EtatNotion = "non_vue" | "vue" | "tenue";

/** Une notion vue : 5 réponses ; tenue : 3 justes sur les 5 dernières (V3 §8.5, NOTION_TENUE du moteur). */
export function etatNotion(n: number, j5: number | null): EtatNotion {
  if (n < 5) return "non_vue";
  return j5 !== null && j5 >= 3 ? "tenue" : "vue";
}

export type PastilleVue = {
  cle: string;
  court: string;
  nom: string;
  /** « 52 % », « ≈ 52 % », « pas encore mesurée » */
  pct: string;
  zone: VueBranche["maitrise"]["zone"];
  /** l'anneau : étapes faites / total de la branche */
  fraction: number;
  faites: number;
  total: number;
  maitre: boolean;
  /** l'encre qui pâlit (0,4 – 1) */
  opacite: number;
  /** « touchée il y a 12 j » ; null : inconnue */
  touchee: string | null;
};

/** La pastille d'une branche : sigle, pourcentage et zone, anneau de progression, encre qui pâlit. */
export function pastilleDe(b: VueBranche): PastilleVue {
  const m = b.maitrise;
  const j = m.jours;
  return {
    cle: b.contenu.key,
    court: b.contenu.court,
    nom: b.contenu.nom,
    pct: pctCap(m),
    zone: m.zone,
    fraction: b.total ? b.faites / b.total : 0,
    faites: b.faites,
    total: b.total,
    maitre: b.maitre,
    opacite: opaciteFraicheur(j),
    touchee: j === null ? null : j === 0 ? "touchée aujourd'hui" : j === 1 ? "touchée hier" : `touchée il y a ${j} j`,
  };
}

// ── Les filtres ────────────────────────────────────────────────────────

export type FiltreCarte = "tout" | "afaire" | "faiblesses";

export const FILTRES: { cle: FiltreCarte; libelle: string }[] = [
  { cle: "tout", libelle: "Tout" },
  { cle: "afaire", libelle: "À faire" },
  { cle: "faiblesses", libelle: "Mes faiblesses" },
];

/** Les matières en zone basse (« Mes faiblesses ») : sous 50 %. */
export function matieresFaibles(cap: Pick<VueCap, "matieres"> | null): Set<string> {
  return new Set((cap?.matieres ?? []).filter((m) => m.zone === "basse").map((m) => m.cle));
}

/** Une quête reste en vue sous ce filtre : à faire = ouverte et pas faite ; faiblesses = d'une matière en zone basse. */
export function garde(l: Pick<LigneQuete, "etat" | "matiere">, f: FiltreCarte, faibles: ReadonlySet<string>): boolean {
  if (f === "afaire") return l.etat === "disponible" || l.etat === "active";
  if (f === "faiblesses") return !!l.matiere && faibles.has(l.matiere);
  return true;
}

// ── La recherche ───────────────────────────────────────────────────────

/** Minuscules, sans accents ni ligatures : « Œuvre » et « oeuvre » se trouvent. */
export const normaliser = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/gi, "oe").replace(/æ/gi, "ae").toLowerCase();

/**
 * Les quêtes dont le titre ou la consigne contient tous les mots cherchés,
 * celles dont le titre les contient d'abord ; `n` au plus. Moins de deux
 * lettres : rien.
 */
export function chercher<T extends { titre: string; consigne?: string }>(items: readonly T[], texte: string, n = 8): T[] {
  const mots = normaliser(texte).split(/\s+/).filter(Boolean);
  if (mots.join("").length < 2) return [];
  const dansTitre: T[] = [];
  const dansConsigne: T[] = [];
  for (const it of items) {
    const t = normaliser(it.titre);
    if (mots.every((m) => t.includes(m))) dansTitre.push(it);
    else if (mots.every((m) => (t + " " + normaliser(it.consigne ?? "")).includes(m))) dansConsigne.push(it);
  }
  return [...dansTitre, ...dansConsigne].slice(0, n);
}

/**
 * Les quêtes de la carte qu'on peut chercher (trame, branches, long cours,
 * exploits), une fois chacune ; jamais une énigme ni une quête cachée : la
 * recherche ne dévoile rien.
 */
export function quetesDeLaCarte(vue: Pick<VueCodex, "trame" | "branches" | "longCours" | "exploits">): LigneQuete[] {
  const vues = new Set<string>();
  const out: LigneQuete[] = [];
  const toutes = [...vue.trame.flatMap((a) => a.quetes), ...vue.branches.flatMap((b) => b.etapes), ...vue.longCours.flatMap((c) => c.paliers), ...vue.exploits];
  for (const l of toutes) {
    if (l.affichage === "cache" || (l.affichage === "indice" && l.etat !== "terminee") || vues.has(l.id)) continue;
    vues.add(l.id);
    out.push(l);
  }
  return out;
}

// ── Les deux segments de /codex (Codex simplifié, §3.3) ──────────────

export type SegmentTel = "aujourdhui" | "tout";

/** Les deux segments en tête de /codex, sur téléphone comme sur ordinateur ; le segment est gardé dans l'URL (?vue=). */
export const SEGMENTS_TEL: { cle: SegmentTel; libelle: string }[] = [
  { cle: "aujourdhui", libelle: "Aujourd'hui" },
  { cle: "tout", libelle: "Tout le Codex" },
];

/** Ce que /codex montre : un des deux segments, ou la carte en plein écran (« Voir la carte », ?vue=carte). */
export type VueSegment = SegmentTel | "carte";

/** Les anciens segments (cinq, avant le Codex simplifié) : des liens profonds qui mènent à « Tout le Codex ». */
const VERS_TOUT = ["parcours", "matieres", "chantiers", "exploits"];

/** Le segment lu dans l'URL ; la carte ; un ancien segment : Tout le Codex ; inconnu ou absent : Aujourd'hui. */
export function segmentDe(v: string | null | undefined): VueSegment {
  if (v === "carte") return "carte";
  return v === "tout" || (!!v && VERS_TOUT.includes(v)) ? "tout" : "aujourdhui";
}
