// Présence des joueurs (migration_presence.sql) : « En ligne », sinon « vu il
// y a 3 h ». Chaque onglet visible envoie un signal toutes les minutes
// (components/presence/PresenceHeartbeat) ; get_presence rend l'âge du
// dernier signal, compté à l'heure du serveur. Module pur, sans état :
// utilisable côté serveur comme côté client.

/** La présence d'un joueur telle que lue (secondsAgo à l'instant `at`, horloge locale). */
export type Presence = {
  /** le joueur montre sa présence (réglage) */
  visible: boolean;
  /** âge du dernier signal en secondes ; null si masqué */
  secondsAgo: number | null;
  /** Date.now() au moment de la lecture */
  at: number;
};

/** En ligne : un signal de moins de 2 min 30 (un signal par minute, plus une marge). */
export const EN_LIGNE_SECONDES = 150;

/** Intervalle des signaux et des relectures (ms). */
export const PRESENCE_INTERVALLE = 60_000;

/** Âge du dernier signal, maintenant (secondes) ; null si masqué ou inconnu. */
export function ageDe(p: Presence | null | undefined, now = Date.now()): number | null {
  if (!p || !p.visible || p.secondsAgo === null) return null;
  return p.secondsAgo + Math.max(0, now - p.at) / 1000;
}

export function enLigne(p: Presence | null | undefined, now = Date.now()) {
  const s = ageDe(p, now);
  return s !== null && s <= EN_LIGNE_SECONDES;
}

const TZ = "Europe/Paris";
const JOUR_CLE = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const JOUR = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: TZ });
const JOUR_AN = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });

/** Jours de calendrier (Paris) entre deux instants : 0 aujourd'hui, 1 hier… */
function joursEntre(avant: number, apres: number) {
  const a = Date.parse(JOUR_CLE.format(new Date(avant)) + "T00:00:00Z");
  const b = Date.parse(JOUR_CLE.format(new Date(apres)) + "T00:00:00Z");
  return Math.round((b - a) / 86_400_000);
}

export type FormeLibelle = {
  /** listes : sans « vu » (« il y a 3 h ») */
  court?: boolean;
  /** au fil d'une phrase : « en ligne », « vu il y a 3 h » */
  minuscule?: boolean;
  now?: number;
};

/**
 * « En ligne », « Vu il y a 5 min », « Vu il y a 3 h », « Vu hier »,
 * « Vu il y a 4 jours », « Vu le 12 sept. ». Version courte (listes) :
 * « en ligne », « il y a 3 h »… null si masqué ou inconnu. Au-delà de
 * 24 h, les jours sont ceux du calendrier (Paris) : « hier » est bien hier.
 */
export function libellePresence(p: Presence | null | undefined, { court = false, minuscule = false, now = Date.now() }: FormeLibelle = {}): string | null {
  const s = ageDe(p, now);
  if (s === null) return null;
  const maj = !court && !minuscule;
  if (s <= EN_LIGNE_SECONDES) return maj ? "En ligne" : "en ligne";
  const vu = court ? "" : maj ? "Vu " : "vu ";
  const min = Math.max(1, Math.floor(s / 60));
  if (min < 60) return `${vu}il y a ${min} min`;
  const h = Math.floor(min / 60);
  const quand = now - s * 1000;
  const j = joursEntre(quand, now);
  if (h < 24 && j === 0) return `${vu}il y a ${h} h`;
  if (j <= 1) return court ? "hier" : `${vu}hier`;
  if (j < 7) return `${vu}il y a ${j} jours`;
  const fmt = new Date(quand).getFullYear() === new Date(now).getFullYear() ? JOUR : JOUR_AN;
  return `${court ? "le" : `${vu}le`} ${fmt.format(new Date(quand))}`;
}
