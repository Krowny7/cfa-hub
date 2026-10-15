"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { SPACES, type Space } from "@/lib/nav";
import { DEVOILE_DE_L_ESPACE, EVENEMENT_DEVOILE, devoileLite, type DetailDevoile, type Devoile } from "@/lib/codex/devoile-lite";

// Ce que la navigation montre. Un nouveau compte découvre le site au fur et à
// mesure (lib/codex/catalogue.ts DECOUVERTE) : au début l'accueil, le Codex et
// Moi ; Réviser, S'entraîner et Classement s'ajoutent quand le joueur les a
// gagnés. Un dévoilement ne se retire jamais, et ne ferme rien : tous les
// liens directs marchent. L'état initial vient du serveur (le compte) ; un
// dévoilement fait pendant la visite arrive par l'événement `rl:devoile`
// (annoncerDevoile), sans recharger la page. `codex: false` : la migration
// n'est pas collée, l'onglet Codex n'est pas proposé et tout est montré.

export type EtatNav = { devoile: Devoile; codex: boolean };
type Contexte = EtatNav & { neufs: string[] };

const Ctx = createContext<Contexte>({ devoile: "tout", codex: true, neufs: [] });

export function DevoileProvider({ initial, children }: { initial: EtatNav; children: React.ReactNode }) {
  const [devoile, setDevoile] = useState<Devoile>(initial.devoile);
  const [neufs, setNeufs] = useState<string[]>([]);
  // le serveur a relu le compte (rechargement, revalidation) : il fait foi
  const cleServeur = JSON.stringify(initial.devoile);
  useEffect(() => {
    setDevoile(initial.devoile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleServeur]);
  useEffect(() => {
    const ecoute = (e: Event) => {
      const d = (e as CustomEvent<DetailDevoile>).detail;
      if (!d) return;
      setDevoile((avant) => (avant === "tout" ? "tout" : d.devoile));
      if (d.nouveaux.length) setNeufs((n) => [...new Set([...n, ...d.nouveaux])]);
    };
    window.addEventListener(EVENEMENT_DEVOILE, ecoute);
    return () => window.removeEventListener(EVENEMENT_DEVOILE, ecoute);
  }, []);
  const valeur = useMemo(() => ({ devoile, codex: initial.codex, neufs }), [devoile, initial.codex, neufs]);
  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

export const useEtatNav = () => useContext(Ctx);

/**
 * Les espaces à montrer, dans l'ordre de lib/nav.ts : ceux qui sont dévoilés,
 * plus l'espace où l'on est (un lien direct vers un onglet pas encore ouvert
 * l'allume quand même). `neuf` : dévoilé pendant cette visite (l'onglet s'encre).
 */
export function useSpacesVisibles(active: Space["key"] | null): { spaces: (Space & { neuf: boolean })[] } {
  const { devoile, codex, neufs } = useEtatNav();
  return {
    spaces: SPACES.filter((s) => {
      if (s.key === "codex") return codex;
      const quoi = DEVOILE_DE_L_ESPACE[s.key];
      return !quoi || s.key === active || devoileLite(devoile, quoi);
    }).map((s) => {
      const quoi = DEVOILE_DE_L_ESPACE[s.key];
      return { ...s, neuf: !!quoi && neufs.some((id) => quoi.endsWith(id)) };
    }),
  };
}
