import { Clapperboard, ImageIcon } from "lucide-react";
import { VideoProfil } from "@/components/profil/VideoProfil";
import { genreMedia, type BlocCarte, type BlocMedia, type Format, type ImageHaut } from "@/lib/profil/disposition";
import { BLOCS_PROFIL as T } from "@/lib/voice-blocs";
import { DEUX_LIGNES, PAD } from "./commun";
import m from "./Medias.module.css";

// Les médias du joueur (image, GIF, vidéo), l'image en haut d'un module ou
// d'une carte, et la carte (un titre et quelques lignes du joueur), repris
// de BlocsProfil.tsx et étendus à la demi-bande. Aucune comparaison : c'est
// son entrée en scène, les vues sont identiques.
// - Image en demi-bande : une bannière pleine largeur, en cover, de 121 px
//   (la grille fixe la hauteur), cadrée par son point focal (--y) ; la
//   légende passe en infobulle et en aria-label.
// - GIF et vidéo : pas de demi-bande (FORMATS_PERMIS) ; reçus quand même,
//   ils se rendent comme en mini-tuile.
// - Vidéo : sans boutons ni son (VideoProfil) ; plus de surtitre « Vidéo ·
//   en boucle, sans le son » : il ne reste que la légende du joueur.
// - Carte en demi-bande : son image en vignette carrée de 88 px à gauche,
//   le titre (18 px), le texte sur une ligne (15 px, tronqué, en entier en
//   infobulle). Pas d'image en haut d'un module en demi-bande (refusée).
// Sans état : rendu au serveur comme au client.

const RATIO: Record<Format, string> = { tuile: "4 / 3", colonne: "3 / 4", heros: "2 / 1", bande: "3 / 1", demi: "4 / 1" };
const ratios = (tel: string, large: string) => ({ ["--r" as string]: tel, ["--rl" as string]: large }) as React.CSSProperties;

function Legende({ texte, icone }: { texte: string | null; icone: React.ReactNode }) {
  if (!texte) return null;
  return (
    <figcaption className="flex items-center gap-2.5 px-5 py-3.5">
      <span aria-hidden className="shrink-0 text-muted">
        {icone}
      </span>
      <span className="t-small min-w-0 flex-1" style={DEUX_LIGNES}>
        {texte}
      </span>
    </figcaption>
  );
}

/**
 * La couverture d'une vidéo (s) : celle choisie, sinon le milieu au demi
 * près (comme le curseur de l'éditeur), sinon 1 s (vidéos d'avant, sans durée).
 */
export const couvertureDe = (x: { couverture?: number; duree?: number }) => x.couverture ?? (x.duree ? Math.round(x.duree) / 2 : 1);

/** Un bloc média : l'image absorbe la hauteur ; le GIF reste net dans un passe-partout ; la vidéo remplit. */
export function MediaBloc({ m: media, f }: { m: BlocMedia; f: Format }) {
  const g = genreMedia(media);
  if (g === "gif")
    return (
      <figure className="card m-0 flex min-w-0 flex-col overflow-hidden">
        {/* passe-partout : le GIF net, à sa taille réelle (jamais agrandi) ; en fond, le même GIF flouté sous un voile qui suit le thème */}
        <div className={"relative grid flex-1 place-items-center overflow-hidden p-6 " + m.gifPasse} style={{ minHeight: 220 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media.url} alt="" aria-hidden className={m.gifFond} />
          <span aria-hidden className={m.gifVoile} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={media.url}
            alt={media.legende ?? T.gif}
            width={media.px}
            height={media.px ? Math.round(media.px / media.ratio) : undefined}
            className={"relative block h-auto max-w-full rounded-[10px] border border-line shadow-[var(--shadow-2)] " + m.nuitDoux + " " + m.gifNet}
            style={media.px ? { width: media.px, ["--px" as string]: `${media.px}px` } : undefined}
          />
        </div>
        <Legende texte={media.legende} icone={<ImageIcon size={15} />} />
      </figure>
    );
  if (g === "video") {
    const cote = f === "heros" || f === "bande";
    // l'image de couverture : celle qu'on voit avant la lecture (l'adresse enregistrée n'a jamais de « #t= »)
    const src = `${media.url}#t=${couvertureDe(media)}`;
    return (
      <figure className={"card m-0 flex min-w-0 overflow-hidden " + (cote ? "flex-col lg:flex-row" + (media.legende ? "" : " lg:justify-center") : "flex-col")}>
        <div className={m.absorbe + " bg-black " + m.nuitDoux + " " + (cote ? m.videoCote : "")} style={ratios("4 / 5", "4 / 5")}>
          <VideoProfil url={src} ratio={media.ratio} label={media.legende ?? T.video} />
        </div>
        {cote ? (
          // à côté : la légende du joueur, seule
          media.legende && (
            <figcaption className="flex flex-1 flex-col gap-2 p-6">
              <p className="m-0 text-[18px] font-bold leading-snug">{media.legende}</p>
            </figcaption>
          )
        ) : (
          <Legende texte={media.legende} icone={<Clapperboard size={15} />} />
        )}
      </figure>
    );
  }
  const y = media.y ?? 50;
  if (f === "demi")
    // la bannière : pleine largeur, en cover, cadrée par son point focal ; la légende en infobulle
    return (
      <figure className={"card m-0 min-w-0 overflow-hidden " + m.banniere} title={media.legende ?? undefined} aria-label={media.legende ?? T.image} style={{ ["--y" as string]: `${y}%` }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- image du joueur, préparée à l'envoi */}
        <img src={media.url} alt="" loading="lazy" decoding="async" className={m.nuitDoux} style={{ objectPosition: `50% ${y}%` }} />
      </figure>
    );
  return (
    <figure className="card m-0 flex min-w-0 flex-col overflow-hidden">
      <div className={m.absorbe + (f === "tuile" || f === "colonne" || f === "heros" ? " " + m.suit : "")} style={ratios("4 / 3", RATIO[f])}>
        {/* eslint-disable-next-line @next/next/no-img-element -- image du joueur, préparée à l'envoi */}
        <img src={media.url} alt={media.legende ?? T.image} loading="lazy" decoding="async" className={m.nuitDoux} style={{ objectPosition: `50% ${y}%` }} />
      </div>
      <Legende texte={media.legende} icone={<ImageIcon size={15} />} />
    </figure>
  );
}

// ── L'image en haut d'un module ou d'une carte ─────────────────────────────
/** son rapport : au téléphone 16:9 ; sur ordinateur, selon le format (la colonne, comme la Bibliothèque : 4:3) ; la demi-bande n'en a pas (refusée) */
const RATIO_HAUT: Record<Format, string> = { tuile: "16 / 9", colonne: "4 / 3", heros: "21 / 9", bande: "4 / 1", demi: "4 / 1" };

/**
 * Le média en haut : l'image à fond perdu (son cadrage) ; le GIF net à sa
 * taille réelle, dans un passe-partout (le même GIF flouté dessous, comme un
 * bloc GIF) ; la vidéo à fond perdu, en boucle et sans le son, sans bouton
 * (VideoProfil, sa couverture avant la lecture).
 */
export function ImageEnHaut({ img, f }: { img: ImageHaut; f: Format }) {
  const g = genreMedia(img);
  // le cadrage vertical (image et vidéo) : la vidéo le lit dans --y (VideoProfil ne prend pas de style)
  return (
    <div className={m.imageHaut} style={{ ...ratios("16 / 9", RATIO_HAUT[f]), ["--y" as string]: `${img.y ?? 50}%` }}>
      {g === "video" ? (
        <VideoProfil url={`${img.url}#t=${couvertureDe(img)}`} ratio={img.ratio} label={T.video} />
      ) : g === "gif" ? (
        <div className={m.gifHaut}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt="" aria-hidden decoding="async" className={m.gifFond} />
          <span aria-hidden className={m.gifVoile} />
          {/* net, entier : à sa taille réelle au plus, réduit (proportions gardées) s'il ne tient pas dans la place ;
              pas de chargement différé : sans taille avant d'être chargé, il ne serait jamais demandé */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img.url}
            alt=""
            decoding="async"
            className={"relative block h-auto rounded-[10px] border border-line " + m.nuitDoux}
            // la largeur qui tient dans la place (unités de conteneur : .gifHaut), sans dépasser la taille réelle
            style={{ width: `min(100cqw, ${img.px ? `${img.px}px, ` : ""}calc(100cqh * ${img.ratio}))` }}
          />
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- image du joueur, préparée à l'envoi
        <img src={img.url} alt="" loading="lazy" decoding="async" className={m.nuitDoux} style={{ objectPosition: `50% ${img.y ?? 50}%` }} />
      )}
    </div>
  );
}

/**
 * Un module sous son image : une seule carte, l'image à fond perdu en haut,
 * le module dessous (sa propre coque s'efface). En demi-bande, pas d'image
 * en haut (refusée) : le module seul.
 */
export function AvecImage({ img, f, children }: { img: ImageHaut; f: Format; children: React.ReactNode }) {
  if (f === "demi") return <>{children}</>;
  return (
    <div className="card flex min-w-0 flex-col overflow-hidden">
      <ImageEnHaut img={img} f={f} />
      <div className={"flex min-w-0 flex-col " + m.sousImage}>{children}</div>
    </div>
  );
}

// ── La carte : l'image en haut, un titre et quelques lignes du joueur ──────
export function CarteBloc({ c, f, edition }: { c: BlocCarte; f: Format; edition: boolean }) {
  const vide = !c.titre && !c.texte && !c.img;
  if (vide && !edition) return null;
  if (f === "demi") {
    // une ligne : la vignette carrée (une image ; une vidéo en haut refuse la demi-bande), le titre, le texte tronqué
    const vignette = c.img && c.img.type !== "video" ? c.img : null;
    return (
      <section aria-label={c.titre || T.carte} className={"card min-w-0 overflow-hidden " + PAD.demi + " " + m.carteDemi}>
        {vignette && (
          <span className={m.vignette} aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element -- image du joueur, préparée à l'envoi */}
            <img src={vignette.url} alt="" loading="lazy" decoding="async" className={m.nuitDoux} style={{ objectPosition: `50% ${vignette.y ?? 50}%` }} />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {c.titre && <h3 className={"font-brand m-0 truncate " + m.titreDemi}>{c.titre}</h3>}
          {c.texte && (
            <p className={"m-0 truncate " + m.texteDemi} title={c.texte}>
              {c.texte}
            </p>
          )}
          {vide && (
            <p className="t-small m-0 truncate" title={T.carteVide}>
              {T.carteVide}
            </p>
          )}
        </div>
      </section>
    );
  }
  return (
    <section aria-label={c.titre || T.carte} className={(f === "tuile" && !c.img ? "card-quiet " : "card ") + "flex min-w-0 flex-col overflow-hidden"}>
      {c.img && <ImageEnHaut img={c.img} f={f} />}
      <div className={"flex min-w-0 flex-col gap-2 " + PAD[f]}>
        {c.titre && <h3 className={"font-brand m-0 " + m.titreCarte}>{c.titre}</h3>}
        {c.texte && <p className={"t-small m-0 " + m.texteCarte}>{c.texte}</p>}
        {vide && <p className="t-small m-0">{T.carteVide}</p>}
      </div>
    </section>
  );
}
