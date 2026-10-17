// Le Codex : le résolveur de destinations. Pour chaque quête, l'endroit du
// site où la faire (le bouton « Y aller »), sa durée et une ligne chiffrée
// qui dit pourquoi. Tout part de l'objectif : une quête nouvelle n'a rien à
// déclarer ici tant que son type d'événement ou de mesure a sa ligne.
// Un lien ne mène jamais à une page absente de cette copie du site (ROUTES) :
// il prend son repli (REPLIS), sinon la quête n'est pas lançable et le moteur
// ne la propose pas (elle reste visible dans l'arbre).
// Module neutre et pur : le contexte (maîtrises, points faibles…) est lu par
// le moteur (contexteDestination, lib/codex/moteur.ts).

import { CHAINES, PROGRAMME, cibleeDe, genererBranches, lienCiblee, type ContenuMatiere } from "@/lib/codex/catalogue";
import { idDe } from "@/lib/codex/programmes/ids";
import { gainPreparation, type MaitriseMatiere } from "@/lib/codex/cap";
import { notionParId } from "@/lib/notions";
import { defSceau } from "@/lib/profil/sceaux";
import type { ContratTire, Ev } from "@/lib/codex/moteur";
import type { EtapeBranche, FiltreMesure, Objectif, Outil, Phase, Prerequis, Quete } from "@/lib/codex/types";

export type Destination = {
  /** toujours interne, commence par « / » */
  href: string;
  /** un seul libellé partout */
  libelle: "Y aller";
  /** minutes, > 0 : la durée de la quête, sinon celle de sa destination */
  duree: number;
  /** une ligne chiffrée (raisonDe), ou rien */
  raison: string | null;
  outil: Outil | "codex" | "profil" | "classement";
};

export type ContexteDestination = {
  contenu: ContenuMatiere[];
  /** maîtrise par matière (pct null : pas encore mesurée) */
  maitrise: Record<string, { pct: number | null; statut?: string }>;
  /** la maîtrise de chaque matière comme le cap la compte (provisoires comprises) : le gain de préparation d'une quête de maîtrise ; absent : pas de gain affiché */
  maitrises?: MaitriseMatiere[];
  /** notions pas encore vues (moins de 5 réponses), par matière */
  notionsNonVues: Record<string, number>;
  /** notions pas encore tenues (V3 §8.5), par matière ; null ou absent : pas encore lues (codex_mesures_v3) */
  notionsNonTenues?: Record<string, number> | null;
  /** points faibles, du plus net au moins net (notion, score 0–100) */
  pointsFaibles: { notion: string; score: number }[];
  /** matière → page de drill la plus faible (null : aucune page passée) */
  drillPageFaible: Record<string, number | null>;
  /** la file « À revoir » (null : pas encore en base) */
  revoir: { aujourdhui: number } | null;
  phase: Phase;
  /** jours avant l'examen (négatif : passé) ; null sans jour J */
  joursAvant: number | null;
  /** la plus grande séance ciblée possible dans une matière (tailleMaxCiblee, lib/codex/catalogue.ts) */
  tailleMaxCiblee: (m: string) => number;
  /** les routes présentes dans CETTE copie du site (ROUTES) */
  routes: ReadonlySet<string>;
  /** /practice comprend topic=all, n, poids et go (faux avant F1) */
  practiceV3: boolean;
  /** les quêtes uniques déjà faites (ids) : « branches à une étape » vise la première branche qui ne l'a pas */
  faites?: ReadonlySet<string>;
  /** le programme actif (absent : CFA I) et ses outils (absent : tous) ; un outil absent du programme prend le repli d'entraînement (REPLI_OUTIL) */
  programme?: string;
  outils?: ReadonlySet<Outil>;
};

/**
 * Les pages du site (dossier app/, hors api et aperçus locaux), un segment
 * dynamique entre crochets. Tenue à la main : scripts/codex/test-destinations.ts
 * la compare au dossier app/. « /revoir » y entre quand sa page arrive.
 */
export const ROUTES: ReadonlySet<string> = new Set([
  "/",
  "/atelier",
  "/calculs",
  "/calculs/[matiere]",
  "/calculs/[matiere]/[type]",
  "/classement",
  "/codex",
  "/courses",
  "/courses/[slug]",
  "/dashboard",
  "/defi",
  "/defi/[date]",
  "/defi/cinq",
  "/defi/cinq/[date]",
  "/duel",
  "/duel/[id]",
  "/eclair",
  "/entrainement",
  "/exam",
  "/fiches",
  "/fiches/derivatives",
  "/fiches/economics",
  "/fiches/equity",
  "/fiches/financial-statement-analysis",
  "/fiches/fixed-income",
  "/fiches/portfolio-management",
  "/flashcards",
  "/flashcards/[id]",
  "/login",
  "/mock-exams",
  "/mock-exams/[id]",
  "/moi",
  "/moi/profil",
  "/official-exams",
  "/onboarding",
  "/people",
  "/people/[id]",
  "/practice",
  "/qcm",
  "/qcm/[id]",
  "/reviser",
  "/scratch",
  "/session",
  "/settings",
  "/share/flashcards/[token]",
  "/share/qcm/[token]",
]);

/** Une page absente de cette copie → la page qui la remplace en attendant. */
export const REPLIS: Record<string, string> = {
  "/revoir": "/moi?onglet=erreurs&reprise=1",
};

/**
 * Un programme sans l'outil d'une destination (un programme d'histoire n'a
 * ni séance ciblée, ni drill, ni examen blanc) : on s'entraîne avec le
 * premier de ces outils qu'il a, sinon la quête n'est pas lançable.
 */
const REPLI_OUTIL: { outil: Outil; href: string; duree: number }[] = [
  { outil: "ciblee", href: "/practice", duree: 20 },
  { outil: "eclair", href: "/eclair", duree: 10 },
  { outil: "cinq", href: "/defi/cinq", duree: 5 },
];
const OUTILS: ReadonlySet<string> = new Set<Outil>(["ciblee", "fiche", "drill", "cours", "flashcards", "atelier", "calculs", "blancs", "trente", "cinq", "eclair", "duels", "revoir"]);

/** /practice comprend-il topic=all, n, poids et go ? Oui depuis F1 (lib/practice-lien.ts) : posé à vrai par A4a. */
export const PRACTICE_V3 = true;

const cheminDe = (href: string) => href.split(/[?#]/)[0];

/** Le chemin existe-t-il parmi ces routes (un segment [x] vaut n'importe quel segment non vide) ? */
export function routeExiste(chemin: string, routes: ReadonlySet<string> = ROUTES): boolean {
  if (routes.has(chemin)) return true;
  const parts = chemin.split("/");
  for (const r of routes) {
    if (!r.includes("[")) continue;
    const rp = r.split("/");
    if (rp.length === parts.length && rp.every((s, i) => s === parts[i] || (/^\[[^.\]]+\]$/.test(s) && parts[i] !== ""))) return true;
  }
  return false;
}

// ── Les cibles ─────────────────────────────────────────────────────────

/** Une destination avant la durée de la quête et sa raison ; `matiere` et `notions` (vues ou tenues) nourrissent la raison. */
type Cible = { href: string; duree: number; outil: Destination["outil"]; matiere?: string; notions?: "vues" | "tenues" };

const CINQ: Cible = { href: "/defi/cinq", duree: 5, outil: "cinq" };
const TRENTE: Cible = { href: "/defi", duree: 40, outil: "trente" };
const DUEL: Cible = { href: "/duel", duree: 10, outil: "duels" };
const BLANCS: Cible = { href: "/mock-exams", duree: 90, outil: "blancs" };
const ATELIER: Cible = { href: "/atelier", duree: 30, outil: "atelier" };
const CALCULS: Cible = { href: "/calculs", duree: 10, outil: "calculs" };
const revoir = (duree: number): Cible => ({ href: "/revoir", duree, outil: "revoir" });

/** Les sceaux et leur outil (matiere:<m> : la maîtrise de la matière). */
const SCEAU_VERS: Record<string, Cible> = {
  assiduite: CINQ,
  "copie-pleine": CINQ,
  "defi-tenu": TRENTE,
  duelliste: DUEL,
  "coup-d-eclat": DUEL,
  calculateur: CALCULS,
  "examen-blanc": BLANCS,
  "mise-au-propre": revoir(15),
};

/** Un lien d'entraînement : sans practiceV3, seuls topic=<clé> et format passent (jamais topic=all, n, poids ni go). */
function lienPractice(ctx: ContexteDestination, p: { topic: string; n?: number; format?: number; poids?: true }): string {
  const q: string[] = [];
  if (ctx.practiceV3 || p.topic !== "all") q.push(`topic=${encodeURIComponent(p.topic)}`);
  if (ctx.practiceV3 && p.n) q.push(`n=${p.n}`);
  if (ctx.practiceV3 && p.poids) q.push("poids=1");
  if (p.format && (ctx.practiceV3 || p.topic !== "all")) q.push(`format=${p.format}`);
  return q.length ? `/practice?${q.join("&")}` : "/practice";
}

/**
 * Une séance ciblée dans une matière. Sans practiceV3, la taille vient du
 * format seul : le plus petit qui atteint le seuil de la quête (cibleeDe).
 * Avec : 20 questions au plus, en format 180 si la matière n'en a pas 20.
 */
function lienSeanceCiblee(ctx: ContexteDestination, m: ContenuMatiere): string {
  if (!ctx.practiceV3) return lienCiblee(m.key, cibleeDe(m.poids).format);
  const max = ctx.tailleMaxCiblee(m.key);
  return lienPractice(ctx, { topic: m.key, n: Math.min(20, max), format: max < 20 ? 180 : 90 });
}

/** La fiche d'une matière, ouverte sur sa page de drill la plus faible si on la connaît. */
function lienFiche(ctx: ContexteDestination, m: ContenuMatiere, pageFaible: boolean): string {
  const p = pageFaible && m.drill ? ctx.drillPageFaible[m.key] : null;
  return `/fiches/${m.fiche}${p && p > 0 ? `?page=${p}` : ""}`;
}

/** La matière au plus fort poids × manque (manque d'une matière : 0–1), parmi celles qui passent le filtre. */
function argmax(ctx: ContexteDestination, manque: (m: ContenuMatiere) => number, filtre: (m: ContenuMatiere) => boolean = () => true): ContenuMatiere | null {
  let meilleur: ContenuMatiere | null = null;
  let score = -1;
  for (const m of ctx.contenu) {
    if (!filtre(m)) continue;
    const s = m.poids * manque(m);
    if (s > score) [meilleur, score] = [m, s];
  }
  return meilleur;
}

/** La faiblesse d'une matière : 1 − maîtrise (inconnue : 20 %, comme le tirage des contrats). */
const faiblesse = (ctx: ContexteDestination) => (m: ContenuMatiere) => 1 - (ctx.maitrise[m.key]?.pct ?? 20) / 100;
/** La part des notions d'une matière pas encore vues. */
const partNonVue = (ctx: ContexteDestination) => (m: ContenuMatiere) => (m.notions ? (ctx.notionsNonVues[m.key] ?? m.notions) / m.notions : 0);
/** La part des notions d'une matière pas encore tenues (celle des non vues tant qu'on ne les lit pas). */
const partNonTenue = (ctx: ContexteDestination) => (m: ContenuMatiere) => (!ctx.notionsNonTenues ? partNonVue(ctx)(m) : m.notions ? (ctx.notionsNonTenues[m.key] ?? m.notions) / m.notions : 0);
const avecDrill = (m: ContenuMatiere) => !!m.fiche && m.drill;

/**
 * « Ce qui coince » : la matière au plus fort poids × faiblesse (ou celle
 * qu'on donne : la première fuite du cap) ; une notion de cette matière nette
 * en point faible (score ≥ 60) va à l'Atelier si la séance dure 20 minutes ou
 * plus, sinon une séance de la matière.
 */
function coince(ctx: ContexteDestination, duree: number, matiere?: string): Cible | null {
  const m = matiere !== undefined ? (matiereDe(ctx, matiere) ?? null) : argmax(ctx, faiblesse(ctx));
  if (!m) return null;
  const pf = duree >= 20 ? ctx.pointsFaibles.find((p) => p.score >= 60 && notionParId(p.notion)?.matiere === m.key) : undefined;
  if (pf) return { href: `/atelier?notion=${encodeURIComponent(pf.notion)}`, duree, outil: "atelier", matiere: m.key };
  return { href: lienPractice(ctx, { topic: m.key, n: duree >= 25 ? 20 : 15 }), duree, outil: "ciblee", matiere: m.key };
}

/** La valeur texte d'un champ de filtre ; un paramètre de contrat est remplacé (la matière, à défaut, par celle de la quête). */
function valeur(f: Record<string, unknown> | undefined, champ: string, q: Quete, params: ContratTire["params"]): string | undefined {
  const v = f?.[champ];
  if (v && typeof v === "object" && !Array.isArray(v) && "param" in v) {
    const nom = (v as { param: keyof ContratTire["params"] }).param;
    return params[nom] ?? (nom === "matiere" ? q.matiere : undefined);
  }
  return typeof v === "string" ? v : undefined;
}

const matiereDe = (ctx: ContexteDestination, cle: string | undefined) => (cle ? ctx.contenu.find((m) => m.key === cle) : undefined);

/** La destination d'un compteur d'événements. */
function cibleCompteur(o: Extract<Objectif, { k: "compteur" }>, q: Quete, params: ContratTire["params"], ctx: ContexteDestination): Cible | null {
  const f = o.filtre as Record<string, unknown> | undefined;
  const mat = matiereDe(ctx, valeur(f, "matiere", q, params));
  const matiere = mat ? { matiere: mat.key } : {};
  switch (o.evenement) {
    case "question_repondue": {
      const notion = valeur(f, "notion", q, params);
      if (notion) {
        const n = notionParId(notion);
        return { href: `/atelier?notion=${encodeURIComponent(notion)}`, duree: 15, outil: "atelier", ...(n ? { matiere: n.matiere } : {}) };
      }
      if (mat) return { href: lienPractice(ctx, { topic: mat.key, n: 15 }), duree: 15, outil: "ciblee", matiere: mat.key };
      if (f?.juste === true && f.ecartJours !== undefined) return revoir(15);
      return CINQ;
    }
    case "session_terminee": {
      if (f?.source === "ciblee") {
        // sans matière (l'acte II) : celle qui coince le plus parmi celles qui atteignent la taille demandée
        const min = (f.questions as { min?: number } | undefined)?.min ?? 0;
        const m = mat ?? argmax(ctx, faiblesse(ctx), (x) => ctx.tailleMaxCiblee(x.key) >= min);
        if (m) return { href: lienSeanceCiblee(ctx, m), duree: 25, outil: "ciblee", matiere: m.key };
      }
      return { href: lienPractice(ctx, { topic: "all", n: 20, poids: true }), duree: 25, outil: "ciblee" };
    }
    case "drill_page_terminee": {
      const fiche = valeur(f, "fiche", q, params);
      const m = fiche ? ctx.contenu.find((x) => x.fiche === fiche) : (mat ?? argmax(ctx, faiblesse(ctx), avecDrill));
      if (m?.fiche) return { href: lienFiche(ctx, m, true), duree: 20, outil: "drill", matiere: m.key };
      return fiche ? { href: `/fiches/${encodeURIComponent(fiche)}`, duree: 20, outil: "drill" } : null;
    }
    case "defi_rendu": return TRENTE;
    case "cinq_rendu": return CINQ;
    case "eclair_rendue": return { href: "/eclair", duree: 5, outil: "eclair" };
    case "duel_termine": return DUEL;
    case "examen_blanc_rendu": return BLANCS;
    case "seance_atelier": return ATELIER;
    case "rature_rayee":
      return f?.ageJours !== undefined ? { href: "/moi?onglet=erreurs&reprise=1&ordre=anciennes", duree: 10, outil: "revoir" } : revoir(10);
    case "calcul_repondu": return { ...CALCULS, ...matiere };
    case "cours_ecoute": return mat?.cours ? { href: `/courses/${mat.cours}`, duree: 20, outil: "cours", matiere: mat.key } : { href: "/courses", duree: 20, outil: "cours" };
    case "flashcards_revues": return { href: "/flashcards", duree: 10, outil: "flashcards", ...matiere };
    case "fiche_ouverte": return mat?.fiche ? { href: `/fiches/${mat.fiche}`, duree: 20, outil: "fiche", matiere: mat.key } : { href: "/fiches", duree: 20, outil: "fiche" };
    case "palier_atteint": return DUEL;
    case "jour_encre": return { ...CINQ, duree: 10 };
    case "question_marquee": return CINQ;
    case "ami_ajoute": return { href: "/people", duree: 3, outil: "classement" };
    // une séance juste (V3 §8.5) : ce qui coince, sur du neuf ou du dû
    case "seance_juste": return coince(ctx, 20);
    // le débrief : la liste des blancs ; codex_mesures_v3 n'en rend que le compte, pas la référence
    // qui mènerait droit à la revue (/mock-exams/<ref>?debrief=1)
    case "blanc_debriefe": return { ...BLANCS, duree: 10 };
    // une séance « À revoir » (journal v3) : la file du jour
    case "revoir_rendue": return revoir(15);
    // une rature scellée : la reprise des plus anciennes, celles qui ont eu le temps de sécher
    case "rature_scellee": return { href: "/moi?onglet=erreurs&reprise=1&ordre=anciennes", duree: 10, outil: "revoir" };
  }
}

/** La destination d'une mesure. */
function cibleMesure(o: Extract<Objectif, { k: "mesure" }>, q: Quete, params: ContratTire["params"], ctx: ContexteDestination): Cible | null {
  const f = o.filtre as (FiltreMesure & Record<string, unknown>) | undefined;
  const mat = matiereDe(ctx, valeur(f, "matiere", q, params));
  switch (o.mesure) {
    case "maitrise":
      return mat ? { href: lienPractice(ctx, { topic: mat.key, n: 20, format: 180 }), duree: 25, outil: "ciblee", matiere: mat.key } : coince(ctx, 25);
    case "maitrise_programme":
    case "matieres_au_dessus":
    case "matieres_remontees":
    case "preparation":
      return coince(ctx, 25);
    case "notions_vues":
    case "notions_vues_pct": {
      const m = mat ?? argmax(ctx, partNonVue(ctx));
      if (!m) return null;
      if (avecDrill(m)) return { href: lienFiche(ctx, m, false), duree: 20, outil: "drill", matiere: m.key, notions: "vues" };
      return { href: lienPractice(ctx, { topic: m.key, n: 15 }), duree: 20, outil: "ciblee", matiere: m.key, notions: "vues" };
    }
    case "drill_pages_restantes":
    case "drill_pages_reussies": {
      const m = mat ?? argmax(ctx, faiblesse(ctx), avecDrill);
      return m?.fiche ? { href: lienFiche(ctx, m, o.mesure === "drill_pages_reussies"), duree: 20, outil: "drill", matiere: m.key } : null;
    }
    case "ratures_ouvertes":
    case "ratures_rayees":
    case "rappels_espaces":
    case "revisions_dues":
    case "ratures_scellees":
      return { ...revoir(15), ...(mat ? { matiere: mat.key } : {}) };
    case "semaines_actives":
    case "serie":
    case "meilleure_serie":
    case "semaines_objectif_tenu":
    case "questions_total":
    case "niveau":
      return CINQ;
    case "types_calcul_tenus": return CALCULS;
    case "examens_blancs_au_dessus": return BLANCS;
    case "elo":
    case "pic_palier":
    case "duels_joues":
      return DUEL;
    case "jour_j_fixe": return { href: "/moi?onglet=reglages#objectif", duree: 1, outil: "profil" };
    case "visite_vue": return { href: "/dashboard?visite=1", duree: 3, outil: "codex" };
    case "amis": return { href: "/people", duree: 3, outil: "classement" };
    case "sceau": {
      const cle = f?.cle;
      if (!cle) return null;
      if (cle.startsWith("matiere:")) return cibleMesure({ k: "mesure", mesure: "maitrise", seuil: o.seuil, filtre: { matiere: cle.slice(8) } }, q, params, ctx);
      return SCEAU_VERS[cle] ?? (defSceau(cle)?.famille === "mentions" ? DUEL : null);
    }
    case "quetes_terminees": return { href: "/codex", duree: 5, outil: "codex" };
    case "branches_etape":
    case "branches_etape_pct":
      return f?.etape ? cibleEtape(f.etape, ctx) : null;
    // le fil rouge (V3 §1.5)
    case "jours_encre_total":
    case "semaines_entretien":
      return CINQ;
    case "maitres_total": return cibleEtape("maitre", ctx);
    case "programmes_menes":
    case "pieces_possedees":
      return { href: "/codex", duree: 5, outil: "codex" };
    case "trophees": {
      const s = typeof f?.source === "string" ? TROPHEE_VERS[f.source] : undefined;
      return s ?? { href: lienPractice(ctx, { topic: "all", n: 30, poids: true }), duree: 30, outil: "ciblee" };
    }
    case "trophees_sources": return { href: lienPractice(ctx, { topic: "all", n: 30, poids: true }), duree: 30, outil: "ciblee" };
    // les notions tenues : une séance de la matière (la plus lourde à couvrir sans matière), là où ses notions reviennent
    case "notions_tenues":
    case "notions_tenues_pct": {
      const m = mat ?? argmax(ctx, partNonTenue(ctx));
      return m ? { href: lienPractice(ctx, { topic: m.key, n: 20 }), duree: 20, outil: "ciblee", matiere: m.key, notions: "tenues" } : null;
    }
    case "malle_faite": return { href: "/codex", duree: 5, outil: "codex" };
    case "blancs_a_debriefer": return { ...BLANCS, duree: 10 };
  }
}

/** Où se gagne un trophée de chaque source (copie locale des liens de SOURCES_TROPHEE, lib/trophees.ts, avant la fusion F1). */
const TROPHEE_VERS: Record<string, Cible> = {
  ciblee: { href: "/practice", duree: 30, outil: "ciblee" },
  blanc: BLANCS,
  trente: TRENTE,
  cinq: CINQ,
  drill: { href: "/fiches", duree: 20, outil: "drill" },
  fiche: { href: "/fiches", duree: 20, outil: "drill" },
  atelier: ATELIER,
  duel: DUEL,
  revoir: revoir(20),
};

/** « Branches à une étape » : la destination de cette étape dans la première branche (poids décroissants) qui ne l'a pas. */
function cibleEtape(etape: EtapeBranche, ctx: ContexteDestination): Cible | null {
  const faites = ctx.faites ?? new Set<string>();
  const programme = ctx.programme ?? PROGRAMME;
  for (const m of [...ctx.contenu].sort((a, b) => b.poids - a.poids)) {
    // une branche sans cette étape compte pour faite (branchesFaites, moteur)
    const q = genererBranches([m], programme, ctx.outils).find((x) => x.etape === etape);
    if (!q || faites.has(idDe(programme, q.id))) continue;
    const c = resoudre(q.objectif, q, {}, ctx);
    if (c) return q.duree ? { ...c, duree: q.duree } : c;
  }
  return null;
}

/** La destination d'un prédicat spécial (`_matiere` : la variante par matière). */
function cibleSpeciale(cle: string, q: Quete, params: ContratTire["params"], ctx: ContexteDestination): Cible | null {
  const mat = matiereDe(ctx, params.matiere ?? q.matiere);
  if (cle.startsWith("serie_bonnes")) return { href: lienPractice(ctx, { topic: mat?.key ?? "all", n: 20 }), duree: 20, outil: "ciblee", ...(mat ? { matiere: mat.key } : {}) };
  if (cle.startsWith("serie_calculs")) return { ...CALCULS, duree: 15 };
  if (cle === "justes_sur_20_matiere") return { href: lienPractice(ctx, { topic: mat?.key ?? "all", n: 20 }), duree: 20, outil: "ciblee", ...(mat ? { matiere: mat.key } : {}) };
  if (cle === "phenix") return TRENTE;
  if (cle === "retour" || cle === "aube") return CINQ;
  return null;
}

/** Une cible placée dans cette copie et ce programme : son outil existe (sinon REPLI_OUTIL), sa page existe, sinon son repli ; ni l'un ni l'autre → rien. */
function placer(c: Cible | null, ctx: ContexteDestination): Cible | null {
  if (c && ctx.outils && OUTILS.has(c.outil) && !ctx.outils.has(c.outil as Outil)) {
    const r = REPLI_OUTIL.find((x) => ctx.outils!.has(x.outil));
    c = r ? { href: r.href, duree: r.duree, outil: r.outil, ...(c.matiere ? { matiere: c.matiere } : {}) } : null;
  }
  if (!c || !c.href.startsWith("/")) return null;
  const chemin = cheminDe(c.href);
  if (routeExiste(chemin, ctx.routes)) return c;
  const repli = REPLIS[chemin];
  return repli && routeExiste(cheminDe(repli), ctx.routes) ? { ...c, href: repli } : null;
}

/** La destination d'un objectif ; `tous` / `unDe` : le premier sous-objectif non rempli qui mène quelque part. */
function resoudre(o: Objectif, q: Quete, params: ContratTire["params"], ctx: ContexteDestination, ev?: Ev): Cible | null {
  switch (o.k) {
    case "tous":
    case "unDe":
      for (const [i, x] of o.objectifs.entries()) {
        if (ev?.sous?.[i]?.fait) continue;
        const c = resoudre(x, q, params, ctx, ev?.sous?.[i]);
        if (c) return c;
      }
      return null;
    case "compteur": return placer(cibleCompteur(o, q, params, ctx), ctx);
    case "mesure": return placer(cibleMesure(o, q, params, ctx), ctx);
    case "special": return placer(cibleSpeciale(o.cle, q, params, ctx), ctx);
  }
}

// ── Les raisons ────────────────────────────────────────────────────────

const virgule = (n: number) => String(n).replace(".", ",");

/** Coupe une phrase à n caractères au plus, sur un mot. */
function raccourci(s: string, n: number): string {
  if (s.length <= n) return s;
  const coupe = s.slice(0, n - 1);
  const i = coupe.lastIndexOf(" ");
  return (i > n / 2 ? coupe.slice(0, i) : coupe).replace(/[\s,;:.]+$/, "") + "…";
}

/** La quête est-elle calée sur le jour J (fenêtre avant l'examen) ? */
const caleeSurExamen = (p: Prerequis[]): boolean => p.some((x) => x.k === "joursAvantExamen" || (x.k === "unDe" && caleeSurExamen(x.prerequis)));

/** Une avancée lisible « 12/25 » : des entiers, ni objectif à faire baisser ni objectif composé. */
const avanceeLisible = (ev: Ev) => !ev.inconnu && !ev.baisse && !ev.sous && ev.cible > 1 && Number.isInteger(ev.valeur) && Number.isInteger(ev.cible);

/** « FSA pèse 12,5 % de l'examen et tu es à 48 % » (ou ses notions vues ou tenues, ou pas encore de mesure). */
function raisonMatiere(m: ContenuMatiere, ctx: ContexteDestination, notions: Cible["notions"]): string {
  const debut = `${m.court} pèse ${virgule(m.poids)} % de l'examen`;
  const tenues = ctx.notionsNonTenues ? m.notions - (ctx.notionsNonTenues[m.key] ?? m.notions) : null;
  if (notions === "tenues" && tenues !== null && m.notions > 0 && tenues < m.notions) {
    return tenues > 0 ? `${debut} et tu tiens ${tenues} de ses ${m.notions} notions` : `${debut} et tu ne tiens encore aucune de ses ${m.notions} notions`;
  }
  const vues = m.notions - (ctx.notionsNonVues[m.key] ?? m.notions);
  if (notions === "vues" && m.notions > 0 && vues < m.notions) {
    return vues > 0 ? `${debut} et tu n'as vu que ${vues} de ses ${m.notions} notions` : `${debut} et tu n'as encore vu aucune de ses ${m.notions} notions`;
  }
  const pct = ctx.maitrise[m.key]?.pct ?? null;
  return pct === null ? `${debut} et tu n'y as pas encore de mesure` : `${debut} et tu es à ${pct} %`;
}

/** Le seuil de maîtrise que vise une quête dans sa matière (objectif « maitrise », seul ou dans un « tous ») ; null : aucun. */
function seuilMaitrise(o: Objectif): number | null {
  if (o.k === "mesure") return o.mesure === "maitrise" ? o.seuil : null;
  if (o.k === "tous") {
    for (const x of o.objectifs) {
      const s = seuilMaitrise(x);
      if (s !== null) return s;
    }
  }
  return null;
}

/** « +1,2 pt de préparation » : ce que rapporterait la quête de maîtrise au cap (V3 §4.7), dès un demi-point ; null sinon. */
function gainDe(q: Quete, m: ContenuMatiere, ctx: ContexteDestination): string | null {
  const seuil = seuilMaitrise(q.objectif);
  const mm = ctx.maitrises?.find((x) => x.cle === m.key);
  if (seuil === null || !mm || !ctx.maitrises) return null;
  const gain = gainPreparation(mm, seuil, ctx.maitrises);
  return gain >= 0.5 ? `+${virgule(gain)} pt de préparation` : null;
}

function raison(q: Quete, c: Cible | null, ctx: ContexteDestination, ev?: Ev): string | null {
  const j = ctx.joursAvant;
  if (j !== null && j >= 0 && caleeSurExamen(q.prerequis)) {
    if (q.pourquoi) return `${j === 0 ? "Jour J" : `J-${j}`} · ${q.pourquoi}`;
    return j === 0 ? "L'examen, c'est aujourd'hui" : j === 1 ? "L'examen, c'est demain" : `L'examen est dans ${j} jours`;
  }
  if (c?.outil === "revoir" && ctx.revoir && ctx.revoir.aujourdhui > 0) return `${ctx.revoir.aujourdhui} à revoir aujourd'hui`;
  const chaine = q.chaine ? CHAINES.find((x) => x.id === q.chaine) : undefined;
  if (chaine) {
    const pourquoi = raccourci(chaine.pourquoi, 80);
    return ev && avanceeLisible(ev) ? `${ev.valeur}/${ev.cible} · ${pourquoi}` : pourquoi;
  }
  const m = matiereDe(ctx, c?.matiere ?? q.matiere);
  if (m) {
    const gain = gainDe(q, m, ctx);
    return gain ? `${raisonMatiere(m, ctx, c?.notions)} · ${gain}` : raisonMatiere(m, ctx, c?.notions);
  }
  return q.pourquoi ?? null;
}

// ── L'API ──────────────────────────────────────────────────────────────

/**
 * Où faire cette quête, combien de temps, et pourquoi. `params` : ceux d'un
 * contrat du jour ; `ev` : son évaluation (le premier sous-objectif non
 * rempli d'un objectif composé, l'avancée d'une chaîne). null : la quête n'a
 * aucune destination dans cette copie du site (elle n'est pas lançable).
 */
export function destinationDe(q: Quete, params: ContratTire["params"], ctx: ContexteDestination, ev?: Ev): Destination | null {
  const c = resoudre(q.objectif, q, params, ctx, ev);
  if (!c) return null;
  return { href: c.href, libelle: "Y aller", duree: q.duree && q.duree > 0 ? q.duree : c.duree, raison: raison(q, c, ctx, ev), outil: c.outil };
}

/**
 * « Y aller » du cap (V3 §4.7) : ce qui coince dans cette matière (la première
 * fuite), une séance de 25 minutes ; null : la matière n'est pas du programme,
 * ou rien n'y mène dans cette copie du site.
 */
export function destinationCoince(ctx: ContexteDestination, matiere: string): Destination | null {
  const c = placer(coince(ctx, 25, matiere), ctx);
  const m = matiereDe(ctx, matiere);
  return c ? { href: c.href, libelle: "Y aller", duree: c.duree, raison: m ? raisonMatiere(m, ctx, undefined) : null, outil: c.outil } : null;
}

/** La ligne « pourquoi » d'une quête, chiffrée (jamais « Quête principale · 40/100 ») ; null s'il n'y a rien d'utile à dire. */
export function raisonDe(q: Quete, ctx: ContexteDestination, ev?: Ev, params: ContratTire["params"] = {}): string | null {
  return raison(q, resoudre(q.objectif, q, params, ctx, ev), ctx, ev);
}

/** La quête mène-t-elle quelque part dans cette copie du site ? */
export function lancable(q: Quete, ctx: ContexteDestination, params: ContratTire["params"] = {}): boolean {
  return resoudre(q.objectif, q, params, ctx) !== null;
}
