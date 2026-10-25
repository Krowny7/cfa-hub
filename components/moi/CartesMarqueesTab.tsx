"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bookmark, Layers } from "lucide-react";
import { RichText } from "@/components/RichText";
import { VersoCompact } from "@/components/flashcards/Verso";
import { MarqueCarte } from "@/components/flashcards/MarqueCarte";
import { useMarquesCartes } from "@/lib/marques";
import type { CarteMarquee, CartesMarquees } from "@/lib/flashcards/marquees";
import { REG } from "@/lib/voice-moi";

// Moi › Marquées, la partie des flashcards (lib/flashcards/marquees.ts) : les
// cartes marquées pendant une révision (paquet, matière, liste « Le set »),
// la plus récente en tête, étiquetées matière · paquet, filtrables par
// matière ; chacune avec son recto, son verso (les trois cases, VersoCompact)
// et un lien vers son paquet. En tête, le nombre et « Réviser mes flashcards
// marquées » (/flashcards/marquees). Retirer la marque laisse la carte à sa
// place, grisée, jusqu'au prochain passage : un clic de trop se rattrape.
// Les marques sont relues en base à l'ouverture et au retour sur l'onglet
// (frais) : une carte marquée ailleurs depuis ne passe pas pour retirée.
// Tant que la table manque : le nombre de marques gardées sur l'appareil
// (lu après le montage : rien au rendu serveur). Lecture ratée : un mot
// neutre. Rien à montrer : rien.

const jour = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
const AUTRES = "Autres";

export function CartesMarqueesTab({ cartes, className = "" }: { cartes: CartesMarquees; className?: string }) {
  const etat = useMarquesCartes({ frais: true });
  const matieres = useMemo(() => {
    const n = new Map<string, number>();
    for (const it of cartes.items) n.set(it.matiereNom ?? AUTRES, (n.get(it.matiereNom ?? AUTRES) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]);
  }, [cartes.items]);
  const [filtre, setFiltre] = useState<string | null>(null);
  const T = REG.cartes;

  // lecture ratée (la table existe) ; table absente : les marques de l'appareil, une fois lues
  // (si l'appareil voit la table, elles rejoignent le compte et la page se relit : SynchroMarquesCartes)
  const ligne = cartes.erreur ? T.indisponible : !cartes.available && etat.pret && etat.ids.size > 0 ? (etat.local ? T.surAppareil(etat.ids.size) : T.indisponible) : null;
  if (!cartes.available || cartes.erreur) {
    if (!ligne) return null;
    return (
      <section className={"rl-section " + className} aria-label={T.titre}>
        <h2 className="t-h2 m-0">{T.titre}</h2>
        <div className="card-quiet grid justify-items-center gap-2 px-6 py-10 text-center">
          <Bookmark size={24} className="text-muted" aria-hidden />
          <p className="t-small m-0 max-w-[460px]">{ligne}</p>
        </div>
      </section>
    );
  }
  if (cartes.items.length === 0) return null;

  const items = filtre ? cartes.items.filter((it) => (it.matiereNom ?? AUTRES) === filtre) : cartes.items;
  return (
    <section id="flashcards" className={"rl-section scroll-mt-24 " + className} aria-labelledby="flashcards-marquees-titre">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 id="flashcards-marquees-titre" className="t-h2 m-0">
          {T.titre} <span className="font-mono text-[0.8em] font-semibold tabular-nums text-muted">· {cartes.items.length}</span>
        </h2>
        <Link href="/flashcards/marquees" className="btn btn-primary rl-press w-fit max-md:min-h-[44px]">
          <Layers size={16} aria-hidden /> {T.reviser} <ArrowRight size={16} aria-hidden />
        </Link>
      </div>
      {matieres.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={T.filtre}>
          <button type="button" className={`chip ${filtre === null ? "chip-active" : ""}`} aria-pressed={filtre === null} onClick={() => setFiltre(null)}>
            {T.toutes(cartes.items.length)}
          </button>
          {matieres.map(([m, n]) => (
            <button key={m} type="button" className={`chip ${filtre === m ? "chip-active" : ""}`} aria-pressed={filtre === m} onClick={() => setFiltre(m)}>
              {m} · {n}
            </button>
          ))}
        </div>
      )}
      {items.map((it) => (
        <CarteMarqueeVue key={it.cardId} it={it} retiree={etat.pret && !etat.local && !etat.ids.has(it.cardId)} />
      ))}
    </section>
  );
}

function CarteMarqueeVue({ it, retiree }: { it: CarteMarquee; retiree: boolean }) {
  const T = REG.cartes;
  return (
    <article className={"card min-w-0 p-5 transition-opacity md:p-7 " + (retiree ? "opacity-55" : "")}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="t-micro m-0 min-w-0 truncate">
          <span className="font-semibold text-white">{it.lieu}</span> · {retiree ? T.retiree : T.marqueeLe(jour(it.flaggedAt))}
        </p>
        <MarqueCarte cardId={it.cardId} source={it.source ?? "paquet"} variante="puce" />
      </div>
      <RichText text={it.front} className="mt-3 text-[15.5px] font-semibold leading-[1.6] tracking-[-0.006em] break-words [overflow-wrap:anywhere] md:text-[16px]" />
      <div className="mt-4 rounded-[12px] border border-line px-4 py-3.5">
        <VersoCompact back={it.back} className="text-body break-words text-[14.5px] leading-[1.55] [overflow-wrap:anywhere]" />
      </div>
      <Link href={`/flashcards/${it.setId}`} className="ink-link mt-4 inline-flex items-center gap-1 text-[13px] font-semibold">
        {T.paquet(it.theme)} <ArrowRight size={13} aria-hidden />
      </Link>
    </article>
  );
}
