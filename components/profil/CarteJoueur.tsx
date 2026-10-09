"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icone } from "@/components/adn/icons";
import { Feuille } from "@/components/ui/Feuille";
import { RankBadge } from "@/components/ui/RankBadge";
import { Banniere, CadreSceau } from "@/components/profil/Pieces";
import { SceauDe, ditSceau } from "@/components/profil/FicheSceau";
import { PresenceText } from "@/components/presence/Presence";
import { ordinal } from "@/components/classement/format";
import { carteJoueur } from "@/app/people/carte";
import type { CarteData } from "@/lib/profil/carte";
import { PLACEMENT_GAMES, TIERS, rankFor } from "@/lib/ranks";
import { nombre } from "@/lib/voice";
import { CARTE } from "@/lib/voice-social";

// La carte joueur, au toucher d'un joueur (classement, lobby des duels,
// amis) : une Feuille (du bas sur téléphone, panneau à droite sur
// ordinateur) avec sa bannière et son sceau, son rang et son pic, son
// niveau, ses 3 sceaux posés, puis Défier et Voir le profil. La porte
// d'entrée vers les profils, sans quitter la liste.
// - LienJoueur : un vrai lien vers le profil (Ctrl ou clic du milieu :
//   ailleurs, comme avant) qui, au toucher simple, demande la carte.
// - CarteJoueurHote : la feuille, une par page. Sans elle, le lien mène
//   au profil comme avant. Les cartes lues sont gardées le temps de la page.

const EVENEMENT = "rl:carte-joueur";
type Demande = { id: string; nom: string };

/** Un lien vers le profil d'un joueur qui ouvre sa carte au toucher. */
export function LienJoueur({
  id,
  nom,
  className,
  children,
  ...reste
}: { id: string; nom: string; className?: string; children: React.ReactNode } & Omit<React.ComponentProps<typeof Link>, "href" | "onClick" | "className" | "children">) {
  return (
    <Link
      href={`/people/${id}`}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        // une carte sur la page la prend (et annule l'événement) ; sinon, le profil
        const ev = new CustomEvent<Demande>(EVENEMENT, { detail: { id, nom }, cancelable: true });
        if (!window.dispatchEvent(ev)) e.preventDefault();
      }}
      {...reste}
    >
      {children}
    </Link>
  );
}

const ANGLES = [-6, 3, -2];

function Contenu({ c }: { c: CarteData }) {
  const rang = rankFor(c.elo, c.mastery, c.place);
  const placement = c.gamesPlayed < PLACEMENT_GAMES;
  const nomRang = `${rang.tier.name}${rang.division ? ` ${rang.division}` : ""}`;
  const pic = c.pic > rang.tierIndex ? TIERS[c.pic]?.name : null;
  const ligne = [`${nombre(c.elo)} ELO`, c.place !== null ? ordinal(c.place) : null, CARTE.niveau(c.niveau)].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col gap-5 pt-1">
      <div>
        <div className="overflow-hidden rounded-[16px]">
          <Banniere banner={c.style.banner} bannerUrl={c.style.bannerUrl} bannerPos={c.style.bannerPos} accent={c.style.accent} className="h-[104px]" />
        </div>
        <div className="-mt-7 flex items-end gap-3 px-3">
          <span className="relative z-[1] shrink-0">
            <CadreSceau frame={c.style.frame} name={c.nom} avatarUrl={c.avatarUrl} size={72} />
          </span>
          <div className="min-w-0 flex-1 pb-0.5">
            <p className="m-0 truncate text-[21px] font-extrabold leading-tight tracking-[-0.02em]">{c.nom}</p>
            {!c.moi && (
              <div className="min-h-[19px] text-[13px] font-semibold text-muted">
                <PresenceText userId={c.id} minuscule repli="hors ligne" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3.5">
        <RankBadge tier={rang.tierIndex} size={56} mastery={c.mastery ?? 0} division={placement ? null : rang.division} gray={placement} anime />
        <div className="min-w-0">
          <p className="m-0 text-[16px] font-bold leading-tight">{nomRang}</p>
          <p className="m-0 mt-0.5 font-mono text-[12.5px] tabular-nums text-muted">{ligne}</p>
          {(placement || pic) && <p className="m-0 mt-0.5 text-[13px] font-semibold text-muted">{placement ? CARTE.placement(c.gamesPlayed, PLACEMENT_GAMES) : CARTE.pic(pic as string)}</p>}
        </div>
      </div>

      {c.poses.length ? (
        <ul className="m-0 flex list-none items-center justify-center gap-4 p-0" aria-label={c.poses.map(ditSceau).join(". ")}>
          {c.poses.map((e, i) => (
            <li key={e.def.cle} className="w-[84px]">
              <SceauDe e={e} taille="remplir" angle={ANGLES[i]} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="t-small m-0">{CARTE.sansSceau}</p>
      )}

      <div className={"grid gap-2 " + (c.moi ? "" : "grid-cols-2")}>
        {!c.moi && (
          <Link href={`/duel?adversaire=${encodeURIComponent(c.id)}`} className="btn btn-primary rl-press min-h-[44px]">
            <Icone nom="duel" size={17} /> {CARTE.defier}
          </Link>
        )}
        <Link href={`/people/${c.id}`} className="btn btn-secondary rl-press min-h-[44px]">
          {c.moi ? CARTE.voirMoi : CARTE.voir}
        </Link>
      </div>
    </div>
  );
}

/** La feuille de la carte joueur : une par page, ouverte par LienJoueur. */
export function CarteJoueurHote({ charger = carteJoueur }: { /** la lecture (l'action serveur ; un aperçu passe la sienne) */ charger?: (id: string) => Promise<CarteData | null> }) {
  const [demande, setDemande] = useState<Demande | null>(null);
  const [carte, setCarte] = useState<CarteData | null | "erreur">(null);
  const lues = useRef(new Map<string, CarteData>());

  useEffect(() => {
    let courante = "";
    function ouvrir(ev: Event) {
      const d = (ev as CustomEvent<Demande>).detail;
      if (!d?.id) return;
      ev.preventDefault();
      courante = d.id;
      setDemande(d);
      const deja = lues.current.get(d.id);
      setCarte(deja ?? null);
      if (deja) return;
      charger(d.id).then(
        (c) => {
          if (c) lues.current.set(d.id, c);
          if (courante === d.id) setCarte(c ?? "erreur");
        },
        () => {
          if (courante === d.id) setCarte("erreur");
        },
      );
    }
    window.addEventListener(EVENEMENT, ouvrir);
    return () => window.removeEventListener(EVENEMENT, ouvrir);
  }, [charger]);

  return (
    <Feuille ouvert={!!demande} onFermer={() => setDemande(null)} titre={carte && carte !== "erreur" ? CARTE.ouvrir(carte.nom) : demande ? CARTE.ouvrir(demande.nom) : CARTE.titre} fermer={CARTE.fermer}>
      {demande &&
        (carte && carte !== "erreur" ? (
          <Contenu c={carte} />
        ) : carte === "erreur" ? (
          <div className="flex flex-col gap-4 pt-2">
            <p className="t-small m-0">{CARTE.erreur}</p>
            <Link href={`/people/${demande.id}`} className="btn btn-secondary min-h-[44px]">
              {CARTE.voir}
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-5 pt-1" aria-busy="true">
            <span className="sr-only">{CARTE.charge}</span>
            <div className="h-[104px] animate-pulse rounded-[16px] bg-surface-2" />
            <p className="m-0 -mt-1 px-3 text-[21px] font-extrabold leading-tight tracking-[-0.02em]">{demande.nom}</p>
            <div className="h-14 w-2/3 animate-pulse rounded-[12px] bg-surface-2" />
            <div className="h-[84px] animate-pulse rounded-[12px] bg-surface-2" />
          </div>
        ))}
    </Feuille>
  );
}
