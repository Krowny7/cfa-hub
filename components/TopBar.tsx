import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SignOutButton } from "@/components/SignOutButton";
import { getSessionUserWithProfile } from "@/lib/supabase/user";

function initialsFromEmail(email: string | null | undefined) {
  if (!email) return "U";
  const base = email.split("@")[0] || "U";
  const parts = base.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "U";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

export async function TopBar() {
  const locale = await getLocale();
  const { user, profile } = await getSessionUserWithProfile();
  const username = profile?.username ?? null;
  const avatarUrl = profile?.avatar_url ?? null;

  return (
    <header className="sticky top-0 z-50 h-12 border-b border-white/[0.07] bg-neutral-950/80 backdrop-blur">
      <div className="flex h-full items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-blue-400/90 shadow-[0_0_0_3px_rgba(59,130,246,0.18)]" />
          {t(locale, "appName")}
        </Link>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {user ? (
            <>
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs hover:bg-white/[0.06]"
                title={t(locale, "nav.settings")}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="avatar" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px]">
                    {initialsFromEmail(user.email)}
                  </div>
                )}
                <span className="hidden max-w-[120px] truncate opacity-80 md:inline">
                  {username || user.email}
                </span>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link className="btn btn-secondary text-xs whitespace-nowrap" href="/login">
              {t(locale, "auth.login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
