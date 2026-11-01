// Petits formats d'affichage de l'accueil « Le lobby » (date du jour à l'heure de
// Paris, temps écoulé). Module neutre (pas de "use client"), mais à n'appeler
// qu'au serveur : la date passe par Intl, que les îlots clients n'emploient pas.

const TZ = "Europe/Paris";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « Samedi 3 octobre » */
export function longDay(d: Date) {
  return cap(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(d));
}

/** « à l'instant », « il y a 2 h », « hier », « il y a 4 j » */
export function agoLabel(iso: string, now = Date.now()) {
  const ms = now - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 2) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "hier" : `il y a ${d} j`;
}
