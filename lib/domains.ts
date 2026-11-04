// Le site couvre plusieurs domaines de connaissance, chacun découpé en
// programmes (Finance → CFA Niveau I aujourd'hui, d'autres ensuite). Les
// quatre espaces (Réviser, S'entraîner, Classement, Moi) montrent le contenu
// du programme choisi ; chaque domaine aura son propre rang. Seul
// Finance · CFA Niveau I est ouvert pour l'instant : les autres s'affichent
// « bientôt » et ne mènent encore à rien. Terminal est à part : ouvert, mais
// hors de ces espaces, il a sa propre page (href). Module neutre (pas de "use client").

export type Program = {
  key: string;
  name: string;
  short: string;
  ready: boolean;
  /** programme à part, qui a sa propre page : le sélecteur de domaine y mène, les espaces l'ignorent */
  href?: string;
};

export type Domain = {
  key: "finance" | "histoire" | "geographie" | "politique";
  name: string;
  /** nom d'icône lucide-react, résolu par le composant qui l'affiche */
  icon: "BarChart3" | "ScrollText" | "Globe2" | "Landmark";
  ready: boolean;
  programs: Program[];
};

export const DOMAINS: Domain[] = [
  {
    key: "finance",
    name: "Finance",
    icon: "BarChart3",
    ready: true,
    programs: [
      { key: "cfa-l1", name: "CFA Niveau I", short: "CFA I", ready: true },
      { key: "cfa-l2", name: "CFA Niveau II", short: "CFA II", ready: false },
      // ouvert (sinon les espaces l'annonceraient « bientôt »), et jamais en tête : le programme
      // courant est le premier de la liste (CURRENT_PROGRAM) et le premier ouvert (DomainSpace)
      { key: "terminal", name: "Terminal", short: "Terminal", ready: true, href: "/terminal" },
    ],
  },
  { key: "histoire", name: "Histoire", icon: "ScrollText", ready: false, programs: [] },
  { key: "geographie", name: "Géographie", icon: "Globe2", ready: false, programs: [] },
  { key: "politique", name: "Politique", icon: "Landmark", ready: false, programs: [] },
];

/** Domaine et programme actifs (un seul ouvert pour l'instant). */
export const CURRENT_DOMAIN = DOMAINS[0];
export const CURRENT_PROGRAM = DOMAINS[0].programs[0];
