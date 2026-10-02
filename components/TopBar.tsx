import Link from "next/link";
import { DEFAULT_LOCALE, t } from "@/lib/i18n/core";
import { SignOutButton } from "@/components/SignOutButton";
import { DiscreetToggle } from "@/components/DiscreetToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InkLockup } from "@/components/ink/InkRing";
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
  const locale = DEFAULT_LOCALE;
  const { user, profile } = await getSessionUserWithProfile();
  const username = profile?.username ?? null;
  const avatarUrl = profile?.avatar_url ?? null;

  return (
    <header className="sticky top-0 z-50 h-14 border-b-2 border-white bg-black">
      <div className="flex h-full items-center justify-between gap-3 px-4">
        <Link href="/" className="whitespace-nowrap text-[14px] sm:text-[17px]" aria-label={t(locale, "appName")}>
          <InkLockup size={28} />
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <DiscreetToggle />
          {user ? (
            <>
              <Link
                href="/settings"
                className="flex h-8 items-center gap-2 rounded-[3px] px-1.5 text-xs font-bold hover:bg-white/[0.07]"
                title={t(locale, "nav.settings")}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full border-2 border-white object-cover grayscale" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white font-display text-[11px]">
                    {initialsFromEmail(user.email)}
                  </span>
                )}
                <span className="hidden max-w-[140px] truncate md:inline">{username || user.email}</span>
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link className="btn btn-secondary h-8 whitespace-nowrap py-0 text-xs" href="/login">
              {t(locale, "auth.login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
