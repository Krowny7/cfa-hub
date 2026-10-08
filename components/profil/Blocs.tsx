import Link from "next/link";
import { ImagePlus } from "lucide-react";
import { VideoProfil } from "@/components/profil/VideoProfil";
import { CASE_VIDE } from "@/lib/voice-profil";
import { GRILLE, placeDe } from "@/components/profil/Rangees";
import { estMedia, largeurMedia, type Bloc, type BlocMedia, type CleBloc, type Disposition } from "@/lib/profil/disposition";

// Le corps du profil, sous l'en-tête : les rangées choisies par le joueur,
// chacune selon son modèle (pleine largeur, deux moitiés, deux tiers et un
// tiers, un grand et deux empilés…), une case par bloc. Sur téléphone, les
// cases passent l'une sous l'autre, dans l'ordre. Chaque case est un
// conteneur (@container) : les blocs suivent sa largeur, pas celle de
// l'écran. Une case vide ou un bloc sans contenu garde sa place sur grand
// écran (rien ne bouge) et disparaît sur téléphone ; une rangée sans rien à
// montrer est sautée. `caseVide` : ce qu'on pose dans une case vide (sur
// son propre profil : « ajoute une image »). Sans état.

export function GrilleBlocs({
  disposition,
  rendus,
  caseVide = null,
}: {
  disposition: Disposition;
  rendus: Partial<Record<CleBloc, React.ReactNode>>;
  caseVide?: React.ReactNode;
}) {
  const contenu = (b: Bloc | null) => (!b ? null : estMedia(b) ? <MediaProfil b={b} /> : (rendus[b.k] ?? null));
  const rangees = disposition.map((r) => ({ r, contenus: r.c.map(contenu) })).filter((x) => x.contenus.some(Boolean));
  if (!rangees.length) return null;
  return (
    <div className="flex flex-col gap-y-10 md:gap-y-16">
      {rangees.map(({ r, contenus }, k) => (
        <div key={k} className={`grid items-start gap-x-8 gap-y-10 lg:gap-y-8 ${GRILLE[r.m]}`}>
          {contenus.map((n, i) => {
            const b = r.c[i];
            return n ? (
              <div key={b ? (estMedia(b) ? b.id : b.k) : `v${i}`} className={`@container min-w-0 ${placeDe(r.m, i)}`}>
                {n}
              </div>
            ) : !b && caseVide ? (
              <div key={`v${i}`} className={`@container min-w-0 ${placeDe(r.m, i)}`}>
                {caseVide}
              </div>
            ) : (
              <div key={`v${i}`} aria-hidden className={`hidden lg:block ${placeDe(r.m, i)}`} />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** La case vide de son propre profil : un pointillé qui mène à l'éditeur. */
export function CaseImage({ href }: { href: string }) {
  return (
    <Link href={href} className="flex min-h-[180px] flex-col items-center justify-center gap-2 rounded-[18px] border border-dashed border-line-2 p-6 text-center text-muted transition-colors hover:border-white hover:text-white">
      <ImagePlus size={22} aria-hidden />
      <span className="text-[14px] font-semibold">{CASE_VIDE.titre}</span>
      <span className="t-micro max-w-[240px]">{CASE_VIDE.texte}</span>
    </Link>
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
