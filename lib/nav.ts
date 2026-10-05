// Les quatre espaces du site et les routes qui leur appartiennent (pour
// savoir quel onglet allumer). Le logo mène à l'accueil (/dashboard).
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
  { key: "entrainer", label: "S'entraîner", href: "/entrainement", match: ["/entrainement", "/qcm", "/practice", "/official-exams", "/session", "/exam", "/defi", "/calculs"] },
  { key: "classement", label: "Classement", href: "/classement", match: ["/classement", "/duel", "/mock-exams", "/people"] },
  { key: "moi", label: "Moi", href: "/moi", match: ["/moi", "/settings", "/onboarding"] },
];

export function activeSpace(pathname: string): Space["key"] | null {
  for (const s of SPACES) if (s.match.some((m) => pathname === m || pathname.startsWith(m + "/"))) return s.key;
  return null;
}
