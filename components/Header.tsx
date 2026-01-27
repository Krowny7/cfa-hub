import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/core";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SignOutButton } from "@/components/SignOutButton";

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

  const nav = [
    { href: "/dashboard", label: t(locale, "nav.dashboard") },
    { href: "/library", label: t(locale, "nav.library") },
    { href: "/flashcards", label: t(locale, "nav.flashcards") },
    { href: "/qcm", label: t(locale, "nav.qcm") },
    { href: "/people", label: t(locale, "nav.people") }
  ];

  return (
    <header className="border-b border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          {/* Brand + desktop nav */}
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="whitespace-nowrap font-semibold tracking-tight">
              {t(locale, "appName")}
            </Link>

            {user ? (
              <nav className="hidden items-center gap-3 text-sm sm:flex">
                {nav.map((it) => (
                  <Link key={it.href} className="hover:underline" href={it.href}>
                    {it.label}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>

          {/* Desktop actions */}
          <div className="hidden items-center gap-2 sm:flex">
            <LanguageSwitcher />

            {user ? (
              <>
                <Link
                  href="/settings"
                  className="flex items-center gap-2 rounded-lg border border-white/10 px-2 py-1 text-xs hover:bg-white/5"
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

                  <span className="hidden max-w-[160px] truncate opacity-80 md:inline">
                    {username || user.email}
                  </span>
                </Link>

                <SignOutButton />
              </>
            ) : (
              <Link
                className="whitespace-nowrap rounded-lg border border-white/10 px-3 py-1 text-sm hover:bg-white/5"
                href="/login"
              >
                {t(locale, "auth.login")}
              </Link>
            )}
          </div>

          {/* Mobile menu (single entry point to avoid header overflow) */}
          <div className="sm:hidden">
            <details className="relative">
              <summary className="cursor-pointer list-none select-none rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5">
                {t(locale, "common.menu")}
              </summary>

              <div className="absolute right-0 z-50 mt-2 w-[min(86vw,20rem)] rounded-2xl border border-white/10 bg-neutral-950/95 p-2 shadow-lg backdrop-blur">
                <div className="grid gap-1">
                  {user ? (
                    <>
                      {nav.map((it) => (
                        <Link
                          key={it.href}
                          href={it.href}
                          className="rounded-xl px-3 py-2 text-sm hover:bg-white/5"
                        >
                          {it.label}
                        </Link>
                      ))}

                      <div className="my-1 h-px bg-white/10" />

                      <div className="px-2 py-1">
                        <div className="text-xs font-semibold opacity-70">{t(locale, "locale.label")}</div>
                        <div className="mt-2">
                          <LanguageSwitcher />
                        </div>
                      </div>

                      <div className="my-1 h-px bg-white/10" />

                      <Link
                        href="/settings"
                        className="rounded-xl px-3 py-2 text-sm hover:bg-white/5"
                        title={t(locale, "nav.settings")}
                      >
                        <div className="flex items-center gap-2">
                          {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarUrl} alt="avatar" className="h-6 w-6 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px]">
                              {initialsFromEmail(user.email)}
                            </div>
                          )}
                          <span className="min-w-0 flex-1 truncate opacity-90">{username || user.email}</span>
                        </div>
                      </Link>

                      <div className="px-2 py-1">
                        <SignOutButton />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="px-2 py-1">
                        <div className="text-xs font-semibold opacity-70">{t(locale, "locale.label")}</div>
                        <div className="mt-2">
                          <LanguageSwitcher />
                        </div>
                      </div>

                      <div className="my-1 h-px bg-white/10" />

                      <Link
                        href="/login"
                        className="rounded-xl px-3 py-2 text-sm hover:bg-white/5"
                      >
                        {t(locale, "auth.login")}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </header>
  );
}
