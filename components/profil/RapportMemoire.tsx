"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { jourCourt } from "@/components/profil/blocs/commun";
import { RAPPORT as R } from "@/lib/voice-rapport";
import s from "./RapportDeForce.module.css";

// « Depuis ta dernière visite », dans le bandeau Rapport de force
// (RapportDeForce.tsx, rendu au serveur) : après un jeton dont l'écart a
// bougé du seuil d'égalité ou plus depuis ta dernière visite de ce profil,
// une flèche de 10 px (▲ vert : l'écart s'est amélioré pour toi ; ▼ rouge
// sinon), avec pour infobulle le jeton d'alors (« Le 12 oct. : toi −150 »).
// Dans ce navigateur seulement : localStorage, clé rl-rapport:{toi}:{lui}
// (chaque compte du navigateur a la sienne), valeur
// { date, ecarts }, réécrite à chaque visite (une fois montée). Stockage
// indisponible (navigation privée, refus) : pas de flèche, rien ne casse.

/** une manche telle qu'elle se compare d'une visite à l'autre : l'écart signé de ton côté, son jeton (« toi −150 ») et le seuil d'égalité */
export type MancheNotee = { d: number; t: string; seuil: number };
/** ce que garde le navigateur : le jour de la visite (AAAA-MM-JJ) et l'écart de chaque manche */
export type Memoire = { date: string; ecarts: Record<string, { d: number; t: string }> };

const cleDe = (id: string) => `rl-rapport:${id}`;
const JOUR = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });

/** Une mémoire lue dans le stockage, validée ; null si absente ou illisible. */
export function lireMemoire(brut: string | null): Memoire | null {
  if (!brut) return null;
  try {
    const v = JSON.parse(brut) as unknown;
    if (!v || typeof v !== "object") return null;
    const { date, ecarts } = v as { date?: unknown; ecarts?: unknown };
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !ecarts || typeof ecarts !== "object") return null;
    const propres: Memoire["ecarts"] = {};
    for (const [k, e] of Object.entries(ecarts as Record<string, unknown>)) {
      const { d, t } = (e ?? {}) as { d?: unknown; t?: unknown };
      if (typeof d === "number" && Number.isFinite(d) && typeof t === "string") propres[k] = { d, t };
    }
    return { date, ecarts: propres };
  } catch {
    return null;
  }
}

/** Ce que le navigateur garde de cette visite. */
export const memoireDe = (ecarts: Record<string, MancheNotee>, date: string): Memoire => ({
  date,
  ecarts: Object.fromEntries(Object.entries(ecarts).map(([k, m]) => [k, { d: m.d, t: m.t }])),
});

/** La flèche d'une manche : « monte » si l'écart s'est amélioré pour toi d'au moins le seuil d'égalité, « baisse » s'il s'est dégradé d'autant, null sinon. */
export function fleche(maintenant: MancheNotee | undefined, avant: { d: number; t: string } | undefined): "monte" | "baisse" | null {
  if (!maintenant || !avant) return null;
  const diff = maintenant.d - avant.d;
  if (!Number.isFinite(diff) || Math.abs(diff) < Math.max(1e-9, maintenant.seuil)) return null;
  return diff > 0 ? "monte" : "baisse";
}

const Contexte = createContext<{ avant: Memoire | null; ecarts: Record<string, MancheNotee> } | null>(null);

/** Lit la mémoire de ta dernière visite de ce profil (une fois montée), puis note celle-ci ; les flèches du bandeau la lisent. */
export function MemoireRapport({ id, ecarts, children }: { id: string; ecarts: Record<string, MancheNotee>; children: React.ReactNode }) {
  const [avant, setAvant] = useState<Memoire | null>(null);
  // une lecture par profil (le double montage du mode strict ne relit pas ce qu'on vient d'écrire)
  const vu = useRef<string | null>(null);
  useEffect(() => {
    if (vu.current === id) return;
    vu.current = id;
    let lu: Memoire | null = null;
    try {
      lu = lireMemoire(window.localStorage.getItem(cleDe(id)));
    } catch {
      lu = null;
    }
    try {
      window.localStorage.setItem(cleDe(id), JSON.stringify(memoireDe(ecarts, JOUR.format(new Date()))));
    } catch {
      // stockage indisponible : pas de flèche
    }
    setAvant(lu);
  }, [id, ecarts]);
  return <Contexte.Provider value={{ avant, ecarts }}>{children}</Contexte.Provider>;
}

/** La flèche d'une manche, après son jeton ; rien sans mémoire, ou si l'écart n'a pas bougé du seuil d'égalité. */
export function Fleche({ cle }: { cle: string }) {
  const c = useContext(Contexte);
  if (!c?.avant) return null;
  const sens = fleche(c.ecarts[cle], c.avant.ecarts[cle]);
  if (!sens) return null;
  const bulle = R.depuis(jourCourt(c.avant.date), c.avant.ecarts[cle].t);
  return (
    <span className={s.fleche} style={{ color: sens === "monte" ? "var(--gain)" : "var(--perte)" }} title={bulle} aria-label={bulle}>
      {sens === "monte" ? R.monte : R.baisse}
    </span>
  );
}
