"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SceauDe } from "@/components/profil/FicheSceau";
import { signalerLeonard } from "@/lib/leonard/signal";
import { sceauxAFeter, sceauxFetes, type SceauAFeter } from "@/lib/profil/actions-sceaux";
import { hrefOnglet } from "@/lib/profil/onglets";
import { defSceau, type EtatSceau } from "@/lib/profil/sceaux";
import { CEREMONIE, condition, titreSceau } from "@/lib/voice-profil";

// La cérémonie d'obtention, en fin de session (FinDeSession), de duel
// (DuelResult) et de défi (DefiResult) : le serveur recalcule les sceaux du
// joueur (sceauxAFeter) ; s'il en a gagné, le plus haut se pose avec son
// coup de tampon. Sur téléphone, la carte vient d'abord à l'écran (sous la
// copie, elle n'est pas dans le premier écran), en haut, au-dessus de la
// place de Léonard. Chaque sceau n'est fêté qu'une fois (sceauxFetes).
// Sans la base, ou sans nouveau sceau : rien.
// `onResultat(n)` : le nombre de sceaux fêtés (0 : rien, ou échec) ; l'écran
// répond true si Léonard peut venir féliciter (une seule apparition par
// écran : il n'est pas déjà venu, et l'écran ne l'appellera pas). Il vient
// alors une fois la carte à l'écran. Sans `onResultat` (duel, défi : l'écran
// a déjà le sien), Léonard n'est pas appelé. `demo` : aperçus locaux.

/** Le temps que les réponses de la copie soient enregistrées. */
const ATTENTE_MS = 1200;

/** Un sceau gagné, tel qu'on le dessine (son palier, le seuil de ce palier). */
function etatGagne(f: SceauAFeter): EtatSceau | null {
  const def = defSceau(f.cle);
  if (!def) return null;
  return { def, palier: f.palier, valeur: def.seuils[f.palier - 1], questions: null, prochain: f.palier < 3 ? (def.seuils as readonly number[])[f.palier] : null, avance: 0 };
}

export function CeremonieSceaux({
  onResultat,
  demo,
  className = "",
}: {
  onResultat?: (n: number) => boolean;
  demo?: { id: string; sceaux: SceauAFeter[] };
  className?: string;
}) {
  const [fete, setFete] = useState<{ id: string; etats: EtatSceau[]; leonard: boolean } | null>(null);
  const carte = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let fini = false;
    const t = window.setTimeout(async () => {
      let r: { id: string; sceaux: SceauAFeter[] } | null = null;
      try {
        r = demo ?? (await sceauxAFeter());
      } catch {
        r = null;
      }
      if (fini) return;
      const etats = (r?.sceaux ?? []).map(etatGagne).filter((e): e is EtatSceau => !!e);
      const leonard = onResultat?.(etats.length) ?? false;
      if (!r || !etats.length) return;
      setFete({ id: r.id, etats, leonard });
      if (!demo) sceauxFetes(etats.map((e) => e.def.cle)).catch(() => undefined);
    }, demo ? 0 : ATTENTE_MS);
    return () => {
      fini = true;
      window.clearTimeout(t);
    };
    // une fois, au montage (onResultat ne lit que des références de l'écran)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // la carte posée, sur téléphone : elle vient en haut de l'écran (le bas est à Léonard et à sa
  // bulle) ; si la page s'arrête trop tôt pour l'y amener, une cale sous la carte le permet
  const [cale, setCale] = useState(0);
  useEffect(() => {
    const el = carte.current;
    if (!fete || !el || !window.matchMedia("(max-width: 640px)").matches) return;
    const r = el.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= window.innerHeight * 0.5) return;
    const marge = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    const manque = r.top + window.scrollY - marge - (document.documentElement.scrollHeight - window.innerHeight);
    if (manque > 0) setCale(Math.ceil(manque));
    else amener(el);
  }, [fete]);
  useEffect(() => {
    if (cale > 0 && carte.current) amener(carte.current);
  }, [cale]);

  // Léonard, une fois qu'on voit la carte
  useEffect(() => {
    const el = carte.current;
    if (!fete || !el || !fete.leonard) return;
    const premier = fete.etats[0];
    const io = new IntersectionObserver(
      (es) => {
        if (!es.some((e) => e.intersectionRatio >= 0.6)) return;
        io.disconnect();
        // le temps du coup de tampon
        signalerLeonard({ evt: "sceau-gagne", delai: 1200 }, `sceau:${premier.def.cle}:${premier.palier}`);
      },
      { threshold: [0.6] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [fete]);

  if (!fete) return null;
  const [e, ...autres] = fete.etats;
  return (
    <>
      <section ref={carte} aria-live="polite" className={"card mx-auto flex w-full max-w-[660px] scroll-mt-24 items-center gap-5 p-5 sm:gap-6 sm:p-6 " + className}>
        <div className="w-[96px] shrink-0 sm:w-[120px]">
          <SceauDe e={e} taille="remplir" angle={-5} pose="vue" son="ceremonie" />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="t-eyebrow m-0">{CEREMONIE.titre}</p>
          <p className="t-h2 m-0">{titreSceau(e)}</p>
          <p className="t-small m-0">
            {condition(e.def, e.def.seuils[e.palier - 1])}
            {autres.length ? ` · ${CEREMONIE.autres(autres.length)}` : null}
          </p>
          <Link href={hrefOnglet(fete.id, "sceaux")} className="btn btn-secondary mt-2 min-h-[44px] w-fit">
            {CEREMONIE.voir} <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>
      {cale > 0 && <div aria-hidden style={{ height: cale }} />}
    </>
  );
}

/** Amener la carte en haut de l'écran (sans glisser en mouvement réduit). */
function amener(el: HTMLElement) {
  const doux = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: doux ? "smooth" : "auto", block: "start" });
}
