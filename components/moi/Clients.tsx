"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { parseMoiTab } from "@/components/moi/data";

// Trois petits morceaux interactifs de l'espace Moi refait.

/** Un lien de la page qui commande la liste du carnet (RaturesTab) : « propre » lance la mise au propre, « anciennes » ouvre les retirées. */
export function LienCarnet({ action, href = "#liste", className, children }: { action: "propre" | "anciennes"; href?: string; className?: string; children: React.ReactNode }) {
  return (
    <a href={href} className={className} onClick={() => window.dispatchEvent(new CustomEvent("rl:carnet", { detail: action }))}>
      {children}
    </a>
  );
}

/** « Le détail » : replié, il s'ouvre tout seul quand on arrive par un lien vers #detail (« Voir la courbe », « Dernières sessions »). */
export function Detail({ titre, sous, children }: { titre: string; sous: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const ouvrir = () => {
      if (window.location.hash === "#detail" && ref.current) ref.current.open = true;
    };
    const clic = (e: MouseEvent) => {
      if (ref.current && (e.target as Element | null)?.closest?.('a[href="#detail"]')) ref.current.open = true;
    };
    ouvrir();
    window.addEventListener("hashchange", ouvrir);
    document.addEventListener("click", clic);
    return () => {
      window.removeEventListener("hashchange", ouvrir);
      document.removeEventListener("click", clic);
    };
  }, []);
  return (
    <details ref={ref} className="group/d">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
        <span>
          <span id="moi-detail" className="t-h2 m-0 block">
            {titre}
          </span>
          <span className="t-micro mt-1 block">{sous}</span>
        </span>
        <span className="btn btn-secondary btn-sm shrink-0">
          <span className="group-open/d:hidden">Ouvrir</span>
          <span className="hidden group-open/d:inline">Replier</span>
          <ChevronRight size={14} aria-hidden className="transition-transform group-open/d:rotate-90" />
        </span>
      </summary>
      {children}
    </details>
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
