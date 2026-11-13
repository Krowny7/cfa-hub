// Textes des sous-pages « Réviser B » (direction « le lieu, puis l'objet », 2026-11-13) : /fiches (la
// rangée de carnets), /fiches/one-pagers (le mur), /courses (les livrets, la platine et le rayon des
// vidéos), /courses/<slug> et la séance de lecture d'une fiche. Module neutre (pas de "use client").

const s = (n: number) => (n > 1 ? "s" : "");

/** /fiches : la rangée des dix carnets et le mur des one-pagers. */
export const CARNETS = {
  titre: "Fiches de révision",
  etiquette: "Les carnets",
  /** la ligne d'état sous le titre */
  ligne: (finies: number, entamees: number, neuves: number) =>
    [finies > 0 ? `${finies} finie${s(finies)}` : null, entamees > 0 ? `${entamees} entamée${s(entamees)}` : null, neuves > 0 ? `${neuves} à ouvrir` : null]
      .filter(Boolean)
      .join(" · ") || "Les dix matières, une synthèse par page et son quiz corrigé",
  ligneSansDonnees: "Les dix matières, une synthèse par page et son quiz corrigé",
  herosLegende: (pages: number) => `pages faites sur ${pages}`,
  /** un joueur neuf : le total à faire plutôt qu'un zéro */
  herosLegendeNeuf: "pages à faire",
  /** le nom court écrit sur la couverture (le nom complet reste dans title et aria-label) */
  court: {
    ethics: "Ethics",
    quant: "Quant Methods",
    economics: "Economics",
    corporate: "Corporate Issuers",
    fsa: "FSA",
    equity: "Equity",
    fixed_income: "Fixed Income",
    derivatives: "Derivatives",
    alternatives: "Alternatives",
    portfolio: "Portfolio Mgmt",
  } as Record<string, string>,
  /** sous le grand chiffre d'un carnet illisible (base muette) */
  pagesCourt: "pages",
  /** le tampon d'un carnet fini */
  tenu: "Tenu",
  aria: (nom: string, faites: number, pages: number, conseil: boolean) =>
    `${nom} : ${faites} page${s(faites)} faite${s(faites)} sur ${pages}${conseil ? ", conseillée" : ""}`,
  bientot: "Bientôt",
  ouvrir: (nom: string) => `Ouvrir ${nom}`,
  reprendre: (nom: string) => `Reprendre ${nom}`,
  mur: "One-pagers",
  murAide: "Les 10 one-pagers : une page A4 par matière",
} as const;

/** L'arrivée des rayons ne se joue qu'une fois par session (sessionStorage). */
export const CLE_VU_RAYONS = "rl_vu_rayons";

/** /fiches/one-pagers : le mur en grand et son filtre. */
export const MUR = {
  filtre: "Filtrer par matière",
  toutes: "Toutes",
  ligne: "10 matières · une page A4 chacune",
} as const;

/** /courses : les livrets, la platine, le rayon des vidéos. */
export const ETAGERE = {
  titre: "Cours complets",
  etiquette: "Les livrets",
  ligne: (cours: number, entames: number, finis: number) =>
    [`${cours} cours`, entames > 0 ? `${entames} entamé${s(entames)}` : null, finis > 0 ? `${finis} écouté${s(finis)} en entier` : null].filter(Boolean).join(" · "),
  herosLegende: "restantes",
  herosLegendeFini: "tout est écouté",
  /** « 8 H 40 » : le chiffre-héros en capitales */
  heures: (minutes: number) => {
    const t = Math.max(0, Math.round(minutes));
    const h = Math.floor(t / 60);
    const m = t % 60;
    return h > 0 ? `${h} H ${String(m).padStart(2, "0")}` : `${m} MIN`;
  },
  /** tout est écouté : le chiffre-héros devient « 10/10 » */
  herosFini: (n: number) => `${n}/${n}`,
  modules: (n: number) => `${n} modules`,
  minutes: (n: number) => `${n} min`,
  livretAria: (titre: string, faits: number, total: number, conseil: boolean) =>
    `${titre} : ${faits} module${s(faits)} écouté${s(faits)} sur ${total}${conseil ? ", à reprendre" : ""}`,
  bientot: "Bientôt",
  /** la bibliothèque à deux étages (chaque livre ouvre son cours : le deck et l'audio) */
  bibliotheque: "La bibliothèque des cours",
  /** la platine : elle joue l'audio sur place, la matière se choisit dessous */
  platine: "La platine",
  matieres: "Le disque sur la platine",
  ecouter: (titre: string) => `Écouter ${titre}`,
  reprendreA: (titre: string, temps: string) => `Reprendre ${titre} à ${temps}`,
  pause: (titre: string) => `Mettre ${titre} en pause`,
  moduleDe: (n: number, total: number) => `Module ${n}/${total}`,
  position: "Position dans le cours",
  reculer: "Reculer de 15 secondes",
  avancer: "Avancer de 15 secondes",
  vitesse: (r: string) => `Vitesse de lecture : ${r}. Changer`,
  sansAudio: "L'audio ne répond pas : ouvre le cours",
} as const;

/** /courses/<slug> : le deck et l'audio. */
export const LECTURE_COURS = {
  deck: "Le deck",
  audio: "L'audio",
  herosLegende: "restantes",
  /** le cours écouté jusqu'au bout */
  herosFini: "Écouté",
  herosLegendeFini: "en entier",
  ligne: (modules: number, pages: number) => `${modules} Learning Modules · ${pages} pages`,
  /** la ligne d'état, lue sur l'appareil */
  ligneEtat: (module: number | null, modules: number, fini: boolean) =>
    fini ? `Écouté en entier · ${modules} Learning Modules` : module ? `Repris au module ${module} sur ${modules}` : `${modules} Learning Modules · pas encore écouté`,
  ouvrir: "Ouvrir le deck",
} as const;

/** /fiches/<matière> : la séance de lecture. */
export const SEANCE_FICHE = {
  pages: "Les pages",
  herosLegende: (total: number) => `pages faites sur ${total}`,
  herosLegendeNeuf: "pages à faire",
  case: (page: number, theme: string | null, etat: string, erreurs = 0) =>
    `Page ${page}${theme ? ` · ${theme}` : ""} : ${etat}${erreurs > 0 ? `, ${erreurs} erreur${s(erreurs)} à reprendre` : ""}`,
  /** la ligne d'état de la porte */
  ligne: (faites: number, total: number, entamees: number, erreurs: number) =>
    [
      faites >= total && total > 0 ? "Fiche finie" : entamees > 0 ? `${entamees} page${s(entamees)} entamée${s(entamees)}` : faites === 0 ? "Pas encore ouverte" : null,
      erreurs > 0 ? `${erreurs} erreur${s(erreurs)} à reprendre` : faites + entamees > 0 ? "aucune erreur à reprendre" : null,
    ]
      .filter(Boolean)
      .join(" · "),
  lancer: "Lancer le quiz",
  questions: (n: number) => `${n} questions`,
  onglets: "Entraînement",
  faite: "faite",
  entamee: "entamée",
  neuve: "pas commencée",
  bientot: "bientôt",
} as const;
