"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { ReviewItem } from "@/components/session/parts";
import type { ReviewQuestion } from "@/components/session/review";
import { Etiquette } from "@/components/ui/SousPage";
import { SOUS_AFFRONTER } from "@/lib/voice-affronter-sous";
import s from "./MockExamFrise.module.css";

const E = SOUS_AFFRONTER.examens;

// La frise de la copie d'un examen blanc (lot 4 du 2026-11-13, sur le modèle du rapport de combat de
// Valorant) : une case par question, dans l'ordre de l'examen ; claire à filet d'encre = juste,
// vermillon plein = fausse (l'œil va aux erreurs), en pointillé = sans réponse ; un filet plus haut
// toutes les dix ; au-delà de 60 questions, des blocs étiquetés. Un clic ouvre la question corrigée juste dessous (la même
// carte que la correction), un second la referme. La correction complète reste dessous.
export function FriseCopie({ review }: { review: ReviewQuestion[] }) {
  const [ouverte, setOuverte] = useState<number | null>(null);
  if (review.length === 0) return null;
  const justes = review.filter((r) => r.is_correct).length;
  const q = ouverte !== null ? review[ouverte] : null;
  // au-delà de 60 questions, des blocs : deux sessions de 90 (le format de l'examen), sinon par 30
  const n = review.length;
  const taille = n <= 60 ? n : n >= 120 && n % 2 === 0 ? n / 2 : 30;
  const blocs: { debut: number; fin: number; session: number | null }[] = [];
  for (let d = 0; d < n; d += taille) blocs.push({ debut: d, fin: Math.min(n, d + taille), session: taille === n / 2 ? d / taille + 1 : null });
  return (
    <section className={s.frise} aria-label={E.frise}>
      <div className={s.tete}>
        <Etiquette as="h2">{E.frise}</Etiquette>
        <span className={s.compte}>{E.justes(justes, review.length)}</span>
      </div>
      {blocs.map((b) => (
        <div key={b.debut} className={s.bloc}>
          {blocs.length > 1 && <span className={s.sousEtiquette}>{E.bloc(b.debut + 1, b.fin, b.session)}</span>}
          <ol className={s.cases}>
            {review.slice(b.debut, b.fin).map((r, k) => {
              const i = b.debut + k;
              const juste = r.selected_index === null ? null : r.is_correct;
              return (
                <li key={r.question_id + "-" + i} data-dizaine={(i + 1) % 10 === 0 ? "1" : undefined}>
                  <button
                    type="button"
                    className={s.case + " rl-presse"}
                    data-juste={juste === null ? "vide" : juste ? "1" : "0"}
                    aria-pressed={ouverte === i}
                    aria-label={E.friseCase(i + 1, juste)}
                    title={E.friseCase(i + 1, juste)}
                    onClick={() => setOuverte((o) => (o === i ? null : i))}
                  >
                    <span>{i + 1}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      ))}
      {q && ouverte !== null && (
        <div className={s.ouverte}>
          <button type="button" className={s.fermer} onClick={() => setOuverte(null)} aria-label={E.friseFermer}>
            <X size={15} aria-hidden />
          </button>
          <ReviewItem q={q} n={ouverte + 1} compact source="examen" />
        </div>
      )}
    </section>
  );
}
