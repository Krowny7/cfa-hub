import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { CardLabel } from "@/components/ui/Titles";
import { Icone } from "@/components/adn/icons";
import { CompteurBarre, Rature } from "@/components/adn/Rature";
import { fmtAgo } from "@/components/classement/format";
import { RATURE, nombre } from "@/lib/voice";
import { MOI, reprisesSemaine } from "@/lib/voice-z1";
import type { FicheErrorItem, FicheErrors } from "@/components/moi/types";

const SHOWN = 6;

function clip(text: string, n = 160) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

const where = (it: FicheErrorItem) => `${it.fiche}${it.page !== null ? ` · page ${it.page}` : ""}`;

/** Une rature à reprendre : l'énoncé, la fiche, combien de fois manquée. */
function ErrorRow({ it, now }: { it: FicheErrorItem; now?: number }) {
  return (
    <li>
      <Link href={it.href} className="rl-row -mx-2 flex flex-col gap-1 rounded-[12px] px-2 py-3">
        <span className="text-[14px] leading-snug">{clip(it.prompt)}</span>
        <span className="t-micro">
          {where(it)} · {MOI.ratee(it.wrong)}
          {it.lastWrongAt ? ` · ${fmtAgo(it.lastWrongAt, now)}` : ""}
        </span>
      </Link>
    </li>
  );
}

/** Une question rayée : la ligne garde son trait de pinceau (on raye, on n'efface pas). */
function RayeeRow({ it, i, now }: { it: FicheErrorItem; i: number; now?: number }) {
  return (
    <li>
      <Link href={it.href} className="rl-row -mx-2 flex flex-col gap-1 rounded-[12px] px-2 py-3">
        <Rature rayee trait={i % 2 ? "b" : "a"} className="text-[14px] leading-snug">
          {clip(it.prompt, 120)}
        </Rature>
        <span className="t-micro">
          {MOI.rayee}
          {it.clearedAt ? ` ${fmtAgo(it.clearedAt, now)}` : ""} · {where(it)}
        </span>
      </Link>
    </li>
  );
}

// Onglet « Erreurs » : le carnet de ratures des quiz de fiches. Une seule
// carte : à gauche le compte (barré quand des ratures ont été reprises cette
// semaine) et les fiches concernées ; à droite les ratures à reprendre, puis
// les dernières rayées, qui gardent leur trait.
export function ErrorsTab({ errors, now }: { errors: FicheErrors; now?: number }) {
  if (!errors.available) {
    return (
      <div className="card-quiet flex flex-col gap-2 p-6 md:p-7">
        <p className="text-[15px] font-semibold">{MOI.appareil}</p>
        <p className="t-small">{MOI.appareilTexte}</p>
        <Link href="/fiches" className="ink-link mt-2 w-fit">
          Ouvrir les fiches
        </Link>
      </div>
    );
  }

  const { total, reprises, rayees } = errors;

  if (total === 0 && rayees.length === 0) {
    return (
      <div className="card-quiet flex flex-wrap items-center gap-5 p-6 md:p-7">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-surface">
          <Icone nom="erreurs" size={22} />
        </span>
        <div className="min-w-0 flex-[1_1_240px]">
          <p className="text-[15px] font-semibold">{errors.answered > 0 ? MOI.pagePropre : MOI.rienEncore}</p>
          <p className="t-small mt-0.5">{errors.answered > 0 ? MOI.pagePropreTexte(errors.answered) : MOI.rienEncoreTexte}</p>
        </div>
        <Link href="/fiches" className="btn btn-secondary rl-press">
          <BookOpen size={16} aria-hidden /> Réviser une fiche
        </Link>
      </div>
    );
  }

  const first = errors.items.slice(0, SHOWN);
  const rest = errors.items.slice(SHOWN);
  const hidden = total - errors.items.length;
  const repris = [reprises.semaine > 0 ? reprisesSemaine(reprises.semaine) : null, reprises.total > 0 ? RATURE.depuisToujours(reprises.total) : null].filter(Boolean).join(" · ");

  return (
    <section className="card grid min-w-0 overflow-hidden lg:grid-cols-12" aria-label="Mes ratures">
      <div className="flex min-w-0 flex-col gap-4 p-6 md:p-7 lg:col-span-5 lg:border-r lg:border-line">
        <CardLabel icon={<Icone nom="erreurs" size={15} className="text-pen" />}>{MOI.ratures}</CardLabel>
        {total === 0 ? (
          <p className="t-h1 m-0">{MOI.pagePropre}</p>
        ) : reprises.semaine > 0 ? (
          // le compte du carnet, l'ancien barré : ce que la semaine a repris
          <CompteurBarre avant={total + reprises.semaine} apres={total} libelle={MOI.aReprendre} taille={56} />
        ) : (
          <p className="m-0 flex items-baseline gap-2" aria-label={`${total} ${MOI.aReprendre}`}>
            <span className="t-num text-[56px]">{nombre(total)}</span>
            <span className="t-small font-semibold">{MOI.aReprendre}</span>
          </p>
        )}
        {repris && <p className="t-small m-0 font-medium">{repris}</p>}
        <p className="t-micro m-0">{MOI.regle}</p>
        {errors.groups.length > 0 && (
          <ul className="m-0 flex list-none flex-col p-0">
            {errors.groups.map((g) => (
              <li key={g.fiche}>
                <Link href={g.href} className="rl-row -mx-2 flex items-center gap-3 rounded-[12px] px-2 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{g.fiche}</span>
                    {g.pages.length > 0 && (
                      <span className="t-micro block">
                        page{g.pages.length > 1 ? "s" : ""} {g.pages.join(", ")}
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[13px] font-semibold tabular-nums">{g.count}</span>
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold">
                    Reprendre <ArrowRight size={14} aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2 border-t border-line p-6 md:p-7 lg:col-span-7 lg:border-t-0">
        {first.length > 0 && (
          <>
            <CardLabel right={<span className="t-micro">{MOI.recentes}</span>}>{MOI.liste}</CardLabel>
            <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
              {first.map((it) => (
                <ErrorRow key={it.questionId} it={it} now={now} />
              ))}
            </ul>
            {rest.length > 0 && (
              <details className="group">
                <summary className="t-small inline-flex cursor-pointer list-none items-center gap-1.5 py-1 font-semibold [&::-webkit-details-marker]:hidden">
                  <ArrowRight size={14} aria-hidden className="transition-transform group-open:rotate-90" />
                  <span className="group-open:hidden">Voir les {rest.length} suivantes</span>
                  <span className="hidden group-open:inline">Replier</span>
                </summary>
                <ul className="m-0 mt-1 flex list-none flex-col divide-y divide-line p-0">
                  {rest.map((it) => (
                    <ErrorRow key={it.questionId} it={it} now={now} />
                  ))}
                </ul>
              </details>
            )}
            {hidden > 0 && <p className="t-micro mt-1">{MOI.autres(hidden)}</p>}
          </>
        )}

        {rayees.length > 0 && (
          <div className={first.length > 0 ? "mt-5 border-t border-line pt-5" : ""}>
            <CardLabel right={<span className="t-micro">{MOI.recentes}</span>}>{MOI.rayeesTitre}</CardLabel>
            <ul className="m-0 mt-2 flex list-none flex-col divide-y divide-line p-0">
              {rayees.map((it, i) => (
                <RayeeRow key={it.questionId} it={it} i={i} now={now} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
