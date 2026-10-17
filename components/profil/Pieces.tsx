import { INK } from "@/components/ui/InkDefs";
import { SceauPerso } from "@/components/adn/SceauPerso";
import { CadreVivant } from "@/components/profil/CadreVivant";
import { cadreDe, couleurCss, type StyleProfil } from "@/lib/profil/catalogue";
import { estCadreDessine, type BanniereDessinee, type CadreDessine } from "@/lib/profil/rendus";
import s from "./Profil.module.css";

// Les pièces du profil, sans état (serveur comme client, Personnaliser
// compris) : la bannière (image du joueur, ou motif) et le sceau dans son
// cadre. Les pièces gagnées bougent : la bannière « Encre vivante » (des
// taches de sa couleur qui boivent dans le papier, en boucle), « Or vivant »
// (un reflet passe sur la feuille d'or), et les cadres de CadreVivant.
// Les bannières ne tournent que sur le compositeur (transform, opacity : ni
// peinture ni calcul par image) et se figent en mouvement réduit ; `fige`
// les montre immobiles (vignettes), `calme` les fige sur téléphone (au plus
// deux éléments animés par écran : l'insigne et le cadre).
// Les pièces du Codex, des trophées, du fil rouge et des programmes sont
// dessinées en CSS seul (lib/profil/rendus.ts, V3 §3.9) : transform, opacity,
// background-position et le tracé d'un trait, jamais de filtre animé ni de
// script. Au repos, elles montrent leur dernier état (la route tracée, la
// couronne entière) : c'est ce qu'on voit en mouvement réduit, en vignette
// (`fige`) et sur téléphone quand il faut se calmer (`calme`).

const MOTIF_CLASSE: Record<string, string> = {
  papier: "",
  lavis: s.lavis,
  hachures: s.hachures,
  registre: s.registre,
  trame: s.trame,
  enso: s.enso,
  nuit: s.nuit,
  "feuille-or": s.feuilleOr,
  diamant: s.diamant,
  "encre-vivante": s.encreVivante,
  "or-vivant": s.orVivant,
  carnet: s.carnet,
  florence: s.florence,
  imola: s.imola,
  "machine-volante": s.machineVolante,
  "salle-trophees": s.salleTrophees,
  "route-milan": s.routeMilan,
};
/** les taches de l'Encre vivante : où elles naissent, leur taille, leur densité, leur angle, leur décalage dans la boucle */
const TACHES = [
  { l: "8%", t: "-30%", w: "27%", o: 0.9, r: "0deg", d: "0s" },
  { l: "38%", t: "22%", w: "18%", o: 0.7, r: "70deg", d: "-2.5s" },
  { l: "66%", t: "-40%", w: "31%", o: 0.8, r: "150deg", d: "-5s" },
  { l: "89%", t: "26%", w: "21%", o: 0.62, r: "220deg", d: "-7.5s" },
];

/** `--acc` : la couleur choisie (bannière, vitrine, radar, filets). */
export function styleAccent(accent: string): React.CSSProperties {
  return { ["--acc" as string]: couleurCss(accent) };
}

/** La bannière : l'image du joueur (cadrée), sinon le motif choisi. */
export function Banniere({
  banner,
  bannerUrl = null,
  bannerPos = 50,
  accent,
  className = "",
  fige = false,
  calme = false,
}: {
  banner: string;
  bannerUrl?: string | null;
  bannerPos?: number;
  accent: string;
  className?: string;
  /** immobile (les vignettes) */
  fige?: boolean;
  /** immobile sur téléphone (le cadre bouge déjà) */
  calme?: boolean;
}) {
  return (
    <div className={`${s.banniere} ${bannerUrl ? s.image : MOTIF_CLASSE[banner] ?? ""} ${fige ? s.fige : ""} ${calme ? s.calme : ""} ${className}`} style={styleAccent(accent)} aria-hidden>
      {bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bannerUrl} alt="" className={s.photoBanniere} style={{ objectPosition: `50% ${bannerPos}%` }} />
      ) : banner === "enso" ? (
        <svg className={s.ensoSvg} viewBox="-12 -12 264 264">
          <use href={INK.ring} fill="currentColor" />
        </svg>
      ) : banner === "encre-vivante" ? (
        TACHES.map((t) => (
          <span key={t.l} className={s.tache} style={{ left: t.l, top: t.t, ["--w" as string]: t.w, ["--o" as string]: t.o, ["--r" as string]: t.r, animationDelay: t.d }}>
            {/* un cœur dense aux bords déchirés, un halo qui a bu dans le papier (filtres de InkDefs) */}
            <svg viewBox="0 0 100 100">
              <g filter={INK.tacheHalo} fill="currentColor">
                <circle cx="50" cy="50" r="40" opacity=".22" />
                <circle cx="51" cy="49" r="29" opacity=".32" />
              </g>
              <g filter={INK.tache} fill="currentColor">
                <circle cx="47" cy="52" r="16" opacity=".92" />
                <circle cx="58" cy="44" r="6" opacity=".7" />
              </g>
            </svg>
          </span>
        ))
      ) : banner === "or-vivant" ? (
        <span className={s.refletOr} />
      ) : (
        (DECOR_BANNIERE as Record<string, (() => React.ReactNode) | undefined>)[banner]?.()
      )}
    </div>
  );
}

/** les huit vents du plan d'Imola, depuis le centre */
const VENTS = Array.from({ length: 8 }, (_, k) => {
  const a = (k * Math.PI) / 4;
  return { x: Math.round(120 + 84 * Math.cos(a)), y: Math.round(120 + 84 * Math.sin(a)) };
});
/** la route de Florence (en bas à gauche) à Milan (en haut à droite), en deux lacets */
const ROUTE = "M28 82 C 92 88, 118 40, 178 52 S 268 84, 306 46 S 352 22, 372 18";

/** Le décor des bannières dessinées : ce qui se pose sur le fond (V3 §3.9). */
const DECOR_BANNIERE: Record<BanniereDessinee, () => React.ReactNode> = {
  // des croquis à la plume qui se tracent et s'effacent dans la marge
  carnet: () => (
    <>
      <svg className={s.croquis} viewBox="0 0 240 240">
        <use href={INK.ringAxis} className={`${s.trace} ${s.anim}`} fill="none" stroke="currentColor" strokeWidth={4} />
      </svg>
      <svg className={`${s.croquisTrait} ${s.anim}`} viewBox="0 0 400 64">
        <use href={INK.swash} fill="currentColor" />
      </svg>
    </>
  ),
  // le Duomo sort de la brume, la lumière monte
  florence: () => (
    <>
      <span className={`${s.aube} ${s.anim}`} />
      <span className={s.dome} />
      <span className={`${s.brume} ${s.anim}`} />
      <span className={`${s.brume} ${s.brumeHaute} ${s.anim}`} />
    </>
  ),
  // la carte ronde, tracée vent après vent
  imola: () => (
    <svg className={s.plan} viewBox="0 0 240 240">
      <use href={INK.ringAxis} className={`${s.trace} ${s.anim}`} fill="none" stroke="currentColor" strokeWidth={3} />
      {VENTS.map((v, k) => (
        <line key={k} x1={120} y1={120} x2={v.x} y2={v.y} pathLength={100} className={`${s.vent} ${s.anim}`} style={{ ["--i" as string]: k }} />
      ))}
    </svg>
  ),
  // l'ornithoptère bat des ailes au-dessus des collines
  "machine-volante": () => (
    <span className={`${s.vol} ${s.anim}`}>
      <svg viewBox="0 0 120 60">
        <path className={`${s.aile} ${s.anim}`} d="M60 30 C 42 12, 18 8, 3 14 C 18 20, 40 25, 60 30 Z" />
        <path className={`${s.aile} ${s.aileDroite} ${s.anim}`} d="M60 30 C 78 12, 102 8, 117 14 C 102 20, 80 25, 60 30 Z" />
        <ellipse cx={60} cy={32} rx={9} ry={4} />
      </svg>
    </span>
  ),
  // des éclats d'or qui montent lentement, sur trois profondeurs
  "salle-trophees": () => (
    <>
      <span className={`${s.eclats} ${s.anim}`} />
      <span className={`${s.eclats} ${s.eclatsMoyens} ${s.anim}`} />
      <span className={`${s.eclats} ${s.eclatsProches} ${s.anim}`} />
    </>
  ),
  // une route au trait qui se dessine jusqu'à Milan, puis reste
  "route-milan": () => (
    <svg className={s.route} viewBox="0 0 400 100" preserveAspectRatio="xMidYMid meet">
      <path d={ROUTE} pathLength={100} className={s.routeFond} />
      <path d={ROUTE} pathLength={100} className={`${s.routeTrait} ${s.anim}`} />
      <circle cx={28} cy={82} r={4.5} className={s.etape} />
      <circle cx={372} cy={18} r={4.5} className={`${s.etape} ${s.arrivee} ${s.anim}`} />
    </svg>
  ),
};

/**
 * L'ambiance de la page, derrière tout le reste : un voile de la couleur du
 * joueur, ou sa bannière floutée (sinon le voile), qui s'efface vers le bas,
 * d'un bord à l'autre de l'écran, sur le haut de la page. Le conteneur doit
 * être `relative isolate`.
 */
export function AmbianceProfil({ style }: { style: StyleProfil }) {
  if (style.ambiance === "aucune") return null;
  const image = style.ambiance === "banniere" ? style.bannerUrl : null;
  const masque = "linear-gradient(to bottom, #000 0%, #000 30%, transparent 100%)";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[1300px] w-screen -translate-x-1/2 overflow-hidden"
      style={{ maskImage: masque, WebkitMaskImage: masque, ...styleAccent(style.accent) }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className={s.ambianceImage} style={{ objectPosition: `50% ${style.bannerPos}%` }} />
      ) : (
        <div className={s.ambianceTeinte} />
      )}
    </div>
  );
}

/** une plume d'oie, la pointe en bas (0 0 24 48) */
const PLUME = "M12 47 L12 8 M12 5 C 4 12, 3 26, 8.5 39 L12 34 L15.5 39 C 21 26, 20 12, 12 5 Z";

/** Le décor des cadres dessinés : ce qui se pose sur l'anneau, autour du sceau (V3 §3.9). */
const DECOR_CADRE: Record<CadreDessine, { classe: string; decor: () => React.ReactNode }> = {
  // six facettes qui scintillent tour à tour
  "diamant-taille": { classe: s.diamantTaille, decor: () => Array.from({ length: 6 }, (_, k) => <i key={k} className={`${s.deco} ${s.facette} ${s.anim}`} style={{ ["--i" as string]: k }} />) },
  // un reflet doré qui fait le tour
  "vitrine-or": { classe: s.vitrineOr, decor: () => <i className={`${s.deco} ${s.refletTour} ${s.anim}`} /> },
  // une plume qui glisse le long du cadre
  plume: {
    classe: s.cadrePlume,
    decor: () => (
      <i className={`${s.deco} ${s.orbite} ${s.anim}`} style={{ ["--t" as string]: "9s" }}>
        <svg className={s.plume} viewBox="0 0 24 48">
          <path d={PLUME} />
        </svg>
      </i>
    ),
  },
  // un trait de craie rouge qui fait le tour
  sanguine: { classe: s.sanguine, decor: () => <i className={`${s.deco} ${s.craie} ${s.anim}`} /> },
  // un contour qui se fond et revient, comme une fumée
  sfumato: { classe: s.sfumato, decor: () => <i className={`${s.deco} ${s.fumee} ${s.anim}`} /> },
  // une goutte d'encre qui coule doucement autour du sceau
  "encre-fidele": {
    classe: s.encreFidele,
    decor: () => (
      <i className={`${s.deco} ${s.orbite} ${s.anim}`} style={{ ["--t" as string]: "14s" }}>
        <i className={s.goutte} />
      </i>
    ),
  },
  // une couronne de laurier qui pousse feuille à feuille
  laurier: {
    classe: s.laurier,
    decor: () =>
      Array.from({ length: 12 }, (_, k) => (
        <i key={k} className={`${s.deco} ${s.rameau}`} style={{ ["--i" as string]: k }}>
          <i className={`${s.feuille} ${s.anim}`} />
        </i>
      )),
  },
  // le cercle et le carré de l'Homme de Vitruve
  vitruve: {
    classe: s.vitruve,
    decor: () => (
      <svg className={`${s.deco} ${s.vitruveTrace}`} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={47} />
        <g className={`${s.carre} ${s.anim}`}>
          <rect x={14} y={14} width={72} height={72} />
        </g>
      </svg>
    ),
  },
};

/**
 * Le sceau (ou la photo) dans son cadre : sans, au pinceau, de métal (gagné
 * aux questions), un cadre qui bouge (liquide, aura, dorure : CadreVivant),
 * ou un cadre dessiné (Codex, trophées, fil rouge : DECOR_CADRE).
 * `fige` : immobile (les vignettes de Personnaliser) ; `calme` : immobile
 * sur téléphone seulement (un cadre dessiné).
 */
export function CadreSceau({
  frame,
  name,
  avatarUrl,
  size = 120,
  className = "",
  fige = false,
  calme = false,
}: {
  frame: string;
  name: string;
  avatarUrl: string | null;
  size?: number;
  className?: string;
  fige?: boolean;
  calme?: boolean;
}) {
  const c = cadreDe(frame);
  const pad = Math.max(4, Math.round(size * 0.055));
  const vars: React.CSSProperties = { ["--pad" as string]: `${pad}px` };
  if (c.metal) Object.assign(vars, { ["--m0" as string]: c.metal[0], ["--m1" as string]: c.metal[1], ["--m2" as string]: c.metal[2] });
  const contenu = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt="" width={size} height={size} className={s.photo} style={{ width: size, height: size }} />
  ) : (
    <span className="inline-flex" style={{ width: size, height: size }}>
      <SceauPerso nom={name} taille={size} />
    </span>
  );
  if (estCadreDessine(frame)) {
    const d = DECOR_CADRE[frame];
    return (
      <span className={[s.cadre, s.dessine, d.classe, fige ? s.fige : "", calme ? s.calme : "", className].join(" ")} style={vars}>
        {d.decor()}
        {contenu}
      </span>
    );
  }
  if (c.anime)
    return (
      <CadreVivant cadre={c} cote={size + 2 * pad} fige={fige} className={className} style={vars}>
        {contenu}
      </CadreVivant>
    );
  return (
    <span className={[s.cadre, c.key === "pinceau" ? s.pinceau : c.metal ? s.metal : "", className].join(" ")} style={vars}>
      {contenu}
    </span>
  );
}

export const classesProfil = s;
