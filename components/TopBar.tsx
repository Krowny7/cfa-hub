import { Suspense } from "react";
import Link from "next/link";
import { DEFAULT_LOCALE, t } from "@/lib/i18n/core";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AnneauDuJourLogo } from "@/components/adn/AnneauDuJourLogo";
import { SpaceNav } from "@/components/nav/SpaceNav";
import { DomainSwitcher } from "@/components/nav/DomainSwitcher";
import { CommandPalette } from "@/components/nav/CommandPalette";
import { LogoDuJour } from "@/components/nav/LogoDuJour";
import { RechercheJoueur } from "@/components/nav/RechercheJoueur";
import { UserMenu } from "@/components/nav/UserMenu";
import { LoginLink } from "@/components/nav/LoginLink";
import { NavProgress } from "@/components/ui/motion/NavProgress";
import { getSessionUserWithProfile } from "@/lib/supabase/user";
import { PresenceHeartbeat } from "@/components/presence/PresenceHeartbeat";
import { CompteurTemps } from "@/components/temps/CompteurTemps";
import { SceauQuetesServeur } from "@/components/codex/SceauQuetesServeur";

// Barre du haut : logo vivant (→ accueil), domaine · programme, les quatre
// espaces en contrôle segmenté (le Codex n'en est plus un : il s'ouvre depuis
// Moi), puis la recherche de joueur et un seul bouton, la photo du joueur : son menu
// (son profil, ses quêtes, réglages, déconnexion), avec un « ! » quand une récompense
// de quête est à récolter. Le panneau des quêtes et la pastille
// de la séance du jour lancée (« Séance 2/3 · Continuer → » ; sur téléphone, une bande
// au-dessus de la barre d'onglets) sont diffusés en flux. Ctrl K ouvre toujours la
// palette, sans bouton dans la barre.
// Translucide et collante, avec un léger flou. Un trait d'encre court sous la
// barre pendant qu'une page se fait attendre (NavProgress).
// Le logo mène à l'accueil (la barre du bas a aussi son onglet « Accueil »).
// Aux largeurs moyennes, la place va aux espaces : le sélecteur de domaine,
// abrégé (« CFA I »), n'apparaît qu'à partir de 1 280 px ; le mot « RANKED
// LOBBY » s'efface de 768 à 1 023 px (l'anneau reste) ; les onglets eux-mêmes
// s'ajustent à ce qui reste (SpaceNav).
//
// Le logo suit la journée : l'anneau se trace au nombre de traits du jour, sur l'objectif
// du joueur (LogoDuJour, en flux, le logo plein en attendant).
export async function TopBar() {
  const locale = DEFAULT_LOCALE;
  const { user, profile } = await getSessionUserWithProfile();
  const logoPlein = <AnneauDuJourLogo repondues={null} size={26} landing />;

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
        {/* trois colonnes : les deux côtés se partagent la place, les onglets restent au centre de la barre */}
        <div className="flex min-w-max flex-1 items-center gap-3 md:gap-4">
        <Link href="/dashboard" className="group rl-press relative whitespace-nowrap text-[14px] sm:text-[15.5px]">
          <span className="inline-flex items-center gap-2.5">
            <span className="sr-only">{t(locale, "appName")}, accueil</span>
            {user ? (
              <Suspense fallback={logoPlein}>
                <LogoDuJour user={user} />
              </Suspense>
            ) : (
              logoPlein
            )}
            <span aria-hidden className={"font-brand leading-none" + (user ? " md:max-lg:hidden" : "")}>
              RANKED LOBBY
            </span>
          </span>
        </Link>
        {user && (
          <div className="hidden xl:block">
            <DomainSwitcher compact />
          </div>
        )}
        </div>
        <div className="@container flex min-w-0 flex-[0_1_520px] justify-center">{user && <SpaceNav />}</div>
        <div className="flex min-w-max flex-1 items-center justify-end gap-2">
          {user ? (
            <>
              <RechercheJoueur />
              <CommandPalette sansBouton />
              <Suspense fallback={null}>
                <SceauQuetesServeur />
              </Suspense>
              <UserMenu id={user.id} nom={profile?.username?.trim() || "Moi"} avatarUrl={profile?.avatar_url ?? null} />
              <PresenceHeartbeat />
              {/* le temps actif sur le site (migration_temps_site.sql), à côté du signal de présence */}
              <CompteurTemps />
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
