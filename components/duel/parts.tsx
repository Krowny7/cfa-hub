import { ChartNoAxesColumn, Clock, FileText, Swords } from "lucide-react";
import { RankBadge } from "@/components/ui/RankBadge";
import { Enso } from "@/components/ui/InkRings";
import { InkRing } from "@/components/ink/InkRing";
import { rankFor } from "@/lib/ranks";
import { CURRENT_DOMAIN, CURRENT_PROGRAM } from "@/lib/domains";
import { DUEL_MINUTES, DUEL_QUESTIONS } from "@/lib/duels";

// Pièces partagées des pages duel. Sans état : utilisables depuis un
// composant serveur comme depuis un composant client.

/** Badge de rang d'un joueur d'après son ELO (maîtrise connue seulement pour soi). */
export function PlayerBadge({
  elo,
  mastery = null,
  size = 40,
  gray = false,
  onDark = false,
}: {
  elo: number;
  mastery?: number | null;
  size?: number;
  gray?: boolean;
  onDark?: boolean;
}) {
  const r = rankFor(elo, mastery);
  return <RankBadge tier={r.tierIndex} size={size} gray={gray} onDark={onDark} glow={false} />;
}

/** Petite pastille d'information (programme, format, durée). */
export function Pill({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex h-[30px] items-center gap-1.5 rounded-[10px] border border-line bg-surface px-[11px] text-[13px] font-semibold">
      {icon}
      {children}
    </span>
  );
}

/** En-tête du lobby : « Duel », grand titre, pastilles du format. */
export function DuelHeading({ title = "Qui affrontes-tu ?" }: { title?: string }) {
  return (
    <header className="relative flex flex-wrap items-end justify-between gap-4">
      <div aria-hidden className="pointer-events-none absolute -left-20 -top-28 hidden sm:block">
        <Enso size={300} />
      </div>
      <div className="relative grid gap-2.5">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-muted">
          <Swords size={16} aria-hidden /> Duel
        </span>
        <h1 className="rl-in m-0 font-sans text-[clamp(36px,5.4vw,60px)] font-extrabold leading-none tracking-[-0.035em] [text-wrap:balance]">
          {title}
        </h1>
      </div>
      <div className="relative flex flex-wrap gap-2">
        <Pill icon={<ChartNoAxesColumn size={14} aria-hidden />}>
          {CURRENT_DOMAIN.name} · {CURRENT_PROGRAM.name}
        </Pill>
        <Pill icon={<FileText size={14} aria-hidden />}>{DUEL_QUESTIONS} questions · format examen</Pill>
        <Pill icon={<Clock size={14} aria-hidden />}>{DUEL_MINUTES} min</Pill>
      </div>
    </header>
  );
}

/** Case d'enjeu sur carte sombre : « Si tu gagnes » / « +12 à +18 ». */
export function StakeBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[12px] bg-[rgba(255,255,255,.07)] p-3">
      <div className="text-[12px] text-[rgba(255,255,255,.6)]">{label}</div>
      <div className="mt-1 font-mono text-[13px] font-semibold tabular-nums sm:text-[15px]">{value}</div>
    </div>
  );
}

/** Case d'enjeu sur fond clair. */
export function StakeTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[12px] bg-surface-2 p-3">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-1 font-mono text-[13px] font-semibold tabular-nums sm:text-[15px]">{value}</div>
    </div>
  );
}

/** Un joueur face à l'autre : badge, nom, ELO ; `align="right"` le met en miroir. */
export function DuelSide({
  name,
  elo,
  mastery = null,
  align = "left",
  badgeSize = 52,
  gray = false,
  extra,
  big,
  hideNameOnMobile = false,
}: {
  name: string;
  elo: number | null;
  mastery?: number | null;
  align?: "left" | "right";
  badgeSize?: number;
  gray?: boolean;
  /** ligne sous l'ELO (avancement, temps…) */
  extra?: React.ReactNode;
  /** grand chiffre à côté (score final) */
  big?: React.ReactNode;
  /** nom et ELO masqués sous 640 px (place réservée au grand chiffre) */
  hideNameOnMobile?: boolean;
}) {
  return (
    <div className={"flex min-w-0 items-center gap-2.5 md:gap-3.5 " + (align === "right" ? "flex-row-reverse text-right" : "")}>
      <PlayerBadge elo={elo ?? 1200} mastery={mastery} size={badgeSize} gray={gray || elo === null} />
      <div className={"min-w-0 " + (hideNameOnMobile ? "hidden sm:block" : "")}>
        <div className="truncate text-[15px] font-extrabold md:text-[18px]">{name}</div>
        <div className="font-mono text-[12px] tabular-nums text-muted md:text-[12.5px]">{elo === null ? "ELO ?" : `${elo} ELO`}</div>
        {extra && <div className="font-mono text-[12px] tabular-nums text-muted">{extra}</div>}
      </div>
      {big}
    </div>
  );
}

/** Filigrane d'anneau des cartes sombres. */
export function InkWatermark({ size = 300, className = "-bottom-16 -right-10" }: { size?: number; className?: string }) {
  return <InkRing size={size} className={"rl-deco pointer-events-none absolute text-[#fff] opacity-[0.08] " + className} />;
}

/** « Comment l'ELO bouge » : les règles en trois phrases. */
export function DuelHowItWorks() {
  return (
    <section className="card rl-rv flex min-w-0 flex-col gap-4 p-[22px]">
      <div className="flex items-center gap-2.5">
        <InkRing size={22} />
        <h2 className="m-0 text-[20px] font-bold leading-tight tracking-[-0.02em]">Comment l&apos;ELO bouge</h2>
      </div>
      <div className="grid gap-4 text-[14px] leading-[1.55] text-muted sm:grid-cols-2 lg:grid-cols-3">
        <p className="m-0">
          <b className="text-white">Même épreuve pour les deux.</b> {DUEL_QUESTIONS} questions tirées au hasard dans les vraies
          questions d&apos;examen du programme, dans le même ordre. {DUEL_MINUTES} min chacun, à jouer quand tu veux sous 48 h.
        </p>
        <p className="m-0">
          <b className="text-white">Meilleur score gagne.</b> Égalité de bonnes réponses : le plus rapide l&apos;emporte ; à la
          seconde près, c&apos;est un nul. Pas joué à temps : forfait.
        </p>
        <p className="m-0">
          <b className="text-white">Comme aux échecs.</b> Battre plus fort que soi rapporte plus ; perdre contre plus faible coûte
          plus. Les examens blancs classés comptent aussi.
        </p>
      </div>
    </section>
  );
}

/** Étiquette d'un bloc dans la page d'aperçu. */
export function DuelPreviewFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line pt-6">
      <p className="kicker m-0">{label}</p>
      {children}
    </section>
  );
}
