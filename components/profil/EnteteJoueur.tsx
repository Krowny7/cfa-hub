import Link from "next/link";
import { PageHero } from "@/components/ui/Titles";
import { RankBadge } from "@/components/ui/RankBadge";
import { RangProfil } from "@/components/profil/RangProfil";
import { Banniere, CadreSceau, classesProfil as s, styleAccent } from "@/components/profil/Pieces";
import { Provenance } from "@/components/profil/Provenance";
import { cadreDe, motifDe, type StyleProfil } from "@/lib/profil/catalogue";
import { nombre } from "@/lib/voice";
import { PresenceText } from "@/components/presence/Presence";
import { BioRepliable } from "@/components/profil/BioRepliable";
import { ordinal } from "@/components/classement/format";
import { PLACEMENT_GAMES, TIERS, rankFor } from "@/lib/ranks";
import { ENTETE } from "@/lib/voice-profil";

// L'en-tête du profil, façon jeu vidéo mais sur toute la largeur de la page
// (pas de carte) : la bannière du joueur (son image, ou un motif) d'un bord
// à l'autre de l'écran, son sceau dans son cadre qui la chevauche, le
// pseudo en grand et, dessous en italique, son prénom et nom s'il les
// montre ; le niveau, la bio, les actions ; à droite, son rang en grand
// (RangProfil : l'insigne animé, qui chevauche lui aussi la bannière sur
// grand écran). Sans état : la page de profil et l'aperçu de l'éditeur (`apercu` :
// bannière contenue, plus basse) le rendent avec les mêmes données.
// Sur téléphone, c'est une carte de joueur qui tient dans le premier écran :
// le sceau réduit, le rang (insigne de 52 px) dans la ligne du nom à la
// place de la grande carte, une ligne niveau · ELO · place, le pic, la bio
// sur deux lignes, les actions (44 px), puis les 3 sceaux posés (`poses`).
// Sur ordinateur, la grande carte du rang à droite, avec le pic et, sur le
// profil d'un autre, le bilan du face-à-face en pied (`piedRang`).
// Les pièces gagnées qui bougent (cadre, bannière) disent d'où elles
// viennent au survol ou au toucher (`d.provenance`). Sur téléphone, au plus
// deux éléments animés : l'insigne et le cadre ; si le cadre bouge, la
// bannière et les reflets des sceaux posés se figent. Personnaliser pose
// ses crayons sur la bannière et le sceau (`crayons`).

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
  /** meilleur palier atteint (index dans TIERS), affiché s'il dépasse l'actuel */
  pic?: number | null;
  /** d'où viennent le cadre et la bannière s'ils bougent (« Liquide Diamant, gagné le 12 oct. ») */
  provenance?: { cadre: string | null; banniere: string | null };
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
  poses = null,
  piedRang = null,
  crayons = null,
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
  /** les 3 sceaux posés (SceauxPoses) */
  poses?: React.ReactNode;
  /** le pied de la carte du rang, sur ordinateur (bilan du face-à-face) */
  piedRang?: React.ReactNode;
  /** Personnaliser : les crayons posés sur la bannière et sur le sceau */
  crayons?: { banniere: React.ReactNode; sceau: React.ReactNode } | null;
}) {
  const meta = [d.amis ? `${nombre(d.amis)} ${d.amis > 1 ? "amis" : "ami"}` : null, `${nombre(d.xpTotal)} XP`].filter(Boolean).join(" · ");
  // sur téléphone : le rang dans la ligne du nom, la ligne niveau · ELO · place, le pic
  const rang = rankFor(d.elo, d.mastery, d.place);
  const placement = d.gamesPlayed < PLACEMENT_GAMES;
  // le palier toujours (comme la carte d'ordinateur et le Journal) ; en placement, l'avancée dessous
  const nomRang = `${rang.tier.name}${rang.division ? " " + rang.division : ""}`;
  const joues = Math.min(d.gamesPlayed, PLACEMENT_GAMES);
  const picNom = d.pic !== undefined && d.pic !== null && d.pic > rang.tierIndex ? TIERS[d.pic].name : null;
  const eloPlace = ENTETE.eloPlace(d.elo, d.place !== null ? ordinal(d.place) : null);
  // ce qui bouge : sur téléphone, le cadre passe avant la bannière, qui passe avant les reflets des sceaux
  const cadreAnime = !!cadreDe(d.style.frame).anime;
  const motif = d.style.bannerUrl ? null : motifDe(d.style.banner);
  const banniereAnimee = !!motif?.anime;
  const sceau = <CadreSceau frame={d.style.frame} name={d.name} avatarUrl={d.avatarUrl} size={apercu ? 88 : 128} />;

  return (
    <header className="flex flex-col" style={styleAccent(d.style.accent)} aria-label={`Profil de ${d.name}`}>
      {/* la bannière, d'un bord à l'autre de l'écran (contenue dans l'aperçu) */}
      <div className={apercu ? "relative overflow-hidden rounded-[18px]" : "relative -mt-7 w-screen [margin-left:calc(50%_-_50vw)]"}>
        <Banniere
          banner={d.style.banner}
          bannerUrl={d.style.bannerUrl}
          bannerPos={d.style.bannerPos}
          accent={d.style.accent}
          calme={cadreAnime}
          className={
            apercu
              ? { fine: "h-[96px]", normale: "h-[130px]", haute: "h-[176px]" }[d.style.bannerH]
              : { fine: "h-[104px] sm:h-[170px]", normale: "h-[136px] sm:h-[250px]", haute: "h-[176px] sm:h-[340px]" }[d.style.bannerH]
          }
        />
        {haut && (
          <div className={apercu ? "absolute left-4 top-3 z-[3]" : "absolute inset-x-0 top-3 z-[3] sm:top-4"}>
            <div className={apercu ? "" : "mx-auto w-[min(1240px,calc(100vw_-_2rem))] md:w-[min(1240px,calc(100vw_-_3.5rem))]"}>{haut}</div>
          </div>
        )}
        {!apercu && (crayons || (banniereAnimee && motif && d.provenance?.banniere)) && (
          <div className="pointer-events-none absolute inset-0 z-[3]">
            <div className="relative mx-auto h-full w-[min(1240px,calc(100vw_-_2rem))] md:w-[min(1240px,calc(100vw_-_3.5rem))]">
              {/* en haut à droite (le bas est à la carte du rang sur ordinateur) : la bannière gagnée, son nom et d'où elle vient ; le crayon */}
              <div className="pointer-events-auto absolute right-0 top-1 flex items-center gap-2 sm:top-2">
                {banniereAnimee && motif && d.provenance?.banniere && (
                  <Provenance texte={d.provenance.banniere} aligne="droite">
                    <span className="inline-flex min-h-[44px] items-center">
                      <span className="rounded-full bg-[color-mix(in_oklab,var(--paper)_82%,transparent)] px-3 py-1 text-[12px] font-semibold text-white backdrop-blur">{motif.nom}</span>
                    </span>
                  </Provenance>
                )}
                {crayons?.banniere}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={"grid items-end gap-x-10 gap-y-7 " + (apercu ? "" : "lg:grid-cols-12")}>
        <div className={"flex min-w-0 flex-col " + (apercu ? "gap-5" : "gap-3.5 lg:col-span-7 lg:gap-5")}>
          <div className={apercu ? "flex flex-wrap items-end gap-x-6 gap-y-3" : "flex items-start gap-x-4 gap-y-3 lg:flex-wrap lg:items-end lg:gap-x-6"}>
            {/* le sceau : 88 px sur téléphone (128 réduit), 128 sur ordinateur */}
            <div className={"relative z-[2] shrink-0 " + (apercu ? "-mt-[46px] pl-4" : "-mt-[64px] max-lg:[zoom:0.6875] lg:-mt-[84px]")}>
              {cadreAnime && d.provenance?.cadre && !apercu ? (
                <Provenance texte={d.provenance.cadre} classeBulle="max-lg:[zoom:1.4545]">
                  {sceau}
                </Provenance>
              ) : (
                sceau
              )}
              {crayons && <span className="absolute -bottom-2 -right-2 z-[3] max-lg:[zoom:1.4545]">{crayons.sceau}</span>}
            </div>
            <div className={"min-w-0 " + (apercu ? "flex-[1_1_240px] pt-2" : "flex-1 pt-2 lg:flex-[1_1_240px]")}>
              {apercu ? (
                <h2 className="t-h1 m-0 [overflow-wrap:anywhere]">{d.name}</h2>
              ) : (
                <>
                  <h1 className={`m-0 font-extrabold leading-[1.1] tracking-[-0.03em] [overflow-wrap:anywhere] lg:hidden ${d.name.length > 12 ? "text-[20px]" : d.name.length > 9 ? "text-[22px]" : "text-[26px]"}`}>{d.name}</h1>
                  <PageHero kicker={kicker} title={<span className="[overflow-wrap:anywhere]">{d.name}</span>} enso={false} className="w-fit max-w-full max-lg:hidden" />
                </>
              )}
              {d.nomComplet && <p className={`${s.nomComplet} m-0 mt-1 ${apercu ? "text-[18px] sm:text-[20px]" : "text-[15px] lg:text-[20px]"}`}>{d.nomComplet}</p>}
              {presence && !apercu && (
                <div className="mt-1 min-h-[21px] text-[13px] font-semibold text-muted lg:mt-2 lg:text-[14px]">
                  <PresenceText userId={d.id} repli="Hors ligne" />
                </div>
              )}
            </div>
            {/* téléphone : le rang dans la ligne du nom (la grande carte est sur ordinateur) */}
            {!apercu && (
              <Link href="/classement" className="flex w-[76px] shrink-0 flex-col items-center gap-1 pt-1.5 lg:hidden" aria-label={`${rangDe ?? "Ton rang"} : ${placement ? `placement ${joues} sur ${PLACEMENT_GAMES}, rang provisoire ${nomRang}` : nomRang}. Voir le classement`}>
                <RankBadge tier={rang.tierIndex} size={52} mastery={d.mastery ?? 0} division={placement ? null : rang.division} anime className="w-[52px]" />
                <span className="text-center text-[12px] font-bold leading-tight text-white">{nomRang}</span>
                {placement && <span className="-mt-0.5 font-mono text-[11px] font-semibold tabular-nums text-muted">{`${joues}/${PLACEMENT_GAMES}`}</span>}
              </Link>
            )}
          </div>

          {/* le niveau : la pastille, la barre à la couleur du joueur ; l'XP (ordinateur) ou l'ELO et la place (téléphone) */}
          <div className="flex max-w-[480px] items-center gap-3">
            <span className="t-num shrink-0 rounded-[10px] border border-line-2 px-2 py-1 text-[15px] leading-none">Niv. {d.niveau}</span>
            <span className="ink-bar block h-1.5 min-w-[60px] flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={d.levelPct} aria-label={`Niveau ${d.niveau} : ${d.levelPct} %`}>
              <span className={s.filet} style={{ width: `${d.levelPct}%` }} />
            </span>
            {apercu ? (
              <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted">{meta}</span>
            ) : (
              <>
                <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted lg:hidden">{eloPlace}</span>
                <span className="shrink-0 font-mono text-[12px] tabular-nums text-muted max-lg:hidden">{meta}</span>
              </>
            )}
          </div>
          {picNom && !apercu && <p className="m-0 -mt-1.5 text-[13px] font-semibold text-muted lg:hidden">{ENTETE.pic(picNom)}</p>}
          {d.style.bio && (apercu ? <p className="t-small m-0 max-w-[560px] whitespace-pre-line text-white">{d.style.bio}</p> : <BioRepliable texte={d.style.bio} />)}
          {(actions || d.linkedin) && (
            <div className={"flex flex-wrap items-center gap-2 " + (apercu ? "" : "[&_.btn]:min-h-[44px] max-sm:[&_.btn]:px-3")}>
              {actions}
              {d.linkedin && (
                <a href={d.linkedin} target="_blank" rel="noopener noreferrer me" className="btn btn-secondary rl-press">
                  <MarqueLinkedin /> LinkedIn
                </a>
              )}
            </div>
          )}
          {poses && !apercu && <div className={"pt-1 lg:pt-2" + (cadreAnime || banniereAnimee ? " rl-calme-tel" : "")}>{poses}</div>}
        </div>

        {!apercu && (
          <div className="z-[2] hidden lg:col-span-5 lg:-mt-[84px] lg:block lg:self-start">
            <RangProfil elo={d.elo} mastery={d.mastery} place={d.place} gamesPlayed={d.gamesPlayed} surTitre={rangDe ?? "Ton rang"} pic={d.pic ?? null} pied={piedRang} />
          </div>
        )}
      </div>
    </header>
  );
}
