// La voix du Codex : les mots de l'écran (page /codex, panneau du sceau,
// Moi, fêtes). La règle d'écriture du Codex simplifié : l'action d'abord,
// l'histoire dans les fêtes. Les mots du site (question, matière, notion,
// maîtrise, séance, examen blanc, quête, étape), plus trois mots maison :
// trait, rature et jour d'encre. Léonard ne parle qu'aux fêtes (retro, fete).
// Les titres clairs des quêtes et des actes sont dans lib/codex/titres-clairs.ts.
// Module neutre, sans dépendance au catalogue (utilisable côté navigateur).

import { de } from "@/lib/codex/elision";
import type { EtapeBranche, Famille, Phase, Repetition } from "@/lib/codex/types";
import type { EtatLigne } from "@/lib/codex/vue";
import type { GenreBloc, RevoirCodex } from "@/lib/codex/seance";

const nombre = (n: number) => n.toLocaleString("fr-FR");
const pluriel = (n: number, mot: string, mots = `${mot}s`) => `${nombre(n)} ${n > 1 ? mots : mot}`;
/** « 12,5 » : le poids d'une matière, à la française. */
const virgule = (n: number) => String(n).replace(".", ",");

export const CODEX = {
  nom: "Codex",
  titre: "Codex",
  sousTitre: "Tes quêtes, du jour et au long cours.",
  kicker: (phase: string) => `Codex · ${phase}`,
  /** le bloc Codex de Moi : « 37 quêtes faites · 2 140 XP gagnés dans le Codex » */
  quetesFaites: (n: number) => (n === 1 ? "1 quête faite" : `${nombre(n)} quêtes faites`),
  xpGagnee: (xp: number) => `${nombre(xp)} XP gagnés dans le Codex`,
  historique: "Historique",
  /** null une fois le jour J passé (la phase « Après l'examen » le dit déjà) */
  jourJ: (n: number): string | null => (n === 0 ? "C'est le jour J" : n > 0 ? `J-${n}` : null),
  toutMontrer: "Tout montrer",
  toutMontrerAide: "Le Codex se dévoile au fil de tes séances. Tu peux aussi tout voir tout de suite.",
  prochaine: {
    eyebrow: "La suite",
    aller: "Y aller",
    entamee: "En cours",
    rien: "Rien d'urgent. Les 5 du jour, si tu as 5 minutes.",
    minutes: (m: number) => `≈ ${m} min`,
  },
  trame: {
    titre: "Parcours",
    sous: "Du premier trait au jour J, acte par acte.",
    clos: "Fini",
    enCours: "En cours",
    aVenir: "À venir",
    bonus: "facultative",
  },
  contrats: {
    titre: "Quêtes du jour",
    sous: "Trois quêtes courtes, 45 minutes en tout.",
    emplacement: { faiblesse: "Ton point faible", entretien: "Entretien", variete: "Variété" } as Record<string, string>,
    changer: "Changer",
    changerAide: "Un changement par jour, pas sur une quête déjà faite.",
    changeDeja: "Tu as déjà changé une quête aujourd'hui.",
    trio: (xp: number) => `Les trois faites : +${xp} XP de bonus`,
    trioFait: (xp: number) => `Les trois faites, +${xp} XP`,
    /** en mode sobre (lib/codex/sobre) : le trio sans son XP */
    trioSobre: "Les trois faites : un bonus",
    trioFaitSobre: "Les trois faites",
    /** « Quêtes du jour · 1 sur 3 · +50 XP à 3 sur 3 » (replié sous le fil ; sans bonus restant, la première partie) */
    resume: (faites: number, total: number, bonus = 0) => `Quêtes du jour · ${faites} sur ${total}${bonus > 0 && faites < total ? ` · +${bonus} XP à ${total} sur ${total}` : ""}`,
    semaine: "Cette semaine",
  },
  branches: {
    titre: "Matières",
    sous: "Une par matière, des 10 premières questions au titre de maître.",
    maitre: "Maître",
    etapes: {
      entree: "Premier pas",
      cours: "Cours",
      fiche: "Fiche",
      drill: "Drill",
      flashcards: "Flashcards",
      ciblee: "Séance ciblée",
      serie: "15 justes sur 20",
      tour: "Notions vues",
      carte: "Notions tenues",
      maitrise60: "Maîtrise 60 %",
      maitrise75: "Maîtrise 75 %",
      signature: "Série sans faute",
      maitre: "Maître",
    } satisfies Record<EtapeBranche, string>,
  },
  longCours: {
    titre: "Objectifs longs",
    sous: "Ceux qui se comptent en semaines.",
    palier: (i: number, n: number) => `Étape ${i} sur ${n}`,
    suivant: "Ensuite",
    fini: "Tout est fait",
  },
  exploits: {
    titre: "Exploits",
    sous: "Certains sont cachés : une énigme les annonce.",
    enigme: "Une énigme",
    gagnes: (n: number) => (n === 0 ? "Aucun pour l'instant" : n === 1 ? "1 exploit" : `${n} exploits`),
    trouves: (n: number) => `Trouvés (${n})`,
    /** les sceaux du profil ont quitté les exploits (D5) : ils sont dans la Collection du profil */
    collection: "Voir la Collection",
  },
  pageBlanche: "Rien ici pour l'instant : tes séances le rempliront, ou « Tout montrer ».",
  /** une deuxième page vide sur le même écran : la phrase entière n'est dite qu'une fois */
  pageBlancheAussi: "Rien ici non plus pour l'instant.",
  etat: { verrouillee: "Pas encore", disponible: "À faire", active: "En cours", terminee: "Faite" } as Record<EtatLigne, string>,
  /** l'état d'une quête remplie dont la récompense attend le clic */
  aRecuperer: "À récupérer",
  // satisfies : une famille nouvelle sans libellé ne compile pas
  famille: { trame: "Parcours", branche: "Matière", longcours: "Objectif long", contrat: "Quête du jour", exploit: "Exploit", fil: "Fil rouge" } satisfies Record<Famille, string>,
  detail: {
    objectif: "À faire",
    pourquoi: "Pourquoi",
    plus: "Plus",
    recompense: "Récompense",
    xp: (n: number) => `+${n} XP`,
    /** l'XP réellement versée (plafonnée à ton niveau) : on ne montre que ce qu'on a reçu */
    xpPlafonnee: (v: number) => `+${v} XP`,
    manque: (reste: string) => `Il manque : ${reste}`,
    faiteLe: (d: string) => `Faite le ${d}`,
    faiteAvant: (d: string) => `Déjà faite avant le ${d}`,
    reclamer: "Récupérer",
    reclame: "Récupérée",
    aller: "Y aller",
    fermer: "Fermer",
    optionnelle: "Facultative",
    /** un miroir (V3 §8.2) : la même quête, payée une seule fois */
    compteeAvec: (titre: string) => `Comptée avec « ${titre} » : une seule récompense pour les deux.`,
    /** seulement si la quête peut se finir aujourd'hui ; sinon surPlusieursSemaines ou jusquaDimanche */
    duree: (m: number) => `≈ ${m} min`,
    surPlusieursSemaines: "sur plusieurs semaines",
    jusquaDimanche: "jusqu'à dimanche",
    titreGagne: (t: string) => `Titre : ${t}`,
    cosmetique: (c: string) => `Pièce : ${c}`,
  },
  /** « Récupérer » : la récompense d'une quête faite se verse au clic (Codex simplifié §5) */
  recuperer: {
    titre: (n: number) => `À récupérer · ${n}`,
    bouton: "Récupérer",
    boutonXp: (xp: number) => (xp > 0 ? `Récupérer +${xp} XP` : "Récupérer"),
    tout: (xp: number) => (xp > 0 ? `Tout récupérer · +${xp} XP` : "Tout récupérer"),
    autres: (n: number) => (n === 1 ? "et 1 autre" : `et ${n} autres`),
    /** la pastille du sceau : « 9+ » au-delà */
    pastille: (n: number) => (n > 9 ? "9+" : String(n)),
    /** sans le SQL de Récupérer : l'XP est déjà dans le total */
    dejaVerse: "Déjà versé · voir ce que tu as gagné",
    echec: "Pas pu récupérer. Réessaie dans un instant.",
    /** la ligne de fin d'outil (bilan) */
    ligne: (n: number, xp: number) => `${n === 1 ? "1 quête faite" : `${n} quêtes faites`}${xp > 0 ? ` · Récupérer +${xp} XP` : " · Récupérer"}`,
  },
  /** le panneau du sceau et le segment « Aujourd'hui » de /codex */
  aujourdhui: {
    titre: "Aujourd'hui",
    suite: "La suite",
    fait: (n: number, xp: number) => `Fait aujourd'hui : ${n}${xp > 0 ? ` · +${xp} XP` : ""}`,
    ouvrirCodex: "Ouvrir le Codex",
    toutLeCodex: "Tout le Codex",
    semaine: "Ta semaine",
    carte: "Voir la carte",
    preparation: (pct: number) => `Préparation ${pct} %`,
    pasUnPronostic: "Ce n'est pas un pronostic : le CFA Institute ne publie pas la note de passage.",
  },
  /** le choix du lundi (le nom imagé de chaque choix reste ; son résumé clair : resumeSemaine, lib/codex/titres-clairs.ts) */
  lundi: {
    titre: "Ton choix de la semaine",
    cible: "Combien de jours d'encre cette semaine ?",
  },
  /** le mode sobre, dans les réglages */
  sobre: "Récompenses versées d'office, sans animation",
  sobreAide: "Pas de « Récupérer » : l'XP et les pièces arrivent seules, sans fête ni « +XP », et Léonard ne passe plus. Tes quêtes et « Fait aujourd'hui » restent.",
  /** Moi : la tuile Codex (l'entrée du Codex) et le bloc Codex, avec son historique */
  moi: {
    aRecuperer: (n: number) => (n === 1 ? "1 quête à récupérer" : `${nombre(n)} quêtes à récupérer`),
    vide: "Des quêtes pour guider tes révisions, à ton rythme.",
    ouvrir: "Ouvrir le Codex",
    historiqueSous: "Tes quêtes faites, jour par jour.",
    aujourdhui: "Aujourd'hui",
    hier: "Hier",
    arrivee: "Comptées à ton arrivée",
    plusAnciennes: (n: number) => (n === 1 ? "et 1 plus ancienne" : `et ${nombre(n)} plus anciennes`),
  },
  indisponible: {
    titre: "Le Codex n'est pas encore ouvert",
    ligne: "Le Codex se prépare : reviens dans quelques instants. Tout le reste du site marche normalement.",
    retour: "Retour à l'accueil",
  },
  accueil: {
    maQuete: "Ta quête",
    contrats: "Quêtes du jour",
    ouvrir: "Ouvrir le Codex",
  },
  // les fêtes : la seule place de l'histoire (et de Léonard)
  fete: {
    quete: "Quête accomplie",
    acte: "Un acte se referme",
    acteNouveau: (t: string) => `Le rideau se lève sur « ${t} ».`,
    suite: "Voir le Codex",
    autres: (n: number) => (n === 1 ? "et une autre quête faite" : `et ${n} autres quêtes faites`),
    devoile: "Une nouvelle partie du site s'ouvre",
  },
  retro: {
    titre: "Léonard a relu ton parcours",
    ligne: (q: number, xp: number) => (q <= 1 ? `Une quête était déjà accomplie : +${xp} XP.` : `${q} quêtes étaient déjà accomplies : +${xp} XP, plafonnés à ton niveau.`),
    /** en mode sobre : sans l'XP */
    ligneSobre: (q: number) => (q <= 1 ? "Une quête était déjà accomplie." : `${q} quêtes étaient déjà accomplies.`),
    actes: (n: number) => (n === 1 ? "1 acte déjà refermé" : `${n} actes déjà refermés`),
    ok: "Merci, Léonard",
  },
};

/**
 * Les mots maison, et leur définition : elle s'ouvre au doigt à leur
 * premier usage sur un écran (pas d'infobulle title=).
 */
export const MOTS_MAISON = {
  trait: { mot: "trait", definition: "Une question répondue. Tes traits du jour suivent ton objectif." },
  rature: { mot: "rature", definition: "Une question ratée, à refaire jusqu'à la réussir." },
  jourEncre: { mot: "jour d'encre", definition: "Un jour avec 10 questions ou plus." },
  notionTenue: { mot: "notion tenue", definition: "3 justes sur tes 5 dernières réponses de la notion." },
} as const;

/** Le libellé de famille d'une quête : un contrat de la semaine n'est pas une quête du jour. */
export const familleDe = (q: { famille: Famille; repetition?: Repetition }): string =>
  q.famille === "contrat" && q.repetition === "hebdomadaire" ? "Quête de la semaine" : CODEX.famille[q.famille];

// ── La séance du jour ──────────────────────────────────────────────────
// Le titre-action de chaque bloc (lib/codex/seance.ts) et sa phrase-fait, 12
// mots au plus, sans point final. Une étape faite tient sur une ligne ; celle en cours a seule
// son bouton et « Une autre idée ? ».

export const SEANCE = {
  titre: "Aujourd'hui",
  /** « Aujourd'hui · 25 min · 1 sur 3 fait » */
  entete: (minutes: number, faits: number, total: number) => `Aujourd'hui · ${minutes} min · ${faits} sur ${total} ${faits > 1 ? "faits" : "fait"}`,
  commencer: "Commencer",
  autreIdee: "Une autre idée ?",
  /** le compte neuf : une seule étape */
  compteNeuf: { titre: "10 questions pour faire connaissance", duree: 5 },
  /** « fait avancer : FSA à 60 % (51 → 60) » */
  faitAvancer: (titre: string, de_: number, a: number) => `fait avancer : ${titre} (${de_} → ${a})`,
  /** l'étape d'un bloc ; `matiere` : son nom court (« FSA ») */
  bloc: (genre: GenreBloc, p: { n?: number; matiere?: string; defi?: boolean } = {}): string => {
    switch (genre) {
      case "cinq": return "Les 5 du jour";
      case "trente": return "Les 30 du jour";
      case "retouches": return `Corriger ${pluriel(p.n ?? 5, "rature")}`;
      case "coince": return p.matiere ? `Renforcer ${p.matiere}` : "Renforcer ton point faible";
      case "nouveau": return p.matiere ? `Découvrir du neuf en ${p.matiere}` : "Découvrir de nouvelles notions";
      case "epreuve": return p.defi ? "Les 30 du jour, chronométrés" : "30 questions au rythme de l'examen";
    }
  },
  raisons: {
    cinq: "5 questions d'examen, chaque jour",
    trente: "La même épreuve pour tous, chronométrée",
    /** « 15 à revoir : 8 ratures, 7 rappels · demain 22 » ; sans le détail : un fait */
    retouches: (r: RevoirCodex): string => {
      if (!r.complet) return "Une erreur refaite le lendemain revient rarement à l'examen";
      const parts = [...(r.ratures ? [pluriel(r.ratures, "rature")] : []), ...(r.rappels ? [pluriel(r.rappels, "rappel")] : [])];
      return `${r.aujourdhui} à revoir${parts.length ? ` : ${parts.join(", ")}` : ""}${r.demain > 0 ? ` · demain ${r.demain}` : ""}`;
    },
    /** « FSA pèse 12,5 % de l'examen, tu es à 48 % » */
    coince: (m: { court: string; poids: number; pct: number | null }) =>
      `${m.court} pèse ${virgule(m.poids)} % de l'examen, ${m.pct === null ? "pas encore mesurée" : `tu es à ${m.pct} %`}`,
    /** « 12 notions de FSA jamais vues sur 30 » */
    nouveau: (court: string, n: number, total: number) => `${n} ${n > 1 ? "notions" : "notion"} ${de(court)} jamais ${n > 1 ? "vues" : "vue"} sur ${total}`,
    epreuve: (defi: boolean) => (defi ? "Les 30 du jour, sous chrono" : "30 questions mêlées, aux poids de l'examen"),
  },
};

// ── Le calendrier : les phases, dites en clair ─────────────────────────
// Le nom de la phase et une phrase (les répliques de Léonard restent au
// catalogue, pour les fêtes). Pas de compte à rebours.

export const PHASES_CLAIRES: Record<Phase, { nom: string; phrase: string }> = {
  fondations: { nom: "Les fondations", phrase: "Tout le programme, une première fois." },
  consolidation: { nom: "La consolidation", phrase: "Reprendre ce qui s'efface et combler les trous." },
  repetition: { nom: "La répétition générale", phrase: "Examens blancs, ratures et rythme de l'examen." },
  veillee: { nom: "La dernière semaine", phrase: "On entretient, on ne commence plus rien." },
  apres: { nom: "Après l'examen", phrase: "Garder la main, et préparer la suite." },
};

// Léonard ne parle plus dans les fiches de quête (Codex simplifié §4.6) : ses
// répliques par état sont retirées ; il ne parle qu'aux fêtes.

export function romain(n: number): string {
  const t: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let r = "";
  for (const [v, s] of t) while (n >= v) { r += s; n -= v; }
  return r || String(n);
}
