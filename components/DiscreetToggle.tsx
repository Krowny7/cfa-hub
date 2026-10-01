"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const KEY = "cfa_discreet";

// Mode discret : même interface, mais en noir et blanc (filtre CSS appliqué
// sur <html>, donc le PDF de l'iframe aussi). Le choix est mémorisé ; un
// petit script dans le layout le réapplique avant le premier affichage pour
// qu'aucune couleur ne clignote au chargement.
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
      title={on ? "Désactiver le mode discret" : "Mode discret (noir et blanc)"}
      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/70 hover:bg-white/[0.06]"
    >
      {on ? <EyeOff size={14} /> : <Eye size={14} />}
      <span className="hidden md:inline">{on ? "Discret : activé" : "Mode discret"}</span>
    </button>
  );
}
