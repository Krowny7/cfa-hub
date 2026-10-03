// Petits formats d'affichage de l'accueil (dates à l'heure de Paris,
// durées, temps écoulé). Module neutre (pas de "use client").

const TZ = "Europe/Paris";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « Samedi 3 octobre » */
export function longDay(d: Date) {
  return cap(new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(d));
}

/** « sam. 10 oct. » */
export function shortDay(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: TZ }).format(d);
}

/** « 10 h » ou « 10 h 30 » */
export function hourLabel(d: Date) {
  const [h, m] = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(d).split(":");
  return `${Number(h)} h${m && m !== "00" ? " " + m : ""}`;
}

/** « 2 h 15 », « 45 min » */
export function durationLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
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

/** « J-7 », « Aujourd'hui », « En cours » */
export function countdown(daysLeft: number) {
  if (daysLeft > 0) return `J-${daysLeft}`;
  if (daysLeft === 0) return "Aujourd'hui";
  return "En cours";
}

export function plural(n: number, one: string, many = one + "s") {
  return n > 1 ? many : one;
}

/** Bonjour / Bonsoir selon l'heure à Paris. */
export function helloFor(d: Date) {
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: TZ }).format(d));
  return hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
}
