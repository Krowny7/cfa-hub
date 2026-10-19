// Les textes des sept tuiles de plus de la page de profil : Duels, Jour J,
// Matière phare, Classement, Examens blancs, Codex et Rythme
// (components/profil/blocs/Duels.tsx, JourJ.tsx, Phare.tsx, Classement.tsx,
// Examens.tsx, CodexTuile.tsx, Rythme.tsx). Ceux qui existent déjà ne sont pas
// recopiés : BLOCS_PROFIL (voice-blocs : « Visible par », l'état vide).
// Jamais « il » ni « elle » pour le joueur. Module neutre.

import { NBSP, nombre, pct, pluriel, signe } from "@/lib/voice";
import { romain } from "@/lib/voice-codex";
import type { Visibilite } from "@/lib/profil/catalogue";
import type { IssueDuel, MomentJournee } from "@/lib/profil/blocs-donnees";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
/** « le 12 novembre », « le 1er décembre » (la date : AAAA-MM-JJ) */
export function leJour(date: string): string {
  const [, m, j] = date.split("-").map(Number);
  return `le ${j === 1 ? "1er" : j} ${MOIS[(m || 1) - 1] ?? ""}`.trim();
}

const qui = (v: Visibilite) => (v === "public" ? "tous" : v === "friends" ? "tes amis" : "toi seul");

/** Les jours de la semaine, du lundi au dimanche (la grille du rythme) : l'initiale, le nom. */
export const JOURS_SEMAINE: readonly [string, string][] = [
  ["L", "lundi"],
  ["M", "mardi"],
  ["M", "mercredi"],
  ["J", "jeudi"],
  ["V", "vendredi"],
  ["S", "samedi"],
  ["D", "dimanche"],
];

export const BLOCS_NEUVES = {
  // ── Duels ──
  duels: "Duels",
  deVictoires: "de victoires",
  /** « duels » après le nombre, en gros */
  duelsMot: (n: number) => (Math.abs(n) <= 1 ? "duel" : "duels"),
  victoires: "Victoires",
  /** lu à voix haute : l'anneau */
  anneauDit: (p: number, v: number, n: number) => `${pct(p)} de victoires : ${pluriel(v, "victoire", "victoires")} en ${pluriel(n, "duel", "duels")}`,
  formeDit: (n: number) => `${n > 1 ? `Les ${n} derniers duels` : "Le dernier duel"}, du plus ancien au plus récent`,
  issue: { V: "Victoire", D: "Défaite", N: "Nul" } as Record<IssueDuel, string>,
  /** Personnaliser : seule la suite des derniers duels suit le Journal (les totaux sont publics) */
  formeVisiblePar: (v: Visibilite) => `Les derniers duels : visibles par ${qui(v)} · Moi › Réglages`,

  // ── Jour J ──
  avantExamen: "Avant l'examen",
  jourJ: "Jour J",
  programmeCouvert: "programme couvert à",
  programme: "Programme couvert",
  /** lu à voix haute : la barre */
  couvertDit: (p: number) => `Programme couvert à ${pct(p)}`,
  /** Personnaliser, sans date */
  jourJInvite: "Fixe ta date d'examen dans Moi : le compte à rebours se pose ici.",
  jourJLien: "Régler ma date",
  jourJRien: "pas de date",
  /** « dans 25 jours » pour la lecture à voix haute */
  dans: (n: number) => (n === 0 ? "C'est aujourd'hui" : `Dans ${pluriel(n, "jour", "jours")}`),

  // ── Matière phare ──
  phare: "Matière phare",
  maitrise: "Maîtrise",
  jaugeDit: (nom: string, p: number) => `${nom} : ${pct(p)} de maîtrise`,

  // ── Classement ──
  classement: "Classement",
  rang: "Rang",
  elo: "ELO",
  /** « sur 412 joueurs » */
  surJoueurs: (n: number) => `sur ${nombre(n)} joueurs`,
  /** « ▲ +24 ELO cette semaine » */
  semaine: (v: number) => `${v > 0 ? "▲" : "▼"} ${signe(v)} ELO cette semaine`,
  semaineDit: (v: number) => (v > 0 ? `En hausse de ${nombre(v)} ELO cette semaine` : `En baisse de ${nombre(-v)} ELO cette semaine`),
  cetteSemaine: "Cette semaine",
  /** « encore 72 ELO pour Platine I » */
  encorePour: (pts: number, nom: string) => `encore ${nombre(pts)} ELO pour ${nom}`,
  palierTop: "Le sommet",
  placeDit: (place: number, joueurs: number | null) => `${place === 1 ? "1er" : `${nombre(place)}e`}${joueurs ? ` sur ${nombre(joueurs)} joueurs` : ""}`,

  // ── Examens blancs ──
  examens: "Examens blancs",
  examensN: (n: number) => `Examens blancs · ${nombre(n)}`,
  /** « meilleur 74 % » */
  meilleur: (p: number) => `meilleur ${pct(p)}`,
  meilleurMot: "Meilleur",
  dernier: "Dernier",
  moyenne: "Moyenne",
  seuilLegende: (seuil: number) => `pointillés : ${pct(seuil)}, le seuil visé`,
  barreDit: (rang: number, titre: string | null, p: number) => `${titre ?? `Examen blanc n° ${rang}`} · ${pct(p)}`,
  barresDit: (scores: number[]) => `Examens blancs, du plus ancien au plus récent : ${scores.map(nombre).join(", ")} %`,

  // ── Codex ──
  codex: "Codex",
  /** « acte IV sur VI », « prologue » */
  acteSur: (numero: number, total: number) => (numero === 0 ? "prologue" : `acte ${romain(numero)} sur ${romain(total)}`),
  /** la demi-bande : « Acte IV », puis « sur VI » */
  acteCourt: (numero: number) => (numero === 0 ? "Prologue" : `Acte ${romain(numero)}`),
  surTotal: (total: number) => `sur ${romain(total)}`,
  filAcheve: "fil achevé",
  filAcheveTexte: "Le fil principal est achevé.",
  queteEnCours: "Quête en cours",
  recompense: (r: string) => `récompense : ${r}`,
  filDit: (faits: number, total: number) => `${pluriel(faits, "étape faite", "étapes faites")} sur ${nombre(total)}`,
  xp: (n: number) => `${nombre(n)}${NBSP}XP`,

  // ── Rythme ──
  rythme: "Rythme",
  moments: {
    matin: "plutôt le matin",
    midi: "plutôt le midi",
    "apres-midi": "plutôt l'après-midi",
    soir: "plutôt le soir",
    nuit: "plutôt la nuit",
  } as Record<MomentJournee, string>,
  /** « pic à 21 h » */
  pic: (h: number) => `pic à ${h} h`,
  heure: (h: number) => `${h} h`,
  picMot: "Pic",
  jourFort: "Jour fort",
  fenetre: "60 derniers jours",
  moins: "moins",
  plus: "plus",
  /** l'infobulle d'une case : « mardi 21 h · 14 réponses » */
  caseDit: (jour: string, h: number, n: number) => `${jour} ${h} h · ${pluriel(n, "réponse", "réponses")}`,
  grilleDit: (pic: number, moment: string) => `Ses heures de révision sur 60 jours, du lundi au dimanche : ${moment}, pic à ${pic} h`,
  horlogeDit: (pic: number, moment: string) => `Ses heures de révision sur 24 heures : ${moment}, pic à ${pic} h`,
  momentMot: "Moment",
  lectureHorloge: "Un rayon par heure, sur les 60 derniers jours : plus il est long, plus il y a de réponses.",
} as const;
