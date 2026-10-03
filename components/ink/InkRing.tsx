import { INK } from "@/components/ui/InkDefs";

// Le logo : un anneau hexagonal tracé au pinceau sec, jamais fermé (74 %) —
// il reste toujours un bout à conquérir. Prend la couleur du texte
// (currentColor), donc suit automatiquement les thèmes papier / nuit.
export function InkRing({
  size = 32,
  className,
  title,
  landing = false,
}: {
  size?: number;
  className?: string;
  title?: string;
  // Point d'atterrissage de l'anneau de l'intro (components/Splash.tsx)
  landing?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 240 240"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      data-rl-logo={landing ? "" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {/* Tracés partagés, définis une fois dans components/ui/InkDefs.tsx */}
      <use href={INK.logoTrack} fill="none" stroke="currentColor" strokeOpacity={0.15} strokeWidth={9} strokeLinejoin="round" />
      <use href={INK.logoBrush} fill="currentColor" />
      <use href={INK.logoBristles} fill="currentColor" />
      <use href={INK.logoSplat} fill="currentColor" />
    </svg>
  );
}

// Logo + nom, la composition de la planche « 01 · Encre ».
export function InkLockup({ size = 30, className = "", landing = false }: { size?: number; className?: string; landing?: boolean }) {
  return (
    <span className={"inline-flex items-center gap-2.5 " + className}>
      <InkRing size={size} className="rl-deco" landing={landing} />
      <span className="font-brand leading-none">RANKED LOBBY</span>
    </span>
  );
}
