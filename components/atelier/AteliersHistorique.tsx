"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { LogoAtelier } from "@/components/atelier/LogoAtelier";
import { CardLabel } from "@/components/ui/Titles";
import { ParNotion } from "@/components/atelier/AtelierBilan";
import type { AtelierPasse, HistoriqueAteliers } from "@/lib/atelier-seance";
import { ATELIER as V } from "@/lib/voice-atelier";

// Moi › Stats : l'historique des Ateliers clos. Épuré : le dernier en bref
// (date, durée, note ; avant → pendant par notion ; ratures rayées et XP),
// son bilan complet à la demande, puis les précédents repliés, chacun
// s'ouvrant sur son bilan par notion. Replis natifs dont le contenu n'est
// rendu qu'à l'ouverture (la page reste légère : chaque bilan porte ses
// traits d'encre). Les données arrivent prêtes (app/atelier/donnees.ts
// lireHistoriqueAteliers), dates déjà formatées côté serveur au jour de Paris.

const RESUME = "inline-flex min-h-[44px] cursor-pointer list-none items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-white [&::-webkit-details-marker]:hidden";

const rayeesDe = (a: AtelierPasse) => a.bilan.notions.reduce((s, n) => s + n.ratures.rayees, 0);
const nomDe = (h: HistoriqueAteliers, notion: string) => h.noms[notion]?.libelle ?? notion;

/** Un repli natif dont le contenu n'est rendu qu'une fois ouvert (ouvert avant l'hydratation : rendu au montage). */
function Repli({ className, resume, children }: { className: string; resume: React.ReactNode; children: React.ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDetailsElement | null>(null);
  useEffect(() => {
    if (ref.current?.open) setOuvert(true);
  }, []);
  return (
    <details ref={ref} className={className} onToggle={(e) => setOuvert(e.currentTarget.open)}>
      {resume}
      {ouvert && children}
    </details>
  );
}

/** Le bilan d'un Atelier, par notion, et son re-test. */
function Detail({ a, h }: { a: AtelierPasse; h: HistoriqueAteliers }) {
  return (
    <div className="grid gap-2 pt-2">
      <ParNotion b={a.bilan} rappels={h.noms} anime={false} />
      {a.bilan.retest.n > 0 && <p className="t-micro m-0">{V.retest(a.bilan.retest.ok, a.bilan.retest.n)}</p>}
    </div>
  );
}

/** La carte « Tes Ateliers » (au moins un Atelier clos). */
export function AteliersHistorique({ h }: { h: HistoriqueAteliers }) {
  const [dernier, ...precedents] = h.ateliers;
  if (!dernier) return null;
  const bilanCourt = V.rayeesXp(rayeesDe(dernier), dernier.xp);
  return (
    <section className="card-quiet flex h-full min-w-0 flex-col gap-3 p-6 md:p-7" aria-labelledby="moi-ateliers">
      <CardLabel icon={<LogoAtelier className="size-[17px]" />} right={<span className="t-micro">{V.historiqueCompte(h.ateliers.length)}</span>}>
        <span id="moi-ateliers">{V.historique}</span>
      </CardLabel>

      <div className="grid gap-2">
        <div>
          <p className="t-eyebrow m-0">{V.dernier}</p>
          <p className="m-0 mt-1 font-mono text-[14px] font-semibold tabular-nums">{V.seance(dernier.date, dernier.minutes, dernier.bilan.score, dernier.bilan.total)}</p>
        </div>
        <ul className="m-0 grid list-none gap-1 p-0">
          {dernier.bilan.notions.map((n) => (
            <li key={n.notion} className="flex min-w-0 items-baseline justify-between gap-3 text-[14px]">
              <span className="min-w-0 font-semibold [overflow-wrap:anywhere]">{nomDe(h, n.notion)}</span>
              <span className="t-small shrink-0 font-mono tabular-nums">{V.notionCourte(n.avant, n.pendant, n.calcul)}</span>
            </li>
          ))}
        </ul>
        {bilanCourt && <p className="t-small m-0">{bilanCourt}</p>}
        <Repli
          className="group"
          resume={
            <summary className={RESUME}>
              <ChevronRight size={14} aria-hidden className="transition-transform group-open:rotate-90" />
              {V.detail}
            </summary>
          }
        >
          <Detail a={dernier} h={h} />
        </Repli>
      </div>

      {precedents.length > 0 && (
        <details className="group/p border-t border-line pt-1">
          <summary className={RESUME}>
            <ChevronRight size={14} aria-hidden className="transition-transform group-open/p:rotate-90" />
            {V.precedents(precedents.length)}
          </summary>
          <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
            {precedents.map((a) => (
              <li key={a.id}>
                <Repli
                  className="group/a"
                  resume={
                    <summary className="rl-row -mx-2 flex min-h-[44px] cursor-pointer list-none items-center gap-3 rounded-[12px] px-2 py-2.5 [&::-webkit-details-marker]:hidden">
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-[13px] font-semibold tabular-nums">{V.seance(a.date, a.minutes, a.bilan.score, a.bilan.total)}</span>
                        <span className="t-micro block truncate">{a.bilan.notions.map((n) => nomDe(h, n.notion)).join(", ")}</span>
                      </span>
                      <ChevronRight size={15} aria-hidden className="shrink-0 text-muted transition-transform group-open/a:rotate-90" />
                    </summary>
                  }
                >
                  <div className="pb-3">
                    <Detail a={a} h={h} />
                  </div>
                </Repli>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
