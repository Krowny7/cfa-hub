import { LogOut, Palette } from "lucide-react";
import { ProfileSettings } from "@/components/ProfileSettings";
import { ExamDateSettings } from "@/components/ExamDateSettings";
import { GroupSettings, type GroupRow } from "@/components/GroupSettings";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DiscreetToggle } from "@/components/DiscreetToggle";
import { SignOutButton } from "@/components/SignOutButton";

function Setting({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[12.5px] text-muted">{sub}</p>
      </div>
      {children}
    </div>
  );
}

// Tous les réglages : profil, date d'examen, apparence (thème, mode
// discret), groupes, déconnexion. Utilisé par /moi (section Réglages) et
// /settings. Les composants enfants chargent et enregistrent eux-mêmes.
export function SettingsPanel({ activeGroupId, groups }: { activeGroupId: string | null; groups: GroupRow[] }) {
  return (
    <div className="flex flex-col gap-[18px]">
      <div className="grid gap-[18px] lg:grid-cols-2">
        <ProfileSettings />
        <div className="flex flex-col gap-[18px]">
          <ExamDateSettings />
          <div className="card flex flex-col p-[22px] pb-3">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-muted">
              <Palette size={15} aria-hidden /> Apparence
            </h3>
            <div className="mt-1 divide-y divide-line">
              <Setting title="Thème nuit" sub="Encre claire sur papier sombre, mémorisé sur cet appareil.">
                <ThemeToggle />
              </Setting>
              <Setting title="Mode discret" sub="Même interface, sans encre ni rouge : pour réviser au bureau.">
                <DiscreetToggle />
              </Setting>
            </div>
          </div>
        </div>
      </div>

      <GroupSettings activeGroupId={activeGroupId} groups={groups} />

      <div className="card flex flex-wrap items-center gap-4 p-[22px]">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-surface-2 text-muted">
          <LogOut size={17} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">Se déconnecter</p>
          <p className="mt-0.5 text-[12.5px] text-muted">Tes révisions et ton rang restent sauvegardés sur ton compte.</p>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}
