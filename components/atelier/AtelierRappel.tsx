"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, FileText, Headphones } from "lucide-react";
import { Feuille } from "@/components/ui/Feuille";
import { RichText } from "@/components/RichText";
import type { RappelNotion } from "@/lib/atelier-seance";
import { ATELIER as V } from "@/lib/voice-atelier";

// Les cartes Rappel de l'Atelier : ce qui coince, formules et pièges du type
// de calcul, trois flashcards (le verso au toucher), puis la page de fiche,
// ouverte dans un tiroir (la Feuille) sans quitter l'Atelier, et le chapitre
// audio, à la bonne minute. Une carte par notion à l'ouverture, l'une sous
// l'autre ; une seule après deux erreurs de suite.

/** Une petite commande agrandie au toucher (44 px de haut) sans changer son dessin. */
const TOUCHER = "relative after:absolute after:-inset-x-1 after:-inset-y-3 after:content-['']";

/** La page de fiche dans la Feuille : le PDF à la bonne page, et le lien vers la fiche. */
export function FicheFeuille({ fiche, ouvert, onFermer }: { fiche: NonNullable<RappelNotion["fiche"]>; ouvert: boolean; onFermer: () => void }) {
  // une synthèse occupe deux pages du PDF (comme la page des fiches)
  const src = fiche.pdf ? (fiche.page ? `${fiche.pdf}#page=${fiche.page * 2 - 1}` : fiche.pdf) : null;
  return (
    <Feuille ouvert={ouvert} onFermer={onFermer} titre={V.feuille(fiche.page)}>
      <div className="grid gap-3 pt-2">
        {src ? (
          ouvert && <iframe src={src} title={V.feuille(fiche.page)} className="block h-[62dvh] w-full rounded-[12px] border border-line bg-surface-2 lg:h-[calc(100dvh-170px)]" />
        ) : (
          <p className="t-small m-0">{V.ficheIndisponible}</p>
        )}
        <Link href={fiche.href} target="_blank" rel="noopener" className={"ink-link inline-flex w-fit items-center gap-1 text-[13px] font-semibold " + TOUCHER}>
          {V.ouvrirFiche} <ArrowRight size={13} aria-hidden />
        </Link>
      </div>
    </Feuille>
  );
}

function Flashcard({ recto, verso }: { recto: string; verso: string }) {
  const [ouverte, setOuverte] = useState(false);
  return (
    <li className="rounded-[12px] border border-line px-3.5 py-3">
      <RichText text={recto} className="text-[14px] font-semibold leading-snug break-words [overflow-wrap:anywhere]" />
      {ouverte ? (
        <RichText text={verso} className="rl-in mt-2 border-t border-line pt-2 text-[13.5px] leading-[1.55] text-body break-words [overflow-wrap:anywhere]" />
      ) : (
        <button type="button" className="t-micro -mb-2 inline-flex min-h-[44px] items-center gap-1 font-semibold hover:text-white" aria-expanded={false} onClick={() => setOuverte(true)}>
          {V.verso} <ChevronDown size={12} aria-hidden />
        </button>
      )}
    </li>
  );
}

/** Une carte Rappel. `compacte` : dans le plan ou la Feuille du rappel (sans grand titre). */
export function CarteRappel({ r, compacte = false }: { r: RappelNotion; compacte?: boolean }) {
  const [fiche, setFiche] = useState(false);
  const vide = !r.concepts.length && !r.calcul && !r.flashcards.length;
  return (
    <article className={"grid min-w-0 content-start gap-3.5 " + (compacte ? "" : "card p-5 md:p-6")}>
      <div className="min-w-0">
        <p className={(compacte ? "text-[15px]" : "text-[17px]") + " m-0 font-semibold leading-snug [overflow-wrap:anywhere]"}>{r.libelle}</p>
        <p className="t-micro m-0 mt-0.5">{r.repere}</p>
      </div>
      {r.concepts.length > 0 && (
        <div className="grid gap-1">
          <p className="t-eyebrow m-0">{V.coince}</p>
          <ul className="t-small m-0 grid list-none gap-1 p-0">
            {r.concepts.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      {r.calcul && (
        <div className="grid gap-1.5">
          <p className="t-eyebrow m-0">
            {V.formules} · {r.calcul.nom}
          </p>
          <ul className="m-0 grid list-none gap-1 p-0">
            {r.calcul.formules.map((f) => (
              <li key={f} className="rounded-[10px] bg-surface-2/60 px-3 py-2 font-mono text-[13px] leading-snug break-words [overflow-wrap:anywhere]">
                {f}
              </li>
            ))}
          </ul>
          {r.calcul.pieges.length > 0 && (
            <>
              <p className="t-eyebrow m-0 mt-1">{V.pieges}</p>
              <ul className="t-small m-0 grid list-disc gap-1 pl-4">
                {r.calcul.pieges.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {r.flashcards.length > 0 && (
        <div className="grid gap-1.5">
          <p className="t-eyebrow m-0">{V.flashcards}</p>
          <ul className="m-0 grid list-none gap-2 p-0">
            {r.flashcards.map((f, k) => (
              <Flashcard key={k} recto={f.recto} verso={f.verso} />
            ))}
          </ul>
        </div>
      )}
      {vide && <p className="t-small m-0">{V.sansContenu}</p>}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        {r.fiche && (
          <button type="button" className={"ink-link inline-flex items-center gap-1.5 text-[13px] font-semibold " + TOUCHER} onClick={() => setFiche(true)}>
            <FileText size={14} aria-hidden /> {r.fiche.page !== null ? V.fiche(r.fiche.page) : V.ficheEntiere}
          </button>
        )}
        <Link href={r.cours.href} target="_blank" rel="noopener" className={"ink-link inline-flex items-center gap-1.5 text-[13px] font-semibold " + TOUCHER}>
          <Headphones size={14} aria-hidden /> {V.cours}
          {r.cours.debut && r.cours.minutes !== null && <span className="font-mono font-normal text-muted">{V.coursDetail(r.cours.debut, r.cours.minutes)}</span>}
        </Link>
      </div>
      {r.fiche && <FicheFeuille fiche={r.fiche} ouvert={fiche} onFermer={() => setFiche(false)} />}
    </article>
  );
}

/** Le bloc Rappel : une carte par notion (ouverture), ou celle d'une notion après deux erreurs. */
export function BlocRappel({
  rappels,
  raison,
  libelle,
  onContinuer,
}: {
  rappels: RappelNotion[];
  raison: "ouverture" | "fautes";
  libelle: string;
  onContinuer: () => void;
}) {
  return (
    <section className="rl-in grid gap-4" aria-label={V.rappel}>
      <div className="grid gap-1 px-1">
        <p className="kicker m-0">{V.rappel}</p>
        <h2 className="t-h2 m-0">{raison === "ouverture" ? V.rappelOuverture : V.rappelFautes(libelle)}</h2>
        {raison === "fautes" && <p className="t-small m-0">{V.rappelFautesSuite}</p>}
      </div>
      <div className="grid gap-3">
        {rappels.map((r) => (
          <CarteRappel key={r.notion} r={r} />
        ))}
      </div>
      <div className="flex justify-end">
        <button type="button" className="btn btn-primary rl-press w-full min-h-[44px] sm:w-auto" onClick={onContinuer}>
          {raison === "ouverture" ? V.commencerQuestions : V.continuer} <ArrowRight size={16} aria-hidden />
        </button>
      </div>
    </section>
  );
}
