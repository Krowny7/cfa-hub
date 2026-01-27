"use client";

import { useI18n } from "@/components/I18nProvider";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="flex items-center gap-1 rounded-lg border p-1 text-xs">
      <span className="sr-only">{t("locale.label")}</span>
      <button
        type="button"
        onClick={() => setLocale("fr")}
        className={`rounded-md px-2 py-1 ${locale === "fr" ? "bg-white/10" : "opacity-70 hover:opacity-100"}`}
        aria-label="FR"
      >
        {t("locale.fr")}
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-md px-2 py-1 ${locale === "en" ? "bg-white/10" : "opacity-70 hover:opacity-100"}`}
        aria-label="EN"
      >
        {t("locale.en")}
      </button>
    </div>
  );
}
