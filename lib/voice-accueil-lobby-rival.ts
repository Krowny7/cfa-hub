// La voix de l'accueil « Le lobby », carte « Ton rival » (lot 3) : la comparaison
// d'activité sur sept jours, le verdict, la relance et le défi. Tutoiement,
// nombres à l'espace insécable (lib/voice.ts : nombre, heuresMinutes). Une
// phrase à passages en gras, surlignés ou en rouge est une liste de segments
// (lib/voice-moi.ts : Segment).
// Module neutre (ni « use client » ni serveur) : la carte, l'îlot de relance et
// les calculs du modèle (components/accueil/lobby/modele-rival.ts) l'importent.

import { NBSP, heuresMinutes, nombre, pluriel } from "@/lib/voice";
import type { Segment } from "@/lib/voice-moi";

/** Les cinq mesures de la comparaison, dans l'ordre de la carte. */
export type CleMesure = "traits" | "jours" | "temps" | "serie" | "duels";

const point = (n: number) => `${nombre(n)} ${n > 1 ? "points" : "point"}`;
const sansInsecable = (t: string) => t.split(NBSP).join(" ");
/** « de Marie », « d'Inès » : l'élision devant une voyelle (le h reste « de » : de Hugo). */
const deNom = (nom: string) => (/^[aeiouyàâäéèêëîïôöùûüœ]/i.test(nom) ? `d'${nom}` : `de ${nom}`);

export const RIV = {
  eyebrow: "Ton rival · le plus croisé",
  carte: (nom: string) => `Ton rival : ${nom}`,
  profil: "Son profil",
  profilAria: (nom: string) => `Voir le profil de ${nom}`,
  toi: "Toi",
  periode: "Sur 7 jours",
  liste: (prenom: string) => `Activité des 7 derniers jours, toi contre ${prenom}`,

  /** le libellé de chaque mesure, au centre de sa ligne */
  libelle: { traits: "Traits", jours: "Jours actifs", temps: "Temps sur le site", serie: "Série d'encre", duels: "Duels joués" } satisfies Record<CleMesure, string>,

  /** la valeur affichée de chaque mesure : « 186 », « 5/7 », « 4 h 10 », « 9 j », « 3 » */
  valeur: {
    traits: (n: number) => nombre(n),
    jours: (n: number) => `${n}/7`,
    temps: (secondes: number) => heuresMinutes(secondes),
    serie: (n: number) => `${nombre(n)}${NBSP}j`,
    duels: (n: number) => nombre(n),
  },

  /** la lecture d'une ligne pour un lecteur d'écran : « Jours actifs : toi 5 sur 7, Marie 7 sur 7 » */
  lecture: (cle: CleMesure, toi: number, lui: number, prenom: string): string => {
    const dit = (n: number): string =>
      cle === "jours" ? `${n} sur 7` : cle === "temps" ? sansInsecable(heuresMinutes(n)) : cle === "serie" ? pluriel(n, "jour", "jours") : nombre(n);
    return `${RIV.libelle[cle]} : toi ${dit(toi)}, ${prenom} ${dit(lui)}`;
  },

  // ── le verdict ──
  /** « Marie te devance sur les 5 points. » / « Marie te devance sur 4 points sur 5. » */
  luiDevant: (prenom: string, gagnes: number, sur: number): Segment[] =>
    gagnes === sur ? [`${prenom} te devance sur `, { marque: `les ${sur} points` }, "."] : [`${prenom} te devance sur `, { marque: point(gagnes) }, ` sur ${sur}.`],
  /** « Tu devances Marie sur les 5 points. » / « Tu devances Marie sur 4 points sur 5. » */
  toiDevant: (prenom: string, gagnes: number, sur: number): Segment[] =>
    gagnes === sur ? [`Tu devances ${prenom} sur `, { marque: `les ${sur} points` }, "."] : [`Tu devances ${prenom} sur `, { marque: point(gagnes) }, ` sur ${sur}.`],
  /** « Au coude-à-coude avec Marie : 2 points chacun. » */
  egalite: (prenom: string, chacun: number): Segment[] => [`Au coude-à-coude avec ${prenom} : `, { marque: `${point(chacun)} chacun` }, "."],
  /** tout est à égalité : aucune mesure ne les sépare */
  egaliteTotale: (prenom: string): Segment[] => [`Rien ne te sépare de ${prenom} : `, { marque: "égalité sur tous les points" }, "."],
  /** « Rattrape 55 traits pour l'égaler. » (derrière sur les traits) */
  rattrape: (ecart: number): Segment[] => ["Rattrape ", { neg: pluriel(ecart, "trait", "traits") }, " pour l'égaler."],

  // ── le repli : moins de deux mesures comparables ──
  /** « Tu mènes : 3 victoires sur 5 rencontres. » */
  bilan: (prenom: string, moi: number, lui: number, rencontres: number): string => {
    const v = (n: number) => pluriel(n, "victoire", "victoires");
    const r = pluriel(rencontres, "rencontre", "rencontres");
    if (moi > lui) return `Tu mènes : ${v(moi)} sur ${r}.`;
    if (lui > moi) return `${prenom} mène : ${v(lui)} sur ${r}.`;
    return `À égalité : ${v(moi)} chacun sur ${r}.`;
  },
  bilanSous: "Pas assez de chiffres à comparer sur 7 jours : voici votre bilan.",

  // ── les actions ──
  defi: "Lui lancer un défi",
  defiAria: (nom: string) => `Lancer un défi à ${nom}`,
  relancer: (prenom: string) => `Relancer ${prenom}`,
  relancerAria: (nom: string) => `Relancer ${nom} : un petit mot qui l'invite à jouer`,
  envoi: "Envoi…",
  envoyee: "Relance envoyée",
  /** ce que la personne relancée verra : « Marie verra : « Relance de Theo : à toi de jouer. » » (de : ton pseudo, s'il est connu) */
  apercu: (de: string | null) => (de ? `Relance ${deNom(de)} : à toi de jouer.` : "Relance : à toi de jouer."),
  verra: (prenom: string, mot: string) => `${prenom} verra : « ${mot} »`,
  limite: "Trois relances par jour : reviens demain.",
  indisponible: "La relance n'a pas pu partir. Réessaie dans un instant.",
  connexion: "Connecte-toi pour relancer.",

  // ── la relance reçue ──
  /** « Relance de Marie ce matin : à toi de jouer. » */
  recue: (de: string, quand: string) => `Relance ${deNom(de)} ${quand} : à toi de jouer.`,
  /** le moment de la relance : « ce matin », « cet après-midi », « ce soir », « hier » */
  moment: { matin: "ce matin", apresMidi: "cet après-midi", soir: "ce soir", hier: "hier" },
  /** le nom à dire quand on ne connaît pas le pseudo de l'expéditeur */
  inconnu: "Un joueur",
} as const;
