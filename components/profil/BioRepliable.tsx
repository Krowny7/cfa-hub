"use client";

import { useEffect, useRef, useState } from "react";
import { ENTETE } from "@/lib/voice-profil";

// La bio de l'en-tête : sur téléphone, deux lignes puis « plus » (seulement
// si elle déborde, mesuré après le montage) ; en entier sur ordinateur.

export function BioRepliable({ texte }: { texte: string }) {
  const p = useRef<HTMLParagraphElement | null>(null);
  const [deborde, setDeborde] = useState(false);
  const [ouverte, setOuverte] = useState(false);

  useEffect(() => {
    const el = p.current;
    if (!el) return;
    const mesurer = () => setDeborde(el.scrollHeight > el.clientHeight + 1);
    mesurer();
    const ro = new ResizeObserver(mesurer);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex max-w-[560px] flex-col items-start gap-0.5">
      <p ref={p} className={"t-small m-0 whitespace-pre-line text-white " + (ouverte ? "" : "max-lg:line-clamp-2")}>
        {texte}
      </p>
      {(deborde || ouverte) && (
        <button type="button" onClick={() => setOuverte((v) => !v)} aria-expanded={ouverte} className="min-h-[32px] text-[13px] font-semibold text-muted hover:text-white lg:hidden">
          {ouverte ? ENTETE.moins : ENTETE.plus}
        </button>
      )}
    </div>
  );
}
