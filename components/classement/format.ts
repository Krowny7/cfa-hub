// Petites mises en forme partagées par Classement, Moi et les profils.
// Module neutre (pas de "use client") : utilisable côté serveur comme client.
import { TIERS, TOP_TIER } from "@/lib/ranks";

/** 1312 → « 1 312 » (espace fine insécable, comme en français). */
export function fmtInt(n: number) {
  return Math.round(n).toLocaleString("fr-FR");
}

/** +24 / −14 (vrai signe moins), 0 → « ±0 ». */
export function signed(n: number) {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return "±0";
}

/** 1 → « 1er », 7 → « 7e ». */
export function ordinal(n: number) {
  return n === 1 ? "1er" : `${n}e`;
}

export function shortId(id: string) {
  return id ? id.split("-")[0] : "";
}

/** Pseudo affiché, ou un identifiant court si le joueur n'en a pas encore. */
export function displayName(username: string | null | undefined, id: string) {
  return username?.trim() || `Joueur ${shortId(id)}`;
}

export function initials(label: string) {
  const base = (label || "?").replace(/[^a-zA-Z0-9À-ÿ]+/g, " ").trim();
  const parts = base.split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Fourchette d'ELO d'un palier, pour la piste des paliers. */
export function tierRange(i: number) {
  const t = TIERS[i];
  if (i === TOP_TIER) return "les 10 meilleurs";
  if (i === 0) return `< ${fmtInt(TIERS[1].min)}`;
  if (i === TOP_TIER - 1) return `≥ ${fmtInt(t.min)}`;
  return `${fmtInt(t.min)} – ${fmtInt(TIERS[i + 1].min - 1)}`;
}

/** 135 → « 2 h 15 », 90 → « 1 h 30 », 45 → « 45 min ». */
export function fmtDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

const TZ = "Europe/Paris";

/** « samedi 10 octobre » (fuseau de Paris, quel que soit le serveur). */
export function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
}

/** « 10 h », « 18 h 30 ». */
export function fmtHour(iso: string) {
  const parts = new Intl.DateTimeFormat("fr-FR", { hour: "numeric", minute: "2-digit", hour12: false, timeZone: TZ }).formatToParts(new Date(iso));
  const h = parts.find((p) => p.type === "hour")?.value ?? "";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return m === "00" ? `${Number(h)} h` : `${Number(h)} h ${m}`;
}

/** « 12 sept. » */
export function fmtShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: TZ });
}

/** « 1er juillet », « 12 septembre » */
export function fmtLongDate(iso: string) {
  const d = new Date(iso);
  const day = Number(new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: TZ }).format(d));
  const month = new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: TZ }).format(d);
  return `${day === 1 ? "1er" : day} ${month}`;
}

/** Jours entiers jusqu'à une date (négatif si passée). */
export function daysUntil(iso: string, now = Date.now()) {
  return Math.ceil((new Date(iso).getTime() - now) / 86_400_000);
}

/** « il y a 3 j », « il y a 2 h », « à l'instant ». */
export function fmtAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `il y a ${d} j`;
  return `le ${fmtShortDate(iso)}`;
}
