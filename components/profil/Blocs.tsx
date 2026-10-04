import { estMedia, type BlocMedia, type CleBloc, type Disposition } from "@/lib/profil/disposition";

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
 * Une image ou une vidéo du joueur : à sa proportion (la place est réservée
 * avant le chargement), 640 px de haut au plus. La vidéo tourne en boucle,
 * sans le son (les commandes permettent de le mettre).
 */
export function MediaProfil({ b }: { b: BlocMedia }) {
  const w = 1200;
  const h = Math.round(w / b.ratio);
  const alt = b.legende ?? (b.type === "image" ? "Image du joueur" : "Vidéo du joueur");
  return (
    <figure className="m-0 flex flex-col gap-2.5">
      <div className="card grid place-items-center overflow-hidden bg-[var(--well)]">
        {b.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- image du joueur, déjà réduite à l'envoi
          <img src={b.url} alt={alt} width={w} height={h} loading="lazy" decoding="async" className="block h-auto max-h-[640px] w-full object-contain" />
        ) : (
          <video src={b.url} aria-label={alt} width={w} height={h} autoPlay muted loop playsInline controls preload="metadata" className="block h-auto max-h-[640px] w-full bg-black object-contain" />
        )}
      </div>
      {b.legende && <figcaption className="t-small px-1">{b.legende}</figcaption>}
    </figure>
  );
}
