// La voix de /revoir, « la pile » (sous-page de Réviser, direction « le lieu, puis l'objet ») :
// l'en-tête (chiffre-héros, ligne d'état), la pile des questions dues, la petite pile de demain,
// la table vide tamponnée. Les textes de la séance (règle, erreur, bilan) restent dans REVOIR
// (lib/revisions.ts). Module neutre (client et serveur).

import { NBSP, nombre } from "@/lib/voice";

const s = (n: number) => (n > 1 ? "s" : "");

const JOURS_COURTS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"] as const;
const JOURS_LONGS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"] as const;

export const PILE = {
  /** le retour : la vraie page parente */
  retour: { href: "/reviser", label: "Réviser" },
  /** le coin haut gauche de la carte du dessus */
  carte: "À revoir",
  /** la signature en bas de la carte du dessus */
  signature: "RL",
  aujourdhui: "Aujourd'hui",
  /** sous la pile, une fois la table vide : « Demain · 9 » */
  demain: (n: number) => `Demain${NBSP}·${NBSP}${nombre(n)}`,
  demainSeul: "Demain",
  /**
   * sous la petite pile de demain, quand la file d'aujourd'hui remplit encore le plafond les jours
   * suivants (même hypothèse que previsionRevoir : une séance par jour) : « puis 71 jours à 25 »
   */
  suite: (jours: number, plafond: number) => `puis ${nombre(jours)} jour${s(jours)} à ${nombre(plafond)}`,
  /** l'infobulle de la petite pile : « Samedi 14 · 25 à revoir » */
  jour: (long: string, n: number) => `${long} · ${nombre(n)} à revoir`,
  /** la pile pour un lecteur d'écran : « 25 questions à revoir aujourd'hui, dont FSA 5, EQ 4, autres 3 » */
  pileAria: (n: number, matieres: readonly { code: string; n: number }[]) =>
    `${nombre(n)} question${s(n)} à revoir aujourd'hui` + (matieres.length > 0 ? `, dont ${matieres.map((m) => `${m.code} ${nombre(m.n)}`).join(", ")}` : ""),
  /** les questions de la pile hors des matières écrites sur la carte (trop nombreuses, ou sans matière) */
  autres: "AUTRES",
  /** l'action à l'encre ; `n` : la taille de la séance quand elle ne prend pas toute la pile */
  lancer: "Lancer",
  lancerAria: (n: number) => `Lancer la séance : ${nombre(n)} question${s(n)}`,
  reprendre: "Reprendre",
  reprendreAria: (n: number) => `Reprendre ma séance : ${nombre(n)} à faire`,
  /** le tampon de la table vide (deux lignes) : « Rien jusqu'à demain » seulement si demain apporte quelque chose */
  tampon: (demain: number): readonly [string, string] => (demain > 0 ? ["Rien jusqu'à", "demain"] : ["Tout est", "à jour"]),
  /** le chiffre-héros : la part juste en revue (30 jours), sinon la file entière */
  heros: {
    retenues: "Justes en revue",
    file: "Dans la file",
  },
  /**
   * La ligne d'état de l'en-tête : la composition de la pile, sans redonner ce que la table montre
   * (le compte est sur la carte du dessus, demain sur sa petite pile).
   */
  ligne: (ratures: number, rappels: number) =>
    ratures > 0 && rappels > 0
      ? `${nombre(ratures)} rature${s(ratures)} sèche${s(ratures)} d'abord, puis ${nombre(rappels)} rappel${s(rappels)}.`
      : ratures > 0
        ? ratures > 1
          ? "Que des ratures sèches, la plus ancienne d'abord."
          : "Une rature sèche."
        : rappels > 0
          ? rappels > 1
            ? "Que des rappels, le plus en retard d'abord."
            : "Un rappel."
          : "",
  enCours: (n: number) => `Ta séance t'attend : ${nombre(n)} à faire.`,
  /** la table vide, ou trop peu pour une séance (demain est écrit sur la table) */
  fini: (aujourdhui: number, demain: number) =>
    aujourdhui > 0
      ? `${nombre(aujourdhui)} seulement : trop peu pour une séance, garde-les pour demain.`
      : demain > 0
        ? "Tout est à jour."
        : "Les prochaines reviendront d'elles-mêmes.",
  soon: "« À revoir » arrive bientôt. En attendant, tes ratures t'attendent dans le carnet.",
} as const;

/** Un jour de Paris (« 2026-11-13 ») décalé de k jours : sa clé, « Sam », « Samedi 14 », « SAM 14 ». */
export function jourDe(iso: string, k: number): { cle: string; court: string; long: string; carte: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + k));
  const j = t.getUTCDay();
  const n = t.getUTCDate();
  return {
    cle: t.toISOString().slice(0, 10),
    court: JOURS_COURTS[j],
    long: `${JOURS_LONGS[j]} ${n}`,
    carte: `${JOURS_COURTS[j].toUpperCase()} ${n}`,
  };
}
