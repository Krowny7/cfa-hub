"use client";

import { useEffect, useReducer, useState } from "react";
import { enLigne, libellePresence } from "@/lib/presence";
import { usePresence } from "@/components/presence/Presence";
import { ecouter, presenceDe, suivre } from "@/components/presence/store";
import { AMIS } from "@/lib/voice-classement";
import s from "./Affronter.module.css";

// Les marques de présence de l'onglet « Amis » (lues par lots, voir
// components/presence/store) : sous le nom d'un ami, un point plein et « en
// ligne » ou un anneau gris et « en ligne il y a 3 h » ; en tête de la liste, le
// nombre d'amis en ligne. Rien tant que la présence n'est pas lue (pas
// d'écart à l'hydratation) ; ami masqué : rien ; ami sans signal, ou présence
// indisponible : « hors ligne ».

/** Sous le pseudo d'un ami : « en ligne » (point vert) ou « en ligne il y a 3 h » (anneau gris). */
export function PresenceLigne({ userId }: { userId: string }) {
  const p = usePresence(userId);
  if (p === undefined) return <span className={s.presence} aria-hidden />;
  if (p === null)
    return (
      <span className={s.presence}>
        <span aria-hidden className={s.presenceDot} />
        {AMIS.horsLigne}
      </span>
    );
  const texte = libellePresence(p, { minuscule: true });
  if (!texte) return null;
  const vif = enLigne(p);
  return (
    <span className={s.presence + (vif ? " " + s.vif : "")}>
      <span aria-hidden className={s.presenceDot + (vif ? " " + s.vif : "")} />
      {texte}
    </span>
  );
}

/** « 2 en ligne » : le nombre d'amis dont le dernier signal est récent ; rien à zéro ou tant que rien n'est lu. */
export function CompteEnLigne({ ids }: { ids: string[] }) {
  const [pret, setPret] = useState(false);
  const [, rafraichir] = useReducer((x: number) => x + 1, 0);
  const cle = ids.join(",");
  useEffect(() => {
    setPret(true);
    const stop = ecouter(rafraichir);
    const lacher = ids.map((id) => suivre(id));
    return () => {
      stop();
      lacher.forEach((f) => f());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);
  if (!pret) return null;
  const n = ids.filter((id) => enLigne(presenceDe(id))).length;
  if (n === 0) return null;
  return (
    <>
      {" · "}
      {AMIS.enLigne(n)}
    </>
  );
}
