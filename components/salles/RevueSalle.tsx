"use client";

import { memo, useState } from "react";
import { segThumbStyle } from "@/components/classement/Seg";
import { DefiAiCopy } from "@/components/defi/DefiAiCopy";
import { ReviewCard } from "@/components/defi/DefiReview";
import { Filigrane, FiltreMatieres, Ticks, matieresDe, reviewMarks } from "@/components/defi/parts";
import { RetestRatures } from "@/components/notions/RetestRatures";
import PctScore from "@/components/adn/PctScore";
import { duelTopicLabel } from "@/lib/duels";
import type { DailyReviewItem } from "@/lib/daily";
import { exportIASalle } from "@/lib/salles/examen";
import { DEFI, verdictCopie } from "@/lib/voice-z2c";
import { RUNNER_SALLE } from "@/lib/voice-salles";

type Filtre = "errors" | "all";

// La correction d'une partie de Salle en chrono global, comme la revue des 30 du
// jour (DefiReview) : mes coches, « Copier pour l'IA » en carte sombre, puis
// chaque question (ma réponse, la bonne, l'explication), filtrées par « Mes
// erreurs / Tout » et par matière. QCM seulement (PartieExamen garde l'ancien
// débrief pour une partie avec des calculs).
function RevueSalleBase({ revue, numero, titre, retest = false }: { revue: DailyReviewItem[]; numero: number; titre: string; /** « Me retester » : sur une copie relue, pas à la fin d'une partie qu'on quitterait */ retest?: boolean }) {
  const total = revue.length;
  const score = revue.filter((q) => q.isCorrect).length;
  const erreurs = revue.filter((q) => !q.isCorrect);
  const [filtre, setFiltre] = useState<Filtre>(erreurs.length > 0 ? "errors" : "all");
  const [matiere, setMatiere] = useState<string | null>(null);
  const base = filtre === "all" ? revue : erreurs;
  const matieres = matieresDe(base, duelTopicLabel);
  const actif = matieres.some((m) => m.cle === matiere) ? matiere : null;
  const items = actif ? base.filter((q) => (q.topic ?? "autre") === actif) : base;
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const ctx = { day: "", score, total, rank: null, players: 0 };
  const exporter = (scope: Filtre) => exportIASalle(revue, { scope, titre, score, total });

  function aller(position: number) {
    const cible = revue.find((q) => q.position === position);
    if (!cible) return;
    if (filtre === "errors" && cible.isCorrect) setFiltre("all");
    if (actif && (cible.topic ?? "autre") !== actif) setMatiere(null);
    requestAnimationFrame(() => document.getElementById(`q-${position + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div className="mx-auto grid w-full max-w-[880px] gap-7 md:gap-9" style={{ color: "var(--ink)" }}>
      <div className="grid gap-2">
        <p className="kicker m-0">{RUNNER_SALLE.revueKicker(numero)}</p>
        <h2 className="t-h1 m-0">{RUNNER_SALLE.revueTitre}</h2>
        <p className="t-small m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={"rounded-[7px] px-2 py-0.5 text-[12.5px] font-bold " + (pct >= 70 ? "bg-white text-black" : "bg-surface-2 text-white")}>
            {verdictCopie(score, total).replace(/[.]$/, "")}
          </span>
          <span>
            <b className="font-mono font-semibold tabular-nums text-white">{score}</b> sur {total}
            <PctScore justes={score} total={total} />
          </span>
          <span aria-hidden>·</span>
          <span>{titre}</span>
        </p>
      </div>

      <section className="card-quiet grid gap-4 p-5 md:p-6" aria-label={DEFI.coches}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[14px] font-semibold">{DEFI.taCopie}</span>
          <span className="font-mono text-[13px] tabular-nums">
            <b className="font-semibold">{score}</b>
            <span className="text-muted">/{total}</span>
            <PctScore justes={score} total={total} />
          </span>
        </div>
        <Ticks marks={reviewMarks(revue)} label={DEFI.coches} numbered onPick={aller} />
      </section>

      {retest && <RetestRatures questionIds={erreurs.filter((q) => q.selectedIndex !== null).map((q) => q.questionId)} />}

      <section className="card-ink p-6 md:p-8" aria-label={DEFI.iaTout}>
        <Filigrane size={280} className="-right-14 top-1/2 -translate-y-1/2" />
        <DefiAiCopy review={revue} ctx={ctx} layout="block" exporter={exporter} />
      </section>

      <section className="grid gap-5" aria-label={RUNNER_SALLE.revueTitre}>
        <div role="tablist" aria-label="Filtrer les questions" className="seg w-fit" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <span aria-hidden className="seg-thumb" style={segThumbStyle(filtre === "errors" ? 0 : 1, 2)} />
          {(
            [
              ["errors", DEFI.mesRatures, erreurs.length],
              ["all", DEFI.tout, revue.length],
            ] as const
          ).map(([cle, libelle, n]) => (
            <button key={cle} type="button" role="tab" aria-selected={filtre === cle} onClick={() => setFiltre(cle)} className="seg-item px-4 sm:px-5">
              {libelle} <span className="font-mono text-[12px] tabular-nums opacity-70">{n}</span>
            </button>
          ))}
        </div>
        <FiltreMatieres matieres={matieres} valeur={actif} onChange={setMatiere} libelle={DEFI.filtreMatieres} toutes={DEFI.toutesMatieres} />

        {items.length === 0 ? (
          <div className="card-quiet grid gap-1 p-6 text-center">
            <p className="t-h3 m-0">{DEFI.pagePropre}</p>
            <p className="t-small m-0">{DEFI.pagePropreTexte}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((q) => (
              <ReviewCard key={q.position} q={q} total={total} showRate={false} />
            ))}
          </div>
        )}
      </section>

      <div className="border-t border-line pt-6">
        <DefiAiCopy review={revue} ctx={ctx} layout="buttons" exporter={exporter} />
      </div>
    </div>
  );
}

/** Mémorisé : le chrono redessine l'écran cinq fois par seconde, pas la correction. */
export const RevueSalle = memo(RevueSalleBase);
