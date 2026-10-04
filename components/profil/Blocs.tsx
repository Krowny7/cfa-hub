import { VideoProfil } from "@/components/profil/VideoProfil";
import { estMedia, largeurMedia, type BlocMedia, type CleBloc, type Disposition } from "@/lib/profil/disposition";

// Le corps du profil, sous l'en-tête : les blocs dans l'ordre choisi par le
// joueur, chacun sur toute la ligne ou sur une demi-ligne (côte à côte sur
// grand écran, l'un sous l'autre sur téléphone). Chaque case est un
// conteneur (@container) : les blocs adaptent leur mise en page à leur
// largeur, pas à celle de l'écran. Un bloc sans contenu (pas d'amis, pas
// encore de réponses…) est simplement sauté. Sans état.

export function GrilleBlocs({ disposition, rendus }: { disposition: Disposition; rendus: Partial<Record<CleBloc, React.ReactNode>> }) {
  const blocs = disposition.filter((b) => estMedia(b) || !!rendus[b.k]);
  if (!blocs.length) return null;
  return (
    <div className="grid items-start gap-x-8 gap-y-10 md:gap-y-16 lg:grid-cols-2">
      {blocs.map((b) => (
        <div key={estMedia(b) ? b.id : b.k} className={"@container min-w-0 " + (b.w === "plein" ? "lg:col-span-2" : "")}>
          {estMedia(b) ? <MediaProfil b={b} /> : rendus[b.k]}
        </div>
      ))}
    </div>
  );
}

/**
 * Une image, un GIF ou la vidéo du joueur, à la taille choisie (petite,
 * moyenne, grande : largeurMedia), centrée dans son bloc ; le cadre épouse
 * le média (pas de bandes vides autour), la place est réservée avant le
 * chargement, et un GIF n'est jamais agrandi au-delà de sa taille réelle
 * (il deviendrait flou).
 */
export function MediaProfil({ b }: { b: BlocMedia }) {
  const w = 1200;
  const h = Math.round(w / b.ratio);
  const alt = b.legende ?? (b.type === "video" ? "Vidéo du joueur" : "Image du joueur");
  const largeur = largeurMedia(b);
  return (
    <figure className="m-0 mx-auto flex w-full flex-col gap-2.5" style={largeur ? { maxWidth: largeur } : undefined}>
      <div className="card overflow-hidden">
        {b.type === "video" ? (
          <VideoProfil url={b.url} ratio={b.ratio} label={alt} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- image du joueur, préparée à l'envoi
          <img src={b.url} alt={alt} width={w} height={h} loading="lazy" decoding="async" className="block h-auto w-full" />
        )}
      </div>
      {b.legende && <figcaption className="t-small px-1">{b.legende}</figcaption>}
    </figure>
  );
}
