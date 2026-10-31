// Les deux lectures nouvelles de la page Moi « La synthèse » (migration_moi_synthese.sql) :
// - maitrise_synthese : la maîtrise de chaque matière à 15 dates, celle de chaque
//   notion, le calcul ou la théorie, la moyenne des joueurs ;
// - rythme_joueur : les secondes par question.
// Comme maitrise_joueur, ce sont des fonctions du client de service (p_user) :
// sans clé de service ou sans la migration collée, elles rendent null et la page
// masque les modules concernés (aucun chiffre inventé). Chaque lecture est gardée
// 5 minutes par joueur (cache de React pour une requête, plus une Map horodatée :
// même motif que lib/mastery.ts), pour ne pas marteler la base à chaque visite ;
// un échec n'est gardé que 30 secondes. Ne lance jamais d'erreur. Le détail des champs se lit dans
// components/moi/synthese/modele.ts, qui les interprète (module neutre).
// Module serveur.
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
// la disposition des dates (30, 60, 90 jours, puis les douze semaines) est définie une seule fois, dans le modèle qui lit l'historique
import { JOURS_COMPARAISON, SEMAINES_COURBE } from "@/components/moi/synthese/modele";

export { JOURS_COMPARAISON, SEMAINES_COURBE };

/** Combien de temps une lecture est gardée. */
export const MEMO_SYNTHESE_MS = 5 * 60_000;

const JOUR = 86_400_000;

/**
 * Les 15 dates demandées à maitrise_synthese : maintenant − 30, 60 et 90 jours
 * (rangs 0 à 2), puis maintenant − 7 × k jours pour k de 1 à 12 (le rang 3 est
 * la semaine dernière, le rang 14 il y a 12 semaines).
 * @param now l'instant de la requête (ms)
 */
export function datesSynthese(now: number): string[] {
  const jours = [...JOURS_COMPARAISON, ...Array.from({ length: SEMAINES_COURBE }, (_, i) => 7 * (i + 1))];
  return jours.map((j) => new Date(now - j * JOUR).toISOString());
}

/** La réponse de maitrise_synthese, vérifiée dans sa forme seulement (le détail se lit dans modele.ts). */
export type SynBrut = { historique: unknown[]; notions: Record<string, unknown>; calcul: Record<string, unknown>; moyennes: Record<string, unknown> };

/** La réponse de rythme_joueur, vérifiée dans sa forme seulement. */
export type RytBrut = { sec: unknown; n: unknown; matieres: Record<string, unknown> };

const estObjet = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Un JSON inattendu (ni objet, ni les quatre blocs) : null. */
export function synBrutDepuis(data: unknown): SynBrut | null {
  if (!estObjet(data)) return null;
  const { historique, notions, calcul, moyennes } = data;
  if (!Array.isArray(historique) || !estObjet(notions) || !estObjet(calcul) || !estObjet(moyennes)) return null;
  return { historique, notions, calcul, moyennes };
}

export function rytBrutDepuis(data: unknown): RytBrut | null {
  if (!estObjet(data) || !estObjet(data.matieres)) return null;
  return { sec: data.sec, n: data.n, matieres: data.matieres };
}

/** Un échec (migration pas encore collée, base occupée) n'est gardé que peu : la page se remplit vite une fois la migration collée. */
export const MEMO_ECHEC_MS = 30_000;

type Memo<T> = { jusqua: number; lecture: Promise<T | null> };

/** Une lecture gardée : une par requête et par joueur, puis 5 minutes par joueur (30 secondes si elle a échoué). */
function lecteurGarde<T>(appel: (admin: SupabaseClient, userId: string, arg: string[] | undefined) => Promise<T | null>) {
  const memo = new Map<string, Memo<T>>();
  const parRequete = cache((_userId: string): { lecture: Promise<T | null> | null } => ({ lecture: null }));
  return (admin: SupabaseClient | null, userId: string, arg?: string[]): Promise<T | null> => {
    if (!admin || !userId) return Promise.resolve(null);
    const r = parRequete(userId);
    if (r.lecture) return r.lecture;
    const now = Date.now();
    const gardee = memo.get(userId);
    if (gardee && now < gardee.jusqua) return (r.lecture = gardee.lecture);
    for (const [k, v] of memo) if (now >= v.jusqua) memo.delete(k);
    const lecture = appel(admin, userId, arg).catch(() => null);
    const entree: Memo<T> = { jusqua: now + MEMO_SYNTHESE_MS, lecture };
    memo.set(userId, entree);
    void lecture.then((v) => {
      if (v === null) entree.jusqua = Math.min(entree.jusqua, Date.now() + MEMO_ECHEC_MS);
    });
    return (r.lecture = lecture);
  };
}

/**
 * maitrise_synthese pour un joueur, avec le client de service. null : pas de clé de
 * service, migration pas collée, erreur ou réponse inattendue.
 * @param dates les dates de datesSynthese(now) ; `historique` est rendu dans le même ordre
 */
export const lireMaitriseSynthese = lecteurGarde<SynBrut>(async (admin, userId, dates) => {
  const { data, error } = await admin.rpc("maitrise_synthese", { p_user: userId, p_dates: dates ?? [] });
  return error ? null : synBrutDepuis(data);
});

/** rythme_joueur (les 90 derniers jours) pour un joueur, avec le client de service. null : source absente ou illisible. */
export const lireRythme = lecteurGarde<RytBrut>(async (admin, userId) => {
  const { data, error } = await admin.rpc("rythme_joueur", { p_user: userId, p_jours: 90 });
  return error ? null : rytBrutDepuis(data);
});
