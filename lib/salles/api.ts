import type { SupabaseClient } from "@supabase/supabase-js";
import { parseCalcCandidates } from "@/lib/calc/engine";
import { analyserCode, decalageHorloge, fusionnerEtat, paramsDepuisJson, paramsVersJson, prochainDepuis, SALLE_TOPIC_KEYS } from "./logique";
import type {
  CalculPourSalle,
  EtatSalle,
  Lecture,
  QuestionsDisponibles,
  ReponseResultat,
  SalleClassementLigne,
  SalleCorrection,
  SalleHistorique,
  SalleInfos,
  SalleItem,
  SalleMaReponse,
  SalleMembre,
  SalleNiveau,
  SalleOrigine,
  SalleParams,
  SallePhase,
  SallePublique,
  SalleResume,
  SalleSession,
  SalleSource,
  SalleStatut,
  SessionLancee,
  TopicKey,
} from "./types";

// Salles : les appels aux RPC de migration_salles.sql.
// Module neutre (pas de "use client") : on lui passe le client Supabase du
// navigateur (lib/supabase/browser) ou du serveur (lib/supabase/server).
// Aucune bonne réponse n'arrive ici avant la clôture de la question ou la
// réponse du joueur : c'est le serveur (SQL) qui décide. Tant que la migration
// n'est pas appliquée, les lectures renvoient { ok: false, migrationAbsente:
// true } (jamais d'exception) et sallesReady() renvoie false : l'écran dit que
// les salles arrivent, rien ne casse.
//
// NE PAS importer lib/salles/serveur.ts ici ni dans un composant client : il
// lit les catalogues de calculs, réponses comprises.

// ---------------------------------------------------------------------------
// Conversions (les RPC renvoient du JSON en snake_case)

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : {});
const liste = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown) => (v === null || v === undefined ? null : String(v));
const num = (v: unknown, d = 0) => (v === null || v === undefined || Number.isNaN(Number(v)) ? d : Number(v));
const numOuNull = (v: unknown) => (v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
const topicOuNull = (v: unknown): TopicKey | null => (typeof v === "string" && (SALLE_TOPIC_KEYS as string[]).includes(v) ? (v as TopicKey) : null);
const niveauOuNull = (v: unknown): SalleNiveau | null => (v === "facile" || v === "moyen" || v === "difficile" ? v : null);

function toResume(r: Raw): SalleResume {
  return {
    id: String(r.id),
    nom: String(r.nom ?? ""),
    description: str(r.description),
    code: String(r.code ?? ""),
    publique: Boolean(r.publique),
    estAdmin: Boolean(r.est_admin),
    nbMembres: num(r.nb_membres),
    enCours: Boolean(r.en_cours),
    derniereActivite: String(r.derniere_activite ?? ""),
  };
}

function toPublique(r: Raw): SallePublique {
  return {
    id: String(r.id),
    nom: String(r.nom ?? ""),
    description: str(r.description),
    adminUsername: str(r.admin_username),
    nbMembres: num(r.nb_membres),
    enCours: Boolean(r.en_cours),
    derniereActivite: String(r.derniere_activite ?? ""),
    dejaMembre: Boolean(r.deja_membre),
  };
}

function toMembre(r: Raw): SalleMembre {
  const role = r.role === "admin" ? "admin" : "membre";
  return {
    userId: String(r.user_id),
    username: str(r.username),
    avatarUrl: str(r.avatar_url),
    role,
    estAdmin: role === "admin",
    elo: numOuNull(r.elo),
    rejointLe: String(r.rejoint_le ?? ""),
  };
}

function toSession(r: Raw): SalleSession {
  const statut: SalleStatut = r.statut === "terminee" ? "terminee" : r.statut === "attente" ? "attente" : "en_cours";
  const phase: SallePhase = r.phase === "decompte" || r.phase === "question" || r.phase === "revelation" || r.phase === "fin" ? r.phase : "fin";
  return {
    id: String(r.id),
    numero: num(r.numero, 1),
    statut,
    params: paramsDepuisJson(r.params),
    nb: num(r.nb),
    temps: num(r.temps),
    pause: num(r.pause),
    startedAt: String(r.started_at),
    finAt: String(r.fin_at),
    index: num(r.index, -1),
    phase,
    nbVisibles: num(r.nb_visibles),
    nbFermees: num(r.nb_fermees),
    reponduCourante: num(r.repondu_courante),
    nbJoueurs: num(r.nb_joueurs),
  };
}

function toItem(r: Raw): SalleItem {
  const origine: SalleOrigine = r.origine === "calcul" ? "calcul" : "question";
  return {
    position: num(r.position),
    origine,
    topic: topicOuNull(r.topic),
    difficulte: niveauOuNull(r.difficulte),
    libelle: str(r.libelle),
    enonce: String(r.enonce ?? ""),
    choix: Array.isArray(r.choix) ? (r.choix as unknown[]).map((c) => String(c)) : null,
    donnees: Array.isArray(r.donnees)
      ? (r.donnees as unknown[]).map((d) => ({ label: String(obj(d).label ?? ""), value: String(obj(d).value ?? "") }))
      : null,
    unite: str(r.unite),
    decimales: numOuNull(r.decimales),
  };
}

function toCorrection(r: Raw): SalleCorrection {
  return {
    position: num(r.position),
    bonneIndex: numOuNull(r.bonne_index),
    bonneValeur: numOuNull(r.bonne_valeur),
    explication: str(r.explication),
    etapes: liste(r.etapes).map((e) => String(e)),
  };
}

function toMaReponse(r: Raw): SalleMaReponse {
  return {
    position: num(r.position),
    choix: numOuNull(r.choix),
    valeur: numOuNull(r.valeur),
    juste: Boolean(r.juste),
    points: num(r.points),
    delaiMs: num(r.delai_ms),
  };
}

function toLigne(r: Raw): SalleClassementLigne {
  return {
    rang: num(r.rang),
    userId: String(r.user_id),
    username: str(r.username),
    avatarUrl: str(r.avatar_url),
    points: num(r.points),
    bonnes: num(r.bonnes),
    repondues: num(r.repondues),
    tempsMs: num(r.temps_ms),
  };
}

function toHistorique(r: Raw): SalleHistorique {
  const g = r.gagnant ? obj(r.gagnant) : null;
  const m = r.moi ? obj(r.moi) : null;
  return {
    sessionId: String(r.session_id),
    numero: num(r.numero, 1),
    nb: num(r.nb),
    params: paramsDepuisJson(r.params),
    startedAt: String(r.started_at),
    finAt: String(r.fin_at),
    nbJoueurs: num(r.nb_joueurs),
    gagnant: g ? { userId: String(g.user_id), username: str(g.username), points: num(g.points) } : null,
    moi: m ? { rang: num(m.rang), points: num(m.points) } : null,
  };
}

function toInfos(r: Raw): SalleInfos {
  return {
    id: String(r.id),
    nom: String(r.nom ?? ""),
    description: str(r.description),
    code: String(r.code ?? ""),
    publique: Boolean(r.publique),
    adminId: String(r.admin_id),
    createdAt: String(r.created_at ?? ""),
  };
}

/** Le JSON d'etat_salle → EtatSalle (exporté pour les tests). */
export function toEtat(raw: unknown): EtatSalle {
  const r = obj(raw);
  const moi = obj(r.moi);
  const mc = r.mon_classement ? obj(r.mon_classement) : null;
  return {
    serverNow: String(r.server_now ?? new Date().toISOString()),
    salle: toInfos(obj(r.salle)),
    moi: { userId: String(moi.user_id), estAdmin: Boolean(moi.est_admin) },
    nbMembres: num(r.nb_membres),
    membres: liste(r.membres).map((m) => toMembre(obj(m))),
    session: r.session ? toSession(obj(r.session)) : null,
    items: liste(r.items).map((i) => toItem(obj(i))),
    corrections: liste(r.corrections).map((c) => toCorrection(obj(c))),
    mesReponses: liste(r.mes_reponses).map((m) => toMaReponse(obj(m))),
    classement: liste(r.classement).map((l) => toLigne(obj(l))),
    monClassement: mc
      ? { rang: num(mc.rang), points: num(mc.points), bonnes: num(mc.bonnes), repondues: num(mc.repondues), tempsMs: num(mc.temps_ms) }
      : null,
    historique: liste(r.historique).map((h) => toHistorique(obj(h))),
  };
}

function toReponse(raw: unknown): ReponseResultat {
  const r = obj(raw);
  if (!r.ok) return { ok: false, raison: "format", indice: String(r.indice ?? "Vérifie l'unité de ta réponse.") };
  return {
    ok: true,
    deja: Boolean(r.deja),
    juste: Boolean(r.juste),
    points: num(r.points),
    delaiMs: num(r.delai_ms),
    choix: numOuNull(r.choix),
    valeur: numOuNull(r.valeur),
    bonneIndex: numOuNull(r.bonne_index),
    bonneValeur: numOuNull(r.bonne_valeur),
    explication: str(r.explication),
    etapes: liste(r.etapes).map((e) => String(e)),
  };
}

// ---------------------------------------------------------------------------
// Erreurs

/** La migration des salles est-elle absente ? (fonction ou table introuvable) */
export function estMigrationAbsente(error: unknown): boolean {
  const e = obj(error);
  const code = typeof e.code === "string" ? e.code : "";
  if (["PGRST202", "PGRST205", "42883", "42P01"].includes(code)) return true;
  const message = typeof e.message === "string" ? e.message : error instanceof Error ? error.message : "";
  return /could not find the (function|table)|schema cache|function .* does not exist|relation .* does not exist/i.test(message);
}

function messageBrut(e: unknown): string {
  if (e instanceof Error) return e.message;
  const m = obj(e).message;
  return typeof m === "string" ? m : String(e ?? "");
}

/**
 * Message affichable pour une erreur de salle : les messages des RPC sont déjà
 * en français (ils finissent par un point) ; le reste devient une phrase neutre.
 */
export function messageErreurSalle(e: unknown, fallback = "Quelque chose a coincé — réessaie dans un instant."): string {
  if (estMigrationAbsente(e)) return "Les salles arrivent bientôt.";
  const raw = messageBrut(e);
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  if (lower.includes("not authenticated") || lower.includes("jwt")) return "Session expirée — recharge la page et reconnecte-toi.";
  if (lower.includes("failed to fetch") || lower.includes("network")) return "Erreur réseau — vérifie ta connexion et réessaie.";
  if (/[a-zà-ÿ]/i.test(raw) && raw.trim().endsWith(".") && !lower.includes("violates") && !lower.includes("relation")) return raw;
  return fallback;
}

/** Une erreur d'action : le message est affichable tel quel. */
export class SalleErreur extends Error {
  migrationAbsente: boolean;
  constructor(source: unknown) {
    super(messageErreurSalle(source));
    this.name = "SalleErreur";
    this.migrationAbsente = estMigrationAbsente(source);
  }
}

// ---------------------------------------------------------------------------
// Appels

async function appeler(supabase: SupabaseClient, fn: string, args: Record<string, unknown> = {}): Promise<unknown> {
  let res: { data: unknown; error: unknown };
  try {
    res = await supabase.rpc(fn, args);
  } catch (e) {
    throw new SalleErreur(e);
  }
  if (res.error) throw new SalleErreur(res.error);
  return res.data;
}

async function lire<T>(supabase: SupabaseClient, fn: string, args: Record<string, unknown>, convertir: (data: unknown) => T): Promise<Lecture<T>> {
  try {
    const data = await appeler(supabase, fn, args);
    return { ok: true, data: convertir(data) };
  } catch (e) {
    return { ok: false, migrationAbsente: e instanceof SalleErreur ? e.migrationAbsente : estMigrationAbsente(e), message: e instanceof SalleErreur ? e.message : messageErreurSalle(e) };
  }
}

// ---------------------------------------------------------------------------
// Lectures (ne lèvent jamais d'exception)

/** La migration des salles est-elle appliquée ? */
export async function sallesReady(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { error } = await supabase.from("salles").select("id", { count: "exact", head: true }).limit(1);
    return !error;
  } catch {
    return false;
  }
}

/** Mes salles, la plus récemment active d'abord. */
export function getMesSalles(supabase: SupabaseClient): Promise<Lecture<SalleResume[]>> {
  return lire(supabase, "mes_salles", {}, (d) => liste(d).map((r) => toResume(obj(r))));
}

/** Les salles publiques (jusqu'à 60), celles où une partie est en cours d'abord. */
export function getSallesPubliques(supabase: SupabaseClient): Promise<Lecture<SallePublique[]>> {
  return lire(supabase, "salles_publiques", {}, (d) => liste(d).map((r) => toPublique(obj(r))));
}

/** Combien de questions la banque offre par matière et par difficulté, pour une source. */
export function getQuestionsDisponibles(supabase: SupabaseClient, source: SalleSource = "banque"): Promise<Lecture<QuestionsDisponibles[]>> {
  return lire(supabase, "salle_questions_disponibles", { p_source: source }, (d) =>
    liste(d).flatMap((raw) => {
      const r = obj(raw);
      const topic = topicOuNull(r.topic);
      return topic ? [{ topic, total: num(r.total), facile: num(r.facile), moyen: num(r.moyen), difficile: num(r.difficile) }] : [];
    }),
  );
}

/** Le classement complet d'une partie terminée (jusqu'à 200 lignes). */
export function getClassementSession(supabase: SupabaseClient, sessionId: string): Promise<Lecture<SalleClassementLigne[]>> {
  return lire(supabase, "classement_session", { p_session_id: sessionId }, (d) => liste(d).map((l) => toLigne(obj(l))));
}

/** Un état de salle avec le décalage mesuré entre l'horloge du navigateur et celle du serveur. */
export type EtatSalleLu = EtatSalle & {
  /** à ajouter à Date.now() pour avoir l'heure du serveur (voir heureServeur) */
  decalageMs: number;
};

/**
 * Lit l'état d'une salle (etat_salle). `depuis` : la position à partir de
 * laquelle on veut énoncés et corrections (0 : tout ce qui est révélé).
 */
export async function getEtatSalle(supabase: SupabaseClient, salleId: string, depuis = 0): Promise<Lecture<EtatSalleLu>> {
  const envoye = Date.now();
  const lu = await lire(supabase, "etat_salle", { p_salle_id: salleId, p_depuis: Math.max(0, Math.floor(depuis)) }, toEtat);
  if (!lu.ok) return lu;
  return { ok: true, data: { ...lu.data, decalageMs: decalageHorloge(lu.data.serverNow, envoye, Date.now()) } };
}

/**
 * La lecture à répéter toutes les 2 à 3 s (voir delaiAvantLecture) : ne
 * redemande que les énoncés et corrections nouveaux, et les ajoute à l'état
 * précédent. Si une autre partie a commencé entre-temps, relit tout depuis 0.
 */
export async function lireEtatSalle(supabase: SupabaseClient, salleId: string, prev: EtatSalle | null): Promise<Lecture<EtatSalleLu>> {
  const depuis = prochainDepuis(prev);
  let lu = await getEtatSalle(supabase, salleId, depuis);
  if (!lu.ok) return lu;
  if (depuis > 0 && lu.data.session?.id !== prev?.session?.id) {
    const complet = await getEtatSalle(supabase, salleId, 0);
    if (!complet.ok) return complet;
    lu = complet;
  }
  const { decalageMs } = lu.data;
  return { ok: true, data: { ...fusionnerEtat(prev, lu.data), decalageMs } };
}

// ---------------------------------------------------------------------------
// Actions (lèvent une SalleErreur au message lisible en cas d'échec)

export async function creerSalle(
  supabase: SupabaseClient,
  nom: string,
  publique = false,
  description: string | null = null,
): Promise<{ id: string; code: string; nom: string; publique: boolean }> {
  const r = obj(await appeler(supabase, "creer_salle", { p_nom: nom, p_publique: publique, p_description: description }));
  return { id: String(r.id), code: String(r.code), nom: String(r.nom), publique: Boolean(r.publique) };
}

/** Rejoint une salle par son code (publique ou privée). Un code mal tapé est refusé avant tout appel. */
export async function rejoindreSalleParCode(supabase: SupabaseClient, code: string): Promise<{ id: string; nom: string; publique: boolean; dejaMembre: boolean }> {
  const lu = analyserCode(code);
  if (!lu.ok) throw new Error(lu.erreur);
  const r = obj(await appeler(supabase, "rejoindre_salle", { p_code: lu.code }));
  return { id: String(r.id), nom: String(r.nom), publique: Boolean(r.publique), dejaMembre: Boolean(r.deja_membre) };
}

export async function rejoindreSallePublique(supabase: SupabaseClient, salleId: string): Promise<{ id: string; nom: string; publique: boolean; dejaMembre: boolean }> {
  const r = obj(await appeler(supabase, "rejoindre_salle_publique", { p_salle_id: salleId }));
  return { id: String(r.id), nom: String(r.nom), publique: Boolean(r.publique), dejaMembre: Boolean(r.deja_membre) };
}

/** Quitte la salle ; `supprimee` : tu étais le dernier, la salle a disparu. */
export async function quitterSalle(supabase: SupabaseClient, salleId: string): Promise<{ supprimee: boolean }> {
  const r = obj(await appeler(supabase, "quitter_salle", { p_salle_id: salleId }));
  return { supprimee: Boolean(r.supprimee) };
}

/** Change le nom, la visibilité ou la description (admin seul) ; un champ absent ne change pas, une description vide l'efface. */
export async function modifierSalle(supabase: SupabaseClient, salleId: string, changements: { nom?: string; publique?: boolean; description?: string }): Promise<void> {
  await appeler(supabase, "modifier_salle", {
    p_salle_id: salleId,
    p_nom: changements.nom ?? null,
    p_publique: changements.publique ?? null,
    p_description: changements.description ?? null,
  });
}

export async function supprimerSalle(supabase: SupabaseClient, salleId: string): Promise<void> {
  await appeler(supabase, "supprimer_salle", { p_salle_id: salleId });
}

/** Arrête la partie en cours (admin seul) : elle est terminée, les corrections s'ouvrent. */
export async function arreterSession(supabase: SupabaseClient, salleId: string): Promise<void> {
  await appeler(supabase, "arreter_session", { p_salle_id: salleId });
}

/**
 * Répond à une question. QCM : `{ choix }` (indice du choix, à partir de 0).
 * Calcul : `{ saisie }` (le texte tapé, « 8,5 », « 1 234,5 », « 12 % »…).
 * Renvoie la correction à celui qui répond. Pour un calcul à la mauvaise
 * échelle, `{ ok: false, raison: "format", indice }` : rien n'est compté, on
 * peut ressaisir. Une saisie illisible lève une erreur sans appeler le serveur.
 */
export async function repondreSalle(
  supabase: SupabaseClient,
  sessionId: string,
  position: number,
  reponse: { choix: number } | { saisie: string },
): Promise<ReponseResultat> {
  if ("choix" in reponse) {
    return toReponse(await appeler(supabase, "repondre_salle", { p_session_id: sessionId, p_position: position, p_choix: reponse.choix }));
  }
  const valeurs = parseCalcInputSafe(reponse.saisie);
  if (!valeurs.length) throw new Error("Ce n'est pas un nombre : tape par exemple 8,5.");
  return toReponse(await appeler(supabase, "repondre_salle", { p_session_id: sessionId, p_position: position, p_valeurs: valeurs }));
}

function parseCalcInputSafe(saisie: string): number[] {
  try {
    return parseCalcCandidates(saisie);
  } catch {
    return [];
  }
}

/**
 * Lance la partie avec des calculs DÉJÀ tirés (voir lib/salles/serveur.ts,
 * lancerSession, qui les tire côté serveur puis appelle ceci). Ne pas appeler
 * depuis un navigateur avec des calculs construits côté client.
 */
export async function lancerSessionBrute(supabase: SupabaseClient, salleId: string, params: SalleParams, calculs: CalculPourSalle[] = []): Promise<SessionLancee> {
  const r = obj(await appeler(supabase, "lancer_session", { p_salle_id: salleId, p_params: paramsVersJson(params), p_calculs: calculs }));
  return {
    sessionId: String(r.session_id),
    numero: num(r.numero, 1),
    nb: num(r.nb),
    nbQuestions: num(r.nb_questions),
    nbCalculs: num(r.nb_calculs),
    manque: Boolean(r.manque),
    startedAt: String(r.started_at),
    serverNow: String(r.server_now),
  };
}
