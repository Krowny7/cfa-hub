import { TrendingUp } from "lucide-react";
import { Sceau } from "@/components/classement/Encre";
import { fmtShortDate, signed } from "@/components/classement/format";
import { CL } from "@/lib/voice-classement";
import type { RatingEvent } from "@/lib/rating";
import s from "./Affronter.module.css";

// « Ta forme », à droite du titre de S'affronter : tes 5 dernières parties classées, la plus
// récente à droite (pleine : ELO gagné, vide : ELO perdu), et l'ELO qu'elles ont rapporté.
// Le détail reste sur la courbe d'ELO, plus bas.

const CASES = 5;

export function BandeForme({ history }: { history: RatingEvent[] }) {
  const parties = history.slice(-CASES);
  const net = parties.reduce((t, e) => t + e.delta, 0);
  const gains = parties.filter((e) => e.delta > 0).length;
  return (
    <section id="cl-forme" className={`${s.carte} ${s.bandeForme}`} aria-label={CL.formeAria(gains, parties.length, signed(net))}>
      <Sceau>
        <TrendingUp size={15} />
      </Sceau>
      <span className={s.formeTexte}>
        <b>{CL.forme}</b>
        <span>{CL.formeSous(parties.length)}</span>
      </span>
      <ol className={s.formeCases} aria-hidden>
        {parties.map((e) => (
          <li key={e.id} data-issue={e.delta > 0 ? "gain" : e.delta < 0 ? "perte" : "nul"} title={`${signed(e.delta)} ELO · ${fmtShortDate(e.createdAt)}`} />
        ))}
        {Array.from({ length: CASES - parties.length }, (_, i) => (
          <li key={i} />
        ))}
      </ol>
      {parties.length > 0 && (
        <strong className={s.formeNet}>
          {signed(net)} <small>ELO</small>
        </strong>
      )}
    </section>
  );
}
