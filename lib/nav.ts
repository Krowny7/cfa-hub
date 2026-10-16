// Les cinq espaces du site (le Codex en tête : c'est lui qui dit quoi faire) et les routes qui leur appartiennent (pour
// savoir quel onglet allumer). Le logo mène à l'accueil (/dashboard).
// Module neutre (pas de "use client").

export type Space = {
  key: "codex" | "reviser" | "entrainer" | "classement" | "moi";
  label: string;
  href: string;
  /** préfixes de route rattachés à l'espace */
  match: string[];
};

export const SPACES: Space[] = [
  { key: "codex", label: "Codex", href: "/codex", match: ["/codex"] },
  { key: "reviser", label: "Réviser", href: "/reviser", match: ["/reviser", "/fiches", "/courses", "/flashcards"] },
  { key: "entrainer", label: "S'entraîner", href: "/entrainement", match: ["/entrainement", "/qcm", "/practice", "/official-exams", "/session", "/exam", "/defi", "/eclair", "/calculs", "/atelier"] },
  { key: "classement", label: "Classement", href: "/classement", match: ["/classement", "/duel", "/mock-exams", "/people"] },
  { key: "moi", label: "Moi", href: "/moi", match: ["/moi", "/revoir", "/settings", "/onboarding"] },
];

export function activeSpace(pathname: string): Space["key"] | null {
  for (const s of SPACES) if (s.match.some((m) => pathname === m || pathname.startsWith(m + "/"))) return s.key;
  return null;
}
