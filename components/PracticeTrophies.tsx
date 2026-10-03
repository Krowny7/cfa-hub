import { Trophy } from "lucide-react";
import { trophyTier, TROPHY_TIER_ORDER } from "@/lib/practiceTopics";

type Row = { topic_count: number; trophy_count: number };

// Sans couleur, les paliers se lisent au dessin : contour fin (bronze),
// contour épais (argent), trophée plein (or), case inversée à l'encre (diamant).
function TierIcon({ tier }: { tier: string }) {
  if (tier === "gold" || tier === "diamond") return <Trophy size={22} strokeWidth={1.6} fill="currentColor" aria-hidden />;
  return <Trophy size={22} strokeWidth={tier === "silver" ? 2.6 : 1.4} aria-hidden />;
}

// Le palier dépend du nombre de matières couvertes par la session.
const RULE: Record<string, string> = {
  bronze: "1 matière",
  silver: "2 à 3 matières",
  gold: "4 à 6 matières",
  diamond: "7 matières et plus",
};

export function PracticeTrophies({ rows }: { rows: Row[] }) {
  const byTier = new Map(TROPHY_TIER_ORDER.map((t) => [t.key, 0]));
  for (const r of rows) {
    const tier = trophyTier(r.topic_count);
    byTier.set(tier.key, (byTier.get(tier.key) ?? 0) + r.trophy_count);
  }
  const total = [...byTier.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="card p-5 md:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="t-h3 m-0">Trophées</h2>
        <span className="t-micro">entraînement ciblé réussi à 70 % ou plus</span>
      </div>
      {total === 0 ? (
        <p className="t-small m-0 mt-4">
          Aucun trophée pour l&apos;instant : réussis une session d&apos;entraînement ciblé à 70 % pour gagner le premier.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {TROPHY_TIER_ORDER.map((tier) => {
            const count = byTier.get(tier.key) ?? 0;
            const inverted = tier.key === "diamond" && count > 0;
            return (
              <div
                key={tier.key}
                className={
                  "flex flex-col items-start gap-3 rounded-[14px] p-4 " +
                  (inverted ? "bg-white text-black" : "card-quiet") +
                  (count === 0 ? " opacity-50" : "")
                }
              >
                <TierIcon tier={tier.key} />
                <div>
                  <span className="t-num block text-[26px] tabular-nums">{count}</span>
                  <span className="mt-1.5 block text-[13px] font-semibold">{tier.label}</span>
                  <span className={"block text-[11.5px] " + (inverted ? "opacity-70" : "text-muted")}>{RULE[tier.key]}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
