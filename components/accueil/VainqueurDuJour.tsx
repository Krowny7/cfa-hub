"use client";

import { useRef, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useHorsEcran } from "@/components/ui/useHorsEcran";
import { dayHref, dayLabel } from "@/lib/daily";
import { TIERS, teinteDeRang } from "@/lib/ranks";
import { pctScore } from "@/lib/voice";
import { VAINQUEUR } from "@/lib/voice-accueil";
import type { VainqueurDuJour as Donnees } from "@/lib/vainqueur-du-jour";
import s from "./VainqueurDuJour.module.css";

// « Le vainqueur du jour » : la meilleure copie des 30 d'hier, sous Les 30 du
// jour. Sa bannière de profil en fond (sinon la peinture du Pupitre), son
// insigne, son pseudo, son score, son temps, le nombre de joueurs. Toute la
// bannière mène au classement de ce jour (/defi/<date>). Les données
// viennent de lib/vainqueur-du-jour.ts ; rien ne s'affiche s'il n'y avait pas
// de vainqueur hier (le chargeur renvoie null).

const FOND_PAR_DEFAUT = "/illustrations/defi-pupitre.webp";

export function VainqueurDuJour({ v }: { v: Donnees }) {
  const racine = useRef<HTMLAnchorElement | null>(null);
  useHorsEcran(racine);
  const jour = dayLabel(v.day, "day");
  const nom = v.isMe ? VAINQUEUR.toi : v.name;
  const style = { "--liq": `url(/ranks/v2/liquide-${v.tier}.webp)`, "--teinte": teinteDeRang(v.tier) } as CSSProperties;
  return (
    <Link ref={racine} href={dayHref(v.day)} className={s.bande} style={style}>
      <span aria-hidden className={s.lisere} />
      <span aria-hidden className={s.peint}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={v.bannerUrl || FOND_PAR_DEFAUT} alt="" loading="lazy" decoding="async" draggable={false} />
      </span>
      <span className={s.txt}>
        <span className={s.sur}>{VAINQUEUR.sur}</span>
        <span className={s.nom + " font-brand"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={v.placement ? s.gris : undefined} src={`/ranks/v2/petit-${v.tier}-128.png`} width={128} height={128} alt={v.placement ? "" : TIERS[v.tier].name} />
          <span>{nom}</span>
        </span>
        <span className={s.detail}>
          <b>
            {v.score}/{v.total}
          </b>
          {pctScore(v.score, v.total) && ` · ${pctScore(v.score, v.total)}`}
          {" · "}
          {VAINQUEUR.duree(v.seconds)}
          {" · "}
          {VAINQUEUR.devant(v.players)}
        </span>
      </span>
      <span className={s.action}>
        {VAINQUEUR.classement(jour)} <ArrowRight size={16} aria-hidden />
      </span>
    </Link>
  );
}
