"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DataSheet, PenMark } from "@/components/calculs/parts";
import { CALC } from "@/components/calculs/voice";
import { ATELIER as V } from "@/lib/voice-atelier";
import { UNIT_FIELD, decimalsOf, formatCalc, parseCalcInput } from "@/lib/calc/engine";
import type { ItemCalc } from "@/lib/atelier-seance";

// Un calcul de l'Atelier : l'énoncé bref, les données, le champ numérique ;
// après la réponse (corrigée côté serveur), la bonne valeur et la correction
// pas à pas. Mêmes mots et mêmes repères que les rounds de /calculs.

export type CorrigeCalc = { juste: boolean; valeur: number | null; bonne: number | null; solution: string[] };

export function AtelierCalcul({
  item,
  corrige,
  envoi,
  message,
  onRepondre,
}: {
  item: ItemCalc;
  corrige: CorrigeCalc | null;
  envoi: boolean;
  /** une erreur, ou l'indice de format renvoyé par la correction */
  message: string | null;
  onRepondre: (raw: string) => void;
}) {
  const q = item.q;
  const [saisie, setSaisie] = useState("");
  const [local, setLocal] = useState<string | null>(null);
  const champ = useRef<HTMLInputElement | null>(null);
  const lu = useMemo(() => parseCalcInput(saisie), [saisie]);
  useEffect(() => {
    if (!corrige) champ.current?.focus({ preventScroll: true });
  }, [corrige, item.i]);
  if (!q) return null;
  const unite = UNIT_FIELD[q.unit];
  const alerte = local ?? message;
  return (
    <div className="grid gap-6">
      <h2 className="m-0 text-[21px] font-[680] leading-[1.18] tracking-[-0.024em] [overflow-wrap:anywhere] sm:text-[24px] md:text-[26px]">{q.prompt}</h2>
      <DataSheet data={q.data} className="max-w-[560px]" />
      {!corrige ? (
        <form
          id="atelier-calcul"
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!saisie.trim() || envoi) return;
            if (lu === null) return setLocal(CALC.pasUnNombre);
            setLocal(null);
            onRepondre(saisie.trim());
          }}
        >
          <div className="relative min-w-0">
            <input
              ref={champ}
              value={saisie}
              onChange={(e) => {
                setSaisie(e.target.value);
                if (local) setLocal(null);
              }}
              inputMode="decimal"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="go"
              placeholder={V.tonResultat}
              aria-label={V.taReponse(unite)}
              aria-invalid={!!alerte || undefined}
              aria-describedby="atelier-calcul-aide"
              className={"input h-[56px] rounded-[14px] pl-5 font-mono text-[22px] font-semibold tabular-nums placeholder:font-sans placeholder:text-[16px] placeholder:font-medium " + (unite ? "pr-16" : "pr-5")}
            />
            {unite && <span aria-hidden className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 font-mono text-[17px] font-semibold text-muted">{unite}</span>}
          </div>
          <p id="atelier-calcul-aide" className={"m-0 text-[12.5px] leading-snug " + (alerte ? "text-pen" : "text-muted")} role={alerte ? "alert" : undefined}>
            {alerte ?? CALC.saisie}
          </p>
        </form>
      ) : (
        <div className="rl-in grid gap-4 border-t border-line pt-5" role="status">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <PenMark ok={corrige.juste} size={26} />
            <span className={"t-h2 " + (corrige.juste ? "" : "text-pen")}>{corrige.juste ? CALC.juste : CALC.rature}</span>
            {corrige.bonne !== null && <span className="ml-auto font-mono text-[19px] font-semibold tabular-nums">{formatCalc(corrige.bonne, q.unit, q.decimals)}</span>}
          </div>
          {!corrige.juste && corrige.valeur !== null && (
            <p className="m-0 text-[14px]">
              <span className="t-eyebrow mr-2">{CALC.taReponse}</span>
              <span className="font-mono tabular-nums text-pen line-through decoration-2">{formatCalc(corrige.valeur, q.unit, decimalsOf(corrige.valeur))}</span>
            </p>
          )}
          {corrige.solution.length > 0 && (
            <div className="grid gap-2">
              <p className="t-eyebrow m-0">{CALC.correction}</p>
              <ol className="m-0 grid gap-2 p-0">
                {corrige.solution.map((s, k) => (
                  <li key={k} className="flex gap-3">
                    <span className="w-5 shrink-0 pt-[3px] text-right font-mono text-[12px] text-[color:var(--ink-3)] tabular-nums">{k + 1}</span>
                    <span className="min-w-0 text-[14.5px] leading-[1.6] text-body tabular-nums [overflow-wrap:anywhere]">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
