// Textes de la page Vidéos (app/videos) : la télé et ses trois chaînes (lib/videos : CHAINES).
import type { CategorieVideo } from "@/lib/videos";

const virgule = (n: number) => String(n).replace(".", ",");
const s = (n: number) => (n > 1 ? "s" : "");

export const VIDEOS_TXT = {
  titre: "Vidéos",
  vue: (pct: number) => (pct >= 100 ? "Vue en entier" : `Vue à ${pct} %`),
  reste: (duree: string) => `encore ${duree}`,
  programme: "Le programme",
  frise: "La vidéo en entier, matière par matière",
  allerPartie: (i: number, titre: string) => `Partie ${i} : ${titre}`,
  precedente: "Partie précédente",
  suivante: "Partie suivante",
  vitesse: (r: number) => `${virgule(r)}×`,
  vitesseAide: (r: number) => `Vitesse de lecture : ${virgule(r)}×. Appuie pour changer.`,
  /** dans le guide, sous une vidéo entamée */
  repriseCourte: (h: string) => `reprise à ${h}`,
  partieVue: "Vue",
  indisponible: "La vidéo ne se charge pas pour le moment. Réessaie dans un instant.",

  /** la télé */
  tele: "La télé",
  chaines: "Les chaînes",
  chaine: (n: number, nom: string) => `Chaîne ${n} : ${nom}`,
  /** l'incrustation en haut de l'écran : « 3 · RÉSUMÉ » */
  incrustation: (n: number, court: string) => `${n} · ${court}`,
  bientot: "Bientôt",
  compteur: "Position dans la vidéo",
  compteurVide: "--:--",
  /** la 2e ligne du compteur : la durée de la vidéo entière (« SUR 1:04:31 ») ; « REPRISE » tant qu'on n'a pas relancé
   *  (le compteur montre alors l'endroit où l'on s'était arrêté) */
  cadranTotal: (h: string) => `sur ${h}`,
  cadranReprise: "reprise",
  cadranTotalVide: "-:--:--",
  /** la plaque du meuble, sous l'écran : « PARTIE 05/12 » puis le titre de la partie ; une chaîne vide : « CHAÎNE 1 » et son nom */
  partieCourte: (i: number, n: number) => `Partie ${String(i).padStart(2, "0")}/${String(n).padStart(2, "0")}`,
  chaineCourte: (n: number) => `Chaîne ${n}`,

  /** le guide des programmes de la chaîne, à côté de la télé */
  guide: (n: number, nom: string) => `Chaîne ${n} · ${nom}`,
  aLEcran: "À l'écran",
  enPreparation: "En préparation",

  /** la ligne d'état de la porte (lue sur l'appareil, après le montage) */
  nbVideos: (n: number) => `${n} vidéo${s(n)}`,
  entamees: (n: number) => `${n} entamée${s(n)}`,
  vues: (n: number) => `${n} vue${s(n)} en entier`,
  aucuneCommencee: (n: number) => (n > 1 ? "aucune commencée" : "pas commencée"),

  /** le chiffre-héros de la porte : ce qu'il reste à voir sur la chaîne (ou sa durée si rien n'est commencé) */
  herosReste: "restantes",
  herosNeuve: "à voir",
  herosVue: "vues en entier",
  herosVueUne: "vue en entier",
  /** « 2 H 21 » : le chiffre-héros en capitales */
  heures: (minutes: number) => {
    const t = Math.max(0, Math.round(minutes));
    const h = Math.floor(t / 60);
    const m = t % 60;
    return h > 0 ? `${h} H ${String(m).padStart(2, "0")}` : `${m} MIN`;
  },
  /** tout est vu : « 3/3 » */
  herosFini: (n: number) => `${n}/${n}`,
} as const;

/** Les trois chaînes : leur nom, leur nom court sur la touche, et ce qu'elles diffusent (dit sur l'écran tant qu'elles sont vides). */
export const CHAINES_TXT: Record<CategorieVideo, { nom: string; court: string; promesse: string }> = {
  intro: {
    nom: "Introduction",
    court: "Intro",
    promesse: "Le tour de chaque sujet : la vue d'ensemble, sans le détail.",
  },
  cours: {
    nom: "Cours",
    court: "Cours",
    promesse: "Les cours complets, filmés dans le détail.",
  },
  resume: {
    nom: "Résumé",
    court: "Résumé",
    promesse: "La synthèse des 10 matières, pour les derniers jours.",
  },
};

export const minutesDe = (secondes: number): number => Math.max(1, Math.round(secondes / 60));

/** « 1 h 04 » à partir d'une heure, « 32 min » en dessous. */
export const dureeTexte = (secondes: number): string => {
  const m = Math.round(secondes / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${Math.max(1, m)} min`;
};

export const horodatage = (s: number): string => {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), r = t % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
};
