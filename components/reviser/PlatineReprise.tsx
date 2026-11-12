"use client";

import { useEffect, useState } from "react";
import { Platine } from "@/components/ui/Decors";
import { COURS_PROGRAMME, carteCours } from "@/components/reviser/parcours";
import { lireEcoute, type EcouteCours } from "@/lib/course-ecoute";
import { RV } from "@/lib/voice-reviser";

// La colonne grise de /courses : la platine qui mène au dernier cours écouté sur cet appareil (le même
// choix que la carte « Cours complets » de Réviser : carteCours) ; sans historique, au premier cours
// du programme. L'appareil (localStorage) n'est lu qu'après le montage : le serveur rend le premier cours.

const SLUGS = COURS_PROGRAMME.map((c) => c.slug);

export function PlatineReprise() {
  const [ecoute, setEcoute] = useState<EcouteCours | null>(null);
  useEffect(() => {
    setEcoute(lireEcoute(SLUGS));
  }, []);
  const c = carteCours(ecoute);
  if (!c) return null;
  return <Platine href={c.href} aide={RV.coursPlatine(c.titre, c.mode === "reprise")} titre={c.titre} />;
}
