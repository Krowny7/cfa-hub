import Link from "next/link";
import { InkHex } from "@/components/ink/InkHex";
import { hexStateFromPct } from "@/components/ink/hexState";

export type TopicMastery = { key: string; short: string; label: string; pct: number | null };

// Libellés courts pour tenir dans une case (les noms officiels restent en
// infobulle et pour les lecteurs d'écran).
export const TOPIC_SHORT: Record<string, string> = {
  ethics: "Éthique",
  quant: "Quant",
  economics: "Économie",
  fsa: "FSA",
  corporate: "Corporate",
  equity: "Equity",
  fixed_income: "Fixed Income",
  derivatives: "Dérivés",
  alternatives: "Alternatifs",
  portfolio: "Portefeuille",
};

// Disposition en nid d'abeille : 3 · 4 · 3 cases, la rangée du milieu décalée.
const ROWS = [3, 4, 3];

// La carte des matières : une case par matière du CFA niveau I, l'anneau au
// pinceau = ta précision sur cette matière. Un clic lance un entraînement
// ciblé. Tout est en pourcentages + unités de conteneur (cqw), donc la carte
// se redimensionne d'un bloc, du téléphone au grand écran.
export function TopicMap({ topics }: { topics: TopicMastery[] }) {
  const cols = 4;
  const gap = 1.6; // % de la largeur
  const w = (100 - gap * (cols - 1)) / cols; // largeur d'une case en %
  const hRatio = 276 / 240; // hauteur / largeur du dessin
  const stepY = w * hRatio * 0.75 + gap * 0.6; // en % de la largeur
  const totalH = stepY * (ROWS.length - 1) + w * hRatio;

  let i = 0;
  const cells = ROWS.flatMap((n, r) => {
    const offset = ((cols - n) / 2) * (w + gap);
    return Array.from({ length: n }, (_, c) => {
      const t = topics[i++];
      return t ? { t, left: offset + c * (w + gap), top: r * stepY } : null;
    }).filter(Boolean) as { t: TopicMastery; left: number; top: number }[];
  });

  return (
    <div className="@container w-full">
      <div className="relative w-full" style={{ paddingBottom: `${totalH}%` }}>
        {cells.map(({ t, left, top }) => {
          const state = hexStateFromPct(t.pct);
          return (
            <Link
              key={t.key}
              href={`/practice?topic=${t.key}`}
              title={`${t.label}${t.pct === null ? " — inexploré" : ` — ${t.pct} %`} · s'entraîner`}
              aria-label={`${t.label}, ${t.pct === null ? "pas encore de données" : `${t.pct} % de réussite`}. S'entraîner sur cette matière.`}
              className="group absolute transition-transform duration-200 hover:-translate-y-[1.5%]"
              style={{ left: `${left}%`, top: `${(top / totalH) * 100}%`, width: `${w}%`, height: `${((w * hRatio) / totalH) * 100}%` }}
            >
              <InkHex pct={t.pct} state={state}>
                <span className="px-[14%] text-[2.3cqw] font-black leading-tight">{t.short}</span>
                <span className={"font-display mt-[0.4cqw] text-[3.4cqw] leading-none " + (state === "front" ? "text-red-500" : "")}>
                  {t.pct === null ? "—" : `${t.pct}%`}
                </span>
                {t.pct === null && <span className="note mt-[0.3cqw] text-[2.1cqw] text-white/50">inexploré</span>}
              </InkHex>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function TopicMapLegend() {
  const item = "flex items-center gap-1.5";
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      <span className={item}>
        <svg width="14" height="14" aria-hidden>
          <rect width="14" height="14" fill="none" style={{ stroke: "var(--ink)" }} strokeWidth="1" />
          {[2, 6, 10].flatMap((x) => [2, 6, 10].map((y) => <circle key={`${x}-${y}`} cx={x + 1} cy={y + 1} r="1.4" style={{ fill: "var(--ink)" }} />))}
        </svg>
        conquis · 80 %+
      </span>
      <span className={item}>
        <svg width="14" height="14" aria-hidden>
          <rect width="14" height="14" fill="none" style={{ stroke: "var(--ink)" }} strokeWidth="1" />
          {[2, 6, 10].flatMap((x) => [2, 6, 10].map((y) => <circle key={`${x}-${y}`} cx={x + 1} cy={y + 1} r="0.7" style={{ fill: "var(--ink)" }} />))}
        </svg>
        tenu · 70–79 %
      </span>
      <span className={item}>
        <svg width="14" height="14" aria-hidden>
          <rect width="14" height="14" fill="none" style={{ stroke: "var(--ink)" }} strokeWidth="1" />
          <path d="M-2 10 L6 -2 M2 16 L14 -2 M8 16 L16 4" style={{ stroke: "var(--pen)" }} strokeWidth="1.2" />
        </svg>
        front · sous 70 %
      </span>
      <span className={item}>
        <svg width="14" height="14" aria-hidden>
          <rect width="14" height="14" fill="none" style={{ stroke: "var(--ink)" }} strokeOpacity=".4" strokeDasharray="2 2" strokeWidth="1" />
        </svg>
        inexploré
      </span>
    </div>
  );
}
