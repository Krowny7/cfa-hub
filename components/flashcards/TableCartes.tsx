"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Piece } from "@/components/ui/Presentoir";
import { Carrousel } from "@/components/ui/Carrousel";
import { lireBoucleBrute } from "@/lib/flashcards/boucle";
import { avanceMatiere, compterStatuts, type AvanceMatiere, type AvancesProgramme, type LectureAppareil } from "@/lib/flashcards/avancement";
import { IMAGE_POSE } from "@/lib/flashcards/partie";
import { loadSRS } from "@/lib/srs";
import { nombre } from "@/lib/voice";
import { TABLE_CARTES as T } from "@/lib/voice-postes";
import t from "./TableCartes.module.css";

// /flashcards en UNE scène (Réviser A, 2026-11-13 ; la disposition de Théo du 2026-11-12 gardée) :
// le carrousel des paquets à gauche, Léonard le croupier et son petit tapis à droite, posés sur la
// même ligne de sol, la rangée centrée dans la scène (hauteur réservée sur ordinateur). Le carrousel
// s'ouvre sur la matière conseillée, dont la mention est entourée ; un lancer le fait tourner selon
// sa vitesse. Pas de titre de zone ni de consigne. Sur le paquet de devant, en Mono, ses
// cartes vues (« 38/60 vues ») ; un clic dessus ouvre la grille de sa matière. Le tapis lance la
// partie de cartes. Les cartes vues : le compte (rendu du serveur), puis l'appareil après le
// montage (boucles plus récentes, répétition espacée), comme l'index d'avant (avanceMatiere).

/** Ce que l'appareil sait, lu dans le navigateur (try/catch dans chaque lecture). */
const APPAREIL: LectureAppareil = {
  boucle: (local) => lireBoucleBrute(local),
  srs: (idPaquet) => Object.keys(loadSRS(idPaquet)).length,
};

/** L'avancement de chaque matière : le compte, puis l'appareil après le montage. */
export function useAvances(avances: AvancesProgramme | null): Record<string, AvanceMatiere> {
  const calcul = (lecture?: LectureAppareil) =>
    avances ? Object.fromEntries(Object.values(avances.matieres).map((m) => [m.cle, avanceMatiere(m, avances.joueur, lecture)])) : {};
  const [a, setA] = useState<Record<string, AvanceMatiere>>(() => calcul());
  useEffect(() => {
    setA(calcul(APPAREIL));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avances]);
  return a;
}

/** Le chiffre-héros de la porte : toutes les cartes vues. */
export function ChiffreProgramme({ avances }: { avances: AvancesProgramme }) {
  const a = useAvances(avances);
  return <>{nombre(Object.values(a).reduce((n, x) => n + x.vues, 0))}</>;
}

/** La ligne d'état de la porte : matières entamées, paquets maîtrisés. */
export function LigneProgramme({ avances }: { avances: AvancesProgramme }) {
  const a = useAvances(avances);
  const xs = Object.values(a);
  const entamees = xs.filter((x) => x.vues > 0).length;
  const n = compterStatuts(xs.flatMap((x) => x.paquets));
  return <>{T.ligne(entamees, n.maitrise, n.maitrise + n.cours + n.neuf)}</>;
}

export function TableCartes({
  pieces,
  depart,
  avances,
  hrefPartie,
  aidePartie,
  action,
}: {
  pieces: Piece[];
  depart: number;
  avances: AvancesProgramme | null;
  hrefPartie: string;
  aidePartie: string;
  action: string;
}) {
  const a = useAvances(avances);
  const avecMarques = pieces.map((p) => {
    const x = a[p.cle];
    return x ? { ...p, marque: x.vues > 0 ? T.vues(x.vues, x.total) : T.neuf(x.total) } : p;
  });
  // la matière conseillée (le langage d'état du site : entourée) : la première entamée pas finie,
  // sinon la première neuve ; le carrousel s'ouvre sur elle (depart, calculé par le serveur)
  const conseil =
    pieces.find((p) => a[p.cle] && a[p.cle].vues > 0 && a[p.cle].vues < a[p.cle].total)?.cle ??
    pieces.find((p) => a[p.cle] && a[p.cle].vues === 0 && a[p.cle].total > 0)?.cle;
  return (
    <div className={t.table}>
      <div className={t.rangee}>
      <div className={t.paquets}>
        <Carrousel forme="cartes" pieces={avecMarques} action={action} depart={depart} lancer grand conseil={conseil} />
      </div>
      <div className={t.croupier}>
        <div className={t.debout}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={IMAGE_POSE.moqueur} alt="" width={598} height={660} decoding="async" className={t.leonard} />
          <Link href={hrefPartie} className={t.tapis + " rl-presse"} aria-label={aidePartie} title={aidePartie}>
            <span className={t.cartesTapis} aria-hidden>
              <i />
              <i />
              <i />
            </span>
            <span className={t.jeton} aria-hidden />
          </Link>
        </div>
        <p className={t.nomTapis}>{T.tapis}</p>
      </div>
      </div>
    </div>
  );
}
