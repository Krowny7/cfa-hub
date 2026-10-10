// Une cérémonie plein écran est-elle en train de se jouer ? Léonard attend
// qu'elle soit finie pour apparaître (une seule chose à la fois à l'écran).

let fin = 0;
let derniere = 0;

/** La cérémonie qui commence occupera l'écran pendant `ms` millisecondes. */
export function marquerCeremonie(ms: number) {
  fin = Date.now() + ms;
  derniere = fin;
}

/** La cérémonie est finie (passée d'un toucher). */
export function finirCeremonie() {
  fin = 0;
}

/** Millisecondes restantes de la cérémonie en cours (0 : aucune). */
export function resteCeremonie(): number {
  return Math.max(0, fin - Date.now());
}

/** Une cérémonie s'est-elle jouée il y a moins de `ms` millisecondes ? */
export function ceremonieRecente(ms = 20_000): boolean {
  return derniere > 0 && Date.now() - derniere < ms;
}
