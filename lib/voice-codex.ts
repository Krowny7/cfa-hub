// La voix du Codex : les mots de l'écran (page /codex, accueil, cérémonies).
// Léger et présent : un ton de carnet, quelques clins d'œil à Florence, jamais
// lourd. Les titres d'actes, les répliques d'actes et les phases viennent du
// catalogue (lib/codex/catalogue.ts) ; ici, ce que l'écran ajoute.
// Module neutre, sans dépendance au catalogue (utilisable côté navigateur).

import type { EtapeBranche, Famille } from "@/lib/codex/types";
import type { EtatLigne } from "@/lib/codex/vue";

export const CODEX = {
  nom: "Codex",
  titre: "Le carnet de Léonard",
  sousTitre: "Ce qu'il y a à faire, dans l'ordre où ça sert.",
  kicker: (phase: string) => `Codex · ${phase}`,
  quetesFaites: (f: number, t: number) => `${f} sur ${t} quêtes`,
  xpGagnee: (xp: number) => `${xp.toLocaleString("fr-FR")} XP gagnés ici`,
  /** null une fois le jour J passé (la phase « Après l'épreuve » le dit déjà) */
  jourJ: (n: number): string | null => (n === 0 ? "C'est le jour J" : n > 0 ? `J-${n}` : null),
  toutMontrer: "Tout montrer",
  toutMontrerAide: "Le carnet se dévoile au fil de tes séances. Si tu préfères tout voir tout de suite, c'est permis.",
  prochaine: {
    eyebrow: "Ta prochaine quête",
    aller: "J'y vais",
    entamee: "Déjà entamée",
    rien: "Plus rien d'urgent. Pose un trait quand même, la plume refroidit.",
    minutes: (m: number) => `environ ${m} min`,
  },
  trame: {
    titre: "La trame",
    sous: "Du premier trait au jour J, acte par acte.",
    clos: "Acte clos",
    enCours: "En cours",
    aVenir: "À venir",
    bonus: "facultatif",
  },
  contrats: {
    titre: "Les contrats du jour",
    sous: "Trois, taillés pour toi. Trois quarts d'heure, pas plus.",
    emplacement: { faiblesse: "Ton point faible", entretien: "L'entretien", variete: "La variété" } as Record<string, string>,
    changer: "Changer",
    changerAide: "Un changement par jour, pas sur un contrat déjà rempli.",
    changeDeja: "Tu as déjà changé un contrat aujourd'hui.",
    trio: (xp: number) => `Les trois remplis : +${xp} XP de bonus`,
    trioFait: (xp: number) => `Trio tamponné, +${xp} XP`,
    semaine: "Cette semaine",
  },
  branches: {
    titre: "Les branches de matière",
    sous: "Une par matière. Chacune pousse à son rythme, de la première fiche au titre de maître.",
    maitre: "Maître",
    etapes: {
      entree: "Premier pas",
      cours: "Cours",
      fiche: "Fiche",
      drill: "Drill",
      flashcards: "Cartes",
      ciblee: "Séance ciblée",
      serie: "Série juste",
      tour: "Tour complet",
      carte: "Carte tenue",
      maitrise60: "Maîtrise 60 %",
      maitrise75: "Maîtrise 75 %",
      signature: "Épreuve signature",
      maitre: "Maître",
    } satisfies Record<EtapeBranche, string>,
  },
  longCours: {
    titre: "Les quêtes au long cours",
    sous: "Les grands chantiers, qui se comptent en semaines.",
    palier: (i: number, n: number) => `Palier ${i} sur ${n}`,
    suivant: "Ensuite",
    fini: "Chantier achevé",
  },
  exploits: {
    titre: "Les exploits",
    sous: "Certains sont cachés. Je ne dirai rien. Enfin, presque rien.",
    enigme: "Une énigme",
    gagnes: (n: number) => (n === 0 ? "Aucun pour l'instant" : n === 1 ? "1 exploit" : `${n} exploits`),
    /** les sceaux du profil ont quitté les exploits (D5) : ils sont dans la Collection du profil */
    collection: "Voir la Collection",
  },
  pageBlanche: "Cette page du carnet est encore blanche. Elle se remplira d'elle-même, ou d'un clic sur « Tout montrer ».",
  /** une deuxième page blanche sur le même écran : la phrase entière n'est dite qu'une fois */
  pageBlancheAussi: "Encore blanche, elle aussi.",
  etat: { verrouillee: "Pas encore", disponible: "À faire", active: "En cours", terminee: "Tamponnée" } as Record<EtatLigne, string>,
  // satisfies : une famille nouvelle sans libellé ne compile pas
  famille: { trame: "Trame", branche: "Branche", longcours: "Long cours", contrat: "Contrat", exploit: "Exploit", fil: "Fil rouge" } satisfies Record<Famille, string>,
  detail: {
    objectif: "À faire",
    pourquoi: "Pourquoi",
    recompense: "Récompense",
    xp: (n: number) => `+${n} XP`,
    /** l'XP réellement versée (plafonnée à ton niveau) : on ne montre que ce qu'on a reçu */
    xpPlafonnee: (v: number) => `+${v} XP`,
    faiteLe: (d: string) => `Tamponnée le ${d}`,
    faiteAvant: (d: string) => `Déjà acquise avant le ${d} : Léonard l'a trouvée en feuilletant ton carnet`,
    reclamer: "Réclamer la récompense",
    reclame: "Récompense versée",
    aller: "Y aller",
    fermer: "Fermer",
    optionnelle: "Facultative : elle ne bloque rien.",
    /** un miroir (V3 §8.2) : la même quête, payée une seule fois */
    compteeAvec: (titre: string) => `Comptée avec « ${titre} » : une seule récompense pour les deux.`,
    duree: (m: number) => `environ ${m} min`,
    titreGagne: (t: string) => `Titre : ${t}`,
    cosmetique: (c: string) => `Pièce : ${c}`,
  },
  indisponible: {
    titre: "Le Codex n'est pas encore ouvert",
    ligne: "Le carnet est en cours de reliure : reviens dans quelques instants. Tout le reste du site marche normalement.",
    retour: "Retour à l'accueil",
  },
  accueil: {
    maQuete: "Ta quête",
    contrats: "Contrats du jour",
    ouvrir: "Ouvrir le Codex",
  },
  fete: {
    quete: "Quête accomplie",
    acte: "Un acte se referme",
    acteNouveau: (t: string) => `Le rideau se lève sur « ${t} ».`,
    suite: "Voir le Codex",
    autres: (n: number) => (n === 1 ? "et une autre quête tamponnée" : `et ${n} autres quêtes tamponnées`),
    devoile: "Une pièce de l'atelier vient de s'ouvrir",
  },
  retro: {
    titre: "Léonard a feuilleté ton carnet",
    ligne: (q: number, xp: number) => (q <= 1 ? `Une quête était déjà accomplie : +${xp} XP.` : `${q} quêtes étaient déjà accomplies : +${xp} XP, plafonnés à ton niveau.`),
    actes: (n: number) => (n === 1 ? "1 acte déjà refermé" : `${n} actes déjà refermés`),
    ok: "Merci, Léonard",
  },
};

/** Les mots de Léonard sur une quête, selon son état (déterministe : même quête, même phrase). */
export const REPLIQUES_QUETE: Record<EtatLigne, string[]> = {
  terminee: ["Tamponnée. Je ne reviens pas dessus.", "Celle-là, c'est dans le carnet pour de bon.", "Proprement faite. Je range mes vannes.", "Un tampon de plus, et pas du genre qu'on efface."],
  active: ["Elle a commencé à prendre forme. Continue, ne la laisse pas sécher.", "Tu y es presque, ou pas loin. À toi de voir lequel des deux.", "Le trait est posé, il reste à le repasser.", "En cours, c'est le meilleur état : la peinture est encore fraîche."],
  disponible: ["Elle t'attend depuis un moment, elle ne mord pas.", "Prends ton temps, mais pas toute la matinée.", "Rien de compliqué. Juste le premier trait.", "Celle-ci est ouverte pour toi."],
  verrouillee: ["Pas encore. Il faut d'abord finir ce qui la précède.", "Elle viendra, une fois les marches d'avant montées.", "Fermée encore. Chaque chose en son temps, disait mon maître.", "Je vois que tu regardes déjà plus loin. J'aime ça."],
};

export const choisirReplique = (etat: EtatLigne, id: string): string => {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const l = REPLIQUES_QUETE[etat];
  return l[h % l.length];
};

export function romain(n: number): string {
  const t: [number, string][] = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let r = "";
  for (const [v, s] of t) while (n >= v) { r += s; n -= v; }
  return r || String(n);
}
