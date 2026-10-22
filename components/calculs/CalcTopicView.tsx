"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { SubjectGlyph } from "@/components/ui/SubjectGlyph";
import { Bande, CarteCarnet, EnTete, Heros, Mini, Page, Rangee, Section } from "@/components/outils/Gabarit";
import { topicSummary, type AllProgress } from "@/lib/calc/engine";
import { CALC_LEVELS, type CalcTopic } from "@/lib/calc/types";
import { nombre } from "@/lib/voice";
import { MATIERE } from "@/lib/voice-outils";
import { etatType, lignesNiveaux, nomCourt, phraseSuggestion, type EtatType } from "./outils";
import { roundHref, suggest } from "./suggest";
import { useCalcProgress, useLocalImport } from "./useCalc";
import { CALC, NIVEAU, nbQuestions } from "./voice";
import s from "./or.module.css";

export type CalcTopicType = { key: string; name: string; tier: "essentiel" | "annexe"; top?: boolean; source: string | null; questions: number };

/**
 * /calculs/[matiere] : le gabarit de L'Abaque décliné à une matière. Le héros
 * présente le prochain calcul et ses trois niveaux, le carnet « en bref »
 * est replié, puis les registres Essentiels et Annexes (dans l'ordre du
 * programme : nom, référence, niveaux tenus F · M · D, précision récente),
 * et la bande d'encre vers les questions d'examen de la matière.
 *
 * Props : `subject` ({topic, slug, name, short}), `types`, `progress` (base,
 * null = repli local), `db`, `owner`.
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
  const court = subject.short ?? subject.name;
  const sug = suggest([{ ...subject, types }], progress);
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
  const sum = topicSummary(
    mine,
    types.map((t) => t.key),
  );
  const typeProg = sug ? mine?.[sug.typeKey] : undefined;
  const premier = etatsTop.length ? "#reg-top" : essentiels.length ? "#reg-essentiels" : "#reg-annexes";

  return (
    <Page
      entete={
        <EnTete
          retour={{ href: "/calculs", label: CALC.hubTitre }}
          titre={
            <span className="flex items-center gap-3.5">
              <SubjectGlyph subject={subject.topic} size={40} />
              <span className="min-w-0">{subject.name}</span>
            </span>
          }
          ligne={`${nombre(essentiels.length)} ${essentiels.length > 1 ? "essentiels" : "essentiel"} · ${nombre(annexes.length)} ${annexes.length > 1 ? "annexes" : "annexe"} · ${nbQuestions(totalQ)}`}
        />
      }
      lead={
        <Rangee
          heros={
            sug ? (
              <Heros
                eyebrow={sug.reprise ? CALC.reprendre : CALC.prochain}
                titre={nomCourt(sug.typeName)}
                repere={types.find((t) => t.key === sug.typeKey)?.source ?? subject.name}
                phrase={phraseSuggestion(sug, typeProg)}
                detail={`${NIVEAU[sug.level].label} : ${NIVEAU[sug.level].desc.toLowerCase()}`}
                action={{ href: roundHref(subject.slug, sug.typeKey, sug.level), label: `Niveau ${NIVEAU[sug.level].label.toLowerCase()} · 5 questions` }}
                lien={{ href: premier, label: MATIERE.lienChoisir }}
                listeTitre={MATIERE.niveauxTitre}
                liste={lignesNiveaux(subject.slug, sug.typeKey, typeProg)}
              />
            ) : (
              <section className="card-hero rl-in flex min-h-[200px] flex-col justify-center gap-3 p-6 md:p-8">
                <p className="t-eyebrow">{CALC.prochain}</p>
                <h2 className="t-h1 m-0">{CALC.toutTenu}</h2>
              </section>
            )
          }
          cote={
            <CarteCarnet
              eyebrow={MATIERE.resume(court)}
              pct={total ? Math.round((tenus / total) * 100) : 0}
              pctLabel="tenus"
              chiffre={String(tenus)}
              unite={tenus > 1 ? "niveaux tenus" : "niveau tenu"}
              ligne={`sur ${total}${sum.precision !== null ? ` · ${Math.round(sum.precision)} % de justes récemment` : ""}`}
              details={[
                ...(etatsTop.length ? [{ label: CALC.top, value: `${etatsTop.reduce((n, x) => n + x.tenus, 0)}/${etatsTop.length * niv} niveaux` }] : []),
                { label: CALC.essentiels, value: `${etatsEss.reduce((n, x) => n + x.tenus, 0)}/${etatsEss.length * niv} niveaux` },
                { label: CALC.annexes, value: `${etatsAnn.reduce((n, x) => n + x.tenus, 0)}/${etatsAnn.length * niv} niveaux` },
                { label: MATIERE.jamais, value: String(etats.filter((x) => x.pct === null).length) },
              ]}
            />
          }
        />
      }
    >
      {etatsTop.length > 0 && <Registre id="reg-top" titre={CALC.top} sous={CALC.topSous} liste={etatsTop} slug={subject.slug} or />}
      {etatsEss.length > 0 && <Registre id="reg-essentiels" titre={CALC.essentiels} sous={CALC.essentielsSous} liste={etatsEss} slug={subject.slug} />}
      {etatsAnn.length > 0 && <Registre id="reg-annexes" titre={CALC.annexes} sous={CALC.annexesSous} liste={etatsAnn} slug={subject.slug} />}
      <div className="mt-8">
        <Bande
          icone={<Icone nom="entrainer" size={22} />}
          titre={MATIERE.suiteTitre(court)}
          ligne={MATIERE.suiteLigne}
          action={{ href: `/practice?topic=${subject.topic}`, label: MATIERE.suiteAction }}
          medaillon="calculs-volant"
        />
      </div>
    </Page>
  );
}

type Etat = EtatType & { t: CalcTopicType };

/** Un registre : nom, référence, trois pastilles F · M · D, précision récente. */
function Registre({ id, titre, sous, liste, slug, or = false }: { id: string; titre: string; sous: string; liste: Etat[]; slug: string; or?: boolean }) {
  return (
    <Section id={id} titre={titre} meta={sous}>
      <div className={"card overflow-hidden px-1.5 py-1.5" + (or ? " " + s.or : "")}>
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
    </Section>
  );
}
