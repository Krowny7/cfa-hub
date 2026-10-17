import { ChevronRight, Trophy } from "lucide-react";
import { PALIERS_TROPHEE, nomPalier, tableauSalle, type CompteTrophees, type LigneTrophee, type PalierTrophee, type SourceTrophee } from "@/lib/trophees";
import { nombre } from "@/lib/voice";

// La Salle des trophées (V3 §2.7) : le résumé visible (les quatre paliers et
// leur nombre), le détail à la demande (« Par source » : une ligne par source,
// sa règle en infobulle). Sans couleur, les paliers se lisent au dessin :
// contour fin (bronze), contour épais (argent), trophée plein (or), case
// inversée à l'encre (diamant). Sans hook : rendu côté serveur (Moi, profil)
// comme côté client ; il ne lit que les données du compte (lignes,
// parPalier, total), jamais sa fonction auMoins.
//
//   <SalleDesTrophees compte={await lireTrophees(supabase, id)} complet={…} />
//
// Props
//   compte    le compte (lib/trophees : compter, lireTrophees)
//   complet   false : seul l'entraînement ciblé est compté (repli sans
//             migration_v3_profil.sql §2) ; le détail n'a que lui, et une
//             ligne dit que les autres arrivent
//   compact   le résumé sur une ligne, sans cases (pour une place étroite)
//   sources   les sources du détail (toutes par défaut)
//   moi       false : la Salle d'un autre joueur (l'invitation du vide se tait)
//   titre     « Salle des trophées » par défaut

/** Le dessin d'un palier : contour fin, contour épais, plein (or et diamant). */
export function DessinTrophee({ palier, taille = 22 }: { palier: PalierTrophee; taille?: number }) {
  if (palier >= 3) return <Trophy size={taille} strokeWidth={1.6} fill="currentColor" aria-hidden />;
  return <Trophy size={taille} strokeWidth={palier === 2 ? 2.6 : 1.4} aria-hidden />;
}

/** Un palier dans une petite case (le diamant, gagné, en case inversée). */
export function CaseTrophee({ palier, gagne = true, taille = 16, className = "" }: { palier: PalierTrophee; gagne?: boolean; taille?: number; className?: string }) {
  return (
    <span aria-hidden className={"grid shrink-0 place-items-center rounded-[9px] " + (palier === 4 && gagne ? "bg-white text-black" : "bg-surface-2") + " " + className}>
      <DessinTrophee palier={palier} taille={taille} />
    </span>
  );
}

/**
 * « Par source » : le détail à la demande de la Salle (une ligne par source,
 * la règle de chaque palier en infobulle). Sur le repli (`complet` faux),
 * seules les sources vraiment comptées (l'entraînement ciblé). Aussi au pied
 * du bloc « Trophées » de la page de profil.
 */
export function ParSource({ lignes, complet, sources, className = "mt-4" }: { lignes: LigneTrophee[]; complet: boolean; sources?: readonly SourceTrophee[]; className?: string }) {
  const detail = tableauSalle(lignes, sources ?? (complet ? undefined : ["ciblee"]));
  return (
    <details className={"group/s " + className}>
      <summary className="inline-flex min-h-[44px] cursor-pointer list-none items-center gap-1.5 text-[13px] font-semibold text-muted transition-colors hover:text-white md:min-h-0 [&::-webkit-details-marker]:hidden">
        <ChevronRight size={14} aria-hidden className="transition-transform group-open/s:rotate-90 motion-reduce:transition-none" />
        Par source
      </summary>
      <div className="mt-2">
        <div className="grid grid-cols-[minmax(0,1fr)_repeat(4,36px)] items-center gap-x-1 px-2 pb-1.5 text-muted" aria-hidden>
          <span className="t-micro">Source</span>
          {PALIERS_TROPHEE.map(({ palier }) => (
            <span key={palier} className="grid place-items-center" title={nomPalier(palier)}>
              <DessinTrophee palier={palier} taille={14} />
            </span>
          ))}
        </div>
        <ul className="m-0 list-none divide-y divide-line p-0">
          {detail.map((l) => {
            const regles = l.cases.filter((c) => c.regle).map((c) => `${nomPalier(c.palier)} : ${c.regle}`);
            const nombres = l.cases.filter((c) => c.n !== null).map((c) => `${c.n} ${nomPalier(c.palier).toLowerCase()}`);
            return (
              <li
                key={l.source}
                tabIndex={0}
                aria-label={`${l.nom} : ${nombres.join(", ")}. ${regles.join(". ")}.`}
                className="group/l relative grid cursor-help grid-cols-[minmax(0,1fr)_repeat(4,36px)] items-center gap-x-1 rounded-[8px] px-2 py-2 outline-none transition-colors hover:bg-surface-2 focus:bg-surface-2"
              >
                <span className="truncate text-[13.5px] font-semibold" aria-hidden>
                  {l.nom}
                </span>
                {l.cases.map((c) => (
                  <span key={c.palier} aria-hidden className={"text-center text-[13.5px] tabular-nums " + (c.n ? "font-semibold" : "text-muted")}>
                    {c.n === null ? "·" : c.n}
                  </span>
                ))}
                <span
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-2 z-20 mb-1.5 w-max max-w-[min(300px,calc(100%-16px))] translate-y-1 rounded-[10px] border border-line-2 bg-surface px-3 py-2 text-[12px] leading-snug opacity-0 shadow-[var(--shadow-2)] transition-[opacity,transform] duration-150 group-hover/l:translate-y-0 group-hover/l:opacity-100 group-focus/l:translate-y-0 group-focus/l:opacity-100 motion-reduce:transition-none"
                >
                  <span className="block font-semibold text-white">{l.nom}</span>
                  {regles.map((r) => (
                    <span key={r} className="block text-muted">
                      {r}
                    </span>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}

export function SalleDesTrophees({
  compte,
  complet,
  compact = false,
  sources,
  moi = true,
  titre = "Salle des trophées",
}: {
  compte: CompteTrophees;
  complet: boolean;
  compact?: boolean;
  sources?: readonly SourceTrophee[];
  moi?: boolean;
  titre?: string;
}) {
  const { total, parPalier } = compte;

  return (
    // @container : la grille des paliers suit la largeur du bloc (case du profil, page…)
    <section className={"card @container min-w-0 " + (compact ? "p-4 md:p-5" : "p-5 md:p-7")} aria-label={titre}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="t-h3 m-0">{titre}</h2>
        {total > 0 && <span className="t-micro tabular-nums">{nombre(total)} trophée{total > 1 ? "s" : ""}</span>}
      </div>

      {total === 0 ? (
        <p className="t-small m-0 mt-3">
          {moi
            ? complet
              ? "Aucun trophée pour l'instant : 5/5 aux 5 du jour, ou une séance d'entraînement ciblé réussie à 70 %, et le premier est à toi."
              : "Aucun trophée pour l'instant : réussis une séance d'entraînement ciblé à 70 % pour gagner le premier."
            : "Aucun trophée pour l'instant."}
        </p>
      ) : compact ? (
        <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-5 gap-y-2 p-0">
          {PALIERS_TROPHEE.map(({ palier, nom }) => (
            <li key={palier} className={"flex items-center gap-2 " + (parPalier[palier] === 0 ? "opacity-50" : "")}>
              <CaseTrophee palier={palier} gagne={parPalier[palier] > 0} className="h-8 w-8" />
              <span className="t-num text-[18px] tabular-nums">{parPalier[palier]}</span>
              <span className="text-[13px] font-semibold">{nom}</span>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="m-0 mt-5 grid list-none grid-cols-2 gap-2.5 p-0 @lg:grid-cols-4">
          {PALIERS_TROPHEE.map(({ palier, nom }) => {
            const n = parPalier[palier];
            const inverse = palier === 4 && n > 0;
            return (
              <li
                key={palier}
                className={"flex flex-col items-start gap-3 rounded-[14px] p-4 " + (inverse ? "bg-white text-black" : "card-quiet") + (n === 0 ? " opacity-50" : "")}
              >
                <DessinTrophee palier={palier} />
                <div>
                  <span className="t-num block text-[26px] tabular-nums">{n}</span>
                  <span className="mt-1.5 block text-[13px] font-semibold">{nom}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* le détail à la demande : par source, la règle de chaque palier en infobulle */}
      <ParSource lignes={compte.lignes} complet={complet} sources={sources} />
      {!complet && <p className="t-micro m-0 mt-1">Les autres trophées arrivent avec la prochaine mise à jour.</p>}
    </section>
  );
}
