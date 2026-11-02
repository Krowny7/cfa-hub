// Les lectures nouvelles de la page Moi « La synthèse » (migration_moi_synthese.sql,
// puis migration_moi_activite.sql) :
// - maitrise_synthese : la maîtrise de chaque matière à 16 dates, celle de chaque
//   notion, le calcul ou la théorie, la moyenne des joueurs ;
// - rythme_joueur : les secondes par question ;
// - activite_depuis : les réponses données depuis chaque comparaison (3, 30, 60,
//   90 jours), matière par matière.
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
// la disposition des dates (30, 60, 90 jours, les douze semaines, puis 3 jours) est définie une seule fois, dans le modèle qui lit l'historique
import { COMPARAISONS, JOURS_COMPARAISON, JOURS_RECENT, JOURS_SYNTHESE, RANG_COMPARAISON, SEMAINES_COURBE } from "@/components/moi/synthese/modele";

export { JOURS_COMPARAISON, JOURS_RECENT, SEMAINES_COURBE };

/** Combien de temps une lecture est gardée. */
export const MEMO_SYNTHESE_MS = 5 * 60_000;
/**
 * Les réponses « depuis il y a J jours » accompagnent la maîtrise d'aujourd'hui (getMaitrise, gardée 60 s) :
 * elles ne doivent jamais être plus vieilles qu'elle, sinon la carte dirait « aucune réponse » juste après un entraînement.
 */
export const MEMO_ACTIVITE_MS = 60_000;

const JOUR = 86_400_000;

/**
 * Les 16 dates demandées à maitrise_synthese : maintenant − 30, 60 et 90 jours
 * (rangs 0 à 2), puis maintenant − 7 × k jours pour k de 1 à 12 (le rang 3 est
 * la semaine dernière, le rang 14 il y a 12 semaines), puis maintenant − 3 jours
 * (rang 15). La date de 3 jours vient EN DERNIER pour ne décaler ni les
 * comparaisons longues ni les semaines (l'accueil lit aussi cette liste).
 * @param now l'instant de la requête (ms)
 */
export function datesSynthese(now: number): string[] {
  return JOURS_SYNTHESE.map((j) => new Date(now - j * JOUR).toISOString());
}

/** Les dates demandées à activite_depuis : celles des comparaisons, dans l'ordre du sélecteur (3, 30, 60, 90 jours), prises dans datesSynthese pour tomber au même instant. */
export function datesActivite(dates: readonly string[]): string[] {
  return COMPARAISONS.map((j) => dates[RANG_COMPARAISON[j]]);
}

/** La réponse de maitrise_synthese, vérifiée dans sa forme seulement (le détail se lit dans modele.ts). */
export type SynBrut = { historique: unknown[]; notions: Record<string, unknown>; calcul: Record<string, unknown>; moyennes: Record<string, unknown> };

/** La réponse de rythme_joueur, vérifiée dans sa forme seulement. */
export type RytBrut = { sec: unknown; n: unknown; matieres: Record<string, unknown> };

/** La réponse de activite_depuis, vérifiée dans sa forme seulement (activiteEn, dans modele.ts, la lit). */
export type ActBrut = { depuis: unknown[] };

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

/** Un JSON inattendu (ni objet, ni liste `depuis`) : null. */
export function actBrutDepuis(data: unknown): ActBrut | null {
  if (!estObjet(data) || !Array.isArray(data.depuis)) return null;
  return { depuis: data.depuis };
}

/** Un échec (migration pas encore collée, base occupée) n'est gardé que peu : la page se remplit vite une fois la migration collée. */
export const MEMO_ECHEC_MS = 30_000;

type Memo<T> = { jusqua: number; lecture: Promise<T | null> };

/** Une lecture gardée : une par requête et par joueur, puis `duree` par joueur (5 minutes par défaut ; 30 secondes si elle a échoué). */
function lecteurGarde<T>(appel: (admin: SupabaseClient, userId: string, arg: string[] | undefined) => Promise<T | null>, duree = MEMO_SYNTHESE_MS) {
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
    const entree: Memo<T> = { jusqua: now + duree, lecture };
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

/**
 * activite_depuis pour un joueur, avec le client de service : les réponses depuis
 * chaque comparaison. null : pas de clé de service, migration_moi_activite.sql pas
 * collée, erreur ou réponse inattendue (la carte garde alors son affichage d'avant).
 * @param dates les dates de datesSynthese(now), comme pour maitrise_synthese : la fonction n'en reçoit que
 *   celles des comparaisons (datesActivite : 3, 30, 60 puis 90 jours), et `depuis` y renvoie par son rang
 */
export const lireActivite = lecteurGarde<ActBrut>(async (admin, userId, dates) => {
  const { data, error } = await admin.rpc("activite_depuis", { p_user: userId, p_dates: dates ? datesActivite(dates) : [] });
  return error ? null : actBrutDepuis(data);
}, MEMO_ACTIVITE_MS);
