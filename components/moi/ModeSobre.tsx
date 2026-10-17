"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reglerSobre } from "@/app/moi/actions-sobre";
import { EVENEMENT_REGLAGES } from "@/lib/leonard/reglages";

// L'interrupteur du mode sobre (V3 §11.5), dans l'Apparence de Moi ›
// Réglages : moins de fêtes, le travail reste. Il suit le compte, pas
// l'appareil (user_metadata.rl_sobre, app/moi/actions-sobre.ts). Une fois
// enregistré, Léonard relit le réglage (rl:leonard-reglages) et les pages
// se rafraîchissent.

export function ModeSobre({ initial }: { initial: boolean }) {
  const router = useRouter();
  const [sobre, setSobre] = useState(initial);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const basculer = () =>
    startTransition(async () => {
      const voulu = !sobre;
      setSobre(voulu);
      setErreur(null);
      const r = await reglerSobre(voulu).catch(() => ({ ok: false as const, erreur: "Réglage impossible, réessaie dans un instant." }));
      if (!r.ok) {
        setSobre(!voulu);
        setErreur(r.erreur);
        return;
      }
      window.dispatchEvent(new Event(EVENEMENT_REGLAGES));
      router.refresh();
    });
  return (
    <div className="border-t border-line">
      <button type="button" role="switch" aria-checked={sobre} onClick={basculer} disabled={pending} className="flex min-h-[44px] w-full items-center gap-4 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold">Mode sobre</span>
          <span className="t-micro mt-0.5 block">Moins de fêtes : sans « +XP », sans pièces ni passages de Léonard. La séance du jour, le panneau et tes contrats restent.</span>
        </span>
        <span aria-hidden className={"switch" + (sobre ? " is-on" : "")} />
      </button>
      {erreur && (
        <p role="status" className="m-0 pb-2 text-[13px] font-medium text-pen">
          {erreur}
        </p>
      )}
    </div>
  );
}
