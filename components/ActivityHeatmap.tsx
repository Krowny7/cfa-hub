type XpDay = { day: string; xp: number };

function cellClass(xp: number) {
  if (xp === 0) return "bg-white/[0.06]";
  if (xp < 50) return "bg-blue-500/30";
  if (xp < 150) return "bg-blue-500/60";
  return "bg-blue-500";
}

export function ActivityHeatmap({ days }: { days: XpDay[] }) {
  const map = new Map(days.map((d) => [d.day, d.xp]));
  const today = new Date();
  const cells: { key: string; xp: number }[] = [];

  for (let i = 34; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ key, xp: map.get(key) ?? 0 });
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {cells.map((c) => (
        <div
          key={c.key}
          className={`h-3.5 w-3.5 rounded-[3px] ${cellClass(c.xp)}`}
          title={`${c.key}: ${c.xp} XP`}
        />
      ))}
    </div>
  );
}
