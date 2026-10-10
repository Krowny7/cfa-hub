import Link from "next/link";
import { CalendarClock, Eye, Palette, Sparkles } from "lucide-react";
import { CarteRang } from "@/components/classement/CarteRang";
import { Avatar } from "@/components/classement/Avatar";
import { SceauPerso } from "@/components/adn/SceauPerso";
import { Icone } from "@/components/adn/icons";
import { daysUntil } from "@/components/classement/format";
import { CURRENT_DOMAIN, CURRENT_PROGRAM } from "@/lib/domains";
import { joursEncre, jourJ } from "@/lib/voice";
import { MOI } from "@/lib/voice-z1";
import { hrefPersonnaliser } from "@/lib/profil/onglets";
import type { MoiData } from "@/components/moi/types";

// En-tête compact de l'espace Moi : la photo, ou à défaut le sceau
// d'initiales (jamais un rond gris), le pseudo, une ligne de repères (jour J,
// jours d'encre, niveau) et, à droite, le rang en une ligne (la seule carte
// sombre de la page) qui mène au classement.
export function MoiHeader({ d, now }: { d: MoiData; now?: number }) {
  const j = d.examDate ? daysUntil(d.examDate, now) : null;
  const jj = jourJ(j);
  const examDateLabel = d.examDate ? new Date(d.examDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : null;

  return (
    <header className="grid items-center gap-5 lg:grid-cols-12">
      <div className="flex min-w-0 items-center gap-4 md:gap-5 lg:col-span-8">
        {d.avatarUrl ? (
          <Avatar src={d.avatarUrl} name={d.name} size={64} className="rl-pop shadow-[var(--shadow-1)]" />
        ) : (
          <SceauPerso nom={d.name} taille={64} className="rl-pop shrink-0" />
        )}
        <div className="min-w-0">
          <p className="t-eyebrow">
            Moi · {CURRENT_DOMAIN.name} · {CURRENT_PROGRAM.name}
          </p>
          <h1 className="t-h1 rl-in m-0 mt-1 [overflow-wrap:anywhere]">{d.name}</h1>
          <p className="t-small mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            {j === null ? (
              <Link href="?onglet=reglages#date" className="inline-flex items-center gap-1.5 font-semibold text-white underline decoration-line-2 underline-offset-4 hover:decoration-current">
                <CalendarClock size={14} aria-hidden /> {MOI.fixeJourJ}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-white" title={examDateLabel ?? undefined}>
                <CalendarClock size={14} aria-hidden />
                {jj ?? MOI.examenPasse}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Icone nom="serie" size={15} />
              {d.streak > 0 ? joursEncre(d.streak) : MOI.serieVide}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={14} aria-hidden />
              Niveau {d.level}
            </span>
          </p>
          {/* la carte de joueur : la personnaliser, la voir comme les autres */}
          <p className="mt-3 flex flex-wrap items-center gap-2">
            <Link href={hrefPersonnaliser(d.userId)} className="btn btn-secondary btn-sm rl-press">
              <Palette size={14} aria-hidden /> Personnaliser mon profil
            </Link>
            <Link href={`/people/${d.userId}?vue=inconnu`} className="btn btn-ghost btn-sm">
              <Eye size={14} aria-hidden /> Voir comme les autres
            </Link>
          </p>
        </div>
      </div>

      <CarteRang elo={d.me.elo} mastery={d.me.mastery} place={d.me.leaderboardRank} gamesPlayed={d.me.gamesPlayed} className="lg:col-span-4" />
    </header>
  );
}
