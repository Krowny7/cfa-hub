"use client";

// La cérémonie de rang au premier affichage d'un résultat classé (duel,
// examen blanc classé), si le palier ou la division a bougé. Une seule fois
// par résultat (mémoire locale, clé `cle`), et RankCeremony n'en joue qu'une
// par session. Rien pendant le placement ; la 5e partie révèle la place.
//
//   <CeremonieRang cle={`duel:${id}`} avant={1312} apres={1330} maitrise={54}
//     place={4} joueurs={42} joues={7} dernier actif={verdictFini} />
//
// Props
//   cle            identifiant du résultat (« duel:<id> », « examen:<id> »)
//   avant, apres   ELO avant et après ce résultat
//   maitrise       maîtrise du programme (verrous), place / joueurs (Top 10, « 4e sur 42 »)
//   joues          parties classées jouées en tout (après ce résultat) ; null : inconnu
//   dernier        ce résultat est le dernier mouvement d'ELO du joueur ; sinon rien
//                  (le rang a pu bouger depuis : la cérémonie serait fausse)
//   actif          false : attendre (le verdict joue encore) ; défaut true
//   force          aperçus : ignore la mémoire « déjà vu »
//   compact        l'ELO est déjà affiché à côté (l'enjeu du verdict d'un duel) :
//                  la division se pose sans le panneau du rang, seulement le
//                  tampon et sa ligne (« Or II. Un trait de plus. »). Défaut false.
// Montée et fin du placement : plein écran. Division, verrou : en ligne.
// Descente : une ligne calme, jamais de cérémonie.

// La décision (quel moment, ou rien) vit dans un module neutre,
// components/classement/rang-moment.ts : une page serveur peut l'appeler.

import { useEffect, useState } from "react";
import { RankCeremony, type VarianteRang } from "@/components/adn/RankCeremony";
import { SceauDivision } from "@/components/adn/Sceau";
import { momentDeRang } from "@/components/classement/rang-moment";
import { rankFor } from "@/lib/ranks";
import { monteeDivision } from "@/lib/voice";

export { momentDeRang };

const VU_KEY = "rl-rang-vu";

function dejaVu(cle: string): boolean {
  try {
    return (JSON.parse(localStorage.getItem(VU_KEY) || "[]") as string[]).includes(cle);
  } catch {
    return false;
  }
}

function marquerVu(cle: string) {
  try {
    const l = (JSON.parse(localStorage.getItem(VU_KEY) || "[]") as string[]).filter((k) => k !== cle);
    l.unshift(cle);
    localStorage.setItem(VU_KEY, JSON.stringify(l.slice(0, 80)));
  } catch {
    // stockage bloqué : la cérémonie pourra rejouer, une par session au plus
  }
}

/**
 * Division, version compacte : le tampon de la division et sa ligne, sans le
 * panneau du rang (ni son ELO, déjà lisible à côté). Le tampon se pose au
 * montage (mouvement réduit : posé d'emblée), avec le son « tampon » des
 * cérémonies.
 */
function DivisionCompacte({ apres, maitrise, place, className }: { apres: number; maitrise: number | null; place: number | null; className: string }) {
  const r = rankFor(apres, maitrise, place);
  const rang = `${r.tier.name}${r.division ? ` ${r.division}` : ""}`;
  const d = monteeDivision(rang);
  return (
    <div className={"flex items-center gap-4 " + className} role="status">
      {r.division ? <SceauDivision palier={r.tier.name} division={r.division} taille={64} angle={8} pose son="ceremonie" /> : null}
      <p className="m-0 text-[14.5px] leading-[1.45] text-muted">
        <b className="font-semibold text-white">{d.titre}</b> {d.phrase}
      </p>
    </div>
  );
}

export function CeremonieRang({
  cle,
  avant,
  apres,
  maitrise = null,
  place = null,
  joueurs = null,
  joues = null,
  dernier = false,
  actif = true,
  force = false,
  compact = false,
  domaine,
  className = "",
}: {
  cle: string;
  avant: number;
  apres: number;
  maitrise?: number | null;
  place?: number | null;
  joueurs?: number | null;
  joues?: number | null;
  dernier?: boolean;
  actif?: boolean;
  force?: boolean;
  /** l'ELO est déjà visible à côté : division sans le panneau du rang */
  compact?: boolean;
  domaine?: string;
  className?: string;
}) {
  const [variante, setVariante] = useState<VarianteRang | null>(null);
  const [ouvert, setOuvert] = useState(true);

  useEffect(() => {
    if (!actif || variante) return;
    if (!force && dejaVu(cle)) return;
    const v = momentDeRang({ avant, apres, maitrise, place, joues, dernier });
    if (!v) return;
    if (!force) marquerVu(cle);
    setVariante(v);
  }, [actif, variante, force, cle, avant, apres, maitrise, place, joues, dernier]);

  if (!variante) return null;
  if (variante === "montee" || variante === "placement") {
    return ouvert ? (
      <RankCeremony
        variante={variante}
        elo={apres}
        eloAvant={avant}
        maitrise={maitrise}
        place={place}
        joueurs={joueurs}
        domaine={domaine}
        cle={cle}
        force={force}
        onFermer={() => setOuvert(false)}
      />
    ) : null;
  }
  if (variante === "division" && compact) return <DivisionCompacte apres={apres} maitrise={maitrise} place={place} className={className} />;
  return (
    <div className={className}>
      <RankCeremony variante={variante} elo={apres} eloAvant={avant} maitrise={maitrise} place={place} domaine={domaine} />
    </div>
  );
}
