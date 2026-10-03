"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const KEY = "cfa_discreet";

/**
 * Mode discret : même interface, sans signature visuelle — pas de lettrage
 * épais, pas d'anneau, pas de notes manuscrites, pas de rouge (règles
 * html[data-discreet="1"] dans globals.css). Sur les fiches, le PDF se replie
 * aussi. Le choix est mémorisé ; un script dans le layout le réapplique avant
 * le premier affichage. Partagé par le bouton ci-dessous et le menu du profil.
 */
export function useDiscreetMode() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    let on0 = document.documentElement.dataset.discreet === "1";
    try {
      // Même filet de sécurité que ThemeToggle
      if (!on0 && localStorage.getItem(KEY) === "1") {
        document.documentElement.dataset.discreet = "1";
        on0 = true;
      }
    } catch {}
    setOn(on0);
    function onStorage(e: StorageEvent) {
      if (e.key !== KEY) return;
      const next = e.newValue === "1";
      if (next) document.documentElement.dataset.discreet = "1";
      else delete document.documentElement.dataset.discreet;
      setOn(next);
    }
    window.addEventListener("storage", onStorage);
    // Un autre bouton de la page a changé le mode
    const obs = new MutationObserver(() => setOn(document.documentElement.dataset.discreet === "1"));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-discreet"] });
    return () => {
      window.removeEventListener("storage", onStorage);
      obs.disconnect();
    };
  }, []);

  const toggle = useCallback(() => {
    const next = document.documentElement.dataset.discreet !== "1";
    if (next) document.documentElement.dataset.discreet = "1";
    else delete document.documentElement.dataset.discreet;
    try {
      if (next) localStorage.setItem(KEY, "1");
      else localStorage.removeItem(KEY);
    } catch {}
    setOn(next);
  }, []);

  return [on, toggle] as const;
}

export function DiscreetToggle() {
  const [on, toggle] = useDiscreetMode();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      title={on ? "Désactiver le mode discret" : "Mode discret : interface sobre"}
      aria-label="Mode discret"
      className={"icon-btn" + (on ? " is-on" : "")}
    >
      {on ? <EyeOff size={16} strokeWidth={1.9} /> : <Eye size={16} strokeWidth={1.9} />}
    </button>
  );
}
