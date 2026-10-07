import { createClient } from "@/lib/supabase/browser";
import { PRESENCE_INTERVALLE, type Presence } from "@/lib/presence";

// La présence côté navigateur : chaque point ou libellé affiché déclare le
// joueur qu'il suit ; les demandes d'une même page partent ensemble (un seul
// get_presence), puis se relisent toutes les minutes tant que l'onglet est
// visible, et dès qu'il le redevient. Une lecture de plus de 30 s est
// refaite quand un joueur réapparaît (retour sur une page). Sans la
// migration (RPC absente) : tout reste silencieux, rien ne s'affiche.

type Entree = Presence | null; // null : lu, aucun signal (ou présence indisponible)
type Exemple = { visible: boolean; secondsAgo: number | null } | null;

const FRAIS_MS = 30_000;

const cache = new Map<string, Entree>();
const lu = new Map<string, number>();
const suivis = new Map<string, number>();
const ecouteurs = new Set<() => void>();
let enAttente = new Set<string>();
let minuterie: ReturnType<typeof setTimeout> | null = null;
let releve: ReturnType<typeof setInterval> | null = null;
let indisponible = false;
let demo: ((id: string) => Exemple) | null = null;

function prevenir() {
  for (const l of ecouteurs) l();
}

/** La fonction n'existe pas encore (migration pas collée). */
export function rpcAbsente(e: { code?: string; message?: string } | null | undefined) {
  return !!e && (e.code === "PGRST202" || e.code === "42883" || /could not find the function|does not exist/i.test(e.message ?? ""));
}

function noter(id: string, e: Entree) {
  cache.set(id, e);
  lu.set(id, Date.now());
}

async function lire(ids: string[]) {
  if (ids.length === 0) return;
  if (demo) {
    const at = Date.now();
    for (const id of ids) {
      const p = demo(id);
      noter(id, p ? { ...p, at } : null);
    }
    prevenir();
    return;
  }
  if (indisponible) {
    for (const id of ids) if (!cache.has(id)) noter(id, null);
    prevenir();
    return;
  }
  const sb = createClient();
  for (let i = 0; i < ids.length; i += 300) {
    const lot = ids.slice(i, i + 300);
    const { data, error } = await sb.rpc("get_presence", { p_ids: lot });
    if (error) {
      if (rpcAbsente(error)) indisponible = true;
      for (const id of lot) if (!cache.has(id)) noter(id, null);
      continue;
    }
    const at = Date.now();
    const rows = new Map(((data ?? []) as { user_id: string; visible: boolean; seconds_ago: number | null }[]).map((r) => [r.user_id, r]));
    for (const id of lot) {
      const r = rows.get(id);
      noter(id, r ? { visible: !!r.visible, secondsAgo: r.seconds_ago ?? null, at } : null);
    }
  }
  prevenir();
}

function planifier() {
  if (minuterie) return;
  minuterie = setTimeout(() => {
    minuterie = null;
    const ids = [...enAttente];
    enAttente = new Set();
    void lire(ids);
  }, 40);
}

/** Relit tous les joueurs suivis (relève de la minute, onglet redevenu visible). */
function relire() {
  if (suivis.size === 0 || (indisponible && !demo)) return;
  for (const id of suivis.keys()) enAttente.add(id);
  planifier();
}

function demarrerReleve() {
  if (releve || typeof window === "undefined") return;
  releve = setInterval(() => {
    if (document.visibilityState === "visible") relire();
  }, PRESENCE_INTERVALLE);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") relire();
  });
}

/** Suit un joueur ; rend la fonction qui arrête de le suivre. */
export function suivre(id: string) {
  suivis.set(id, (suivis.get(id) ?? 0) + 1);
  // jamais lu, ou lu il y a plus de 30 s (retour sur une page) : on relit
  if (!cache.has(id) || Date.now() - (lu.get(id) ?? 0) > FRAIS_MS) {
    enAttente.add(id);
    planifier();
  }
  demarrerReleve();
  return () => {
    const n = (suivis.get(id) ?? 1) - 1;
    if (n <= 0) suivis.delete(id);
    else suivis.set(id, n);
  };
}

export function ecouter(l: () => void) {
  ecouteurs.add(l);
  return () => {
    ecouteurs.delete(l);
  };
}

/** undefined : pas encore lu ; null : lu, rien à montrer (aucun signal ou présence indisponible). */
export function presenceDe(id: string): Entree | undefined {
  return cache.get(id);
}

/** Aperçus locaux (app/preview-da) : une présence d'exemple par joueur, sans réseau. */
export function presenceDemo(exemple: ((id: string) => Exemple) | null) {
  demo = exemple;
}
