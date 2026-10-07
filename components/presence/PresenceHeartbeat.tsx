"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";
import { PRESENCE_INTERVALLE } from "@/lib/presence";
import { rpcAbsente } from "@/components/presence/store";

// Le signal de présence du joueur connecté (touch_presence) : à l'ouverture,
// puis toutes les minutes tant que l'onglet est visible, et dès qu'il le
// redevient. Onglet caché ou fermé : plus de signal, le joueur passe « vu il
// y a… » au bout de 2 min 30. Monté une fois, dans la barre du haut. Sans la
// migration : un essai, puis plus rien.
export function PresenceHeartbeat() {
  useEffect(() => {
    const sb = createClient();
    let dernier = 0;
    let arrete = false;
    const signal = () => {
      if (arrete || document.visibilityState !== "visible") return;
      if (Date.now() - dernier < 30_000) return;
      dernier = Date.now();
      void sb.rpc("touch_presence").then(({ error }) => {
        if (rpcAbsente(error)) arrete = true;
      });
    };
    signal();
    const t = setInterval(signal, PRESENCE_INTERVALLE);
    const auRetour = () => {
      if (document.visibilityState === "visible") signal();
    };
    document.addEventListener("visibilitychange", auRetour);
    window.addEventListener("focus", signal);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", auRetour);
      window.removeEventListener("focus", signal);
    };
  }, []);
  return null;
}
