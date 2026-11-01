import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { subjectOfTitle } from "@/components/ContentDetailHeader";
import type { LigneNotion } from "@/components/moi/points-faibles-data";
import { lireCartesMarquees } from "@/lib/flashcards/marquees";
import { numeroPaquet } from "@/lib/flashcards/paquets";
import { NOTIONS, notionParId } from "@/lib/notions";
import { SEUIL_AFFICHAGE, eligible, scoreDe } from "@/lib/points-faibles";
import { CARTE_JOUR } from "@/lib/voice-accueil-lobby-carte";
import {
  TOUTES_LES_MATIERES,
  choisirPaquet,
  classerParTirage,
  gagnant,
  graineDuJour,
  indexDansPaquet,
  lireReglages,
  matiereDe,
  partDuPaquet,
  promptIA,
  resumeReglages,
  tagCarteDuJour,
  type CarteDuJourLobby,
  type ReglagesCarte,
} from "./modele-carte";

// La lecture de « La carte du jour » (accueil « Le lobby »), côté serveur : le
// paquet de cartes possibles selon les réglages du joueur
// (user_metadata.rl_carte_jour), puis UNE carte, tirée de la graine du jour :
// la même toute la journée (heure de Paris), une nouvelle à minuit.
//   - toutes : les paquets officiels publiés des matières choisies, comptés
//     carte par carte (flashcards(count)), puis le paquet tiré, lu en entier ;
//   - marquées : les cartes marquées du joueur dans ces matières
//     (lib/flashcards/marquees) ;
//   - points faibles : les notions les plus faibles (lib/points-faibles), la
//     carte étant tirée dans la part du paquet qui revient à la notion quand
//     le catalogue lui en rattache un (comme les cartes Rappel de l'Atelier),
//     sinon parmi les paquets de sa matière.
// Une source vide redonne une carte du paquet entier et le dit (`repli`). Rien
// à tirer nulle part, ou une lecture qui échoue : null (la carte est absente).
// Aucune migration : les paquets, les marques et points_faibles existent déjà,
// et leur absence est un simple repli.
//
// Le tirage est le même toute la journée : lireCarteDuJourEnCache le garde côté
// serveur, par joueur, jour de Paris et réglages, pour que les visites suivantes
// soient instantanées. C'est unstable_cache de Next, pas une Map en mémoire :
// la mémoire d'une fonction serverless n'est pas partagée entre instances (un
// démarrage à froid repartirait de zéro, justement quand la lecture est lente),
// le cache de données de Next l'est, et il se révoque par étiquette. Jamais un
// échec ni une absence ne sont gardés (la fonction gardée lève plutôt) : une
// lecture lente ou tombée ne fige pas « pas de carte » pour la journée.

/** Ce que la lecture demande à la page : le client du joueur, son compte (id et métadonnées) et le jour de Paris. */
export type CtxCarte = {
  sb: SupabaseClient;
  user: { id: string; user_metadata?: Record<string, unknown> | null };
  /** AAAA-MM-JJ, heure de Paris */
  jour: string;
};

type CarteBrute = { id: string; front: string; back: string; position: number | null };
type Tiree = { id: string; front: string; back: string; matiereCle: string };

/** Le nombre de notions les plus faibles parmi lesquelles la journée tire. */
const MAX_FAIBLES = 5;
/** Les paquets qu'on essaie, au plus, avant d'abandonner (un paquet sans carte lisible passe au suivant). */
const ESSAIS = 3;

const un = <T>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));

// ── les paquets officiels ───────────────────────────────────────────────────

type Paquet = { id: string; title: string; nb: number | null; matiereCle: string };
type LigneSet = { id: string; title: string | null; flashcards?: { count?: number | null }[] | { count?: number | null } | null };

/** Les paquets officiels publiés des matières données ; les paquets du programme (« Flashcards n/4 ») d'abord, les autres seulement s'il n'y en a aucun. */
async function paquetsOfficiels(sb: SupabaseClient, mats: readonly string[]): Promise<Paquet[]> {
  const lire = async (colonnes: string): Promise<{ data: unknown; error: unknown }> => {
    const r = await sb.from("flashcard_sets").select(colonnes).eq("is_official", true).eq("official_published", true).limit(200);
    return { data: r.data, error: r.error };
  };
  let lecture = await lire("id,title,flashcards(count)");
  // le compte des cartes est un plus (tirage carte par carte) : sans lui, un paquet vaut un paquet
  if (lecture.error || !Array.isArray(lecture.data)) lecture = await lire("id,title");
  if (lecture.error || !Array.isArray(lecture.data)) return [];
  const dedans: Paquet[] = [];
  for (const l of lecture.data as LigneSet[]) {
    const matiere = subjectOfTitle(l.title);
    if (!l.title || !matiere || !mats.includes(matiere.key)) continue;
    const nb = un(l.flashcards)?.count;
    dedans.push({ id: l.id, title: l.title, nb: typeof nb === "number" ? nb : null, matiereCle: matiere.key });
  }
  const programme = dedans.filter((p) => numeroPaquet(p.title) !== null);
  return programme.length ? programme : dedans;
}

/** Les cartes d'un paquet, dans l'ordre. Erreur de lecture : aucune. */
async function cartesDuPaquet(sb: SupabaseClient, setId: string): Promise<CarteBrute[]> {
  const { data, error } = await sb.from("flashcards").select("id,front,back,position").eq("set_id", setId).order("position", { ascending: true }).limit(300);
  if (error || !Array.isArray(data)) return [];
  return (data as unknown as CarteBrute[]).filter((c) => typeof c.front === "string" && typeof c.back === "string" && c.front.trim() !== "" && c.back.trim() !== "");
}

/** Une carte du paquet entier (les paquets officiels des matières), tirée carte par carte. */
async function carteDuPaquet(sb: SupabaseClient, mats: readonly string[], graine: string): Promise<Tiree | null> {
  const paquets = await paquetsOfficiels(sb, mats);
  const premier = choisirPaquet(graine, paquets.map((p) => ({ id: p.id, nb: p.nb })));
  if (!premier) return null;
  // le paquet tiré d'abord ; s'il n'a aucune carte lisible, les suivants dans l'ordre du tirage
  const ordre = [premier.id, ...classerParTirage(graine, paquets.map((p) => p.id)).filter((id) => id !== premier.id)].slice(0, ESSAIS);
  for (const id of ordre) {
    const cartes = await cartesDuPaquet(sb, id);
    if (!cartes.length) continue;
    const rang = id === premier.id && premier.rang !== null ? Math.min(premier.rang, cartes.length - 1) : indexDansPaquet(`${graine}|${id}`, cartes.length);
    const c = cartes[rang];
    const p = paquets.find((x) => x.id === id);
    if (p) return { id: c.id, front: c.front, back: c.back, matiereCle: p.matiereCle };
  }
  return null;
}

// ── les cartes marquées ─────────────────────────────────────────────────────

/** Une des cartes marquées du joueur dans ces matières (table absente ou aucune marque : null). */
async function carteMarquee(sb: SupabaseClient, mats: readonly string[], graine: string): Promise<Tiree | null> {
  const { items } = await lireCartesMarquees(sb);
  const lot = items.filter((c) => c.matiereCle !== null && mats.includes(c.matiereCle) && c.front.trim() !== "" && c.back.trim() !== "");
  const id = gagnant(graine, lot.map((c) => c.cardId));
  const c = lot.find((x) => x.cardId === id);
  return c && c.matiereCle ? { id: c.cardId, front: c.front, back: c.back, matiereCle: c.matiereCle } : null;
}

// ── les points faibles ──────────────────────────────────────────────────────

/**
 * Une notion faible : son score et, si le catalogue lui rattache un paquet de
 * flashcards (lib/notions : aujourd'hui le FSA), le titre de ce paquet et sa
 * part dedans. Sans paquet nommé, la carte viendra des paquets de sa matière.
 */
export type NotionFaible = { id: string; matiere: string; score: number; vives: number; titrePaquet: string | null; rang: number; voisines: number };

/**
 * Les notions les plus faibles du joueur dans ces matières, les plus faibles
 * d'abord. Le score est celui de « Tes points faibles » (lib/points-faibles :
 * assez de réponses ou de ratures, score d'affichage atteint). Pur :
 * testable sans base.
 */
export function notionsFaibles(lignes: readonly LigneNotion[], mats: readonly string[], max = MAX_FAIBLES): NotionFaible[] {
  const out: NotionFaible[] = [];
  for (const l of lignes) {
    const n = notionParId(l.notion);
    if (!n || !mats.includes(n.matiere)) continue;
    const mesures = { n: l.recentes.length, ok: l.recentes.filter((r) => r.ok).length, enCours: l.enCours, vives: l.vives };
    if (!eligible(mesures)) continue;
    const score = scoreDe(mesures);
    if (score < SEUIL_AFFICHAGE) continue;
    const titrePaquet = n.flashcards[0] ?? null;
    const voisines = titrePaquet ? NOTIONS.filter((x) => x.flashcards[0] === titrePaquet).map((x) => x.id) : [];
    out.push({ id: n.id, matiere: n.matiere, score, vives: l.vives, titrePaquet, rang: Math.max(0, voisines.indexOf(n.id)), voisines: voisines.length });
  }
  return out.sort((a, b) => b.score - a.score || b.vives - a.vives || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).slice(0, max);
}

/**
 * Une carte liée à l'une des notions les plus faibles : la part du paquet qui
 * lui revient quand le catalogue en nomme un, sinon une carte de sa matière
 * (aucune notion faible, ou rien à tirer : null).
 */
async function carteFaible(sb: SupabaseClient, mats: readonly string[], graine: string): Promise<Tiree | null> {
  // chargé à la demande : le module des points faibles embarque le catalogue des calculs, inutile pour les deux autres sources
  const { lireNotionsJoueur } = await import("@/components/moi/points-faibles-data");
  const joueur = await lireNotionsJoueur(sb);
  if (!joueur?.remplie) return null;
  const faibles = notionsFaibles(joueur.lignes, mats);
  if (!faibles.length) return null;
  const titres = [...new Set(faibles.map((f) => f.titrePaquet).filter((t): t is string => t !== null))];
  const idDe = new Map<string, string>();
  if (titres.length) {
    const { data, error } = await sb.from("flashcard_sets").select("id,title").in("title", titres).eq("is_official", true).eq("official_published", true);
    if (!error && Array.isArray(data)) for (const x of data as unknown as { id: string; title: string }[]) idDe.set(x.title, x.id);
  }
  // une notion parmi les plus faibles, tirée du jour ; si elle n'a pas de carte lisible, la suivante
  for (const id of classerParTirage(graine, faibles.map((f) => f.id)).slice(0, ESSAIS)) {
    const f = faibles.find((x) => x.id === id);
    if (!f) continue;
    const setId = f.titrePaquet ? idDe.get(f.titrePaquet) : undefined;
    if (setId) {
      const cartes = await cartesDuPaquet(sb, setId);
      const { debut, fin } = partDuPaquet(f.rang, f.voisines, cartes.length);
      const part = cartes.slice(debut, fin);
      if (part.length) {
        const c = part[indexDansPaquet(`${graine}|${f.id}`, part.length)];
        return { id: c.id, front: c.front, back: c.back, matiereCle: f.matiere };
      }
    }
    const t = await carteDuPaquet(sb, [f.matiere], `${graine}|${f.id}`);
    if (t) return t;
  }
  return null;
}

// ── la carte du jour ────────────────────────────────────────────────────────

function habiller(t: Tiree, reglages: ReglagesCarte, repli: string | null): CarteDuJourLobby | null {
  const m = matiereDe(t.matiereCle);
  if (!m) return null;
  return {
    id: t.id,
    matiere: { cle: m.cle, court: m.libelle, code: m.code },
    recto: t.front,
    verso: t.back,
    resume: resumeReglages(reglages),
    prompt: promptIA(t.front, t.back),
    reglages,
    repli,
  };
}

/**
 * Tire la carte du jour du joueur : null quand il n'y a aucune flashcard à
 * tirer, et LÈVE si une lecture échoue (de quoi ne rien garder en cache). Les
 * réglages viennent de son compte ; illisibles, ce sont les dix matières et
 * « toutes ».
 */
async function tirerCarteDuJour(ctx: CtxCarte): Promise<CarteDuJourLobby | null> {
  const reglages = lireReglages(ctx.user);
  const graine = graineDuJour(ctx.user.id, ctx.jour, reglages);
  let repli: string | null = null;
  let tiree: Tiree | null = null;
  if (reglages.src === "marquees") {
    tiree = await carteMarquee(ctx.sb, reglages.mats, graine);
    if (!tiree) repli = CARTE_JOUR.replis.marquees;
  } else if (reglages.src === "faibles") {
    tiree = await carteFaible(ctx.sb, reglages.mats, graine);
    if (!tiree) repli = CARTE_JOUR.replis.faibles;
  }
  // la source choisie n'a rien donné (ou c'est « toutes ») : le paquet entier des matières cochées
  if (!tiree) tiree = await carteDuPaquet(ctx.sb, reglages.mats, graine);
  // aucune flashcard dans ces matières : le paquet entier du programme
  if (!tiree && reglages.mats.length < TOUTES_LES_MATIERES.length) {
    tiree = await carteDuPaquet(ctx.sb, TOUTES_LES_MATIERES, `${graine}|programme`);
    if (tiree) repli = repli ?? CARTE_JOUR.replis.toutes;
  }
  return tiree ? habiller(tiree, reglages, repli) : null;
}

/** La carte du jour du joueur, ou null (aucune flashcard à tirer, lecture en échec), sans cache. */
export async function lireCarteDuJour(ctx: CtxCarte): Promise<CarteDuJourLobby | null> {
  try {
    return await tirerCarteDuJour(ctx);
  } catch {
    return null;
  }
}

// ── la carte du jour, gardée pour la journée ────────────────────────────────

/**
 * Combien de temps une carte tirée reste gardée, en secondes. « toutes » ne
 * dépend que du catalogue : la clé porte le jour de Paris, la carte vit donc
 * jusqu'à minuit (24 h au plus, la clé du lendemain étant une autre). « Marquées »
 * et « points faibles » dépendent de ce que le joueur fait (une carte marquée,
 * des réponses) : quelques minutes, le temps de revenir sur la page sans tout relire.
 */
export const GARDE_CARTE_S = { toutes: 24 * 3600, vivantes: 10 * 60 } as const;

/** Ce que la fonction gardée lève quand il n'y a rien de sûr à garder (échec, ou aucune carte) : jamais mis en cache. */
class RienAGarder extends Error {}

/**
 * La carte du jour, gardée par joueur, jour de Paris et réglages (la graine du
 * tirage les porte tous les trois : d'autres réglages sont une autre clé, donc
 * jamais une carte périmée), et révoquée par l'étiquette du joueur à
 * l'enregistrement de ses réglages (actions-carte.ts). Hors d'une requête (les
 * tests), ou si le cache de Next est indisponible, on lit sans lui. Rend
 * toujours null plutôt que de lever.
 */
export async function lireCarteDuJourEnCache(ctx: CtxCarte): Promise<CarteDuJourLobby | null> {
  const reglages = lireReglages(ctx.user);
  const graine = graineDuJour(ctx.user.id, ctx.jour, reglages);
  try {
    return await unstable_cache(
      async () => {
        let carte: CarteDuJourLobby | null = null;
        try {
          carte = await tirerCarteDuJour(ctx);
        } catch {
          throw new RienAGarder();
        }
        if (!carte) throw new RienAGarder();
        return carte;
      },
      ["rl-carte-jour-1", graine],
      { revalidate: reglages.src === "toutes" ? GARDE_CARTE_S.toutes : GARDE_CARTE_S.vivantes, tags: [tagCarteDuJour(ctx.user.id)] },
    )();
  } catch (e) {
    if (e instanceof RienAGarder) return null;
    return lireCarteDuJour(ctx);
  }
}
