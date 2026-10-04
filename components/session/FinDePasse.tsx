"use client";

import { useEffect, useState } from "react";
import { AnneauDuJour } from "@/components/adn/AnneauDuJour";
import { OBJECTIF_DU_JOUR } from "@/components/adn/AnneauDuJourEvents";
import { InkBarCoches } from "@/components/adn/InkBarCoches";
import { SceauJour } from "@/components/adn/Sceau";
import { nombre } from "@/lib/voice";
import { FLASHCARDS, finPasse } from "@/lib/voice-z3c";

// La fin d'une passe de flashcards (QCM et sessions : la copie corrigée,
// FinDeSession). Les cartes ne sont pas des traits (elles ne font pas avancer
// l'anneau du jour) : la passe se résume en voix « Le Trait », une coche
// d'encre par carte sue, la croix du correcteur par carte à reprendre. Sous
// la passe, l'anneau du jour tel qu'il est ; si la journée est tenue, le
// correcteur tamponne la page de son sceau « TENU », en haut à droite (le
// coup de tampon une fois par jour, ensuite il est simplement posé).
//
//   <FinDePasse sues={12} total={15} aRevoir={3} jour={traits} actions={…} />
//
// Props
//   sues, total, aRevoir   le compte de la passe
//   marques                la passe carte par carte (true sue, false à reprendre,
//                          null passée), dans l'ordre ; sinon tirée des comptes
//   jour                   traits du jour (useTraitsDuJour) ; null : inconnu, pas de ligne d'anneau
//   unite                  sous le chiffre (« sues », « maîtrisées »)
//   surTitre, actions, children (liens), className

/** Au-delà, une coche par carte deviendrait illisible : la barre au pinceau. */
const MAX_COCHES = 36;

/** Même clé que le sceau de l'accueil : le coup de tampon ne joue qu'une fois par jour, sur tout le site. */
const CLE_SCEAU = "rl_sceau_tenu";
const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });

/** Le sceau « TENU · 4·10 » : tamponné la première fois du jour, posé ensuite. */
function SceauDuJour() {
  const [jour] = useState(() => JOUR_PARIS.format(new Date()));
  const [pose] = useState<"vue" | false>(() => {
    if (typeof window === "undefined") return "vue";
    try {
      return localStorage.getItem(CLE_SCEAU) === jour ? false : "vue";
    } catch {
      return "vue";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(CLE_SCEAU, jour);
    } catch {
      // stockage bloqué : le tampon rejouera à la prochaine passe
    }
  }, [jour]);
  return <SceauJour date={jour + "T12:00:00"} taille={64} pose={pose} delai={pose ? 0.45 : 0} />;
}

export function FinDePasse({
  sues,
  total,
  aRevoir,
  marques,
  jour,
  unite,
  surTitre = FLASHCARDS.surTitre,
  actions,
  children,
  className = "",
}: {
  sues: number;
  total: number;
  aRevoir: number;
  marques?: (boolean | null)[];
  jour: number | null;
  unite?: string;
  surTitre?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const r = finPasse(sues, total, aRevoir);
  const tenu = jour !== null && jour >= OBJECTIF_DU_JOUR;
  const items = marques ?? [...Array<boolean>(Math.max(0, sues)).fill(true), ...Array<boolean>(Math.max(0, aRevoir)).fill(false)];
  return (
    <section className={"card-hero rl-in relative grid content-center gap-6 px-6 py-8 sm:px-9 sm:py-10 " + className} aria-label="Fin de la passe">
      {/* journée tenue : le correcteur tamponne la page, en haut à droite */}
      {tenu && (
        <div className="absolute right-4 top-4 sm:right-8 sm:top-7">
          <SceauDuJour />
        </div>
      )}
      <div className={"grid gap-2.5 " + (tenu ? "pr-16 sm:pr-20" : "")}>
        <p className="t-eyebrow m-0">{surTitre}</p>
        <h2 className="t-h1 m-0">{r.titre}</h2>
        <p className="t-small m-0 max-w-[460px]">{r.ligne}</p>
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
          <p className="m-0 flex items-baseline gap-1.5">
            <span className="t-num text-[40px] leading-none">{nombre(sues)}</span>
            <span className="font-mono text-[15px] text-muted">/{nombre(total)}</span>
            <span className="t-micro ml-1">{unite ?? (sues > 1 ? "sues" : "sue")}</span>
          </p>
          {items.length > 0 && items.length <= MAX_COCHES ? (
            <InkBarCoches items={items} height={26} className="mb-1" label={`${nombre(sues)} sur ${nombre(total)} · ${nombre(aRevoir)} à reprendre`} />
          ) : (
            <div className="ink-bar mb-2 min-w-[140px] flex-1" aria-hidden>
              <span style={{ width: `${total ? Math.round((100 * sues) / total) : 0}%` }} />
            </div>
          )}
        </div>
      )}

      {jour !== null && (
        // l'anneau du jour tel qu'il est (les cartes ne le tracent pas) ; de la
        // place autour pour sa cote (« encore 14 », ou « demain » une fois tenu)
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-5">
          <div className="grid h-[92px] w-[112px] shrink-0 items-center justify-items-end">
            <AnneauDuJour repondues={jour} objectif={OBJECTIF_DU_JOUR} size={68}>
              <span className="t-num text-[15px] tabular-nums">{nombre(jour)}</span>
            </AnneauDuJour>
          </div>
          <p className="m-0 min-w-0 max-w-[340px] flex-1 basis-[180px] text-[13.5px] font-medium leading-snug">{FLASHCARDS.anneau(jour, OBJECTIF_DU_JOUR)}</p>
        </div>
      )}

      {(actions || children) && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          {children}
        </div>
      )}
    </section>
  );
}
