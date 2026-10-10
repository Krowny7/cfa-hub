// La présentation du site : le premier trait (app/onboarding) puis la visite
// guidée de Léonard. Chaque compte la voit une fois par version : un compte
// déjà configuré qui ne l'a pas vue y repasse, ses réponses d'avant déjà
// remplies (pseudo, jour J), sans rien effacer ni réécrire de ses données.
//
// Marqueurs rangés dans user_metadata (Supabase les fusionne : les autres
// clés, l'objectif par exemple, restent intactes) :
//   rl_presentation  le premier trait vu dans cette version
//   rl_visite        la visite de Léonard vue (ou passée) dans cette version
// Plus un cookie de secours (rl_presentation) si l'écriture du compte échoue :
// le joueur n'est pas renvoyé en boucle sur cet appareil.
// Module sans dépendance : lu par le middleware, les pages et le client.

export const VERSION_PRESENTATION = 2;
export const CLE_PRESENTATION = "rl_presentation";
export const CLE_VISITE_COMPTE = "rl_visite";

type Meta = Record<string, unknown> | null | undefined;

const version = (v: unknown) => Number(v ?? 0) || 0;

/** Le premier trait de cette version est-il déjà fait (compte, ou cookie de secours) ? */
export function presentationVue(meta: Meta, cookie?: string | null) {
  return version(meta?.[CLE_PRESENTATION]) >= VERSION_PRESENTATION || version(cookie) >= VERSION_PRESENTATION;
}

/** La visite de Léonard de cette version est-elle déjà faite sur ce compte ? */
export function visiteVue(meta: Meta) {
  return version(meta?.[CLE_VISITE_COMPTE]) >= VERSION_PRESENTATION;
}

// Les nouveautés : une visite plus courte de Léonard (lib/leonard/repliques,
// NOUVEAUTES), une fois par compte et par version, pour qui a déjà fait la
// visite d'accueil ; sans repasser par le premier trait. Une nouvelle
// version de NOUVEAUTES : monter VERSION_NOUVEAUTES.
//   rl_nouveautes    les nouveautés vues (ou passées) dans cette version
export const VERSION_NOUVEAUTES = 1;
export const CLE_NOUVEAUTES_COMPTE = "rl_nouveautes";

/** Les nouveautés de cette version sont-elles déjà vues sur ce compte ? */
export function nouveautesVues(meta: Meta) {
  return version(meta?.[CLE_NOUVEAUTES_COMPTE]) >= VERSION_NOUVEAUTES;
}
