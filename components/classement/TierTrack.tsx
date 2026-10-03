import { Lock } from "lucide-react";
import { RankBadge } from "@/components/ui/RankBadge";
import { TIERS } from "@/lib/ranks";
import { tierRange } from "@/components/classement/format";

// Piste des 8 paliers (contenu du volet « Les 8 rangs ») : seuils d'ELO,
// verrous de maîtrise (Diamant et au-delà), palier actuel marqué « toi »,
// paliers à venir en filigrane.
export function TierTrack({ current, mastery, placement }: { current: number; mastery: number; placement: boolean }) {
  return (
    <ol aria-label="Les paliers" className="grid grid-cols-4 gap-x-2 gap-y-7 md:grid-cols-8">
      {TIERS.map((t, i) => {
        const here = i === current && !placement;
        const ahead = placement || i > current;
        const locked = t.lock !== null && mastery < t.lock;
        return (
          <li key={t.key} className="flex flex-col items-center gap-1 text-center" aria-current={here ? "true" : undefined}>
            <span className="flex h-[58px] items-end">
              <RankBadge tier={i} size={here ? 56 : 46} glow={false} gray={ahead} />
            </span>
            <span className={"mt-1 text-[13px] leading-tight " + (here ? "font-extrabold" : "font-semibold")}>{t.name}</span>
            {here ? (
              <span className="rounded-[7px] bg-white px-1.5 py-px text-[11px] font-bold text-black">toi</span>
            ) : (
              <span className="font-mono text-[11px] leading-tight text-muted">{tierRange(i)}</span>
            )}
            {t.lock !== null && (
              <span className={"inline-flex items-center gap-1 whitespace-nowrap text-[11px] leading-tight " + (locked ? "font-semibold text-white" : "text-muted")} title={`Maîtrise d'au moins ${t.lock} %`}>
                {locked && <Lock size={10} aria-hidden />}
                <span className="sr-only sm:not-sr-only">maîtrise</span> {t.lock}{" "}%
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
