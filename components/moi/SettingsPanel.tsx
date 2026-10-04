import Link from "next/link";
import { ArrowRight, LogOut, Palette, Volume2 } from "lucide-react";
import { ProfileSettings } from "@/components/ProfileSettings";
import { ObjectifExamenSettings } from "@/components/objectif/ObjectifExamenSettings";
import type { ObjectifInitial } from "@/lib/objectif-calc";
import { GroupSettings, type GroupRow } from "@/components/GroupSettings";
import { AppearanceSwitches } from "@/components/moi/AppearanceSwitches";
import { SoundSwitches } from "@/components/moi/SoundSwitches";
import { SignOutButton } from "@/components/SignOutButton";
import { REJOUER, SONS } from "@/lib/voice-z1";

// Tous les réglages : profil, examen (date et objectif de questions), apparence (thème, mode
// discret), sons des moments (et le premier trait à rejouer), groupes,
// déconnexion. Utilisé par l'onglet Réglages de /moi (/settings y renvoie).
// Les composants enfants chargent et enregistrent eux-mêmes.
export function SettingsPanel({ activeGroupId, groups, objectif }: { activeGroupId: string | null; groups: GroupRow[]; objectif: ObjectifInitial }) {
  return (
    <div className="flex flex-col gap-4 md:gap-[18px]">
      <div className="grid gap-4 md:gap-[18px] lg:grid-cols-2">
        <ProfileSettings />
        <div className="flex flex-col gap-4 md:gap-[18px]">
          <div id="date">
            <ObjectifExamenSettings initial={objectif} />
          </div>
          <div className="card flex flex-col p-[22px] pb-3">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-muted">
              <Palette size={15} aria-hidden /> Apparence
            </h3>
            <AppearanceSwitches />
          </div>
          <div id="sons" className="card flex flex-col p-[22px] pb-3">
            <h3 className="flex items-center gap-2 text-[13px] font-semibold text-muted">
              <Volume2 size={15} aria-hidden /> {SONS.titre}
            </h3>
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
