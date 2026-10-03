import Link from "next/link";
import { ArrowRight, BookOpen, Target } from "lucide-react";
import { CardLabel } from "@/components/ui/Titles";
import { fmtAgo } from "@/components/classement/format";
import type { FicheErrorItem, FicheErrors } from "@/components/moi/types";

const SHOWN = 6;

function clip(text: string, n = 160) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

function ErrorRow({ it, now }: { it: FicheErrorItem; now?: number }) {
  return (
    <li>
      <Link href={it.href} className="rl-row -mx-2 flex flex-col gap-1 rounded-[12px] px-2 py-3">
        <span className="text-[14px] leading-snug">{clip(it.prompt)}</span>
        <span className="t-micro">
          {it.fiche}
          {it.page !== null ? ` · page ${it.page}` : ""} · ratée {it.wrong} fois{it.lastWrongAt ? ` · ${fmtAgo(it.lastWrongAt, now)}` : ""}
        </span>
      </Link>
    </li>
  );
}

// Onglet « Erreurs » : toutes les questions de fiches ratées et pas encore
// réussies deux fois d'affilée. Une seule carte : à gauche le compte et les
// fiches concernées, à droite les plus récentes (la suite repliée).
export function ErrorsTab({ errors, now }: { errors: FicheErrors; now?: number }) {
  if (!errors.available) {
    return (
      <div className="card-quiet flex flex-col gap-2 p-6 md:p-7">
        <p className="text-[15px] font-semibold">Tes erreurs sont gardées sur cet appareil</p>
        <p className="t-small">La sauvegarde des réponses sur ton compte n&apos;est pas encore activée : retrouve-les dans l&apos;onglet « Mes erreurs » de chaque fiche.</p>
        <Link href="/fiches" className="ink-link mt-2 w-fit">
          Ouvrir les fiches
        </Link>
      </div>
    );
  }

  if (errors.total === 0) {
    return (
      <div className="card-quiet flex flex-wrap items-center gap-5 p-6 md:p-7">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-surface">
          <Target size={20} aria-hidden />
        </span>
        <div className="min-w-0 flex-[1_1_240px]">
          <p className="text-[15px] font-semibold">{errors.answered > 0 ? "Rien à revoir, tout est rattrapé" : "Pas encore d'erreur enregistrée"}</p>
          <p className="t-small mt-0.5">
            {errors.answered > 0
              ? `${errors.answered} questions de fiches tentées, et chaque erreur réussie deux fois d'affilée depuis.`
              : "Les questions ratées dans les quiz des fiches s'afficheront ici."}
          </p>
        </div>
        <Link href="/fiches" className="btn btn-secondary rl-press">
          <BookOpen size={16} aria-hidden /> Réviser une fiche
        </Link>
      </div>
    );
  }

  const first = errors.items.slice(0, SHOWN);
  const rest = errors.items.slice(SHOWN);
  const hidden = errors.total - errors.items.length;

  return (
    <section className="card grid min-w-0 overflow-hidden lg:grid-cols-12" aria-label="Toutes mes erreurs">
      <div className="flex min-w-0 flex-col gap-4 p-6 md:p-7 lg:col-span-5 lg:border-r lg:border-line">
        <CardLabel icon={<Target size={15} aria-hidden />}>À revoir</CardLabel>
        <div className="flex items-baseline gap-2">
          <span className="t-num rl-count text-[56px]" style={{ "--rl-to": errors.total } as React.CSSProperties} aria-label={`${errors.total}`} />
          <span className="t-small font-semibold">question{errors.total > 1 ? "s" : ""}</span>
        </div>
        <p className="t-micro">Une question sort de la liste quand tu la réussis deux fois d&apos;affilée.</p>
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
                  Revoir <ArrowRight size={14} aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex min-w-0 flex-col gap-2 border-t border-line p-6 md:p-7 lg:col-span-7 lg:border-t-0">
        <CardLabel right={<span className="t-micro">les plus récentes</span>}>Questions ratées</CardLabel>
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
        {hidden > 0 && (
          <p className="t-micro mt-1">
            Et {hidden} autre{hidden > 1 ? "s" : ""} : ouvre une fiche, onglet « Mes erreurs », pour tout rejouer.
          </p>
        )}
      </div>
    </section>
  );
}
