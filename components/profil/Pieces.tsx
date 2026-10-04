import { INK } from "@/components/ui/InkDefs";
import { SceauPerso } from "@/components/adn/SceauPerso";
import { cadreDe, couleurCss } from "@/lib/profil/catalogue";
import s from "./Profil.module.css";

// Les pièces du profil, sans état (serveur comme client, aperçu de
// l'éditeur compris) : la bannière (image du joueur, ou motif) et le sceau
// dans son cadre.

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
};

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
}: {
  banner: string;
  bannerUrl?: string | null;
  bannerPos?: number;
  accent: string;
  className?: string;
}) {
  return (
    <div className={`${s.banniere} ${bannerUrl ? s.image : MOTIF_CLASSE[banner] ?? ""} ${className}`} style={styleAccent(accent)} aria-hidden>
      {bannerUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bannerUrl} alt="" className={s.photoBanniere} style={{ objectPosition: `50% ${bannerPos}%` }} />
      ) : (
        banner === "enso" && (
          <svg className={s.ensoSvg} viewBox="-12 -12 264 264">
            <use href={INK.ring} fill="currentColor" />
          </svg>
        )
      )}
    </div>
  );
}

/** Le sceau (ou la photo) dans son cadre : sans, au pinceau, ou de métal (gagné aux questions). */
export function CadreSceau({ frame, name, avatarUrl, size = 120, className = "" }: { frame: string; name: string; avatarUrl: string | null; size?: number; className?: string }) {
  const c = cadreDe(frame);
  const pad = Math.max(4, Math.round(size * 0.055));
  const cls = [s.cadre, c.key === "pinceau" ? s.pinceau : c.metal ? s.metal : "", className].join(" ");
  const vars: React.CSSProperties = { ["--pad" as string]: `${pad}px` };
  if (c.metal) Object.assign(vars, { ["--m0" as string]: c.metal[0], ["--m1" as string]: c.metal[1], ["--m2" as string]: c.metal[2] });
  return (
    <span className={cls} style={vars}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" width={size} height={size} className={s.photo} style={{ width: size, height: size }} />
      ) : (
        <span className="inline-flex" style={{ width: size, height: size }}>
          <SceauPerso nom={name} taille={size} />
        </span>
      )}
    </span>
  );
}

export const classesProfil = s;
