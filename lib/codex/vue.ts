// Le Codex : la vue que lit l'écran. Module neutre : construit, à partir de
// l'évaluation du moteur (lib/codex/moteur.ts), exactement ce que la page
// affiche, dans l'ordre décidé (CONCEPTION.md) : la prochaine quête, la trame
// (acte en cours), les contrats du jour et de la semaine, les branches, le
// long cours, les exploits. L'écran ne calcule rien : il lit ceci.

import { ACTES, CHAINES, COSMETIQUES_CODEX, DECOUVERTE, ETAPES, PHASES, QUETE_DEBRIEF, catalogueCodex, titresMaitres, contenuDuProgramme, type ContenuMatiere } from "@/lib/codex/catalogue";
import { capDe, joursDepuis, maitriseDuCodex, type VueCap } from "@/lib/codex/cap";
import { etatNotion, type EtatNotion } from "@/lib/codex/carte";
import { destinationCoince, destinationDe, type ContexteDestination, type Destination } from "@/lib/codex/destinations";
import { nomEnTete, programmeActif, suiteDe } from "@/lib/codex/programmes";
import { CHAPITRES_FIL, palierFilDe, paliersRecompenses } from "@/lib/codex/fil-rouge";
import { actesDuJoueur, affichage, apresExamenDe, budgetDuJour, capacitesDe, contexteDestination, joursAvantExamen, parametresDe, repliquesDeVague, revoirDe, type ContratTire, type EtatDevoilement, type EtatQuete, type Entree, type Recommandation, type Resultat } from "@/lib/codex/moteur";
import type { VueSeance } from "@/lib/codex/seance";
import type { VueRythme } from "@/lib/codex/rythme";
import { momentDe, recapDe, tamponsVeillee, type Moment, type Recap, type Tampon } from "@/lib/codex/calendrier";
import { notionsDeMatiere } from "@/lib/notions";
import { CODEX, romain } from "@/lib/voice-codex";
import { FAIT_VIDE, aRecupererDe, cleRecuperer, faitAujourdhuiDe, nomRecompense, titreHorsVue, type ARecuperer, type FaitAujourdhui } from "@/lib/codex/recuperer";
import type { Acte, Budget, Chaine, CosmetiqueCodex, Emplacement, EtapeBranche, Famille, Phase, Prerequis, Quete, RepliqueCodex } from "@/lib/codex/types";

export type EtatLigne = "verrouillee" | "disponible" | "active" | "terminee";

/** Une quête telle que l'écran l'affiche. */
export type LigneQuete = {
  id: string;
  periode: string;
  famille: Famille;
  titre: string;
  consigne: string;
  pourquoi?: string;
  etat: EtatLigne;
  /** complet | verrouille (on voit le chemin) | indice (énigme) | cache : à ne pas montrer */
  affichage: "complet" | "verrouille" | "indice" | "cache";
  indice?: string;
  valeur: number;
  cible: number;
  /** 0–1 */
  fraction: number;
  /** objectif « à faire baisser » pas encore tenu : la valeur mesurée et le seuil (« 120 ratures, sous 50 ») */
  baisse?: { actuel: number; seuil: number };
  /** l'XP visée / l'XP réellement versée (plafonnée), seulement si terminée ; un miroir n'en vise aucune */
  xp: number;
  xpVersee: number | null;
  cosmetique?: string;
  titreGagne?: string;
  /** le nom lisible de la pièce et du titre (pour l'écran, qui n'a pas le catalogue) */
  cosmetiqueNom?: string;
  titreNom?: string;
  /** le folio donné en plus (V3 §3.7), et son nom (l'œuvre) */
  folio?: string;
  folioNom?: string;
  retro: boolean;
  termineeLe: string | null;
  /** la fanfare n'a pas été jouée */
  aFeter: boolean;
  lien?: string;
  /** où la faire (« Y aller »), combien de temps et pourquoi : seulement pour une quête ouverte, pas faite, qui mène quelque part */
  destination?: Destination;
  duree?: number;
  optionnelle?: boolean;
  /** un miroir (V3 §8.2) : la quête qui paie, son id et son titre (« Comptée avec « Un mois d'atelier » ») */
  compteeAvec?: { id: string; titre: string };
  /** hors jeu mais commencée (sa mesure est inconnue, V3 §8) : affichée telle quelle, elle ne bloque rien et ne compte pas */
  gelee?: boolean;
  /** en sprint, un palier de régularité hors de portée avant le jour J : « après l'examen », jamais proposé (V3 §10.2) */
  differee?: true;
  acte?: string;
  chaine?: string;
  palier?: number;
  matiere?: string;
  etape?: EtapeBranche;
  /**
   * verrouillée : ce qui manque, une ligne par prérequis pas rempli
   * (« Séance ciblée : 7 matières sur 8, il manque Quant »), et les sceaux de
   * la carte à allumer (ids de quêtes, « acte:… »), V3 §10.1
   */
  manque?: string[];
  allume?: string[];
};

export type VueActe = {
  acte: Acte;
  clos: boolean;
  courant: boolean;
  faites: number;
  total: number;
  quetes: LigneQuete[];
  /** la réplique du moment : ouverture tant que l'acte est en cours, clôture quand il est clos */
  replique: RepliqueCodex;
  /** la fanfare de sa clôture n'a pas été jouée */
  aFeter: boolean;
  /**
   * les matières « à rattraper » (clés) : l'acte s'est ouvert sur n branches
   * sur dix (acte V : 8 à leur séance ciblée, D6), celles-ci n'y sont pas encore
   */
  aRattraper: string[];
};

export type VueContrat = {
  emplacement: Emplacement;
  modele: string;
  ligne: LigneQuete;
  /** le changement du jour est encore possible pour ce contrat */
  changeable: boolean;
};

export type VueBranche = {
  contenu: ContenuMatiere;
  etapes: LigneQuete[];
  faites: number;
  total: number;
  /** « Maître de … » obtenu */
  maitre: boolean;
  /** la pastille de la carte (V3 §10.1) : la maîtrise de la matière, et les jours depuis sa dernière réponse (null : inconnus) */
  maitrise: Pick<VueCap["matieres"][number], "pct" | "statut" | "zone" | "n"> & { jours: number | null };
  /** ses notions, en petites feuilles : non vue (contour), vue (trait), tenue (pleine) */
  notions: { id: string; court: string; etat: EtatNotion }[];
};

export type VueChaine = { chaine: Chaine; paliers: LigneQuete[]; courant: LigneQuete | null; suivant: LigneQuete | null; faits: number };

/** Un chapitre du fil rouge : son palier en cours (et le suivant), ce qui est tamponné. */
export type VueChapitreFil = {
  id: string;
  titre: string;
  pourquoi: string;
  /** le plus haut palier tamponné (écrit en base, ou rempli par ce calcul quand la base sait l'écrire) */
  faits: number;
  courant: LigneQuete | null;
  suivant: LigneQuete | null;
  /** les paliers tamponnés dont la fanfare n'a pas été jouée (bilan, fête) */
  recents: LigneQuete[];
};

/**
 * Le fil rouge (V3 §1.5). `aVenir` : la base ne sait pas encore l'écrire
 * (capacité « fil » absente) : il se lit, sans tampon, sans fête ni XP annoncée.
 */
export type VueFilRouge = { chapitres: VueChapitreFil[]; aVenir: boolean };

export type Possession = { cle: string; type: CosmetiqueCodex["type"]; nom: string; quete: string; le: string | null; retro: boolean };

export type VueCodex = {
  /** la migration est collée et la base répond */
  disponible: boolean;
  jour: string;
  phase: Phase;
  phaseNom: string;
  phaseReplique: string;
  joursAvant: number | null;
  niveau: number;
  /** le temps que le joueur se donne aujourd'hui (choisi, sinon déduit de son rythme) ; null : Codex indisponible */
  budget: Budget | null;
  /** la file « À revoir » (revisions_dues ; repli : les ratures en cours, 25 au plus ; null : rien de connu, V3 §5.4) */
  revoir: { aujourdhui: number; demain: number } | null;
  /** le cap en tête de /codex : la préparation, les matières, les trois fuites (V3 §4.6) ; null : Codex indisponible */
  cap: VueCap | null;
  prochaine: (Recommandation & { ligne: LigneQuete }) | null;
  trame: VueActe[];
  contrats: VueContrat[];
  trio: { fait: boolean; xp: number; faits: number; total: number; changementPossible: boolean };
  hebdo: LigneQuete[];
  /** le débrief du dernier examen blanc (contrat:debrief, V3 §7.6), quand un blanc l'attend ; null sinon */
  debrief: LigneQuete | null;
  branches: VueBranche[];
  longCours: VueChaine[];
  /** le fil rouge, commun à tous les programmes (sous les chaînes) */
  filRouge: VueFilRouge;
  exploits: LigneQuete[];
  /** ce que le joueur possède grâce au Codex (cadres, bannières, titres) */
  possessions: Possession[];
  /** les sceaux du profil ont quitté les exploits (D5) : le lien vers la Collection (son onglet du profil), sous les exploits ; null sans joueur connu */
  collection: string | null;
  stats: { faites: number; total: number; xpCodex: number };
  devoile: EtatDevoilement | null;
  /** ce qui vient d'être dévoilé, avec la réplique de Léonard (l'écran n'a pas le catalogue de dévoilement) ; `replique` : null sauf pour le premier dévoilement d'une vague (il ne parle qu'une fois par vague) */
  devoileNouveaux: { id: string; quoi: string; libelle: string; replique: string | null }[];
  /** récompenses versées à CET appel (fanfare) */
  nouvelles: { quete: string; periode: string; xp: number; nominal: number; cosmetique: string | null; titre: string | null; titreQuete: string }[];
  /** « Léonard a feuilleté ton carnet » : à jouer une fois */
  retro: { xp: number; quetes: number; actes: string[]; cosmetiques: string[]; titres: string[] } | null;
  /** « La route de Milan » (V3 §1.6) : le programme suivant, une fois le sien mené ; `ouvrable` : il est public (bouton « Ouvrir … ») */
  suite: { programme: string; court: string; annonce: string; ouvrable: boolean } | null;
  /** la séance du jour (lib/codex/seance.ts, V3 §6), composée par le serveur ; null : pas encore composée, ou Codex indisponible */
  seance: VueSeance | null;
  /** le moment du calendrier (V3 §7.1) : ce que /codex montre, et dans quel ordre */
  moment: Moment;
  /** la veillée : sept tampons, de J-7 à J-1 (jours d'encre) ; null hors veillée */
  tampons: Tampon[] | null;
  /** la malle (J-3 à J-1) : les cases cochées ; null hors malle */
  malle: { coches: string[] } | null;
  /** le lendemain (J+1 à J+7) : le récap de la préparation ; null sinon */
  recap: Recap | null;
  /** le mode sobre du joueur (V3 §11.5, lib/codex/sobre) : ni « +n XP », ni pièces, des fêtes d'une ligne ; la séance, le panneau, le cap et les contrats restent */
  sobre: boolean;
  /** le rythme long (V3 §10.2 à §10.5, lib/codex/rythme.ts) : le plan daté, le lundi, le verdict, la reprise ; absent : aperçus */
  rythme?: VueRythme | null;
  /** « Récupérer » (lib/codex/recuperer) : les quêtes faites qui attendent le clic, les plus récentes d'abord */
  aRecuperer: ARecuperer[];
  /** les quêtes récompensées aujourd'hui (jour de Paris), hors rétroactif */
  faitAujourdhui: FaitAujourdhui;
};

export const VUE_INDISPONIBLE = (jour: string): VueCodex => ({
  disponible: false, jour, phase: "fondations", phaseNom: PHASES[0].nom, phaseReplique: PHASES[0].replique, joursAvant: null, niveau: 1, budget: null, revoir: null, cap: null, prochaine: null,
  trame: [], contrats: [], trio: { fait: false, xp: 0, faits: 0, total: 0, changementPossible: false }, hebdo: [], debrief: null, branches: [], longCours: [], filRouge: { chapitres: [], aVenir: true }, exploits: [],
  possessions: [], collection: null, stats: { faites: 0, total: 0, xpCodex: 0 }, devoile: null, devoileNouveaux: [], nouvelles: [], retro: null, suite: null, seance: null,
  moment: "courant", tampons: null, malle: null, recap: null, sobre: false, aRecuperer: [], faitAujourdhui: FAIT_VIDE,
});

let NOMS_COSMETIQUES: Map<string, string> | null = null;
/** Le nom lisible d'une pièce ou d'un titre du Codex (« banniere:carnet » → « Carnet de Léonard »). */
function nomDe(cle: string): string | undefined {
  NOMS_COSMETIQUES ??= new Map([...COSMETIQUES_CODEX, ...titresMaitres()].map((c) => [c.cle, c.nom]));
  return NOMS_COSMETIQUES.get(cle);
}

/**
 * Une quête telle que l'écran l'affiche. `dest` : le contexte du résolveur et
 * les paramètres (contrat) ; sans lui, pas de destination (aperçus, tests).
 */
export function ligneDe(s: EtatQuete, dest?: { ctx: ContexteDestination; params: ContratTire["params"] }): LigneQuete {
  const q = s.quete;
  const l = s.ligne;
  const ev = s.ev;
  const ouverte = s.ouverte && !s.fait && affichage(s) === "complet";
  const destination = dest && ouverte ? destinationDe(q, dest.params, dest.ctx, ev ?? undefined) : null;
  const valeur = s.fait ? (ev?.cible ?? l?.cible ?? 1) : (ev?.valeur ?? Number(l?.progression ?? 0));
  const cible = ev?.cible ?? l?.cible ?? 1;
  return {
    id: q.id,
    periode: s.periode,
    famille: q.famille,
    titre: q.titre,
    consigne: q.consigne,
    ...(q.pourquoi ? { pourquoi: q.pourquoi } : {}),
    etat: s.fait ? "terminee" : s.ouverte ? (valeur > 0 ? "active" : "disponible") : "verrouillee",
    affichage: affichage(s),
    ...(q.indice ? { indice: q.indice } : {}),
    valeur,
    cible,
    fraction: s.fait ? 1 : cible ? Math.max(0, Math.min(1, valeur / cible)) : 0,
    ...(!s.fait && ev?.baisse ? { baisse: ev.baisse } : {}),
    xp: q.miroir ? 0 : q.recompense.xp,
    xpVersee: l && (l.etat === "recompensee" || l.etat === "terminee") ? l.xp : null,
    ...(q.recompense.cosmetique ? { cosmetique: q.recompense.cosmetique, ...(nomDe(q.recompense.cosmetique) ? { cosmetiqueNom: nomDe(q.recompense.cosmetique) } : {}) } : {}),
    ...(q.recompense.titre ? { titreGagne: q.recompense.titre, ...(nomDe(q.recompense.titre) ? { titreNom: nomDe(q.recompense.titre) } : {}) } : {}),
    ...(q.recompense.folio ? { folio: q.recompense.folio, ...(nomDe(q.recompense.folio) ? { folioNom: nomDe(q.recompense.folio) } : {}) } : {}),
    retro: s.retro,
    termineeLe: l?.terminee_le ?? (s.fait && s.atteint ? s.atteint.toISOString() : null),
    aFeter: !!l && l.etat === "recompensee" && !l.vu && !l.retro && !q.miroir,
    ...(q.lien ? { lien: q.lien } : {}),
    ...(destination ? { destination } : {}),
    ...(q.duree ? { duree: q.duree } : {}),
    ...(q.optionnelle ? { optionnelle: true } : {}),
    ...(s.horsJeu ? { gelee: true } : {}),
    ...(s.differee ? { differee: true as const } : {}),
    ...(q.acte ? { acte: q.acte } : {}),
    ...(q.chaine ? { chaine: q.chaine } : {}),
    ...(q.palier ? { palier: q.palier } : {}),
    ...(q.matiere ? { matiere: q.matiere } : {}),
    ...(q.etape ? { etape: q.etape } : {}),
  };
}

/**
 * La vue une fois les fanfares de ces quêtes jouées (codex_vus) : plus rien à
 * fêter ni à réclamer pour elles, sans recalculer le Codex. Un id « acte:… »
 * éteint la fanfare de l'acte.
 */
export function vueSansFetes(v: VueCodex, quetes: string[]): VueCodex {
  const ids = new Set(quetes);
  const f = (l: LigneQuete): LigneQuete => (l.aFeter && ids.has(l.id) ? { ...l, aFeter: false } : l);
  return {
    ...v,
    prochaine: v.prochaine ? { ...v.prochaine, ligne: f(v.prochaine.ligne) } : null,
    trame: v.trame.map((a) => ({ ...a, aFeter: a.aFeter && !ids.has(`acte:${a.acte.id}`), quetes: a.quetes.map(f) })),
    contrats: v.contrats.map((c) => ({ ...c, ligne: f(c.ligne) })),
    hebdo: v.hebdo.map(f),
    debrief: v.debrief && f(v.debrief),
    branches: v.branches.map((b) => ({ ...b, etapes: b.etapes.map(f) })),
    longCours: v.longCours.map((c) => ({ ...c, paliers: c.paliers.map(f), courant: c.courant && f(c.courant), suivant: c.suivant && f(c.suivant) })),
    filRouge: { ...v.filRouge, chapitres: v.filRouge.chapitres.map((c) => ({ ...c, courant: c.courant && f(c.courant), suivant: c.suivant && f(c.suivant), recents: c.recents.filter((l) => !ids.has(l.id)) })) },
    exploits: v.exploits.map(f),
  };
}

/**
 * Quel cosmétique vient de quelles quêtes (ou de quel acte) : la possession se
 * déduit de ce qu'on a fait. Une pièce peut avoir plusieurs donneurs : la
 * quête retirée qui la donnait, et celle qui la donne aujourd'hui (V3 §8.1).
 */
export function donneurs(contenu: ContenuMatiere[] = contenuDuProgramme(), quetes: { id: string; recompense: { cosmetique?: string; titre?: string; folio?: string } }[] = []): Map<string, string[]> {
  const m = new Map<string, string[]>();
  const ajouter = (c: string | undefined, id: string) => {
    if (!c) return;
    const l = m.get(c) ?? [];
    if (!l.includes(id)) m.set(c, [...l, id]);
  };
  for (const a of ACTES) for (const c of [a.recompense.cosmetique, a.recompense.titre, a.recompense.folio]) ajouter(c, `acte:${a.id}`);
  for (const q of quetes) for (const c of [q.recompense.cosmetique, q.recompense.titre, q.recompense.folio]) ajouter(c, q.id);
  return m;
}

/**
 * Les matières à rattraper d'un acte ouvert sur « n branches à une étape »
 * (acte V : 8 sur 10 à leur séance ciblée) : celles dont la branche n'a pas
 * passé l'étape, une fois le seuil atteint ; [] sinon.
 */
function aRattraperDe(quetes: Quete[], r: Pick<Resultat, "etats">, contenu: ContenuMatiere[]): string[] {
  const p = quetes.flatMap((q) => q.prerequis).find((x): x is Extract<Prerequis, { k: "branches" }> => x.k === "branches");
  if (!p) return [];
  const etape = (k: string) => r.etats.find((s) => s.quete.famille === "branche" && s.quete.matiere === k && s.quete.etape === p.etape && s.periode === "");
  // une branche sans l'étape (ou dont l'étape est hors jeu) compte pour faite, comme pour le prérequis
  const manquent = contenu.filter((m) => {
    const s = etape(m.key);
    return !!s && !s.fait && !s.horsJeu;
  });
  return contenu.length - manquent.length >= p.n ? manquent.map((m) => m.key) : [];
}

/**
 * Ce qui manque à une quête verrouillée (V3 §10.1) : une ligne par prérequis
 * pas rempli, et les sceaux de la carte à allumer. Lu dans l'évaluation (les
 * quêtes faites, les actes clos), avec les mêmes règles que le moteur : une
 * quête hors jeu ne bloque rien, une quête souple ne bloque qu'après
 * l'examen, une branche sans l'étape compte pour faite.
 */
export function manqueDe(
  q: Pick<Quete, "prerequis">,
  r: Pick<Resultat, "etats" | "actesClos">,
  contenu: ContenuMatiere[],
  o: { apres: boolean; joursAvant: number | null },
): { manque: string[]; allume: string[] } {
  const manque: string[] = [];
  const allume: string[] = [];
  const etatDe = (id: string) => r.etats.find((s) => s.quete.id === id && s.periode === "");
  for (const p of q.prerequis) {
    switch (p.k) {
      case "quete": {
        const s = etatDe(p.id);
        if (!s || s.fait || s.horsJeu || (p.souple && !o.apres)) break;
        allume.push(p.id);
        manque.push(`D'abord : « ${s.quete.titre} »`);
        break;
      }
      case "acte": {
        if (r.actesClos.includes(p.id)) break;
        const a = ACTES.find((x) => x.id === p.id);
        if (!a) break;
        allume.push(`acte:${p.id}`);
        manque.push(`Clore ${a.numero === 0 ? "le prologue" : a.numero >= 99 ? "l'épilogue" : `l'acte ${romain(a.numero)}`}`);
        break;
      }
      case "branches":
      case "toutesBranches": {
        const pas = contenu.flatMap((m) => {
          const s = r.etats.find((x) => x.quete.famille === "branche" && x.quete.matiere === m.key && x.quete.etape === p.etape && x.periode === "");
          return s && !s.fait && !s.horsJeu ? [{ m, s }] : [];
        });
        const n = p.k === "branches" ? p.n : contenu.length;
        const faites = contenu.length - pas.length;
        if (faites >= n) break;
        for (const x of pas) allume.push(x.s.quete.id);
        const liste = pas.map((x) => x.m.court).join(", ");
        const tete = `${CODEX.branches.etapes[p.etape]} : ${faites} matière${faites > 1 ? "s" : ""} sur ${n}`;
        manque.push(pas.length === n - faites ? `${tete}, il manque ${liste}` : `${tete}, encore ${n - faites} parmi ${liste}`);
        break;
      }
      case "joursAvantExamen":
        if (o.joursAvant === null) manque.push(`S'ouvre à J-${p.max}, une fois ta date d'examen posée`);
        else if (o.joursAvant > p.max) manque.push(`S'ouvre à J-${p.max}`);
        break;
      case "apresExamen":
        if (!o.apres) manque.push("S'ouvre après l'examen");
        break;
      // un état mesuré, ou l'une de plusieurs conditions : la consigne le dit déjà
      default:
        break;
    }
  }
  return { manque, allume };
}

export function construireVue(
  e: Entree,
  r: Resultat,
  reco: Recommandation | null,
  extra: { devoile: EtatDevoilement | null; nouvelles?: VueCodex["nouvelles"]; retro?: VueCodex["retro"]; changementFait?: boolean; joueur?: string; malle?: string[]; sobre?: boolean },
): VueCodex {
  const contenu = e.contenu ?? contenuDuProgramme();
  const ctx = contexteDestination(e, r);
  // un miroir dit avec quelle quête il compte (V3 §8.2)
  const titres = new Map(r.etats.map((s) => [s.quete.id, s.quete.titre]));
  // une quête verrouillée dit ce qui lui manque et allume ses prérequis (V3 §10.1)
  const apres = apresExamenDe(e);
  const joursAvant = joursAvantExamen(e.jour, e.jourJ);
  const ligne = (s: EtatQuete): LigneQuete => {
    const l = ligneDe(s, { ctx, params: parametresDe(e, s) });
    const titre = s.quete.miroir ? titres.get(s.quete.miroir) : undefined;
    const avec = s.quete.miroir && titre ? { ...l, compteeAvec: { id: s.quete.miroir, titre } } : l;
    if (avec.etat !== "verrouillee" || avec.affichage === "cache" || avec.affichage === "indice") return avec;
    const m = manqueDe(s.quete, r, contenu, { apres, joursAvant });
    return m.manque.length ? { ...avec, manque: m.manque, ...(m.allume.length ? { allume: m.allume } : {}) } : avec;
  };
  // hors jeu et jamais commencée (mesure inconnue, V3 §8) : rien à montrer ; commencée, elle reste, gelée
  const lignes = r.etats.filter((s) => !s.masquee).map((s) => ({ s, l: ligne(s) }));
  const unique = lignes.filter((x) => x.s.quete.repetition === "unique");
  const phase = PHASES.find((p) => p.phase === r.phase) ?? PHASES[0];

  const trame: VueActe[] = actesDuJoueur(e).map((a) => {
    const quetes = unique.filter((x) => x.s.quete.famille === "trame" && x.s.quete.acte === a.id).sort((p, q) => p.s.quete.ordre - q.s.quete.ordre).map((x) => x.l);
    const clos = r.actesClos.includes(a.id);
    const comptees = quetes.filter((x) => !x.optionnelle && !x.gelee);
    const ligneActe = e.progression.find((l) => l.quete_id === `acte:${a.id}`);
    const aFeter = !!ligneActe && ligneActe.etat === "recompensee" && !ligneActe.vu && !ligneActe.retro;
    // un acte clos avec n quêtes (l'acte I : 4 outils sur 7) se compte sur n
    const n = a.closAvec ? Math.min(a.closAvec.n, quetes.filter((x) => !x.gelee).length) : null;
    const faites = n !== null ? Math.min(n, quetes.filter((x) => x.etat === "terminee").length) : comptees.filter((x) => x.etat === "terminee").length;
    const aRattraper = aRattraperDe(r.etats.filter((s) => s.quete.famille === "trame" && s.quete.acte === a.id).map((s) => s.quete), r, contenu);
    return { acte: a, clos, courant: r.acteCourant?.id === a.id, faites, total: n ?? comptees.length, quetes, replique: clos ? a.cloture : a.ouverture, aFeter, aRattraper };
  });

  const contrats: VueContrat[] = r.contrats
    .filter((i) => i.emplacement)
    .map((i) => {
      const s = r.etats.find((x) => x.quete.id === i.quete.id && x.periode === i.periode)!;
      const l = ligne(s);
      return { emplacement: i.emplacement!, modele: i.quete.id.split(":")[1], ligne: l, changeable: !extra.changementFait && l.etat !== "terminee" };
    });
  const faitsDuJour = contrats.filter((c) => c.ligne.etat === "terminee").length;

  const hebdo = lignes.filter((x) => x.s.quete.famille === "contrat" && x.s.quete.repetition === "hebdomadaire" && x.l.affichage !== "cache").map((x) => x.l);
  // le débrief : visible quand un blanc l'attend (prérequis d'état), ou fait aujourd'hui
  const debrief = lignes.find((x) => x.s.quete.id === QUETE_DEBRIEF.id && x.s.periode === e.jour && x.l.affichage !== "cache")?.l ?? null;

  // le cap : la maîtrise des matières, sans J-n pour un programme sans examen (V3 §4.6)
  const M = e.lecture.mesures;
  const maitrise = maitriseDuCodex(contenu, M);
  const joursAvantDate = programmeActif(e.programmes).examen ? joursAvantExamen(e.jour, e.jourJ) : null;
  const cap = capDe(maitrise, { jour: e.jour, joursAvant: joursAvantDate, destination: (m) => destinationCoince(ctx, m) });
  // le calendrier (V3 §7) : la veillée, la malle, le jour J, le lendemain ; jamais sans date
  const moment = momentDe(joursAvantDate, r.phase);
  const debut = (e.programmes ?? []).find((p) => p.statut === "actif")?.debut ?? null;

  const branches: VueBranche[] = contenu.map((m) => {
    const etapes = unique
      .filter((x) => x.s.quete.famille === "branche" && x.s.quete.matiere === m.key)
      .sort((p, q) => ETAPES.indexOf(p.s.quete.etape!) - ETAPES.indexOf(q.s.quete.etape!))
      .map((x) => x.l);
    const comptees = etapes.filter((x) => !x.optionnelle && !x.gelee);
    // la pastille (V3 §10.1) : la maîtrise, l'encre qui pâlit, les notions en feuilles
    const mm = maitrise.matieres.find((x) => x.cle === m.key);
    const notions = notionsDeMatiere(m.key).map((n) => {
      const t = M.notions_tenues?.[n.id];
      return { id: n.id, court: n.court, etat: etatNotion(t?.n ?? M.notions?.[n.id] ?? 0, t ? t.j5 : null) };
    });
    return {
      contenu: m,
      etapes,
      faites: comptees.filter((x) => x.etat === "terminee").length,
      total: comptees.length,
      maitre: etapes.some((x) => x.etape === "maitre" && x.etat === "terminee"),
      maitrise: { pct: mm?.pct ?? null, statut: mm?.statut ?? "non_mesuree", zone: mm?.zone ?? null, n: mm?.n ?? 0, jours: joursDepuis(mm?.derniere ?? null, e.jour) },
      notions,
    };
  });

  const longCours: VueChaine[] = CHAINES.map((c) => {
    const paliers = unique.filter((x) => x.s.quete.chaine === c.id).sort((p, q) => (p.s.quete.palier ?? 0) - (q.s.quete.palier ?? 0)).map((x) => x.l);
    const faits = paliers.filter((x) => x.etat === "terminee").length;
    return { chaine: c, paliers, faits, courant: paliers.find((x) => x.etat !== "terminee") ?? null, suivant: paliers.filter((x) => x.etat !== "terminee")[1] ?? null };
  }).filter((c) => c.paliers.length > 0);

  // le fil rouge : par chapitre, le premier palier pas encore fait (sans la capacité « fil », rien n'est écrit : « à venir »)
  const recompenses = paliersRecompenses(e.progression);
  const aVenir = !capacitesDe(e).fil;
  const filRouge: VueFilRouge = {
    aVenir,
    chapitres: CHAPITRES_FIL.map((c) => {
      const paliers = unique
        .filter((x) => x.s.quete.famille === "fil" && palierFilDe(x.s.quete.id)?.chapitre === c.id)
        .sort((p, q) => (p.s.quete.palier ?? 0) - (q.s.quete.palier ?? 0))
        // « à venir » : aucune XP annoncée (le détail n'affiche pas « +n XP » à zéro)
        .map((x) => (aVenir ? { ...x.l, xp: 0 } : x.l));
      const restants = paliers.filter((x) => x.etat !== "terminee");
      // tamponnés : ceux de la base, et ceux que ce calcul vient de remplir (écrits avec lui) ; « à venir » : la base seule
      const faits = Math.max(recompenses[c.id] ?? 0, ...(aVenir ? [] : paliers.filter((x) => x.etat === "terminee").map((x) => x.palier ?? 0)));
      return { id: c.id, titre: c.titre, pourquoi: c.pourquoi, faits, courant: restants[0] ?? null, suivant: restants[1] ?? null, recents: paliers.filter((x) => x.aFeter) };
    }),
  };

  const exploits = unique.filter((x) => x.s.quete.famille === "exploit" && x.l.affichage !== "cache").sort((p, q) => p.s.quete.ordre - q.s.quete.ordre).map((x) => x.l);

  // les donneurs : les quêtes suivies, et les retirées du catalogue (une pièce gagnée reste possédée, V3 §8.1)
  const retirees = (e.catalogue ?? catalogueCodex(contenu)).filter((q) => q.retiree);
  const par = donneurs(contenu, [...r.etats.map((s) => s.quete), ...retirees]);
  const noms = new Map<string, CosmetiqueCodex>([...COSMETIQUES_CODEX, ...titresMaitres(contenu)].map((c) => [c.cle, c]));
  const faitesPar = new Map(e.progression.filter((l) => l.etat === "recompensee").map((l) => [l.quete_id, l]));
  // une pièce qui attend « Récupérer » n'est pas encore possédée (elle n'est portable qu'après le clic)
  const enAttente = new Set(e.progression.filter((l) => l.etat === "terminee").map((l) => l.quete_id));
  const possessions: Possession[] = [];
  for (const [cle, ids] of par) {
    const c = noms.get(cle);
    if (!c) continue;
    for (const id of ids) {
      const l = faitesPar.get(id) ?? (!enAttente.has(id) && r.etats.find((s) => s.quete.id === id && s.fait && !s.quete.miroir) ? { terminee_le: null, retro: false } : null);
      if (!l) continue;
      possessions.push({ cle, type: c.type, nom: c.nom, quete: id, le: l.terminee_le, retro: !!l.retro });
      break;
    }
  }

  // le fil rouge, sans fin, n'entre pas dans le compte du Codex (il a sa section), ni une quête hors jeu (V3 §8)
  const comptee = (s: EtatQuete) => s.quete.famille !== "contrat" && s.quete.famille !== "fil" && !s.horsJeu;
  const faites = r.etats.filter((s) => s.fait && comptee(s)).length;
  const ligneReco = reco ? lignes.find((x) => x.s.quete.id === reco.quete.id && x.s.periode === reco.periode)?.l : null;

  // « Récupérer » : ce qui attend le clic, et ce qui est fait aujourd'hui (un miroir compte avec sa quête payeuse)
  const titresActes = new Map(actesDuJoueur(e).map((a) => [`acte:${a.id}`, a.titre]));
  const miroirs = new Set(r.etats.filter((s) => s.quete.miroir).map((s) => s.quete.id));
  const titreDe = (id: string) => titres.get(id) ?? titresActes.get(id) ?? titreHorsVue(id);
  const recompenseDe = (cle: string | null) => {
    const c = cle ? noms.get(cle) : undefined;
    return c ? nomRecompense(c) : null;
  };
  const aRecuperer = aRecupererDe(e.progression, { titre: titreDe, recompense: recompenseDe, sobre: !!extra.sobre, ignorer: (id) => miroirs.has(id) });
  const faitAujourdhui = faitAujourdhuiDe(e.progression, e.jour, { titre: titreDe, attente: new Set(aRecuperer.map(cleRecuperer)), ignorer: (id) => miroirs.has(id) });
  return {
    disponible: true,
    jour: e.jour,
    phase: r.phase,
    phaseNom: phase.nom,
    phaseReplique: e.jourJ === null ? (phase.sansDate ?? phase.replique) : phase.replique,
    joursAvant: joursAvantExamen(e.jour, e.jourJ),
    niveau: r.niveau,
    budget: budgetDuJour(e),
    revoir: revoirDe(e),
    cap,
    prochaine: reco && ligneReco ? { ...reco, ligne: ligneReco } : null,
    trame,
    contrats,
    trio: { fait: r.trioFait, xp: 50, faits: faitsDuJour, total: contrats.length, changementPossible: !extra.changementFait && contrats.some((c) => c.changeable) },
    hebdo,
    debrief,
    branches,
    longCours,
    filRouge,
    exploits,
    possessions,
    collection: extra.joueur ? `/people/${extra.joueur}?onglet=sceaux#profil-onglets` : null,
    stats: { faites, total: r.etats.filter((s) => comptee(s) && !s.quete.optionnelle).length, xpCodex: e.progression.reduce((s, l) => s + (l.etat === "recompensee" ? l.xp : 0), 0) },
    devoile: extra.devoile,
    devoileNouveaux: devoileNouveaux(extra.devoile),
    nouvelles: extra.nouvelles ?? [],
    retro: extra.retro ?? null,
    suite: suiteVue(e),
    seance: null,
    moment,
    tampons: moment === "veillee" && joursAvantDate !== null ? tamponsVeillee(e.jour, joursAvantDate, M.jours) : null,
    malle: moment === "malle" ? { coches: extra.malle ?? [] } : null,
    recap: moment === "lendemain" ? recapDe({ programme: programmeActif(e.programmes).nom, debut, jourJ: e.jourJ, jours: M.jours ?? [], maitrise, raturesScellees: M.ratures_scellees, trophees: M.trophees }) : null,
    sobre: extra.sobre ?? false,
    aRecuperer,
    faitAujourdhui,
  };
}

/** Ce qui vient d'être dévoilé, avec la seule réplique de chaque vague (V3 §11.3). */
function devoileNouveaux(d: EtatDevoilement | null | undefined): VueCodex["devoileNouveaux"] {
  const nouveaux = d?.nouveaux ?? [];
  if (!d || !nouveaux.length) return [];
  const avant = d.devoile === "tout" ? [] : d.devoile.filter((id) => !nouveaux.includes(id));
  const parlent = repliquesDeVague(nouveaux, avant);
  return nouveaux.flatMap((id) => {
    const l = DECOUVERTE.find((x) => x.id === id);
    return l ? [{ id: l.id, quoi: l.quoi, libelle: l.libelle, replique: parlent.has(l.id) ? l.replique : null }] : [];
  });
}

/** « La route de Milan » : le programme suivant annoncé (pas encore public : aucun bouton), ou proposé. */
function suiteVue(e: Pick<Entree, "programmes">): VueCodex["suite"] {
  const s = suiteDe(e.programmes);
  if (!s) return null;
  return {
    programme: s.cle,
    court: s.court,
    annonce: s.public ? `${nomEnTete(s)} t'attend : la route de Milan continue.` : `${nomEnTete(s)} arrive. Ton fil rouge continue d'ici là.`,
    ouvrable: s.public,
  };
}
