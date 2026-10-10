import { INK } from "@/components/ui/InkDefs";
import { SceauPerso } from "@/components/adn/SceauPerso";
import { CadreVivant } from "@/components/profil/CadreVivant";
import { cadreDe, couleurCss, type StyleProfil } from "@/lib/profil/catalogue";
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
};
/** les taches de l'Encre vivante : où elles naissent, leur angle, leur décalage dans la boucle */
const TACHES = [
  { l: "8%", t: "-28%", r: "0deg", d: "0s" },
  { l: "38%", t: "18%", r: "70deg", d: "-2.5s" },
  { l: "66%", t: "-36%", r: "150deg", d: "-5s" },
  { l: "88%", t: "22%", r: "220deg", d: "-7.5s" },
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
          <span key={t.l} className={s.tache} style={{ left: t.l, top: t.t, ["--r" as string]: t.r, animationDelay: t.d }}>
            <svg viewBox="0 0 100 100">
              <g filter={INK.tache} fill="currentColor">
                <circle cx="50" cy="50" r="34" opacity=".45" />
                <circle cx="47" cy="52" r="17" />
              </g>
            </svg>
          </span>
        ))
      ) : banner === "or-vivant" ? (
        <span className={s.refletOr} />
      ) : null}
    </div>
  );
}

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

/**
 * Le sceau (ou la photo) dans son cadre : sans, au pinceau, de métal (gagné
 * aux questions), ou un cadre qui bouge (liquide, aura, dorure : CadreVivant).
 * `fige` : immobile (les vignettes de Personnaliser).
 */
export function CadreSceau({ frame, name, avatarUrl, size = 120, className = "", fige = false }: { frame: string; name: string; avatarUrl: string | null; size?: number; className?: string; fige?: boolean }) {
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
