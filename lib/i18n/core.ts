import { MESSAGES } from "./messages";

export type Locale = keyof typeof MESSAGES;

export const DEFAULT_LOCALE: Locale = "fr";

export function isLocale(value: unknown): value is Locale {
  return value === "fr" || value === "en";
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

export function t(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const dict = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
  const fallback = MESSAGES[DEFAULT_LOCALE];
  let template = getByPath(dict, key) ?? getByPath(fallback, key) ?? key;

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      template = template.replaceAll(`{${k}}`, String(v));
    }
  }
  return template;
}
