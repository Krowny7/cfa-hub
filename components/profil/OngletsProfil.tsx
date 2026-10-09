"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NotebookPen, Stamp, UserRound } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import type { OngletProfil } from "@/lib/profil/onglets";
import { ONGLETS } from "@/lib/voice-profil";

// Les onglets collants du profil, sous la barre du haut : Profil · Sceaux ·
// Journal · Face-à-face. Chaque onglet est une adresse (?onglet=…) rendue par le
// serveur, qui ne charge que ses données ; l'indicateur glissant est celui
// de l'espace Moi (.seg / .seg-thumb). Il part dès le toucher, sans
// attendre la page. Toucher seulement : pas de balayage (les carrousels
// gardent le geste).

const ICONES: Record<OngletProfil, React.ReactNode> = {
  profil: <UserRound size={15} aria-hidden />,
  sceaux: <Stamp size={15} aria-hidden />,
  journal: <NotebookPen size={15} aria-hidden />,
  "face-a-face": <Icone nom="duel" size={16} />,
};
const LIBELLES: Record<OngletProfil, string> = { profil: ONGLETS.profil, sceaux: ONGLETS.sceaux, journal: ONGLETS.journal, "face-a-face": ONGLETS.faceAFace };

export function OngletsProfil({
  actif,
  onglets,
}: {
  actif: OngletProfil;
  /** l'adresse et le compteur de chaque onglet (« 19 », « /48 » en plus sur ordinateur) */
  onglets: { cle: OngletProfil; href: string; compte?: string; compteLarge?: string }[];
}) {
  const [choisi, setChoisi] = useState(actif);
  useEffect(() => setChoisi(actif), [actif]);
  const ix = Math.max(0, onglets.findIndex((o) => o.cle === choisi));
  const n = onglets.length;

  return (
    <nav
      id="profil-onglets"
      aria-label={ONGLETS.nav}
      className="sticky top-16 z-30 w-screen scroll-mt-16 border-b border-line py-2 [margin-left:calc(50%_-_50vw)]"
      style={{ background: "color-mix(in oklab, var(--paper) 86%, transparent)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
    >
      <div className="mx-auto w-[min(1240px,calc(100vw_-_2rem))] md:w-[min(1240px,calc(100vw_-_3.5rem))]">
        <div className="seg w-full lg:w-auto" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          <span aria-hidden className="seg-thumb" style={{ left: `calc(4px + ${ix} * (100% - 8px) / ${n})`, width: `calc((100% - 8px) / ${n})` }} />
          {onglets.map((o) => {
            const on = o.cle === choisi;
            return (
              <Link
                key={o.cle}
                href={o.href}
                scroll={false}
                aria-current={o.cle === actif ? "page" : undefined}
                onClick={() => setChoisi(o.cle)}
                className="seg-item min-h-[40px] whitespace-nowrap px-2 max-sm:gap-1 max-sm:px-1 max-sm:text-[13.5px] sm:px-5"
              >
                <span className="max-sm:hidden" style={{ opacity: on ? 1 : 0.8 }}>
                  {ICONES[o.cle]}
                </span>
                {LIBELLES[o.cle]}
                {/* sur téléphone, le bilan du Face-à-face est déjà dans l'en-tête (« Toi 0–1 › ») : quatre onglets tiennent sans lui */}
                {o.compte ? (
                  <span className={"font-mono text-[12px] font-semibold text-muted tabular-nums" + (o.cle === "face-a-face" ? " max-sm:hidden" : "")}>
                    {o.compte}
                    {o.compteLarge ? <span className="max-lg:hidden">{o.compteLarge}</span> : null}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
