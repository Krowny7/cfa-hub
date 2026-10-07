import { PageHero } from "@/components/ui/Titles";
import { RangProfil } from "@/components/profil/RangProfil";
import { Banniere, CadreSceau, classesProfil as s, styleAccent } from "@/components/profil/Pieces";
import { type StyleProfil } from "@/lib/profil/catalogue";
import { nombre } from "@/lib/voice";
import { PresenceText } from "@/components/presence/Presence";

// L'en-tête du profil, façon jeu vidéo mais sur toute la largeur de la page
// (pas de carte) : la bannière du joueur (son image, ou un motif) d'un bord
// à l'autre de l'écran, son sceau dans son cadre qui la chevauche, le
// pseudo en grand et, dessous en italique, son prénom et nom s'il les
// montre ; le niveau, la bio, les actions ; à droite, son rang en grand
// (RangProfil : l'insigne animé, qui chevauche lui aussi la bannière sur
// grand écran). Sans état : la page de profil et l'aperçu de l'éditeur (`apercu` :
// bannière contenue, plus basse) le rendent avec les mêmes données.

export type EnteteData = {
  id: string;
  name: string;
  /** prénom et nom, s'ils sont visibles par celui qui regarde */
  nomComplet: string | null;
  avatarUrl: string | null;
  style: StyleProfil;
  niveau: number;
  /** avancement dans le niveau, 0–100 */
  levelPct: number;
  xpTotal: number;
  elo: number;
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

export function EnteteJoueur({
  d,
  actions,
  haut,
  kicker,
  rangDe,
  apercu = false,
  presence = false,
}: {
  d: EnteteData;
  actions?: React.ReactNode;
  /** posé sur la bannière, en haut à gauche (retour, bandeau d'aperçu) */
  haut?: React.ReactNode;
  kicker?: React.ReactNode;
  /** sur-titre de la carte du rang : « Ton rang » (défaut), « Son rang » */
  rangDe?: string;
  apercu?: boolean;
  /** « En ligne » / « Vu il y a 3 h » sous le nom (le profil d'un autre joueur) */
  presence?: boolean;
}) {
  const meta = [d.amis ? `${nombre(d.amis)} ${d.amis > 1 ? "amis" : "ami"}` : null, `${nombre(d.xpTotal)} XP`].filter(Boolean).join(" · ");

  return (
    <header className="flex flex-col" style={styleAccent(d.style.accent)} aria-label={`Profil de ${d.name}`}>
      {/* la bannière, d'un bord à l'autre de l'écran (contenue dans l'aperçu) */}
      <div className={apercu ? "relative overflow-hidden rounded-[18px]" : "relative -mt-7 w-screen [margin-left:calc(50%_-_50vw)]"}>
        <Banniere
          banner={d.style.banner}
          bannerUrl={d.style.bannerUrl}
          bannerPos={d.style.bannerPos}
          accent={d.style.accent}
          className={
            apercu
              ? { fine: "h-[96px]", normale: "h-[130px]", haute: "h-[176px]" }[d.style.bannerH]
              : { fine: "h-[120px] sm:h-[170px]", normale: "h-[170px] sm:h-[250px]", haute: "h-[220px] sm:h-[340px]" }[d.style.bannerH]
          }
        />
        {haut && (
          <div className={apercu ? "absolute left-4 top-3 z-[3]" : "absolute inset-x-0 top-4 z-[3]"}>
            <div className={apercu ? "" : "mx-auto w-[min(1240px,calc(100vw_-_2rem))] md:w-[min(1240px,calc(100vw_-_3.5rem))]"}>{haut}</div>
          </div>
        )}
      </div>

      <div className={"grid items-end gap-x-10 gap-y-7 " + (apercu ? "" : "lg:grid-cols-12")}>
        <div className={"flex min-w-0 flex-col gap-5 " + (apercu ? "" : "lg:col-span-7")}>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <div className={"relative z-[2] " + (apercu ? "-mt-[46px] pl-4" : "-mt-[56px] sm:-mt-[84px]")}>
              <CadreSceau frame={d.style.frame} name={d.name} avatarUrl={d.avatarUrl} size={apercu ? 88 : 128} />
            </div>
            <div className="min-w-0 flex-[1_1_240px] pt-2">
              {apercu ? (
                <h2 className="t-h1 m-0 [overflow-wrap:anywhere]">{d.name}</h2>
              ) : (
                <PageHero kicker={kicker} title={<span className="[overflow-wrap:anywhere]">{d.name}</span>} enso={false} className="w-fit max-w-full" />
              )}
              {d.nomComplet && <p className={`${s.nomComplet} m-0 mt-1 text-[18px] sm:text-[20px]`}>{d.nomComplet}</p>}
              {presence && !apercu && (
                <div className="mt-2 min-h-[21px] text-[14px] font-semibold text-muted">
                  <PresenceText userId={d.id} repli="Hors ligne" />
                </div>
              )}
            </div>
          </div>

          {/* le niveau : la pastille, la barre à la couleur du joueur, l'XP */}
          <div className="flex max-w-[480px] items-center gap-3">
            <span className="t-num shrink-0 rounded-[10px] border border-line-2 px-2 py-1 text-[15px] leading-none">Niv. {d.niveau}</span>
            <span className="ink-bar block h-1.5 min-w-[80px] flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={d.levelPct} aria-label={`Niveau ${d.niveau} : ${d.levelPct} %`}>
              <span className={s.filet} style={{ width: `${d.levelPct}%` }} />
            </span>
            <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted">{meta}</span>
          </div>
          {d.style.bio && <p className="t-small m-0 max-w-[560px] whitespace-pre-line text-white">{d.style.bio}</p>}
          {(actions || d.linkedin) && (
            <div className="flex flex-wrap items-center gap-2">
              {actions}
              {d.linkedin && (
                <a href={d.linkedin} target="_blank" rel="noopener noreferrer me" className="btn btn-secondary rl-press">
                  <MarqueLinkedin /> LinkedIn
                </a>
              )}
            </div>
          )}
        </div>

        {!apercu && (
          <RangProfil elo={d.elo} mastery={d.mastery} place={d.place} gamesPlayed={d.gamesPlayed} surTitre={rangDe ?? "Ton rang"} className="z-[2] lg:col-span-5 lg:self-start lg:-mt-[84px]" />
        )}
      </div>
    </header>
  );
}
