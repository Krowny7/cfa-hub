"use client";

import { useEffect, useState } from "react";
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
// coup de tampon et Léonard félicite (une seule apparition : l'écran qui
// l'accueille ne l'appelle pas en plus). Chaque sceau n'est fêté qu'une
// fois (sceauxFetes). Sans la base, ou sans nouveau sceau : rien.
// `onResultat(n)` : le nombre de sceaux fêtés (0 : rien, ou échec), pour que
// l'écran fasse réagir Léonard à sa place. `demo` : aperçus locaux.

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
  onResultat?: (n: number) => void;
  demo?: { id: string; sceaux: SceauAFeter[] };
  className?: string;
}) {
  const [fete, setFete] = useState<{ id: string; etats: EtatSceau[] } | null>(null);

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
      onResultat?.(etats.length);
      if (!r || !etats.length) return;
      setFete({ id: r.id, etats });
      const premier = etats[0];
      signalerLeonard({ evt: "sceau-gagne", delai: 1800 }, `sceau:${premier.def.cle}:${premier.palier}`);
      if (!demo) sceauxFetes(etats.map((e) => e.def.cle)).catch(() => undefined);
    }, demo ? 0 : ATTENTE_MS);
    return () => {
      fini = true;
      window.clearTimeout(t);
    };
    // une fois, au montage (onResultat ne lit que des références de l'écran)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!fete) return null;
  const [e, ...autres] = fete.etats;
  return (
    <section aria-live="polite" className={"card mx-auto flex w-full max-w-[660px] items-center gap-5 p-5 sm:gap-6 sm:p-6 " + className}>
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
        <Link href={hrefOnglet(fete.id, "sceaux")} className="btn btn-secondary mt-2 w-fit">
          {CEREMONIE.voir} <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
