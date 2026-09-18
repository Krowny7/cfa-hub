import { DEFAULT_LOCALE, type Locale } from "./core";

// Site en français uniquement — plus de bascule FR/EN, plus de cookie à lire.
export async function getLocale(): Promise<Locale> {
  return DEFAULT_LOCALE;
}
