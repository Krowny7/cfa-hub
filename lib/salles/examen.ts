// Salles : la logique pure du chrono global (« examen »), comme les 30 du
// jour : un seul chrono pour toute la partie (fin_at = started_at + nb ×
// temps, sans pause), toutes les questions ouvertes du départ à la fin, une
// réponse par question, définitive, et rien de révélé avant la fin (ni
// justesse, ni points, ni classement : seulement combien de réponses chacun a
// données). À la fin : les corrections, le classement et le débrief.
// Chacun peut rendre sa copie avant la fin du chrono : ses réponses se
// verrouillent, et quand tous les membres ont rendu la leur, la partie se
// termine sur-le-champ (migration_salles_rendre_copie.sql : rendre_copie,
// avancement[].rendu).
// Aucun accès réseau ni horloge lue ici : l'heure (du serveur) est passée en
// argument. Testé par scripts/salles/test-examen.tsx. Module neutre.
//
// Le serveur fait foi (migration_salles_chrono_global.sql : _salle_horloge_partie,
// repondre_salle, etat_salle). Les champs `chrono` et `avancement` de la partie
// sont lus défensivement : ils viennent d'etat_salle et peuvent manquer.

import { corpsExportIA, type DailyAiScope, type DailyReviewItem } from "@/lib/daily";
import type { ReponseOk } from "./partie";
import type { SalleCorrection, SalleItem, SalleMaReponse, SalleMembre, SalleSession } from "./types";

/**
 * La copie corrigée d'une partie en chrono global, au format de la revue des 30
 * du jour (DefiReview, ReviewCard, « Copier pour l'IA ») : QCM seulement, sans
 * réussite des joueurs. null tant qu'une correction manque.
 */
export function revueSalle(items: SalleItem[], corrections: SalleCorrection[], mes: SalleMaReponse[]): DailyReviewItem[] | null {
  const corr = new Map(corrections.map((c) => [c.position, c]));
  const mesPar = new Map(mes.map((m) => [m.position, m]));
  const revue: DailyReviewItem[] = [];
  for (const it of [...items].sort((a, b) => a.position - b.position)) {
    const c = corr.get(it.position);
    if (!c || !it.choix) return null;
    const m = mesPar.get(it.position);
    const choix = m?.choix ?? null;
    revue.push({
      position: it.position,
      questionId: c.questionId ?? "",
      prompt: it.enonce,
      choices: it.choix,
      correctIndex: c.bonneIndex ?? -1,
      explanation: c.explication,
      topic: it.topic,
      selectedIndex: choix,
      isCorrect: choix !== null && choix === c.bonneIndex,
      players: 0,
      successCount: 0,
      successRate: null,
    });
  }
  return revue;
}

/** « Copier pour l'IA » d'une partie de Salle (mock officiel ou QCM) : même corps que les 30 du jour. */
export function exportIASalle(revue: DailyReviewItem[], ctx: { scope: DailyAiScope; titre: string; score: number; total: number }): string {
  const items = ctx.scope === "errors" ? revue.filter((q) => !q.isCorrect) : revue;
  const pct = ctx.total > 0 ? Math.round((ctx.score / ctx.total) * 100) : 0;
  const contexte = `Contexte : ${ctx.titre}, partie chronométrée de ${ctx.total} questions type examen CFA Level I, score ${ctx.score}/${ctx.total}.\n`;
  const entete =
    ctx.scope === "errors"
      ? `EXAMEN CFA — MES ERREURS (${items.length} question${items.length > 1 ? "s" : ""}) — ${ctx.score}/${ctx.total} (${pct}%)\n` +
        contexte +
        `Voici les questions que j'ai ratées. Pour chaque question : l'énoncé, les choix, ma réponse, la bonne réponse et l'explication officielle. ` +
        `Peux-tu me faire un bilan de mes points faibles par matière, et m'expliquer plus en détail chacune de ces erreurs ?\n\n`
      : `EXAMEN CFA — ${ctx.score}/${ctx.total} (${pct}%)\n` +
        contexte +
        `Voici ma copie. Pour chaque question : l'énoncé, les choix, ma réponse, la bonne réponse et l'explication officielle. ` +
        `Peux-tu me faire un bilan de mes points faibles par matière, et m'expliquer plus en détail les questions où je me suis trompé ?\n\n`;
  return entete + corpsExportIA(items);
}

// ---------------------------------------------------------------------------
// Le mode de la partie

type SessionLue = Pick<SalleSession, "params"> & { chrono?: unknown; avancement?: unknown };

/** La partie se joue-t-elle au chrono global (correction à la fin) ? */
export function estChronoGlobal(session: Pick<SalleSession, "params"> | null | undefined): boolean {
  if (!session) return false;
  const s = session as SessionLue;
  if (s.chrono === "global") return true;
  if (s.chrono === "question") return false;
  return (s.params as { chrono?: unknown } | null | undefined)?.chrono === "global";
}

// ---------------------------------------------------------------------------
// L'horloge

export type HorlogeExamen = {
  phase: "decompte" | "question" | "fin";
  /** ms avant le départ (décompte) ; 0 ensuite */
  avantDebutMs: number;
  /** ms avant la fin du chrono (pendant la partie) ; 0 sinon */
  restantMs: number;
  /** durée totale du chrono, en ms (nb × temps) */
  totalMs: number;
};

/**
 * Où en est une partie au chrono global à l'heure `t` (ms, heure du serveur).
 * Miroir de _salle_horloge_partie : décompte jusqu'à started_at, puis toutes
 * les questions ouvertes jusqu'à fin_at, puis la fin (ou dès que la partie est
 * terminée, arrêtée par l'admin).
 */
export function horlogeExamen(session: Pick<SalleSession, "startedAt" | "finAt" | "nb" | "temps" | "statut">, t: number): HorlogeExamen {
  const debut = Date.parse(session.startedAt);
  const finLue = Date.parse(session.finAt);
  const totalMs = Math.max(0, session.nb * session.temps * 1000);
  const fin = Number.isFinite(finLue) ? finLue : debut + totalMs;
  if (session.statut === "terminee" || !Number.isFinite(debut) || t >= fin) return { phase: "fin", avantDebutMs: 0, restantMs: 0, totalMs };
  if (t < debut) return { phase: "decompte", avantDebutMs: debut - t, restantMs: 0, totalMs };
  return { phase: "question", avantDebutMs: 0, restantMs: fin - t, totalMs };
}

/**
 * Le serveur a-t-il rendu la fin ? La fin peut tomber à l'horloge locale avant
 * la lecture qui la confirme : la session lue court encore, mes réponses sont
 * masquées (juste null) et le classement est à 0. Rien ne doit alors s'afficher
 * comme un résultat (ni podium, ni « faux »).
 */
export function finRevelee(session: Pick<SalleSession, "statut" | "phase">, mes: Pick<SalleMaReponse, "juste">[]): boolean {
  return (session.statut === "terminee" || session.phase === "fin") && mes.every((r) => r.juste !== null);
}

/** « 1:04:09 », « 12:05 », « 0:07 » : le chrono global (arrondi à la seconde au-dessus). */
export function libelleChrono(ms: number): string {
  const total = Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 1000)) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Le chrono passe à l'encre vermillon sur la fin : les 5 dernières minutes, ou le dernier cinquième d'une partie courte. */
export function chronoBas(restantMs: number, totalMs: number): boolean {
  return restantMs > 0 && restantMs <= Math.min(300_000, totalMs / 5);
}

// ---------------------------------------------------------------------------
// Mes réponses (sans verdict avant la fin)

/** Ma réponse retenue à une question : le choix (QCM) ou la valeur (calcul), jamais la justesse. */
export type ReponseRetenue = { choix: number | null; valeur: number | null };

/** Mes réponses retenues, par position : celles que le serveur vient de me rendre, puis celles de l'état lu. */
export function reponsesRetenues(nb: number, locales: Record<number, ReponseOk | undefined>, mes: SalleMaReponse[]): Map<number, ReponseRetenue> {
  const m = new Map<number, ReponseRetenue>();
  for (const r of mes) if (r.position >= 0 && r.position < nb) m.set(r.position, { choix: r.choix, valeur: r.valeur });
  for (const [cle, l] of Object.entries(locales)) {
    const pos = Number(cle);
    if (l && Number.isInteger(pos) && pos >= 0 && pos < nb && !m.has(pos)) m.set(pos, { choix: l.choix, valeur: l.valeur });
  }
  return m;
}

/**
 * La prochaine question sans réponse après `depuis` (en repartant du début),
 * ou null si tout est répondu. `depuis` lui-même ne compte qu'en dernier.
 */
export function prochaineNonRepondue(nb: number, repondues: { has: (p: number) => boolean }, depuis: number): number | null {
  if (nb <= 0) return null;
  const d = Number.isInteger(depuis) && depuis >= 0 && depuis < nb ? depuis : -1;
  for (let k = 1; k <= nb; k++) {
    const p = (d + k + nb) % nb;
    if (!repondues.has(p)) return p;
  }
  return null;
}

/** La position où ouvrir l'écran : la première question sans réponse, sinon la première. */
export function positionDeDepart(nb: number, repondues: { has: (p: number) => boolean }): number {
  return prochaineNonRepondue(nb, repondues, -1) ?? 0;
}

// ---------------------------------------------------------------------------
// L'avancement des joueurs (combien de réponses, copie rendue ou non, rien d'autre)

export type AvancementJoueur = {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  n: number;
  /** a rendu sa copie (plus de réponse possible) */
  rendu: boolean;
  moi: boolean;
};

/** Lit `session.avancement` ([{ user_id | userId, n, rendu }]) ; [] s'il manque. `rendu` absent : faux. */
export function avancementBrut(session: Pick<SalleSession, "params"> | null | undefined): { userId: string; n: number; rendu: boolean }[] {
  const brut = (session as SessionLue | null | undefined)?.avancement;
  if (!Array.isArray(brut)) return [];
  const out: { userId: string; n: number; rendu: boolean }[] = [];
  for (const x of brut) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const id = o.userId ?? o.user_id;
    const n = Number(o.n);
    if (typeof id === "string" && id && Number.isFinite(n)) out.push({ userId: id, n: Math.max(0, Math.floor(n)), rendu: o.rendu === true });
  }
  return out;
}

/** Ai-je rendu ma copie, d'après l'avancement lu ? (l'écran y ajoute la remise qu'il vient de faire) */
export function copieRendue(session: Pick<SalleSession, "params"> | null | undefined, moiId: string): boolean {
  return avancementBrut(session).some((a) => a.userId === moiId && a.rendu);
}

/**
 * L'erreur est-elle le refus de repondre_salle après la copie rendue (« Ta copie
 * est rendue : tu ne peux plus répondre. ») ? Rendue depuis un autre onglet :
 * l'écran se verrouille alors tout de suite, sans attendre la lecture suivante.
 */
export function refusCopieRendue(e: unknown): boolean {
  const message = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  return /copie est rendue/i.test(message);
}

/** Après l'ouverture de la confirmation, le temps pendant lequel un clic est la suite d'un double clic. */
export const GARDE_DOUBLE_CLIC_MS = 500;

/**
 * Ce clic dans la confirmation arrive-t-il trop vite après son ouverture ? C'est
 * alors le second clic d'un double clic sur « Rendre ma copie » (le bouton de
 * confirmation s'affiche au même endroit) : on l'ignore. Les heures sont celles
 * des événements (`timeStamp`, ms) ; `ouverteA` null : ouverte sans clic.
 */
export function clicTropTot(ouverteA: number | null, maintenant: number): boolean {
  if (ouverteA === null || !Number.isFinite(ouverteA) || !Number.isFinite(maintenant)) return false;
  const ecart = maintenant - ouverteA;
  return ecart >= 0 && ecart < GARDE_DOUBLE_CLIC_MS;
}

/**
 * L'avancement de chacun, avec son pseudo : du plus avancé au moins avancé.
 * Ma ligne prend le plus grand de mon compte local (plus frais) et de celui du
 * serveur, et figure même si je n'ai encore rien répondu ; elle est « rendue »
 * si le serveur le dit ou si je viens de rendre ma copie (`moiRendu`).
 */
export function avancementJoueurs(opts: {
  session: Pick<SalleSession, "params"> | null | undefined;
  membres: Pick<SalleMembre, "userId" | "username" | "avatarUrl">[];
  moiId: string;
  mesRepondues: number;
  moiRendu?: boolean;
  /** ceux qui sont sur la page ; `null` : on ne sait pas encore */
  presents?: ReadonlySet<string> | null;
}): AvancementJoueur[] {
  const { session, membres, moiId, mesRepondues, moiRendu = false, presents = null } = opts;
  const parId = new Map(membres.map((m) => [m.userId, m]));
  const lignes = new Map<string, AvancementJoueur>();
  for (const a of avancementBrut(session)) {
    const m = parId.get(a.userId);
    lignes.set(a.userId, { userId: a.userId, username: m?.username ?? null, avatarUrl: m?.avatarUrl ?? null, n: a.n, rendu: a.rendu, moi: a.userId === moiId });
  }
  // le serveur ne cite que ceux qui ont déjà répondu : les autres joueurs présents partent de zéro
  for (const m of membres) {
    if (!lignes.has(m.userId) && (!presents || presents.has(m.userId))) lignes.set(m.userId, { userId: m.userId, username: m.username ?? null, avatarUrl: m.avatarUrl ?? null, n: 0, rendu: false, moi: m.userId === moiId });
  }
  const moiM = parId.get(moiId);
  const moi = lignes.get(moiId);
  lignes.set(moiId, {
    userId: moiId,
    username: moiM?.username ?? null,
    avatarUrl: moiM?.avatarUrl ?? null,
    n: Math.max(moi?.n ?? 0, mesRepondues),
    rendu: (moi?.rendu ?? false) || moiRendu,
    moi: true,
  });
  return [...lignes.values()].sort((a, b) => b.n - a.n || Number(b.moi) - Number(a.moi) || String(a.username ?? "").localeCompare(String(b.username ?? ""), "fr"));
}

// ---------------------------------------------------------------------------
// Le débrief (à la fin seulement)

export type VerdictExamen = "juste" | "faux" | "sans";

export type LigneDebrief = {
  position: number;
  item: SalleItem;
  correction: SalleCorrection | null;
  reponse: SalleMaReponse | null;
  verdict: VerdictExamen;
};

export type Debrief = {
  lignes: LigneDebrief[];
  nb: number;
  justes: number;
  faux: number;
  sans: number;
  /** toutes les corrections des questions sont arrivées */
  complet: boolean;
};

/**
 * Le débrief question par question : mon choix, la correction, juste / faux /
 * sans réponse. La justesse vient de mes réponses telles que le serveur les
 * rend à la fin (avant, elle est masquée) ; une question sans correction reçue,
 * ou une réponse encore masquée (juste null), laisse le débrief « en attente »
 * (complet faux).
 */
export function debriefExamen(nb: number, items: SalleItem[], corrections: SalleCorrection[], mes: SalleMaReponse[]): Debrief {
  const corr = new Map(corrections.map((c) => [c.position, c]));
  const rep = new Map(mes.map((r) => [r.position, r]));
  const lignes: LigneDebrief[] = items
    .filter((it) => it.position >= 0 && it.position < nb)
    .sort((a, b) => a.position - b.position)
    .map((item) => {
      const reponse = rep.get(item.position) ?? null;
      const verdict: VerdictExamen = !reponse ? "sans" : reponse.juste === true ? "juste" : "faux";
      return { position: item.position, item, correction: corr.get(item.position) ?? null, reponse, verdict };
    });
  const justes = lignes.filter((l) => l.verdict === "juste").length;
  const faux = lignes.filter((l) => l.verdict === "faux").length;
  const sans = Math.max(0, nb - justes - faux);
  const complet = lignes.length >= nb && lignes.every((l) => l.correction !== null && (l.reponse === null || l.reponse.juste !== null));
  return { lignes, nb, justes, faux, sans, complet };
}
