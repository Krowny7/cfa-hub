"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseMoiTab } from "@/components/moi/data";

// Deux petits morceaux interactifs de l'espace Moi.

/** Un lien de la page qui commande la liste du carnet (RaturesTab) : « propre » lance la mise au propre, « anciennes » ouvre les retirées. */
export function LienCarnet({ action, href = "#liste", className, children }: { action: "propre" | "anciennes"; href?: string; className?: string; children: React.ReactNode }) {
  return (
    <a href={href} className={className} onClick={() => window.dispatchEvent(new CustomEvent("rl:carnet", { detail: action }))}>
      {children}
    </a>
  );
}

/** Les anciens liens /moi#reglages (l'onglet nommé dans l'ancre) mènent à la bonne vue. */
export function OngletParAncre() {
  const router = useRouter();
  useEffect(() => {
    const t = parseMoiTab(window.location.hash);
    if (t && t !== "stats" && !new URLSearchParams(window.location.search).get("onglet")) router.replace(`/moi?onglet=${t}`);
  }, [router]);
  return null;
}
