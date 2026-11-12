"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Mini } from "@/components/outils/Gabarit";
import { Chiffre, ListeCourte } from "@/components/ui/Decors";
import { CadreZones, EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import type { AllProgress } from "@/lib/calc/engine";
import { CALC_LEVELS, type CalcTopic } from "@/lib/calc/types";
import { nombre } from "@/lib/voice";
import { SOUS_ENTRAINEMENT } from "@/lib/voice-entrainement-sous";
import { etatType, nomCourt, type EtatType } from "./outils";
import { useCalcProgress, useLocalImport } from "./useCalc";
import { CALC, NIVEAU, nbQuestions } from "./voice";
import s from "./or.module.css";

export type CalcTopicType = { key: string; name: string; tier: "essentiel" | "annexe"; top?: boolean; source: string | null; questions: number };

const M = SOUS_ENTRAINEMENT.calculsMatiere;

/**
 * /calculs/[matiere], sur le modèle des sous-pages validé par Théo (2026-11-12) : l'en-tête commun
 * (retour aux Calculs), puis le cadre à zones : les registres à gauche (le Top 5 en or, les
 * Essentiels, les Annexes, dans l'ordre du programme : nom, référence, niveaux tenus F · M · D,
 * précision récente), ce qui est à reprendre dans la colonne grise (les calculs entamés pas encore
 * tenus, les moins réussis d'abord ; à défaut, les niveaux tenus). Pas d'annexe.
 *
 * Props : `subject` ({topic, slug, name, short}), `types`, `progress` (base, null = repli local), `db`, `owner`.
 */
export function CalcTopicView({
  subject,
  types,
  progress: server,
  db,
  owner,
}: {
  subject: { topic: CalcTopic; slug: string; name: string; short?: string };
  types: CalcTopicType[];
  progress: AllProgress | null;
  db: boolean;
  owner: string;
}) {
  useLocalImport(db, owner);
  const { progress } = useCalcProgress(server, owner);
  const mine = progress[subject.topic];
  const essentiels = types.filter((t) => t.tier === "essentiel");
  const annexes = types.filter((t) => t.tier === "annexe");
  const totalQ = types.reduce((n, t) => n + t.questions, 0);

  const etats = types.map((t) => ({ t, ...etatType(mine?.[t.key]) }));
  // le Top 5 (en or) à part, en tête ; les autres essentiels ensuite
  const etatsTop = etats.filter((x) => x.t.top);
  const etatsEss = etats.filter((x) => x.t.tier === "essentiel" && !x.t.top);
  const etatsAnn = etats.filter((x) => x.t.tier === "annexe");
  const niv = CALC_LEVELS.length;
  const tenus = etats.reduce((n, x) => n + x.tenus, 0);
  const total = types.length * niv;

  // à reprendre : entamés, pas encore tenus aux trois niveaux, les moins réussis d'abord
  const fragiles = etats.filter((x) => x.pct !== null && x.tenus < niv).sort((a, b) => (a.pct as number) - (b.pct as number));
  const droite = fragiles.length ? (
    <ListeCourte
      lignes={fragiles.map((x) => ({ cle: x.t.key, titre: nomCourt(x.t.name), detail: `${x.pct} %`, href: `/calculs/${subject.slug}/${x.t.key}` }))}
    />
  ) : (
    <Chiffre valeur={M.sur(tenus, total)} legende={M.tenus(tenus)} />
  );

  return (
    <SousPage
      entete={
        <EnTeteSousPage
          retour={{ href: "/calculs", label: CALC.hubTitre }}
          titre={subject.name}
          ligne={`${nombre(essentiels.length)} ${essentiels.length > 1 ? "essentiels" : "essentiel"} · ${nombre(annexes.length)} ${annexes.length > 1 ? "annexes" : "annexe"} · ${nbQuestions(totalQ)}`}
          illustration={{ nom: "calculs-poulies" }}
        />
      }
    >
      <CadreZones
        gauche={{
          titre: M.registres,
          contenu: (
            <div className="grid min-w-0 gap-7">
              {etatsTop.length > 0 && <Registre id="reg-top" titre={CALC.top} sous={CALC.topSous} liste={etatsTop} slug={subject.slug} or />}
              {etatsEss.length > 0 && <Registre id="reg-essentiels" titre={CALC.essentiels} sous={CALC.essentielsSous} liste={etatsEss} slug={subject.slug} />}
              {etatsAnn.length > 0 && <Registre id="reg-annexes" titre={CALC.annexes} sous={CALC.annexesSous} liste={etatsAnn} slug={subject.slug} />}
            </div>
          ),
        }}
        droite={{ titre: M.reprendre, contenu: droite }}
      />
    </SousPage>
  );
}

type Etat = EtatType & { t: CalcTopicType };

/** Un registre : nom, référence, trois pastilles F · M · D, précision récente. */
function Registre({ id, titre, sous, liste, slug, or = false }: { id: string; titre: string; sous: string; liste: Etat[]; slug: string; or?: boolean }) {
  return (
    <section className="grid min-w-0 gap-2.5" aria-labelledby={id + "-t"}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
        <h3 id={id + "-t"} className="m-0 text-[17px] font-bold tracking-[-0.01em]">
          {titre}
        </h3>
        <span className="t-micro">{sous}</span>
      </div>
      <div className={"overflow-hidden rounded-[14px] border border-line px-1.5 py-1.5" + (or ? " " + s.or : "")}>
        <ul className="m-0 list-none divide-y divide-line p-0">
          {liste.map((x) => (
            <li key={x.t.key}>
              <Link href={`/calculs/${slug}/${x.t.key}`} className="rl-row flex min-h-[56px] items-center gap-3 rounded-[12px] px-3.5 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    {or && <span aria-hidden className={s.medaille} />}
                    <span className="block truncate text-[14.5px] font-semibold">{x.t.name}</span>
                  </span>
                  <span className="t-micro block truncate">{x.t.source ?? nbQuestions(x.t.questions)}</span>
                </span>
                <span className="flex shrink-0 gap-1" role="img" aria-label={`${x.tenus} ${x.tenus > 1 ? "niveaux tenus" : "niveau tenu"} sur ${CALC_LEVELS.length}`}>
                  {x.niveaux.map((e, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className={
                        "grid h-6 w-6 place-items-center rounded-full text-[10.5px] font-bold " +
                        (e === "tenu" ? "bg-white text-black" : e === "entame" ? "shadow-[inset_0_0_0_1.5px_var(--ink)]" : "text-muted shadow-[inset_0_0_0_1px_var(--line-2)]")
                      }
                    >
                      {NIVEAU[CALC_LEVELS[i]].court}
                    </span>
                  ))}
                </span>
                <span className="hidden w-[92px] shrink-0 items-center justify-end gap-2 sm:flex">
                  {x.pct !== null ? (
                    <>
                      <span className="t-micro tabular-nums">{x.pct} %</span>
                      <Mini pct={x.pct} rouge={x.pct < 60} />
                    </>
                  ) : (
                    <span className="t-micro">{CALC.aEntamer}</span>
                  )}
                </span>
                <ChevronRight size={15} aria-hidden className="shrink-0 text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
