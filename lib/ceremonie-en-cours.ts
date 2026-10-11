// Une cérémonie plein écran est-elle en train de se jouer ? Léonard attend
// qu'elle soit finie pour apparaître (une seule chose à la fois à l'écran).

let fin = 0;
let derniere = 0;
// La goutte d'encre du résultat (components/adn/GoutteVerdict) passe avant les
// cérémonies : elle retient l'écran sans compter comme une cérémonie fêtée
// (Léonard ne se tait pas pour autant sur le sans-faute).
let finGoutte = 0;

/** La cérémonie qui commence occupera l'écran pendant `ms` millisecondes. */
export function marquerCeremonie(ms: number) {
  fin = Date.now() + ms;
  derniere = fin;
}

/** La cérémonie est finie (passée d'un toucher). */
export function finirCeremonie() {
  fin = 0;
}

/** Millisecondes restantes de la cérémonie en cours, goutte comprise (0 : aucune). */
export function resteCeremonie(): number {
  return Math.max(0, fin - Date.now(), finGoutte - Date.now());
}

/** La goutte d'encre occupera l'écran pendant `ms` millisecondes. */
export function marquerGoutte(ms: number) {
  finGoutte = Date.now() + ms;
}

/** La goutte est finie (ou n'aura pas lieu). */
export function finirGoutte() {
  finGoutte = 0;
}

/** Millisecondes restantes de la goutte d'encre (0 : aucune). Les cérémonies attendent. */
export function resteGoutte(): number {
  return Math.max(0, finGoutte - Date.now());
}

/** Une cérémonie s'est-elle jouée il y a moins de `ms` millisecondes ? */
export function ceremonieRecente(ms = 20_000): boolean {
  return derniere > 0 && Date.now() - derniere < ms;
}
