"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, UserCheck, UserPlus, UserX, X } from "lucide-react";
import { actionAmi, type Operation } from "@/app/people/actions";
import type { Relation } from "@/lib/profil/donnees";

// Le bouton d'ami d'un profil (et des listes de demandes) : ajouter,
// demande envoyée (annuler), demande reçue (accepter / refuser), amis
// (retirer, après confirmation dans le bouton). `relation` null : la base
// n'est pas encore prête, le bouton reste inactif.

export function AmiBouton({ autre, relation: initiale, compact = false }: { autre: string; relation: Relation | null; compact?: boolean }) {
  const router = useRouter();
  const [relation, setRelation] = useState<Relation | null>(initiale);
  const [confirme, setConfirme] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (relation === "moi") return null;
  if (relation === null) {
    return (
      <button type="button" className="btn btn-secondary" disabled title="Les amis arrivent bientôt">
        <UserPlus size={15} aria-hidden /> Ajouter en ami
      </button>
    );
  }

  const go = (op: Operation) =>
    start(async () => {
      setErreur(null);
      const r = await actionAmi(autre, op);
      if (!r.ok) {
        setErreur(r.erreur);
        return;
      }
      setRelation(r.relation);
      setConfirme(false);
      router.refresh();
    });

  const taille = compact ? " btn-sm" : "";
  let corps: React.ReactNode;
  if (relation === "aucune") {
    corps = (
      <button type="button" className={"btn btn-secondary rl-press" + taille} onClick={() => go("demander")} disabled={pending}>
        <UserPlus size={15} aria-hidden /> Ajouter en ami
      </button>
    );
  } else if (relation === "envoyee") {
    corps = (
      <button type="button" className={"btn btn-ghost" + taille} onClick={() => go("retirer")} disabled={pending} title="Annuler la demande">
        <Clock size={15} aria-hidden /> Demande envoyée · annuler
      </button>
    );
  } else if (relation === "recue") {
    corps = (
      <span className="inline-flex flex-wrap items-center gap-2">
        <button type="button" className={"btn btn-primary rl-press" + taille} onClick={() => go("accepter")} disabled={pending}>
          <Check size={15} aria-hidden /> Accepter
        </button>
        <button type="button" className={"btn btn-ghost" + taille} onClick={() => go("retirer")} disabled={pending}>
          <X size={15} aria-hidden /> Refuser
        </button>
      </span>
    );
  } else {
    corps = confirme ? (
      <span className="inline-flex flex-wrap items-center gap-2">
        <button type="button" className={"btn btn-secondary" + taille} onClick={() => go("retirer")} disabled={pending}>
          <UserX size={15} aria-hidden /> Retirer de mes amis
        </button>
        <button type="button" className={"btn btn-ghost" + taille} onClick={() => setConfirme(false)} disabled={pending}>
          Garder
        </button>
      </span>
    ) : (
      <button type="button" className={"btn btn-secondary" + taille} onClick={() => setConfirme(true)} title="Vous êtes amis">
        <UserCheck size={15} aria-hidden /> Amis
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col gap-1">
      {corps}
      {erreur && (
        <span role="status" className="text-[12px] font-medium text-pen">
          {erreur}
        </span>
      )}
    </span>
  );
}
