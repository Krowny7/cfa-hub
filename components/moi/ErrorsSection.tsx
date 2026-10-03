import Link from "next/link";
import { ArrowRight, BookOpen, Target } from "lucide-react";
import { CardLabel, SectionTitle } from "@/components/ui/Titles";
import { fmtAgo } from "@/components/classement/format";
import type { FicheErrors } from "@/components/moi/types";

const SHOWN = 8;

function clip(text: string, n = 170) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

// « Toutes mes erreurs » : les questions de fiches ratées et pas encore
// réussies deux fois d'affilée, regroupées par fiche, avec un lien pour les
// revoir (onglet « Mes erreurs » de chaque fiche).
export function ErrorsSection({ errors }: { errors: FicheErrors }) {
  return (
    <section className="flex flex-col gap-5" aria-label="Toutes mes erreurs">
      <SectionTitle
        title="Toutes mes erreurs"
        sub="les questions de fiches à revoir"
        action={
          <Link href="/fiches" className="ink-link">
            Toutes les fiches
          </Link>
        }
      />

      {!errors.available ? (
        <div className="card flex flex-col gap-2 p-[22px]">
          <p className="font-semibold">Tes erreurs sont gardées sur cet appareil</p>
          <p className="text-[13.5px] text-muted">
            La sauvegarde des réponses sur ton compte n&apos;est pas encore activée : retrouve tes erreurs dans l&apos;onglet « Mes erreurs » de chaque fiche.
          </p>
          <Link href="/fiches" className="ink-link mt-1 w-fit">
            Ouvrir les fiches
          </Link>
        </div>
      ) : errors.total === 0 ? (
        <div className="card flex flex-wrap items-center gap-5 p-[22px]">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-surface-2">
            <Target size={20} aria-hidden />
          </span>
          <div className="min-w-0 flex-[1_1_240px]">
            <p className="font-semibold">{errors.answered > 0 ? "Rien à revoir, tout est rattrapé" : "Pas encore d'erreur enregistrée"}</p>
            <p className="mt-0.5 text-[13.5px] text-muted">
              {errors.answered > 0
                ? `Tu as tenté ${errors.answered} questions de fiches, et chaque erreur a été réussie deux fois d'affilée depuis.`
                : "Les questions ratées dans les quiz des fiches s'afficheront ici, jusqu'à ce que tu les réussisses deux fois d'affilée."}
            </p>
          </div>
          <Link href="/fiches" className="btn btn-secondary rl-press">
            <BookOpen size={16} aria-hidden /> Réviser une fiche
          </Link>
        </div>
      ) : (
        <div className="grid gap-[18px] lg:grid-cols-12">
          <div className="card rl-rv flex min-w-0 flex-col gap-4 p-[22px] lg:col-span-5">
            <CardLabel icon={<Target size={15} aria-hidden />}>À revoir</CardLabel>
            <div className="flex items-baseline gap-2">
              <span className="rl-count font-brand text-[56px] leading-none" style={{ "--rl-to": errors.total } as React.CSSProperties} aria-label={`${errors.total}`} />
              <span className="text-[15px] font-semibold text-muted">question{errors.total > 1 ? "s" : ""}</span>
            </div>
            <p className="text-[13px] text-muted">Une question sort de la liste quand tu la réussis deux fois d&apos;affilée.</p>
            <ul className="flex flex-col gap-1">
              {errors.groups.map((g) => (
                <li key={g.fiche}>
                  <Link href={g.href} className="rl-row flex items-center gap-3 rounded-[12px] px-2 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold">{g.fiche}</span>
                      {g.pages.length > 0 && <span className="block text-[12px] text-muted">page{g.pages.length > 1 ? "s" : ""} {g.pages.join(", ")}</span>}
                    </span>
                    <span className="rounded-[8px] bg-white px-2 py-[2px] font-mono text-[12px] font-semibold text-black">{g.count}</span>
                    <span className="inline-flex items-center gap-1 text-[13px] font-semibold">
                      Revoir <ArrowRight size={14} aria-hidden />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="card rl-rv flex min-w-0 flex-col gap-3 p-[22px] lg:col-span-7">
            <CardLabel right={<span className="text-[12.5px]">les plus récentes</span>}>Questions ratées</CardLabel>
            <ul className="flex flex-col divide-y divide-line">
              {errors.items.slice(0, SHOWN).map((it) => (
                <li key={it.questionId}>
                  <Link href={it.href} className="rl-row -mx-2 flex flex-col gap-1 rounded-[12px] px-2 py-2.5">
                    <span className="text-[14px] leading-snug">{clip(it.prompt)}</span>
                    <span className="text-[12px] text-muted">
                      {it.fiche}
                      {it.page !== null ? ` · page ${it.page}` : ""} · ratée {it.wrong} fois{it.lastWrongAt ? ` · ${fmtAgo(it.lastWrongAt)}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {errors.total > SHOWN && (
              <p className="text-[12.5px] text-muted">
                Et {errors.total - SHOWN} autre{errors.total - SHOWN > 1 ? "s" : ""} : ouvre une fiche, onglet « Mes erreurs », pour les rejouer.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
