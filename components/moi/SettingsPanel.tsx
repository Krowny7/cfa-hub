import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProfileSettings } from "@/components/ProfileSettings";
import { ObjectifExamenSettings } from "@/components/objectif/ObjectifExamenSettings";
import type { ObjectifInitial } from "@/lib/objectif-calc";
import { GroupSettings, type GroupRow } from "@/components/GroupSettings";
import { AppearanceSwitches } from "@/components/moi/AppearanceSwitches";
import { SoundSwitches } from "@/components/moi/SoundSwitches";
import { SortieDuCompte } from "@/components/moi/Clients";
import { REJOUER, SONS } from "@/lib/voice-z1";
import { PresenceSettings } from "@/components/presence/PresenceSettings";
import { ReglageJournal } from "@/components/profil/ReglageJournal";
import { ModeSobre } from "@/components/moi/ModeSobre";
import { ReposSerie } from "@/components/moi/ReposSerie";
import type { ReposInitial } from "@/components/moi/repos-data";
import { Dossier, Filet, Repli } from "@/components/moi/Dossier";
import { DOSSIER } from "@/lib/voice-moi";

// Tous les réglages : profil, examen (date et objectif de questions), apparence (thème, mode
// discret, Léonard, mode sobre), repos de la série, sons des moments (et le premier trait à rejouer), confidentialité
// (présence en ligne, qui voit mon Journal), groupes, déconnexion. Utilisé par l'onglet Réglages de /moi (/settings y renvoie).
// Gabarit « Dossier » (direction du 2026-11-13) : la porte porte les jours avant l'examen (MoiView) ;
// dessous, des filets : « Ton examen » (la date et l'objectif, ouvert : c'est le réglage qui compte),
// « Ton compte » (le profil), puis les préférences derrière des replis (apparence, repos, sons,
// confidentialité, groupes) et la sortie. Les cartes des réglages sont posées à plat. Les ancres
// (#date, #objectif, #sons, #confidentialite, #repos) ouvrent leur repli (Dossier).
// Les composants enfants chargent et enregistrent eux-mêmes ; `sobre` et `repos` arrivent lus par la page
// (repos null : la migration du Codex §8 manque, le réglage ne s'affiche pas).
export function SettingsPanel({
  activeGroupId,
  groups,
  objectif,
  sobre = false,
  repos = null,
}: {
  activeGroupId: string | null;
  groups: GroupRow[];
  objectif: ObjectifInitial;
  sobre?: boolean;
  repos?: ReposInitial | null;
}) {
  const D = DOSSIER.reglages;
  return (
    <Dossier plat>
      <Filet etiquette={D.examen} id="date">
        <div className="scroll-mt-24">
          <ObjectifExamenSettings initial={objectif} sansTexte />
        </div>
      </Filet>
      <Filet etiquette={D.compte}>
        <ProfileSettings />
        <div>
          {/* la dernière étape de la visite de Léonard vise ce repli : fermé, sa ligne reste éclairable */}
          <Repli titre={D.apparence} leonard="reglages">
            <div className="flex flex-col">
              <AppearanceSwitches />
              <ModeSobre initial={sobre} />
            </div>
          </Repli>
          {/* le repli vit avec le réglage : si la table manque, ReposSerie se masque, et son repli avec lui */}
          {repos !== null && <ReposSerie initial={repos} repli={D.repos} />}
          <Repli titre={SONS.titre} id="sons">
            <div className="flex flex-col">
              <SoundSwitches />
              <Link href="/onboarding?rejouer=1" className="group flex items-center gap-4 border-t border-line py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold">{REJOUER.titre}</span>
                  <span className="t-micro mt-0.5 block">{REJOUER.texte}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold">
                  {REJOUER.action} <ArrowRight size={14} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </div>
          </Repli>
          <Repli titre={D.confidentialite} id="confidentialite">
            <div className="flex flex-col">
              <PresenceSettings />
              <ReglageJournal />
            </div>
          </Repli>
          <Repli titre={D.groupes} compte={groups.length > 0 ? groups.length : undefined}>
            <GroupSettings activeGroupId={activeGroupId} groups={groups} />
          </Repli>
        </div>
      </Filet>
      <Filet etiquette={D.sortie}>
        <SortieDuCompte libelle={D.deconnecter} ligne={D.deconnecterLigne} />
      </Filet>
    </Dossier>
  );
}
