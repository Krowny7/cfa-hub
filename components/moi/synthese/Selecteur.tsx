import { PAL } from "@/components/moi/synthese/Encre";
import { EncreVive } from "@/components/nav/EncreVive";
import s from "@/components/moi/synthese/Synthese.module.css";

// Le sélecteur de la page Moi « La synthèse » : un groupe de boutons à choix
// unique (role="group", aria-pressed), jamais un menu. SEULE l'option active
// reçoit le vrai liquide de la palette (rl-encre + data-palette + EncreVive,
// comme les onglets de S'affronter) ; les autres restent des aplats clairs.
//   - « segment » : une pastille grise qui contient les options (ordinateur) ;
//   - « etroit »  : segment sur ordinateur, puces défilantes au téléphone ;
//   - « puces »   : toujours des puces (la superposition de « Ta progression »).
// Sans hook : l'état vit chez l'appelant (un îlot client).

export type OptionSelecteur<T extends string | number> = { cle: T; libelle: string };

const classes = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Selecteur<T extends string | number>({
  label,
  options,
  valeur,
  onChoisir,
  mode = "segment",
  className,
}: {
  label: string;
  options: readonly OptionSelecteur<T>[];
  valeur: T;
  onChoisir: (cle: T) => void;
  mode?: "segment" | "etroit" | "puces";
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={classes(s.seg, mode === "etroit" && s.segEtroit, mode === "puces" && s.segPuces, className)}>
      {options.map((o) => {
        const on = o.cle === valeur;
        return (
          <button key={String(o.cle)} type="button" aria-pressed={on} className={classes(s.opt, on && "rl-encre", on && s.encre)} data-palette={on ? PAL.key : undefined} onClick={() => onChoisir(o.cle)}>
            {on && <EncreVive tons={PAL.liquide} />}
            {o.libelle}
          </button>
        );
      })}
    </div>
  );
}
