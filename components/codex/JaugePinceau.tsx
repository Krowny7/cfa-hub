import { INK } from "@/components/ui/InkDefs";
import s from "./Encre.module.css";

// La jauge au pinceau du Codex, comme les mini-jauges des points faibles : le
// trait entier en filigrane, l'acquis repassé à l'encre (tracé partagé
// INK.swash, <use href>). `or` : une quête en cours (ocre).

export function JaugePinceau({ fraction, or = false, label, className = "" }: { fraction: number; or?: boolean; label?: string; className?: string }) {
  const pct = Math.max(4, Math.min(100, Math.round(fraction * 100)));
  return (
    <span role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} className={`${s.jauge} ${or ? s.or : ""} ${className}`}>
      <svg viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden className={s.jaugeFond}>
        <use href={INK.swash} fill="currentColor" />
      </svg>
      <span className={s.jaugeTrace} style={{ width: `${pct}%` }}>
        <svg viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden style={{ width: `${10000 / pct}%` }}>
          <use href={INK.swash} fill="currentColor" />
        </svg>
      </span>
    </span>
  );
}
