import type { ChiffresObjectif } from "@/components/moi/synthese/modele";
import { SYN } from "@/lib/voice-moi";
import s from "@/components/moi/synthese/Synthese.module.css";

// « Ta quête du jour » : le nombre de questions faites aujourd'hui sur
// l'objectif du jour, en pastilles jusqu'à 24 (une par question), en barre
// au-delà. Aplats noirs, aucun liquide. Rendu serveur, aucun hook.

export function Quete({ c, jour }: { c: ChiffresObjectif; /** questions faites aujourd'hui */ jour: number }) {
  if (!c.quete) return null;
  const aria = SYN.obj.queteAria(Math.min(jour, c.quotidien), c.quotidien);
  return (
    <div className={s.quete}>
      <span className={s.queteTete}>
        <b>{SYN.obj.quete}</b>
        <span className={s.mono}>{SYN.obj.queteValeur(Math.min(jour, c.quotidien), c.quotidien, c.resteJour)}</span>
      </span>
      {c.quete.mode === "pastilles" ? (
        <span className={s.pastilles} role="img" aria-label={aria}>
          {Array.from({ length: c.quete.n }, (_, i) => (
            <i key={i} className={[s.pip, i < (c.quete as { on: number }).on ? s.pipOn : ""].filter(Boolean).join(" ")} />
          ))}
        </span>
      ) : (
        <span className={s.piste} role="img" aria-label={aria}>
          <i style={{ width: `${c.quete.pct}%` }} />
        </span>
      )}
    </div>
  );
}
