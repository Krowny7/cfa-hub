// Glyphes maison des 10 matières du CFA Niveau I : un pictogramme au trait,
// à l'encre (couleur du texte), même grille et même épaisseur pour tous.
// Balance (éthique), courbe en cloche (quant), offre et demande (économie),
// fronton (émetteurs), compte en T (états financiers), chandeliers (actions),
// courbe des taux (obligataire), gain d'une option (dérivés), pierre
// (alternatifs), camembert d'allocation (portefeuille).
// Sans état ni hook : utilisable côté serveur comme côté client.

const GLYPHS: Record<string, React.ReactNode> = {
  ethics: (
    <>
      <path d="M12 5.5v13.5M8.5 19.5h7M4.5 7.5h15M4.5 7.5 2.5 13M4.5 7.5 6.5 13M19.5 7.5 17.5 13M19.5 7.5 21.5 13" />
      <path d="M2.2 13a2.3 2 0 0 0 4.6 0zM17.2 13a2.3 2 0 0 0 4.6 0z" />
      <circle cx="12" cy="4.3" r="1.2" />
    </>
  ),
  quant: (
    <>
      <path d="M2.5 19.5h19" />
      <path d="M3 18.6c2.8 0 3.9-2.3 5.2-5.8C9.6 9.2 10.5 6.8 12 6.8s2.4 2.4 3.8 6c1.3 3.5 2.4 5.8 5.2 5.8" />
      <path d="M8.2 19.5v-2.2M12 19.5v-2.2M15.8 19.5v-2.2" />
    </>
  ),
  economics: (
    <>
      <path d="M4 3.5v16.5h16.5" />
      <path d="M7.5 6.5c2.2 4.2 5.6 7.6 11 9M7.5 16c4.6-.8 8.4-4.4 11-9.5" />
      <path d="M12.6 11.9H4M12.6 11.9V20" strokeDasharray="1.4 2" strokeWidth={1.2} />
    </>
  ),
  corporate: (
    <>
      <path d="M3 8.5 12 4l9 4.5zM3.5 20h17M5.5 17.5h13" />
      <path d="M7 11v6.5M10.3 11v6.5M13.7 11v6.5M17 11v6.5" />
    </>
  ),
  fsa: (
    <>
      <rect x="4.5" y="3.5" width="15" height="17" rx="2" />
      <path d="M7.5 8h9M12 8v9.5M8 11.5h2.5M8 14.5h2.5M13.5 11.5h2.5M13.5 14.5h2.5" />
    </>
  ),
  equity: (
    <>
      <path d="M6 4.5v15M12 3v12.5M18 8v12.5" />
      <rect x="4.3" y="8" width="3.4" height="7" rx="0.6" fill="var(--glyph-bg, transparent)" />
      <rect x="10.3" y="5.5" width="3.4" height="6.5" rx="0.6" fill="currentColor" />
      <rect x="16.3" y="11" width="3.4" height="6.5" rx="0.6" fill="var(--glyph-bg, transparent)" />
    </>
  ),
  fixed_income: (
    <>
      <path d="M4 3.5v16.5h16.5" />
      <path d="M6.5 16.5c2.8-5 6.4-7.6 12.5-9" />
      <circle cx="6.5" cy="16.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="11.6" cy="10.6" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="19" cy="7.5" r="1.25" fill="currentColor" stroke="none" />
    </>
  ),
  derivatives: (
    <>
      <path d="M2.5 17.5h19" />
      <path d="M3.5 14.5h8L20.5 5" />
      <path d="M11.5 16v4" />
    </>
  ),
  alternatives: (
    <>
      <path d="M7 4.5h10l4 5L12 20 3 9.5z" />
      <path d="M3 9.5h18M9.8 4.5 8.3 9.5 12 20l3.7-10.5-1.5-5" />
    </>
  ),
  portfolio: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5V12h8.5M12 12l-6 6" />
    </>
  ),
};

/** Glyphe d'une matière (clé de lib/practiceTopics) ; rien si la clé est inconnue. */
export function SubjectGlyph({ subject, size = 22, className = "" }: { subject: string; size?: number; className?: string }) {
  const g = GLYPHS[subject];
  if (!g) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className={"shrink-0 " + className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {g}
    </svg>
  );
}
