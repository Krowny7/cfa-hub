// Barre de progression tracée au pinceau (masque .ink-bar dans globals.css).
// `pen` passe le trait au rouge correcteur — à réserver à ce qui est en
// difficulté (sous le seuil), jamais à la décoration.
export function InkBar({
  value,
  pen = false,
  className = "",
  label,
}: {
  value: number;
  pen?: boolean;
  className?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={"ink-bar " + (pen ? "is-pen " : "") + className}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
