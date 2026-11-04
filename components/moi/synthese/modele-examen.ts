import { MAITRISE } from "@/lib/maitrise";
import { decaleJour, joursEntre } from "@/lib/objectif-calc";
import { TOPICS } from "@/lib/practiceTopics";
import { NBSP } from "@/lib/voice";
import { COURTS_FR, MINIS_FR, type Segment } from "@/lib/voice-moi";
import { EXA } from "@/lib/voice-moi-examen";
import { dateCourte, dateJour, signe } from "@/components/moi/synthese/modele";
import type { CalculSynthese, RythmeSynthese, Zone } from "@/components/moi/synthese/types";

// Le calcul des trois cartes « examen » de la page Moi « La synthèse » :
// Calcul ou théorie, Ton rythme d'examen, Ta progression. Pur, sans hook et
// sans Intl ni toLocaleString : utilisable des deux côtés (serveur et îlots
// clients) sans écart d'hydratation. Les mots viennent de
// lib/voice-moi-examen.ts ; les nombres, pourcentages et dates de modele.ts.

const arrondi1 = (x: number) => Math.round(x * 10) / 10;
/** 1.5 → « 1,5 » (virgule française) ; 2 → « 2 » */
const virgule = (x: number) => String(arrondi1(x)).replace(".", ",");
const borne = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));

// ── Calcul ou théorie ──────────────────────────────────────────────────────

/** Écart (en points) à partir duquel la pastille passe à l'ambre, puis au rouge. */
export const ECART_AMBRE = 5;
export const ECART_ROUGE = 20;
/** Questions d'une session de calculs ouverte depuis la carte. */
export const QUESTIONS_SESSION = 10;

/** Le segment d'adresse de /calculs/session pour chaque matière (les autres gardent leur clé). */
const SLUGS_CALCULS: Record<string, string> = { corporate: "corporate-issuers", fixed_income: "fixed-income", portfolio: "portfolio-management" };

/** Vert sous 5 points d'écart (dans un sens ou dans l'autre), ambre de 5 à 19, rouge à 20 et plus. */
export function tonEcart(ecart: number): Zone {
  const e = Math.abs(ecart);
  return e < ECART_AMBRE ? "e" : e < ECART_ROUGE ? "a" : "r";
}

export type MatiereGenre = { cle: string; court: string; pct: number };

/** Les `n` matières les plus basses d'un genre (à égalité, l'ordre du programme). */
export function plusBasses(c: CalculSynthese, genre: "avec" | "sans", n = 2): MatiereGenre[] {
  const l: MatiereGenre[] = [];
  for (const m of c.matieres) {
    const v = genre === "avec" ? m.avec : m.sans;
    if (v !== null) l.push({ cle: m.cle, court: m.court, pct: v });
  }
  return l.sort((a, b) => a.pct - b.pct).slice(0, n);
}

/** Les matières mesurées des deux côtés (celles qui servent à comparer). */
export function matieresComparables(c: CalculSynthese): number {
  return c.matieres.filter((m) => m.avec !== null && m.sans !== null).length;
}

/** La session de calculs : sur les matières données (leur clé), ou toutes si la liste est vide. */
export function hrefSessionCalculs(matieres: readonly { cle: string }[], n = QUESTIONS_SESSION): string {
  const m = matieres.length ? matieres.map((x) => SLUGS_CALCULS[x.cle] ?? x.cle).join(",") : "toutes";
  return `/calculs/session?matieres=${m}&n=${n}`;
}

export type ResumeCalcul = {
  avec: number;
  sans: number;
  /** sans − avec, en points (positif : les calculs coûtent plus que le cours) */
  ecart: number;
  ton: Zone;
  pastille: string;
  /** « tu connais le cours ; ce sont les calculs qui te coûtent des points, surtout en … » */
  phrase: string;
  /** les deux matières qui coûtent le plus avec calcul : la cible de la session */
  faibles: MatiereGenre[];
};

/** Le global de la carte, son écart, sa phrase et sa session ; null sous 3 matières mesurées des deux côtés. */
export function resumeCalcul(c: CalculSynthese): ResumeCalcul | null {
  if (!c.global) return null;
  const { avec, sans } = c.global;
  const ecart = sans - avec;
  const faibles = plusBasses(c, "avec");
  let phrase: string;
  if (ecart >= ECART_AMBRE) phrase = EXA.calcul.calculsCoutent(EXA.calcul.surtout(faibles));
  else if (ecart <= -ECART_AMBRE) phrase = EXA.calcul.coursCoutent(EXA.calcul.surtout(plusBasses(c, "sans")));
  else phrase = EXA.calcul.seValent;
  return { avec, sans, ecart, ton: tonEcart(ecart), pastille: EXA.calcul.ecart(ecart), phrase, faibles };
}

/** La largeur de la barre de zones et sa zone : rouge sous 50, ambre de 50 à 69, vert à 70 et plus. */
export function zoneBarre(p: number): { w: number; ton: Zone } {
  const [basse, haute] = MAITRISE.ZONES;
  return { w: borne(Math.round(p), 0, 100), ton: p < basse ? "r" : p < haute ? "a" : "e" };
}

// ── Ton rythme d'examen ────────────────────────────────────────────────────

/** Le rythme de l'examen : 180 questions en 2 × 2 h 15, soit 90 s par question. */
export const SEC_EXAMEN = 90;
export const QUESTIONS_EXAMEN = 180;
/** L'échelle des pistes, en secondes par question. */
export const RYTHME_MIN = 60;
export const RYTHME_MAX = 140;
/** Cible de « Série chronométrée » (décision 8 du plan : /eclair n'affiche pas de chrono, on mène aux examens blancs). */
export const HREF_SERIE_CHRONO = "/mock-exams";

/** La position (0 à 100 %) d'un rythme sur la piste de 60 à 140 s. */
export function xRythme(secondes: number): number {
  return ((borne(secondes, RYTHME_MIN, RYTHME_MAX) - RYTHME_MIN) / (RYTHME_MAX - RYTHME_MIN)) * 100;
}
/** Le repère de l'examen sur la piste (90 s) : 37,5 %. */
export const X_EXAMEN = xRythme(SEC_EXAMEN);

/** Vert à 90 s et moins, ambre jusqu'à 110, rouge au-delà. */
export function tonRythme(secondes: number): Zone {
  return secondes > 110 ? "r" : secondes > SEC_EXAMEN ? "a" : "e";
}

export type LigneRythme = {
  cle: string;
  court: string;
  secondes: number;
  n: number;
  /** « 121 s » */
  valeur: string;
  /** position du point sur la piste (0 à 100) */
  x: number;
  ton: Zone;
  /** la barre entre le point et le repère de 90 s ; « vite » : en avance (gris), sinon en retard (rouge pâle) */
  exces: { gauche: number; largeur: number; vite: boolean };
  /** le nom accessible du bouton de la ligne */
  titre: string;
};

/** Une ligne par matière chronométrée au moins 20 fois, la plus lente en haut (à égalité, l'ordre du programme). */
export function lignesRythme(r: RythmeSynthese): LigneRythme[] {
  return r.matieres
    .map((m, i) => ({ m, i }))
    .sort((a, b) => b.m.secondes - a.m.secondes || a.i - b.i)
    .map(({ m }) => {
      const x = xRythme(m.secondes);
      return {
        cle: m.cle,
        court: m.court,
        secondes: m.secondes,
        n: m.n,
        valeur: EXA.rythme.secondes(m.secondes),
        x: arrondi1(x),
        ton: tonRythme(m.secondes),
        exces: { gauche: arrondi1(Math.min(x, X_EXAMEN)), largeur: arrondi1(Math.abs(x - X_EXAMEN)), vite: m.secondes <= SEC_EXAMEN },
        titre: EXA.rythme.ligneAria(m.court, m.secondes),
      };
    });
}

export type ResumeRythme = {
  /** « Toutes matières » ou le nom de la matière choisie */
  sur: string;
  secondes: number;
  valeur: string;
  /** « +14 s de trop », « 12 s d'avance » */
  ecart: string;
  /** rouge au-dessus de 90 s, vert sinon */
  ton: "r" | "e";
  texte: string;
  /** minutes et questions en trop sur les 180 questions (seulement toutes matières, et en retard) */
  trop: { minutes: number; questions: number } | null;
};

/** Le chiffre du rythme (toutes matières ou une matière choisie), son écart et sa phrase ; null sous 20 questions chronométrées. */
export function resumeRythme(r: RythmeSynthese, cle: string | null): ResumeRythme | null {
  if (r.global === null) return null;
  const ligne = cle ? r.matieres.find((m) => m.cle === cle) : undefined;
  const rs = ligne ? ligne.secondes : r.global;
  let texte: string;
  let trop: ResumeRythme["trop"] = null;
  if (ligne) {
    const d = rs - SEC_EXAMEN;
    texte = d > 0 ? EXA.rythme.matierePlus(ligne.court, d) : d < 0 ? EXA.rythme.matiereMoins(ligne.court, -d) : EXA.rythme.matierePile(ligne.court);
  } else if (rs > SEC_EXAMEN) {
    const secondes = QUESTIONS_EXAMEN * (rs - SEC_EXAMEN);
    trop = { minutes: Math.round(secondes / 60), questions: Math.round(secondes / rs) };
    texte = EXA.rythme.global(trop.minutes, trop.questions);
  } else {
    texte = EXA.rythme.globalTenu;
  }
  return { sur: ligne ? ligne.court : EXA.rythme.toutes, secondes: rs, valeur: EXA.rythme.secondes(rs), ecart: EXA.rythme.ecart(rs), ton: rs > SEC_EXAMEN ? "r" : "e", texte, trop };
}

// ── Ta progression ─────────────────────────────────────────────────────────

/** Le seuil d'acquis : la droite de 70 %. */
export const SEUIL_COURBE = MAITRISE.REPERE;
/** Points de la courbe qu'il faut au moins pour la tracer. */
export const POINTS_MIN_COURBE = 3;
/** La pente se mesure sur les 4 dernières semaines : aujourd'hui et les 4 points hebdomadaires d'avant, soit 5 points. */
export const POINTS_PENTE = 5;
/** Sous cette pente (point par semaine), on ne projette pas de date : elle serait trop lointaine pour dire quelque chose. */
export const PENTE_MIN = 0.1;
/** Au-delà de l'aujourd'hui, l'axe court sur 6 semaines. */
export const HORIZON_SEMAINES = 6;

/** Pente de la droite des moindres carrés sur les 5 derniers points, en points par semaine ; null sous 3 points. */
export function pente(points: readonly number[]): number | null {
  const p = points.slice(-POINTS_PENTE);
  const n = p.length;
  if (n < POINTS_MIN_COURBE) return null;
  const mx = (n - 1) / 2;
  const my = p.reduce((t, v) => t + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (i - mx) * (p[i] - my);
    sxx += (i - mx) * (i - mx);
  }
  return sxy / sxx;
}

export type Projection =
  /** la note est déjà à 70 % ou plus : rien à projeter */
  | { genre: "atteint" }
  /** la pente est nulle ou négative (ou trop faible) : pas de date */
  | { genre: "plate"; pente: number }
  /** à ce rythme, la note passe 70 % dans `jours` jours, soit le `date` (AAAA-MM-JJ) */
  | { genre: "date"; pente: number; jours: number; date: string; apresExamen: boolean; avantExamen: number | null; dansHorizon: boolean };

/**
 * La projection au rythme des 4 dernières semaines. Sans la date d'aujourd'hui
 * (`aujourdhui` null), une pente positive ne se date pas : null. L'examen
 * (AAAA-MM-JJ, null sans date ou une fois passé) dit si le passage à 70 % tombe
 * avant ou après.
 */
export function projection(points: readonly number[], aujourdhui: string | null, examen: string | null): Projection | null {
  if (points.length < POINTS_MIN_COURBE) return null;
  const dernier = points[points.length - 1];
  if (dernier >= SEUIL_COURBE) return { genre: "atteint" };
  const p = pente(points);
  if (p === null) return null;
  if (p < PENTE_MIN) return { genre: "plate", pente: p };
  if (!aujourdhui) return null;
  const jours = Math.max(1, Math.round(((SEUIL_COURBE - dernier) / p) * 7));
  const reste = examen ? joursEntre(aujourdhui, examen) : null;
  const avantLeJour = reste !== null && reste >= 0 ? reste : null;
  return {
    genre: "date",
    pente: p,
    jours,
    date: decaleJour(aujourdhui, jours),
    apresExamen: avantLeJour !== null && jours > avantLeJour,
    avantExamen: avantLeJour !== null && jours <= avantLeJour ? avantLeJour - jours : null,
    dansHorizon: jours <= HORIZON_SEMAINES * 7,
  };
}

/** Le gain en points, en segment : le vrai signe, rouge s'il est négatif. */
function segmentGain(g: number): Segment {
  const r = Math.round(g);
  return r < 0 ? { neg: signe(r) } : { b: r === 0 ? "±0" : signe(r) };
}

/**
 * L'en-tête : « … : +23 points en 12 semaines, +6 en 30 jours. » Le gain sur
 * 30 jours est celui de la date du sélecteur de « Tes matières » quand on la
 * connaît (`ilYa30`) ; sinon, celui des 4 dernières semaines (28 jours).
 */
export function phraseGains(points: readonly number[], ilYa30: number | null): Segment[] {
  const L = points.length - 1;
  const total = points[L] - points[0];
  let recent: { segment: Segment; libelle: string } | null = null;
  if (ilYa30 !== null) recent = { segment: segmentGain(points[L] - ilYa30), libelle: EXA.progression.trente };
  else if (L >= 4) recent = { segment: segmentGain(points[L] - points[L - 4]), libelle: EXA.progression.quatreSemaines };
  return EXA.progression.sous(segmentGain(total), L, Math.round(total), recent);
}

// ── La géométrie de la courbe ──────────────────────────────────────────────

export type DimsCourbe = {
  larg: number;
  haut: number;
  gauche: number;
  droite: number;
  sommet: number;
  bas: number;
  /** pas des dates de l'axe, en semaines */
  pas: number;
  /** ordonnée des dates */
  yDates: number;
  /** « 70 % » ou « 70 » à gauche de la droite du seuil */
  suffixe70: string;
  trait: number;
  rPoint: number;
  rFin: number;
};

/** Le dessin large (ordinateur) et le dessin étroit (téléphone), comme la maquette. */
export const COURBE_GRANDE: DimsCourbe = { larg: 465, haut: 190, gauche: 34, droite: 452, sommet: 18, bas: 160, pas: 3, yDates: 180, suffixe70: `${NBSP}%`, trait: 2.6, rPoint: 3, rFin: 5 };
export const COURBE_PETITE: DimsCourbe = { larg: 328, haut: 186, gauche: 30, droite: 316, sommet: 22, bas: 160, pas: 6, yDates: 178, suffixe70: "", trait: 2.4, rPoint: 3, rFin: 4.5 };

export type Rect = { y: number; h: number };
export type Etiquette = { x: number; y: number; texte: string; ancre: "start" | "middle" | "end"; gras?: boolean };

export type GeoCourbe = {
  dims: DimsCourbe;
  /** l'axe des valeurs : de 20 à 80 sauf si la courbe en sort (de 0 à 100) */
  bas: number;
  haut: number;
  /** semaines que couvre l'axe : de la première à aujourd'hui, plus l'horizon */
  semaines: number;
  zones: { rouge: Rect; ambre: Rect; haut: Rect };
  y70: number;
  graduations: { texte: string; y: number }[];
  xAuj: number;
  /** les points de la maîtrise globale */
  points: { x: number; y: number }[];
  ligne: string;
  aire: string;
  /** la droite pointillée jusqu'à 70 (ou jusqu'au bord de l'axe) ; null sans projection datée */
  projection: { x1: number; y1: number; x2: number; y2: number } | null;
  debut: Etiquette;
  fin: Etiquette;
  dates: Etiquette[];
  /** x de la semaine k, y d'une valeur (seulement pour le rendu : pas de fonction vers un îlot client) */
  x: (k: number) => number;
  y: (v: number) => number;
};

/** L'axe des valeurs : de 20 à 80, élargi à 0 ou 100 si un point en sort. */
export function echelleCourbe(valeurs: readonly number[]): { bas: number; haut: number } {
  return { bas: valeurs.some((v) => v < 20) ? 0 : 20, haut: valeurs.some((v) => v > 80) ? 100 : 80 };
}

/**
 * La courbe : zones rouge / ambre, droite de 70 %, points et polygone de la
 * maîtrise globale, projection, étiquettes de valeur et dates de l'axe.
 * @param points la préparation à chaque date, la dernière étant aujourd'hui
 * @param dates les dates des points, déjà écrites par le serveur
 * @param aujourdhui AAAA-MM-JJ ; null : pas de dates au-delà d'aujourd'hui
 */
export function geometrieCourbe(dims: DimsCourbe, points: readonly number[], dates: readonly string[], proj: Projection | null, aujourdhui: string | null): GeoCourbe {
  const L = points.length - 1;
  const { bas, haut } = echelleCourbe(points);
  const semaines = L + HORIZON_SEMAINES;
  const x = (k: number) => arrondi1(dims.gauche + (k * (dims.droite - dims.gauche)) / semaines);
  const y = (v: number) => arrondi1(dims.bas - ((borne(v, bas, haut) - bas) * (dims.bas - dims.sommet)) / (haut - bas));
  const [z50, z70] = MAITRISE.ZONES;
  const pts = points.map((v, k) => ({ x: x(k), y: y(v) }));
  const xAuj = x(L);
  const ligne = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const aire = `${ligne} ${xAuj},${dims.bas} ${x(0)},${dims.bas}`;

  let proj2: GeoCourbe["projection"] = null;
  if (proj && proj.genre === "date") {
    const sem = Math.min(proj.jours / 7, HORIZON_SEMAINES);
    const vFin = proj.dansHorizon ? SEUIL_COURBE : points[L] + proj.pente * HORIZON_SEMAINES;
    proj2 = { x1: xAuj, y1: pts[L].y, x2: x(L + sem), y2: y(vFin) };
  }

  const premier = Math.round(points[0]);
  const dernier = Math.round(points[L]);
  const monte = L === 0 || points[L] >= points[L - 1];
  const yFin = pts[L].y + (monte && pts[L].y - 9 >= dims.sommet + 6 ? -9 : 16);
  const debut: Etiquette = { x: arrondi1(x(0) + 6), y: arrondi1(Math.min(pts[0].y + 16, dims.bas - 4)), texte: String(premier), ancre: "start" };
  const fin: Etiquette = { x: arrondi1(xAuj - 8), y: arrondi1(yFin), texte: `${dernier}${NBSP}%`, ancre: "end" };

  // les dates de l'axe : la première, aujourd'hui (en gras), des repères tous les `pas` semaines avant, et (avec la date du jour) après
  const etiq: Etiquette[] = [];
  if (dates[0]) etiq.push({ x: x(0), y: dims.yDates, texte: dates[0], ancre: "start" });
  for (let k = L - dims.pas; k > 0; k -= dims.pas) {
    if (x(k) - x(0) < 64) break;
    if (dates[k]) etiq.push({ x: x(k), y: dims.yDates, texte: dates[k], ancre: "middle" });
  }
  if (dates[L]) etiq.push({ x: xAuj, y: dims.yDates, texte: dates[L], ancre: "middle", gras: true });
  if (aujourdhui) {
    for (let j = 1; ; j++) {
      const k = L + j * dims.pas;
      if (k >= semaines || dims.droite - x(k) < 50) break;
      etiq.push({ x: x(k), y: dims.yDates, texte: dateCourte(decaleJour(aujourdhui, j * dims.pas * 7)), ancre: "middle" });
    }
    etiq.push({ x: dims.droite, y: dims.yDates, texte: dateCourte(decaleJour(aujourdhui, HORIZON_SEMAINES * 7)), ancre: "end" });
  }

  return {
    dims,
    bas,
    haut,
    semaines,
    zones: {
      rouge: { y: y(z50), h: arrondi1(dims.bas - y(z50)) },
      ambre: { y: y(z70), h: arrondi1(y(z50) - y(z70)) },
      haut: { y: dims.sommet, h: arrondi1(y(z70) - dims.sommet) },
    },
    y70: y(z70),
    graduations: [bas, 50, haut].map((v) => ({ texte: String(v), y: y(v) })),
    xAuj,
    points: pts,
    ligne,
    aire,
    projection: proj2,
    debut,
    fin,
    dates: etiq,
    x,
    y,
  };
}

export type TraceSuperpose = {
  /** le tracé : des segments continus (une matière non mesurée à une date casse la ligne) */
  d: string;
  points: { x: number; y: number }[];
  /** rouge sous 50 % à la dernière mesure, sinon améthyste */
  rouge: boolean;
};

/** Le tracé d'une matière superposée : sa propre série hebdomadaire (null : pas mesurée à cette date). */
export function traceSuperpose(g: GeoCourbe, serie: readonly (number | null)[]): TraceSuperpose {
  const points: TraceSuperpose["points"] = [];
  let d = "";
  let enCours = false;
  let dernier = -1;
  for (let k = 0; k < serie.length; k++) {
    const v = serie[k];
    if (v === null) {
      enCours = false;
      continue;
    }
    const p = { x: g.x(k), y: g.y(v) };
    points.push(p);
    d += `${enCours ? "L" : "M"}${p.x} ${p.y}`;
    enCours = true;
    dernier = v;
  }
  return { d, points, rouge: dernier >= 0 && dernier < MAITRISE.ZONES[0] };
}

/** Le texte de la légende d'une matière superposée : « Fixed Income : 22 → 44 % ». */
export function legendeSuperposee(court: string, serie: readonly (number | null)[]): string {
  const v = serie.filter((x): x is number => x !== null);
  if (!v.length) return court;
  return EXA.progression.legendeSuperposee(court, Math.round(v[0]), v.length > 1 ? Math.round(v[v.length - 1]) : null);
}

/** Un écart de moins d'un demi-point sur 4 semaines : stable. */
const CONSTANCE_ECART_MIN = 0.5;

/** « Écart type de tes 30 du jour : 6,2 points. Tes scores se resserrent (−1,4 en 4 semaines). » ; null sans mesure. */
export function phraseConstance(c: (number | null)[]): Segment[] | null {
  const mesures = c.filter((x): x is number => x !== null);
  if (!mesures.length) return null;
  const dernier = mesures[mesures.length - 1];
  const avant = mesures.length > 1 ? mesures[Math.max(0, mesures.length - 5)] : null;
  const ecart = avant === null ? null : arrondi1(dernier - avant);
  const tendance = ecart === null ? null : Math.abs(ecart) < CONSTANCE_ECART_MIN ? EXA.progression.constanceStable : EXA.progression.constanceTendance(ecart < 0, virgule(Math.abs(ecart)));
  return EXA.progression.constancePhrase(virgule(dernier), tendance);
}

/** Les puces de la superposition : « Aucune » puis les dix matières (dans l'ordre de `progression.matieres`), en noms très courts. */
export const PUCES_MATIERES: readonly { cle: string; libelle: string; court: string }[] = TOPICS.map((t) => ({ cle: t.key, libelle: MINIS_FR[t.key] ?? t.label, court: COURTS_FR[t.key] ?? t.label }));

/** La date de la projection pour l'étiquette et pour le texte alternatif : « 12 déc. » / « 12 décembre ». */
export function dateProjection(proj: Projection | null): { courte: string; longue: string } | null {
  return proj && proj.genre === "date" ? { courte: dateCourte(proj.date), longue: dateJour(proj.date) } : null;
}

/** Le texte de légende de la projection ; null sans projection datée. */
export function legendeProjection(proj: Projection | null): string | null {
  if (!proj || proj.genre !== "date") return null;
  return proj.apresExamen ? EXA.progression.legendeApres : EXA.progression.legendeRythme(dateCourte(proj.date));
}

/** La phrase « Ce que ça veut dire » de la courbe seule (sans matière superposée). */
export function lectureCourbe(points: readonly number[], proj: Projection | null): string {
  const L = points.length - 1;
  if (proj?.genre === "atteint") return EXA.progression.lectureAtteint;
  if (proj?.genre === "plate") {
    if (proj.pente <= -PENTE_MIN) return EXA.progression.lectureRecule(virgule(-proj.pente), proj.pente);
    return EXA.progression.lectureStable;
  }
  if (proj?.genre === "date") {
    const rythme = EXA.progression.parSemaine(`+${virgule(proj.pente)}`, proj.pente);
    if (proj.apresExamen) return EXA.progression.lectureApres(rythme, dateJour(proj.date));
    return EXA.progression.lecturePasseA(rythme, dateJour(proj.date), proj.avantExamen !== null ? EXA.progression.avantExamen(proj.avantExamen) : null);
  }
  return EXA.progression.lecturePasse(Math.round(points[0]), Math.round(points[L]), L);
}

/** La phrase d'une matière superposée : ce qu'elle a pris, et où elle se place par rapport à la note globale. */
export function lectureMatiere(court: string, serie: readonly (number | null)[], globale: number): string {
  const idx: number[] = [];
  serie.forEach((v, k) => {
    if (v !== null) idx.push(k);
  });
  if (!idx.length) return EXA.progression.nonMesuree(court);
  const k0 = idx[0];
  const k1 = idx[idx.length - 1];
  const dernier = Math.round(serie[k1] as number);
  if (idx.length === 1) return EXA.progression.recente(court, dernier);
  const d = dernier - Math.round(serie[k0] as number);
  const k4 = serie[k1 - 4];
  const recent = k1 - 4 >= k0 && k4 !== null && k4 !== undefined ? dernier - Math.round(k4) : null;
  return `${EXA.progression.matiere(court, d, k1 - k0, recent)} ${dernier < Math.round(globale) ? EXA.progression.matiereSous : EXA.progression.matiereAu}`;
}

/** Le texte alternatif de la courbe. */
export function ariaCourbe(points: readonly number[], proj: Projection | null, superposee: string | null): string {
  const L = points.length - 1;
  const date = dateProjection(proj);
  return EXA.progression.aria(Math.round(points[0]), Math.round(points[L]), L, date ? `vers le ${date.longue}` : null, superposee);
}

/** Jours que couvre l'axe au-delà d'aujourd'hui (6 semaines). */
export const JOURS_HORIZON = HORIZON_SEMAINES * 7;
