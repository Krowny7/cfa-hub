// Le Codex : le MOTEUR générique. Module neutre (aucun accès réseau, aucune
// dépendance serveur) : il reçoit ce que la base a lu (progression, compteurs,
// mesures) et rend ce qu'il faut écrire et afficher. Aucune quête n'est codée
// ici : tout vient du catalogue (lib/codex/catalogue.ts) et de la grammaire
// (lib/codex/types.ts). Le côté serveur (lecture, écriture, repli sans
// migration) est dans lib/codex/serveur.ts.
//
// Le calcul se fait en deux passes sur la MÊME fonction d'évaluation :
//   1. planifier(entree)  : évalue à blanc toutes les quêtes et collecte les
//      compteurs à demander à la base (codex_lire) ;
//   2. evaluer(entree)    : avec les réponses, fait la cascade des prérequis
//      (une quête déjà remplie se valide dès que ses prérequis tombent), décide
//      de la rétroactivité, des récompenses (plafonnées) et des ouvertures, et
//      construit la vue (prochaine quête, contrats, branches…).
// La bible : docs/codex/CONCEPTION.md.

import { ACTES, CHAINES, DECOUVERTE, MODELES_CONTRATS, PHASES, PROGRAMME, RECOMMANDATION, XP, catalogueCodex, contenuDuProgramme, phaseDe, plafondQuete, plafondRetro, queteBranchee, evenementsDe, type ContenuMatiere } from "@/lib/codex/catalogue";
import { levelInfoFromXp } from "@/lib/leveling";
import { DEFAULT_ELO, rankFor } from "@/lib/ranks";
import { notionParId, notionsDeMatiere } from "@/lib/notions";
import { decaleJour, joursEntre } from "@/lib/objectif-calc";
import type { Acte, Comparaison, Emplacement, EtapeBranche, Fenetre, FiltreMesure, ModeleContrat, Objectif, Phase, Prerequis, Quete, TypeEvenement } from "@/lib/codex/types";

// ── Ce que la base donne ───────────────────────────────────────────────

/** Un compteur demandé à codex_lire (migration_codex.sql). */
export type Demande = {
  id: string;
  evenement: TypeEvenement;
  filtre?: Record<string, unknown>;
  fenetre?: unknown;
  /** jour de Paris des fenêtres « jour » / « semaine » (AAAA-MM-JJ) */
  jour?: string;
  distinct?: string;
  somme?: string;
  seuil: number;
};

export type ResultatCompteur = { n: number; atteint: string | null };

/** Les mesures que codex_lire sait faire (tout est optionnel : une table absente = clé absente). */
export type MesuresSql = {
  ratures_ouvertes?: { total: number; matieres: Record<string, number> };
  notions?: Record<string, number>;
  jours?: { jour: string; n: number }[];
  drill_pages?: { matiere: string; page: number; meilleur: number }[];
  drill_totaux?: Record<string, number>;
  maitrise?: Record<string, { pct: number; questions: number; debut: number | null }>;
  types_calcul_tenus?: number;
  sceaux?: Record<string, number>;
  elo?: number | null;
  pic_elo?: number | null;
  xp_total?: number;
  inscrit_le?: string;
  serie?: number;
  meilleure_serie?: number;
};

export type LectureSql = { compteurs: Record<string, ResultatCompteur>; mesures: MesuresSql; speciaux: Record<string, number> };

export const LECTURE_VIDE: LectureSql = { compteurs: {}, mesures: {}, speciaux: {} };

/** Une ligne de codex_progression. */
export type LigneProgression = {
  quete_id: string;
  periode: string;
  etat: "verrouillee" | "disponible" | "active" | "terminee" | "recompensee";
  progression: number;
  cible: number | null;
  ouverte_le: string;
  terminee_le: string | null;
  recompensee_le: string | null;
  retro: boolean;
  xp: number;
  cosmetique: string | null;
  titre: string | null;
  vu: boolean;
};

/** Un contrat du jour tiré (codex_contrats). */
export type ContratTire = { emplacement: Emplacement; modele: string; params: Partial<Record<"matiere" | "notion" | "fiche", string>>; change: boolean };

export type Entree = {
  /** le catalogue : par défaut catalogueCodex() */
  catalogue?: Quete[];
  contenu?: ContenuMatiere[];
  now: Date;
  /** le jour de Paris (AAAA-MM-JJ) */
  jour: string;
  /** date d'examen (AAAA-MM-JJ) */
  jourJ: string | null;
  /** rl_objectif : total de questions visé et jour où il a été fixé */
  objectif: { total: number; depuis: string } | null;
  visiteVue: boolean;
  progression: LigneProgression[];
  /** les contrats du jour déjà tirés (vide : à tirer) */
  contrats: ContratTire[];
  /** pas encore de ligne codex_joueur : ce qui se valide est rétroactif */
  premier: boolean;
  dernierCalcul: Date | null;
  lecture: LectureSql;
  /** matière de la dernière séance (continuité) */
  derniereMatiere?: string | null;
  /** points faibles, du plus net au moins net (notion, score 0–100) */
  pointsFaibles?: { notion: string; score: number }[];
};

// ── Petits outils ──────────────────────────────────────────────────────

const clePeriode = (id: string, periode: string) => `${id}|${periode}`;
export const lundiDe = (jour: string) => {
  const d = new Date(jour + "T12:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // lundi = 0
  return decaleJour(jour, -dow);
};
/** La période d'une instance : '' (unique), le lundi (hebdo) ou le jour (quotidienne). */
export const periodeDe = (q: Pick<Quete, "repetition">, jour: string) => (q.repetition === "unique" ? "" : q.repetition === "hebdomadaire" ? lundiDe(jour) : jour);

const clamp01 = (x: number) => (Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0);

/** Joursavant l'examen (négatif : passé) ; null sans jour J. */
export const joursAvantExamen = (jour: string, jourJ: string | null) => (jourJ ? joursEntre(jour, jourJ) : null);

// ── L'évaluation d'un objectif ─────────────────────────────────────────

/** Résultat d'un objectif : fait ou non, avancée (valeur / cible), date d'atteinte si on la connaît. */
export type Ev = { fait: boolean; valeur: number; cible: number; atteint: Date | null; inconnu?: boolean };

type Contexte = {
  e: Entree;
  contenu: ContenuMatiere[];
  /** compteur : renvoie sa réponse (passe 2) ou la collecte (passe 1) */
  compteur: (d: Omit<Demande, "id">) => ResultatCompteur;
  /** les quêtes terminées pendant la cascade */
  faites: Set<string>;
  catalogue: Quete[];
  /** instance évaluée : sa période et son départ (fenêtre depuisOuverture) */
  periode: string;
  ouverteLe: Date | null;
  params: Record<string, string | undefined>;
};

const dateOu = (s: string | null | undefined) => (s ? new Date(s) : null);
const dmax = (a: (Date | null)[]) => (a.some((x) => !x) ? null : new Date(Math.max(...a.map((x) => x!.getTime()))));
const dmin = (a: (Date | null)[]) => {
  const l = a.filter((x): x is Date => !!x);
  return l.length ? new Date(Math.min(...l.map((x) => x.getTime()))) : null;
};

/** Remplace {param:…} par la valeur du contrat dans un filtre. */
function resoudreFiltre(f: Record<string, Comparaison> | FiltreMesure | undefined, params: Contexte["params"]): Record<string, unknown> | undefined {
  if (!f) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) {
    if (v && typeof v === "object" && !Array.isArray(v) && "param" in v) {
      const p = params[(v as { param: string }).param];
      if (p === undefined) return { __indisponible: true };
      out[k] = p;
    } else out[k] = v;
  }
  return out;
}

function fenetreDe(f: Fenetre | undefined, c: Contexte): unknown {
  if (f === "depuisOuverture") return { depuis: (c.ouverteLe ?? c.e.now).toISOString() };
  return f ?? "toujours";
}

const jourDemande = (c: Contexte) => (c.periode ? c.periode : c.e.jour);

function compteurObjectif(o: Extract<Objectif, { k: "compteur" }>, c: Contexte): Ev {
  const filtre = resoudreFiltre(o.filtre as Record<string, Comparaison> | undefined, c.params);
  if (filtre && "__indisponible" in filtre) return { fait: false, valeur: 0, cible: o.seuil, atteint: null, inconnu: true };
  const r = c.compteur({
    evenement: o.evenement,
    ...(filtre ? { filtre } : {}),
    fenetre: fenetreDe(o.fenetre, c),
    jour: jourDemande(c),
    ...(o.distinct ? { distinct: o.distinct } : {}),
    ...(o.somme ? { somme: o.somme } : {}),
    seuil: o.seuil,
  });
  return { fait: r.n >= o.seuil, valeur: Math.min(r.n, o.seuil), cible: o.seuil, atteint: r.n >= o.seuil ? dateOu(r.atteint) : null };
}

/** Un compteur déguisé en mesure (questions, duels, amis…). */
function mesureCompteur(c: Contexte, evenement: TypeEvenement, seuil: number, filtre?: Record<string, unknown>): Ev {
  const r = c.compteur({ evenement, ...(filtre ? { filtre } : {}), fenetre: "toujours", seuil });
  return { fait: r.n >= seuil, valeur: Math.min(r.n, seuil), cible: seuil, atteint: r.n >= seuil ? dateOu(r.atteint) : null };
}

/** La part des notions de ces matières vues (≥ 5 réponses chacune). */
function notionsVues(c: Contexte, matiere?: string) {
  const comptes = c.e.lecture.mesures.notions ?? {};
  const cles = matiere ? [matiere] : c.contenu.map((m) => m.key);
  let total = 0;
  let vues = 0;
  for (const k of cles) {
    for (const n of notionsDeMatiere(k)) {
      total++;
      if ((comptes[n.id] ?? 0) >= 5) vues++;
    }
  }
  return { total, vues };
}

/** Maîtrise d'une matière, 0 si elle n'est pas encore mesurée (40 questions, comme les sceaux). */
export const MAITRISE_MIN = 40;
export const maitriseDe = (e: Pick<Entree, "lecture">, matiere: string) => {
  const m = e.lecture.mesures.maitrise?.[matiere];
  return m && m.questions >= MAITRISE_MIN ? m.pct : null;
};
export const maitriseProgramme = (e: Pick<Entree, "lecture">, contenu: ContenuMatiere[]) =>
  contenu.length ? Math.round(contenu.reduce((s, m) => s + (maitriseDe(e, m.key) ?? 0), 0) / contenu.length) : 0;

/** Semaines (lun.–dim.) avec au moins n jours d'encre. */
function semainesActives(jours: { jour: string; n: number }[], n: number) {
  const parSemaine = new Map<string, number>();
  for (const j of jours) {
    if (j.n < 10) continue;
    const lundi = lundiDe(String(j.jour).slice(0, 10));
    parSemaine.set(lundi, (parSemaine.get(lundi) ?? 0) + 1);
  }
  return [...parSemaine.values()].filter((x) => x >= n).length;
}

/** Semaines complètes (lun.–dim.) où le rythme vers l'objectif a été tenu. */
function semainesAuRythme(e: Entree) {
  if (!e.objectif || !e.jourJ) return 0;
  const jours = (e.lecture.mesures.jours ?? []).map((j) => ({ jour: String(j.jour).slice(0, 10), n: j.n }));
  const base = jours.filter((j) => j.jour < e.objectif!.depuis).reduce((s, j) => s + j.n, 0);
  const span = Math.max(1, joursEntre(e.objectif.depuis, e.jourJ));
  const parSemaine = Math.max(1, ((e.objectif.total - base) / span) * 7);
  const parLundi = new Map<string, number>();
  for (const j of jours) parLundi.set(lundiDe(j.jour), (parLundi.get(lundiDe(j.jour)) ?? 0) + j.n);
  let tenues = 0;
  for (let lundi = lundiDe(e.objectif.depuis); decaleJour(lundi, 6) < e.jour; lundi = decaleJour(lundi, 7)) {
    if (lundi < e.objectif.depuis && decaleJour(lundi, 6) < e.objectif.depuis) continue;
    if ((parLundi.get(lundi) ?? 0) >= parSemaine) tenues++;
  }
  return tenues;
}

function mesureObjectif(o: Extract<Objectif, { k: "mesure" }>, c: Contexte): Ev {
  const f = (resoudreFiltre(o.filtre, c.params) ?? {}) as FiltreMesure & { __indisponible?: boolean };
  const M = c.e.lecture.mesures;
  const sens = o.sens ?? ">=";
  const seuil = o.seuil;
  const fini = (valeur: number | null, atteint: Date | null = null): Ev => {
    if (valeur === null) return { fait: false, valeur: 0, cible: seuil, atteint: null, inconnu: true };
    const fait = sens === ">=" ? valeur >= seuil : valeur <= seuil;
    return { fait, valeur: sens === ">=" ? Math.min(valeur, seuil) : valeur, cible: seuil, atteint: fait ? atteint : null };
  };
  if (f.__indisponible) return fini(null);
  const matieres = c.contenu.map((m) => m.key);
  switch (o.mesure) {
    case "maitrise": return fini(f.matiere ? (maitriseDe(c.e, f.matiere as string) ?? 0) : null);
    case "maitrise_programme": return fini(maitriseProgramme(c.e, c.contenu));
    case "matieres_au_dessus": return fini(matieres.filter((k) => (maitriseDe(c.e, k) ?? 0) >= (f.pct ?? 0)).length);
    case "notions_vues": return fini(notionsVues(c, f.matiere as string | undefined).vues);
    case "notions_vues_pct": {
      const { total, vues } = notionsVues(c, f.matiere as string | undefined);
      return fini(total ? Math.floor((100 * vues) / total) : 0);
    }
    case "drill_pages_restantes": {
      const m = f.matiere as string | undefined;
      const total = m ? M.drill_totaux?.[m] : Object.values(M.drill_totaux ?? {}).reduce((s, x) => s + x, 0);
      if (total === undefined) return fini(null);
      const passees = (M.drill_pages ?? []).filter((p) => !m || p.matiere === m).length;
      return fini(Math.max(0, total - passees));
    }
    case "drill_pages_reussies": {
      const m = f.matiere as string | undefined;
      return fini((M.drill_pages ?? []).filter((p) => (!m || p.matiere === m) && p.meilleur >= (f.pct ?? 0)).length);
    }
    case "elo": return fini(M.elo ?? DEFAULT_ELO);
    case "pic_palier": {
      const elo = Math.max(M.elo ?? DEFAULT_ELO, M.pic_elo ?? 0);
      return fini(rankFor(elo, maitriseProgramme(c.e, c.contenu), null).tierIndex);
    }
    case "niveau": return fini(levelInfoFromXp(M.xp_total ?? 0).level);
    case "serie": return fini(M.serie ?? 0);
    case "meilleure_serie": return fini(M.meilleure_serie ?? 0);
    case "ratures_ouvertes": {
      if (!M.ratures_ouvertes) return fini(null);
      return fini(f.matiere ? (M.ratures_ouvertes.matieres[f.matiere as string] ?? 0) : M.ratures_ouvertes.total);
    }
    case "ratures_rayees": return mesureCompteur(c, "rature_rayee", seuil);
    case "semaines_actives": return fini(semainesActives(M.jours ?? [], f.n ?? 4));
    case "semaines_objectif_tenu": return fini(semainesAuRythme(c.e));
    case "rappels_espaces": return mesureCompteur(c, "question_repondue", seuil, { juste: true, ecartJours: { min: f.n ?? 7 } });
    case "matieres_remontees": {
      const n = f.n ?? 10;
      return fini(matieres.filter((k) => {
        const m = M.maitrise?.[k];
        return !!m && m.questions >= MAITRISE_MIN && m.debut !== null && m.pct - m.debut >= n;
      }).length);
    }
    case "types_calcul_tenus": return fini(M.types_calcul_tenus ?? 0);
    case "examens_blancs_au_dessus": return mesureCompteur(c, "examen_blanc_rendu", seuil, { pct: { min: f.pct ?? 0 }, ...(f.questions ? { questions: { min: f.questions } } : {}) });
    case "sceau": return fini(f.cle ? (M.sceaux?.[f.cle] ?? 0) : null);
    case "jour_j_fixe": return fini(c.e.jourJ ? 1 : 0);
    case "visite_vue": return fini(c.e.visiteVue ? 1 : 0);
    case "questions_total": return mesureCompteur(c, "question_repondue", seuil);
    case "duels_joues": return mesureCompteur(c, "duel_termine", seuil);
    case "amis": return mesureCompteur(c, "ami_ajoute", seuil);
    case "quetes_terminees": {
      const faites = c.catalogue.filter((q) => c.faites.has(clePeriode(q.id, "")) && q.famille !== "contrat" && (!f.famille || q.famille === f.famille) && (!f.chaine || q.chaine === f.chaine));
      return fini(faites.length);
    }
    case "branches_etape": return fini(branchesFaites(c, f.etape as EtapeBranche).faites);
    case "branches_etape_pct": {
      const { faites, total } = branchesFaites(c, f.etape as EtapeBranche);
      return fini(total ? Math.floor((100 * faites) / total) : 100);
    }
  }
}

/** Branches (matières) qui ont passé une étape ; une branche sans cette étape compte pour faite. */
function branchesFaites(c: Contexte, etape: EtapeBranche) {
  let faites = 0;
  for (const m of c.contenu) {
    const id = `branche:${m.key}:${etape}`;
    const existe = c.catalogue.some((q) => q.id === id);
    if (!existe || c.faites.has(clePeriode(id, ""))) faites++;
  }
  return { faites, total: c.contenu.length };
}

export function evalObjectif(o: Objectif, c: Contexte): Ev {
  switch (o.k) {
    case "compteur": return compteurObjectif(o, c);
    case "mesure": return mesureObjectif(o, c);
    case "special": {
      const v = c.e.lecture.speciaux[o.cle];
      const seuil = o.seuil ?? 1;
      if (v === undefined) return { fait: false, valeur: 0, cible: seuil, atteint: null, inconnu: true };
      return { fait: v >= seuil, valeur: Math.min(v, seuil), cible: seuil, atteint: null };
    }
    case "tous": {
      const l = o.objectifs.map((x) => evalObjectif(x, c));
      const fait = l.every((x) => x.fait);
      return { fait, valeur: l.reduce((s, x) => s + clamp01(x.valeur / (x.cible || 1)), 0), cible: l.length, atteint: fait ? dmax(l.map((x) => x.atteint)) : null, inconnu: l.some((x) => x.inconnu) };
    }
    case "unDe": {
      const l = o.objectifs.map((x) => evalObjectif(x, c));
      const fait = l.some((x) => x.fait);
      return { fait, valeur: Math.max(0, ...l.map((x) => clamp01(x.valeur / (x.cible || 1)))), cible: 1, atteint: fait ? dmin(l.filter((x) => x.fait).map((x) => x.atteint)) : null, inconnu: l.every((x) => x.inconnu) };
    }
  }
}

// ── Les contrats du jour : choix, paramètres, instances ───────────────

/** Une graine stable (joueur + jour) : un petit générateur mulberry32. */
export function graine(s: string) {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = (h ^ (h >>> 16)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const EMPLACEMENTS: Emplacement[] = ["faiblesse", "entretien", "variete"];
export const BUDGET_TRIO = 45;

const modeleParId = (id: string) => MODELES_CONTRATS.find((m) => m.id === id) ?? null;

/** Le titre ou la consigne d'un modèle avec ses paramètres. */
export function libelle(texte: string, params: ContratTire["params"], contenu: ContenuMatiere[] = contenuDuProgramme()) {
  const mat = contenu.find((m) => m.key === params.matiere);
  const notion = notionParId(params.notion);
  const fiche = contenu.find((m) => m.fiche === params.fiche);
  return texte
    .replaceAll("{matiere}", mat?.nom ?? params.matiere ?? "")
    .replaceAll("{notion}", notion?.court ?? params.notion ?? "")
    .replaceAll("{fiche}", fiche?.court ?? params.fiche ?? "");
}

/** Une instance de contrat : la quête du jour (id contrat:<modèle>:<jour>), objectifs et paramètres résolus. */
export function instanceContrat(m: ModeleContrat, params: ContratTire["params"], jour: string, contenu: ContenuMatiere[]): Quete {
  return {
    id: `contrat:${m.id}:${jour}`,
    famille: "contrat",
    programme: PROGRAMME,
    titre: libelle(m.titre, params, contenu),
    consigne: libelle(m.consigne, params, contenu),
    objectif: m.objectif,
    prerequis: [],
    recompense: { xp: XP.contrat },
    repetition: "quotidienne",
    visibilite: "visible",
    duree: m.duree,
    ...(m.lien ? { lien: m.lien } : {}),
    ...(params.matiere ? { matiere: params.matiere } : {}),
    ordre: 1000 + EMPLACEMENTS.indexOf(m.emplacement),
  };
}

export type Instance = { quete: Quete; periode: string; params: ContratTire["params"]; emplacement?: Emplacement };

/**
 * Tire les 3 contrats du jour : un par emplacement, pondérés par la phase,
 * sans répéter le modèle de la veille, dans le budget de 45 minutes. Pure et
 * déterministe (graine = joueur + jour) ; la base garde le premier tirage
 * (codex_contrats_poser).
 */
export function tirerContrats(e: Entree, joueur: string, hier: Partial<Record<Emplacement, string>> = {}): ContratTire[] {
  const contenu = e.contenu ?? contenuDuProgramme();
  const rnd = graine(`${joueur}:${e.jour}`);
  const phase = phaseDe(joursAvantExamen(e.jour, e.jourJ));
  const M = e.lecture.mesures;
  // paramètres : matière la plus à risque (poids × (1 − maîtrise), inconnue = 0,2), notion la plus faible, fiche de la matière
  const risque = contenu
    .map((m) => ({ m, r: m.poids * (1 - (maitriseDe(e, m.key) ?? 20) / 100) }))
    .sort((a, b) => b.r - a.r);
  const matiere = risque[0]?.m.key;
  const avecDrill = risque.find((x) => x.m.fiche && x.m.drill)?.m;
  const notion = e.pointsFaibles?.[0]?.notion;
  // matière « oubliée » : la plus lourde parmi les moins travaillées (pas de date de dernière activité : les moins mesurées d'abord)
  const oubliee = [...contenu].sort((a, b) => (M.maitrise?.[a.key]?.questions ?? 0) - (M.maitrise?.[b.key]?.questions ?? 0) || b.poids - a.poids)[0]?.key;
  const sources = (m: ModeleContrat): ContratTire["params"] | null => {
    const p: ContratTire["params"] = {};
    for (const nom of m.params) {
      const v = nom === "notion" ? notion : nom === "fiche" ? avecDrill?.fiche : m.id === "matiere-oubliee" ? oubliee : matiere;
      if (!v) return null;
      p[nom] = v;
    }
    return p;
  };
  const eligible = (m: ModeleContrat) => {
    if (!evenementsDe(m.objectif).every((ev) => queteBrancheeEv(ev))) return false;
    if (m.poids[phase] <= 0) return false;
    return m.eligible.every((x) => eligibleMesure(x, e));
  };
  const choisis: ContratTire[] = [];
  let duree = 0;
  EMPLACEMENTS.forEach((emp, i) => {
    let pool = MODELES_CONTRATS.filter((m) => m.emplacement === emp && eligible(m) && sources(m) && m.id !== hier[emp]);
    if (!pool.length) pool = MODELES_CONTRATS.filter((m) => m.emplacement === emp && eligible(m) && sources(m));
    const restant = BUDGET_TRIO - duree - (EMPLACEMENTS.length - 1 - i) * 5;
    const tenables = pool.filter((m) => m.duree <= restant);
    if (tenables.length) pool = tenables;
    else if (pool.length) pool = [pool.reduce((a, b) => (b.duree < a.duree ? b : a))];
    const total = pool.reduce((s, m) => s + m.poids[phase], 0);
    if (!pool.length || total <= 0) return;
    let t = rnd() * total;
    const m = pool.find((x) => (t -= x.poids[phase]) <= 0) ?? pool[pool.length - 1];
    duree += m.duree;
    choisis.push({ emplacement: emp, modele: m.id, params: sources(m)!, change: false });
  });
  return choisis;
}

/** Un autre modèle pour un emplacement (le changement du jour) : tiré hors du modèle actuel. */
export function remplacantContrat(e: Entree, joueur: string, emplacement: Emplacement, actuel: string): ContratTire | null {
  const t = tirerContrats(e, joueur + ":autre:" + actuel, { [emplacement]: actuel }).find((c) => c.emplacement === emplacement);
  return t && t.modele !== actuel ? { ...t, change: true } : null;
}

/** Une condition de tirage (ObjectifMesure) lue sur les mesures de la base. */
function eligibleMesure(x: Extract<Objectif, { k: "mesure" }>, e: Entree): boolean {
  const M = e.lecture.mesures;
  const v = x.mesure === "ratures_ouvertes" ? (M.ratures_ouvertes?.total ?? 0) : x.mesure === "questions_total" ? (M.jours ?? []).reduce((s, j) => s + j.n, 0) : 0;
  return (x.sens ?? ">=") === ">=" ? v >= x.seuil : v <= x.seuil;
}

const queteBrancheeEv = (ev: TypeEvenement) => queteBranchee({ objectif: { k: "compteur", evenement: ev, seuil: 1 } as Objectif });

// ── Le contexte d'évaluation ───────────────────────────────────────────

function contexteBlanc(e: Entree, contenu: ContenuMatiere[], compteur: Contexte["compteur"], catalogue: Quete[] = []): Contexte {
  return { e, contenu, compteur, faites: new Set(), catalogue, periode: "", ouverteLe: null, params: {} };
}

// ── L'état d'une quête ─────────────────────────────────────────────────

export type EtatQuete = {
  quete: Quete;
  periode: string;
  /** les prérequis sont remplis */
  ouverte: boolean;
  ouverteLe: Date | null;
  fait: boolean;
  atteint: Date | null;
  ev: Ev | null;
  /** la ligne de la base, si elle existe */
  ligne: LigneProgression | null;
  /** validée d'après l'historique (rétroactive) */
  retro: boolean;
  /** hors-ligne : pas encore branchée en base ou retirée */
  masquee: boolean;
};

export type ItemEcriture = {
  quete: string;
  periode: string;
  famille: "trame" | "branche" | "longcours" | "contrat" | "exploit" | "acte";
  etat: "disponible" | "active" | "terminee";
  progression?: number;
  cible?: number;
  atteint?: string;
  retro?: boolean;
  xp?: number;
  plafond?: number;
  cosmetique?: string;
  titre?: string;
};

export type Resultat = {
  etats: EtatQuete[];
  /** ce qu'il faut écrire (codex_ecrire) */
  lot: ItemEcriture[];
  budgetRetro: number;
  niveau: number;
  phase: Phase;
  /** actes clos (ids) */
  actesClos: string[];
  /** l'acte en cours : le premier non clos, dans l'ordre */
  acteCourant: Acte | null;
  /** les contrats du jour (instances) et leur état */
  contrats: Instance[];
  trioFait: boolean;
};

const ordreFamille = { trame: 0, branche: 1, longcours: 2, contrat: 3, exploit: 4 } as const;

/** Les quêtes à suivre : catalogue branché et non retiré, plus les instances du jour. */
export function quetesASuivre(e: Entree, contenu: ContenuMatiere[]): { catalogue: Quete[]; instances: Instance[] } {
  const catalogue = e.catalogue ?? catalogueCodex(contenu);
  const instances: Instance[] = [];
  for (const q of catalogue) {
    if (q.retiree || !queteBranchee(q)) continue;
    instances.push({ quete: q, periode: periodeDe(q, e.jour), params: {} });
  }
  for (const c of e.contrats) {
    const m = modeleParId(c.modele);
    if (!m || !evenementsDe(m.objectif).every(queteBrancheeEv)) continue;
    instances.push({ quete: instanceContrat(m, c.params, e.jour, contenu), periode: e.jour, params: c.params, emplacement: c.emplacement });
  }
  return { catalogue, instances };
}

/**
 * Passe 1 : toutes les demandes à envoyer à codex_lire. Les quêtes sont
 * évaluées à blanc (rien n'est fait), sans cascade : on veut les compteurs de
 * TOUTES les quêtes, y compris celles dont les prérequis ne sont pas encore
 * remplis (l'historique peut déjà les remplir).
 */
export function planifier(e: Entree): Demande[] {
  const contenu = e.contenu ?? contenuDuProgramme();
  const { catalogue, instances } = quetesASuivre(e, contenu);
  const demandes = new Map<string, Demande>();
  const collecte: Contexte["compteur"] = (d) => {
    const cle = JSON.stringify([d.evenement, d.filtre ?? null, d.fenetre ?? null, d.jour ?? null, d.distinct ?? null, d.somme ?? null, d.seuil]);
    if (!demandes.has(cle)) demandes.set(cle, { id: "d" + demandes.size, ...d });
    return { n: 0, atteint: null };
  };
  const lignes = new Map(e.progression.map((l) => [clePeriode(l.quete_id, l.periode), l]));
  for (const { quete, periode, params } of instances) {
    const l = lignes.get(clePeriode(quete.id, periode));
    evalObjectif(quete.objectif, { ...contexteBlanc(e, contenu, collecte, catalogue), periode, ouverteLe: dateOu(l?.ouverte_le), params });
  }
  return [...demandes.values()];
}

/** Indexe les réponses de codex_lire par la clé d'une demande (même construction que planifier). */
export function indexerLecture(demandes: Demande[], brut: LectureSql): Record<string, ResultatCompteur> {
  const out: Record<string, ResultatCompteur> = {};
  for (const d of demandes) {
    const cle = JSON.stringify([d.evenement, d.filtre ?? null, d.fenetre ?? null, d.jour ?? null, d.distinct ?? null, d.somme ?? null, d.seuil]);
    out[cle] = brut.compteurs[d.id] ?? { n: 0, atteint: null };
  }
  return out;
}

function prerequisOk(p: Prerequis, c: Contexte, actesClos: Set<string>): boolean {
  switch (p.k) {
    case "quete": {
      const q = c.catalogue.find((x) => x.id === p.id);
      // une quête retirée ou pas encore branchée ne bloque jamais
      if (!q || q.retiree || !queteBranchee(q)) return true;
      return c.faites.has(clePeriode(p.id, ""));
    }
    case "acte": return actesClos.has(p.id);
    case "toutesBranches": {
      const { faites, total } = branchesFaites(c, p.etape);
      return faites >= total;
    }
    case "branches": return branchesFaites(c, p.etape).faites >= p.n;
    case "joursAvantExamen": {
      const j = joursAvantExamen(c.e.jour, c.e.jourJ);
      return j !== null && j <= p.max && j >= (p.min ?? 0);
    }
    case "unDe": return p.prerequis.some((x) => prerequisOk(x, c, actesClos));
  }
}

/**
 * Passe 2 : la cascade. `compteurs` : codex_lire indexé (indexerLecture).
 * Rend les états, ce qu'il faut écrire, la phase, les actes clos.
 */
export function evaluer(e: Entree, compteurs: Record<string, ResultatCompteur>): Resultat {
  const contenu = e.contenu ?? contenuDuProgramme();
  const { catalogue, instances } = quetesASuivre(e, contenu);
  const lignes = new Map(e.progression.map((l) => [clePeriode(l.quete_id, l.periode), l]));
  const niveau = levelInfoFromXp(e.lecture.mesures.xp_total ?? 0).level;
  const phase = phaseDe(joursAvantExamen(e.jour, e.jourJ));
  const resolveur: Contexte["compteur"] = (d) => {
    const cle = JSON.stringify([d.evenement, d.filtre ?? null, d.fenetre ?? null, d.jour ?? null, d.distinct ?? null, d.somme ?? null, d.seuil]);
    return compteurs[cle] ?? { n: 0, atteint: null };
  };
  const ctx = contexteBlanc(e, contenu, resolveur, catalogue);
  const etats = new Map<string, EtatQuete>();
  for (const { quete, periode } of instances) {
    const l = lignes.get(clePeriode(quete.id, periode)) ?? null;
    const recompensee = l?.etat === "recompensee" || l?.etat === "terminee";
    etats.set(clePeriode(quete.id, periode), {
      quete, periode,
      ouverte: !!l && l.etat !== "verrouillee",
      ouverteLe: l ? new Date(l.ouverte_le) : null,
      fait: recompensee,
      atteint: recompensee ? dateOu(l!.terminee_le) : null,
      ev: null, ligne: l, retro: !!l?.retro, masquee: false,
    });
    if (recompensee) ctx.faites.add(clePeriode(quete.id, periode));
  }
  const actesClos = new Set<string>();
  const lignesActes = new Map(e.progression.filter((l) => l.quete_id.startsWith("acte:")).map((l) => [l.quete_id.slice(5), l]));
  for (const [id, l] of lignesActes) if (l.etat === "recompensee" || l.etat === "terminee") actesClos.add(id);
  const actesFaits = new Map<string, Date | null>([...actesClos].map((id) => [id, dateOu(lignesActes.get(id)!.terminee_le)]));

  const tri = [...etats.values()].sort((a, b) => (ordreFamille[a.quete.famille as keyof typeof ordreFamille] ?? 9) - (ordreFamille[b.quete.famille as keyof typeof ordreFamille] ?? 9) || a.quete.ordre - b.quete.ordre);
  // la cascade : jusqu'à ce que plus rien ne change
  for (let tour = 0, change = true; change && tour < 60; tour++) {
    change = false;
    for (const st of tri) {
      if (st.fait) continue;
      const q = st.quete;
      const c: Contexte = { ...ctx, periode: st.periode, ouverteLe: st.ouverteLe ?? e.now, params: parametresDe(e, st) };
      if (!st.ouverte && q.prerequis.every((p) => prerequisOk(p, c, actesClos))) {
        st.ouverte = true;
        st.ouverteLe = e.now;
        change = true;
      }
      if (!st.ouverte) continue;
      st.ev = evalObjectif(q.objectif, c);
      if (st.ev.fait) {
        st.fait = true;
        st.atteint = st.ev.atteint;
        ctx.faites.add(clePeriode(q.id, st.periode));
        change = true;
      }
    }
    for (const a of ACTES) {
      if (actesClos.has(a.id)) continue;
      const dedans = tri.filter((s) => s.quete.acte === a.id && !s.quete.optionnelle);
      if (dedans.length && dedans.every((s) => s.fait)) {
        actesClos.add(a.id);
        actesFaits.set(a.id, dmax(dedans.map((s) => s.atteint ?? e.now)));
        change = true;
      }
    }
  }

  // l'écriture
  const lot: ItemEcriture[] = [];
  const plafond = plafondQuete(niveau);
  const retroDe = (atteint: Date | null) => e.premier || (!!atteint && !!e.dernierCalcul && atteint.getTime() < e.dernierCalcul.getTime());
  for (const st of tri) {
    const q = st.quete;
    const base = { quete: q.id, periode: st.periode, famille: q.famille as ItemEcriture["famille"] };
    if (st.fait && !(st.ligne && (st.ligne.etat === "recompensee" || st.ligne.etat === "terminee"))) {
      const retro = q.repetition === "unique" && !usesDepuisOuverture(q.objectif) && retroDe(st.atteint);
      st.retro = retro;
      lot.push({ ...base, etat: "terminee", cible: st.ev?.cible ?? 1, retro, xp: q.recompense.xp, plafond, ...(st.atteint ? { atteint: st.atteint.toISOString() } : {}), ...(q.recompense.cosmetique ? { cosmetique: q.recompense.cosmetique } : {}), ...(q.recompense.titre ? { titre: q.recompense.titre } : {}) });
    } else if (!st.fait && st.ouverte) {
      const v = st.ev ? st.ev.valeur : 0;
      const etat = v > 0 ? "active" : "disponible";
      const l = st.ligne;
      if (!l || l.etat !== etat || Math.abs(Number(l.progression) - v) > 1e-9) lot.push({ ...base, etat, progression: v, cible: st.ev?.cible ?? 1 });
    }
  }
  for (const a of ACTES) {
    if (!actesClos.has(a.id) || lignesActes.has(a.id)) continue;
    const atteint = actesFaits.get(a.id) ?? null;
    const retro = retroDe(atteint) && a.id !== "epilogue";
    lot.push({ quete: `acte:${a.id}`, periode: "", famille: "acte", etat: "terminee", cible: 1, retro, xp: a.recompense.xp, plafond, ...(atteint ? { atteint: atteint.toISOString() } : {}), ...(a.recompense.cosmetique ? { cosmetique: a.recompense.cosmetique } : {}), ...(a.recompense.titre ? { titre: a.recompense.titre } : {}) });
  }
  // le trio du jour
  const dujour = tri.filter((s) => s.quete.famille === "contrat" && s.quete.repetition === "quotidienne" && s.periode === e.jour);
  const trioFait = dujour.length === EMPLACEMENTS.length && dujour.every((s) => s.fait);
  if (trioFait && !lignes.has(clePeriode(`contrat:trio:${e.jour}`, e.jour))) {
    lot.push({ quete: `contrat:trio:${e.jour}`, periode: e.jour, famille: "contrat", etat: "terminee", cible: 3, retro: false, xp: XP.contratTrio, plafond });
  }
  return {
    etats: [...etats.values()],
    lot,
    budgetRetro: plafondRetro(niveau),
    niveau,
    phase,
    actesClos: [...actesClos],
    acteCourant: ACTES.find((a) => !actesClos.has(a.id) && a.id !== "epilogue") ?? null,
    contrats: instances.filter((i) => i.quete.famille === "contrat" && i.quete.repetition === "quotidienne"),
    trioFait,
  };
}

/** Pas de rétroactivité pour une fenêtre « depuisOuverture » (le départ est l'ouverture). */
function usesDepuisOuverture(o: Objectif): boolean {
  if (o.k === "compteur") return o.fenetre === "depuisOuverture";
  if (o.k === "tous" || o.k === "unDe") return o.objectifs.some(usesDepuisOuverture);
  return false;
}

/** Les paramètres d'une instance de contrat (vide pour les autres). */
function parametresDe(e: Entree, st: Pick<EtatQuete, "quete" | "periode">): Contexte["params"] {
  if (st.quete.famille !== "contrat" || st.quete.repetition !== "quotidienne") return {};
  const m = /^contrat:(.+):(\d{4}-\d{2}-\d{2})$/.exec(st.quete.id);
  return e.contrats.find((c) => c.modele === m?.[1])?.params ?? {};
}

// ── La prochaine quête ─────────────────────────────────────────────────

export type Recommandation = {
  quete: Quete;
  periode: string;
  score: number;
  /** une ligne : « FSA pèse 12,5 % de l'examen et tu es à 48 % » */
  pourquoi: string;
  /** progression (0–1) si la quête est entamée */
  avancee: number;
};

const virgule = (n: number) => String(n).replace(".", ",");
const ETAPES_AVANT_JALON: EtapeBranche[] = ["entree", "cours", "fiche", "drill", "flashcards", "ciblee", "tour"];

/**
 * LA prochaine quête (CONCEPTION.md §10) : avant tout le prologue, dans
 * l'ordre ; sinon la quête ouverte au meilleur score = importance (poids de la
 * matière à l'examen) × faiblesse × urgence (phase, axe, acte en cours) ×
 * continuité (entamée, même matière) × durée. Les exploits ne sont jamais
 * recommandés ; les quêtes cachées non plus.
 */
export function recommander(e: Entree, r: Resultat): Recommandation | null {
  const contenu = e.contenu ?? contenuDuProgramme();
  const R = RECOMMANDATION;
  const ouvertes = r.etats.filter((s) => s.ouverte && !s.fait && s.quete.famille !== "exploit" && s.quete.visibilite !== "cachee" && s.quete.visibilite !== "indice" && !s.quete.optionnelle);
  const prologue = ouvertes.filter((s) => s.quete.acte === "prologue").sort((a, b) => a.quete.ordre - b.quete.ordre);
  const dernier = (s: EtatQuete): Recommandation => ({ quete: s.quete, periode: s.periode, score: 1000, pourquoi: s.quete.pourquoi ?? ACTES.find((a) => a.id === s.quete.acte)?.but ?? s.quete.consigne, avancee: avanceeDe(s) });
  if (prologue.length) return dernier(prologue[0]);
  const joursAvant = joursAvantExamen(e.jour, e.jourJ);
  const aucuneAvance = (m: ContenuMatiere | undefined) => (m ? maitriseDe(e, m.key) : null);
  let meilleur: Recommandation | null = null;
  for (const s of ouvertes) {
    const q = s.quete;
    const cle = q.matiere ?? (q.famille === "contrat" ? parametresDe(e, s).matiere : undefined);
    const m = contenu.find((x) => x.key === cle);
    const importance = m ? m.poids / R.poidsMax : R.importanceSansMatiere;
    const mai = aucuneAvance(m);
    const faiblesse = m ? (mai === null ? R.faiblesseInconnue : 1 - mai / 100) : 0.7;
    let urgence = 1;
    const chaine = q.chaine ? ChainesAxe.get(q.chaine) : undefined;
    if (chaine) urgence = R.urgence[r.phase][chaine];
    if (q.famille === "trame" && q.acte === r.acteCourant?.id) urgence = R.acteCourant;
    if (q.famille === "branche" && q.etape) {
      if (r.phase === "fondations" && ETAPES_AVANT_JALON.includes(q.etape)) urgence = 1.2;
      if ((r.phase === "repetition" || r.phase === "veillee") && ["maitrise60", "maitrise75", "maitre"].includes(q.etape)) urgence = 1.2;
    }
    const av = avanceeDe(s);
    let continuite = av >= 0.5 ? R.continuiteMoitie : av > 0 ? R.continuite : 1;
    if (e.derniereMatiere && cle === e.derniereMatiere) continuite *= R.memeMatiere;
    const duree = (q.duree ?? 20) <= R.dureeCible ? 1 : R.horsDuree;
    const score = 100 * importance * faiblesse * urgence * continuite * duree;
    if (!meilleur || score > meilleur.score) {
      let pourquoi: string;
      if (m && mai !== null) pourquoi = `${m.court} pèse ${virgule(m.poids)} % de l'examen et tu es à ${mai} %.`;
      else if (m) pourquoi = `${m.court} pèse ${virgule(m.poids)} % de l'examen et tu n'y as pas encore de mesure.`;
      else if (chaine && q.chaine) pourquoi = CHAINES_POURQUOI.get(q.chaine) ?? q.pourquoi ?? q.consigne;
      else pourquoi = q.pourquoi ?? q.consigne;
      if (joursAvant !== null && joursAvant >= 0 && joursAvant <= 30 && q.chaine) pourquoi += ` Plus que ${joursAvant} jours.`;
      meilleur = { quete: q, periode: s.periode, score, pourquoi, avancee: av };
    }
  }
  return meilleur;
}

const ChainesAxe = new Map(CHAINES.map((c) => [c.id, c.axe]));
const CHAINES_POURQUOI = new Map(CHAINES.map((c) => [c.id, c.pourquoi]));

function avanceeDe(s: EtatQuete): number {
  if (s.ev && s.ev.cible) return clamp01(s.ev.valeur / s.ev.cible);
  if (s.ligne && s.ligne.cible) return clamp01(Number(s.ligne.progression) / s.ligne.cible);
  return 0;
}

/** Une quête affichée : complète, verrouillée (on voit le chemin), énigme ou cachée. */
export function affichage(s: Pick<EtatQuete, "quete" | "ouverte" | "fait">): "complet" | "verrouille" | "indice" | "cache" {
  if (s.fait) return "complet";
  switch (s.quete.visibilite) {
    case "visible": return s.ouverte ? "complet" : "verrouille";
    case "ouverte": return s.ouverte ? "complet" : "cache";
    case "indice": return "indice";
    case "cachee": return "cache";
  }
}

// ── Le dévoilement progressif ──────────────────────────────────────────

/** Les comptes inscrits avant ce moment voient tout dès le premier jour (à régler au déploiement). */
export const LANCEMENT_CODEX = "2026-10-16T00:00:00+02:00";
/** Au-delà de ce nombre de questions, un compte voit tout. */
export const QUESTIONS_COMPTE_ANCIEN = 50;

/** user_metadata.rl_codex */
export type MetaCodex = { devoile: string[] | "tout"; jours: string[] };

export const META_CODEX_VIDE: MetaCodex = { devoile: [], jours: [] };

export function lireMetaCodex(meta: unknown): MetaCodex {
  const o = (meta as Record<string, unknown> | null | undefined)?.rl_codex as Record<string, unknown> | undefined;
  if (!o || typeof o !== "object") return META_CODEX_VIDE;
  const devoile = o.devoile === "tout" ? "tout" : Array.isArray(o.devoile) ? (o.devoile as unknown[]).filter((x): x is string => typeof x === "string") : [];
  const jours = Array.isArray(o.jours) ? (o.jours as unknown[]).filter((x): x is string => typeof x === "string").slice(-30) : [];
  return { devoile, jours };
}

export type EtatDevoilement = { devoile: string[] | "tout"; jours: string[]; nouveaux: string[]; change: boolean };

/**
 * Ce qui est dévoilé maintenant : le premier déclencheur rempli de chaque
 * ligne de DECOUVERTE (quête faite, minutes depuis l'inscription, n-ième
 * jour de visite), le bouton « Tout montrer » (devoile = "tout") ; un compte
 * ancien (inscrit avant LANCEMENT_CODEX, ou ≥ 50 questions) voit tout. Un
 * dévoilement ne se retire jamais. `nouveaux` : ce qui apparaît à cet appel
 * (l'onglet s'encre, Léonard dit sa réplique).
 */
export function devoiler(meta: MetaCodex, p: { inscritLe: string | null; questions: number; faites: Set<string>; now: Date; jour: string }): EtatDevoilement {
  const jours = meta.jours.includes(p.jour) ? meta.jours : [...meta.jours, p.jour].slice(-30);
  if (meta.devoile === "tout") return { devoile: "tout", jours, nouveaux: [], change: jours !== meta.jours };
  const ancien = (!!p.inscritLe && Date.parse(p.inscritLe) < Date.parse(LANCEMENT_CODEX)) || p.questions >= QUESTIONS_COMPTE_ANCIEN;
  if (ancien) return { devoile: "tout", jours, nouveaux: DECOUVERTE.map((d) => d.id).filter((id) => !meta.devoile.includes(id)), change: true };
  const minutes = p.inscritLe ? (p.now.getTime() - Date.parse(p.inscritLe)) / 60_000 : 0;
  const deja = new Set(meta.devoile);
  const nouveaux: string[] = [];
  for (const d of DECOUVERTE) {
    if (deja.has(d.id)) continue;
    if (d.quand.some((x) => (x.k === "quete" ? p.faites.has(clePeriode(x.id, "")) : x.k === "minutes" ? minutes >= x.n : x.k === "visite" ? jours.length >= x.n : false))) nouveaux.push(d.id);
  }
  return { devoile: [...meta.devoile, ...nouveaux], jours, nouveaux, change: nouveaux.length > 0 || jours !== meta.jours };
}

/** Un élément (onglet, famille du Codex) est-il dévoilé ? Les liens directs marchent toujours : ceci ne sert qu'à ranger. */
export function estDevoile(d: string[] | "tout", quoi: string): boolean {
  if (d === "tout") return true;
  const ligne = DECOUVERTE.find((x) => x.quoi === quoi);
  return !ligne ? true : d.includes(ligne.id);
}

export { PHASES };
