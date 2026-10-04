import Link from "next/link";
import { Icone } from "@/components/adn/icons";
import { RankBadge } from "@/components/ui/RankBadge";
import { PageHero } from "@/components/ui/Titles";
import { InkRing } from "@/components/ink/InkRing";
import { Disclosure } from "@/components/classement/Disclosure";
import { rankFor } from "@/lib/ranks";
import { CURRENT_DOMAIN, CURRENT_PROGRAM } from "@/lib/domains";
import { DUEL_MINUTES, DUEL_QUESTIONS, DUEL_WINDOW_HOURS } from "@/lib/duels";
import { NBSP } from "@/lib/voice";
import { motIssue, raturesPartie } from "@/lib/voice-z2";

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

/** En-tête du lobby : petite ligne (domaine), grand titre, format en une ligne. */
export function DuelHeading({ title = `Qui affrontes-tu${NBSP}?` }: { title?: string }) {
  return (
    <PageHero
      kicker={
        <span className="inline-flex items-center gap-1.5">
          <Icone nom="duel" size={15} /> Duel · {CURRENT_DOMAIN.name} · {CURRENT_PROGRAM.name}
        </span>
      }
      title={title}
    >
      <p className="t-small">
        {DUEL_QUESTIONS} questions type examen · {DUEL_MINUTES} min · à jouer sous {DUEL_WINDOW_HOURS} h
      </p>
    </PageHero>
  );
}

/** Case d'enjeu sur carte sombre : « Si tu gagnes » / « +12 à +18 ». */
export function StakeBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[12px] bg-[rgba(255,255,255,.07)] px-3 py-2.5">
      <div className="text-[12px] text-[rgba(255,255,255,.58)]">{label}</div>
      <div className="mt-0.5 font-mono text-[13px] font-semibold tabular-nums sm:text-[15px]">{value}</div>
    </div>
  );
}

/** Case d'enjeu sur fond clair. */
export function StakeTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[12px] bg-surface-2 px-3 py-2.5">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-0.5 font-mono text-[13px] font-semibold tabular-nums sm:text-[15px]">{value}</div>
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
        <div className="truncate text-[15px] font-bold md:text-[17px]">{name}</div>
        <div className="truncate font-mono text-[12px] tabular-nums text-muted">
          {elo === null ? "ELO ?" : `${elo} ELO`}
          {extra ? <> · {extra}</> : null}
        </div>
      </div>
      {big}
    </div>
  );
}

/** Filigrane d'anneau des cartes sombres. */
export function InkWatermark({ size = 300, className = "-bottom-16 -right-10" }: { size?: number; className?: string }) {
  return <InkRing size={size} className={"rl-deco pointer-events-none absolute text-[#fff] opacity-[0.08] " + className} />;
}

/** « Comment l'ELO bouge » : les règles en trois phrases, repliées par défaut. */
export function DuelHowItWorks() {
  return (
    <div>
      <Disclosure title="Comment l'ELO bouge" hint="même épreuve, meilleur score, comme aux échecs">
        <div className="grid gap-5 text-[14px] leading-[1.55] text-muted sm:grid-cols-3">
          <p className="m-0">
            <b className="text-white">Même épreuve pour les deux.</b> {DUEL_QUESTIONS} vraies questions d&apos;examen, tirées au hasard, dans
            le même ordre. {DUEL_MINUTES} min chacun, quand tu veux sous {DUEL_WINDOW_HOURS} h.
          </p>
          <p className="m-0">
            <b className="text-white">Meilleur score gagne.</b> À égalité, le plus rapide l&apos;emporte ; à la seconde près, c&apos;est une nulle.
            Pas de copie à temps : forfait.
          </p>
          <p className="m-0">
            <b className="text-white">Comme aux échecs.</b> Battre plus fort que soi rapporte plus ; perdre contre plus faible coûte plus. Les
            examens blancs classés comptent aussi.
          </p>
        </div>
      </Disclosure>
    </div>
  );
}

/** V / D / = dans une petite case (encre pleine pour une victoire). */
export function ResultMark({ won }: { won: boolean | null }) {
  const label = motIssue(won);
  return (
    <span
      aria-label={label}
      title={label}
      className={
        "grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[8px] text-[12px] font-extrabold " +
        (won === true ? "bg-white text-black" : "border border-line-2 text-muted")
      }
    >
      {won === true ? "V" : won === false ? "D" : "="}
    </span>
  );
}

/**
 * Un duel de la liste « À revoir » : résultat, adversaire et score, puis
 * erreurs et temps restant dans la fenêtre de 14 jours. Toute la ligne mène
 * à la revue (/duel/<id>?revue=1).
 */
export function ReviewDuelRow({
  id,
  name,
  won,
  myScore,
  theirScore,
  errors,
  left,
}: {
  id: string;
  name: string;
  won: boolean | null;
  myScore: number | null;
  theirScore: number | null;
  /** nombre de ratures (null si inconnu) */
  errors: number | null;
  /** « encore 12 j » */
  left: string | null;
}) {
  const errLabel = raturesPartie(errors);
  return (
    <li>
      <Link
        href={`/duel/${id}?revue=1`}
        className="rl-row grid grid-cols-[26px_minmax(0,1fr)_auto] items-center gap-3 rounded-[12px] px-2 py-2.5"
        aria-label={`Revoir la partie contre ${name}${errLabel ? `, ${errLabel}` : ""}${left ? `, ${left}` : ""}`}
      >
        <ResultMark won={won} />
        <span className="min-w-0">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-[14.5px] font-semibold">{name}</span>
            {myScore !== null && theirScore !== null && (
              <span className="shrink-0 font-mono text-[12.5px] tabular-nums text-muted">
                {myScore} – {theirScore}
              </span>
            )}
          </span>
          <span className="t-micro block truncate">{[errLabel, left].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="btn btn-sm btn-secondary" aria-hidden>Revoir</span>
      </Link>
    </li>
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
