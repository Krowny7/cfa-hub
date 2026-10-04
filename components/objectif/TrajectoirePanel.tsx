import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TrajectoireChart } from "@/components/objectif/TrajectoireChart";
import { joursEntre, RYTHME_LIMITE } from "@/lib/objectif-calc";
import type { EtatObjectif } from "@/lib/objectif";
import { OBJECTIF, jourLong } from "@/lib/voice-objectif";
import { nombre } from "@/lib/voice";

// L'objectif de questions d'ici l'examen : la trajectoire (cumul, droite de
// l'objectif, objectif recalculé, projection) et ses deux phrases, ou la
// proposition d'en fixer un. `variante` : « carte » (Moi, carte à part
// entière) ou « onglet » (accueil, dans la carte « Ta progression »).
// Sans état : la courbe est le seul composant client.

export const HREF_REGLAGE = "/moi?onglet=reglages#objectif";

export function TrajectoirePanel({ e, variante = "carte" }: { e: EtatObjectif; variante?: "carte" | "onglet" }) {
  const carte = variante === "carte";
  const wrap = (children: React.ReactNode, label: string) =>
    carte ? (
      <section className="card p-5 sm:p-8" aria-label={label} id="trajectoire">
        {children}
      </section>
    ) : (
      <div aria-label={label}>{children}</div>
    );

  if (e.etat !== "trajectoire") {
    const jours = e.etat === "sans-objectif" && e.examen ? joursEntre(e.aujourdhui, e.examen) : 0;
    const texte =
      e.etat === "sans-date"
        ? OBJECTIF.sansDate(e.meta.total)
        : e.examen && jours > 0
          ? OBJECTIF.vide.avecDate(e.avant + e.jour, e.examen, jours)
          : OBJECTIF.vide.sansDate;
    return wrap(
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-[560px]">
          {carte && <p className="t-eyebrow">{OBJECTIF.surTitre}</p>}
          <h2 className={carte ? "t-h2 mt-2" : "t-h3"}>{e.etat === "sans-date" ? OBJECTIF.titre : OBJECTIF.vide.titre}</h2>
          <p className="t-small mt-2">{texte}</p>
        </div>
        <Link href={HREF_REGLAGE} className="btn btn-primary shrink-0 self-start sm:self-auto">
          {e.etat === "sans-date" || !e.examen ? OBJECTIF.fixerDate : OBJECTIF.fixer} <ArrowRight size={16} aria-hidden />
        </Link>
      </div>,
      OBJECTIF.surTitre,
    );
  }

  const t = e.t;
  const fait = t.avant + t.jour;
  const p = t.plan;
  return wrap(
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          {carte && <p className="t-eyebrow">{OBJECTIF.surTitre}</p>}
          <p className={"flex items-baseline gap-2 " + (carte ? "mt-2" : "")}>
            <span className="t-num text-[34px] leading-none sm:text-[40px]">{nombre(fait)}</span>
            <span className="font-mono text-[15px] text-muted tabular-nums">/ {nombre(t.total)}</span>
            <span className="t-micro ml-1">d&apos;ici le {jourLong(t.examen)}</span>
          </p>
        </div>
        {p.statut === "actif" && (
          <div className="text-left sm:text-right">
            <p className="t-micro">Objectif du jour</p>
            <p className="mt-1 flex items-baseline gap-1.5 sm:justify-end">
              <span className="t-num text-[26px] leading-none text-pen">{nombre(p.quotidien)}</span>
              <span className="font-mono text-[13px] text-muted">questions</span>
            </p>
          </div>
        )}
      </div>

      {p.statut !== "passe" && <TrajectoireChart t={t} compact={!carte} />}

      <div className="flex flex-col gap-1.5">
        {p.statut === "actif" && (
          <>
            <p className="t-small m-0">
              <span className="font-semibold text-white">{OBJECTIF.ecart(t.avant - t.ideal)}</span> {OBJECTIF.recalcul(Math.max(0, t.total - fait), p.jours, p.quotidien)}
            </p>
            <p className="t-small m-0">{OBJECTIF.projection(t.rythme, t.projection, t.total)}</p>
            {p.quotidien > RYTHME_LIMITE && <p className="t-small m-0 font-semibold text-pen">{OBJECTIF.limite}</p>}
          </>
        )}
        {p.statut === "atteint" && <p className="t-small m-0 font-semibold text-white">{OBJECTIF.atteint(fait, t.total)}</p>}
        {p.statut === "passe" && <p className="t-small m-0">{OBJECTIF.passe}</p>}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-4">
        {p.statut !== "passe" ? (
          <ul className="t-micro m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0" aria-label="Légende">
            <li className="inline-flex items-center gap-1.5">
              <svg width="18" height="6" aria-hidden>
                <path d="M1 3 L17 3" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-white" />
              </svg>
              {OBJECTIF.legende.courbe}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <svg width="18" height="6" aria-hidden>
                <path d="M1 3 L17 3" stroke="var(--ink-3)" strokeWidth="1.4" strokeDasharray="5 3" />
              </svg>
              {OBJECTIF.legende.droite}
            </li>
            {p.statut === "actif" && (
              <li className="inline-flex items-center gap-1.5">
                <svg width="18" height="6" aria-hidden>
                  <path d="M1 3 L17 3" stroke="var(--pen)" strokeWidth="1.8" strokeDasharray="2 3" strokeLinecap="round" />
                </svg>
                {OBJECTIF.legende.recalcule}
              </li>
            )}
          </ul>
        ) : (
          <span />
        )}
        <Link href={HREF_REGLAGE} className="ink-link t-small font-semibold">
          {OBJECTIF.ajuster}
        </Link>
      </div>
    </div>,
    OBJECTIF.titre,
  );
}
