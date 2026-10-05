"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, Check } from "lucide-react";
import { QuestionPrompt } from "@/components/QuestionPrompt";
import { Explanation } from "@/components/session/parts";
import { MarqueQuestion } from "@/components/MarqueQuestion";
import { useMarques, type SourceMarque } from "@/lib/marques";
import type { Marquees, QuestionMarquee } from "@/components/moi/marquees-data";

// Moi › Marquées : les questions marquées en les croisant (fiches, sessions,
// défi, duels, QCM, examens blancs), par fiche ou par matière, la plus
// récente en tête. Pour revoir la notion : l'énoncé, la bonne réponse et
// l'explication (seulement pour une question déjà répondue). Retirer la
// marque laisse la carte à sa place, grisée, jusqu'au prochain passage :
// un clic de trop se rattrape.

const LETTRES = ["A", "B", "C", "D", "E", "F"];
const ORIGINE: Record<SourceMarque, string> = {
  fiche: "fiche",
  session: "session",
  defi: "défi du jour",
  duel: "duel",
  qcm: "QCM",
  examen: "examen blanc",
};
const jour = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

export function MarqueesTab({ marquees }: { marquees: Marquees }) {
  const etat = useMarques();
  const rubriques = useMemo(() => {
    const n = new Map<string, number>();
    for (const it of marquees.items) n.set(it.rubrique, (n.get(it.rubrique) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]);
  }, [marquees.items]);
  const [filtre, setFiltre] = useState<string | null>(null);

  if (!marquees.available) {
    const n = etat.ids.size;
    return (
      <div className="card-quiet grid justify-items-center gap-2 px-6 py-12 text-center">
        <Bookmark size={26} className="text-muted" aria-hidden />
        <p className="t-small m-0 max-w-[460px]">
          {n
            ? `${n} question${n > 1 ? "s" : ""} marquée${n > 1 ? "s" : ""}, gardée${n > 1 ? "s" : ""} sur cet appareil le temps d'une mise à jour du site : elles s'afficheront ici ensuite.`
            : "Les questions marquées s'afficheront ici après une mise à jour du site. Tu peux déjà en marquer : elles sont gardées sur cet appareil."}
        </p>
      </div>
    );
  }

  if (marquees.items.length === 0) {
    return (
      <div className="card-quiet grid justify-items-center gap-2 px-6 py-12 text-center">
        <Bookmark size={26} className="text-muted" aria-hidden />
        <p className="t-h3 m-0">Aucune question marquée</p>
        <p className="t-small m-0 max-w-[440px]">
          Après avoir répondu à une question, dans une fiche, une session, le défi du jour ou un duel, touche « Marquer » : tu la retrouves ici pour revoir la notion.
        </p>
      </div>
    );
  }

  const items = filtre ? marquees.items.filter((it) => it.rubrique === filtre) : marquees.items;
  return (
    <div className="flex flex-col gap-4 md:gap-[18px]">
      {rubriques.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par fiche ou matière">
          <button type="button" className={`chip ${filtre === null ? "chip-active" : ""}`} aria-pressed={filtre === null} onClick={() => setFiltre(null)}>
            Toutes · {marquees.items.length}
          </button>
          {rubriques.map(([r, n]) => (
            <button key={r} type="button" className={`chip ${filtre === r ? "chip-active" : ""}`} aria-pressed={filtre === r} onClick={() => setFiltre(r)}>
              {r} · {n}
            </button>
          ))}
        </div>
      )}
      {items.map((it) => (
        <CarteMarquee key={it.questionId} it={it} retiree={etat.pret && !etat.local && !etat.ids.has(it.questionId)} />
      ))}
    </div>
  );
}

function CarteMarquee({ it, retiree }: { it: QuestionMarquee; retiree: boolean }) {
  return (
    <article className={"card min-w-0 p-5 transition-opacity md:p-7 " + (retiree ? "opacity-55" : "")}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="t-micro m-0 min-w-0 truncate">
          <span className="font-semibold text-white">{it.rubrique}</span>
          {it.page !== null && <> · p. {it.page}</>}
          {it.source && <> · {ORIGINE[it.source]}</>} · {retiree ? "marque retirée" : `marquée le ${jour(it.flaggedAt)}`}
        </p>
        <MarqueQuestion questionId={it.questionId} source={it.source ?? "fiche"} />
      </div>
      <QuestionPrompt text={it.prompt} className="mt-3 text-[15.5px] font-semibold leading-[1.6] tracking-[-0.006em] break-words [overflow-wrap:anywhere] md:text-[16px]" />
      <ul className="m-0 mt-4 grid list-none gap-2 p-0">
        {it.choices.map((c, ci) => {
          const bonne = it.correctIndex === ci;
          return (
            <li
              key={ci}
              className={
                "flex items-start gap-3 rounded-[12px] border px-3 py-2.5 text-[14.5px] leading-[1.5] " +
                (bonne ? "border-white bg-surface font-semibold" : "border-line text-muted")
              }
            >
              <span className={"grid h-6 w-6 shrink-0 place-items-center rounded-[7px] font-mono text-[12px] font-semibold " + (bonne ? "bg-white text-black" : "bg-surface-2")}>
                {bonne ? <Check size={13} strokeWidth={2.6} aria-hidden /> : LETTRES[ci]}
              </span>
              <span className="min-w-0 flex-1 pt-[1px] break-words [overflow-wrap:anywhere]">{c}</span>
              {bonne && <span className="t-micro hidden shrink-0 pt-[3px] font-semibold text-white sm:inline">Bonne réponse</span>}
            </li>
          );
        })}
      </ul>
      {it.answered ? (
        it.explanation && <Explanation text={it.explanation} className="mt-4" />
      ) : (
        <p className="t-micro mt-4 mb-0">Réponds-y une fois (fiche, session, QCM…) pour voir ici la bonne réponse et l&apos;explication.</p>
      )}
      {it.href && (
        <Link href={it.href} className="ink-link mt-4 inline-flex items-center gap-1 text-[13px] font-semibold">
          Revoir la page {it.page} de la fiche <ArrowRight size={13} aria-hidden />
        </Link>
      )}
    </article>
  );
}
