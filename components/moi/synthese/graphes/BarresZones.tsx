import { Piste } from "@/components/moi/synthese/graphes/Piste";
import type { LigneBarre } from "@/components/moi/synthese/modele";
import { pc } from "@/components/moi/synthese/modele";
import s from "@/components/moi/synthese/Synthese.module.css";

// Les barres de « Tes matières » : une ligne par matière (nom et poids, piste de
// zones, valeur, écart face à la date comparée), un clic ouvre la fiche. Le
// repère violet marque la maîtrise à la date comparée. Rendu neutre, aucun hook.

const TON = { pos: s.pos, neg: s.neg, nul: s.nul } as const;

export function BarresZones({ lignes, onChoisir }: { lignes: LigneBarre[]; onChoisir: (i: number) => void }) {
  return (
    <>
      <div className={s.barres}>
        {lignes.map((l) => (
          <button
            key={l.i}
            type="button"
            className={[s.bl, l.on ? s.blOn : null, l.off ? s.blOff : null].filter(Boolean).join(" ")}
            aria-pressed={l.on}
            aria-label={l.aria}
            title={l.info ?? undefined}
            onClick={() => onChoisir(l.i)}
          >
            <span className={s.bnom} aria-hidden>
              <b>{l.court}</b>
              <span>{l.sous}</span>
            </span>
            <Piste w={l.w} ton={l.ton} repere={l.repere} vide={l.nonMesuree} />
            <span className={s.mono + " " + s.bval} aria-hidden>
              {l.valeur}
            </span>
            <span className={l.ecart ? TON[l.ecart.ton] + " " + s.becart : s.becart} aria-hidden>
              {l.ecart?.texte}
            </span>
          </button>
        ))}
      </div>
      <div className={s.axeLigne} aria-hidden>
        <span />
        <span className={s.axe}>
          <span style={{ left: "0%", transform: "none" }}>0</span>
          <span style={{ left: "50%" }}>50</span>
          <span className={s.axeSeuil} style={{ left: "70%" }}>
            70
          </span>
          <span style={{ left: "100%", transform: "translateX(-100%)" }}>{pc(100)}</span>
        </span>
        <span />
        <span />
      </div>
    </>
  );
}
