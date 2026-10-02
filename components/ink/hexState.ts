// État d'une case de la carte selon la maîtrise. Module neutre (ni serveur ni
// client) : TopicMap est un composant serveur, il ne peut pas appeler une
// fonction exportée par un module "use client" comme InkHex.
export type HexState = "won" | "held" | "front" | "fog";

export function hexStateFromPct(pct: number | null): HexState {
  if (pct === null) return "fog";
  if (pct >= 80) return "won";
  if (pct >= 70) return "held";
  return "front";
}
