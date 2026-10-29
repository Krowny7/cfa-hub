// « Les maîtres de chaque matière » : pour chacune des 10 matières du
// programme, le meilleur joueur en maîtrise, et ta place. Côté serveur
// uniquement, avec le client admin (il faut lire les résultats de tous les
// joueurs) : ne jamais importer ce module depuis un composant client. Tout
// dégrade proprement : pas de clé admin, table illisible, personne de classé
// → null (la carte ne s'affiche pas), jamais d'exception.
//
// La MAÎTRISE d'une matière est celle du classement (masteryByUser de
// components/classement/data.ts, ancienne règle de lib/maitrise.ts, qui verrouille
// aussi les rangs) : on additionne les séances ciblées d'UNE SEULE matière
// (practice_session_results, topics à un seul élément), et le pourcentage est
// bonnes réponses / réponses. Elle est « mesurée » dès 5 réponses
// (ANCIENNE_MIN_QUESTIONS). Pour être CLASSÉ parmi les maîtres, il en faut
// beaucoup plus : SEUIL_MAITRE = 20 réponses dans la matière (lib/voice-classement.ts)
// — sinon un 5 sur 5 prendrait la couronne d'un joueur qui a répondu à 300
// questions. Le classement va au pourcentage, puis au nombre de réponses (à
// pourcentage égal, celui qui a le plus répondu devance) ; à égalité parfaite,
// c'est toi qui passes devant. Ta place compte les joueurs strictement devant
// toi, +1. Tu n'es classé que si tu as, toi aussi, le seuil de réponses.
import type { SupabaseClient } from "@supabase/supabase-js";
import { displayName } from "@/components/classement/format";
import { lireTout } from "@/components/classement/lecture";
import type { MaitreJoueur, MaitreMatiere } from "@/components/classement/types";
import { ANCIENNE_MIN_QUESTIONS } from "@/lib/maitrise";
import { programMastery, type TopicMastery } from "@/lib/mastery";
import { TOPICS } from "@/lib/practiceTopics";
import { DEFAULT_ELO } from "@/lib/ranks";
import { MATIERES_COURTES, SEUIL_MAITRE } from "@/lib/voice-classement";

type Ligne = { user_id: string; topics: string[] | null; score: number | null; total: number | null };

/** Bonnes réponses et réponses de chaque joueur, matière par matière. */
export type Cumul = Map<string, Map<string, { correct: number; total: number }>>;

/** Additionne les séances ciblées d'une seule matière (même règle que masteryByUser). Fonction pure. */
export function cumulDe(lignes: Ligne[]): Cumul {
  const out: Cumul = new Map();
  for (const r of lignes) {
    const topics = r.topics ?? [];
    if (topics.length !== 1 || !r.user_id) continue;
    const parMatiere = out.get(r.user_id) ?? new Map<string, { correct: number; total: number }>();
    const a = parMatiere.get(topics[0]) ?? { correct: 0, total: 0 };
    a.correct += r.score ?? 0;
    a.total += r.total ?? 0;
    parMatiere.set(topics[0], a);
    out.set(r.user_id, parMatiere);
  }
  return out;
}

const pctDe = (a: { correct: number; total: number }) => Math.round((a.correct / a.total) * 100);

/** La maîtrise du programme d'un joueur, comme masteryByUser (matières sous 5 réponses ou non travaillées = 0). */
export function maitriseProgramme(cumul: Cumul, userId: string): number {
  const parMatiere = cumul.get(userId);
  const topics: TopicMastery[] = TOPICS.map((t) => {
    const a = parMatiere?.get(t.key);
    return { key: t.key, label: t.label, pct: a && a.total >= ANCIENNE_MIN_QUESTIONS ? pctDe(a) : null, answered: a?.total ?? 0 };
  });
  return programMastery(topics);
}

/** Le sommet d'une matière : qui est le maître, et où tu en es (sans les profils, que le chargement ajoute). */
export type Sommet = {
  cle: string;
  /** null : personne n'a le seuil de réponses */
  maitreId: string | null;
  maitrePct: number;
  cestToi: boolean;
  moiPct: number | null;
  moiPlace: number | null;
  moiReponses: number;
};

/**
 * Le maître de chaque matière et ta place, d'après les cumuls de tous les
 * joueurs. Fonction pure (la lecture est dans lireMaitres).
 */
export function sommetsDe(cumul: Cumul, moi: string, seuil = SEUIL_MAITRE): Sommet[] {
  return TOPICS.map((t) => {
    const mien = cumul.get(moi)?.get(t.key);
    const moiReponses = mien?.total ?? 0;
    const moiPct = mien && mien.total >= ANCIENNE_MIN_QUESTIONS ? pctDe(mien) : null;
    const classe = moiPct !== null && moiReponses >= seuil;
    // les autres joueurs qui ont le seuil, du meilleur au moins bon (pourcentage, réponses, identifiant)
    const autres: Array<{ userId: string; pct: number; reponses: number }> = [];
    for (const [userId, parMatiere] of cumul) {
      const a = parMatiere.get(t.key);
      if (userId === moi || !a || a.total < seuil) continue;
      autres.push({ userId, pct: pctDe(a), reponses: a.total });
    }
    autres.sort((x, y) => y.pct - x.pct || y.reponses - x.reponses || (x.userId < y.userId ? -1 : 1));
    const devant = classe ? autres.filter((o) => o.pct > (moiPct as number) || (o.pct === moiPct && o.reponses > moiReponses)).length : 0;
    const moiPlace = classe ? devant + 1 : null;
    const cestToi = moiPlace === 1;
    const tete = cestToi ? { userId: moi, pct: moiPct as number } : autres[0] ? { userId: autres[0].userId, pct: autres[0].pct } : null;
    return { cle: t.key, maitreId: tete?.userId ?? null, maitrePct: tete?.pct ?? 0, cestToi, moiPct, moiPlace, moiReponses };
  });
}

// ——— lecture ———

// Tous les résultats, lus d'un coup et gardés une minute (la carte est sur une
// page très visitée ; le classement bouge lentement).
const MEMO_MS = 60_000;
let memo: { at: number; lecture: Promise<Cumul> } | null = null;

function lireCumul(admin: SupabaseClient): Promise<Cumul> {
  const now = Date.now();
  if (memo && now - memo.at < MEMO_MS) return memo.lecture;
  const lecture = lireTout<Ligne>((de, a) => admin.from("practice_session_results").select("user_id,topics,score,total").order("id").range(de, a), 100).then(cumulDe);
  memo = { at: now, lecture };
  lecture.catch(() => {
    if (memo?.lecture === lecture) memo = null;
  });
  return lecture;
}

/** Oublie la lecture gardée (pour les tests : la mémoire de 60 s ne dépend pas du client). */
export function oublierLesLectures() {
  memo = null;
}

/**
 * Les maîtres des 10 matières et ta place, ou null (pas de clé admin, lecture
 * impossible, personne de classé nulle part). `rank` des maîtres reste null :
 * la page y met leur place générale quand elle la connaît (avecPlaces).
 */
export async function lireMaitres(sb: SupabaseClient, admin: SupabaseClient | null, moi: string): Promise<MaitreMatiere[] | null> {
  if (!admin) return null;
  try {
    const cumul = await lireCumul(admin);
    const sommets = sommetsDe(cumul, moi);
    if (sommets.every((s) => s.maitreId === null)) return null;
    const ids = [...new Set(sommets.map((s) => s.maitreId).filter((x): x is string => x !== null))];
    const [profils, notes] = await Promise.all([
      sb.from("profiles").select("id,username,avatar_url").in("id", ids),
      sb.from("ratings").select("user_id,elo,games_played").in("user_id", ids),
    ]);
    const nom = new Map(((profils.data as Array<{ id: string; username: string | null; avatar_url: string | null }> | null) ?? []).map((p) => [p.id, p]));
    const note = new Map(((notes.data as Array<{ user_id: string; elo: number; games_played: number }> | null) ?? []).map((r) => [r.user_id, r]));
    return sommets.map((s): MaitreMatiere => {
      const id = s.maitreId;
      const maitre: MaitreJoueur | null = id
        ? {
            userId: id,
            name: displayName(nom.get(id)?.username, id),
            avatarUrl: nom.get(id)?.avatar_url ?? null,
            pct: s.maitrePct,
            elo: note.get(id)?.elo ?? DEFAULT_ELO,
            gamesPlayed: note.get(id)?.games_played ?? 0,
            mastery: maitriseProgramme(cumul, id),
            rank: null,
          }
        : null;
      return { cle: s.cle, court: MATIERES_COURTES[s.cle] ?? s.cle, maitre, cestToi: s.cestToi, moiPct: s.moiPct, moiPlace: s.moiPlace, moiReponses: s.moiReponses };
    });
  } catch {
    return null;
  }
}

/** Pose la place générale des maîtres connus (pour le palier du Top 10 de leur insigne). */
export function avecPlaces(maitres: MaitreMatiere[] | null, places: Map<string, number>): MaitreMatiere[] | null {
  if (!maitres) return maitres;
  return maitres.map((m) => (m.maitre && places.has(m.maitre.userId) ? { ...m, maitre: { ...m.maitre, rank: places.get(m.maitre.userId) as number } } : m));
}
