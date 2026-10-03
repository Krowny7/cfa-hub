import { LogOut, Palette } from "lucide-react";
import { ProfileSettings } from "@/components/ProfileSettings";
import { ExamDateSettings } from "@/components/ExamDateSettings";
import { GroupSettings, type GroupRow } from "@/components/GroupSettings";
import { AppearanceSwitches } from "@/components/moi/AppearanceSwitches";
import { SignOutButton } from "@/components/SignOutButton";

// Tous les réglages : profil, date d'examen, apparence (thème, mode
// discret), groupes, déconnexion. Utilisé par l'onglet Réglages de /moi
// (/settings y renvoie). Les composants enfants chargent et enregistrent
// eux-mêmes.
export function SettingsPanel({ activeGroupId, groups }: { activeGroupId: string | null; groups: GroupRow[] }) {
  return (
    <div className="flex flex-col gap-4 md:gap-[18px]">
      <div className="grid gap-4 md:gap-[18px] lg:grid-cols-2">
        <ProfileSettings />
        <div className="flex flex-col gap-4 md:gap-[18px]">
          <div id="date">
            <ExamDateSettings />
          </div>
          <div className="card flex flex-col p-[22px] pb-3">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-muted">
              <Palette size={15} aria-hidden /> Apparence
            </h3>
            <AppearanceSwitches />
          </div>
        </div>
      </div>

      <GroupSettings activeGroupId={activeGroupId} groups={groups} />

      <div className="flex flex-wrap items-center gap-4 border-t border-line px-1 pt-5">
        <LogOut size={17} aria-hidden className="shrink-0 text-muted" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">Se déconnecter</p>
          <p className="t-micro mt-0.5">Tes révisions et ton rang restent sauvegardés sur ton compte.</p>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}
