"use client";

import { useEffect, useRef, useState } from "react";
import { usePresents } from "@/components/salles/presence";
import type { SalleMembre } from "@/lib/salles/types";
import { SALLES } from "@/lib/voice-salles";
import s from "./AnnoncesPresence.module.css";

// « X a rejoint la salle » / « X a quitté la salle », en bas à droite, à gauche du bouton des
// messages. On compare la liste des présents d'un battement à l'autre (presence.ts, toutes
// les 20 s ou dès qu'on relit) ; la première liste reçue ne fait rien, soi-même non plus.

const DUREE_MS = 4500;
type Annonce = { id: number; texte: string };

export function AnnoncesPresence({ membres, moiId }: { membres: SalleMembre[]; moiId: string }) {
  const presents = usePresents();
  const avant = useRef<ReadonlySet<string> | null>(null);
  const compteur = useRef(0);
  const [annonces, setAnnonces] = useState<Annonce[]>([]);

  useEffect(() => {
    if (!presents) return;
    const prec = avant.current;
    avant.current = presents;
    if (!prec) return;
    const nom = (id: string) => membres.find((m) => m.userId === id)?.username || SALLES.unJoueur;
    const neuves: Annonce[] = [];
    for (const id of presents) if (id !== moiId && !prec.has(id)) neuves.push({ id: ++compteur.current, texte: SALLES.aRejoint(nom(id)) });
    for (const id of prec) if (id !== moiId && !presents.has(id)) neuves.push({ id: ++compteur.current, texte: SALLES.aQuitte(nom(id)) });
    if (!neuves.length) return;
    setAnnonces((a) => [...a, ...neuves].slice(-3));
    const ids = new Set(neuves.map((n) => n.id));
    setTimeout(() => setAnnonces((a) => a.filter((x) => !ids.has(x.id))), DUREE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presents]);

  if (!annonces.length) return null;
  return (
    <div className={s.pile} role="status" aria-live="polite">
      {annonces.map((a) => (
        <p key={a.id} className={s.annonce}>
          {a.texte}
        </p>
      ))}
    </div>
  );
}
