"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Copy, RotateCcw } from "lucide-react";
import { copierRatures } from "@/app/moi/actions-activites";
import { Bouton } from "@/components/moi/synthese/Encre";
import { selection, type Activite } from "@/lib/activites";
import type { AnswerSource } from "@/lib/answer-stats";
import { lienSimilaires, ratures } from "@/lib/notions-similaires";
import { ACTIVITES as V } from "@/lib/voice-moi";
import { RETEST } from "@/lib/voice-notions";

// Moi › Activités, la partie vivante : on choisit un jour, puis un type (les types du jour
// choisi seulement) ; la carte du dessus résume la sélection et en reprend les ratures,
// à copier (texte des questions, pour les relire ailleurs) ou à retester (/practice?similaires).

class ErreurCopie extends Error {}

const CHIP = "chip shrink-0 whitespace-nowrap max-md:min-h-[44px]";

function Puce({ actif, onClick, children, compte }: { actif: boolean; onClick: () => void; children: React.ReactNode; compte?: number }) {
  return (
    <button type="button" className={CHIP + (actif ? " chip-active" : "")} aria-pressed={actif} onClick={onClick}>
      {children}
      {compte !== undefined && <span className="font-mono text-[12px] tabular-nums opacity-60">{compte}</span>}
    </button>
  );
}

export function ActivitesListe({ activites, aujourdhui, hier, libelles }: { activites: Activite[]; aujourdhui: string; hier: string; libelles: Record<AnswerSource, string> }) {
  const [jour, setJour] = useState<string | null>(null);
  const [type, setType] = useState<AnswerSource | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [etat, setEtat] = useState<{ ok: boolean; msg: string } | null>(null);

  const jours = useMemo(() => {
    const m = new Map<string, { label: string; n: number }>();
    for (const a of activites) {
      if (!a.jour) continue;
      const j = m.get(a.jour) ?? { label: a.jour === aujourdhui ? V.aujourdhui : a.jour === hier ? V.hier : a.date, n: 0 };
      j.n += 1;
      m.set(a.jour, j);
    }
    return [...m.entries()];
  }, [activites, aujourdhui, hier]);

  // les types du jour choisi (tous les jours : tous les types)
  const types = useMemo(() => {
    const m = new Map<AnswerSource, number>();
    for (const a of activites) if (jour === null || a.jour === jour) m.set(a.source, (m.get(a.source) ?? 0) + 1);
    return [...m.entries()];
  }, [activites, jour]);
  const src = type && types.some(([s]) => s === type) ? type : null;

  const sel = useMemo(() => selection(activites, jour, src), [activites, jour, src]);
  const nomJour = jour === null ? V.tousJours : (jours.find(([j]) => j === jour)?.[1].label ?? jour);
  const nomSelection = src ? `${nomJour} · ${libelles[src]}` : nomJour;

  const choisirJour = (j: string | null) => {
    setJour(j);
    setEtat(null);
  };
  const choisirType = (t: AnswerSource | null) => {
    setType(t);
    setEtat(null);
  };

  async function copier() {
    setOccupe(true);
    setEtat(null);
    let n = 0;
    // le texte se demande tout de suite : Safari n'écrit dans le presse-papier que pendant le clic
    const texte = copierRatures(sel.ratees, nomSelection).then((r) => {
      if (!r.ok) throw new ErreurCopie(r.erreur);
      n = r.n;
      return r.texte;
    });
    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "text/plain": texte.then((t) => new Blob([t], { type: "text/plain" })) })]);
      } else {
        await navigator.clipboard.writeText(await texte);
      }
      setEtat({ ok: true, msg: V.copiees(n) });
    } catch (e) {
      if (e instanceof ErreurCopie) setEtat({ ok: false, msg: e.message });
      else {
        try {
          await navigator.clipboard.writeText(await texte);
          setEtat({ ok: true, msg: V.copiees(n) });
        } catch (e2) {
          setEtat({ ok: false, msg: e2 instanceof ErreurCopie ? e2.message : V.copieKo });
        }
      }
    } finally {
      setOccupe(false);
    }
  }

  const k = sel.ratees.length;
  return (
    <>
      <div className="grid grid-cols-1 gap-2.5">
        <div className="flex items-center gap-3">
          <span className="w-[40px] shrink-0 text-[12px] font-semibold text-[var(--ink-3)]">{V.jour}</span>
          <div className="-my-1 flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 [scrollbar-width:thin]">
            <Puce actif={jour === null} onClick={() => choisirJour(null)}>
              {V.tous}
            </Puce>
            {jours.map(([j, { label, n }]) => (
              <Puce key={j} actif={jour === j} onClick={() => choisirJour(j)} compte={n}>
                {label}
              </Puce>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 md:items-start">
          <span className="w-[40px] shrink-0 md:pt-2 text-[12px] font-semibold text-[var(--ink-3)]">{V.type}</span>
          <div className="flex min-w-0 flex-1 gap-2 max-md:-my-1 max-md:overflow-x-auto max-md:py-1 max-md:[scrollbar-width:thin] md:flex-wrap">
            <Puce actif={src === null} onClick={() => choisirType(null)}>
              {V.tous}
            </Puce>
            {types.map(([s, n]) => (
              <Puce key={s} actif={src === s} onClick={() => choisirType(s)} compte={n}>
                {libelles[s]}
              </Puce>
            ))}
          </div>
        </div>
      </div>

      {sel.liste.length > 0 && (
        <section className="card-quiet flex flex-wrap items-center justify-between gap-x-6 gap-y-3 p-5 md:p-6" aria-label={nomSelection}>
          <div className="grid min-w-0 flex-1 basis-[260px] gap-1">
            <p className="t-h3 m-0">{k > 0 ? RETEST.titre(k) : V.bilan(sel.liste.length, sel.ok, sel.n)}</p>
            <p className="t-small m-0">{k > 0 ? `${nomSelection} · ${V.bilan(sel.liste.length, sel.ok, sel.n)}` : V.sansRature}</p>
          </div>
          {k > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="btn btn-secondary" onClick={copier} disabled={occupe} aria-busy={occupe}>
                <Copy size={16} aria-hidden /> {V.copier}
              </button>
              <Bouton href={lienSimilaires(ratures(sel.ratees))}>
                <RotateCcw size={16} aria-hidden /> {RETEST.bouton}
              </Bouton>
            </div>
          )}
          {etat && (
            <p role="status" className={"m-0 basis-full text-sm " + (etat.ok ? "text-[var(--ink-2)]" : "text-pen")}>
              {etat.msg}
            </p>
          )}
        </section>
      )}

      {sel.liste.length === 0 ? (
        <p className="card-quiet m-0 p-6 text-[14px]">{V.aucune}</p>
      ) : (
        <ul className="card-quiet m-0 grid list-none divide-y divide-[var(--pencil-2)] p-0">
          {sel.liste.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-[14px] md:px-5">
              <span className="w-[64px] shrink-0 font-mono text-[12.5px] text-[var(--ink-2)]">{a.date}</span>
              <span className="min-w-0 flex-1 max-md:basis-[calc(100%-80px)]">
                <b className="font-semibold">{a.label}</b>
                <span className="text-[var(--ink-2)]"> · {libelles[a.source]}</span>
              </span>
              <span className="font-mono text-[13px] tabular-nums max-md:ml-[80px] max-md:flex-1">
                {a.ok}/{a.n}
                {a.n > 0 && <span className="text-[var(--ink-2)]"> · {Math.round((100 * a.ok) / a.n)} %</span>}
              </span>
              {a.href ? (
                <Link href={a.href} className="w-[92px] text-right text-[13px] font-semibold underline underline-offset-4">
                  {V.voir}
                </Link>
              ) : (
                <span className="w-[92px]" />
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
