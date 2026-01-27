import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";

function initialsFromEmail(email: string | null | undefined) {
  if (!email) return "U";
  const base = email.split("@")[0] || "U";
  const parts = base
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  const a = parts[0]?.[0] ?? "U";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

export async function Header() {
  const locale = await getLocale();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  let username: string | null = null;
  let avatarUrl: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username,avatar_url")
      .eq("id", user.id)
      .maybeSingle();
    username = (profile as any)?.username ?? null;
    avatarUrl = (profile as any)?.avatar_url ?? null;
  }

  return (
    <header className="border-b border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold">
            {t(locale, "appName")}
          </Link>

          {user && (
            <>
              <nav className="hidden items-center gap-3 text-sm sm:flex">
                <Link className="hover:underline" href="/dashboard">
                  {t(locale, "nav.dashboard")}
                </Link>
                <Link className="hover:underline" href="/library">
                  {t(locale, "nav.library")}
                </Link>
                <Link className="hover:underline" href="/flashcards">
                  {t(locale, "nav.flashcards")}
                </Link>
                <Link className="hover:underline" href="/qcm">
                  {t(locale, "nav.qcm")}
                </Link>
                <Link className="hover:underline" href="/people">
                  {t(locale, "nav.people")}
                </Link>

                {/* ✅ Settings removed from header nav */}
              </nav>

              {/* Mobile menu */}
              <details className="sm:hidden">
                <summary className="cursor-pointer select-none rounded-lg border px-3 py-1 text-sm hover:bg-white/5">
                  {t(locale, "common.menu")}
                </summary>
                <div className="mt-2 grid gap-2 rounded-xl border bg-neutral-950 p-3 text-sm">
                  <Link className="hover:underline" href="/dashboard">
                    {t(locale, "nav.dashboard")}
                  </Link>
                  <Link className="hover:underline" href="/library">
                    {t(locale, "nav.library")}
                  </Link>
                  <Link className="hover:underline" href="/flashcards">
                    {t(locale, "nav.flashcards")}
                  </Link>
                  <Link className="hover:underline" href="/qcm">
                    {t(locale, "nav.qcm")}
                  </Link>
                  <Link className="hover:underline" href="/people">
                    {t(locale, "nav.people")}
                  </Link>

                  {/* ✅ Settings removed from mobile menu */}
                </div>
              </details>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {user ? (
            <>
              {/* ✅ Clicking profile goes to /settings (same behavior as old Settings link) */}
              <Link
                href="/settings"
                className="flex items-center gap-2 rounded-lg border px-2 py-1 text-xs hover:bg-white/5"
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

                {/* show name/email only on sm+ to keep mobile clean */}
                <span className="hidden max-w-[160px] truncate opacity-80 sm:inline">
                  {username || user.email}
                </span>
              </Link>

              <SignOutButton />
            </>
          ) : (
            <Link className="rounded-lg border px-3 py-1 text-sm hover:bg-white/5" href="/login">
              {t(locale, "auth.login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}