"use client";

import { useState } from "react";
import { EditeurBanniere } from "@/components/profil/EditeurBanniere";
import { Banniere } from "@/components/profil/Pieces";
import { COULEUR_ENCRE, STYLE_DEFAUT, type StyleProfil } from "@/lib/profil/catalogue";
import type { Composition } from "@/lib/profil/banniere";
import type { BadgeChoix } from "@/lib/profil/banniere-badges";
import type { DonneesPanneau } from "@/lib/profil/panneau-editeur";

// APERÇU LOCAL (app/preview-da exclu de git) · l'éditeur de bannière
// (components/profil/EditeurBanniere.tsx) avec une composition d'exemple : on
// glisse, on redimensionne, on règle aux curseurs, on range l'ordre, on choisit
// le panneau. Aucun appel à la base : l'envoi d'une image échoue (pas de
// connexion), tout le reste vit dans le navigateur.

export function EditeurApercu({ depart, donnees, badges, fondProfil, dispo = true, nu = false }: { depart: Composition | null; donnees: DonneesPanneau; badges: BadgeChoix[]; fondProfil: string; dispo?: boolean; nu?: boolean }) {
  const [style, setStyle] = useState<StyleProfil>({ ...STYLE_DEFAUT, banniere: depart, bannerUrl: nu ? null : fondProfil, banner: "lavis", accent: COULEUR_ENCRE });
  const [occupe, setOccupe] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <EditeurBanniere
        b={{ style, setStyle }}
        enregistree={depart}
        dispo={dispo}
        fond={<Banniere banner={style.banner} bannerUrl={style.bannerUrl} bannerPos={style.bannerPos} accent={style.accent} fige className="h-full w-full" />}
        donnees={donnees}
        badges={badges}
        titre="Copiste"
        onEnvoi={setOccupe}
        ranger={async () => false}
      />
      <p className="t-micro m-0" role="status">
        {occupe ? "Envoi en cours…" : style.banniere ? "Brouillon : la composition a changé." : "Rien de composé."}
      </p>
    </div>
  );
}
