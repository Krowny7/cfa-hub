import { MAITRISE, gainPreparation, infobulleMaitrise, libellePct, preparationDe, statutDe, zoneDe, type Maitrise, type MaitriseMatiere } from "@/lib/maitrise";
import { TOPICS } from "@/lib/practiceTopics";
import { subjectByKey } from "@/components/reviser/catalog";
import type { Notion as NotionCatalogue } from "@/lib/notions";
import { MIN_REPONSES, RECENT_REPONSES } from "@/lib/points-faibles";
import { joursEntre } from "@/lib/objectif-calc";
import type { EtatObjectif } from "@/lib/objectif";
import { PLACEMENT_GAMES, TIERS, TOP_TIER, rankFor, versDivisionSuivante } from "@/lib/ranks";
import { depuisQuand, type ResumeTemps } from "@/lib/temps-site";
import { compter, dernierGagne, type LigneTrophee } from "@/lib/trophees";
import { NBSP, heuresMinutes, jourJ, nombre, pct as pctTexte } from "@/lib/voice";
import { COURTS_FR, MINIS_FR, SYN, type Segment } from "@/lib/voice-moi";
import type { CodexMoi } from "@/lib/profil/codex-moi";
import type {
  CalculSynthese,
  CodexSynthese,
  EtatNotion,
  GlobaleSynthese,
  MarqueesSynthese,
  MatiereSynthese,
  NoteSynthese,
  NotionSynthese,
  ObjectifPlan,
  ObjectifSynthese,
  PointCumul,
  ProgressionSynthese,
  RangSynthese,
  RythmeSynthese,
  TempsSynthese,
  TropheesSynthese,
  Zone,
} from "@/components/moi/synthese/types";

// Le modèle de la page Moi « La synthèse » : tout le calcul, pur et sans
// hook, utilisable des deux côtés (serveur et îlots clients). Aucun `Intl` ni
// `toLocaleString` : les nombres, les pourcentages et les dates s'écrivent à
// la main (lib/voice.ts), pour que le serveur et le navigateur rendent
// exactement la même chaîne (piège d'hydratation #418).

export { NBSP };

/** 1240 → « 1 240 » (espaces insécables), −220 avec le vrai signe moins. */
export const entier = nombre;
/** 61 → « 61 % » (insécable avant le signe). */
export const pc = pctTexte;

/** Le vrai signe moins devant un nombre négatif, « + » devant un positif, rien pour zéro. */
export function signe(n: number): string {
  const r = Math.round(n);
  return r > 0 ? `+${nombre(r)}` : r < 0 ? `−${nombre(-r)}` : "0";
}

/** La zone d'une maîtrise : rouge sous 50, ambre de 50 à 69, vert à 70 et plus ; null si inconnue. */
export function ton(p: number | null): Zone | null {
  if (p === null || !Number.isFinite(p)) return null;
  const [basse, haute] = MAITRISE.ZONES;
  return p < basse ? "r" : p < haute ? "a" : "e";
}

/** Part du programme mesurée à partir de laquelle la note estimée s'affiche. */
export const COUVERTURE_MIN = 50;

// ── Dates (sans Intl) ──────────────────────────────────────────────────────

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function parties(jour: string): { a: number; m: number; j: number } | null {
  const r = /^([0-9]{4})-([0-9]{2})-([0-9]{2})/.exec(jour);
  if (!r) return null;
  const m = Number(r[2]) - 1;
  return m >= 0 && m < 12 ? { a: Number(r[1]), m, j: Number(r[3]) } : null;
}
const quantieme = (j: number) => (j === 1 ? "1er" : String(j));

/** « 2027-02-18 » → « 18 février » ; « 1er mars ». Date illisible : la chaîne telle quelle. */
export function dateJour(jour: string): string {
  const p = parties(jour);
  return p ? `${quantieme(p.j)} ${MOIS[p.m]}` : jour;
}
/** « 18 février 2027 ». */
export function dateLongue(jour: string): string {
  const p = parties(jour);
  return p ? `${quantieme(p.j)} ${MOIS[p.m]} ${p.a}` : jour;
}
/** « 18 févr. ». */
export function dateCourte(jour: string): string {
  const p = parties(jour);
  return p ? `${quantieme(p.j)} ${MOIS_COURTS[p.m]}` : jour;
}

// ── L'objectif ─────────────────────────────────────────────────────────────

/** Au plus tant de points de la courbe de l'objectif (le premier et le dernier toujours gardés). */
export function sousEchantillonner<T>(liste: T[], max = 7): T[] {
  if (liste.length <= max || max < 2) return liste;
  const idx = new Set<number>();
  for (let i = 0; i < max; i++) idx.add(Math.round((i * (liste.length - 1)) / (max - 1)));
  return liste.filter((_, i) => idx.has(i));
}

/** L'état de l'objectif lu par le serveur, réduit à ce que la carte affiche. Sans objectif ou sans date : « sans ». */
export function objectifSynthese(e: EtatObjectif, matiereFaible: string | null = null): ObjectifSynthese {
  if (e.etat !== "trajectoire") return { etat: "sans" };
  const t = e.t;
  const serie: PointCumul[] = t.serie.map((p) => ({ day: p.day, cumul: p.cumul }));
  const plan: ObjectifPlan = {
    etat: "plan",
    examen: t.examen,
    aujourdhui: t.aujourdhui,
    total: t.total,
    avant: t.avant,
    jour: t.jour,
    statut: t.plan.statut,
    quotidien: t.plan.quotidien,
    joursRestants: t.plan.jours,
    rythme: t.rythme,
    ideal: t.ideal,
    projection: t.projection,
    serie: sousEchantillonner(serie, 7),
    hrefQuete: null,
  };
  const actif = plan.statut === "actif" && plan.quotidien > 0;
  return actif ? { ...plan, hrefQuete: hrefQuete(chiffresObjectif(plan).resteJour, matiereFaible) } : plan;
}

/** Jusqu'à tant de questions par jour, la quête se montre en pastilles ; au-delà, en barre. */
export const PASTILLES_MAX = 24;

export type EtatAvance = "temps" | "peu" | "retard";

export type ChiffresObjectif = {
  fait: number;
  total: number;
  /** part faite, 0–100 */
  pct: number;
  reste: number;
  quotidien: number;
  /** ce qu'il reste à faire aujourd'hui */
  resteJour: number;
  /** questions par jour (moyenne des 14 derniers jours), arrondi */
  rythme: number;
  /** « J-110 », « Jour J » ; null une fois l'examen passé */
  jn: string | null;
  /** avance (+) ou retard (−) sur la droite de l'objectif, en questions */
  avance: number;
  /** dans les temps, un peu en retard (jusqu'à 2 jours de plan), en retard */
  etat: EtatAvance;
  /** projection au rythme actuel moins l'objectif (négatif : en dessous) */
  ecart: number;
  /** les questions par jour à ajouter pour y arriver (0 si déjà dedans) */
  deplus: number;
  quete: { mode: "pastilles"; n: number; on: number } | { mode: "barre"; pct: number } | null;
};

export function chiffresObjectif(o: ObjectifPlan): ChiffresObjectif {
  const fait = o.avant + o.jour;
  const reste = Math.max(0, o.total - fait);
  const avance = Math.round(o.avant - o.ideal);
  const etat: EtatAvance = avance >= 0 ? "temps" : -avance <= 2 * Math.max(1, o.quotidien) ? "peu" : "retard";
  const ecart = Math.round(o.projection - o.total);
  const actif = o.statut === "actif" && o.quotidien > 0;
  const fa = Math.min(o.jour, o.quotidien);
  return {
    fait,
    total: o.total,
    pct: o.total > 0 ? Math.max(0, Math.min(100, Math.round((100 * fait) / o.total))) : 0,
    reste,
    quotidien: o.quotidien,
    resteJour: actif ? Math.max(0, o.quotidien - o.jour) : 0,
    rythme: Math.round(o.rythme),
    jn: jourJ(joursEntre(o.aujourdhui, o.examen)),
    avance,
    etat,
    ecart,
    deplus: ecart < 0 ? Math.ceil(-ecart / Math.max(1, o.joursRestants)) : 0,
    quete: !actif ? null : o.quotidien <= PASTILLES_MAX ? { mode: "pastilles", n: o.quotidien, on: Math.max(0, fa) } : { mode: "barre", pct: Math.round((100 * Math.max(0, fa)) / o.quotidien) },
  };
}

/** Les segments de la phrase d'état (« Il t'en faut 16 par jour… »), ou la félicitation une fois le plan atteint ou passé. */
export function phraseObjectif(o: ObjectifPlan, c: ChiffresObjectif): Segment[] {
  if (o.statut === "atteint") return SYN.obj.atteint(o.total);
  if (o.statut === "passe") return SYN.obj.passe(c.fait, o.total);
  return SYN.obj.ilTenFaut(c.quotidien, c.rythme, c.etat);
}

/** La matière la plus lourde du programme (Éthique) : la cible quand aucune matière n'est encore mesurée. */
const PLUS_LOURDE = [...TOPICS].sort((a, b) => b.weight - a.weight)[0].key;

/** Le lien du bouton de la quête : une séance ciblée de 10 à 90 questions (même s'il n'en reste que 9) sur ta matière mesurée la plus faible. */
export function hrefQuete(resteJour: number, matiere: string | null): string {
  const n = Math.max(10, Math.min(90, Math.round(resteJour)));
  return `/practice?topic=${matiere ?? PLUS_LOURDE}&n=${n}&go=1`;
}

/** La matière mesurée la plus faible (pct le plus bas ; à égalité, la plus lourde) ; null si aucune n'est mesurée. */
export function matiereLaPlusFaible(m: Maitrise | null): string | null {
  const mesurees = (m?.matieres ?? []).filter((x) => x.pct !== null);
  if (!mesurees.length) return null;
  return [...mesurees].sort((a, b) => (a.pct as number) - (b.pct as number) || b.poids - a.poids)[0].cle;
}

// ── La trajectoire (graphique compact) ─────────────────────────────────────

export type DimsTrajectoire = { larg: number; haut: number; gauche: number; droite: number; sommet: number; bas: number };
/** La trajectoire des trois colonnes (ordinateur) et celle, plus large, du téléphone. */
export const TRAJECTOIRE_COMPACTE: DimsTrajectoire = { larg: 252, haut: 156, gauche: 38, droite: 212, sommet: 14, bas: 132 };
export const TRAJECTOIRE_LARGE: DimsTrajectoire = { larg: 328, haut: 144, gauche: 40, droite: 270, sommet: 14, bas: 120 };

const PAS_ECHELLE = [50, 100, 200, 250, 500, 750, 1000, 1500, 2000, 2500, 3000, 5000, 10000, 20000, 50000];

/** L'échelle d'un axe de questions : trois intervalles au plus, de pas « rond ». */
export function echelleQuestions(max: number): { haut: number; pas: number; n: number } {
  const m = Math.max(1, max);
  const pas = PAS_ECHELLE.find((p) => Math.ceil(m / p) <= 3) ?? PAS_ECHELLE[PAS_ECHELLE.length - 1];
  const n = Math.max(1, Math.ceil(m / pas));
  return { haut: n * pas, pas, n };
}

const r1 = (x: number) => Math.round(x * 10) / 10;

export type GeoTrajectoire = {
  dims: DimsTrajectoire;
  /** les lignes de la grille (la dernière est l'axe, à 0) */
  grille: { y: number; texte: string }[];
  xDebut: number;
  xAuj: number;
  xFin: number;
  yFait: number;
  yTotal: number;
  yProjection: number;
  /** « x,y x,y … » de la courbe faite, et de son aire */
  courbe: string;
  aire: string;
  /** les deux étiquettes de la fin de courbe, avec leur ordonnée */
  etiquettes: { total: number; projection: number; ecart: number | null };
  /** l'étiquette « fait » : à gauche du point du jour */
  fait: { x: number; y: number };
  /** les dates sous l'axe */
  dates: { debut: string; fin: string };
  /** l'écart « projection − total » (négatif : en dessous) */
  ecart: number;
};

/** La géométrie de « Ta trajectoire jusqu'au jour J » : la courbe faite, la droite jusqu'à l'objectif, la projection. */
export function geometrieTrajectoire(o: ObjectifPlan, d: DimsTrajectoire): GeoTrajectoire {
  const fait = o.avant + o.jour;
  const serie = o.serie.length ? o.serie : [{ day: o.aujourdhui, cumul: fait }];
  const debut = serie[0].day;
  const duree = Math.max(1, joursEntre(debut, o.examen));
  const x = (jour: string) => r1(d.gauche + (d.droite - d.gauche) * Math.max(0, Math.min(1, joursEntre(debut, jour) / duree)));
  const ech = echelleQuestions(Math.max(o.total, o.projection, fait));
  const y = (v: number) => r1(d.bas - ((d.bas - d.sommet) * Math.max(0, Math.min(ech.haut, v))) / ech.haut);
  const grille: GeoTrajectoire["grille"] = [];
  for (let i = ech.n; i >= 0; i--) grille.push({ y: y(i * ech.pas), texte: nombre(i * ech.pas) });
  const pts = serie.map((p) => `${x(p.day)},${y(p.cumul)}`);
  const xAuj = x(o.aujourdhui);
  const xFin = d.droite;
  const yFait = y(fait);
  const yTotal = y(o.total);
  const yProjection = y(o.projection);
  const ecart = Math.round(o.projection - o.total);
  // les étiquettes de droite se rangent l'une sous l'autre, sans se chevaucher
  let lt: number;
  let lp: number;
  if (ecart < 0) {
    lt = r1(yTotal + 1.5);
    lp = r1(Math.max(yProjection + 6, lt + 14));
  } else {
    lp = r1(yProjection + 1.5);
    lt = r1(Math.max(yTotal + 1.5, lp + 14));
  }
  return {
    dims: d,
    grille,
    xDebut: x(debut),
    xAuj,
    xFin,
    yFait,
    yTotal,
    yProjection,
    courbe: pts.join(" "),
    aire: `${x(serie[0].day)},${d.bas} ${pts.join(" ")} ${x(serie[serie.length - 1].day)},${d.bas}`,
    etiquettes: { total: lt, projection: lp, ecart: ecart < 0 ? r1(lp + 13) : null },
    fait: { x: r1(xAuj - 6), y: r1(yFait - 7) },
    dates: { debut: dateJour(debut), fin: dateCourte(o.examen) },
    ecart,
  };
}

// ── La jauge « Si l'examen était aujourd'hui » ─────────────────────────────

export type GeoJauge = {
  /** les trois zones de l'anneau (rouge, ambre, au-dessus du seuil), le fond de la jauge et le tracé de la valeur (null à 0) */
  zones: [string, string, string];
  fond: string;
  valeur: string | null;
  zone: Zone;
  tick: { x1: number; y1: number; x2: number; y2: number };
  seuil: { x: number; y: number };
};

/** Le point d'un demi-cercle (centre 110,112) à la fraction f de gauche à droite, au rayon r. */
function pointJauge(f: number, r: number): [number, number] {
  const a = Math.PI * (1 - Math.max(0, Math.min(1, f)));
  return [r1(110 + r * Math.cos(a)), r1(112 - r * Math.sin(a))];
}
function arcJauge(f0: number, f1: number, r: number): string {
  const [x0, y0] = pointJauge(f0, r);
  const [x1, y1] = pointJauge(f1, r);
  return `M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`;
}

/** La géométrie de la jauge (viewBox 220 × 130) pour une note de 0 à 100 et son seuil. */
export function geometrieJauge(note: number, seuil: number = MAITRISE.REPERE): GeoJauge {
  const v = Math.max(0, Math.min(100, note)) / 100;
  const s = Math.max(0, Math.min(100, seuil)) / 100;
  const [x1, y1] = pointJauge(s, 72);
  const [x2, y2] = pointJauge(s, 106);
  const [lx, ly] = pointJauge(s, 112);
  return {
    zones: [arcJauge(0, 0.5, 100), arcJauge(0.5, s, 100), arcJauge(s, 1, 100)],
    fond: arcJauge(0, 1, 84),
    valeur: v > 0 ? arcJauge(0, v, 84) : null,
    zone: ton(note) ?? "r",
    tick: { x1, y1, x2, y2 },
    seuil: { x: lx, y: ly },
  };
}

/** La note estimée, de la maîtrise lue ; null sans maîtrise. */
export function noteSynthese(m: Maitrise | null): NoteSynthese | null {
  return m ? { estimee: m.preparation, couverture: m.couverture, seuil: 70 } : null;
}

// ── Le rang ────────────────────────────────────────────────────────────────

/** Le rang pour la carte du joueur : palier, division, place, et où mène la barre. `mastery` : l'ancienne mesure, qui verrouille les rangs. */
export function rangSynthese(o: { elo: number; gamesPlayed: number; mastery: number; place: number | null; joueurs: number | null }): RangSynthese {
  const placement = o.gamesPlayed < PLACEMENT_GAMES;
  const info = rankFor(o.elo, o.mastery, o.place);
  return {
    tier: info.tierIndex,
    division: placement ? null : info.division,
    palier: placement ? "Placement" : `${info.tier.name}${info.division ? " " + info.division : ""}`,
    elo: o.elo,
    place: o.place,
    joueurs: o.joueurs,
    maitrise: o.mastery,
    placement,
    jouees: o.gamesPlayed,
    vers: versDivisionSuivante(o.elo, info, o.gamesPlayed),
  };
}

/** « 1 478 ELO · 7e sur 412 », ou « Placement 2/5 ». */
export function ligneRang(r: RangSynthese): string {
  if (r.placement) return SYN.joueur.placement(r.jouees, PLACEMENT_GAMES);
  return SYN.joueur.eloLigne(r.elo, r.place !== null && r.joueurs !== null ? SYN.joueur.place(r.place, r.joueurs) : null);
}

export type BarreRang =
  | { genre: "barre"; pct: number; aria: string; gauche: Segment[] | string; droite: string | null }
  | { genre: "texte"; texte: string };

/** Ce que dit la barre sous le rang : la progression vers la division suivante, le verrou de maîtrise, le placement, ou le sommet. */
export function barreRang(r: RangSynthese): BarreRang {
  const v = r.vers;
  if (v.genre === "division") return { genre: "barre", pct: v.pct, aria: SYN.joueur.barreAria(r.elo, v.de, v.vers), gauche: SYN.joueur.plusQue(v.reste, v.cible), droite: nombre(v.vers) };
  if (v.genre === "placement") {
    const reste = Math.max(0, v.total - v.jouees);
    return { genre: "barre", pct: Math.round((100 * v.jouees) / v.total), aria: SYN.joueur.placement(v.jouees, v.total), gauche: SYN.joueur.placementReste(reste), droite: `${v.jouees}/${v.total}` };
  }
  if (v.genre === "verrou") return { genre: "texte", texte: SYN.joueur.verrou(v.lock, v.cible) };
  return { genre: "texte", texte: r.tier >= TOP_TIER ? SYN.joueur.sommet : SYN.joueur.sommetElo };
}

/** Le métal d'un palier de trophée (reflet, teinte, ombre), tiré des insignes de rang : bronze, argent, or, diamant. */
export function metalDePalier(palier: 1 | 2 | 3 | 4): [string, string, string] {
  return TIERS[palier === 4 ? 4 : palier - 1].metal;
}

// ── Temps, Codex, marquées, trophées ───────────────────────────────────────

/** Le temps sur le site pour la carte du joueur ; null sans migration ou tant que le compteur n'a rien compté. */
export function tempsSynthese(t: ResumeTemps | null): TempsSynthese | null {
  if (!t || t.total < 60) return null;
  const depuis = depuisQuand(t);
  return { total: heuresMinutes(t.total), semaine: heuresMinutes(t.semaine), depuis: depuis ? dateJour(depuis.jour) : null };
}

/** Le Codex pour la carte du joueur ; null s'il n'est pas lisible (la ligne disparaît). */
export function codexSynthese(c: CodexMoi | null): CodexSynthese | null {
  return c && c.disponible ? { faites: c.faites, xp: c.xp, aRecuperer: c.aRecuperer } : null;
}

/** Les marquées (questions, flashcards) ; null quand aucune source ne répond. */
export function marqueesSynthese(questions: number | null, cartes: number | null): MarqueesSynthese | null {
  return questions === null && cartes === null ? null : { questions, cartes };
}

/** La salle des trophées : le compte par palier, le détail par source et le dernier gagné (quand les lignes disent quand). */
export function tropheesSynthese(lignes: LigneTrophee[], complet: boolean): TropheesSynthese {
  const c = compter(lignes);
  const d = dernierGagne(c.lignes);
  return { total: c.total, parPalier: c.parPalier, lignes: c.lignes, complet, dernier: d ? { source: d.source, palier: d.palier, nom: d.nom, regle: d.regle } : null };
}

// ── Les nouvelles sources : maitrise_synthese et rythme_joueur (lot 2) ─────
// Le JSON des deux fonctions SQL (migration_moi_synthese.sql), lu avec
// méfiance (un champ de travers est écarté, jamais deviné) puis rangé dans le
// contrat de types.ts. Rien n'est inventé : une mesure absente reste null.

const estObjet = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function nombreDe(v: unknown): number | null {
  const x = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(x) ? x : null;
}

const borne100 = (x: number) => Math.max(0, Math.min(100, Math.round(x)));
const TOPIC_CLES: ReadonlySet<string> = new Set(TOPICS.map((t) => t.key));

/** Les matières avec leur poids officiel, dans l'ordre du programme (pour qui n'a pas la maîtrise sous la main). */
export const MATIERES_POIDS: readonly { cle: string; poids: number }[] = TOPICS.map((t) => ({ cle: t.key, poids: t.weight }));

/** Les comparaisons du sélecteur : il y a 30, 60 et 90 jours (les trois premières dates demandées à maitrise_synthese). */
export const JOURS_COMPARAISON = [30, 60, 90] as const;
/** Les semaines de la courbe de progression : il y a 7 × k jours, k de 1 à 12 (les douze dates qui suivent). */
export const SEMAINES_COURBE = 12;
/** Le rang, dans la liste des dates, de chaque comparaison, et celui de la première semaine (il y a 7 jours). */
export const RANG_COMPARAISON = { 30: 0, 60: 1, 90: 2 } as const;
export const RANG_SEMAINE = JOURS_COMPARAISON.length;

/** Joueurs mesurés qu'il faut au moins pour montrer la moyenne d'une matière. */
export const MIN_JOUEURS_MOYENNE = 5;
/** Réponses à une matière, d'un même genre (avec ou sans calcul), pour la juger. */
export const MIN_REPONSES_CALCUL = 10;
/** Matières mesurées des deux côtés pour comparer calcul et théorie. */
export const MIN_MATIERES_CALCUL = 3;
/** Questions chronométrées pour juger un rythme (global ou d'une matière). */
export const MIN_QUESTIONS_RYTHME = 20;

/** Une mesure : la maîtrise (null : pas mesurée) et le nombre de réponses dans la fenêtre. */
export type Mesure = { pct: number | null; n: number };

function mesureDe(v: unknown, min: number): Mesure | null {
  if (!estObjet(v)) return null;
  const n = nombreDe(v.n);
  if (n === null || n < 0) return null;
  const p = nombreDe(v.pct);
  return { pct: p !== null && n >= min ? borne100(p) : null, n: Math.round(n) };
}

// ── L'historique par matière ───────────────────────────────────────────────

/** La maîtrise de chaque matière à une date (la clé manque : aucune réponse avant cette date). */
export type PointHistorique = { jour: string; matieres: Record<string, Mesure> };

/**
 * L'historique de maitrise_synthese rangé par date. `jours` : le jour (AAAA-MM-JJ)
 * de chaque date demandée, dans l'ordre de la demande ; le rang `i` du JSON
 * (à partir de 1) y renvoie. Une date sans ligne donne un point vide. Un JSON
 * qui n'est pas une liste : null.
 */
export function historiqueEn(historique: unknown, jours: readonly string[]): PointHistorique[] | null {
  if (!Array.isArray(historique)) return null;
  const points: PointHistorique[] = jours.map((jour) => ({ jour, matieres: {} }));
  for (const ligne of historique) {
    if (!estObjet(ligne)) continue;
    const i = nombreDe(ligne.i);
    if (i === null || !Number.isInteger(i) || i < 1 || i > points.length || !estObjet(ligne.matieres)) continue;
    for (const [cle, v] of Object.entries(ligne.matieres)) {
      const m = TOPIC_CLES.has(cle) ? mesureDe(v, MAITRISE.SEUIL_PROVISOIRE) : null;
      if (m) points[i - 1].matieres[cle] = m;
    }
  }
  return points;
}

/** Les dix matières telles qu'elles étaient à une date (une matière non mesurée a un pct null et pèse 0 dans la note). */
export function matieresA(mesures: Record<string, Mesure>): MaitriseMatiere[] {
  return TOPICS.map((t): MaitriseMatiere => {
    const m = mesures[t.key];
    const n = m?.n ?? 0;
    const pct = m?.pct ?? null;
    const court = subjectByKey(t.key)?.short ?? t.label;
    return { cle: t.key, nom: t.label, court, poids: t.weight, pct, n, total: n, statut: statutDe(n), derniere: null, debut: null, ancienne: null, zone: zoneDe(pct) };
  });
}

/** La note de préparation à une date : Σ poids × pct / Σ poids, une matière non mesurée comptant 0 (même formule qu'aujourd'hui). */
export function preparationA(mesures: Record<string, Mesure>): number {
  return preparationDe(matieresA(mesures));
}

/** Vrai si au moins une matière était mesurée à la date. */
export function mesureeA(mesures: Record<string, Mesure> | undefined): boolean {
  return !!mesures && Object.values(mesures).some((m) => m.pct !== null);
}

/** La maîtrise d'aujourd'hui, au même format que l'historique. */
export function mesuresDuJour(m: Maitrise): Record<string, Mesure> {
  return Object.fromEntries(m.matieres.map((x) => [x.cle, { pct: x.pct, n: x.n }]));
}

// ── Les moyennes des joueurs et les atouts ─────────────────────────────────

/** Les moyennes de maitrise_synthese : par matière, seulement celles que 5 joueurs mesurés au moins fondent. */
export function moyennesDe(brut: unknown): Record<string, number> {
  const r: Record<string, number> = {};
  if (!estObjet(brut)) return r;
  for (const [cle, v] of Object.entries(brut)) {
    if (!TOPIC_CLES.has(cle) || !estObjet(v)) continue;
    const pct = nombreDe(v.pct);
    const joueurs = nombreDe(v.joueurs);
    if (pct !== null && joueurs !== null && joueurs >= MIN_JOUEURS_MOYENNE) r[cle] = borne100(pct);
  }
  return r;
}

export type Atout = { cle: string; court: string; pct: number; moyenne: number; ecart: number };

/**
 * Les atouts face aux joueurs : la maîtrise de la matière moins la moyenne des
 * joueurs, seulement quand l'écart est positif, du plus grand au plus petit
 * (à égalité, l'ordre du programme). null quand aucune moyenne n'est fondée
 * (moins de 5 joueurs, ou source absente) : l'encart se masque ; [] quand il y
 * a des moyennes mais aucun atout.
 */
export function atouts(matieres: readonly Pick<MatiereSynthese, "cle" | "court" | "pct">[], moyennes: Record<string, number> | null): Atout[] | null {
  if (!moyennes || !Object.keys(moyennes).length) return null;
  const r: Atout[] = [];
  for (const m of matieres) {
    const moyenne = moyennes[m.cle];
    if (m.pct === null || moyenne === undefined || m.pct - moyenne <= 0) continue;
    r.push({ cle: m.cle, court: m.court, pct: m.pct, moyenne, ecart: m.pct - moyenne });
  }
  return r.sort((a, b) => b.ecart - a.ecart);
}

// ── Les matières et la maîtrise globale ────────────────────────────────────

/** Les dix matières de la synthèse : la maîtrise d'aujourd'hui, son évolution (si l'historique répond), la moyenne des joueurs, ce qu'il y a à gagner, les liens. */
export function matieresSynthese(m: Maitrise, histo: PointHistorique[] | null, moyennes: Record<string, number> | null): MatiereSynthese[] {
  return m.matieres.map((x): MatiereSynthese => {
    const a = (j: 30 | 60 | 90) => histo?.[RANG_COMPARAISON[j]]?.matieres[x.cle]?.pct ?? null;
    return {
      cle: x.cle,
      nom: x.nom,
      court: COURTS_FR[x.cle] ?? x.court,
      mini: MINIS_FR[x.cle] ?? x.court,
      poids: x.poids,
      pct: x.pct,
      statut: x.statut,
      n: x.n,
      total: x.total,
      ilYa: histo ? { 30: a(30), 60: a(60), 90: a(90) } : null,
      moyJoueurs: moyennes?.[x.cle] ?? null,
      // les matières pas encore mesurées sortent de « Où gagner » ; la division reste celle de la préparation (Σ poids)
      gain: x.statut === "non_mesuree" ? 0 : gainPreparation(x, MAITRISE.REPERE, m.matieres),
      hrefReviser: `/fiches/${subjectByKey(x.cle)?.fiche ?? x.cle}`,
      hrefEntrainer: `/practice?topic=${x.cle}&go=1`,
    };
  });
}

/** La maîtrise globale (= la préparation) aujourd'hui et il y a 30, 60 et 90 jours ; null à une date où rien n'était mesuré. */
export function globaleSynthese(m: Maitrise, histo: PointHistorique[] | null): GlobaleSynthese {
  const a = (j: 30 | 60 | 90) => {
    const p = histo?.[RANG_COMPARAISON[j]];
    return p && mesureeA(p.matieres) ? preparationA(p.matieres) : null;
  };
  return { auj: m.preparation, ilYa: histo ? { 30: a(30), 60: a(60), 90: a(90) } : null };
}

// ── Les notions ────────────────────────────────────────────────────────────

/** La mesure d'une notion : 20 dernières réponses (n), pct dès 8, toutes ses réponses (total). */
export type MesureNotion = { pct: number | null; n: number; total: number; derniere: string | null };

/** Les notions de maitrise_synthese, par identifiant (« fixed_income:11 »). Un champ illisible : la notion est écartée. */
export function mesuresNotionsDe(brut: unknown): Record<string, MesureNotion> {
  const r: Record<string, MesureNotion> = {};
  if (!estObjet(brut)) return r;
  for (const [id, v] of Object.entries(brut)) {
    if (!estObjet(v)) continue;
    const m = mesureDe(v, MIN_REPONSES);
    if (!m) continue;
    const total = nombreDe(v.total);
    r[id] = { pct: m.pct, n: m.n, total: Math.max(m.n, total === null ? m.n : Math.round(total)), derniere: typeof v.derniere === "string" ? v.derniere : null };
  }
  return r;
}

/** L'état d'une case : rouge sous 50, ambre de 50 à 69, acquise à 70 et plus ; « en cours » de 1 à 7 réponses ; « jamais vue » sans réponse. */
export function etatNotion(pct: number | null, n: number): EtatNotion {
  if (pct !== null) return ton(pct) ?? "jamais";
  return n > 0 ? "encours" : "jamais";
}

/**
 * Les notions du catalogue (93) avec leur état, dans l'ordre du catalogue.
 * @param catalogue lib/notions.ts (NOTIONS), passé par l'appelant pour ne pas alourdir les îlots
 * @param mesures mesuresNotionsDe(maitrise_synthese.notions) ; une notion absente est « jamais vue »
 */
export function notionsDe(catalogue: readonly NotionCatalogue[], mesures: Record<string, MesureNotion>): NotionSynthese[] {
  const rang = new Map<string, number>(TOPICS.map((t, i): [string, number] => [t.key, i]));
  return catalogue.map((nt): NotionSynthese => {
    const me = mesures[nt.id];
    const n = me?.n ?? 0;
    const pct = me?.pct ?? null;
    return { id: nt.id, m: rang.get(nt.matiere) ?? -1, court: nt.court, pct, n, etat: etatNotion(pct, n), href: nt.fiches[0]?.href ?? nt.cours };
  });
}

/**
 * Le repli sans maitrise_synthese : points_faibles, les 20 dernières réponses
 * sur 90 jours au plus, sans pondération (pct = justes / réponses dès 8). Une
 * notion sans réponse récente y est « pas vue depuis 90 j ».
 * @param lignes les notions du joueur (lireNotionsJoueur), réponses les plus récentes d'abord
 */
export function notionsDepuisPointsFaibles(lignes: readonly { notion: string; recentes: readonly { ok: boolean }[] }[], catalogue: readonly NotionCatalogue[]): NotionSynthese[] {
  const mesures: Record<string, MesureNotion> = {};
  for (const l of lignes) {
    const recentes = l.recentes.slice(0, RECENT_REPONSES);
    const n = recentes.length;
    const ok = recentes.filter((r) => r.ok).length;
    mesures[l.notion] = { pct: n >= MIN_REPONSES ? Math.round((100 * ok) / n) : null, n, total: n, derniere: null };
  }
  return notionsDe(catalogue, mesures);
}

/** Le nombre de notions dans chaque état (la légende de la carte : le total fait toujours le nombre de notions). */
export function comptesNotions(notions: readonly NotionSynthese[]): Record<EtatNotion, number> {
  const c: Record<EtatNotion, number> = { r: 0, a: 0, e: 0, encours: 0, jamais: 0 };
  for (const n of notions) c[n.etat]++;
  return c;
}

// ── Calcul ou théorie ──────────────────────────────────────────────────────

/** Les mesures « <matière>:avec » et « <matière>:sans » de maitrise_synthese (60 dernières réponses, pct dès 10). */
export function mesuresCalculDe(brut: unknown): Record<string, Mesure> {
  const r: Record<string, Mesure> = {};
  if (!estObjet(brut)) return r;
  for (const [cle, v] of Object.entries(brut)) {
    const [matiere, genre] = cle.split(":");
    if (!TOPIC_CLES.has(matiere) || (genre !== "avec" && genre !== "sans")) continue;
    const m = mesureDe(v, MIN_REPONSES_CALCUL);
    if (m) r[cle] = m;
  }
  return r;
}

/**
 * La maîtrise des questions avec calcul et sans calcul, pondérée par les poids
 * officiels, sur les seules matières mesurées des deux côtés (pour comparer ce
 * qui est comparable). null sous 3 matières de ce genre.
 */
export function calculGlobal(calcul: Record<string, Mesure>, matieres: readonly { cle: string; poids: number }[] = MATIERES_POIDS): { avec: number; sans: number } | null {
  let poids = 0;
  let avec = 0;
  let sans = 0;
  let k = 0;
  for (const m of matieres) {
    const a = calcul[`${m.cle}:avec`]?.pct ?? null;
    const s = calcul[`${m.cle}:sans`]?.pct ?? null;
    if (a === null || s === null) continue;
    poids += m.poids;
    avec += m.poids * a;
    sans += m.poids * s;
    k++;
  }
  return k >= MIN_MATIERES_CALCUL && poids > 0 ? { avec: Math.round(avec / poids), sans: Math.round(sans / poids) } : null;
}

/** La carte « Calcul ou théorie » : le global (null sous 3 matières) et, pour chaque matière mesurée d'au moins un côté, ses deux chiffres. */
export function calculSynthese(calcul: Record<string, Mesure>, matieres: readonly { cle: string; poids: number }[] = MATIERES_POIDS): CalculSynthese {
  const lignes: CalculSynthese["matieres"] = [];
  for (const t of TOPICS) {
    const avec = calcul[`${t.key}:avec`]?.pct ?? null;
    const sans = calcul[`${t.key}:sans`]?.pct ?? null;
    if (avec !== null || sans !== null) lignes.push({ cle: t.key, court: COURTS_FR[t.key] ?? t.label, avec, sans });
  }
  return { global: calculGlobal(calcul, matieres), matieres: lignes };
}

// ── Le rythme d'examen ─────────────────────────────────────────────────────

/** La réponse de rythme_joueur : null (la carte se masque) si elle n'a pas la forme attendue. Sous 20 questions chronométrées, pas de global ; une matière n'apparaît qu'à partir de 20. */
export function rythmeDe(brut: unknown): RythmeSynthese | null {
  if (!estObjet(brut) || !estObjet(brut.matieres)) return null;
  const questions = Math.max(0, Math.round(nombreDe(brut.n) ?? 0));
  const sec = nombreDe(brut.sec);
  const matieres: RythmeSynthese["matieres"] = [];
  for (const t of TOPICS) {
    const v = brut.matieres[t.key];
    if (!estObjet(v)) continue;
    const s = nombreDe(v.sec);
    const n = nombreDe(v.n);
    if (s === null || n === null || s <= 0 || n < MIN_QUESTIONS_RYTHME) continue;
    matieres.push({ cle: t.key, court: COURTS_FR[t.key] ?? t.label, secondes: Math.round(s), n: Math.round(n) });
  }
  return { global: sec !== null && sec > 0 && questions >= MIN_QUESTIONS_RYTHME ? Math.round(sec) : null, questions, matieres };
}

// ── La progression ─────────────────────────────────────────────────────────

/**
 * La courbe : la note de préparation de chacune des 12 dernières semaines
 * (l'historique, il y a 7 × k jours) puis aujourd'hui, du plus ancien au plus
 * récent, avec une série par matière. Les premiers points où rien n'était
 * mesuré (une note de 0 qui ne dit rien) sont écartés ; il peut donc rester
 * moins de 3 points, et la carte montre alors son état vide. Les dates sont
 * écrites ici, côté serveur (« 18 févr. »).
 * @param histo historiqueEn(...), dans l'ordre de datesSynthese
 * @param aujourdhui le jour d'aujourd'hui (AAAA-MM-JJ, Paris)
 * @param examen le jour de l'examen (AAAA-MM-JJ) ; un examen passé est oublié (null)
 */
export function progressionSynthese(histo: PointHistorique[] | null, m: Maitrise | null, aujourdhui: string, examen: string | null = null): ProgressionSynthese | null {
  if (!histo || !m) return null;
  const aVenir = examen && examen >= aujourdhui ? examen : null;
  const semaines = histo.slice(RANG_SEMAINE, RANG_SEMAINE + SEMAINES_COURBE).reverse();
  const jours = [...semaines.map((p) => p.jour), aujourdhui];
  const series = [...semaines.map((p) => p.matieres), mesuresDuJour(m)];
  const premier = series.findIndex((s) => mesureeA(s));
  if (premier < 0) return { points: [], dates: [], matieres: TOPICS.map(() => []), aujourdhui, examen: aVenir };
  const gardees = series.slice(premier);
  return {
    points: gardees.map((s) => preparationA(s)),
    dates: jours.slice(premier).map((j) => dateCourte(j)),
    matieres: TOPICS.map((t) => gardees.map((s) => s[t.key]?.pct ?? null)),
    aujourdhui,
    examen: aVenir,
  };
}

// ── Tes matières (grande carte, lot 3) ─────────────────────────────────────
// Le radar, les barres, la vue d'ensemble, la fiche d'une matière et la phrase
// « Ce que ça veut dire » : tout le calcul de la carte, pur. L'îlot
// (TesMatieres.tsx) ne tient que quatre états : la vue, la comparaison, le tri
// et la matière ouverte. Une matière non mesurée (moins de 10 réponses) est
// posée à 0 sur le radar avec un point creux ; une maîtrise provisoire (10 à 39
// réponses) s'écrit « ≈ 52 % ».

export type VueMatieres = "radar" | "barres";
export type TriMatieres = "programme" | "faible";
/** Il y a 30, 60 ou 90 jours. */
export type Comparaison = (typeof JOURS_COMPARAISON)[number];

const SEUIL = MAITRISE.REPERE;
const BAS = MAITRISE.ZONES[0];
/** Le seuil d'acquis (70 %) et la frontière rouge / ambre (50 %), pour les textes des cartes. */
export const SEUIL_ACQUIS: number = SEUIL;
export const SEUIL_BAS: number = BAS;

/** L'écart en points, avec le vrai signe moins : « +7 », « −3 », « ±0 ». */
export function delta(d: number): string {
  const r = Math.round(d);
  return r > 0 ? `+${r}` : r < 0 ? `−${-r}` : "±0";
}
export type TonDelta = "pos" | "neg" | "nul";
export function tonDelta(d: number): TonDelta {
  const r = Math.round(d);
  return r > 0 ? "pos" : r < 0 ? "neg" : "nul";
}

/** Une décimale au plus, à la française : 2,3 ; 17,5 ; 2. */
export function decimal(x: number): string {
  return String(Math.round(x * 10) / 10).replace(".", ",");
}

/** Les comparaisons offertes : celles où la maîtrise globale était mesurée. Aucune sans historique (le sélecteur disparaît). */
export function comparaisonsDispo(globale: GlobaleSynthese | null): Comparaison[] {
  const a = globale?.ilYa;
  return a ? JOURS_COMPARAISON.filter((j) => a[j] !== null) : [];
}

export type EcartMatiere = { genre: "ecart"; d: number; texte: string; ton: TonDelta } | { genre: "nouvelle" };

/** L'écart d'une matière face à elle-même il y a `comp` jours ; « nouvelle » si elle n'était pas mesurée alors ; null sans comparaison ou sans mesure d'aujourd'hui. */
export function ecartMatiere(m: Pick<MatiereSynthese, "pct" | "ilYa">, comp: Comparaison | null): EcartMatiere | null {
  if (comp === null || !m.ilYa || m.pct === null) return null;
  const avant = m.ilYa[comp];
  if (avant === null) return { genre: "nouvelle" };
  const d = m.pct - avant;
  return { genre: "ecart", d, texte: delta(d), ton: tonDelta(d) };
}

/** « 58 % », « ≈ 52 % » (provisoire), « — » (pas mesurée). */
export function valeurMatiere(m: Pick<MatiereSynthese, "pct" | "statut">): string {
  return libellePct(m) ?? SYN.matieres.tiret;
}

/** L'infobulle d'une maîtrise provisoire (« provisoire · 23 réponses sur 40 »), sinon null. */
export function infoMatiere(m: Pick<MatiereSynthese, "statut" | "n">): string | null {
  return infobulleMaitrise(m);
}

const poidsTexte = (p: number) => `${decimal(p)}${NBSP}%`;

// ── le radar ───────────────────────────────────────────────────────────────

/** Les dimensions d'un dessin du radar : grand (ordinateur, 520 × 452) ou petit (téléphone, 328 × 288), avec leurs traits. */
export type ProfilRadar = {
  larg: number;
  haut: number;
  cx: number;
  cy: number;
  /** rayon de l'anneau 100 et distance des étiquettes */
  R: number;
  L: number;
  rPt: number;
  rCmp: number;
  trait: number;
  traitCmp: number;
  traitSeuil: number;
  bordPt: number;
  seuilTirets: string;
  cmpTirets: string;
  halo: number;
  rSel: number;
  traitSel: number;
  /** décalage vertical des repères 50, 70 %, 100 */
  dyTexte: number;
};
export const RADAR_GRAND: ProfilRadar = { larg: 520, haut: 452, cx: 260, cy: 226, R: 150, L: 166, rPt: 5.5, rCmp: 3.5, trait: 2.6, traitCmp: 2, traitSeuil: 1.6, bordPt: 2, seuilTirets: "5 4", cmpTirets: "7 5", halo: 12, rSel: 10, traitSel: 3, dyTexte: 0.6 };
export const RADAR_PETIT: ProfilRadar = { larg: 328, haut: 288, cx: 171, cy: 144, R: 82, L: 92, rPt: 4.5, rCmp: 2.8, trait: 2.2, traitCmp: 1.8, traitSeuil: 1.4, bordPt: 1.6, seuilTirets: "4 3", cmpTirets: "5 4", halo: 9, rSel: 8, traitSel: 2.5, dyTexte: 2.3 };

const angleRadar = (i: number) => ((-90 + 36 * i) * Math.PI) / 180;
function pointRadar(p: ProfilRadar, i: number, v: number): [number, number] {
  const a = angleRadar(i);
  return [r1(p.cx + ((p.R * v) / 100) * Math.cos(a)), r1(p.cy + ((p.R * v) / 100) * Math.sin(a))];
}
const polyRadar = (p: ProfilRadar, vals: readonly number[]) => vals.map((v, i) => pointRadar(p, i, v).join(",")).join(" ");
const rond = (x: number, y: number, r: number) => `M${r1(x - r)} ${r1(y)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;

export type GeoRadar = {
  profil: ProfilRadar;
  /** les anneaux 100, 70, 50 et 25, et les dix axes */
  z100: string;
  z70: string;
  z50: string;
  z25: string;
  axes: string;
  /** le polygone « toi » (une matière non mesurée à 0) et celui de la comparaison (null sans comparaison) */
  toi: string;
  comp: string | null;
  compPts: string | null;
  /** les points : rouges, ambre, acquis, et creux (matières non mesurées) */
  ptsR: string;
  ptsA: string;
  ptsE: string;
  ptsV: string;
  /** la matière choisie : le trait de l'axe en halo et son anneau */
  halo: { x1: number; y1: number; x2: number; y2: number } | null;
  sel: { x: number; y: number } | null;
  /** les repères de l'échelle : 50, 70 %, 100 */
  reperes: { x: number; y: number; texte: string; seuil: boolean }[];
};

/** La géométrie d'un dessin du radar. `valeurs` : la maîtrise (null : non mesurée, posée à 0) ; `comp` : la même il y a N jours, ou null. */
export function geometrieRadar(p: ProfilRadar, valeurs: readonly (number | null)[], comp: readonly (number | null)[] | null, sel: number | null): GeoRadar {
  const val = valeurs.map((v) => v ?? 0);
  const anneau = (v: number) => polyRadar(p, val.map(() => v));
  const pts = (garde: (v: number | null) => boolean, r: number) => {
    const d = valeurs.map((v, i) => (garde(v) ? rond(...pointRadar(p, i, v ?? 0), r) : "")).join("");
    return d || "M0 0";
  };
  const repere = (v: number, texte: string, seuil = false) => {
    const r = 0.92 * ((p.R * v) / 100);
    const a = (-72 * Math.PI) / 180;
    return { x: r1(p.cx + r * Math.cos(a)), y: r1(p.cy + r * Math.sin(a) + p.dyTexte), texte, seuil };
  };
  const hp = sel !== null ? pointRadar(p, sel, 100) : null;
  const sp = sel !== null ? pointRadar(p, sel, val[sel] ?? 0) : null;
  return {
    profil: p,
    z100: anneau(100),
    z70: anneau(SEUIL),
    z50: anneau(BAS),
    z25: anneau(25),
    axes: val
      .map((_, i) => {
        const [x, y] = pointRadar(p, i, 100);
        return `M${p.cx} ${p.cy}L${x} ${y}`;
      })
      .join(""),
    toi: polyRadar(p, val),
    comp: comp ? polyRadar(p, comp.map((v) => v ?? 0)) : null,
    compPts: comp ? comp.map((v, i) => rond(...pointRadar(p, i, v ?? 0), p.rCmp)).join("") : null,
    ptsR: pts((v) => v !== null && v < BAS, p.rPt),
    ptsA: pts((v) => v !== null && v >= BAS && v < SEUIL, p.rPt),
    ptsE: pts((v) => v !== null && v >= SEUIL, p.rPt),
    ptsV: pts((v) => v === null, p.rPt),
    halo: hp ? { x1: p.cx, y1: p.cy, x2: hp[0], y2: hp[1] } : null,
    sel: sp ? { x: sp[0], y: sp[1] } : null,
    reperes: [repere(BAS, SYN.matieres.anneaux.cinquante), repere(SEUIL, SYN.matieres.anneaux.seuil(SEUIL), true), repere(100, SYN.matieres.anneaux.cent)],
  };
}

export type CoteEtiquette = "h" | "b" | "d" | "g";

export type EtiquetteRadar = {
  i: number;
  court: string;
  mini: string;
  valeur: string;
  info: string | null;
  ecart: { texte: string; ton: TonDelta } | null;
  /** sous le seuil : la valeur en rouge */
  sous: boolean;
  on: boolean;
  cote: CoteEtiquette;
  /** la place de l'étiquette en % du dessin, pour le grand et pour le petit (téléphone) */
  xG: string;
  yG: string;
  xP: string;
  yP: string;
  aria: string;
};

const pour100 = (x: number) => `${Math.round(x * 100) / 100}%`;

/** Le nom lu d'une matière : « Éthique : 58 %, +7 points face à toi il y a 30 jours. Ouvrir sa fiche. » */
export function ariaMatiere(m: MatiereSynthese, comp: Comparaison | null): string {
  const e = ecartMatiere(m, comp);
  const ec = e && comp !== null ? (e.genre === "ecart" ? SYN.matieres.ecartAria(e.texte, comp) : SYN.matieres.nouvelleAria(comp)) : null;
  return SYN.matieres.bouton(m.nom, SYN.matieres.valeurAria(m.pct, m.statut === "provisoire"), ec);
}

/** Les dix étiquettes du radar, placées autour de l'anneau : de vrais boutons, pas des légendes dessinées. */
export function etiquettesRadar(matieres: readonly MatiereSynthese[], comp: Comparaison | null, sel: number | null): EtiquetteRadar[] {
  return matieres.map((m, i) => {
    const a = angleRadar(i);
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const e = ecartMatiere(m, comp);
    const g = RADAR_GRAND;
    const pt = RADAR_PETIT;
    return {
      i,
      court: m.court,
      mini: m.mini,
      valeur: valeurMatiere(m),
      info: infoMatiere(m),
      ecart: e ? (e.genre === "ecart" ? { texte: e.texte, ton: e.ton } : { texte: SYN.matieres.nouvelle, ton: "nul" }) : null,
      sous: m.pct !== null && m.pct < SEUIL,
      on: sel === i,
      cote: Math.abs(c) < 0.2 ? (sn < 0 ? "h" : "b") : c > 0 ? "d" : "g",
      xG: pour100((100 * (g.cx + g.L * c)) / g.larg),
      yG: pour100((100 * (g.cy + g.L * sn)) / g.haut),
      xP: pour100((100 * (pt.cx + pt.L * c)) / pt.larg),
      yP: pour100((100 * (pt.cy + pt.L * sn)) / pt.haut),
      aria: ariaMatiere(m, comp),
    };
  });
}

// ── les barres ─────────────────────────────────────────────────────────────

export type LigneBarre = {
  i: number;
  court: string;
  /** « poids 17,5 % », ou « pas encore mesurée » */
  sous: string;
  valeur: string;
  info: string | null;
  nonMesuree: boolean;
  /** la largeur de la barre en % (au moins 1,5 pour qu'un 0 % se voie) */
  w: number;
  ton: Zone | null;
  /** le repère de la comparaison, en % */
  repere: number | null;
  ecart: { texte: string; ton: TonDelta } | null;
  on: boolean;
  off: boolean;
  aria: string;
};

/** Les dix barres, dans l'ordre du programme ou du plus faible (tri stable ; les matières non mesurées à la fin). */
export function lignesBarres(matieres: readonly MatiereSynthese[], comp: Comparaison | null, tri: TriMatieres, sel: number | null): LigneBarre[] {
  const ordre = matieres.map((_, i) => i);
  if (tri === "faible") {
    ordre.sort((a, b) => {
      const pa = matieres[a].pct;
      const pb = matieres[b].pct;
      if (pa === null || pb === null) return pa === pb ? a - b : pa === null ? 1 : -1;
      return pa - pb || a - b;
    });
  }
  return ordre.map((i): LigneBarre => {
    const m = matieres[i];
    const e = ecartMatiere(m, comp);
    return {
      i,
      court: m.court,
      sous: m.pct === null ? SYN.matieres.pasMesuree : SYN.matieres.barres.poids(poidsTexte(m.poids)),
      valeur: valeurMatiere(m),
      info: infoMatiere(m),
      nonMesuree: m.pct === null,
      w: m.pct === null ? 0 : Math.max(m.pct, 1.5),
      ton: ton(m.pct),
      repere: comp !== null ? (m.ilYa?.[comp] ?? null) : null,
      ecart: e ? (e.genre === "ecart" ? { texte: e.texte, ton: e.ton } : { texte: SYN.matieres.nouvelle, ton: "nul" }) : null,
      on: sel === i,
      off: sel !== null && sel !== i,
      aria: ariaMatiere(m, comp),
    };
  });
}

// ── la vue d'ensemble ──────────────────────────────────────────────────────

export type LigneEvolution = {
  i: number;
  court: string;
  /** « +8 », « nouvelle », « 58 % », « — » */
  texte: string;
  /** la longueur de la barre, 0 à 100 */
  w: number;
  neg: boolean;
  aria: string;
};

export type Ensemble = {
  /** le nombre de matières (10) */
  total: number;
  globale: number;
  avant: { j: Comparaison; pct: number; ecart: string; ton: TonDelta; points: string } | null;
  haute: number;
  moyenne: number;
  basse: number;
  nonMesurees: number;
  hausse: { n: number; sur: number } | null;
  fort: { court: string; valeur: string } | null;
  /** la plus faible des mesurées (null sous deux matières mesurées) et son index, pour le bouton « Ouvrir » */
  faible: { court: string; valeur: string; i: number } | null;
  /** « ecart » : classées par évolution ; « classement » : par maîtrise (sans historique) */
  genre: "ecart" | "classement";
  evolution: LigneEvolution[];
};

/** La note de préparation d'une liste de matières (Σ poids × pct / Σ poids ; une matière non mesurée compte 0). */
function preparationDes(ms: readonly Pick<MatiereSynthese, "poids" | "pct">[]): number {
  const total = ms.reduce((t, m) => t + m.poids, 0);
  return total > 0 ? Math.round(ms.reduce((t, m) => t + m.poids * (m.pct ?? 0), 0) / total) : 0;
}

export function ensembleMatieres(matieres: readonly MatiereSynthese[], globale: GlobaleSynthese | null, comp: Comparaison | null): Ensemble {
  const mesurees = matieres.map((_, i) => i).filter((i) => matieres[i].pct !== null);
  const pctDe = (i: number) => matieres[i].pct as number;
  const auj = globale?.auj ?? preparationDes(matieres);
  const avantPct = comp !== null ? (globale?.ilYa?.[comp] ?? null) : null;
  const ecarts = matieres.map((m) => ecartMatiere(m, comp));
  const avecEcart = ecarts.filter((e): e is Extract<EcartMatiere, { genre: "ecart" }> => e?.genre === "ecart");
  let iFort = -1;
  let iFaible = -1;
  for (const i of mesurees) {
    if (iFort < 0 || pctDe(i) > pctDe(iFort)) iFort = i;
    if (iFaible < 0 || pctDe(i) < pctDe(iFaible)) iFaible = i;
  }
  const genre: Ensemble["genre"] = comp !== null && avecEcart.length > 0 ? "ecart" : "classement";
  const maxAbs = Math.max(8, ...avecEcart.map((e) => Math.abs(e.d)));
  const lignes: LigneEvolution[] = matieres.map((m, i) => {
    const e = ecarts[i];
    if (m.pct === null) return { i, court: m.court, texte: SYN.matieres.tiret, w: 0, neg: false, aria: SYN.matieres.ensemble.classAria(m.nom, SYN.matieres.pasMesuree) };
    if (genre === "classement") return { i, court: m.court, texte: valeurMatiere(m), w: m.pct, neg: false, aria: SYN.matieres.ensemble.classAria(m.nom, valeurMatiere(m)) };
    if (e?.genre === "ecart") return { i, court: m.court, texte: e.texte, w: r1((Math.abs(e.d) / maxAbs) * 100), neg: e.d < 0, aria: SYN.matieres.ensemble.evoAria(m.nom, e.texte, comp as number) };
    return { i, court: m.court, texte: SYN.matieres.nouvelle, w: 0, neg: false, aria: SYN.matieres.ensemble.evoNouvelle(m.nom, comp as number) };
  });
  // rang : l'évolution décroissante (les nouvelles, puis les non mesurées, à la fin) ou la maîtrise décroissante ; à égalité, l'ordre du programme
  const cle = (l: LigneEvolution): number => {
    const e = ecarts[l.i];
    if (matieres[l.i].pct === null) return -1e9;
    if (genre === "classement") return pctDe(l.i);
    return e?.genre === "ecart" ? e.d : -1e6;
  };
  const evolution = [...lignes].sort((a, b) => cle(b) - cle(a) || a.i - b.i);
  const dg = avantPct !== null ? auj - avantPct : 0;
  return {
    total: matieres.length,
    globale: auj,
    avant: avantPct !== null && comp !== null ? { j: comp, pct: avantPct, ecart: delta(dg), ton: tonDelta(dg), points: SYN.matieres.ensemble.points(delta(dg), dg) } : null,
    haute: mesurees.filter((i) => pctDe(i) >= SEUIL).length,
    moyenne: mesurees.filter((i) => pctDe(i) >= BAS && pctDe(i) < SEUIL).length,
    basse: mesurees.filter((i) => pctDe(i) < BAS).length,
    nonMesurees: matieres.length - mesurees.length,
    hausse: comp !== null && avecEcart.length > 0 ? { n: avecEcart.filter((e) => e.d > 0).length, sur: avecEcart.length } : null,
    fort: iFort >= 0 ? { court: matieres[iFort].court, valeur: valeurMatiere(matieres[iFort]) } : null,
    faible: iFaible >= 0 && mesurees.length >= 2 ? { court: matieres[iFaible].court, valeur: valeurMatiere(matieres[iFaible]), i: iFaible } : null,
    genre,
    evolution,
  };
}

// ── la fiche d'une matière ─────────────────────────────────────────────────

export type LigneNotion = { id: string; nom: string; valeur: string; w: number; ton: Zone | null; etat: EtatNotion };

/** Les notions d'une matière (dans l'ordre du catalogue) pour sa fiche. `source` : « 90j » écrit « pas vue » au lieu de « jamais vue ». */
export function lignesNotions(notions: readonly NotionSynthese[], m: number, source: "unique" | "90j"): LigneNotion[] {
  return notions
    .filter((n) => n.m === m)
    .map((n): LigneNotion => {
      const valeur = n.pct !== null ? pc(n.pct) : n.etat === "encours" ? SYN.matieres.fiche.valeurEnCours(n.n, MIN_REPONSES) : SYN.matieres.fiche.valeurJamais(source);
      return { id: n.id, nom: n.court, valeur, w: n.pct !== null ? Math.max(n.pct, 1.5) : 0, ton: ton(n.pct), etat: n.etat };
    });
}

export type ResumeNotions = { total: number; mesurees: number; sous: number; enCours: number; jamais: number };

export function resumeNotions(notions: readonly Pick<NotionSynthese, "pct" | "etat">[]): ResumeNotions {
  const mesurees = notions.filter((n) => n.pct !== null);
  return {
    total: notions.length,
    mesurees: mesurees.length,
    sous: mesurees.filter((n) => (n.pct as number) < SEUIL).length,
    enCours: notions.filter((n) => n.etat === "encours").length,
    jamais: notions.filter((n) => n.etat === "jamais").length,
  };
}

/** « 3 sous 70 % · 1 en cours · 2 jamais vues » ; « aucune notion mesurée » quand il n'y a rien à dire. */
export function texteResume(r: ResumeNotions, source: "unique" | "90j"): string {
  const f = SYN.matieres.fiche;
  const morceaux = [r.mesurees > 0 ? f.sous70(r.sous, SEUIL) : null, r.enCours > 0 ? f.enCours(r.enCours) : null, r.jamais > 0 ? f.jamaisVues(r.jamais, source) : null].filter((x): x is string => x !== null);
  return morceaux.length ? morceaux.join(" · ") : f.aucuneNotion;
}

export type FicheMatiere = {
  i: number;
  nom: string;
  court: string;
  valeur: string;
  info: string | null;
  nonMesuree: boolean;
  ecart: EcartMatiere | null;
  poids: string;
  reponses: string;
  avant: { j: Comparaison; valeur: string } | null;
  /** « +2,3 pts », « acquise », « — » */
  gain: string;
  /** il y a 90, 60, 30 jours puis aujourd'hui ; null sans historique */
  evolution: { cle: string; libelle: string; valeur: string; actif: boolean; auj: boolean }[] | null;
  notions: LigneNotion[] | null;
  resume: ResumeNotions | null;
  hrefReviser: string;
  hrefEntrainer: string;
};

export function ficheMatiere(m: MatiereSynthese, i: number, comp: Comparaison | null, notions: readonly NotionSynthese[] | null, source: "unique" | "90j"): FicheMatiere {
  const f = SYN.matieres.fiche;
  const valAvant = (j: Comparaison) => {
    const v = m.ilYa?.[j] ?? null;
    return v === null ? SYN.matieres.tiret : pc(v);
  };
  const mienne = notions ? notions.filter((n) => n.m === i) : null;
  return {
    i,
    nom: m.nom,
    court: m.court,
    valeur: valeurMatiere(m),
    info: infoMatiere(m),
    nonMesuree: m.pct === null,
    ecart: ecartMatiere(m, comp),
    poids: poidsTexte(m.poids),
    reponses: entier(m.total),
    avant: comp !== null && m.ilYa ? { j: comp, valeur: valAvant(comp) } : null,
    gain: m.pct === null ? SYN.matieres.tiret : m.pct >= SEUIL ? f.acquise : f.gainPts(decimal(m.gain)),
    evolution: m.ilYa
      ? [
          ...([90, 60, 30] as const).map((j) => ({ cle: String(j), libelle: SYN.matieres.comparer.option(j), valeur: valAvant(j), actif: comp === j, auj: false })),
          { cle: "auj", libelle: f.auj, valeur: m.pct === null ? SYN.matieres.tiret : pc(m.pct), actif: false, auj: true },
        ]
      : null,
    notions: mienne && mienne.length ? lignesNotions(mienne, i, source) : null,
    resume: mienne && mienne.length ? resumeNotions(mienne) : null,
    hrefReviser: m.hrefReviser,
    hrefEntrainer: m.hrefEntrainer,
  };
}

// ── « Ce que ça veut dire » ────────────────────────────────────────────────

/** Le seuil, puis (si les notions sont connues) ce qu'elles disent : « Encore 12 points avant le seuil ; 2 de ses notions sont sous 70 % sur 5 mesurées : la fiche te dit lesquelles. » */
function clauseSeuil(m: MatiereSynthese, i: number, notions: readonly NotionSynthese[] | null): string {
  const L = SYN.matieres.lire;
  const seuil = m.pct !== null && m.pct >= SEUIL ? L.auDessus : L.avantSeuil(SEUIL - (m.pct ?? 0));
  if (!notions) return `${seuil}.`;
  const r = resumeNotions(notions.filter((n) => n.m === i));
  const clause = r.sous > 0 ? L.notionsSous(r.sous, r.mesurees, SEUIL) : r.mesurees > 0 ? L.notionsToutes(SEUIL) : L.notionsAucune;
  return `${seuil} ; ${clause}.`;
}

/** La phrase de l'encadré : celle de la matière choisie, ou celle de la vue d'ensemble (avec ou sans comparaison). */
export function phraseMatieres(c: { matieres: readonly MatiereSynthese[]; globale: GlobaleSynthese | null; comp: Comparaison | null; mat: number | null; notions: readonly NotionSynthese[] | null }): string {
  const L = SYN.matieres.lire;
  const { matieres, comp } = c;
  if (c.mat !== null && matieres[c.mat]) {
    const i = c.mat;
    const m = matieres[i];
    if (m.pct === null) return L.matPasMesuree(m.court, Math.max(1, MAITRISE.SEUIL_PROVISOIRE - m.n));
    const e = ecartMatiere(m, comp);
    const tete = e?.genre === "ecart" && comp !== null ? L.matEcart(m.court, m.pct - e.d, m.pct, comp, e.texte) : e?.genre === "nouvelle" && comp !== null ? L.matNouvelle(m.court, m.pct, comp) : L.matSimple(m.court, m.pct);
    return `${tete} ${clauseSeuil(m, i, c.notions)}${m.statut === "provisoire" ? L.matProvisoire(m.n, MAITRISE.SEUIL_MESURE) : ""}`;
  }
  const mesurees = matieres.map((_, i) => i).filter((i) => matieres[i].pct !== null);
  if (!mesurees.length) return L.aucune(MAITRISE.SEUIL_PROVISOIRE);
  const glob = c.globale?.auj ?? preparationDes(matieres);
  const avantG = comp !== null ? (c.globale?.ilYa?.[comp] ?? null) : null;
  const faibles = mesurees.filter((i) => (matieres[i].pct as number) < BAS).sort((a, b) => (matieres[a].pct as number) - (matieres[b].pct as number) || a - b);
  const plur = faibles.length > 1;

  if (avantG !== null && comp !== null) {
    const ecarts = matieres.map((m) => ecartMatiere(m, comp));
    const avec = matieres.map((_, i) => i).filter((i) => ecarts[i]?.genre === "ecart");
    const dDe = (i: number) => (ecarts[i] as Extract<EcartMatiere, { genre: "ecart" }>).d;
    const hausse = avec.filter((i) => dDe(i) > 0);
    const d = glob - avantG;
    const p1 = `${L.prise(comp, d, avantG, glob)}${avec.length ? L.progres(hausse.length, avec.length, d < 0) : ""}.`;
    let p2 = "";
    if (hausse.length) {
      const best = Math.max(...hausse.map(dDe));
      p2 = L.hausse(
        hausse.filter((i) => dDe(i) === best).map((i) => matieres[i].court),
        delta(best),
      );
    }
    let p3: string;
    if (!faibles.length) p3 = L.aucuneFaible(SEUIL);
    else {
      const items = faibles.map((i) => L.faibleItem(matieres[i].court, matieres[i].ilYa?.[comp] ?? null, matieres[i].pct as number));
      // « ont doublé ou presque » seulement si toutes ont progressé
      const toutes = faibles.every((i) => ecarts[i]?.genre === "ecart" && dDe(i) > 0);
      let verbe: string | null = null;
      if (toutes) {
        const rapports = faibles.map((i) => (matieres[i].pct as number) / Math.max(matieres[i].ilYa?.[comp] ?? 0, 1));
        const rMin = Math.min(...rapports);
        const rMax = Math.max(...rapports);
        verbe = L.verbe(rMin >= 1.8 ? (rMax >= 2 ? "double" : "presque") : rMin >= 1.4 ? "vite" : "simple", plur);
      }
      p3 = L.faibles(items, verbe);
    }
    return [p1, p2, p3].filter(Boolean).join(" ");
  }
  const passent = mesurees.filter((i) => (matieres[i].pct as number) >= SEUIL).length;
  const reste = faibles.length ? L.faiblesSimples(faibles.map((i) => L.faibleItem(matieres[i].court, null, matieres[i].pct as number))) : L.aucuneFaible(SEUIL);
  return `${L.situation(glob, passent, mesurees.length, SEUIL)} ${reste}`;
}
