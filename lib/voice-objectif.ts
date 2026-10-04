// La voix « Le Trait » de l'objectif de questions d'ici l'examen (courbe,
// réglage). Phrases courtes, chiffres exacts, le bout qui manque nommé.
// Module neutre.
import { nombre, pluriel } from "@/lib/voice";
import { OBJECTIF_RECOMMANDE, RYTHME_LIMITE } from "@/lib/objectif-calc";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
/** « 15 février » (clé AAAA-MM-JJ) */
export function jourLong(k: string) {
  const [, m, d] = k.split("-").map(Number);
  return `${d === 1 ? "1er" : d} ${MOIS[(m || 1) - 1]}`;
}

export const parJour = (n: number) => `${nombre(n)} par jour`;

export const OBJECTIF = {
  surTitre: "Objectif d'ici l'examen",
  titre: "Ta trajectoire",
  onglet: "Objectif",
  ajuster: "Ajuster",
  fixer: "Fixer mon objectif",
  fixerDate: "Fixer mon jour J",
  legende: { courbe: "ta courbe", droite: "la droite de l'objectif", recalcule: "l'objectif recalculé" },

  /** l'écart à la droite, ce matin */
  ecart(ecart: number): string {
    const e = Math.round(ecart);
    if (e >= 1) return `En avance de ${nombre(e)} sur la droite.`;
    if (e <= -1) return `En retard de ${nombre(-e)} sur la droite.`;
    return "Pile sur la droite.";
  },

  /** l'objectif du jour, recalculé d'après où tu en es (reste : depuis aujourd'hui compris) */
  recalcul(reste: number, jours: number, quotidien: number): string {
    return `Il en reste ${nombre(reste)} : ${parJour(quotidien)} sur ${pluriel(jours, "jour", "jours")}, recalculé chaque matin.`;
  },

  /** la projection au rythme des 14 derniers jours */
  projection(rythme: number, projection: number, total: number): string {
    if (rythme < 0.5) return "Les 14 derniers jours sont vides : ta courbe attend son prochain trait.";
    const r = rythme < 10 ? Math.round(rythme * 10) / 10 : Math.round(rythme);
    const rs = String(r).replace(".", ",");
    return projection >= total
      ? `À ton rythme (${rs} par jour), tu passes la cible : ${nombre(projection)}.`
      : `À ton rythme (${rs} par jour), tu arriverais à ${nombre(projection)}.`;
  },

  limite: `Plus de ${RYTHME_LIMITE} par jour : revois la cible ou la date.`,
  atteint: (fait: number, total: number) => `Objectif atteint : ${nombre(fait)} sur ${nombre(total)}. Fixe-en un nouveau quand tu veux.`,
  passe: "L'examen est passé. Fixe ta prochaine date pour repartir.",

  /** sans objectif : la proposition */
  vide: {
    titre: "Fixe ton objectif de questions",
    avecDate(avant: number, examen: string, jours: number): string {
      const reste = Math.max(0, OBJECTIF_RECOMMANDE - avant);
      const base = `Combien de questions veux-tu avoir posées le ${jourLong(examen)} ? On en recommande ${nombre(OBJECTIF_RECOMMANDE)}.`;
      if (jours <= 0) return base;
      if (reste <= 0) return `${base} Tu y es déjà : vise plus haut.`;
      return `${base} Tu en as déjà ${nombre(avant)} : il en resterait ${nombre(reste)}, soit ${parJour(Math.ceil(reste / jours))}.`;
    },
    sansDate: `Fixe ton jour J, puis le nombre de questions à poser d'ici là (on en recommande ${nombre(OBJECTIF_RECOMMANDE)}). L'objectif du jour en découle.`,
  },
  sansDate: (total: number) => `Objectif ${nombre(total)} fixé. Il manque ta date d'examen pour en tirer un rythme.`,

  // le réglage
  reglage: {
    titre: "Ton examen",
    texte: "Ta date et ton objectif de questions d'ici là : l'anneau du jour en tire chaque matin ton objectif du jour.",
    date: "Date de l'examen",
    total: "Questions à avoir posées le jour J",
    recommande: "recommandé",
    retirer: "Retirer l'objectif",
    enregistrer: "Enregistrer",
    enregistre: "Enregistré. L'anneau du jour suit ton nouveau rythme.",
    /** aperçu pendant la saisie */
    apercu(deja: number, reste: number, jours: number | null, quotidien: number): string {
      if (jours === null) return "Fixe la date pour voir le rythme.";
      if (jours <= 0) return "Cette date est passée.";
      if (reste <= 0) return `Tu en as déjà ${nombre(deja)} : cible atteinte, vise plus haut.`;
      return `Tu en as déjà ${nombre(deja)}. Reste ${nombre(reste)} en ${pluriel(jours, "jour", "jours")} : ${parJour(quotidien)}.`;
    },
    sansObjectif: "Sans objectif, l'anneau du jour vise 40 questions.",
  },
} as const;
