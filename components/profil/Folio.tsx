import { INK } from "@/components/ui/InkDefs";

// Un folio : une planche du carnet de Léonard (un dessin du domaine public),
// gagnée à un acte clos ou à un « Maître de… » (lib/profil/pieces.ts).
// Tant que son image manque (public/folios), une carte « papier » : le nom
// de l'œuvre à la plume et un trait de pinceau, jamais d'image cassée.
// Sans état (serveur comme client) : l'étagère « Mes pièces », sa feuille,
// et le bloc « Folio » de la page de profil.

export type DonneesFolio = { nom: string; oeuvre: string; image: string | null; anecdote: [string, string] };

/** La planche seule, au format 3 × 4 ; `silhouette` : pas encore gagnée (grisée). */
export function CarteFolio({ f, silhouette = false, className = "" }: { f: Pick<DonneesFolio, "oeuvre" | "image">; silhouette?: boolean; className?: string }) {
  return (
    <span
      className={`relative block aspect-[3/4] w-full overflow-hidden rounded-[10px] [container-type:inline-size] border border-line bg-[color-mix(in_oklab,#c9a66b_14%,var(--surface))] ${silhouette ? "opacity-35 grayscale" : ""} ${className}`}
      aria-hidden
    >
      {f.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={f.image} alt="" width={600} height={800} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-[10%] text-center">
          <span className="font-brand text-[clamp(12px,9cqw,22px)] leading-tight text-[color-mix(in_oklab,#7a4a26_75%,var(--ink))]">{f.oeuvre}</span>
          <svg viewBox="0 0 400 64" className="w-[62%] text-[color-mix(in_oklab,#7a4a26_55%,transparent)]">
            <use href={INK.swash} fill="currentColor" />
          </svg>
        </span>
      )}
    </span>
  );
}

/** Le bloc « Folio » du profil : la planche portée, son nom et son anecdote. */
export function BlocFolio({ f }: { f: DonneesFolio }) {
  return (
    <figure className="m-0 grid items-start gap-4 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]">
      <CarteFolio f={f} className="max-w-[220px]" />
      <figcaption className="flex min-w-0 flex-col gap-1.5">
        <span className="t-eyebrow">Folio</span>
        <span className="t-h3 m-0">{f.nom}</span>
        {f.nom !== f.oeuvre && <span className="t-small m-0 italic">{f.oeuvre}</span>}
        {f.anecdote.filter(Boolean).map((ligne) => (
          <span key={ligne} className="t-small m-0 block">
            {ligne}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
