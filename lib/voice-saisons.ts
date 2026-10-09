// Voix « Le Trait », morceau Saisons du profil : la saison en cours et son
// compte à rebours, le palmarès du Journal, la famille « Saisons » de la
// collection. Même esprit que lib/voice.ts : un mot par chose, toujours le
// chiffre, pas d'emphase. Module neutre (ni « use client » ni serveur).

import { NBSP, nombre, pluriel } from "@/lib/voice";
import { jourCourt } from "@/lib/voice-profil";
import { ordinal } from "@/components/classement/format";
import { TIERS } from "@/lib/ranks";
import { nomPalier, type PalierSaison } from "@/lib/profil/saisons";

/** Ce qui s'inscrit dans le sceau hexagonal : « OR » au-dessus, « I » au centre, « S1 » dessous ; Top 10 : « TOP », « 10 ». */
export function inscriptionSaison(p: PalierSaison, numero: number): { palier: string; division: string; sous: string } {
  const top = !p.division;
  return { palier: top ? "Top" : (TIERS[p.palier]?.name ?? ""), division: top ? "10" : (p.division as string), sous: `S${nombre(numero)}` };
}

/** « 1 sept. » à « 30 nov. 2026 » */
const periode = (debut: string, dernier: string) => `du ${jourCourt(debut)} au ${jourCourt(dernier, true)}`;

export const SAISONS = {
  titre: "Saisons",
  /** « Saison 1 · Novembre 2026 » */
  saison: (numero: number, nom: string) => `Saison ${nombre(numero)} · ${nom}`,
  /** « S1 » */
  court: (numero: number) => `S${nombre(numero)}`,
  periode,
  /** au rendu du serveur, avant le compte à rebours : « jusqu'au 30 nov. » */
  jusquau: (dernier: string) => `jusqu'au ${jourCourt(dernier)}`,
  /** dans le navigateur : jours qui restent avant la fin (minuit, heure de Paris) */
  finDans: (jours: number) => (jours <= 1 ? "dernier jour" : `fin dans ${nombre(jours)}${NBSP}j`),
  /** le pic de la saison en cours */
  picEnCours: (p: PalierSaison, elo: number) => `pic de saison ${nomPalier(p)} · ${nombre(elo)}`,
  picCourt: (p: PalierSaison) => `pic ${nomPalier(p)}`,
  sansMatch: "Pas encore de match classé cette saison.",
  regle: "À la fin de la saison, le pic est gravé en sceau. L'ELO continue, sans remise à zéro.",
  /** le palmarès */
  palmares: "Palmarès",
  palmaresVide: (grave: string) => `Le premier sceau de saison se grave le ${jourCourt(grave)}.`,
  /** « pic Or I · 1 290 » */
  pic: (p: PalierSaison, elo: number) => `pic ${nomPalier(p)} · ${nombre(elo)}`,
  /** « fin Argent I · 5e sur 6 » */
  fin: (p: PalierSaison, place: number, joueurs: number | null) => `fin ${nomPalier(p)} · ${ordinal(place)}${joueurs ? ` sur ${nombre(joueurs)}` : ""}`,
  /** le sceau, lu à voix haute */
  dit: (numero: number, p: PalierSaison) => `Saison ${nombre(numero)} : pic ${nomPalier(p)}`,
  ditEnCours: (numero: number) => `Saison ${nombre(numero)}, en cours`,
  enCours: "en cours",
  // la fiche
  fiche: "Sceau de saison",
  fermer: "Fermer",
  picDeSaison: "Pic de la saison",
  picJusquIci: "Pic jusqu'ici",
  finDeSaison: "Fin de saison",
  matchs: "Matchs classés",
  nbMatchs: (n: number) => pluriel(n, "match", "matchs"),
  /** « Or I · 1 290 » */
  palierElo: (p: PalierSaison, elo: number) => `${nomPalier(p)} · ${nombre(elo)}`,
  /** « Argent I · 1 240 · 5e sur 6 » */
  palierPlace: (p: PalierSaison, elo: number, place: number, joueurs: number | null) =>
    `${nomPalier(p)} · ${nombre(elo)} · ${ordinal(place)}${joueurs ? ` sur ${nombre(joueurs)}` : ""}`,
  grave: "Gravé à la clôture de la saison. Il ne bouge plus.",
  /** la saison en cours, sur son profil */
  aGraver: (grave: string) => `Gravé le ${jourCourt(grave)} : le pic de la saison, tel quel.`,
  voir: (titre: string) => `Voir le sceau ${titre}`,
} as const;
