// La série d'encre : un bonus d'XP pour les jours d'affilée (migration_serie_encre.sql).
// Un jour compte à partir de 10 questions répondues (jour de Paris) ; la série à
// la veille donne le palier du jour : 3 jours ×1,5, 7 jours et plus ×2. Un joker
// par semaine couvre un jour manqué. Le bonus ne touche que l'XP, et c'est la
// base qui l'applique (trigger sur xp_events) : le site ne fait que l'afficher.
//
// Une seule série : les « jours d'encre » du site (Accueil, bâtons, Moi, Session,
// profil) sont cette série. Sans la migration, `lireSerieEncre` rend null et
// chaque écran retombe sur l'ancien calcul (calcStreakAndToday : au moins une
// réponse par jour) ; `joursEncreUnifies` fait ce choix, en un seul endroit.
// Module neutre (ni « use client » ni serveur) : le chargement prend le client
// Supabase qu'on lui passe ; `multDuJour` garde le palier en mémoire, par jour.
import type { SupabaseClient } from "@supabase/supabase-js";
import { decaleJour } from "@/lib/objectif-calc";
import { etatDuJour, type EtatJour } from "@/lib/voice";

export const SEUIL_JOUR = 10;
export type Palier = 1 | 1.5 | 2;

export type SerieEncre = {
  /** jour de Paris du statut, « AAAA-MM-JJ » */
  jour: string;
  /** jours d'affilée à la veille (définitifs) */
  serie: number;
  /** questions répondues aujourd'hui */
  aujourdhui: number;
  /** aujourd'hui compte déjà (10 questions ou plus) */
  fait: boolean;
  /** la série d'aujourd'hui compris s'il est fait */
  serieAffichee: number;
  /** le palier du jour, appliqué dès la première question */
  mult: Palier;
  /** le joker de la semaine est encore là */
  joker: boolean;
  /** hier était un jour manqué couvert par le joker : un second manqué casserait la série */
  veilleSauvee: boolean;
  /** premier jour de la série en cours */
  debut: string | null;
  meilleure: number;
  seuil: number;
};

/** Le palier d'une série (de la veille). */
export function palierDe(serie: number): Palier {
  return serie >= 7 ? 2 : serie >= 3 ? 1.5 : 1;
}

const nb = (v: unknown, defaut = 0) => (typeof v === "number" && Number.isFinite(v) ? v : defaut);

/** Lit la réponse de serie_encre_statut ; null si elle n'a pas la forme attendue. */
export function lireStatut(raw: unknown): SerieEncre | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.jour !== "string" || typeof r.serie !== "number") return null;
  const serie = Math.max(0, Math.floor(nb(r.serie)));
  const seuil = Math.max(1, Math.floor(nb(r.seuil, SEUIL_JOUR)));
  const aujourdhui = Math.max(0, Math.floor(nb(r.aujourdhui)));
  const fait = typeof r.fait === "boolean" ? r.fait : aujourdhui >= seuil;
  const m = nb(r.mult, 1);
  return {
    jour: r.jour.slice(0, 10),
    serie,
    aujourdhui,
    fait,
    serieAffichee: Math.max(serie, Math.floor(nb(r.serie_affichee, serie + (fait ? 1 : 0)))),
    mult: m >= 2 ? 2 : m >= 1.5 ? 1.5 : 1,
    joker: r.joker !== false,
    veilleSauvee: r.veille_sauvee === true,
    debut: typeof r.debut === "string" ? r.debut.slice(0, 10) : null,
    meilleure: Math.max(0, Math.floor(nb(r.meilleure))),
    seuil,
  };
}

/** serie_encre_statut du joueur connecté ; null sans la migration, hors connexion ou en cas d'erreur. */
export async function lireSerieEncre(supabase: SupabaseClient): Promise<SerieEncre | null> {
  try {
    const { data, error } = await supabase.rpc("serie_encre_statut");
    if (error) return null;
    return lireStatut(Array.isArray(data) ? data[0] : data);
  } catch {
    return null;
  }
}

/**
 * Recale le statut sur le nombre de questions de l'anneau de l'Accueil
 * (la même mesure que la base, lue au même moment) : « fait » et la série
 * d'aujourd'hui suivent ce que le joueur voit.
 */
export function avecAnneau(s: SerieEncre, repondues: number): SerieEncre {
  const aujourdhui = Math.max(repondues, 0);
  const fait = aujourdhui >= s.seuil;
  const serieAffichee = s.serie + (fait ? 1 : 0);
  return { ...s, aujourdhui, fait, serieAffichee, meilleure: Math.max(s.meilleure, serieAffichee) };
}

/** Ce que les écrans lisent des « jours d'encre » : le nombre, le bâton du jour, et le statut quand la migration est là. */
export type JoursEncre = {
  /** jours d'encre : aujourd'hui compris s'il est fait, sinon jusqu'à hier */
  streak: number;
  /** le bâton du jour : tracé (10 questions), en attente, ou sec le soir */
  dayState: EtatJour;
  /** le statut recalé sur l'anneau ; null : migration pas collée, ancien calcul */
  serie: SerieEncre | null;
  /** questions qui manquent pour que le jour compte (null : ancien calcul, une réponse suffit) */
  reste: number | null;
};

/**
 * La série unique des écrans. Avec le statut de la migration : la série à
 * 10 questions et son joker. Sans : l'ancien calcul (`ancien`, au moins une
 * réponse par jour). `repondues` : les questions du jour, comme l'anneau.
 */
export function joursEncreUnifies(
  statut: SerieEncre | null,
  repondues: number,
  heure: number,
  ancien: { streak: number; todayDone: boolean },
): JoursEncre {
  if (!statut) {
    const fait = ancien.todayDone || repondues > 0;
    return { streak: ancien.streak, dayState: fait ? "fait" : etatDuJour(0, heure), serie: null, reste: null };
  }
  const s = avecAnneau(statut, repondues);
  return { streak: s.serieAffichee, dayState: s.fait ? "fait" : etatDuJour(0, heure), serie: s, reste: Math.max(0, s.seuil - s.aujourdhui) };
}

// ---------------------------------------------------------------------------
// La même série recalculée côté serveur à partir des questions par jour : les
// profils (celui d'un autre joueur n'a pas de statut à lire), le Journal, les
// sceaux. Mêmes règles que _serie_avancer dans la migration.

export type CalculSerie = {
  /** jours d'affilée à la veille */
  serie: number;
  /** aujourd'hui compris s'il est fait */
  serieAffichee: number;
  fait: boolean;
  /** la meilleure série, aujourd'hui compris */
  meilleure: number;
  /** chaque jour qui allonge la série, avec sa longueur (7, 30, 100 : les paliers notables) */
  atteints: { jour: string; n: number }[];
};

const lundiDe = (jour: string) => decaleJour(jour, -((new Date(jour + "T12:00:00Z").getUTCDay() + 6) % 7));

/**
 * La série d'un joueur d'après ses questions par jour (jour de Paris).
 * `pauses` : ses jours de repos et de pause (lirePauses) ; sans leurs 10
 * questions, ils sont neutres : ni +1, ni cassure, ni joker.
 */
export function calculerSerie(jours: Map<string, number>, aujourdhui: string, seuil = SEUIL_JOUR, pauses: ReadonlySet<string> = new Set()): CalculSerie {
  let premier: string | null = null;
  for (const [j, n] of jours) if (n > 0 && j < aujourdhui && (premier === null || j < premier)) premier = j;
  let serie = 0;
  let meilleure = 0;
  let sauvee = false;
  let jokerSemaine: string | null = null;
  const atteints: { jour: string; n: number }[] = [];
  if (premier) {
    for (let jour = premier; jour < aujourdhui; jour = decaleJour(jour, 1)) {
      if ((jours.get(jour) ?? 0) >= seuil) {
        serie++;
        sauvee = false;
        atteints.push({ jour, n: serie });
        meilleure = Math.max(meilleure, serie);
      } else if (pauses.has(jour)) {
        // jour de repos ou de pause : rien ne bouge
      } else if (serie > 0) {
        const lundi = lundiDe(jour);
        if (sauvee || jokerSemaine === lundi) {
          serie = 0;
          sauvee = false;
        } else {
          jokerSemaine = lundi;
          sauvee = true;
        }
      } else {
        sauvee = false;
      }
    }
  }
  const fait = (jours.get(aujourdhui) ?? 0) >= seuil;
  const serieAffichee = serie + (fait ? 1 : 0);
  if (fait) atteints.push({ jour: aujourdhui, n: serieAffichee });
  return { serie, serieAffichee, fait, meilleure: Math.max(meilleure, serieAffichee), atteints };
}

// ---------------------------------------------------------------------------
// Le repos et la pause (migration_codex_v3.sql §8, V3 §10.4) : des jours posés
// d'avance où la série ne bouge pas. Le réglage est dans Moi › Réglages ; ici,
// la lecture seulement.

export type GenrePause = "repos" | "pause";
export type Pauses = {
  /** tous les jours posés (passés compris), pour calculerSerie */
  jours: Set<string>;
  /** les jours d'aujourd'hui à la fin, dans l'ordre */
  aVenir: { jour: string; genre: GenrePause }[];
};

/** Les jours de repos et de pause du joueur connecté ; null sans la migration (ni repos ni pause) ou en cas d'erreur. */
export async function lirePauses(supabase: SupabaseClient, aujourdhui: string): Promise<Pauses | null> {
  try {
    const { data, error } = await supabase.from("serie_pauses").select("jour,genre").order("jour").limit(1000);
    if (error || !Array.isArray(data)) return null;
    const jours = new Set<string>();
    const aVenir: Pauses["aVenir"] = [];
    for (const r of data as { jour: unknown; genre: unknown }[]) {
      if (typeof r.jour !== "string" || (r.genre !== "repos" && r.genre !== "pause")) continue;
      const jour = r.jour.slice(0, 10);
      jours.add(jour);
      if (jour >= aujourdhui) aVenir.push({ jour, genre: r.genre });
    }
    return { jours, aVenir };
  } catch {
    return null;
  }
}

/** L'XP réelle d'un gain de base (arrondi 0,5 vers le haut, comme la base). */
export function xpAvecSerie(base: number, mult: number): number {
  return mult > 1 ? Math.round(base * mult + 1e-9) : base;
}

/** « ×1,5 » · « ×2 » · « » (×1 : rien). */
export function libelleMult(mult: number): string {
  return mult >= 2 ? "×2" : mult > 1 ? "×1,5" : "";
}

/** « +24 XP (×2) » ; sans bonus, « +12 XP ». */
export function texteGain(xp: number, mult: number): string {
  const m = libelleMult(mult);
  return `+${xp} XP${m ? ` (${m})` : ""}`;
}

const JOUR = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });
const HM = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Minutes qu'il reste avant minuit, à Paris. */
export function minutesAvantMinuit(now: Date = new Date()): number {
  const p = HM.formatToParts(now);
  const h = Number(p.find((x) => x.type === "hour")?.value ?? 0) % 24;
  const m = Number(p.find((x) => x.type === "minute")?.value ?? 0);
  return Math.max(0, 24 * 60 - (h * 60 + m));
}

// ---------------------------------------------------------------------------
// Le palier du jour, gardé en mémoire (il ne change qu'à minuit) : les écrans
// de réponses l'attendent d'avance, pour montrer « +24 XP (×2) » sans délai.

let memo: { jour: string; p: Promise<Palier> } | null = null;

/** Le palier d'aujourd'hui (1 sans la migration ou en cas d'erreur). Une seule lecture par jour et par page. */
export function multDuJour(supabase: SupabaseClient): Promise<Palier> {
  const jour = JOUR.format(new Date());
  if (memo && memo.jour === jour) return memo.p;
  const p = lireSerieEncre(supabase).then((s) => (s ? s.mult : (1 as Palier)));
  memo = { jour, p };
  // une lecture sans palier ne reste pas longtemps en mémoire : la prochaine réponse réessaie
  void p.then((m) => {
    if (m === 1) setTimeout(() => (memo?.p === p ? (memo = null) : undefined), 15_000);
  });
  return p;
}
