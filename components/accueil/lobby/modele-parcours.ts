import { initials } from "@/components/classement/format";
import { dateCourte, dateJour, matieresA, mesureeA, mesuresDuJour, preparationA, type PointHistorique } from "@/components/moi/synthese/modele";
import { SEMAINES, SEMAINES_TELEPHONE, casesCarnet, debutCarnet, joursDEncre, niveau } from "@/components/profil/blocs/Carnet";
import type { VueCodex } from "@/lib/codex/vue";
import { parisDay } from "@/lib/daily";
import type { Maitrise } from "@/lib/maitrise";
import { decaleJour, joursEntre } from "@/lib/objectif-calc";
import { dorures, remplie, sceauxGagnes, type Acquis, type Condition } from "@/lib/profil/acquis";
import type { Piece } from "@/lib/profil/pieces";
import { TIERS, rankFor } from "@/lib/ranks";
import { sourcesAuMoins, tropheesAuMoins } from "@/lib/trophees";
import { NBSP } from "@/lib/voice";
import { PARC } from "@/lib/voice-accueil-lobby-parcours";
import { COURTS_FR, type Segment } from "@/lib/voice-moi";
import { photoDe } from "./modele-direct";
import type { AmisLobby, CarnetLobby, DeblocageLobby, GrandeSalleLobby, NouveauLobby, NouveauteRelance, QueteLobby, RecordLobby, ScoresLobby } from "./types";

// Le modèle des cartes « parcours » de l'accueil « Le lobby » (lot 5) : Tes
// meilleurs scores, Prochain déblocage, Ta prochaine quête, La Grande Salle,
// Du nouveau, Tes amis et Ton carnet de jours. Tout le calcul, pur (aucune
// lecture, aucun hook), pour qu'il se teste sans base ; les lectures sont dans
// lecture-parcours.ts. Aucun `Intl` ni `toLocaleString` : les nombres et les
// dates s'écrivent à la main (lib/voice.ts, components/moi/synthese/modele.ts),
// pour que le serveur et le navigateur rendent la même chaîne (hydratation).

// ── Le déblocage tel que la carte le reçoit (l'unité de la barre est dans le contrat : types.ts) ──

export type DeblocageVue = DeblocageLobby;

// ── Les deux affiches (cartes d'illustration pures : une peinture, une légende, aucun lien) ──

/** « rival » : celle qui prend la place de la ligue (rangée du rival) ; « scores » : celle de la rangée des scores. Définies avec le contrat (modele.ts). */
export { AFFICHES } from "./modele";

// ── Dates ───────────────────────────────────────────────────────────────────

/** « le 12 oct. », « le 3 mars 2025 » (l'année quand ce n'est pas celle d'aujourd'hui), ou « aujourd'hui ». */
export function quandLe(jour: string, aujourdhui: string): string {
  if (jour === aujourdhui) return PARC.scores.aujourdhui;
  const an = jour.slice(0, 4);
  return PARC.scores.le(dateCourte(jour) + (an !== aujourdhui.slice(0, 4) ? ` ${an}` : ""));
}

const JOURS_SEMAINE = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
/** Le jour de la semaine d'un jour de calendrier (« vendredi »). */
export const jourDeSemaine = (jour: string): string => JOURS_SEMAINE[new Date(jour + "T12:00:00Z").getUTCDay()] ?? "";

// ═══════════════════════════════════════════════════════════════════════════
// Tes meilleurs scores
// ═══════════════════════════════════════════════════════════════════════════

/** Une copie aux 30 du jour (une ligne de daily_attempts, ou d'getDailyHistory). */
export type CopieLue = { day: string; score: number | null; total: number | null };

/** La meilleure copie : le plus haut score rapporté au total ; à égalité, la plus récente. Aucune copie rendue : null. */
export function recordCopie(copies: readonly CopieLue[], aujourdhui: string): RecordLobby {
  let meilleure: { c: CopieLue; score: number; total: number } | null = null;
  for (const c of copies) {
    if (c.score === null || !Number.isFinite(c.score) || c.score < 0) continue;
    const total = c.total !== null && c.total > 0 ? c.total : 30;
    if (!meilleure) {
      meilleure = { c, score: c.score, total };
      continue;
    }
    const a = c.score / total;
    const b = meilleure.score / meilleure.total;
    if (a > b || (a === b && c.score > meilleure.score) || (a === b && c.score === meilleure.score && c.day > meilleure.c.day)) meilleure = { c, score: c.score, total };
  }
  if (!meilleure) return null;
  return { val: String(meilleure.score), unite: `/${meilleure.total}`, detail: [quandLe(meilleure.c.day, aujourdhui)] };
}

/**
 * La meilleure maîtrise globale (la préparation, comme la page Moi) sur les dates
 * de maitrise_synthese et aujourd'hui, avec la meilleure matière de ce jour-là.
 * `histo` null (pas de clé de service, migration pas collée) : la maîtrise du jour
 * seule. Rien de mesuré : null. À égalité, la plus récente.
 */
export function recordMaitrise(histo: PointHistorique[] | null, m: Maitrise | null, aujourdhui: string): RecordLobby {
  const points: PointHistorique[] = [...(histo ?? []), ...(m ? [{ jour: aujourdhui, matieres: mesuresDuJour(m) }] : [])];
  let meilleur: { pct: number; point: PointHistorique } | null = null;
  for (const p of points) {
    if (!mesureeA(p.matieres)) continue;
    const pct = preparationA(p.matieres);
    if (pct <= 0) continue;
    if (!meilleur || pct > meilleur.pct || (pct === meilleur.pct && p.jour >= meilleur.point.jour)) meilleur = { pct, point: p };
  }
  if (!meilleur) return null;
  const quand = quandLe(meilleur.point.jour, aujourdhui);
  const mesurees = matieresA(meilleur.point.matieres).filter((x) => x.pct !== null);
  const haute = [...mesurees].sort((a, b) => (b.pct as number) - (a.pct as number) || b.poids - a.poids)[0];
  const detail: Segment[] = haute ? [PARC.scores.meilleureMatiere(quand, COURTS_FR[haute.cle] ?? haute.court), { b: PARC.scores.pct(haute.pct as number) }] : [quand];
  return { val: String(meilleur.pct), unite: `${NBSP}%`, detail };
}

/** Un résultat d'examen blanc (mock_exam_results), son jour de Paris déjà calculé. */
export type ResultatBlanc = { examId: string; score: number | null; total: number | null; jour: string | null };

/** Le meilleur examen blanc : le plus haut pourcentage (score / total) ; à égalité, le plus récent. Aucun examen passé : null. */
export function meilleurResultatBlanc(lignes: readonly ResultatBlanc[]): { examId: string; pct: number; jour: string | null } | null {
  let meilleur: { r: ResultatBlanc; ratio: number } | null = null;
  for (const r of lignes) {
    if (r.score === null || r.total === null || !(r.total > 0) || r.score < 0) continue;
    const ratio = r.score / r.total;
    if (!meilleur || ratio > meilleur.ratio || (ratio === meilleur.ratio && (r.jour ?? "") > (meilleur.r.jour ?? ""))) meilleur = { r, ratio };
  }
  return meilleur ? { examId: meilleur.r.examId, pct: Math.round(100 * meilleur.ratio), jour: meilleur.r.jour } : null;
}

/** Le record de l'examen blanc : « 71 % », « examen blanc n° 3, le 19 oct. ». */
export function recordExamen(meilleur: { pct: number; jour: string | null } | null, titre: string | null, aujourdhui: string): RecordLobby {
  if (!meilleur) return null;
  const quand = meilleur.jour ? quandLe(meilleur.jour, aujourdhui) : null;
  const detail = titre && quand ? PARC.scores.examenLe(titre, quand) : (titre ?? quand ?? "");
  return { val: String(meilleur.pct), unite: `${NBSP}%`, detail: detail ? [detail] : [] };
}

/**
 * Le meilleur rang atteint : le plus haut ELO de rating_events (sans le verrou de
 * maîtrise, comme le pic du profil), dit en palier et division. `eloMax` null : aucun
 * match classé. `pic` : l'index du palier atteint (ProfilStats.picAtteint), pour le
 * seul cas où les matchs ne se lisent pas (la lecture a échoué) ; sans ELO, le palier
 * seul.
 */
export function recordRang(eloMax: { elo: number; jour: string | null } | null, pic: number | null, aujourdhui: string): RecordLobby {
  if (eloMax && Number.isFinite(eloMax.elo)) {
    const r = rankFor(Math.round(eloMax.elo), null);
    const palier = `${r.tier.name}${r.division ? " " + r.division : ""}`;
    const elo = PARC.scores.elo(Math.round(eloMax.elo));
    return { val: palier, unite: null, detail: [eloMax.jour ? `${elo} · ${quandLe(eloMax.jour, aujourdhui)}` : elo] };
  }
  if (pic !== null && TIERS[pic]) return { val: TIERS[pic].name, unite: null, detail: [] };
  return null;
}

/** La carte « Tes meilleurs scores » : quatre records, chacun peut manquer ; tous absents : la carte disparaît (null). */
export function scoresDe(r: { copie: RecordLobby; maitrise: RecordLobby; examen: RecordLobby; rang: RecordLobby }): ScoresLobby | null {
  return r.copie || r.maitrise || r.examen || r.rang ? { copie: r.copie, maitrise: r.maitrise, examen: r.examen, rang: r.rang } : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Prochain déblocage
// ═══════════════════════════════════════════════════════════════════════════

type CleUnite = keyof typeof PARC.deblocage.unites;
/** Où en est le joueur d'une condition : `fait` sur `total`, en `unite` (le libellé est dans la voix). */
export type Avancement = { fait: number; total: number; unite: CleUnite };

const borne = (fait: number, total: number) => Math.max(0, Math.min(total, Math.floor(fait)));
const ratioDe = (a: Avancement) => a.fait / a.total;

/** L'avancement le plus bas (le facteur qui limite) ; le premier à égalité. */
const leMoinsAvance = (liste: Avancement[]): Avancement => liste.reduce((m, x) => (ratioDe(x) < ratioDe(m) ? x : m));
/** L'avancement le plus haut (l'alternative la plus proche) ; le premier à égalité. */
const lePlusAvance = (liste: Avancement[]): Avancement | null => (liste.length ? liste.reduce((m, x) => (ratioDe(x) > ratioDe(m) ? x : m)) : null);

/**
 * L'avancement vers une condition de pièce, quand il se mesure : questions
 * posées, sceaux gagnés, sceaux à la dorure, mesure d'un sceau (jours, victoires…),
 * trophées. Les conditions binaires (le pic de palier, une quête du Codex, un fil
 * rouge, un programme mené) n'ont pas de « 3 sur 5 » : null. « L'un de » : la
 * condition la plus avancée parmi celles qui se mesurent.
 */
export function avancementDe(c: Condition | null, a: Acquis): Avancement | null {
  if (!c) return null;
  switch (c.k) {
    case "questions":
      return c.n > 0 ? { fait: borne(a.questions, c.n), total: c.n, unite: "questions" } : null;
    case "dorures":
      return c.n > 0 ? { fait: borne(dorures(a), c.n), total: c.n, unite: "dorures" } : null;
    case "sceaux":
      return c.n > 0 ? { fait: borne(sceauxGagnes(a), c.n), total: c.n, unite: "sceaux" } : null;
    case "sceau": {
      const e = a.sceaux.find((x) => x.def.cle === c.cle);
      const seuil = e?.def.seuils[c.palier - 1];
      if (!e || e.inconnu || !seuil || seuil <= 0) return null;
      return { fait: borne(e.valeur, seuil), total: seuil, unite: e.def.unite };
    }
    case "trophees": {
      if (!a.trophees || c.n <= 0) return null;
      const lignes = a.trophees.lignes;
      const mesures: Avancement[] = [{ fait: borne(tropheesAuMoins(lignes, c.palier, c.source), c.n), total: c.n, unite: "trophees" }];
      if (c.sources != null && c.sources > 0) mesures.push({ fait: borne(sourcesAuMoins(lignes, c.palier).length, c.sources), total: c.sources, unite: "sources" });
      return leMoinsAvance(mesures);
    }
    case "unDe":
      return lePlusAvance(c.conditions.map((x) => avancementDe(x, a)).filter((x): x is Avancement => x !== null));
    case "pic":
    case "codex":
    case "fil":
    case "programme":
      return null;
  }
}

/** Ce que la sélection du déblocage lit d'une pièce (un sous-ensemble de Piece, lib/profil/pieces.ts). */
export type PieceEnCours = Pick<Piece, "cle" | "type" | "nom" | "condition" | "ordre">;

/**
 * La pièce non possédée dont l'avancement est le plus avancé (moins que complet) :
 * la plus proche du joueur. À égalité, celle qui demande le moins ; puis l'ordre du
 * catalogue. Aucune pièce qui se mesure : null (la carte disparaît).
 */
export function choisirDeblocage(pieces: readonly PieceEnCours[], a: Acquis): DeblocageVue | null {
  let meilleure: { p: PieceEnCours; av: Avancement } | null = null;
  for (const p of pieces) {
    if (remplie(p.condition, a)) continue;
    const av = avancementDe(p.condition, a);
    if (!av || av.fait >= av.total) continue;
    if (!meilleure) {
      meilleure = { p, av };
      continue;
    }
    const x = ratioDe(av);
    const y = ratioDe(meilleure.av);
    const resteX = av.total - av.fait;
    const resteY = meilleure.av.total - meilleure.av.fait;
    if (x > y || (x === y && resteX < resteY) || (x === y && resteX === resteY && (p.ordre < meilleure.p.ordre || (p.ordre === meilleure.p.ordre && p.cle < meilleure.p.cle)))) meilleure = { p, av };
  }
  if (!meilleure) return null;
  const { p, av } = meilleure;
  const mots = PARC.deblocage.unites[av.unite];
  const reste = av.total - av.fait;
  return {
    nom: p.nom,
    type: p.type,
    fait: av.fait,
    total: av.total,
    reste: PARC.deblocage.reste(reste, mots[reste > 1 ? 1 : 0]),
    href: "/moi?onglet=pieces",
    unite: mots[av.total > 1 ? 1 : 0],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Ta prochaine quête
// ═══════════════════════════════════════════════════════════════════════════

/**
 * La quête que le Codex recommande (sa « prochaine »), sinon la première quête
 * de la semaine pas faite. Le Codex indisponible, ou rien à proposer : null. Le mode
 * sobre masque l'XP.
 */
export function queteLobby(vue: Pick<VueCodex, "disponible" | "prochaine" | "hebdo" | "sobre"> | null): QueteLobby | null {
  if (!vue || !vue.disponible) return null;
  const ligne = vue.prochaine?.ligne ?? vue.hebdo.find((l) => (l.etat === "disponible" || l.etat === "active") && l.affichage === "complet") ?? null;
  if (!ligne) return null;
  const cible = Math.max(1, Math.round(ligne.cible));
  // une quête « à faire baisser » : sa fraction dit où l'on en est (valeur et cible ne sont pas dans le même sens)
  const valeur = Math.min(cible, Math.max(0, Math.round(ligne.baisse ? ligne.fraction * cible : ligne.valeur)));
  const xp = vue.sobre || !(ligne.xp > 0) ? null : Math.round(ligne.xp);
  return { titre: ligne.titre, valeur, cible, xp, href: "/codex" };
}

// ═══════════════════════════════════════════════════════════════════════════
// La Grande Salle
// ═══════════════════════════════════════════════════════════════════════════

/** Le prochain examen blanc tel que la carte le lit (components/accueil/queries.ts, loadNextMockExam), son jour de Paris déjà calculé. */
export type ExamenLobby = { id: string; title: string; jourExamen: string; daysLeft: number; registered: boolean };

/** La bande : « Prochain examen blanc dans 6 jours », « <titre>, vendredi 7 novembre. ». Aucun examen à venir : null. */
export function grandeSalleDe(e: ExamenLobby | null): GrandeSalleLobby | null {
  if (!e) return null;
  return {
    titre: PARC.salle.dans(e.daysLeft),
    ligne: PARC.salle.ligne(e.title, jourDeSemaine(e.jourExamen), dateJour(e.jourExamen)),
    action: { href: `/mock-exams/${e.id}`, libelle: e.registered ? PARC.salle.ouvrir : PARC.salle.voir },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Du nouveau
// ═══════════════════════════════════════════════════════════════════════════

/** La phrase d'une nouvelle, sans le nom : « monte en Platine », « t'a battu 23–19 », « t'a dépassé de 8 points ». */
export function phraseNouveau(n: NouveauLobby): Segment[] {
  if (n.type === "relance") return PARC.nouveau.relance;
  if (n.type === "palier") return PARC.nouveau.palier(TIERS[n.palier]?.name ?? "");
  if (n.type === "victoire") return PARC.nouveau.victoire(n.score);
  return PARC.nouveau.depasse(n.ecart);
}

/** Le texte d'une phrase en segments, sans balise (pour l'étiquette lue à voix haute). */
export const texteDe = (segments: readonly Segment[]): string =>
  segments.map((g) => (typeof g === "string" ? g : "b" in g ? g.b : "marque" in g ? g.marque : g.neg)).join("");

/** Le bouton d'une ligne, honnête : une victoire sur toi → la revanche (le lobby des duels), un dépassement → le face-à-face, un palier → son profil. */
export function actionNouveau(n: NouveauLobby): { href: string; libelle: string } {
  if (n.type === "relance") return { href: `/duel?adversaire=${n.joueur.id}`, libelle: PARC.nouveau.defier };
  if (n.type === "victoire") return { href: `/duel?adversaire=${n.joueur.id}`, libelle: PARC.nouveau.revanche };
  if (n.type === "depasse") return { href: `/people/${n.joueur.id}?onglet=face-a-face#profil-onglets`, libelle: PARC.nouveau.voir };
  return { href: `/people/${n.joueur.id}`, libelle: PARC.nouveau.profil };
}

/** « aujourd'hui », « hier », « avant-hier », « il y a 3 j » : l'écart en jours de Paris. */
export const quandNouveau = (jour: string, aujourdhui: string): string => PARC.nouveau.quand(Math.max(0, joursEntre(jour, aujourdhui)));

/** Ce qui s'écrit à droite de la ligne : « ce matin » pour une relance (dit au serveur), sinon l'écart en jours. */
export const quandDe = (n: NouveauLobby, aujourdhui: string): string => (n.type === "relance" ? n.quand : quandNouveau(n.jour, aujourdhui));

/** Une relance reçue (lecture-rival : lireRelancesRecues) en ligne de « Du nouveau » ; le jour est celui de Paris. */
export function nouveauteRelance(r: { de: string; nom: string; creeLe: string; quand: string }): NouveauteRelance {
  return { type: "relance", cle: `relance-${r.de}-${r.creeLe}`, jour: parisDay(new Date(r.creeLe)), joueur: { id: r.de, nom: r.nom, avatarUrl: null }, quand: r.quand };
}

/** Au plus cinq lignes dans la carte. */
export const NOUVEAU_MAX = 5;

/**
 * Les relances reçues d'abord (elles datent d'aujourd'hui ou d'hier, le plus récent),
 * puis les nouvelles des amis, cinq au plus. Rien de l'un ni de l'autre : null (la carte n'est pas posée).
 */
export function fusionnerNouveau(amis: readonly NouveauLobby[] | null, relances: readonly NouveauLobby[] | null): NouveauLobby[] | null {
  const liste = [...(relances ?? []), ...(amis ?? [])].slice(0, NOUVEAU_MAX);
  return liste.length ? liste : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Tes amis
// ═══════════════════════════════════════════════════════════════════════════

export const VISAGES = 3;
/** Un ami tel que la lecture le rend : `avatarUrl`, sa photo de profil (absente ou null : ses initiales). */
export type AmiLu = { id: string; name: string; avatarUrl?: string | null };

/** Le premier mot d'un nom (« Lucas M. » → « Lucas »). */
export const prenomDe = (nom: string): string => nom.trim().split(/\s+/)[0] || nom;

/**
 * Tes amis : le compte, qui est en ligne (null quand la présence ne se lit pas :
 * la carte dit alors « 14 amis »), trois visages (les amis en ligne d'abord, dans
 * l'ordre de la liste ; la photo de profil quand l'ami en a une), les demandes en attente.
 * @param enLigne les identifiants en ligne ; null : présence illisible
 */
export function amisLobby(o: { amis: readonly AmiLu[]; total: number; enLigne: ReadonlySet<string> | null; demandes: number }): AmisLobby {
  const en = (id: string) => !!o.enLigne && o.enLigne.has(id);
  const tries = [...o.amis.filter((a) => en(a.id)), ...o.amis.filter((a) => !en(a.id))];
  return {
    total: Math.max(o.total, o.amis.length),
    enLigne: o.enLigne ? o.amis.filter((a) => en(a.id)).length : null,
    visages: tries.slice(0, VISAGES).map((a) => ({ id: a.id, nom: prenomDe(a.name), initiales: initials(a.name), avatarUrl: photoDe(a.avatarUrl), enLigne: en(a.id) })),
    demandes: Math.max(0, o.demandes),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Ton carnet de jours
// ═══════════════════════════════════════════════════════════════════════════

/** Ce que la carte sait de la journée en cours : les traits répondus et l'objectif (pour l'infobulle de la case du jour). */
export type AujourdhuiCarnet = { traits: number; objectif: number };

/** Le carnet du joueur, d'après l'essentiel du profil (lireEssentiel) ; `seuilJour` : les questions d'un jour d'encre quand la série d'encre existe. */
export function carnetDe(e: { jours: [string, number][]; aujourdhui: string; stats: { serie: number; meilleureSerie: number; serieEncre?: boolean } }, seuilJour: number): CarnetLobby {
  return { jours: e.jours, aujourdhui: e.aujourdhui, serie: e.stats.serie, record: e.stats.meilleureSerie, seuil: e.stats.serieEncre ? seuilJour : null };
}

export type CaseVue = { jour: string; niveau: 0 | 1 | 2 | 3 | 4; avenir: boolean; auj: boolean; ancien: boolean; titre: string | null };
export type MoisVue = { texte: string | null; ancien: boolean };
export type CarnetVue = { cases: CaseVue[]; mois: MoisVue[]; joursEncre: number; serie: number; record: number };

/** Les semaines qui ne tiennent pas au téléphone (les 34 plus anciennes) : leurs cases et leurs mois sont masqués par la mise en page. */
export const SEMAINES_ANCIENNES = SEMAINES - SEMAINES_TELEPHONE;

/**
 * Le nom du mois au-dessus de la première semaine de chaque mois (52 colonnes ; les
 * autres sont vides). Le premier mois, coupé, n'est écrit que s'il reste de la place
 * avant le suivant (trois colonnes au moins).
 */
export function moisCarnet(aujourdhui: string): MoisVue[] {
  const debut = debutCarnet(aujourdhui);
  const noms: (string | null)[] = [];
  let avant = -1;
  for (let w = 0; w < SEMAINES; w++) {
    const m = Number(decaleJour(debut, 7 * w).slice(5, 7)) - 1;
    noms.push(m !== avant ? (PARC.carnet.mois[m] ?? null) : null);
    avant = m;
  }
  const suivant = noms.findIndex((t, i) => i > 0 && t !== null);
  if (suivant > 0 && suivant < 3) noms[0] = null;
  return noms.map((texte, w) => ({ texte, ancien: w < SEMAINES_ANCIENNES }));
}

/** La grille des 52 semaines (364 cases, lundi en haut), les mois et les chiffres du haut. */
export function carnetVue(c: CarnetLobby, auj: AujourdhuiCarnet | null): CarnetVue {
  const cases = casesCarnet(c.jours, c.aujourdhui);
  const jours = cases.map((x, i): CaseVue => {
    const estAuj = x.jour === c.aujourdhui;
    // le jour en cours : les traits répondus à l'instant priment sur ce que la grille a lu
    const n = estAuj && auj ? Math.max(x.n, auj.traits) : x.n;
    const titre = x.avenir
      ? null
      : estAuj && auj
        ? PARC.carnet.aujourdhuiCase(auj.traits, auj.objectif, auj.traits >= auj.objectif)
        : n > 0
          ? PARC.carnet.case(dateCourte(x.jour), n)
          : null;
    return { jour: x.jour, niveau: niveau(n), avenir: x.avenir, auj: estAuj, ancien: Math.floor(i / 7) < SEMAINES_ANCIENNES, titre };
  });
  return { cases: jours, mois: moisCarnet(c.aujourdhui), joursEncre: joursDEncre(cases, c.seuil ?? 1), serie: c.serie, record: c.record };
}

/** La phrase sous la grille, sur la case cerclée. */
export const legendeCarnet = (auj: AujourdhuiCarnet | null): string => (auj ? PARC.carnet.legendeAujourdhui(auj.traits, auj.objectif, auj.traits >= auj.objectif) : PARC.carnet.legendeSimple);
