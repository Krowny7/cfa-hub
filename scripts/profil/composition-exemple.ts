// Des compositions d'exemple pour les tests de rendu et les aperçus locaux
// (app/preview-da/bannieres) : Léonard (public/leonard, détouré) comme
// personnage, les préréglages du site comme pièces du haut et du bas, avec ou
// sans fond. Aucune base, aucun envoi : les images sont des fichiers du site.
import { compositionDefaut, imagePrereglage, poserCalque, type Composition, type Panneau } from "@/lib/profil/banniere";
import type { ProfilStats } from "@/lib/profil/catalogue";
import { STATS_VIDES, acquisDe } from "@/lib/profil/catalogue";
import { badgesGagnes, type BadgeChoix } from "@/lib/profil/banniere-badges";
import type { DonneesPanneau } from "@/lib/profil/panneau-editeur";
import { donneesPanneau } from "@/lib/profil/panneau-vue";
import { SCEAUX, etatSceau } from "@/lib/profil/sceaux";

export const LEONARD = { fier: "/leonard/pose-fier.webp", moqueur: "/leonard/pose-moqueur.webp", etonne: "/leonard/pose-etonne.webp" } as const;
/** le rapport largeur / hauteur des poses de Léonard (598 × 660) */
export const RATIO_LEONARD = 598 / 660;
export const FOND_EXEMPLE = "/illustrations/classement-lice.webp";

export type VarianteExemple = {
  /** l'image de fond du joueur ; absente : le fond du profil */
  fond?: string | null;
  perso?: keyof typeof LEONARD | null;
  /** la paire de préréglages (« meca », « royal », « epines », « hexa ») */
  pieces?: string | null;
  /** l'ordre d'empilement, du fond vers l'avant */
  ordre?: Composition["ordre"];
  panneau?: Partial<Panneau>;
};

/** Une composition d'exemple, dans les bornes de la scène (poserCalque borne les calques). */
export function compositionExemple(v: VarianteExemple = {}): Composition {
  const base = compositionDefaut();
  const perso = v.perso === null ? base.perso : poserCalque("perso", LEONARD[v.perso ?? "fier"], RATIO_LEONARD);
  const piece = v.pieces === null ? null : (v.pieces ?? "meca");
  return {
    ...base,
    fond: { image: v.fond ?? null, px: 50, py: 50 },
    perso,
    haut: piece ? poserCalque("haut", imagePrereglage(piece), 966 / 334) : base.haut,
    bas: piece ? poserCalque("bas", imagePrereglage(piece), 942 / 377) : base.bas,
    ordre: v.ordre ? [...v.ordre] : base.ordre,
    panneau: { badges: v.panneau?.badges ?? [], stats: v.panneau?.stats ?? base.panneau.stats },
  };
}

/** Des statistiques de joueur d'exemple (pour valeursPanneau). */
export const STATS_EXEMPLE: ProfilStats = { ...STATS_VIDES, questions: 4120, serie: 12, meilleureSerie: 21, duelsGagnes: 48, duelsJoues: 71, defisRendus: 9, calculsJustes: 310, examensBlancs: 4, niveau: 18 };

/**
 * De quoi nourrir l'éditeur de bannière sans base (aperçus et tests) : le
 * rang et les valeurs d'un joueur d'exemple, ses badges proposables (les
 * sceaux d'exemple, un trophée, un titre) décrits comme le serveur les décrit.
 */
export function panneauExemple(nom = "Sforzinda"): { donnees: DonneesPanneau; badges: BadgeChoix[] } {
  const etats = SCEAUX.map((d) => etatSceau(d, { ...STATS_EXEMPLE, meilleureSerie: 45, questions: 6000, duelsGagnes: 120 }));
  const acquis = acquisDe(STATS_EXEMPLE, etats, []);
  const badges: BadgeChoix[] = [
    ...badgesGagnes(acquis),
    { id: "trophee:ciblee:3", genre: "trophee", nom: "Trophée d'or · Entraînement ciblé", detail: "×2" },
    { id: "titre:copiste", genre: "titre", nom: "Copiste", detail: "Premier pas dans le scriptorium" },
  ];
  const donnees = donneesPanneau({
    nom,
    elo: 1612,
    mastery: 62,
    place: 7,
    gamesPlayed: 40,
    stats: STATS_EXEMPLE,
    extras: { secondes: 3600 * 41.5, trophees: 12 },
    etats,
    ids: badges.map((b) => b.id),
  });
  return { donnees, badges };
}
