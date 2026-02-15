"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/I18nProvider";

type Props = {
  avatarUrl: string | null;
  initials: string;
  usernameOrEmail: string;
  elo?: number | null;
  isAdmin?: boolean;
  signOutSlot?: React.ReactNode;
};

export function UserMenu({
  avatarUrl,
  initials,
  usernameOrEmail,
  elo,
  isAdmin,
  signOutSlot
}: Props) {
  const { t } = useI18n();
  const pathname = usePathname() || "/";
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = false;
  }, [pathname]);

  return (
    <details ref={detailsRef} className="relative">
      <summary
        className="list-none cursor-pointer rounded-full border border-white/10 bg-white/[0.03] px-2 py-1.5 text-xs hover:bg-white/[0.06] select-none"
        aria-label={t("profile.title")}
      >
        <span className="inline-flex items-center gap-2">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="avatar" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px]">
              {initials}
            </span>
          )}

          <span className="hidden max-w-[180px] truncate text-white/85 md:inline">
            {usernameOrEmail}
          </span>

          {typeof elo === "number" ? (
            <span className="hidden rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/80 md:inline">
              Elo {elo}
            </span>
          ) : null}

          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 opacity-60" aria-hidden>
            <path
              d="M5 7.5 10 12.5 15 7.5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </summary>

      <div className="absolute right-0 mt-2 w-[240px] rounded-2xl border border-white/10 bg-neutral-950/95 p-2 shadow-xl backdrop-blur">
        <div className="px-3 py-2">
          <div className="text-sm font-medium text-white">{usernameOrEmail}</div>
          {typeof elo === "number" ? (
            <div className="mt-0.5 text-xs text-white/60">Elo {elo}</div>
          ) : null}
        </div>
        <div className="my-2 h-px bg-white/10" />

        <Link href="/profile" className="block rounded-xl px-3 py-2 text-sm text-white/85 hover:bg-white/[0.06]">
          {t("profile.title")}
        </Link>
        <Link href="/settings" className="block rounded-xl px-3 py-2 text-sm text-white/85 hover:bg-white/[0.06]">
          {t("nav.settings")}
        </Link>

        {isAdmin ? (
          <>
            <div className="my-2 h-px bg-white/10" />
            <Link
              href="/admin/content"
              className="block rounded-xl px-3 py-2 text-sm text-white/85 hover:bg-white/[0.06]"
            >
              {t("admin.studio")}
            </Link>
            <Link
              href="/admin/qod"
              className="block rounded-xl px-3 py-2 text-sm text-white/85 hover:bg-white/[0.06]"
            >
              {t("admin.qod")}
            </Link>
          </>
        ) : null}

        <div className="my-2 h-px bg-white/10" />
        <div className="px-1">{signOutSlot}</div>
      </div>
    </details>
  );
}
