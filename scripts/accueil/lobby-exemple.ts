// Les données d'exemple de l'accueil « Le lobby » : celles de la maquette D2
// (Theo, Platine II, 1 478 ELO, J-110, 26 traits sur 40, série de 9 jours à ×2,
// les 30 du jour à rendre, 128 joueurs, Marie L. en tête), avec des variantes
// pour les cas limites. Tout passe par `construireLobby` (modele.ts), comme
// `lireLobby` : les mêmes fonctions composent le contrat de types.ts à partir
// de faux résultats de lecture. Sert aux tests de rendu (test-lobby.tsx) et à
// l'aperçu local (app/preview-da/accueil-lobby). Aucune lecture, aucun réseau.
// Les cartes des lots 2 à 5 sont celles de la maquette (`suiteMaquette`) ; les variantes
// « sansExtras », « sansAdmin » et « sansRival » en retirent une partie, comme le ferait
// une migration pas collée ou une clé de service absente.
import { construireLobby, type EntreesLobby } from "@/components/accueil/lobby/modele";
import { directDe, type DirectBrut } from "@/components/accueil/lobby/modele-direct";
import { REGLAGES_DEFAUT, promptIA, resumeReglages } from "@/components/accueil/lobby/modele-carte";
import { construireRival } from "@/components/accueil/lobby/modele-rival";
import type { Lobby } from "@/components/accueil/lobby/types";
import type { DailyBoard, DailyBoardRow, TodayDaily } from "@/lib/daily";
import { decaleJour } from "@/lib/objectif-calc";
import type { SerieEncre } from "@/lib/serie-encre";
import type { VainqueurDuJour } from "@/lib/vainqueur-du-jour";
import { NBSP } from "@/lib/voice";

export type Variante = "base" | "nouveau" | "enCours" | "toutFait" | "bientot" | "sansDefis" | "placement" | "sansClassement" | "sansMigrations" | "sansDate" | "tenu" | "perso" | "sansExtras" | "sansAdmin" | "sansRival" | "sansJour";

/** Le samedi de la maquette : 110 jours avant l'examen du 18 février 2027. */
export const JOUR = "2026-10-31";
/** 18 h 30 à Paris : le gel (minuit) est dans 5 h 30. */
export const MAINTENANT = new Date("2026-10-31T17:30:00Z");
export const MINUIT = "2026-10-31T23:00:00Z";

const ligne = (rank: number, nom: string, score: number, secondes: number, moi = false): DailyBoardRow => ({
  rank,
  userId: `00000000-0000-4000-8000-0000000000${String(rank).padStart(2, "0")}`,
  username: nom,
  avatarUrl: null,
  score,
  total: 30,
  seconds: secondes,
  finishedAt: "2026-10-31T10:00:00Z",
  isMe: moi,
});

const aujourdhui = (rows: DailyBoardRow[], me: DailyBoardRow | null = null): DailyBoard => ({ day: JOUR, exists: true, players: 128, playing: 3, rows, me });

/** Le haut du classement de la maquette (Marie L. 29/30 en 11 min 40 …). */
const TOP_AUJ = [ligne(1, "Marie L.", 29, 700), ligne(2, "Inès K.", 28, 598), ligne(3, "Hugo B.", 28, 782), ligne(4, "Sarah T.", 27, 811), ligne(5, "Lucas M.", 27, 905)];
const HIER: DailyBoard = {
  day: "2026-10-30",
  exists: true,
  players: 131,
  playing: 0,
  rows: [ligne(1, "Marie L.", 29, 700), ligne(2, "Hugo B.", 28, 735), ligne(3, "Sarah T.", 28, 890), ligne(4, "Inès K.", 27, 940), ligne(5, "Lucas M.", 26, 1010)],
  me: ligne(19, "Theo", 25, 972, true),
};

const trente = (o: Partial<TodayDaily> = {}): TodayDaily => ({
  format: "trente",
  status: "todo",
  day: JOUR,
  href: "/defi",
  players: 128,
  playing: 3,
  topScore: 29,
  questionCount: 30,
  answered: 0,
  score: null,
  total: null,
  rank: null,
  seconds: null,
  deadline: null,
  closesAt: MINUIT,
  ...o,
});

const cinq = (o: Partial<TodayDaily> = {}): TodayDaily => ({
  format: "cinq",
  status: "todo",
  day: JOUR,
  href: "/defi/cinq",
  players: 342,
  playing: 5,
  topScore: 5,
  questionCount: 5,
  answered: 0,
  score: null,
  total: null,
  rank: null,
  seconds: null,
  deadline: null,
  closesAt: MINUIT,
  ...o,
});

/** La série d'encre de la maquette : 9 jours d'affilée aujourd'hui compris, ×2, joker disponible. */
const SERIE: SerieEncre = {
  jour: JOUR,
  serie: 8,
  aujourdhui: 26,
  fait: true,
  serieAffichee: 9,
  mult: 2,
  joker: true,
  veilleSauvee: false,
  debut: "2026-10-23",
  meilleure: 11,
  seuil: 10,
};

const VAINQUEUR: VainqueurDuJour = {
  day: "2026-10-30",
  userId: "00000000-0000-4000-8000-000000000001",
  name: "Marie L.",
  isMe: false,
  score: 29,
  total: 30,
  seconds: 700,
  players: 131,
  tier: 3,
  placement: false,
  bannerUrl: null,
};

const decale = decaleJour;

const ID_MARIE = "00000000-0000-4000-8000-000000000001";

/** Les cartes des lots 2 à 5 telles que la maquette les montre (aucune lecture : des valeurs écrites ici). */
export function suiteMaquette(): NonNullable<EntreesLobby["suite"]> {
  const copie = (userId: string, nom: string, score: number, minutes: number): DirectBrut["copies"][number] => ({
    userId,
    nom,
    score,
    total: 30,
    finishedAt: new Date(MAINTENANT.getTime() - minutes * 60_000).toISOString(),
    format: "trente",
  });
  const brut: DirectBrut = {
    enLigne: 38,
    duels: 6,
    copies: [
      copie("00000000-0000-4000-8000-000000000002", "Inès K.", 28, 2),
      { ...copie("00000000-0000-4000-8000-000000000003", "Hugo B.", 5, 9), total: 5, format: "cinq" },
      copie("00000000-0000-4000-8000-000000000004", "Sarah T.", 27, 17),
      copie("00000000-0000-4000-8000-000000000005", "Lucas M.", 27, 26),
    ],
    victoires: [],
    masques: [],
    // une partie des 38 joueurs en ligne, nommés (aucune photo dans la maquette : des initiales)
    joueurs: [
      { id: ID_MARIE, nom: "Marie L.", avatarUrl: null },
      { id: "00000000-0000-4000-8000-000000000002", nom: "Inès K.", avatarUrl: null },
      { id: "00000000-0000-4000-8000-000000000003", nom: "Hugo B.", avatarUrl: null },
      { id: "00000000-0000-4000-8000-000000000004", nom: "Sarah T.", avatarUrl: null },
      { id: "00000000-0000-4000-8000-000000000005", nom: "Lucas M.", avatarUrl: null },
    ],
  };
  const rival = construireRival({
    id: ID_MARIE,
    nom: "Marie L.",
    rencontres: 5,
    victoiresMoi: 2,
    victoiresLui: 3,
    pseudoMoi: "Theo",
    moi: { traits: 186, jours: 5, temps: 15000, serie: 9, duels: 3 },
    lui: { traits: 241, jours: 7, temps: 21900, serie: 14, duels: 5 },
    relance: { dispo: true, envoyee: false },
    recue: null,
  });
  const recto = "In a period of rising prices, LIFO vs FIFO: effect on COGS?";
  const verso = "LIFO → COGS plus élevé, résultat plus faible, stocks au bilan plus bas.";
  const joueur = (i: number, nom: string) => ({ id: `00000000-0000-4000-8000-0000000000${String(i).padStart(2, "0")}`, nom, avatarUrl: null });
  const jours = Array.from({ length: 34 }, (_, i): [string, number] => [decale(JOUR, -(i * 9 + 1)), 10 + ((i * 7) % 40)]);
  return {
    enDirect: directDe(brut, MAINTENANT.getTime(), "00000000-0000-4000-8000-000000000099", {
      moi: { nom: "Theo", avatarUrl: null },
      amis: ["00000000-0000-4000-8000-000000000003", "00000000-0000-4000-8000-000000000002"],
    }),
    rival,
    carteDuJour: {
      id: "fsa-lifo-fifo",
      matiere: { cle: "fsa", court: "FSA", code: "FSA" },
      recto,
      verso,
      resume: resumeReglages(REGLAGES_DEFAUT),
      prompt: promptIA(recto, verso),
      reglages: { mats: [...REGLAGES_DEFAUT.mats], src: REGLAGES_DEFAUT.src },
      repli: null,
    },
    scores: {
      copie: { val: "28", unite: "/30", detail: ["le 12 oct."] },
      maitrise: { val: "64", unite: `${NBSP}%`, detail: ["le 28 oct. · meilleure matière : Portefeuille à ", { b: `79${NBSP}%` }] },
      examen: { val: "71", unite: `${NBSP}%`, detail: ["Examen blanc n° 3, le 19 oct."] },
      rang: { val: "Platine I", unite: null, detail: [`1${NBSP}512${NBSP}ELO`] },
    },
    deblocage: { nom: "Laurier", type: "ornement", fait: 4200, total: 5000, reste: `encore 800 questions`, href: "/moi?onglet=pieces", unite: "questions" },
    quete: { titre: "Trois séances de calculs cette semaine", valeur: 2, cible: 3, xp: 60, href: "/codex" },
    grandeSalle: { titre: "Prochain examen blanc dans 6 jours", ligne: "Examen blanc n° 4, samedi 7 novembre", action: { href: "/mock-exams/ex4", libelle: "Voir l'examen blanc" } },
    nouveau: [
      { type: "relance", cle: "relance-marie", jour: JOUR, joueur: joueur(1, "Marie L."), quand: "ce matin" },
      { type: "victoire", cle: "victoire-ines", jour: JOUR, joueur: joueur(2, "Inès K."), duel: "d1", score: [23, 19] },
      { type: "palier", cle: "palier-hugo", jour: decale(JOUR, -1), joueur: joueur(3, "Hugo B."), palier: 3 },
      { type: "depasse", cle: "depasse-sarah", jour: decale(JOUR, -3), joueur: joueur(4, "Sarah T."), ecart: 8 },
    ],
    amis: {
      total: 14,
      enLigne: 3,
      visages: [
        { id: joueur(2, "Inès K.").id, nom: "Inès K.", initiales: "IK", avatarUrl: null, enLigne: true },
        { id: joueur(3, "Hugo B.").id, nom: "Hugo B.", initiales: "HB", avatarUrl: null, enLigne: true },
        { id: joueur(5, "Lucas M.").id, nom: "Lucas M.", initiales: "LM", avatarUrl: null, enLigne: true },
      ],
      demandes: 1,
    },
    carnet: { jours: [...jours, [decale(JOUR, -2), 3], [JOUR, 26]], aujourdhui: JOUR, serie: 9, record: 11, seuil: 10 },
  };
}

/** Les entrées de la maquette (aucune variante). */
export function entrees(): EntreesLobby {
  return {
    now: MAINTENANT,
    jour: JOUR,
    heure: 18,
    dateLabel: "Samedi 31 octobre",
    pseudo: "Theo",
    dejaVenu: true,
    examen: "2027-02-18",
    daily: trente(),
    cinq: cinq(),
    boardAuj: aujourdhui(TOP_AUJ),
    boardHier: HIER,
    repondues: 26,
    objectif: 40,
    serie: SERIE,
    streak: 9,
    dayState: "fait",
    reste: 0,
    vainqueur: VAINQUEUR,
    rating: { elo: 1478, gamesPlayed: 18 },
    place: 7,
    joueurs: 412,
    dernierDelta: 12,
    mastery: 52,
    sobre: false,
    persoVainqueur: null,
    suite: suiteMaquette(),
  };
}

/** Une copie rendue : 27/30, 12e, en 14 min 02. */
const TRENTE_FAIT = trente({ status: "done", answered: 30, score: 27, total: 30, rank: 12, seconds: 842 });
/** Les 5 rendues : 4/5, 12e. */
const CINQ_FAIT = cinq({ status: "done", answered: 5, score: 4, total: 5, rank: 12, seconds: 96 });

/** Le Lobby tel que le composerait `lireLobby` pour cette variante. */
export function exemple(v: Variante = "base"): Lobby {
  const e = entrees();
  switch (v) {
    case "base":
      break;
    case "nouveau":
      // un compte tout neuf : rien lu de personnel, le défi du jour est ouvert à tous
      Object.assign(e, {
        pseudo: "Camille",
        dejaVenu: false,
        examen: null,
        daily: trente({ players: 0, topScore: null }),
        cinq: cinq({ players: 0, topScore: null }),
        boardAuj: { ...aujourdhui([]), players: 0, playing: 0 },
        boardHier: null,
        repondues: 0,
        serie: null,
        streak: 0,
        dayState: "attente",
        reste: null,
        vainqueur: null,
        rating: { elo: 1200, gamesPlayed: 0 },
        place: null,
        joueurs: null,
        dernierDelta: null,
        mastery: 0,
        // un compte tout neuf : ni rival, ni records, ni nouvelles ; le carnet est vide, les amis à trouver
        suite: {
          enDirect: suiteMaquette().enDirect,
          carteDuJour: suiteMaquette().carteDuJour,
          grandeSalle: suiteMaquette().grandeSalle,
          amis: { total: 0, enLigne: null, visages: [], demandes: 0 },
          carnet: { jours: [], aujourdhui: JOUR, serie: 0, record: 0, seuil: 10 },
        },
      } satisfies Partial<EntreesLobby>);
      break;
    case "enCours":
      // la copie des 30 est ouverte : 12 réponses sur 30, 31 min de chrono
      Object.assign(e, {
        daily: trente({ status: "playing", answered: 12, deadline: "2026-10-31T18:01:00Z" }),
        cinq: cinq({ status: "playing", answered: 3 }),
        repondues: 15,
        serie: { ...SERIE, aujourdhui: 15 },
      } satisfies Partial<EntreesLobby>);
      break;
    case "toutFait":
      // les 30 et les 5 rendus, l'objectif tenu : le sceau TENU, plus de bouton d'encre
      Object.assign(e, {
        daily: TRENTE_FAIT,
        cinq: CINQ_FAIT,
        boardAuj: aujourdhui(TOP_AUJ, ligne(12, "Theo", 27, 842, true)),
        repondues: 40,
        serie: { ...SERIE, aujourdhui: 40 },
      } satisfies Partial<EntreesLobby>);
      break;
    case "tenu":
      // la journée tenue sans les défis : seul le sceau change
      Object.assign(e, { repondues: 40, serie: { ...SERIE, aujourdhui: 40 } } satisfies Partial<EntreesLobby>);
      break;
    case "bientot":
      // les 30 « bientôt » (migration pas collée) : les 5 prennent le héros
      Object.assign(e, { daily: trente({ status: "soon", players: 0, topScore: null }), boardAuj: null, boardHier: null } satisfies Partial<EntreesLobby>);
      break;
    case "sansDefis":
      // ni les 30 ni les 5 : Tes traits du jour en grand, une tuile calme
      Object.assign(e, {
        daily: trente({ status: "soon", players: 0, topScore: null }),
        cinq: cinq({ status: "soon", players: 0, topScore: null }),
        boardAuj: null,
        boardHier: null,
      } satisfies Partial<EntreesLobby>);
      break;
    case "placement":
      Object.assign(e, { rating: { elo: 1200, gamesPlayed: 3 }, place: null, joueurs: 412, dernierDelta: null, mastery: 20 } satisfies Partial<EntreesLobby>);
      break;
    case "sansClassement":
      // la lecture du classement échoue : le héros prend sa carte entière
      Object.assign(e, { boardAuj: null, boardHier: null } satisfies Partial<EntreesLobby>);
      break;
    case "sansMigrations": {
      // ni série d'encre, ni classement, ni vainqueur, ni table des relances : l'ancien calcul de la série
      const suite = suiteMaquette();
      if (suite.rival) suite.rival = { ...suite.rival, relance: { ...suite.rival.relance, dispo: false, envoyee: false } };
      Object.assign(e, { serie: null, streak: 4, boardAuj: null, boardHier: null, vainqueur: null, reste: null, suite } satisfies Partial<EntreesLobby>);
      break;
    }
    case "sansDate":
      Object.assign(e, { examen: null } satisfies Partial<EntreesLobby>);
      break;
    case "perso":
      // le vainqueur a envoyé son personnage : il sort du haut de la bande
      Object.assign(e, { persoVainqueur: { src: "/illustrations/accueil-duel.webp", taille: 100, pos: 50 } } satisfies Partial<EntreesLobby>);
      break;
    case "sansExtras":
      // ni clé de service ni migration : aucune des cartes des lots 2 à 5 ne répond
      Object.assign(e, { suite: {} } satisfies Partial<EntreesLobby>);
      break;
    case "sansAdmin": {
      // sans clé de service : ni lobby en direct, ni rival ; la présence des amis ne se lit pas
      const { enDirect: _d, rival: _r, ...reste } = suiteMaquette();
      Object.assign(e, { suite: { ...reste, amis: reste.amis ? { ...reste.amis, enLigne: null } : null } } satisfies Partial<EntreesLobby>);
      break;
    }
    case "sansRival": {
      // le rival et la carte du jour manquent : la rangée 3 disparaît (une affiche seule n'a pas de sens)
      const { rival: _r, carteDuJour: _c, ...reste } = suiteMaquette();
      Object.assign(e, { suite: reste } satisfies Partial<EntreesLobby>);
      break;
    }
    case "sansJour": {
      // pas de carte du jour : le rival et l'affiche se partagent la rangée
      const { carteDuJour: _c, ...reste } = suiteMaquette();
      Object.assign(e, { suite: reste } satisfies Partial<EntreesLobby>);
      break;
    }
  }
  return construireLobby(e);
}
