"use client";

import { useEffect, useReducer, useState } from "react";
import { enLigne, libellePresence, type Presence } from "@/lib/presence";
import { ecouter, presenceDe, suivre } from "@/components/presence/store";

// Les marques de présence : le point vert sur l'avatar (en ligne seulement)
// et le libellé « En ligne » / « Vu il y a 3 h ». Rien au premier rendu
// (pas d'écart à l'hydratation) : la présence arrive juste après, lue par
// lots (components/presence/store). Seul le point est vert : le texte garde
// la couleur de sa ligne (lisible en clair comme en nuit).

/** undefined : pas encore lu ; null : rien à montrer ; sinon la présence lue. */
export function usePresence(userId: string | null | undefined): Presence | null | undefined {
  const [pret, setPret] = useState(false);
  const [, rafraichir] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    setPret(true);
    if (!userId) return;
    const stop = ecouter(rafraichir);
    const lacher = suivre(userId);
    return () => {
      stop();
      lacher();
    };
  }, [userId]);
  if (!pret || !userId) return undefined;
  return presenceDe(userId);
}

/** Le point « en ligne », posé en bas à droite d'un avatar de `avatar` px (parent en position relative). */
export function PresenceDot({ userId, avatar = 36 }: { userId: string; avatar?: number }) {
  const p = usePresence(userId);
  if (!enLigne(p)) return null;
  const d = Math.max(8, Math.round(avatar * 0.28));
  return (
    <span
      role="img"
      aria-label="En ligne"
      title="En ligne"
      className="absolute rounded-full"
      style={{
        width: d,
        height: d,
        right: Math.round(avatar * 0.02) - 1,
        bottom: Math.round(avatar * 0.02) - 1,
        background: "var(--gain)",
        boxShadow: `0 0 0 ${avatar >= 60 ? 3 : 2}px var(--surface)`,
      }}
    />
  );
}

/**
 * « En ligne » (avec son point) ou « Vu il y a 3 h ». Joueur masqué : rien.
 * Joueur sans signal (pas revenu depuis l'arrivée de la présence, ou
 * présence indisponible) : `repli`, s'il est donné (« Hors ligne »).
 */
export function PresenceText({
  userId,
  court = false,
  minuscule = false,
  point = true,
  repli = null,
  avant = null,
  apres = null,
  className = "",
}: {
  userId: string;
  /** listes : « en ligne », « il y a 3 h » */
  court?: boolean;
  /** au fil d'une ligne : « en ligne », « vu il y a 3 h » */
  minuscule?: boolean;
  /** le point vert devant « en ligne » (false quand l'avatar le porte déjà) */
  point?: boolean;
  repli?: React.ReactNode;
  /** posés autour du libellé (ou du repli) quand il s'affiche : un séparateur « · » */
  avant?: React.ReactNode;
  apres?: React.ReactNode;
  className?: string;
}) {
  const p = usePresence(userId);
  if (p === undefined) return null;
  if (p === null)
    return repli ? (
      <>
        {avant}
        {repli}
        {apres}
      </>
    ) : null;
  const texte = libellePresence(p, { court, minuscule });
  if (!texte) return null;
  const vivant = enLigne(p);
  return (
    <>
      {avant}
      <span className={"inline-flex items-center gap-1.5 " + className}>
        {vivant && point && <span aria-hidden className="inline-block h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: "var(--gain)" }} />}
        {texte}
      </span>
      {apres}
    </>
  );
}
