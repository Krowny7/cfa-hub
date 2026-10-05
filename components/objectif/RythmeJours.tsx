"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Seg } from "@/components/session/parts";
import { jourLong } from "@/lib/voice-objectif";
import { nombre } from "@/lib/voice";

// Sous la courbe de l'objectif : le rythme, jour par jour. Replié, une ligne
// (les 7 derniers jours : total, moyenne, meilleur jour) ; déplié, les
// barres de chaque jour sur 7 jours, 30 jours ou toute la série, avec
// l'objectif du jour en pointillé rouge (une barre pleine : objectif tenu),
// et le détail (total, moyenne, jours actifs, meilleur jour).
// Données : la série de la trajectoire (questions par jour, aujourd'hui
// compris), sans requête de plus.

type Jour = { day: string; n: number };
type Periode = "7" | "30" | "tout";
const PERIODES: { key: Periode; label: string }[] = [
  { key: "7", label: "7 jours" },
  { key: "30", label: "30 jours" },
  { key: "tout", label: "Tout" },
];
const INITIALE = ["D", "L", "M", "M", "J", "V", "S"];
const jourSemaine = (k: string) => INITIALE[new Date(k + "T12:00:00Z").getUTCDay()];

function resume(jours: Jour[]) {
  const total = jours.reduce((s, j) => s + j.n, 0);
  const actifs = jours.filter((j) => j.n > 0).length;
  const meilleur = jours.reduce<Jour | null>((m, j) => (j.n > 0 && (!m || j.n > m.n) ? j : m), null);
  return { total, actifs, moyenne: jours.length ? Math.round(total / jours.length) : 0, meilleur };
}

export function RythmeJours({ serie, objectif }: { serie: Jour[]; objectif: number | null }) {
  const [periode, setPeriode] = useState<Periode>("7");
  const semaine = useMemo(() => resume(serie.slice(-7)), [serie]);
  const jours = periode === "tout" ? serie : serie.slice(-Number(periode));
  const r = resume(jours);
  const echelle = Math.max(1, ...jours.map((j) => j.n), objectif ?? 0) * 1.08;
  const aujourdhui = serie[serie.length - 1]?.day;
  if (serie.length === 0) return null;

  return (
    <details className="group/r border-t border-line pt-4">
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-2 gap-y-1 [&::-webkit-details-marker]:hidden">
        <ChevronRight size={14} aria-hidden className="shrink-0 self-center text-muted transition-transform group-open/r:rotate-90" />
        <span className="t-small font-semibold text-white">Par jour</span>
        <span className="t-small">
          7 derniers jours : {nombre(semaine.total)} question{semaine.total > 1 ? "s" : ""}, {nombre(semaine.moyenne)} par jour
          {semaine.meilleur && (
            <>
              {" "}
              · meilleur jour {nombre(semaine.meilleur.n)} le {jourLong(semaine.meilleur.day)}
            </>
          )}
        </span>
      </summary>

      <div className="rl-in mt-4 flex flex-col gap-4">
        <Seg value={periode} onChange={setPeriode} options={PERIODES} label="Période" className="w-full sm:w-auto sm:self-start" />

        <div className="relative h-[104px]" role="img" aria-label={`Questions par jour sur ${jours.length} jours : ${r.total} au total`}>
          {objectif !== null && objectif > 0 && (
            <span
              aria-hidden
              className="absolute inset-x-0 border-t border-dashed border-pen/70"
              style={{ bottom: `${(objectif / echelle) * 100}%` }}
              title={`objectif du jour : ${objectif}`}
            />
          )}
          <div className={"absolute inset-0 flex items-end " + (jours.length > 40 ? "gap-px" : jours.length > 14 ? "gap-[3px]" : "gap-2")}>
            {jours.map((j) => {
              const tenu = objectif !== null && objectif > 0 && j.n >= objectif;
              const auj = j.day === aujourdhui;
              return (
                // une colonne par jour ; la barre y est centrée et bornée (7 jours : pas de pavés)
                <span key={j.day} className="flex h-full min-w-0 flex-1 items-end justify-center">
                  <span
                    title={`${jourLong(j.day)} · ${j.n} question${j.n > 1 ? "s" : ""}${auj ? " (aujourd'hui)" : ""}`}
                    className={
                      "w-full max-w-[40px] rounded-t-[3px] transition-[height] " +
                      (j.n === 0 ? "bg-line" : tenu ? "bg-white" : "bg-[color-mix(in_oklab,var(--ink)_38%,transparent)]") +
                      (auj ? " outline outline-1 outline-offset-1 outline-[var(--ink-3)]" : "")
                    }
                    style={{ height: j.n === 0 ? 2 : `${Math.max(4, (j.n / echelle) * 100)}%` }}
                  />
                </span>
              );
            })}
          </div>
        </div>
        {/* repères sous les barres : chaque jour sur 7 jours, le début et la fin sinon */}
        {jours.length <= 7 ? (
          <div className="-mt-2 flex gap-2">
            {jours.map((j) => (
              <span key={j.day} className="t-micro min-w-0 flex-1 text-center font-mono">
                {jourSemaine(j.day)}
              </span>
            ))}
          </div>
        ) : (
          <div className="t-micro -mt-2 flex justify-between font-mono">
            <span>{jourLong(jours[0].day)}</span>
            <span>aujourd&apos;hui</span>
          </div>
        )}

        <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
          {[
            ["Questions", nombre(r.total)],
            ["Par jour", nombre(r.moyenne)],
            ["Jours actifs", `${r.actifs} / ${jours.length}`],
            ["Meilleur jour", r.meilleur ? `${nombre(r.meilleur.n)} · ${jourLong(r.meilleur.day)}` : "—"],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="t-micro">{k}</dt>
              <dd className="m-0 mt-0.5 truncate font-mono text-[14px] font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        {objectif !== null && objectif > 0 && (
          <p className="t-micro m-0">Barre pleine : objectif du jour tenu ({nombre(objectif)} questions). Pointillé rouge : l&apos;objectif.</p>
        )}
      </div>
    </details>
  );
}
