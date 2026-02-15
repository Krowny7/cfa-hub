import { MESSAGES } from "./messages";

export type Locale = keyof typeof MESSAGES;

export const DEFAULT_LOCALE: Locale = "fr";

export function isLocale(value: unknown): value is Locale {
  return value === "fr" || value === "en";
}

/**
 * Some “generated” dictionaries sometimes store the raw key as value
 * e.g. common.reset -> "common.reset".
 * We must never leak that to end users.
 */
function looksLikeRawKey(value: string, key: string): boolean {
  if (!value) return true;
  if (value === key) return true;
  // Heuristic: dotted path-looking string (e.g. "common.reset", "nav.flashcards")
  // but avoid false positives for legit strings with dots by being strict-ish.
  return /^[a-z][a-z0-9_-]*(\.[a-z0-9_-]+)+$/i.test(value);
}

function humanizeKey(key: string): string {
  const last = key.split(".").pop() || key;
  const spaced = last
    .replaceAll("_", " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function getByPath(obj: any, path: string): string | undefined {
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : undefined;
}

/**
 * Ultra-safe fallback for the most common UI keys:
 * if dictionaries are incomplete / corrupted, we still show a clean label.
 * (This keeps the UI “release clean” even with minor i18n gaps.)
 */
const COMMON_FALLBACK: Record<Locale, Record<string, string>> = {
  fr: {
    "common.save": "Enregistrer",
    "common.saving": "Enregistrement…",
    "common.saved": "✅ Enregistré.",
    "common.cancel": "Annuler",
    "common.close": "Fermer",
    "common.open": "Ouvrir",
    "common.loading": "Chargement…",
    "common.error": "Erreur",
    "common.success": "Succès",
    "common.title": "Titre",
    "common.settings": "Réglages",
    "common.advanced": "Avancé",
    "common.edit": "Modifier",
    "common.reset": "Réinitialiser",
    "common.delete": "Supprimer",
    "common.deleted": "✅ Supprimé.",
    "common.confirmDelete": "Supprimer cet élément ?",
    "common.private": "Privé",
    "common.public": "Public"
  },
  en: {
    "common.save": "Save",
    "common.saving": "Saving…",
    "common.saved": "✅ Saved.",
    "common.cancel": "Cancel",
    "common.close": "Close",
    "common.open": "Open",
    "common.loading": "Loading…",
    "common.error": "Error",
    "common.success": "Success",
    "common.title": "Title",
    "common.settings": "Settings",
    "common.advanced": "Advanced",
    "common.edit": "Edit",
    "common.reset": "Reset",
    "common.delete": "Delete",
    "common.deleted": "✅ Deleted.",
    "common.confirmDelete": "Delete this item?",
    "common.private": "Private",
    "common.public": "Public"
  }
};

export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const dict = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
  const fallback = MESSAGES[DEFAULT_LOCALE];

  let template = getByPath(dict, key) ?? getByPath(fallback, key);

  // If missing OR corrupted (raw key stored as value), fallback to safe label
  if (!template || looksLikeRawKey(template, key)) {
    template = COMMON_FALLBACK[locale]?.[key] ?? COMMON_FALLBACK[DEFAULT_LOCALE]?.[key] ?? humanizeKey(key);

    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[i18n] missing/corrupt key: ${key} (locale=${locale})`);
    }
  }

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      template = template.replaceAll(`{${k}}`, String(v));
    }
  }

  return template;
}
