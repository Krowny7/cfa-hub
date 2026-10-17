"use client";

import { useNightTheme } from "@/components/ThemeToggle";
import { useDiscreetMode } from "@/components/DiscreetToggle";
import { useState } from "react";
import { useReglagesLeonard } from "@/lib/leonard/reglages";
import { RESUME_NOUVEAUTES } from "@/lib/leonard/repliques";
import { useEtatNav } from "@/components/nav/DevoileContext";
import { annoncerDevoile } from "@/components/codex/annoncer";
import { codexToutMontrer } from "@/lib/codex/actions";

function SwitchRow({ title, sub, on, onToggle }: { title: string; sub: string; on: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={onToggle} className="flex w-full items-center gap-4 py-3 text-left">
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">{title}</span>
        <span className="t-micro mt-0.5 block">{sub}</span>
      </span>
      <span aria-hidden className={"switch" + (on ? " is-on" : "")} />
    </button>
  );
}

/** « Tout montrer » : le site se dévoile au fil des séances (Codex) ; ceci l'ouvre d'un coup, pour toujours. */
function ToutMontrer() {
  const { devoile, codex } = useEtatNav();
  const [fait, setFait] = useState(false);
  const [occupe, setOccupe] = useState(false);
  if (!codex || devoile === "tout" || fait) return null;
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">Tout le site, tout de suite</span>
        <span className="t-micro mt-0.5 block">Le menu se complète au fil de tes séances. Si tu préfères tout voir, c&apos;est permis.</span>
      </span>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={occupe}
        onClick={async () => {
          setOccupe(true);
          const r = await codexToutMontrer().catch(() => null);
          setOccupe(false);
          if (r?.ok) {
            annoncerDevoile("tout");
            setFait(true);
          }
        }}
      >
        Tout montrer
      </button>
    </div>
  );
}

// Thème nuit et mode discret en interrupteurs (mêmes réglages que les
// boutons de la barre du haut, mémorisés sur cet appareil), puis Léonard :
// ses apparitions et ses animations (il se tait de lui-même en mode discret).
export function AppearanceSwitches() {
  const [night, toggleNight] = useNightTheme();
  const [discreet, toggleDiscreet] = useDiscreetMode();
  const leo = useReglagesLeonard();
  return (
    <div className="mt-1 divide-y divide-line">
      <SwitchRow title="Thème nuit" sub="Encre claire sur papier sombre, sur cet appareil." on={night} onToggle={toggleNight} />
      <SwitchRow title="Mode discret" sub="Sans encre ni rouge : pour réviser au bureau. Léonard se tait." on={discreet} onToggle={toggleDiscreet} />
      <ToutMontrer />
      {/* la visite guidée de Léonard s'arrête ici : « c'est ici qu'on me coupe » */}
      <div data-leonard="reglages" className="divide-y divide-line">
        <SwitchRow title="Léonard" sub="La mascotte passe te chambrer (ou te féliciter) de temps en temps." on={leo.actif} onToggle={leo.basculerActif} />
        {leo.actif && (
          <SwitchRow title="Léonard animé" sub="Désactivé : une image fixe, sans mouvement." on={leo.anime} onToggle={leo.basculerAnime} />
        )}
        {leo.actif && (
          <div className="flex items-center justify-between gap-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold">Visite guidée</span>
              <span className="t-micro mt-0.5 block">Léonard te refait le tour du site, page par page.</span>
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={leo.revoirTuto}>
              Revoir
            </button>
          </div>
        )}
        {leo.actif && (
          <div className="flex items-center justify-between gap-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold">Les nouveautés</span>
              <span className="t-micro mt-0.5 block">{RESUME_NOUVEAUTES} : Léonard te montre ce qui a changé.</span>
            </span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={leo.revoirNouveautes}>
              Revoir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
