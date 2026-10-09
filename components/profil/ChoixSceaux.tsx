"use client";

import { createContext, useContext, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { poserSceaux } from "@/lib/profil/actions-sceaux";
import { SCEAUX_TXT } from "@/lib/voice-profil";

// Le choix des 3 sceaux posés dans l'en-tête, sur son propre profil avec
// la base (sinon `actif` est faux : les fiches ne proposent rien). Partagé
// par les fiches de l'en-tête et de la collection : la fiche d'un sceau
// gagné propose « Poser sur mon profil », « Retirer », ou de remplacer l'un
// des 3. La liste part de ce qui est posé (choisi, ou d'office) ; le serveur
// vérifie et enregistre (poserSceaux), puis la page se rafraîchit. Un échec
// remet la liste d'avant.

export type Choix = {
  /** les clés posées, dans l'ordre */
  poses: string[];
  poser: (cle: string) => void;
  retirer: (cle: string) => void;
  remplacer: (ancien: string, nouveau: string) => void;
  enCours: boolean;
  erreur: string | null;
};

const Ctx = createContext<Choix | null>(null);

/** Le choix en cours (null : pas son profil, ou base pas prête : la fiche ne propose rien). */
export const useChoixSceaux = () => useContext(Ctx);

export function ChoixSceaux({ actif, poses, children }: { actif: boolean; poses: string[]; children: React.ReactNode }) {
  const router = useRouter();
  const cle = poses.join("|");
  const [liste, setListe] = useState(poses);
  // la page rafraîchie apporte la liste enregistrée
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setListe(poses), [cle]);
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  const envoyer = (suivante: string[]) => {
    const avant = liste;
    setListe(suivante);
    setErreur(null);
    demarrer(async () => {
      const r = await poserSceaux(suivante);
      if (!r.ok) {
        setListe(avant);
        setErreur(SCEAUX_TXT.poserErreur);
        return;
      }
      router.refresh();
    });
  };

  const choix: Choix = {
    poses: liste,
    poser: (c) => {
      if (liste.length < 3 && !liste.includes(c)) envoyer([...liste, c]);
    },
    retirer: (c) => envoyer(liste.filter((x) => x !== c)),
    remplacer: (ancien, nouveau) => envoyer(liste.map((x) => (x === ancien ? nouveau : x))),
    enCours,
    erreur,
  };
  return <Ctx.Provider value={actif ? choix : null}>{children}</Ctx.Provider>;
}
