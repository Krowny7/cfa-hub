import { Trophy } from "lucide-react";
import { trophyTier, TROPHY_TIER_ORDER } from "@/lib/practiceTopics";

type Row = { topic_count: number; trophy_count: number };

// Sans couleur, les paliers se lisent au dessin : contour fin (bronze),
// contour épais (argent), trophée plein (or), case inversée à l'encre (diamant).
function TierIcon({ tier }: { tier: string }) {
  if (tier === "gold" || tier === "diamond") return <Trophy size={26} strokeWidth={1.6} fill="currentColor" />;
  return <Trophy size={26} strokeWidth={tier === "silver" ? 2.6 : 1.4} />;
}

export function PracticeTrophies({ rows }: { rows: Row[] }) {
  const byTier = new Map(TROPHY_TIER_ORDER.map((t) => [t.key, 0]));
  for (const r of rows) {
    const tier = trophyTier(r.topic_count);
    byTier.set(tier.key, (byTier.get(tier.key) ?? 0) + r.trophy_count);
  }
  const total = [...byTier.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="card p-5">
      <h2 className="panel-label mb-4 w-fit">Trophées · entraînement ciblé</h2>
      {total === 0 ? (
        <p className="note text-white/60">
          aucun trophée encore — un trophée s&apos;obtient en réussissant (≥ 70 %) une session d&apos;entraînement ciblé.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TROPHY_TIER_ORDER.map((tier) => {
            const count = byTier.get(tier.key) ?? 0;
            const inverted = tier.key === "diamond" && count > 0;
            return (
              <div
                key={tier.key}
                className={`flex flex-col items-center gap-1.5 rounded-[3px] border-2 p-3 ${
                  count === 0 ? "border-white/20 opacity-45" : inverted ? "border-white bg-white text-black" : "border-white"
                }`}
              >
                <TierIcon tier={tier.key} />
                <span className="font-display text-xl tabular-nums leading-none">{count}</span>
                <span className={`text-[11px] font-bold ${inverted ? "" : "text-white/60"}`}>{tier.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
