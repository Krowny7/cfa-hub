"use client";

import { useEffect, useState } from "react";
import { tropheesDepuis } from "@/app/moi/trophees-actions";
import { CaseTrophee } from "@/components/trophees/SalleDesTrophees";
import { annonceTrophees, nomTrophee, type TropheeGagne } from "@/lib/trophees";

// L'annonce des trophées tout juste gagnés, en fin de séance (V3 §2.7) :
// « Trophée d'or · Les 30 du jour », une ligne par trophée, 3 au plus, puis
// « +n ». Elle demande à la base les trophées gagnés depuis `depuis`
// (tropheesDepuis) ; ceux que l'écran connaît déjà (`connus`, calculés sur
// place) s'affichent tout de suite et restent seuls sans la section §2 de
// migration_v3_profil.sql. Rien à annoncer : rien n'est rendu.
//
//   <AnnonceTrophee depuis={debutSeance} connus={[{ source: "ciblee", palier: 3, ref: "FSA, Equity" }]} />
//
// Props
//   depuis    l'instant (ISO) depuis lequel compter ; illisible : aucun appel
//   connus    les trophées déjà connus de l'écran (facultatif)

export function AnnonceTrophee({ depuis, connus = [], className = "" }: { depuis: string; connus?: TropheeGagne[]; className?: string }) {
  const [base, setBase] = useState<TropheeGagne[]>([]);
  useEffect(() => {
    if (!Number.isFinite(Date.parse(depuis))) return;
    let vivant = true;
    tropheesDepuis(depuis)
      .then((t) => {
        if (vivant) setBase(t);
      })
      .catch(() => {});
    return () => {
      vivant = false;
    };
  }, [depuis]);

  const { lignes, reste } = annonceTrophees(base, connus);
  if (lignes.length === 0) return null;
  return (
    <ul role="status" aria-label="Trophées gagnés" className={"m-0 flex list-none flex-col gap-2 p-0 " + className}>
      {lignes.map((t, i) => (
        <li key={`${t.source}-${t.palier}-${i}`} className="flex min-w-0 items-center gap-3">
          <CaseTrophee palier={t.palier} className="h-9 w-9" />
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold">{nomTrophee(t)}</span>
            {t.ref && <span className="t-micro block truncate">{t.ref}</span>}
          </span>
        </li>
      ))}
      {reste > 0 && <li className="t-micro pl-12">+{reste}</li>}
    </ul>
  );
}
