"use client";

import { CAS } from "@/lib/voice-cas-fsa";
import { useAvancement } from "./avancement";
import s from "./CasFsa.module.css";

/** L'avancement d'un cas, sur sa carte de la liste : la jauge et le compte. */
export function AvancementCas({ id, etapes }: { id: string; etapes: string[] }) {
  const a = useAvancement(id);
  const faites = etapes.filter((e) => a.etapes[e]).length;
  const total = etapes.length;
  return (
    <>
      <span className={s.jauge} aria-hidden>
        <i style={{ width: `${total ? (faites / total) * 100 : 0}%` }} />
      </span>
      <span className={s.compte}>{total > 0 && faites === total ? CAS.termine : CAS.avancement(faites, total)}</span>
    </>
  );
}
