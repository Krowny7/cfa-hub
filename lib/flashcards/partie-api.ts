import { CARTES_MAX } from "@/lib/flashcards/partie";
import type { LigneProgression } from "@/lib/flashcards/progression";

// La donne côté réseau : une fois les cartes tirées (sur les identifiants
// seulement, lib/flashcards/partie.ts), le navigateur va chercher leur texte
// et, en même temps, où en sont les boucles de leurs paquets sur le compte
// (GET app/api/flashcards/partie?ids=…). Module neutre (serveur et
// navigateur) : la route, les identifiants permis, la forme de la réponse, sa
// validation, et l'appel.

export const ROUTE_PARTIE = "/api/flashcards/partie";
/** Un identifiant de carte (uuid). */
export const ID_CARTE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CarteRecue = { id: string; setId: string; front: string; back: string };
/** `lignes` : les boucles des paquets des cartes sur le compte, par clé « set:<id> » ; null : table pas encore créée ou base injoignable. */
export type ReponseCartes = { cartes: CarteRecue[]; lignes: Record<string, LigneProgression> | null };

/** Les identifiants d'une requête : uniques, bien formés, au plus CARTES_MAX ; null si l'un d'eux est invalide ou s'il n'y en a pas. */
export function idsDeRequete(brut: string | null | undefined): string[] | null {
  if (!brut) return null;
  const ids = [...new Set(brut.split(",").map((x) => x.trim()))];
  if (ids.length === 0 || ids.length > CARTES_MAX || !ids.every((x) => ID_CARTE.test(x))) return null;
  return ids;
}

/** La réponse du serveur, vérifiée (null si elle n'a pas la forme attendue). */
export function lireReponse(x: unknown): ReponseCartes | null {
  if (!x || typeof x !== "object") return null;
  const o = x as { cartes?: unknown; lignes?: unknown };
  if (!Array.isArray(o.cartes)) return null;
  const cartes: CarteRecue[] = [];
  for (const c of o.cartes) {
    if (!c || typeof c !== "object") return null;
    const { id, setId, front, back } = c as Record<string, unknown>;
    if (typeof id !== "string" || typeof setId !== "string" || typeof front !== "string" || typeof back !== "string") return null;
    cartes.push({ id, setId, front, back });
  }
  let lignes: Record<string, LigneProgression> | null = null;
  if (o.lignes && typeof o.lignes === "object" && !Array.isArray(o.lignes)) {
    lignes = {};
    for (const [cle, l] of Object.entries(o.lignes as Record<string, unknown>)) {
      const m = l && typeof l === "object" ? (l as { maj?: unknown }).maj : null;
      if (typeof m === "number" && Number.isFinite(m)) lignes[cle] = { etat: (l as { etat?: unknown }).etat, maj: m };
    }
  }
  return { cartes, lignes };
}

/** Va chercher le texte des cartes tirées ; null si le réseau ou le serveur ne répond pas (la donne est alors à refaire). */
export async function chargerCartes(ids: readonly string[], appeler: typeof fetch = fetch): Promise<ReponseCartes | null> {
  if (ids.length === 0 || ids.length > CARTES_MAX) return null;
  try {
    const r = await appeler(`${ROUTE_PARTIE}?ids=${ids.map(encodeURIComponent).join(",")}`, { cache: "no-store", credentials: "same-origin" });
    return r.ok ? lireReponse(await r.json()) : null;
  } catch {
    return null;
  }
}
