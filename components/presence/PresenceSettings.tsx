"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { rpcAbsente } from "@/components/presence/store";

// Réglage « Montrer quand je suis en ligne » (set_presence_visible). Coupé :
// les autres joueurs ne voient plus ni « En ligne » ni « vu il y a… ».
// Sans la migration : interrupteur grisé, « bientôt ». Erreur passagère
// (réseau) : un message, et un clic relance la lecture.
export function PresenceSettings() {
  const [etat, setEtat] = useState<"chargement" | "pret" | "indisponible" | "erreur">("chargement");
  const [visible, setVisible] = useState(true);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    setEtat("chargement");
    try {
      const sb = createClient();
      const { data: auth, error: eAuth } = await sb.auth.getUser();
      const moi = auth.user?.id;
      if (eAuth || !moi) return setEtat("erreur");
      const { data, error } = await sb.rpc("get_presence", { p_ids: [moi] });
      if (error) return setEtat(rpcAbsente(error) ? "indisponible" : "erreur");
      const row = ((data ?? []) as { visible: boolean }[])[0];
      setVisible(row ? !!row.visible : true);
      setEtat("pret");
    } catch {
      setEtat("erreur");
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function basculer() {
    if (etat === "erreur") return void charger();
    if (etat !== "pret" || envoi) return;
    const suivant = !visible;
    setVisible(suivant);
    setEnvoi(true);
    const { error } = await createClient().rpc("set_presence_visible", { p_visible: suivant });
    if (error) setVisible(!suivant);
    setEnvoi(false);
  }

  const off = etat === "chargement" || etat === "indisponible";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={visible}
      disabled={off}
      onClick={() => void basculer()}
      className={"flex w-full items-center gap-4 py-3 text-left " + (off ? "opacity-45" : "")}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">Montrer quand je suis en ligne</span>
        <span className="t-micro mt-0.5 block">
          {etat === "indisponible"
            ? "Bientôt disponible."
            : etat === "erreur"
              ? "Réglage impossible à lire pour l'instant : touche pour réessayer."
              : visible
                ? "Les autres joueurs voient « En ligne », ou depuis quand tu es parti."
                : "Masqué : les autres joueurs ne voient plus si tu es en ligne, ni depuis quand tu es parti."}
        </span>
      </span>
      <span aria-hidden className={"switch" + (visible ? " is-on" : "")} />
    </button>
  );
}
