"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const KEY = "cfa_discreet";

// Mode discret : même interface, sans signature visuelle — pas de lettrage
// épais, pas d'anneau, pas de notes manuscrites, pas de rouge (règles
// html[data-discreet="1"] dans globals.css). Sur les fiches, le PDF se replie
// aussi. Le choix est mémorisé ; un script dans le layout le réapplique avant
// le premier affichage.
export function DiscreetToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(document.documentElement.dataset.discreet === "1");
    function onStorage(e: StorageEvent) {
      if (e.key !== KEY) return;
      const next = e.newValue === "1";
      if (next) document.documentElement.dataset.discreet = "1";
      else delete document.documentElement.dataset.discreet;
      setOn(next);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggle() {
    const next = !on;
    if (next) document.documentElement.dataset.discreet = "1";
    else delete document.documentElement.dataset.discreet;
    try {
      if (next) localStorage.setItem(KEY, "1");
      else localStorage.removeItem(KEY);
    } catch {}
    setOn(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      title={on ? "Désactiver le mode discret" : "Mode discret : interface sobre"}
      aria-label="Mode discret"
      className={
        "rl-press grid h-[38px] w-[38px] place-items-center rounded-[12px] border " +
        (on ? "border-white bg-white text-black" : "border-line-2 bg-surface hover:bg-surface-2")
      }
    >
      {on ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}
