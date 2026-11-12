import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Gabarit des pages-outils de S'entraîner. Depuis le modèle des sous-pages (2026-11-12 :
// components/ui/SousPage, CadreZones), il n'en reste que la page et son en-tête court (la
// session ciblée des calculs, components/calculs/CalcSessionView) et la mini-jauge des
// listes. Sans état ni hook : utilisable côté serveur comme côté client.

export type Action = { href: string; label: string };

/** La page : l'en-tête et le point focal en haut, puis les sections. */
export function Page({ entete, lead, children }: { entete: React.ReactNode; lead: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="rl-wide rl-page">
      <div className="flex flex-col gap-7 md:gap-10">
        {entete}
        {lead}
      </div>
      {children}
    </div>
  );
}

/** L'en-tête : le retour, le grand titre, une ligne. `retour` : lien de retour (par défaut S'entraîner). */
export function EnTete({
  icone,
  titre,
  ligne,
  droite,
  retour = { href: "/entrainement", label: "S'entraîner · CFA Niveau I" },
}: {
  icone?: React.ReactNode;
  titre: React.ReactNode;
  ligne?: React.ReactNode;
  droite?: React.ReactNode;
  retour?: Action;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="flex min-w-0 flex-col gap-3">
        <Link href={retour.href} className="t-small inline-flex w-fit items-center gap-2 font-semibold transition-colors hover:text-white">
          <ArrowLeft size={14} aria-hidden />
          {icone}
          <span>{retour.label}</span>
        </Link>
        <h1 className="t-hero rl-in m-0">{titre}</h1>
        {ligne && <p className="t-body m-0 max-w-[560px] text-muted">{ligne}</p>}
      </div>
      {droite}
    </header>
  );
}

/** Une mini-jauge d'encre (au stylo rouge si `rouge`). */
export function Mini({ pct, rouge = false }: { pct: number; rouge?: boolean }) {
  return (
    <span className={"ink-bar w-14 shrink-0" + (rouge ? " is-pen" : "")} aria-hidden>
      <span style={{ width: `${Math.max(4, Math.min(100, pct))}%` }} />
    </span>
  );
}
