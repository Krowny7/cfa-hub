"use client";

import React, { createContext, useCallback, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, t as tCore } from "@/lib/i18n/core";

// Site en français uniquement — plus de locale runtime à porter, `t()`
// reste la même API pour tous les composants qui l'utilisent déjà.
type I18nContextValue = {
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => tCore(DEFAULT_LOCALE, key, vars),
    []
  );

  const value = useMemo<I18nContextValue>(() => ({ t }), [t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
