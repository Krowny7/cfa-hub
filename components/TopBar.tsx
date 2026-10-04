import Link from "next/link";
import { DEFAULT_LOCALE, t } from "@/lib/i18n/core";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AnneauDuJourLogo } from "@/components/adn/AnneauDuJourLogo";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";
import { OBJECTIF_DU_JOUR } from "@/components/adn/AnneauDuJourEvents";
import { objectifDuJour } from "@/lib/objectif";
import { SpaceNav } from "@/components/nav/SpaceNav";
import { DomainSwitcher } from "@/components/nav/DomainSwitcher";
import { CommandPalette } from "@/components/nav/CommandPalette";
import { UserMenu } from "@/components/nav/UserMenu";
import { LoginLink } from "@/components/nav/LoginLink";
import { NavProgress } from "@/components/ui/motion/NavProgress";
import { rankFor, DEFAULT_ELO } from "@/lib/ranks";
import { getTopicMastery, programMastery } from "@/lib/mastery";
import { getSessionUserWithProfile } from "@/lib/supabase/user";
import { createClient } from "@/lib/supabase/server";

// Barre du haut : logo vivant (→ accueil), domaine · programme, les quatre
// espaces en contrôle segmenté, puis la recherche et le badge de rang du
// joueur, qui ouvre son menu (Moi, thème nuit, mode discret, réglages,
// déconnexion). Translucide et collante, avec un léger flou. Un trait d'encre
// court sous la barre pendant qu'une page se fait attendre (NavProgress).
//
// Le logo suit la journée : l'anneau se trace au nombre de traits du jour
// (une lecture légère, en parallèle du rang, avec repli sur le logo plein).
export async function TopBar() {
  const locale = DEFAULT_LOCALE;
  const { user } = await getSessionUserWithProfile();
  let tier = rankFor(DEFAULT_ELO).tierIndex;
  let traits: number | null = null;
  let objectif = OBJECTIF_DU_JOUR;
  if (user) {
    const rank = (async () => {
      try {
        const supabase = await createClient();
        // Même calcul que /classement : la maîtrise peut verrouiller les paliers hauts.
        const [{ data }, topics] = await Promise.all([
          supabase.from("ratings").select("elo").eq("user_id", user.id).maybeSingle(),
          getTopicMastery(supabase, user.id),
        ]);
        tier = rankFor((data as { elo?: number } | null)?.elo ?? DEFAULT_ELO, programMastery(topics)).tierIndex;
      } catch {
        // badge par défaut
      }
    })();
    // l'objectif du jour : celui du plan du joueur (lib/objectif.ts), sinon 40
    let plan: Awaited<ReturnType<typeof objectifDuJour>>;
    [traits, plan] = await Promise.all([traitsDuJour(user.id), objectifDuJour(user), rank]);
    objectif = plan.objectif;
  }

  return (
    <header
      className="rl-topbar sticky top-0 z-50 border-b border-line"
      style={{
        background: "color-mix(in oklab, var(--paper) 80%, transparent)",
        backdropFilter: "blur(16px) saturate(1.4)",
        WebkitBackdropFilter: "blur(16px) saturate(1.4)",
      }}
    >
      <div className="mx-auto flex h-[64px] max-w-[1240px] items-center gap-3 px-4 md:gap-4 md:px-7">
        <Link href="/dashboard" className="group rl-press relative whitespace-nowrap text-[14px] sm:text-[15.5px]">
          <span className="inline-flex items-center gap-2.5">
            <span className="sr-only">{t(locale, "appName")}, accueil</span>
            <AnneauDuJourLogo repondues={traits} objectif={objectif} size={26} landing publie />
            <span aria-hidden className="font-brand leading-none">
              RANKED LOBBY
            </span>
          </span>
        </Link>
        {user && (
          <div className="hidden lg:block">
            <DomainSwitcher />
          </div>
        )}
        <div className="flex flex-1 justify-center">{user && <SpaceNav />}</div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <CommandPalette />
              <UserMenu tier={tier} />
            </>
          ) : (
            <>
              <ThemeToggle />
              <LoginLink label={t(locale, "auth.login")} />
            </>
          )}
        </div>
      </div>
      <NavProgress />
    </header>
  );
}
