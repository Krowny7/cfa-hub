import { displayName, initials } from "@/components/classement/format";
import { barreRang, rangSynthese } from "@/components/moi/synthese/modele";
import type {
  AfficheLobby,
  BandeVainqueurLobby,
  CalmeLobby,
  CarteCinqLobby,
  CarteDefi,
  CarteRangLobby,
  CarteTraitsLobby,
  ClassementLobby,
  EnteteLobby,
  JourClassement,
  Lobby,
  PersoVainqueur,
  PhaseLobby,
} from "@/components/accueil/lobby/types";
import { dayHref, rankLine, reviewHref, shiftDay, timeLeftLabel, type DailyBoard, type DailyBoardRow, type TodayDaily } from "@/lib/daily";
import { phaseDe } from "@/lib/codex/catalogue";
import { joursEntre } from "@/lib/objectif-calc";
import { PLACEMENT_GAMES, TIERS } from "@/lib/ranks";
import { libelleMult, type SerieEncre } from "@/lib/serie-encre";
import type { VainqueurDuJour } from "@/lib/vainqueur-du-jour";
import { NBSP, nombre, pctScore, titreAccueil, ENCRE, type EtatJour } from "@/lib/voice";
import { LOBBY } from "@/lib/voice-accueil-lobby";
import type { Segment } from "@/lib/voice-moi";

// Les calculs PURS de l'accueil « Le lobby », lot 1 : aucun accès à la base,
// aucun Intl, aucune date lue sur l'horloge (le jour de Paris arrive en
// paramètre). donnees.ts lit, ce fichier compose le contrat (types.ts) ;
// scripts/accueil/test-lobby.tsx le vérifie sans base. Les fonctions
// `defiEnTete` et `cinqVisible` viennent de l'ancien accueil (components/defi
// DefiHero et CinqCarte, supprimés) : leur règle vit ici désormais.

// ── Les défis du jour : qui est jouable, qui reste à faire ────────────────

/** Le défi prend la carte héros quand il est jouable ou joué aujourd'hui. */
export function defiEnTete(daily: TodayDaily | null | undefined): daily is TodayDaily {
  return !!daily && (daily.status === "todo" || daily.status === "playing" || daily.status === "done");
}

/** Les 5 du jour se montrent dans les mêmes cas que les 30. */
export function cinqVisible(daily: TodayDaily | null | undefined): daily is TodayDaily {
  return defiEnTete(daily);
}

/** Un défi du jour à faire (à rendre ou en cours) : c'est lui qui peut porter le bouton d'encre. */
export const aFaire = (x: TodayDaily | null | undefined): x is TodayDaily => !!x && (x.status === "todo" || x.status === "playing");

// ── Les dates, sans Intl ──────────────────────────────────────────────────

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « 2027-02-18 » → « 18 février 2027 » ; le 1er se dit « 1er ». Chaîne illisible : null. */
export function dateLongue(jour: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(jour ?? "");
  if (!m) return null;
  const mois = MOIS[Number(m[2]) - 1];
  if (!mois) return null;
  const j = Number(m[3]);
  return `${j === 1 ? "1er" : j}${NBSP}${mois}${NBSP}${m[1]}`;
}

/** « encore 5 h » → « 5 h » (insécable) ; null une fois la fenêtre passée. */
export function resteAvantGel(daily: Pick<TodayDaily, "closesAt">, nowIso: string): string | null {
  const t = timeLeftLabel(daily.closesAt, nowIso);
  return t ? t.replace(/^encore /, "").replace(" ", NBSP) : null;
}

// ── L'en-tête ─────────────────────────────────────────────────────────────

/** Jours avant l'examen à partir du jour de Paris (0 = jour J) ; null sans date ou une fois passé. */
export function joursAvantExamen(examen: string | null, jour: string): number | null {
  if (!examen) return null;
  const n = joursEntre(jour, examen);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Déjà venu au moins une fois : un jour d'activité connu (même règle que l'ancien accueil). */
export function dejaVenu(jours: (string | null | undefined)[]): boolean {
  return jours.some((j) => !!j && /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(j));
}

/** « Bon retour, Theo » (déjà venu) ou « Bienvenue, Theo » ; sans pseudo, le mot seul. */
export function salutDe(pseudo: string | null | undefined, venu: boolean): string {
  const nom = pseudo?.trim() || null;
  return venu ? LOBBY.entete.bonRetour(nom) : LOBBY.entete.bienvenue(nom);
}

export function enteteLobby(o: { pseudo: string | null; dejaVenu: boolean; examen: string | null; jour: string }): EnteteLobby {
  return { jn: joursAvantExamen(o.examen, o.jour), dateExamen: dateLongue(o.examen), salut: salutDe(o.pseudo, o.dejaVenu) };
}

// ── Les 30 du jour (ou, à défaut, les 5) en héros ─────────────────────────

/** Les tuiles, l'action et la puce du héros, selon l'état de la copie (à rendre, en cours, rendue). */
export function carteDefi(daily: TodayDaily, o: { nowIso: string; dateLabel: string }): CarteDefi {
  const D = LOBBY.defi;
  const V = daily.format === "cinq" ? D.cinq : D.trente;
  const total = daily.total ?? daily.questionCount;
  const reste = resteAvantGel(daily, o.nowIso);
  const gel = reste ? [{ val: reste, lib: D.tuiles.gel }] : [];
  const base = { format: daily.format, date: o.dateLabel, statut: D.seFige(reste) };

  if (daily.status === "done") {
    const rang = rankLine(daily.rank, daily.players);
    return {
      ...base,
      etat: "done",
      tuiles: [{ val: `${daily.score ?? 0}/${total}`, lib: D.tuiles.tonScore }, ...(rang ? [{ val: rang, lib: D.tuiles.tonRang }] : []), ...gel],
      progression: null,
      action: { href: reviewHref(daily.day, undefined, daily.format), libelle: V.revoir },
      second: { href: dayHref(daily.day, daily.format), libelle: D.classementDuJour },
    };
  }
  if (daily.status === "playing") {
    const chrono = timeLeftLabel(daily.deadline, o.nowIso)?.replace(/^encore /, "").replace(" ", NBSP) ?? null;
    return {
      ...base,
      etat: "playing",
      tuiles: [{ val: `${daily.answered}/${daily.questionCount}`, lib: D.tuiles.repondues }, ...(chrono ? [{ val: chrono, lib: D.tuiles.chrono }] : []), ...gel],
      progression: { faites: daily.answered, total: daily.questionCount },
      action: { href: daily.href, libelle: V.reprendre },
      second: null,
    };
  }
  return {
    ...base,
    etat: "todo",
    tuiles: [
      { val: nombre(daily.players), lib: D.tuiles.joueurs },
      ...(daily.topScore !== null && daily.players > 0 ? [{ val: `${daily.topScore}/${daily.questionCount}`, lib: D.tuiles.meilleure }] : []),
      ...gel,
    ],
    progression: null,
    action: { href: daily.href, libelle: V.rendre },
    second: null,
  };
}

// ── Le classement des 30 ──────────────────────────────────────────────────

/** Un rang en toutes lettres courtes : « 1er », « 2e ». */
export const rangEn = (n: number) => LOBBY.rang.rangEn(n);

/** La ligne d'un joueur du classement. Le temps ne se montre que pour les trois premiers. */
function ligne(r: DailyBoardRow, i: number): JourClassement["lignes"][number] {
  return { rang: r.rank, nom: displayName(r.username, r.userId), score: `${r.score}/${r.total}`, temps: i < 3 ? LOBBY.classement.en(r.seconds) : null };
}

/** Ta ligne à part : copie rendue (depuis le classement, sinon depuis le résumé du jour), en cours, à rendre, ou pas jouée hier. */
function ligneToi(o: { cle: "auj" | "hier"; me: DailyBoardRow | null; daily: TodayDaily | null }): JourClassement["toi"] {
  const T = LOBBY.classement.toi;
  const d = o.daily;
  if (o.me) {
    return { titre: T.rang(rangEn(o.me.rank)), sous: LOBBY.classement.en(o.me.seconds), val: `${o.me.score}/${o.me.total}`, rendu: true };
  }
  if (o.cle === "auj" && d && d.status === "done" && d.rank !== null && d.score !== null) {
    return { titre: T.rang(rangEn(d.rank)), sous: d.seconds !== null ? LOBBY.classement.en(d.seconds) : "", val: `${d.score}/${d.total ?? d.questionCount}`, rendu: true };
  }
  if (o.cle === "auj" && d && d.status === "playing") {
    return { titre: T.enCours(d.answered, d.questionCount), sous: T.enCoursSous, val: T.aTerminer, rendu: false };
  }
  if (o.cle === "auj") return { titre: T.pasRendu, sous: T.pasRenduSous, val: T.aRendre, rendu: false };
  return { titre: T.pasJoue, sous: T.pasJoueSous, val: T.tiret, rendu: false };
}

/** Le classement d'un jour, prêt à afficher. `daily` : ton résumé du jour (aujourd'hui seulement). */
export function jourClassement(o: { cle: "auj" | "hier"; board: DailyBoard; jour: string; daily?: TodayDaily | null; reste?: string | null }): JourClassement {
  const C = LOBBY.classement;
  const premier = o.board.rows[0];
  return {
    cle: o.cle,
    etat: o.cle === "auj" ? C.direct : C.fige,
    direct: o.cle === "auj",
    joueurs: C.joueurs(o.board.players),
    lignes: o.board.rows.slice(0, 5).map(ligne),
    toi: ligneToi({ cle: o.cle, me: o.board.me, daily: o.daily ?? null }),
    pied: o.cle === "auj" ? C.pied.seFige(o.reste ?? null) : premier ? C.pied.vainqueur(displayName(premier.username, premier.userId)) : C.pied.figeAucun,
    href: dayHref(o.jour),
  };
}

/**
 * Le classement accolé au héros : celui d'aujourd'hui (null sans lecture : le
 * héros reprend toute sa carte) et celui d'hier (null sans défi hier : pas de
 * sélecteur).
 */
export function classementLobby(o: {
  jour: string;
  boardAuj: DailyBoard | null;
  boardHier: DailyBoard | null;
  daily: TodayDaily | null;
  nowIso: string;
  /** ton pseudo (null : inconnu), pour le rond de ta ligne « Toi » */
  pseudo?: string | null;
}): ClassementLobby | null {
  if (!o.boardAuj) return null;
  const reste = o.daily ? resteAvantGel(o.daily, o.nowIso) : null;
  const hier = o.boardHier && o.boardHier.exists ? jourClassement({ cle: "hier", board: o.boardHier, jour: shiftDay(o.jour, -1) }) : null;
  return {
    titre: LOBBY.classement.titre,
    aujourdhui: jourClassement({ cle: "auj", board: o.boardAuj, jour: o.jour, daily: o.daily, reste }),
    hier,
    // sans pseudo : l'initiale de « Toi »
    initiales: initials(o.pseudo?.trim() || LOBBY.vainqueur.toi),
  };
}

// ── Les 5 du jour ─────────────────────────────────────────────────────────

/** Cinq cases : vides (à jouer), faites (en cours) ou, une fois rendues, d'abord les justes. */
export function casesDesCinq(daily: Pick<TodayDaily, "status" | "answered" | "score" | "questionCount" | "total">): CarteCinqLobby["cases"] {
  const n = daily.total ?? daily.questionCount;
  const faites = daily.status === "done" ? n : daily.status === "playing" ? Math.min(daily.answered, n) : 0;
  const justes = daily.status === "done" ? Math.min(Math.max(daily.score ?? 0, 0), n) : 0;
  return Array.from({ length: n }, (_, i) => (i < justes ? "juste" : i < faites ? "faite" : null));
}

export function carteCinq(daily: TodayDaily): CarteCinqLobby {
  const C = LOBBY.cinq;
  const total = daily.total ?? daily.questionCount;
  const etat = daily.status === "done" ? "done" : daily.status === "playing" ? "playing" : "todo";
  let ligneEtat: Segment[] | null = null;
  if (etat === "done") {
    const p = pctScore(daily.score ?? 0, total);
    const r = rankLine(daily.rank, daily.players);
    ligneEtat = [{ b: `${daily.score ?? 0}/${total}` }, ...(p ? [` · ${p}`] : []), ...(r ? [` · ${r}`] : [])];
  } else if (etat === "playing") {
    ligneEtat = [C.enCours(daily.answered, daily.questionCount)];
  }
  return {
    etat,
    cases: casesDesCinq(daily),
    joueurs: daily.players,
    meilleur: daily.topScore !== null && daily.players > 0 ? `${daily.topScore}/${daily.questionCount}` : null,
    ligne: ligneEtat,
    action:
      etat === "done"
        ? { href: reviewHref(daily.day, undefined, "cinq"), libelle: C.revoir }
        : { href: daily.href, libelle: etat === "playing" ? C.reprendre : C.jouer },
  };
}

// ── Tes traits du jour ────────────────────────────────────────────────────

/** Le titre vivant de la carte, sans prénom (l'en-tête le dit déjà) et sans point final. */
export function titreDesTraits(o: { repondues: number; objectif: number; heure: number; serie: number }): string {
  return titreAccueil({ nom: null, repondues: o.repondues, objectif: o.objectif, heure: o.heure, serie: o.serie }).replace(/[.]$/, "");
}

export function carteTraits(o: {
  repondues: number;
  /** parmi les réponses du jour, les calculs (le reste : des questions) */
  calculs?: number;
  objectif: number;
  jour: string;
  heure: number;
  /** les jours d'encre (aujourd'hui compris s'il est fait) */
  streak: number;
  serie: SerieEncre | null;
  dayState: EtatJour;
  /** questions qui manquent pour que le jour compte (null : ancien calcul) */
  reste: number | null;
  jn: number | null;
  /** le bouton d'encre de la carte : les 30 et les 5 sont faits ou absents */
  plein: boolean;
}): CarteTraitsLobby {
  const T = LOBBY.traits;
  const tenu = o.repondues >= o.objectif;
  const mult = o.serie && o.serie.mult > 1 ? libelleMult(o.serie.mult) : null;
  const suite: Segment[] = mult ? T.palier(mult) : o.streak > 0 ? [T.palierProche] : [];
  const phrase: Segment[] = tenu ? [T.phraseTenue] : suite.length ? [...T.phraseAFaire(), " ", ...suite] : T.phraseAFaire();
  const soir = o.dayState === "sec" && o.streak > 0;
  const libelle = soir && o.reste !== null ? ENCRE.pourGarder(o.reste) : T.gagner;
  const calculs = Math.max(0, Math.min(o.repondues, o.calculs ?? 0));
  return {
    repondues: o.repondues,
    objectif: o.objectif,
    tenu,
    detail: { questions: o.repondues - calculs, calculs, texte: T.detail(o.repondues - calculs, calculs), aria: T.detailAria(o.repondues, o.objectif, o.repondues - calculs, calculs) },
    jour: o.jour,
    titre: titreDesTraits({ repondues: o.repondues, objectif: o.objectif, heure: o.heure, serie: o.streak }),
    phrase,
    serie: o.streak > 0 ? { jours: o.streak, mult } : null,
    joker: o.serie && o.serie.serieAffichee > 0 ? (o.serie.joker ? "disponible" : "pris") : null,
    jn: o.jn,
    action: o.plein && !tenu ? { href: "/reviser", libelle } : null,
  };
}

// ── Le vainqueur d'hier ──────────────────────────────────────────────────

export function bandeVainqueur(v: VainqueurDuJour): BandeVainqueurLobby {
  const V = LOBBY.vainqueur;
  return {
    nom: v.isMe ? V.toi : v.name,
    moi: v.isMe,
    ligne: [{ b: `${v.score}/${v.total}` }, " en ", { b: V.duree(v.seconds) }, `, ${V.devant(v.players)}`],
    palier: v.placement ? V.placement : TIERS[Math.max(0, Math.min(TIERS.length - 1, v.tier))].name,
    fond: v.bannerUrl,
    href: dayHref(v.day),
    perso: null,
  };
}

// ── Ton rang et ta phase de révision ─────────────────────────────────────

/**
 * La phase de révision, aux seuils du Codex (`phaseDe`) : découverte (fondations,
 * plus de 90 jours), consolidation (31 à 90), sprint final (30 jours et moins,
 * veillée comprise). Sans date ou une fois l'examen passé : null.
 */
export function phaseLobby(jn: number | null): PhaseLobby | null {
  if (jn === null) return null;
  const p = phaseDe(jn);
  const index = p === "fondations" ? 0 : p === "consolidation" ? 1 : p === "repetition" || p === "veillee" ? 2 : null;
  if (index === null) return null;
  return { index, libelles: [...LOBBY.phase.libelles], sur: LOBBY.phase.sur(index) };
}

export function carteRang(o: {
  elo: number;
  gamesPlayed: number;
  /** la maîtrise du programme (0–100), qui verrouille les rangs */
  mastery: number;
  place: number | null;
  joueurs: number | null;
  /** le dernier écart d'ELO (null : aucun duel, ou écart nul) */
  dernier: number | null;
  jn: number | null;
}): CarteRangLobby {
  const R = LOBBY.rang;
  const r = rangSynthese({ elo: o.elo, gamesPlayed: o.gamesPlayed, mastery: o.mastery, place: o.place, joueurs: o.joueurs });
  const chiffres = r.placement
    ? [{ val: `${r.jouees}/${PLACEMENT_GAMES}`, lib: R.partiesClassees }]
    : [
        { val: nombre(o.elo), lib: R.elo },
        ...(o.place !== null ? [{ val: rangEn(o.place), lib: R.place(o.joueurs) }] : []),
        ...(o.dernier ? [{ val: R.delta(o.dernier), lib: R.dernierDuel }] : []),
      ];
  return { tier: r.tier, division: r.division, palier: r.palier, placement: r.placement, maitrise: r.maitrise, chiffres, barre: barreRang(r), phase: phaseLobby(o.jn) };
}

// ── L'assemblage ─────────────────────────────────────────────────────────

/** Les deux affiches par défaut (images du site, légendes courtes, aucun lien). */
export const AFFICHES: { rival: AfficheLobby; scores: AfficheLobby } = {
  rival: { nom: "duel-lice", position: "50% 50%" },
  scores: { nom: "reviser-bibliotheque", legende: "La Bibliothèque", position: "50% 50%" },
};

/** Tout ce que lit `construireLobby` : des valeurs déjà lues, aucune requête. */
export type EntreesLobby = {
  now: Date;
  /** le jour d'aujourd'hui à Paris */
  jour: string;
  /** l'heure de Paris, 0–23 */
  heure: number;
  /** « Samedi 1er novembre » */
  dateLabel: string;
  pseudo: string | null;
  dejaVenu: boolean;
  /** le jour de l'examen, « AAAA-MM-JJ » */
  examen: string | null;
  daily: TodayDaily | null;
  cinq: TodayDaily | null;
  boardAuj: DailyBoard | null;
  boardHier: DailyBoard | null;
  /** les questions du jour, recalées sur la copie ouverte (withLiveDaily) */
  repondues: number;
  /** parmi elles, les calculs (l'infobulle de l'anneau) */
  calculs?: number;
  objectif: number;
  serie: SerieEncre | null;
  streak: number;
  dayState: EtatJour;
  reste: number | null;
  vainqueur: VainqueurDuJour | null;
  rating: { elo: number; gamesPlayed: number };
  place: number | null;
  joueurs: number | null;
  dernierDelta: number | null;
  mastery: number;
  sobre: boolean;
  /** le personnage de la bannière du vainqueur (lot 2) ; null : il n'en a pas */
  persoVainqueur?: PersoVainqueur | null;
  /** les blocs des lots 2 à 5, déjà lus : chacun vaut null quand sa source manque */
  suite?: Partial<Pick<Lobby, "enDirect" | "rival" | "carteDuJour" | "scores" | "deblocage" | "quete" | "grandeSalle" | "nouveau" | "amis" | "carnet">>;
};

/**
 * Le contrat de la page (types.ts) à partir de ce que `lireLobby` a lu. Les
 * blocs des lots 2 à 5 arrivent dans `suite` (null quand leur source manque).
 */
export function construireLobby(e: EntreesLobby): Lobby {
  const nowIso = e.now.toISOString();
  const trente = defiEnTete(e.daily) ? e.daily : null;
  const cinq = cinqVisible(e.cinq) ? e.cinq : null;
  // les 30 d'abord ; « bientôt » ou indisponibles, les 5 prennent le héros
  const defiHeros = trente ?? cinq;
  const entete = enteteLobby({ pseudo: e.pseudo, dejaVenu: e.dejaVenu, examen: e.examen, jour: e.jour });
  const plein = !aFaire(trente) && !aFaire(cinq);
  const suite = e.suite ?? {};
  const calme: CalmeLobby | null = defiHeros ? null : { etat: e.daily?.status === "soon" ? "bientot" : "indispo" };
  return {
    entete,
    heros: defiHeros ? carteDefi(defiHeros, { nowIso, dateLabel: e.dateLabel }) : null,
    classement: trente ? classementLobby({ jour: e.jour, boardAuj: e.boardAuj, boardHier: e.boardHier, daily: trente, nowIso, pseudo: e.pseudo }) : null,
    cinq: trente && cinq ? carteCinq(cinq) : null,
    calme,
    traits: carteTraits({
      repondues: e.repondues,
      calculs: e.calculs,
      objectif: e.objectif,
      jour: e.jour,
      heure: e.heure,
      streak: e.streak,
      serie: e.serie,
      dayState: e.dayState,
      reste: e.reste,
      jn: entete.jn,
      plein,
    }),
    vainqueur: e.vainqueur ? { ...bandeVainqueur(e.vainqueur), perso: e.persoVainqueur ?? null } : null,
    rang: carteRang({ elo: e.rating.elo, gamesPlayed: e.rating.gamesPlayed, mastery: e.mastery, place: e.place, joueurs: e.joueurs, dernier: e.dernierDelta, jn: entete.jn }),
    enDirect: suite.enDirect ?? null,
    rival: suite.rival ?? null,
    carteDuJour: suite.carteDuJour ?? null,
    scores: suite.scores ?? null,
    deblocage: suite.deblocage ?? null,
    quete: suite.quete ?? null,
    grandeSalle: suite.grandeSalle ?? null,
    affiches: AFFICHES,
    nouveau: suite.nouveau ?? null,
    amis: suite.amis ?? null,
    carnet: suite.carnet ?? null,
    jour: {
      repondues: e.repondues,
      serieAffichee: e.serie ? e.serie.serieAffichee : 0,
      cleSerie: e.serie ? (e.serie.debut ?? e.serie.jour) : null,
      doubleDeja: !!e.serie && e.serie.mult === 2,
      sobre: e.sobre,
    },
  };
}
