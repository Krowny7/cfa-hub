import { RankBadge } from "@/components/ui/RankBadge";
import { Banniere, CadreSceau, TitrePlume, classesProfil as s, styleAccent } from "@/components/profil/Pieces";
import { TIERS } from "@/lib/ranks";
import { pieceDe, type StyleProfil } from "@/lib/profil/catalogue";
import { nombre } from "@/lib/voice";

// La carte de joueur : le haut du profil, façon jeu vidéo, dans la langue du
// site (papier, encre, métal pour le rang). La bannière choisie, le sceau
// dans son cadre qui la chevauche, le titre à la plume au-dessus du pseudo,
// le badge de rang, le niveau, la bio, puis les actions (défier, ami,
// LinkedIn ; ou personnaliser sur son propre profil). Sans état : la page
// de profil et l'aperçu de l'éditeur la rendent avec les mêmes données.

export type CarteData = {
  id: string;
  name: string;
  avatarUrl: string | null;
  style: StyleProfil;
  niveau: number;
  /** avancement dans le niveau, 0–100 */
  levelPct: number;
  xpTotal: number;
  elo: number;
  tierIndex: number;
  division: string | null;
  mastery: number | null;
  place: number | null;
  gamesPlayed: number;
  /** le LinkedIn, s'il est visible par celui qui regarde */
  linkedin: string | null;
  /** nombre d'amis (null : amis pas encore disponibles) */
  amis: number | null;
};

/** La petite marque LinkedIn (aux couleurs de LinkedIn, comme un lien sortant). */
export function MarqueLinkedin({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-[4px] font-sans font-bold leading-none"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.62), background: "#0A66C2", color: "#ffffff" }}
    >
      in
    </span>
  );
}

export function CarteJoueur({ d, actions, className = "" }: { d: CarteData; actions?: React.ReactNode; className?: string }) {
  const titre = pieceDe("titre", d.style.title);
  const tier = TIERS[d.tierIndex] ?? TIERS[0];
  const meta = [d.place ? `${d.place}${d.place === 1 ? "er" : "e"} au classement` : null, d.gamesPlayed > 0 ? `${nombre(d.gamesPlayed)} ${d.gamesPlayed > 1 ? "parties classées" : "partie classée"}` : null, d.amis ? `${nombre(d.amis)} ${d.amis > 1 ? "amis" : "ami"}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className={"card overflow-hidden p-0 " + className} aria-label={`Profil de ${d.name}`} style={styleAccent(d.style.accent)}>
      <Banniere banner={d.style.banner} accent={d.style.accent} className="h-[120px] sm:h-[176px]" />

      <div className="relative px-5 pb-6 sm:px-8 sm:pb-8">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div className="relative z-[2] -mt-[58px] sm:-mt-[78px]">
            <CadreSceau frame={d.style.frame} name={d.name} avatarUrl={d.avatarUrl} size={112} />
          </div>
          <div className="min-w-0 flex-[1_1_220px] pt-2">
            {titre && <TitrePlume accent={d.style.accent} className="block text-[22px] sm:text-[26px]">{titre.nom}</TitrePlume>}
            <h1 className="t-h1 mt-0.5 [overflow-wrap:anywhere]">{d.name}</h1>
          </div>
          <div className="flex items-center gap-3 pb-1">
            <RankBadge tier={d.tierIndex} size={64} mastery={d.mastery} division={d.division} />
            <div className="leading-tight">
              <p className="m-0 text-[14px] font-semibold">
                {tier.name}
                {d.division ? ` ${d.division}` : ""}
              </p>
              <p className="m-0 font-mono text-[12.5px] tabular-nums text-muted">{nombre(d.elo)} ELO</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex min-w-0 flex-col gap-3">
            {/* le niveau : la pastille, la barre, l'XP */}
            <div className="flex max-w-[460px] items-center gap-3">
              <span className="t-num shrink-0 rounded-[10px] border border-line-2 px-2 py-1 text-[15px] leading-none">Niv. {d.niveau}</span>
              <span className="ink-bar block h-1.5 min-w-[80px] flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={d.levelPct} aria-label={`Niveau ${d.niveau} : ${d.levelPct} %`}>
                <span className={s.filet} style={{ width: `${d.levelPct}%` }} />
              </span>
              <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted">{nombre(d.xpTotal)} XP</span>
            </div>
            {d.style.bio && <p className="t-small m-0 max-w-[560px] whitespace-pre-line text-white">{d.style.bio}</p>}
            {meta && <p className="t-micro m-0">{meta}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            {d.linkedin && (
              <a href={d.linkedin} target="_blank" rel="noopener noreferrer me" className="btn btn-secondary rl-press">
                <MarqueLinkedin /> LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
