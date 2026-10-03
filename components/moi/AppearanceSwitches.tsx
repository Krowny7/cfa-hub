"use client";

import { useNightTheme } from "@/components/ThemeToggle";
import { useDiscreetMode } from "@/components/DiscreetToggle";

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

// Thème nuit et mode discret en interrupteurs (mêmes réglages que les
// boutons de la barre du haut, mémorisés sur cet appareil).
export function AppearanceSwitches() {
  const [night, toggleNight] = useNightTheme();
  const [discreet, toggleDiscreet] = useDiscreetMode();
  return (
    <div className="mt-1 divide-y divide-line">
      <SwitchRow title="Thème nuit" sub="Encre claire sur papier sombre, sur cet appareil." on={night} onToggle={toggleNight} />
      <SwitchRow title="Mode discret" sub="Sans encre ni rouge : pour réviser au bureau." on={discreet} onToggle={toggleDiscreet} />
    </div>
  );
}
