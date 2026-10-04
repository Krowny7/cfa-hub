"use client";

import { useSound } from "@/components/adn/sound";
import { SONS } from "@/lib/voice-z1";

function SwitchRow({ title, sub, on, disabled = false, onToggle }: { title: string; sub: string; on: boolean; disabled?: boolean; onToggle: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={onToggle} className={"flex w-full items-center gap-4 py-3 text-left " + (disabled ? "opacity-45" : "")}>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold">{title}</span>
        <span className="t-micro mt-0.5 block">{sub}</span>
      </span>
      <span aria-hidden className={"switch" + (on ? " is-on" : "")} />
    </button>
  );
}

// Les sons des moments (components/adn/sound) en deux interrupteurs :
// les grands moments (actifs par défaut : tampon du jour tenu, cérémonie de
// rang), puis « aussi à chaque trait » (les micro-moments, coupés par
// défaut). Réglage mémorisé sur cet appareil ; un essai sonore joue au
// passage, pour entendre ce qu'on active.
export function SoundSwitches() {
  const { pref, setPref, jouer } = useSound();
  const grands = pref !== "aucun";
  const petits = pref === "tous";
  return (
    <div className="mt-1 divide-y divide-line">
      <SwitchRow
        title={SONS.grands}
        sub={SONS.grandsSous}
        on={grands}
        onToggle={() => {
          const next = grands ? "aucun" : "ceremonies";
          setPref(next);
          if (next !== "aucun") jouer("tampon", { moment: "ceremonie" });
        }}
      />
      <SwitchRow
        title={SONS.petits}
        sub={SONS.petitsSous}
        on={petits}
        onToggle={() => {
          const next = petits ? "ceremonies" : "tous";
          setPref(next);
          if (next === "tous") jouer("goutte", { moment: "micro" });
        }}
      />
    </div>
  );
}
