import Link from "next/link";
import { DEFAULT_LOCALE, t } from "@/lib/i18n/core";
import { SignOutButton } from "@/components/SignOutButton";
import { DiscreetToggle } from "@/components/DiscreetToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { InkLockup } from "@/components/ink/InkRing";
import { SpaceNav } from "@/components/nav/SpaceNav";
import { DomainSwitcher } from "@/components/nav/DomainSwitcher";
import { RankBadge } from "@/components/ui/RankBadge";
import { rankFor, DEFAULT_ELO } from "@/lib/ranks";
import { getSessionUserWithProfile } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/server";

// Barre du haut V2 : logo (→ accueil), domaine · programme, les quatre
// espaces en contrôle segmenté, puis thème, mode discret et le badge de rang
// du joueur (→ Moi). Translucide et collante, avec un léger flou.
export async function TopBar() {
  const locale = DEFAULT_LOCALE;
  const { user } = await getSessionUserWithProfile();
  let tier = rankFor(DEFAULT_ELO).tierIndex;
  if (user) {
    try {
      const supabase = await createClient();
      const { data } = await supabase.from("ratings").select("elo").eq("user_id", user.id).maybeSingle();
      tier = rankFor((data as { elo?: number } | null)?.elo ?? DEFAULT_ELO).tierIndex;
    } catch {
      // badge par défaut
    }
  }

  return (
    <header
      className="sticky top-0 z-50 border-b border-line"
      style={{ background: "color-mix(in oklab, var(--paper) 82%, transparent)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
    >
      <div className="mx-auto flex h-[64px] max-w-[1240px] items-center gap-3 px-4 md:gap-4 md:px-7">
        <Link href="/dashboard" className="whitespace-nowrap text-[14px] sm:text-[16px]" aria-label={t(locale, "appName")}>
          <InkLockup size={26} landing />
        </Link>
        {user && (
          <div className="hidden lg:block">
            <DomainSwitcher />
          </div>
        )}
        <div className="flex flex-1 justify-center">{user && <SpaceNav />}</div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex sm:items-center sm:gap-2">
            <ThemeToggle />
            <DiscreetToggle />
          </div>
          {user ? (
            <>
              <Link href="/moi" aria-label={t(locale, "nav.settings")} className="rl-press grid h-[38px] w-[42px] place-items-center rounded-[12px] border border-line-2 bg-surface">
                <RankBadge tier={tier} size={26} glow={false} />
              </Link>
              <span className="hidden md:inline-flex">
                <SignOutButton />
              </span>
            </>
          ) : (
            <Link className="btn btn-primary min-h-[38px] whitespace-nowrap px-4 text-[13px]" href="/login">
              {t(locale, "auth.login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
