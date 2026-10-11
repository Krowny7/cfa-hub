import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Jauge } from "@/components/classement/AutourDeToi";

// Briques de mise en page de l'espace Moi refait : le fil « ← Moi », le héros
// (sujet à gauche, courte liste classée à droite) et le bouton plein du
// héros. Partagées par le cabinet (Cabinet.tsx) et les pages de liste du
// carnet et des marquées (Registre.tsx). Sans état.

/** Le fil d'Ariane des pages de liste. */
export function FilMoi({ label = "Moi" }: { label?: string }) {
  return (
    <Link href="/moi" className="t-small inline-flex min-h-[40px] w-fit items-center gap-1.5 font-semibold hover:text-white">
      <ArrowLeft size={15} aria-hidden /> {label}
    </Link>
  );
}

export type LigneClassee = { cle: string; nom: string; pct: number; valeur: string; href?: string };

/** La courte liste classée du héros : rang (à l'encre rouge pour le premier), libellé, jauge au pinceau, valeur. */
export function ListeClassee({ titre, lignes }: { titre: string; lignes: LigneClassee[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 md:gap-2">
      <p className="t-eyebrow px-2">{titre}</p>
      <ol className="m-0 flex list-none flex-col divide-y divide-line p-0">
        {lignes.map((l, i) => {
          const corps = (
            <>
              <span aria-hidden className={"font-mono text-[13px] font-semibold tabular-nums " + (i === 0 ? "text-pen" : "")}>
                {i + 1}
              </span>
              <span className="min-w-0 text-[14px] font-semibold leading-snug [overflow-wrap:anywhere]">{l.nom}</span>
              <span className="flex items-center gap-2.5">
                <Jauge pct={l.pct} label={`${l.nom} : ${l.valeur}`} className="w-12" />
                <span className="t-micro min-w-[3ch] text-right font-mono tabular-nums">{l.valeur}</span>
              </span>
            </>
          );
          const cls = "rl-row grid min-h-[44px] w-full grid-cols-[16px_minmax(0,1fr)_auto] items-center gap-x-3 rounded-[12px] px-2 py-2.5 " + (i === 0 ? "bg-surface-2 text-white" : "text-muted hover:text-white");
          return (
            <li key={l.cle}>
              {l.href ? (
                <Link href={l.href} className={cls}>
                  {corps}
                </Link>
              ) : (
                <div className={cls}>{corps}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Le bouton plein du héros (un seul par écran). */
export function BoutonPlein({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
  return (
    <Link href={href} className="btn btn-primary rl-press w-fit max-md:min-h-[44px]">
      {icon} {label} <ArrowRight size={16} aria-hidden />
    </Link>
  );
}

/** La carte héros : à gauche le sujet (sur-titre, titre énorme, repère, phrase, une action pleine, un lien), à droite la liste classée. */
export function HerosMoi({
  kicker,
  titre,
  repere,
  phrase,
  detail,
  action,
  lien,
  liste,
  titreNiveau = 2,
  className = "",
}: {
  kicker: string;
  titre: React.ReactNode;
  repere: string;
  phrase: string;
  detail?: string;
  /** le bouton plein (BoutonPlein, ou un bouton client) */
  action?: React.ReactNode;
  lien?: { href: string; label: string };
  liste?: React.ReactNode;
  /** 1 sur les pages de liste (le titre est le titre de la page) */
  titreNiveau?: 1 | 2;
  className?: string;
}) {
  const Titre = titreNiveau === 1 ? "h1" : "h2";
  return (
    <section className={"card-hero rl-in grid min-h-[260px] min-w-0 gap-x-8 gap-y-5 p-6 md:p-8 " + (liste ? "md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] " : "") + className} aria-label={kicker}>
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="t-eyebrow">{kicker}</p>
          <Titre className="t-h1 m-0 [overflow-wrap:anywhere]">{titre}</Titre>
          <p className="t-micro m-0">{repere}</p>
        </div>
        <div className="grid gap-1.5">
          <p className="t-body m-0 max-w-[480px] text-muted">{phrase}</p>
          {detail && <p className="t-small m-0 max-w-[480px]">{detail}</p>}
        </div>
        {(action || lien) && (
          <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
            {action}
            {lien && (
              <a href={lien.href} className="ink-link inline-flex min-h-[44px] items-center gap-1 text-[13px] font-semibold md:min-h-0">
                {lien.label} <ArrowRight size={13} aria-hidden />
              </a>
            )}
          </div>
        )}
      </div>
      {liste}
    </section>
  );
}
