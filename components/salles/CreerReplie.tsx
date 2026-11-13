"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ActionContour } from "@/components/ui/SousPage";
import { FormCreer } from "@/components/salles/FormCreer";
import { SOUS_AFFRONTER } from "@/lib/voice-affronter-sous";
import s from "./Salles.module.css";

// « Créer une salle », replié (critique du lot 4) : un bouton à contour, qui déplie le formulaire en
// place. Fermé, il ne prend qu'une ligne et n'est pas l'action à l'encre de la page.
export function CreerReplie() {
  const [ouvert, setOuvert] = useState(false);
  return (
    <div className={s.creerReplie} data-ouvert={ouvert ? "1" : undefined}>
      <ActionContour onClick={() => setOuvert((o) => !o)}>
        {ouvert ? <X size={15} aria-hidden /> : <Plus size={15} aria-hidden />} {SOUS_AFFRONTER.salles.creer}
      </ActionContour>
      {ouvert && <FormCreer sobre />}
    </div>
  );
}
