"use client";

import { useState } from "react";
import { useI18n } from "@/components/I18nProvider";

type Doc = {
  id: string;
  title: string;
  visibility: "private" | "group" | "groups" | "public";
  created_at: string;
  external_url: string;
  preview_url: string | null;
  library_folders?: { name: string } | null;
};

export function DocumentList({ docs }: { docs: Doc[] }) {
  const { t, locale } = useI18n();
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const [openExternal, setOpenExternal] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border p-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-semibold">{t("library.yourPdfs")}</h2>
          <p className="mt-1 text-sm opacity-80">{t("library.yourPdfsDesc")}</p>
        </div>
        {openExternal && (
          <a className="text-sm underline" href={openExternal} target="_blank" rel="noreferrer">
            {t("library.openInNewTab")}
          </a>
        )}
      </div>

      <div className="mt-4 grid gap-2">
        {docs.length === 0 && <div className="text-sm opacity-70">{t("library.empty")}</div>}
        {docs.map((d) => (
          <div
            key={d.id}
            className="flex flex-col gap-2 rounded-xl border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{d.title}</div>
              <div className="text-xs opacity-70">
                {d.visibility.toUpperCase()}
                {d.library_folders?.name ? ` • ${d.library_folders.name}` : ""}
                {" • "}
                {new Date(d.created_at).toLocaleString(locale === "fr" ? "fr-FR" : "en-US")}
              </div>
            </div>
            <button
              className="w-full rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5 sm:w-auto sm:py-1"
              onClick={() => {
                setOpenExternal(d.external_url);
                setOpenUrl(d.preview_url ?? null);
              }}
              type="button"
            >
              {t("common.open")}
            </button>
          </div>
        ))}
      </div>

      {(openUrl || openExternal) && (
        <div className="mt-4 overflow-hidden rounded-2xl border">
          {openUrl ? (
            <iframe title="PDF preview" src={openUrl} className="h-[60vh] w-full sm:h-[70vh]" />
          ) : (
            <div className="p-4 text-sm opacity-80">{t("library.previewUnavailable")}</div>
          )}
        </div>
      )}
    </div>
  );
}
