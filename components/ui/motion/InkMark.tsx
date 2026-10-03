import { INK } from "@/components/ui/InkDefs";

// Un mot marqué au pinceau, dont le trait se dessine quand il arrive à
// l'écran : « under » le souligne d'un coup de pinceau, « marker » passe
// un lavis d'encre léger derrière le bas du mot. Le trait suit la largeur
// du mot (même tracé partagé que le trait des titres). À garder pour un mot
// par écran au plus. Sans état : utilisable côté serveur. Masqué en mode
// discret (.rl-deco), comme les autres touches d'encre.
export function InkMark({ children, variant = "under", className = "" }: { children: React.ReactNode; variant?: "under" | "marker"; className?: string }) {
  const marker = variant === "marker";
  return (
    <span className={"relative inline-block whitespace-nowrap " + className}>
      <svg
        viewBox="0 0 400 64"
        preserveAspectRatio="none"
        aria-hidden
        className="rl-underline rl-deco pointer-events-none absolute left-[-4%] w-[108%] overflow-visible"
        style={
          marker
            ? { bottom: "0.04em", height: "0.5em", color: "var(--ink)", opacity: 0.13 }
            : { bottom: "-0.16em", height: "0.3em", color: "var(--ink)" }
        }
      >
        <use href={INK.swash} fill="currentColor" />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}
