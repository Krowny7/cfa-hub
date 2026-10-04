import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { PageHero } from "@/components/ui/Titles";
import { PanneauRang } from "@/components/adn/RankCeremonyPanneau";
import { Icone } from "@/components/adn/icons";
import { Avatar } from "@/components/classement/Avatar";
import { CURRENT_DOMAIN } from "@/lib/domains";
import { fmtInt } from "@/components/classement/format";
import { JOUEURS, ligneRang, partiesClassees } from "@/lib/voice-z2a";

export type PlayerHeaderData = {
  id: string;
  name: string;
  avatarUrl: string | null;
  isMe: boolean;
  level: number;
  xpTotal: number;
  /** avancement dans le niveau, 0–100 */
  levelPct: number;
  xpToNextLevel: number;
  mutualGroups: number;
  elo: number;
  gamesPlayed: number;
  mastery: number | null;
  leaderboardRank: number | null;
};

// En-tête du profil d'un joueur (/people/<id>) : son sceau (ou sa photo), son
// nom, le niveau sur une ligne, une seule action (Défier, ou Mes réglages sur
// son propre profil) et, à droite, le panneau de son rang (Geste).
// Composant de présentation.
export function PlayerHeader({ p }: { p: PlayerHeaderData }) {
  const meta = [`Niveau ${p.level}`, `${fmtInt(p.xpTotal)} XP`, p.mutualGroups > 0 ? JOUEURS.groupesCommun(p.mutualGroups) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <Link href="/people" className="inline-flex w-fit items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-white">
        <ArrowLeft size={14} aria-hidden /> {JOUEURS.retour}
      </Link>

      <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-14">
        <div className="flex min-w-0 items-start gap-5 lg:col-span-7">
          <div className="hidden pt-7 sm:block">
            <Avatar src={p.avatarUrl} name={p.name} size={80} className={p.avatarUrl ? "shadow-[var(--shadow-2)]" : ""} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <PageHero kicker={p.isMe ? JOUEURS.kickerMoi : JOUEURS.kickerAutre} title={<span className="[overflow-wrap:anywhere]">{p.name}</span>} className="w-fit max-w-full" />
            <div className="flex max-w-[420px] flex-col gap-2">
              <p className="t-small">{meta}</p>
              <div className="ink-bar" role="progressbar" aria-valuenow={p.levelPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Niveau ${p.level} : ${p.levelPct} %`}>
                <span className="rl-grow" style={{ width: `${p.levelPct}%` }} />
              </div>
              <p className="t-micro">{JOUEURS.niveauSuivant(p.xpToNextLevel, p.level + 1)}</p>
            </div>
            <div>
              {p.isMe ? (
                <Link href="/moi?onglet=reglages#reglages" className="btn btn-secondary rl-press">
                  <Settings size={15} aria-hidden /> {JOUEURS.reglages}
                </Link>
              ) : (
                <Link href={`/duel?adversaire=${encodeURIComponent(p.id)}`} className="btn btn-primary rl-press">
                  <Icone nom="duel" size={17} /> {JOUEURS.defier(p.name)}
                </Link>
              )}
            </div>
          </div>
        </div>

        <PanneauRang elo={p.elo} maitrise={p.mastery} place={p.leaderboardRank} domaine={CURRENT_DOMAIN.name} joues={p.gamesPlayed} className="rl-in lg:col-span-5">
          <p className="m-0 mt-1.5 font-mono text-[12px] tabular-nums opacity-70">
            {[ligneRang({ place: p.leaderboardRank, joueurs: null, maitrise: p.mastery }), partiesClassees(p.gamesPlayed)].join(" · ")}
          </p>
        </PanneauRang>
      </div>
    </div>
  );
}
