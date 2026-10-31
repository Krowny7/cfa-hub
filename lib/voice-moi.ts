// La voix de Moi : « La synthèse » (SYN, l'onglet stats), les pages de liste du
// carnet de ratures et des marquées (« Le registre ») et le surtitre des
// réglages (CAB). Les phrases d'ensemble restent dans lib/voice-z1.ts (MOI).

import { fmtInt } from "@/components/classement/format";
import { NBSP, nombre, pct } from "@/lib/voice";

const s = (n: number) => (n > 1 ? "s" : "");

export const CAB = {
  surtitre: (domaine: string, programme: string) => `Moi · ${domaine} · ${programme}`,
};

export const REG = {
  fil: "Moi",
  ratures: {
    kicker: "Ton carnet de ratures",
    titre: (n: number) => `${fmtInt(n)} rature${s(n)}`,
    repere: (retirees: number, semaine: number) =>
      retirees > 0 ? `en cours · ${retirees} retirée${s(retirees)}${semaine > 0 ? `, dont ${semaine} cette semaine` : ""}` : "en cours · rien de retiré pour l'instant",
    phrase: "Une rature sort du carnet quand tu la réussis deux fois de suite. Commence par celles qui reviennent.",
    phraseVide: "Rien à reprendre pour l'instant : les ratures rayées restent dans les anciennes.",
    /** les ratures qui sèchent (migration_v3_profil.sql §3a) */
    phraseSeche: "Une rature se raye quand tu la réussis au moins un jour après l'erreur : l'encre doit sécher. Commence par celles qui reviennent.",
    sechent: (n: number) => `${fmtInt(n)} encore à l'encre fraîche`,
    scellees: (n: number) => `${fmtInt(n)} scellée${s(n)} : ${n > 1 ? "elles tiennent" : "elle tient"}.`,
    action: "Les reprendre une à une",
    liste: "D'où elles viennent",
    listeTitre: "Toutes tes ratures",
    asideKicker: "Mis au propre",
    asideTitre: (n: number) => (n > 0 ? `${n} retirée${s(n)}` : "Rien de retiré"),
    asideLigne: (retirees: number, semaine: number) =>
      retirees > 0 ? `${semaine > 0 ? `${semaine} cette semaine : ` : ""}on raye, on n'efface pas.` : "Une rature sort du carnet quand tu la réussis deux fois de suite.",
    asideLien: "Voir les retirées",
  },
  marquees: {
    kicker: "Tes questions marquées",
    titre: (n: number) => `${fmtInt(n)} marquée${s(n)}`,
    repere: (recente: string, pasRepondues: number) => `la plus récente ${recente}${pasRepondues > 0 ? ` · ${pasRepondues} pas encore répondue${s(pasRepondues)}` : ""}`,
    phrase: "Ce que tu as gardé pour plus tard : l'énoncé, la bonne réponse et l'explication.",
    action: "Les revoir",
    liste: "Par rubrique",
    listeTitre: "Toutes tes questions marquées",
    asideKicker: "Comment ça marche",
    asideTitre: "Marquer",
    asideLigne: "Le bouton « Marquer » apparaît après chaque réponse, partout, et sur chaque flashcard pendant sa révision.",
    asideLien: "Voir la liste",
    /** le sélecteur en haut de la page : les questions ou les flashcards */
    selecteur: "Questions ou flashcards marquées",
    selQuestions: "Questions",
    selFlashcards: "Flashcards",
    /** sans héros (aucune question marquée), quand les flashcards marquées existent aussi */
    kickerTout: "Tes marquées",
    /** ni question ni flashcard marquée */
    videTitre: "Aucune question ni flashcard marquée",
    videLigne:
      "Après avoir répondu à une question (fiche, session, défi du jour, duel), ou pendant la révision d'une flashcard, touche « Marquer » : tu la retrouves ici pour revoir la notion.",
    /** des flashcards marquées, mais aucune question */
    sansQuestion: "Aucune question marquée pour l'instant : touche « Marquer » après une réponse pour la garder ici.",
  },
  /** Moi › Marquées : la partie des flashcards marquées */
  cartes: {
    titre: "Flashcards marquées",
    reviser: "Réviser mes flashcards marquées",
    filtre: "Filtrer par matière",
    toutes: (n: number) => `Toutes · ${fmtInt(n)}`,
    marqueeLe: (jour: string) => `marquée le ${jour}`,
    retiree: "marque retirée",
    paquet: (theme: string) => `Ouvrir le paquet${theme ? ` « ${theme} »` : ""}`,
    /** la lecture a échoué, ou la page date d'avant que les marques de l'appareil rejoignent le compte */
    indisponible: "Les flashcards marquées n'ont pas pu être chargées. Recharge la page dans un instant.",
    surAppareil: (n: number) =>
      `${fmtInt(n)} flashcard${s(n)} marquée${s(n)}, gardée${s(n)} sur cet appareil le temps d'une mise à jour du site : ${n > 1 ? "elles s'afficheront" : "elle s'affichera"} ici ensuite.`,
  },
  rubriquesEgales: (rubriques: string[], n: number) => `${rubriques.length} rubrique${s(rubriques.length)}, ${n} question${s(n)} chacune : ${rubriques.join(", ")}.`,
  reglagesKicker: "Moi · Réglages",
  reglagesTitre: "Réglages",
  profilPublic: "Mon profil public",
};

// ── La page Moi « La synthèse » (maquette D) ──────────────────────────────
// Les textes des cartes de components/moi/synthese/ : le squelette, l'objectif,
// la carte du joueur et la salle des trophées (les autres cartes ajoutent les
// leurs). Tutoiement, nombres à l'espace insécable (lib/voice.ts : nombre, pct).
// Une phrase à passages en gras ou surlignés est une liste de segments : une
// chaîne simple, `{ b }` en gras, `{ marque }` surligné, `{ neg }` en rouge.

/** Un passage d'une phrase : du texte, du gras, un surlignage, ou un chiffre en rouge. */
export type Segment = string | { b: string } | { marque: string } | { neg: string };

const pluriel = (n: number, un: string, plusieurs: string) => `${nombre(n)} ${n > 1 ? plusieurs : un}`;
const enLettres = (n: number) => ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"][n] ?? nombre(n);

export const SYN = {
  fil: (nom: string) => `Moi · ${nom}`,
  titre: "Où tu en es",
  compte: { label: "Ton compte", reglages: "Réglages", pieces: "Mes pièces", personnaliser: "Personnaliser", carnet: "Carnet" },

  // ── Ton objectif ──
  obj: {
    titre: "Ton objectif",
    sous: (total: number, examen: string) => `${nombre(total)} questions d'ici l'examen du ${examen}`,
    avantExamen: "avant l'examen",
    jourJ: "c'est aujourd'hui",
    faitSur: (fait: number, total: number, pc: number) => `${nombre(fait)} questions faites sur ${nombre(total)}, soit ${pct(pc)}`,
    desQuestions: "des questions faites",
    reste: "reste",
    /** « Il t'en faut 16 par jour. Tu en fais 14 en moyenne sur 14 jours : un peu en retard. » */
    ilTenFaut: (quotidien: number, rythme: number, etat: "temps" | "peu" | "retard"): Segment[] => [
      "Il t'en faut ",
      { b: `${nombre(quotidien)} par jour` },
      ". ",
      ...(rythme < 1 ? ["Tu n'en as presque pas fait ces 14 derniers jours"] : ["Tu en fais ", { b: nombre(rythme) }, " en moyenne sur 14 jours"]),
      " : ",
      etat === "temps" ? { b: "dans les temps" } : { marque: etat === "peu" ? "un peu en retard" : "en retard" },
      ".",
    ],
    atteint: (total: number): Segment[] => ["Ton objectif de ", { b: `${nombre(total)} questions` }, " est atteint : bravo. Tu peux continuer à t'entraîner pour garder la main."],
    passe: (fait: number, total: number): Segment[] => ["L'examen est passé : tu as posé ", { b: nombre(fait) }, ` questions sur les ${nombre(total)} visées.`],
    quete: "Ta quête du jour",
    queteValeur: (jour: number, quotidien: number, reste: number) => `${nombre(jour)} / ${nombre(quotidien)} · ${reste > 0 ? `encore ${nombre(reste)}` : "faite"}`,
    queteAria: (jour: number, quotidien: number) => `${pluriel(jour, "question faite", "questions faites")} sur ${nombre(quotidien)} aujourd'hui`,
    /** le bouton de la quête : ce qu'il reste à faire aujourd'hui, ou aller plus loin */
    faire: (reste: number) => (reste <= 0 ? "S'entraîner encore" : reste === 1 ? "Faire ma dernière question" : `Faire mes ${nombre(reste)} questions`),
    trajectoire: "Ta trajectoire jusqu'au jour J",
    trajectoireAria: (depuis: string, fait: number, quotidien: number, examen: string, rythme: number, projection: number) =>
      `Questions faites depuis le ${depuis} : ${nombre(fait)} aujourd'hui. À ${nombre(quotidien)} par jour tu atteins l'objectif le ${examen} ; à ${nombre(rythme)} par jour, ${nombre(projection)}.`,
    auj: "auj.",
    legendeFait: "fait",
    legendeParJour: (n: number) => `${nombre(n)} par jour`,
    legendeRythme: (n: number) => `ton rythme : ${nombre(n)}`,
    /** « Ce que ça veut dire : à 14 par jour, tu finis à 2 780 le 18 février, 220 sous ton objectif ; deux de plus par jour et tu y es. » */
    pied: "Ce que ça veut dire :",
    ceQueCaVeutDire: (rythme: number, projection: number, examen: string, ecart: number, deplus: number): string =>
      ecart < 0
        ? `à ${nombre(rythme)} par jour, tu finis à ${nombre(projection)} le ${examen}, ${nombre(-ecart)} sous ton objectif ; ${enLettres(deplus)} de plus par jour et tu y es.`
        : `à ${nombre(rythme)} par jour, tu atteins ton objectif avant l'examen : ${nombre(projection)} questions le ${examen}.`,
    // sans objectif ni date : la carte garde son titre
    sans: { titre: "Fixe ton jour J", phrase: "Avec une date d'examen et un objectif de questions, cette page te dit chaque jour combien en poser et où les prendre.", action: "Régler mon objectif" },
    // la jauge « Si l'examen était aujourd'hui »
    jauge: {
      titre: "Si l'examen était aujourd'hui",
      aria: (note: number, seuil: number) => `Note estimée ${pct(note)}, seuil ${pct(seuil)}`,
      explication: (seuil: number): Segment[] => ["Ta note estimée : tes matières pondérées par leur poids à l'examen. Seuil : ", { b: pct(seuil) }, "."],
      manque: (points: number): Segment[] => ["Il te manquerait ", { neg: pluriel(points, "point", "points") }, " pour passer."],
      passe: "Tu serais au-dessus du seuil.",
      gagner: "Où les gagner →",
      tot: (couverture: number) => `Encore tôt : ${pct(couverture)} du programme mesuré. La note estimée apparaît quand la moitié du programme est mesurée.`,
    },
  },

  // ── Carte du joueur ──
  joueur: {
    cabinet: "Ton cabinet",
    profil: "Mon profil",
    insigne: (palier: string) => `Insigne ${palier}`,
    eloLigne: (elo: number, place: string | null) => `${nombre(elo)}${NBSP}ELO${place ? ` · ${place}` : ""}`,
    place: (rang: number, joueurs: number) => `${rang === 1 ? "1er" : `${rang}e`} sur ${nombre(joueurs)}`,
    placement: (jouees: number, total: number) => `Placement ${jouees}/${total}`,
    barreAria: (elo: number, de: number, vers: number) => `${nombre(elo)}${NBSP}ELO, entre ${nombre(de)} et ${nombre(vers)}`,
    plusQue: (reste: number, cible: string): Segment[] => ["Plus que ", { b: `${nombre(reste)}${NBSP}ELO` }, ` avant ${cible}`],
    verrou: (lock: number, cible: string) => `${pct(lock)} de maîtrise requis pour ${cible}`,
    placementReste: (reste: number) => `Plus que ${pluriel(reste, "partie classée", "parties classées")} pour avoir ton rang`,
    sommet: "Tu fais partie des 10 meilleurs.",
    sommetElo: "Dernier palier d'ELO : le Top 10 se gagne à la place.",
    temps: { titre: "Temps sur le site", semaine: (duree: string) => `${duree} ces 7 jours`, depuis: (jour: string) => `depuis le ${jour}` },
    codex: { titre: "Codex", sous: (xp: number) => `quêtes faites · ${nombre(xp)} XP`, vide: "aucune quête faite pour l'instant", aRecuperer: (n: number) => `${nombre(n)} à récupérer`, recuperer: (n: number) => (n === 1 ? "Récupérer ma quête →" : `Récupérer mes ${nombre(n)} quêtes →`) },
    marquees: {
      titre: "Marquées",
      sous: (questions: number | null, cartes: number | null) =>
        [questions !== null ? pluriel(questions, "question", "questions") : null, cartes !== null ? pluriel(cartes, "flashcard", "flashcards") : null].filter(Boolean).join(" · "),
      vide: "rien de marqué pour l'instant",
      /** aucune des deux listes ne répond (tables non collées) : la ligne reste, sans chiffre */
      sansSource: "questions et flashcards gardées pour plus tard",
      aucune: "—",
    },
  },

  // ── Salle des trophées ──
  trophees: {
    titre: "Salle des trophées",
    compte: (n: number) => `${pluriel(n, "trophée gagné", "trophées gagnés")}`,
    vide: "Aucun trophée encore : 5/5 aux 5 du jour, ou une séance ciblée à 70 %.",
    dernier: "Dernier gagné",
    /** sans migration_v3_profil.sql §2 : seul l'entraînement ciblé est compté */
    partiel: "Les autres trophées arrivent avec la prochaine mise à jour.",
  },

  // ── Tes matières (grande carte, lot 3) ──
  matieres: {
    titre: "Tes matières",
    /** la définition unique de la maîtrise : la matière et la notion suivent la même règle, seule la fenêtre change */
    definition: (seuil: number): Segment[] => [
      "Ta ",
      { b: "maîtrise" },
      ` : la part de tes réponses justes aux questions récentes (60 dernières par matière, 20 par notion ; une question revue le jour même compte moins). Acquis à ${pct(seuil)}.`,
    ],
    affichage: { label: "Affichage", radar: "Radar", barres: "Barres" },
    comparer: { eyebrow: "Se comparer à", toi: "Toi il y a", label: "Se comparer à toi il y a", option: (j: number) => `${j}${NBSP}j` },
    tri: { label: "Trier", programme: "Programme", faible: "Du plus faible" },
    legende: {
      toi: "Toi aujourd'hui",
      avant: (j: number) => `Toi il y a ${j}${NBSP}j`,
      seuil: (seuil: number) => `seuil ${pct(seuil)}`,
      sous50: (bas: number) => `sous ${pct(bas)}`,
      entre: (bas: number, seuil: number) => `${bas} à ${pct(seuil)}`,
      acquis: "acquis",
      repere: (j: number) => `repère : il y a ${j}${NBSP}j`,
    },
    radarAria: (j: number | null) => `Radar de ta maîtrise dans les 10 matières, aujourd'hui${j ? ` et il y a ${j} jours` : ""}`,
    /** les 3 repères de l'anneau du radar */
    anneaux: { cinquante: "50", seuil: (seuil: number) => pct(seuil), cent: "100" },
    nouvelle: "nouvelle",
    pasMesuree: "pas encore mesurée",
    tiret: "—",
    /** le nom lu d'un bouton de matière : « Éthique : 58 %, +7 points face à toi il y a 30 jours. Ouvrir sa fiche. » */
    bouton: (nom: string, valeur: string, ecart: string | null) => `${nom} : ${valeur}${ecart ? `, ${ecart}` : ""}. Ouvrir sa fiche.`,
    valeurAria: (pc: number | null, provisoire: boolean) => (pc === null ? "pas encore mesurée" : provisoire ? `environ ${pct(pc)}, mesure provisoire` : pct(pc)),
    ecartAria: (texte: string, j: number) => `${texte} points face à toi il y a ${j} jours`,
    nouvelleAria: (j: number) => `nouvelle, pas encore mesurée il y a ${j} jours`,
    barres: { aide: "Clique une barre pour ouvrir sa fiche.", poids: (p: string) => `poids ${p}`, axe: "0" },
    // la vue d'ensemble
    ensemble: {
      kicker: "Vue d'ensemble",
      globale: ["maîtrise globale,", "pondérée comme l'examen"] as const,
      globaleAria: (v: string) => `Maîtrise globale ${v}, pondérée comme l'examen`,
      points: (texte: string, d: number) => `${texte} point${Math.abs(d) > 1 ? "s" : ""}`,
      zones: { haute: (seuil: number) => `${pct(seuil)} et plus`, moyenne: (bas: number, seuil: number) => `Entre ${bas} et ${pct(seuil)}`, basse: (bas: number) => `Sous ${pct(bas)}`, aucune: "Pas encore mesurées" },
      hausse: (j: number) => `En hausse sur ${j}${NBSP}j`,
      surTotal: (n: number, total: number) => `${n} sur ${total}`,
      plusForte: "Ta plus forte :",
      plusFaible: "Ta plus faible :",
      ouvrir: (court: string) => `Ouvrir ${court}`,
      evolution: (j: number) => `En ${j} jours, matière par matière`,
      classement: "Du plus fort au plus faible",
      evoAria: (nom: string, texte: string, j: number) => `${nom} : ${texte} points en ${j} jours. Ouvrir sa fiche.`,
      evoNouvelle: (nom: string, j: number) => `${nom} : nouvelle, pas encore mesurée il y a ${j} jours. Ouvrir sa fiche.`,
      classAria: (nom: string, valeur: string) => `${nom} : ${valeur}. Ouvrir sa fiche.`,
      astuce: (notions: boolean, evolution: boolean) => `Choisis une matière, ici ou sur le graphique, pour ouvrir sa fiche : ${[notions ? "ses notions" : null, evolution ? "son évolution" : null, "quoi réviser"].filter(Boolean).join(", ")}.`,
    },
    // la fiche d'une matière
    fiche: {
      aria: "Vue d'ensemble ou fiche de la matière",
      kicker: "Fiche matière",
      fermer: "Fermer la fiche",
      ecart: (texte: string, j: number) => `${texte} en ${j} jours`,
      poids: "Poids",
      reponses: "Réponses",
      avant: (j: number) => `Il y a ${j}${NBSP}j`,
      gain: "À gagner",
      gainPts: (x: string) => `+${x}${NBSP}pts`,
      acquise: "acquise",
      evolution: "Son évolution · il y a…",
      auj: "auj.",
      provisoire: "provisoire",
      notions: (resume: string) => `Ses notions · ${resume}`,
      aucuneNotion: "aucune notion mesurée",
      sous70: (n: number, seuil: number) => `${n} sous ${pct(seuil)}`,
      enCours: (n: number) => `${n} en cours`,
      jamaisVues: (n: number, source: "unique" | "90j") => (source === "90j" ? `${n} pas vue${n > 1 ? "s" : ""} depuis 90${NBSP}j` : `${n} jamais vue${n > 1 ? "s" : ""}`),
      valeurEnCours: (n: number, min: number) => `${n}/${min}`,
      valeurJamais: (source: "unique" | "90j") => (source === "90j" ? "pas vue" : "jamais vue"),
      legende: { acquise: "acquise", enCours: "en cours", jamais: (source: "unique" | "90j") => (source === "90j" ? "pas vue depuis 90 j" : "jamais vue") },
      notionsAria: "Notions de la matière",
      reviser: (court: string) => `Réviser ${court}`,
      entrainer: "S'entraîner →",
      retour: "Choisis-la de nouveau, ou la croix, pour revenir à la vue d'ensemble.",
    },
    // « Ce que ça veut dire »
    pied: "Ce que ça veut dire :",
    lire: {
      aucune: (min: number) => `aucune matière n'est encore mesurée : il faut ${min} réponses dans une matière pour la juger.`,
      prise: (j: number, d: number, avant: number, apres: number) =>
        d > 0
          ? `en ${j} jours, tu as pris ${pluriel(d, "point", "points")} (${avant} → ${pct(apres)})`
          : d < 0
            ? `en ${j} jours, tu as perdu ${pluriel(-d, "point", "points")} (${avant} → ${pct(apres)})`
            : `en ${j} jours, tu es resté à ${pct(apres)}`,
      progres: (nUp: number, k: number, baisse: boolean) =>
        nUp === 0 ? ", et aucune matière n'a progressé" : `${baisse ? ", mais" : " et"} progressé dans ${nUp === k ? (k === 1 ? "ta seule matière comparable" : `les ${k} matières`) : `${nUp} matière${nUp > 1 ? "s" : ""} sur ${k}`}`,
      hausse: (tops: string[], best: string) => `Plus forte hausse : ${enListe(tops)} (${best}).`,
      faibleItem: (court: string, avant: number | null, apres: number) => (avant === null ? `${court} (${pct(apres)})` : `${court} (${avant} → ${pct(apres)})`),
      faibles: (liste: string[], verbe: string | null) => `${enListe(liste)} ${verbe ? `${verbe}, mais ${liste.length > 1 ? "restent" : "reste"}` : liste.length > 1 ? "restent" : "reste"} sous ${pct(50)} : c'est là que ça se joue.`,
      verbe: (cle: "double" | "presque" | "vite" | "simple", plur: boolean) =>
        cle === "double" ? (plur ? "ont doublé ou presque" : "a doublé ou presque") : cle === "presque" ? (plur ? "ont presque doublé" : "a presque doublé") : cle === "vite" ? (plur ? "progressent vite" : "progresse vite") : plur ? "progressent" : "progresse",
      aucuneFaible: (seuil: number) => `Aucune matière sous ${pct(50)} : vise maintenant le seuil de ${pct(seuil)}.`,
      // sans historique (migration non collée, ou joueur trop récent)
      situation: (glob: number, nPasse: number, nMesurees: number, seuil: number) =>
        `tu es à ${pct(glob)} de maîtrise globale : ${nPasse} sur ${nMesurees} ${nMesurees > 1 ? "matières mesurées" : "matière mesurée"} ${nPasse === 1 ? "passe" : "passent"} le seuil de ${pct(seuil)}.`,
      faiblesSimples: (liste: string[]) => `${enListe(liste)} ${liste.length > 1 ? "restent" : "reste"} sous ${pct(50)} : c'est là que ça se joue.`,
      // une matière choisie
      matEcart: (court: string, avant: number, apres: number, j: number, texte: string) => `${court} : de ${avant} à ${pct(apres)} en ${j} jours (${texte}).`,
      matNouvelle: (court: string, apres: number, j: number) => `${court} : ${pct(apres)}, mesurée depuis moins de ${j} jours.`,
      matSimple: (court: string, apres: number) => `${court} : ${pct(apres)}.`,
      matPasMesuree: (court: string, reste: number) => `${court} n'est pas encore mesurée : encore ${reste} réponse${reste > 1 ? "s" : ""} et elle compte.`,
      auDessus: "Au-dessus du seuil",
      avantSeuil: (points: number) => `Encore ${points} point${points > 1 ? "s" : ""} avant le seuil`,
      notionsSous: (nSous: number, mesurees: number, seuil: number) => `${nSous} de ses notions ${nSous > 1 ? "sont" : "est"} sous ${pct(seuil)} sur ${mesurees} mesurée${mesurees > 1 ? "s" : ""} : la fiche te dit lesquelles`,
      notionsToutes: (seuil: number) => `toutes ses notions mesurées passent ${pct(seuil)}`,
      notionsAucune: "aucune de ses notions n'est encore mesurée",
      matProvisoire: (n: number, min: number) => ` Mesure provisoire (${n} réponses sur ${min}).`,
    },
  },
};

/** « A », « A et B », « A, B et C ». */
function enListe(a: readonly string[]): string {
  return a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} et ${a[a.length - 1]}`;
}

/** Les noms des matières, courts (clés de TOPICS), en français : barres, légendes, cases. */
export const COURTS_FR: Record<string, string> = {
  ethics: "Éthique",
  quant: "Quant",
  economics: "Économie",
  fsa: "FSA",
  corporate: "Entreprise",
  equity: "Actions",
  fixed_income: "Fixed Income",
  derivatives: "Dérivés",
  alternatives: "Alternatifs",
  portfolio: "Portefeuille",
};

/** Les mêmes, encore plus courts, pour les sommets du radar et les rangées étroites. */
export const MINIS_FR: Record<string, string> = {
  ethics: "Éthique",
  quant: "Quant",
  economics: "Éco",
  fsa: "FSA",
  corporate: "Entreprise",
  equity: "Actions",
  fixed_income: "Fixed Inc.",
  derivatives: "Dérivés",
  alternatives: "Altern.",
  portfolio: "Portef.",
};
