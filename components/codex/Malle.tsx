"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { codexMalle } from "@/lib/codex/actions";
import { CASES_MALLE, MALLE_PRETE } from "@/lib/codex/calendrier";
import type { LigneQuete, VueCodex } from "@/lib/codex/vue";
import k from "./Calendrier.module.css";

// La malle (J-3 à J-1, V3 §7.3) : sept cases à cocher pour le jour J ; cinq
// cochées, elle est prête (la quête « La malle est prête »). Les cases se
// gardent dans le compte (codexMalle), un instant après le dernier geste.
// En dessous, « La veille » (trame:ep:veille) quand elle est ouverte.
// `demo` : aperçus (rien n'est gardé).

const ATTENTE_MS = 800;

type Props = { coches: string[]; veille: LigneQuete | null; demo?: boolean; onVue?: (v: VueCodex) => void };

export function Malle({ coches: depart, veille, demo = false, onVue }: Props) {
  const [coches, setCoches] = useState<string[]>(depart);
  const [message, setMessage] = useState<string | null>(null);
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  // les cases pas encore envoyées : parties tout de suite si on quitte la page avant le délai
  const enAttente = useRef<string[] | null>(null);
  useEffect(
    () => () => {
      if (minuteur.current) clearTimeout(minuteur.current);
      if (enAttente.current) void codexMalle(enAttente.current).catch(() => null);
    },
    [],
  );

  const garder = (suivantes: string[]) => {
    if (demo) return;
    if (minuteur.current) clearTimeout(minuteur.current);
    enAttente.current = suivantes;
    minuteur.current = setTimeout(async () => {
      enAttente.current = null;
      const r = await codexMalle(suivantes).catch(() => null);
      if (!r || !r.ok) return setMessage("Ta malle n'a pas pu être gardée pour l'instant. Réessaie dans un instant.");
      setMessage(null);
      if (r.vue && onVue) onVue(r.vue);
    }, ATTENTE_MS);
  };

  const basculer = (id: string) => {
    const suivantes = coches.includes(id) ? coches.filter((c) => c !== id) : [...coches, id];
    setCoches(suivantes);
    garder(suivantes);
  };

  const prete = coches.length >= MALLE_PRETE;
  return (
    <>
      <section className={`card-quiet ${k.carte}`} aria-labelledby="malle-titre">
        <p className={`t-micro ${k.sur}`}>
          {coches.length}/{CASES_MALLE.length} · {prete ? "la malle est prête" : `prête à ${MALLE_PRETE} cases`}
        </p>
        <h2 id="malle-titre" className={`font-brand ${k.titre}`}>
          La malle
        </h2>
        <p className="t-small m-0">Ce que le jour J te demandera. Prépare-le la veille, pas le matin même.</p>
        <ul className={k.cases}>
          {CASES_MALLE.map((c) => {
            const coche = coches.includes(c.id);
            return (
              <li key={c.id}>
                <label className={k.case} data-coche={coche || undefined}>
                  <input type="checkbox" checked={coche} onChange={() => basculer(c.id)} />
                  <span>
                    {c.libelle}
                    {c.facultative && <span className={k.facultative}> · facultative</span>}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {message && (
          <p role="status" className="t-small m-0">
            {message}
          </p>
        )}
      </section>
      {veille && veille.etat !== "verrouillee" && (
        <section className={`card-quiet ${k.veille}`} aria-label={veille.titre}>
          <div className="min-w-0 flex-1">
            <p className={`t-micro ${k.sur}`}>{veille.etat === "terminee" ? "Fait" : "La veille"}</p>
            <p className="t-h3 m-0">{veille.titre}</p>
            <p className="t-small m-0">{veille.consigne}</p>
          </div>
          {veille.etat !== "terminee" && veille.destination && (
            <Link href={veille.destination.href} className="btn btn-primary rl-press shrink-0">
              {veille.destination.libelle} <ArrowRight size={16} aria-hidden />
            </Link>
          )}
        </section>
      )}
    </>
  );
}
