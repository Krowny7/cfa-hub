import { LOGO_BRISTLES, LOGO_BRUSH, LOGO_SPLAT, LOGO_TRACK } from "@/components/ink/paths";

// Le logo : un anneau hexagonal tracé au pinceau sec, jamais fermé (74 %) —
// il reste toujours un bout à conquérir. Prend la couleur du texte
// (currentColor), donc suit automatiquement les thèmes papier / nuit.
export function InkRing({
  size = 32,
  className,
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <path d={LOGO_TRACK} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={9} strokeLinejoin="round" />
      <path d={LOGO_BRUSH} fill="currentColor" />
      <path d={LOGO_BRISTLES} fill="currentColor" />
      <path d={LOGO_SPLAT} fill="currentColor" />
    </svg>
  );
}

// Logo + nom, la composition de la planche « 01 · Encre ».
export function InkLockup({ size = 30, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={"inline-flex items-center gap-2.5 " + className}>
      <InkRing size={size} className="rl-deco" />
      <span className="font-display leading-none tracking-tight">RANKED LOBBY</span>
    </span>
  );
}
