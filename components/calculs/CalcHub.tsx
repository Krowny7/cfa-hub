"use client";

import { Calculator } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { Glyphe } from "@/components/entrainement/Glyphes";
import { Illustration } from "@/components/ui/Illustration";
import { CarteLieu } from "@/components/ui/CarteLieu";
import { Sceau } from "@/components/ui/Tuiles";
import { SubjectGlyph } from "@/components/ui/SubjectGlyph";
import { Bande, EnTete, Heros, Page, Rangee, Section, Tuile, Vignette } from "@/components/outils/Gabarit";
import { topicSummary, type AllProgress } from "@/lib/calc/engine";
import { CALC_LEVELS } from "@/lib/calc/types";
import { ABAQUE } from "@/lib/voice-outils";
import { etatType, lignesNiveaux, nomCourt, phraseSuggestion } from "./outils";
import { roundHref, suggest, type SubjectLite } from "./suggest";
import { useCalcProgress, useLocalImport } from "./useCalc";
import { CALC, NIVEAU, ligneTypes, nbQuestions, niveauxTenus } from "./voice";

export type CalcHubSubject = SubjectLite & { short: string; open: boolean; questions: number };

/**
 * /calculs, « L'Abaque » : le lieu du calcul pur. Le héros garde le geste (le
 * calcul qui coince, « Le reprendre » ; à défaut le prochain calcul), la
 * carte du lieu sert d'entrée vers une matière, une vignette dit comment
 * se tient un niveau, la bande d'encre mène à l'entraînement ciblé. Les
 * matières pas encore ouvertes sont en bas, sur une ligne.
 *
 * Props : `subjects` (lib/calc/index → calcSubjectCards), `progress` (base,
 * null = repli local), `db` (migration appliquée), `owner` (id du compte,
 * clé du repli local).
 */
export function CalcHub({ subjects, progress: server, db, owner }: { subjects: CalcHubSubject[]; progress: AllProgress | null; db: boolean; owner: string }) {
  useLocalImport(db, owner);
  const { progress } = useCalcProgress(server, owner);
  const open = subjects.filter((s) => s.open);
  const soon = subjects.filter((s) => !s.open);
  const sug = suggest(open, progress);

  // chiffres par matière ouverte, et ses calculs les plus fragiles (entamés, pas encore tenus aux trois niveaux)
  const stats = open.map((s) => {
    const keys = s.types.map((t) => t.key);
    const sum = topicSummary(progress[s.topic], keys);
    const etats = s.types.map((t) => ({ t, ...etatType(progress[s.topic]?.[t.key]) }));
    const tenus = etats.reduce((n, x) => n + x.tenus, 0);
    const total = keys.length * CALC_LEVELS.length;
    const essentiels = s.types.filter((t) => t.tier === "essentiel").length;
    const fragiles = etats.filter((x) => x.pct !== null && x.tenus < CALC_LEVELS.length).sort((a, b) => (a.pct as number) - (b.pct as number));
    return { s, sum, tenus, total, essentiels, fragiles };
  });
  const tenusTout = stats.reduce((n, x) => n + x.tenus, 0);
  const totalTout = stats.reduce((n, x) => n + x.total, 0);
  // la matière du héros : celle qui porte le calcul le plus fragile
  const coince = stats.filter((x) => x.fragiles.length).sort((a, b) => (a.fragiles[0].pct as number) - (b.fragiles[0].pct as number))[0] ?? null;
  const entree = coince?.s ?? (sug ? open.find((s) => s.topic === sug.topic) : null) ?? open[0] ?? null;
  const autres = stats.filter((x) => x.s !== coince?.s && (coince || !sug || x.s.topic !== sug.topic));

  let heros: React.ReactNode;
  if (coince) {
    const f = coince.fragiles;
    const top = f[0];
    heros = (
      <Heros
        eyebrow={`${ABAQUE.coince} · ${coince.s.short}`}
        titre={nomCourt(top.t.name)}
        repere={`${niveauxTenus(coince.tenus, coince.total)} en ${coince.s.short}`}
        phrase={ABAQUE.justes(top.pct as number)}
        action={{ href: `/calculs/${coince.s.slug}/${top.t.key}`, label: ABAQUE.reprendre }}
        lien={{ href: `/calculs/${coince.s.slug}`, label: ABAQUE.ouvrir(coince.s.short) }}
        listeTitre={f.length > 1 ? ABAQUE.fragiles(Math.min(3, f.length)) : undefined}
        liste={f.slice(0, 3).map((x) => ({
          label: nomCourt(x.t.name),
          meta: `${x.pct} % de justes · ${x.t.tier === "essentiel" ? "essentiel" : "annexe"}`,
          pct: x.pct,
          href: `/calculs/${coince.s.slug}/${x.t.key}`,
          rouge: (x.pct ?? 0) < 60,
        }))}
      />
    );
  } else if (sug) {
    const p = progress[sug.topic]?.[sug.typeKey];
    heros = (
      <Heros
        eyebrow={sug.reprise ? CALC.reprendre : CALC.prochain}
        titre={nomCourt(sug.typeName)}
        repere={`${sug.subject} · ${NIVEAU[sug.level].label}`}
        phrase={phraseSuggestion(sug, p)}
        detail={`${NIVEAU[sug.level].label} : ${NIVEAU[sug.level].desc.toLowerCase()}`}
        action={{ href: roundHref(sug.slug, sug.typeKey, sug.level), label: CALC.lancer }}
        lien={{ href: `/calculs/${sug.slug}`, label: ABAQUE.ouvrir(open.find((s) => s.topic === sug.topic)?.short ?? sug.subject) }}
        listeTitre="Ses trois niveaux"
        liste={lignesNiveaux(sug.slug, sug.typeKey, p)}
      />
    );
  } else {
    heros = (
      <section className="card-hero rl-in flex min-h-[200px] flex-col justify-center gap-3 p-6 md:p-8">
        <p className="t-eyebrow">{CALC.prochain}</p>
        <h2 className="t-h1 m-0">{open.length ? CALC.toutTenu : "Les premiers calculs arrivent : Equity, puis Portfolio Management."}</h2>
      </section>
    );
  }

  return (
    <Page
      entete={<EnTete icone={<Glyphe nom="calculs" size={16} />} titre={CALC.hubTitre} ligne={CALC.hubLigne} />}
      lead={
        <div className="flex flex-col gap-4 md:gap-[18px]">
          <Rangee
            cotePremier
            heros={heros}
            tuiles={
              <>
                {autres.map((x) => (
                  <Tuile
                    key={x.s.topic}
                    icone={<SubjectGlyph subject={x.s.topic} size={20} />}
                    titre={x.s.name}
                    ligne={`${ligneTypes(x.s.types.length, x.essentiels)} · ${x.sum.precision !== null || x.tenus > 0 ? niveauxTenus(x.tenus, x.total) : nbQuestions(x.s.questions)}`}
                    action={{ href: `/calculs/${x.s.slug}`, label: "Ouvrir la matière" }}
                  />
                ))}
                {entree && (
                  <Vignette
                    nom="calculs-poulies"
                    titre={ABAQUE.niveauTitre}
                    ligne={ABAQUE.niveauLigne}
                    action={{ href: `/calculs/${entree.slug}`, label: ABAQUE.niveauLien(entree.short) }}
                  />
                )}
              </>
            }
            cote={
              <CarteLieu
                label={ABAQUE.nom}
                ratio="16 / 10"
                visuel={<Illustration nom="calculs-abaque" position="50% 55%" />}
                vignette={<Illustration nom="calculs-abaque" position="50% 55%" decorative />}
                marque={
                  <Sceau>
                    <Calculator size={20} aria-hidden />
                  </Sceau>
                }
                nom={ABAQUE.nom}
                sousTitre={ABAQUE.sous}
                etat={ABAQUE.etat(open.length, tenusTout, totalTout)}
                secondaire
                action={{ href: entree ? `/calculs/${entree.slug}` : "/entrainement", label: ABAQUE.action }}
              />
            }
          />
          <Bande
            icone={<Icone nom="entrainer" size={22} />}
            titre={ABAQUE.suiteTitre}
            ligne={ABAQUE.suiteLigne}
            action={{ href: "/practice", label: ABAQUE.suiteAction }}
            medaillon="calculs-volant"
          />
        </div>
      }
    >
      {soon.length > 0 && (
        <Section id="calc-bientot" titre={CALC.bientot} meta={ABAQUE.bientotMeta(soon.length)}>
          <div className="card-quiet p-5 md:p-6">
            <ul className="m-0 grid list-none grid-cols-1 gap-x-6 gap-y-3 p-0 min-[420px]:grid-cols-2 md:grid-cols-4">
              {soon.map((s) => (
                <li key={s.topic} className="flex min-w-0 items-center gap-2.5 text-[14px] text-muted">
                  <SubjectGlyph subject={s.topic} size={18} className="opacity-55" />
                  <span className="truncate">{s.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}
    </Page>
  );
}
