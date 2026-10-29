// Les quatre espaces du site et les routes qui leur appartiennent (pour savoir
// quel onglet allumer). Le logo mène à l'accueil (/dashboard). Le Codex n'est
// plus un onglet (Codex simplifié, 17 octobre 2026) : on l'ouvre depuis Moi
// (sa tuile), le panneau du sceau ou la recherche ; /codex allume donc « Moi »,
// aux couleurs de sa palette « carnet » (lib/palettes.ts, par la route).
// Module neutre (pas de "use client").

export type Space = {
  key: "reviser" | "entrainer" | "classement" | "moi";
  label: string;
  href: string;
  /** préfixes de route rattachés à l'espace */
  match: string[];
};

export const SPACES: Space[] = [
  { key: "reviser", label: "Réviser", href: "/reviser", match: ["/reviser", "/fiches", "/courses", "/flashcards"] },
  { key: "entrainer", label: "S'entraîner", href: "/entrainement", match: ["/entrainement", "/qcm", "/practice", "/official-exams", "/session", "/exam", "/defi", "/eclair", "/calculs", "/atelier"] },
  { key: "classement", label: "S'affronter", href: "/classement", match: ["/classement", "/duel", "/mock-exams", "/people"] },
  { key: "moi", label: "Moi", href: "/moi", match: ["/moi", "/revoir", "/settings", "/onboarding", "/codex"] },
];

export function activeSpace(pathname: string): Space["key"] | null {
  for (const s of SPACES) if (s.match.some((m) => pathname === m || pathname.startsWith(m + "/"))) return s.key;
  return null;
}

/** L'accueil : le logo y mène, et la barre du bas lui garde son onglet. */
export const estAccueil = (pathname: string) => pathname === "/" || pathname === "/dashboard";

/**
 * Le nombre d'une pastille : rien à zéro, « 9+ » au-delà de `max` (le sceau
 * des quêtes : 9 ; l'onglet Réviser : 99).
 */
export function chiffrePastille(n: number | null | undefined, max = 9): string | null {
  const v = Math.floor(Number(n) || 0);
  return v <= 0 ? null : v > max ? `${max}+` : String(v);
}

/** Le nom lu d'un onglet : celui de Réviser porte son compte (« Réviser, 14 à revoir ») ; undefined : son nom suffit. */
export function libelleOnglet(key: string, label: string, revoir: number | null): string | undefined {
  return key === "reviser" && revoir && revoir > 0 ? `${label}, ${revoir} à revoir` : undefined;
}
