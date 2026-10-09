"use client";

import { useEffect, useState } from "react";
import { joursEntre } from "@/lib/objectif-calc";
import { JOURNAL, jourCourt } from "@/lib/voice-profil";

// La date d'une entrée du Journal : « 3 oct. » au rendu du serveur, puis,
// dans le navigateur seulement, « aujourd'hui », « hier » ou « il y a 3 j »
// pour la semaine écoulée (une date relative rendue au serveur casserait
// l'hydratation). Un jour, jamais une heure.

const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });

export function JourRelatif({ jour, className = "" }: { jour: string; className?: string }) {
  const [relatif, setRelatif] = useState<string | null>(null);
  useEffect(() => setRelatif(JOURNAL.ilYa(joursEntre(jour, JOUR_PARIS.format(new Date())))), [jour]);
  return (
    <time dateTime={jour} className={className}>
      {relatif ?? jourCourt(jour)}
    </time>
  );
}
