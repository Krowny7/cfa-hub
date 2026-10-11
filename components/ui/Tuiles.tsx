import { Illustration } from "@/components/ui/Illustration";
import type { IllustrationNom } from "@/lib/illustrations";

// Petites briques de mise en page partagées par les pages refaites : la
// tuile calme (icône, titre, une ligne forte, une ligne de détail, l'action),
// le médaillon peint, le sceau d'une carte « lieu » et le bandeau peint
// étroit. Sans état.

/** La tuile calme : étiquette (icône, titre, repère à droite), une ligne forte, un détail, puis l'action. */
export function TuileCalme({
  icone,
  titre,
  droite,
  fort,
  ligne,
  actions,
  label,
  dataLeonard,
  className = "",
}: {
  icone: React.ReactNode;
  titre: string;
  /** petit repère à droite du titre (« 1 en attente », « 14 j ») */
  droite?: React.ReactNode;
  /** la ligne forte (« Karim H. n'a pas encore joué »), éventuellement précédée d'un médaillon */
  fort?: React.ReactNode;
  ligne: React.ReactNode;
  actions: React.ReactNode;
  label?: string;
  dataLeonard?: string;
  className?: string;
}) {
  return (
    <section data-leonard={dataLeonard} className={"card-quiet flex min-w-0 flex-col gap-3 p-5 md:p-6 " + className} aria-label={label ?? titre}>
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-surface">
          {icone}
        </span>
        <h3 className="m-0 flex-1 text-[16px] font-bold tracking-[-0.01em]">{titre}</h3>
        {droite}
      </div>
      {fort && <p className="m-0 text-[18px] font-bold leading-snug tracking-[-0.01em]">{fort}</p>}
      <p className="t-small m-0">{ligne}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">{actions}</div>
    </section>
  );
}

/** Médaillon rond peint (52 px par défaut), cerclé d'un trait : une illustration de lib/illustrations.ts. */
export function Medaillon({ nom, position = "center", taille = 52 }: { nom: IllustrationNom; position?: string; taille?: number }) {
  return (
    <span aria-hidden className="block shrink-0 overflow-hidden rounded-full border border-line-2 bg-surface-2" style={{ width: taille, height: taille }}>
      <Illustration nom={nom} position={position} decorative />
    </span>
  );
}

/** La marque d'une carte « lieu » : un sceau rond à l'encre brune, l'icône au centre. */
export function Sceau({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="grid size-[26px] shrink-0 place-items-center rounded-full lg:size-[40px]"
      style={{ background: "var(--atelier-brun)", color: "var(--paper)", boxShadow: "inset 0 0 0 2px var(--atelier-brun), inset 0 0 0 3.2px var(--paper)" }}
    >
      {children}
    </span>
  );
}

/** Bandeau peint étroit, pleine largeur du parent (64 px sur téléphone, 88 px dès 768 px). */
export function BandeauPeint({ nom, position = "50% 50%", className = "" }: { nom: IllustrationNom; position?: string; className?: string }) {
  return (
    <div className={"h-16 w-full overflow-hidden rounded-[14px] md:h-[88px] md:rounded-[18px] " + className}>
      <Illustration nom={nom} position={position} decorative />
    </div>
  );
}
