type XpDay = { day: string; xp: number };

// Intensité d'encre selon l'XP du jour : case vide au trait, puis encre de plus
// en plus dense.
function cellStyle(xp: number): React.CSSProperties {
  if (xp === 0) return { border: "1.5px solid color-mix(in oklab, var(--ink) 22%, transparent)" };
  const a = xp < 50 ? 30 : xp < 150 ? 62 : 100;
  return { background: `color-mix(in oklab, var(--ink) ${a}%, transparent)` };
}

const DAYS = ["L", "M", "M", "J", "V", "S", "D"];

export function ActivityHeatmap({ days }: { days: XpDay[] }) {
  const map = new Map(days.map((d) => [d.day, d.xp]));
  const today = new Date();
  const cells: { key: string; xp: number }[] = [];

  // 5 semaines complètes qui se terminent cette semaine (lundi → dimanche)
  const dow = (today.getUTCDay() + 6) % 7;
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - dow - 28);
  for (let i = 0; i < 35; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ key, xp: d > today ? -1 : map.get(key) ?? 0 });
  }

  return (
    <div className="inline-grid gap-1.5" style={{ gridTemplateColumns: "repeat(7, 22px)" }}>
      {DAYS.map((d, i) => (
        <span key={i} className="text-center text-[10px] font-bold text-white/45">
          {d}
        </span>
      ))}
      {cells.map((c) =>
        c.xp < 0 ? (
          <span key={c.key} className="h-[22px] w-[22px]" />
        ) : (
          <span key={c.key} className="h-[22px] w-[22px] rounded-[2px]" style={cellStyle(c.xp)} title={`${c.key} : ${c.xp} XP`} />
        )
      )}
    </div>
  );
}
