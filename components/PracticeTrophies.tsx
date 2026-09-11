import { Trophy } from "lucide-react";
import { trophyTier, TROPHY_TIER_ORDER } from "@/lib/practiceTopics";

type Row = { topic_count: number; trophy_count: number };

export function PracticeTrophies({ rows }: { rows: Row[] }) {
  const byTier = new Map(TROPHY_TIER_ORDER.map((t) => [t.key, 0]));
  for (const r of rows) {
    const tier = trophyTier(r.topic_count);
    byTier.set(tier.key, (byTier.get(tier.key) ?? 0) + r.trophy_count);
  }
  const total = [...byTier.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="card p-5">
      <h2 className="mb-3 text-sm font-semibold">Trophées — entraînement ciblé</h2>
      {total === 0 ? (
        <p className="text-sm text-white/40">Aucun trophée encore — un trophée s'obtient en réussissant (≥70%) une session d'entraînement ciblé.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TROPHY_TIER_ORDER.map((tier) => {
            const count = byTier.get(tier.key) ?? 0;
            return (
              <div
                key={tier.key}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 ${count > 0 ? "border-white/10" : "border-white/[0.04] opacity-40"}`}
              >
                <Trophy size={24} className={tier.className} />
                <span className="text-lg font-bold tabular-nums">{count}</span>
                <span className="text-[11px] text-white/50">{tier.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
