"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { useEtatNav } from "@/components/nav/DevoileContext";
import { codexPanneau } from "@/lib/codex/actions";
import { EVENEMENT_CODEX_POINT, pastilleSeance, type Panneau } from "@/lib/codex/panneau";
import { marqueIci, poserMarqueIci, seanceIci } from "@/components/codex/seance-ici";

// La pastille « Séance 2/3 · Continuer → » (V3 §6.4), montée dans la barre du
// haut à droite du sceau (components/codex/SceauQuetesServeur) : la séance du
// jour lancée suit le joueur d'une page à l'autre. Ordinateur : une pastille
// dans la barre. Téléphone : une bande fixe en bas, au-dessus de la barre
// d'onglets, que « × » masque pour la journée. Visible seulement si la séance
// est lancée, pas finie, pas masquée, et que la page courante n'est pas déjà
// la destination du bloc en cours (lib/codex/panneau.ts, pastilleSeance).
// Relue (codexPanneau) à chaque changement de page, au plus une fois toutes
// les 20 s, et tout de suite à l'événement rl:codex-point (fin d'un outil,
// geste sur la séance). `demo` : aperçus (aucune action serveur, `chemin` imposé).

/** Une relecture au plus toutes les 20 s au fil des pages. */
const RELIRE_MS = 20_000;

export function PastilleSeance({ initial, jour, demo = false, chemin: cheminImpose }: { initial: Panneau["seance"]; jour: string; demo?: boolean; chemin?: string }) {
  const { codex } = useEtatNav();
  const cheminCourant = usePathname();
  const chemin = cheminImpose ?? cheminCourant ?? "/";
  const [seance, setSeance] = useState(initial);
  const [ici, setIci] = useState<{ lancee: boolean; masquee: boolean }>({ lancee: false, masquee: false });
  const [monte, setMonte] = useState(false);
  const lu = useRef(Date.now());

  useEffect(() => setSeance(initial), [initial]);

  // ce navigateur : la séance lancée sans la base, la pastille masquée pour la journée
  useEffect(() => {
    setMonte(true);
    if (demo) return;
    const etat = seanceIci(jour);
    setIci({ lancee: etat === "lancee", masquee: marqueIci("masquee", jour) || etat === "finie" });
  }, [demo, jour]);

  // relire : à chaque page (au plus toutes les 20 s), et à chaque point du Codex
  useEffect(() => {
    if (demo) return;
    let vivant = true;
    const relire = () => {
      lu.current = Date.now();
      void codexPanneau().then(
        (p) => {
          if (!vivant || !p.disponible) return;
          setSeance(p.seance);
          const etat = seanceIci(jour);
          setIci((x) => ({ lancee: x.lancee || etat === "lancee", masquee: x.masquee || etat === "finie" }));
        },
        () => undefined,
      );
    };
    if (Date.now() - lu.current >= RELIRE_MS) relire();
    window.addEventListener(EVENEMENT_CODEX_POINT, relire);
    return () => {
      vivant = false;
      window.removeEventListener(EVENEMENT_CODEX_POINT, relire);
    };
  }, [chemin, demo, jour]);

  const p = codex ? pastilleSeance(seance, chemin, { masquee: ici.masquee, lanceeIci: ici.lancee }) : null;
  if (!p) return null;

  const texte = `Séance ${p.rang}/${p.total}`;
  const masquer = () => {
    setIci((x) => ({ ...x, masquee: true }));
    if (!demo) poserMarqueIci("masquee", jour);
  };

  return (
    <>
      <Link
        href={p.href}
        className="rl-press hidden h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold md:inline-flex"
        style={{ boxShadow: "inset 0 0 0 1px var(--line-2)", color: "var(--ink)" }}
      >
        <span className="hidden lg:inline">Séance&nbsp;</span>
        {p.rang}/{p.total} · Continuer <ArrowRight size={14} aria-hidden />
      </Link>
      {/* la bande du téléphone sort de la barre du haut (son flou ferait de la barre le repère de « fixed ») */}
      {monte &&
        createPortal(
          <div
            role="region"
            aria-label="La séance du jour"
            className="fixed inset-x-3 z-40 flex items-center gap-1 rounded-[16px] border border-line p-1 md:hidden"
            style={{ bottom: "calc(86px + env(safe-area-inset-bottom, 0px))", background: "color-mix(in oklab, var(--paper) 92%, transparent)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
          >
            <Link href={p.href} className="rl-press flex min-h-[44px] min-w-0 flex-1 items-center justify-between gap-2 rounded-[12px] px-3 text-[14px] font-semibold">
              <span className="truncate">{texte}</span>
              <span className="inline-flex shrink-0 items-center gap-1">
                Continuer <ArrowRight size={15} aria-hidden />
              </span>
            </Link>
            <button type="button" onClick={masquer} aria-label="Masquer jusqu'à demain" className="rl-press grid size-11 shrink-0 place-items-center rounded-[12px] text-muted">
              <X size={18} aria-hidden />
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}
