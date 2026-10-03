"use client";

import { useEffect, useState } from "react";
import { TopicRail, type TopicRailItem } from "@/components/ui/TopicRail";

// Réviser, matière par matière : le sélecteur horizontal des 10 matières,
// puis le détail de celle choisie (panneaux rendus par le serveur, un seul
// visible). Le choix suit l'URL (?matiere=fsa) sans recharger : un lien
// depuis l'accueil ou Moi ouvre directement la bonne matière.

const PANEL_ID = "reviser-matiere";

export function SubjectExplorer({ items, panels, initial }: { items: TopicRailItem[]; panels: Record<string, React.ReactNode>; initial: string }) {
  const [key, setKey] = useState(initial);
  const [moved, setMoved] = useState(false);

  // Navigation douce vers ?matiere=… (ou retour arrière) : la sélection suit.
  useEffect(() => {
    const sync = () => {
      const k = new URLSearchParams(window.location.search).get("matiere");
      if (k && panels[k]) setKey(k);
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [panels]);

  function select(k: string) {
    if (k === key) return;
    setKey(k);
    setMoved(true);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("matiere", k);
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    } catch {
      // la matière change quand même
    }
  }

  return (
    <div className="flex flex-col gap-5 md:gap-6">
      <TopicRail items={items} label="Les 10 matières" selected={key} onSelect={select} controls={PANEL_ID} />
      <div id={PANEL_ID} key={key} className={moved ? "rl-in" : undefined}>
        {panels[key]}
      </div>
    </div>
  );
}
