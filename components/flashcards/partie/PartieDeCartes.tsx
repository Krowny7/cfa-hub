"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { boucleDuJoueur, lireBoucle } from "@/lib/flashcards/boucle";
import {
  assembler,
  ecrirePrefs,
  lirePrefs,
  maitriseesDuJoueur,
  reglagesInitiaux,
  rejouer as redistribuer,
  tirer,
  type CarteJeu,
  type MaitriseCompte,
  type MatierePartie,
  type Partie,
  type ReglagesPartie as Reglages,
  type Verdicts,
} from "@/lib/flashcards/partie";
import { chargerCartes } from "@/lib/flashcards/partie-api";
import { cleLocale, type LigneProgression } from "@/lib/flashcards/progression";
import { PARTIE_REGLAGES } from "@/lib/voice-partie";
import { BilanPartie } from "./BilanPartie";
import { ReglagesPartie } from "./ReglagesPartie";
import { TableDeJeu } from "./TableDeJeu";
import { useEnregistreurPartie } from "./useEnregistreurPartie";

// La partie de cartes de bout en bout, sur une seule page (/flashcards/partie,
// état côté navigateur) : « Prépare ta partie » → la donne → la table →
// le bilan, puis une nouvelle partie ou « Rejouer les non maîtrisées ».
//
//   réglages  ReglagesPartie   (lib/flashcards/partie : réglages, tirage)
//   donne     chargerCartes    (GET /api/flashcards/partie : texte des cartes
//                               tirées + boucles de leurs paquets sur le compte)
//   jeu       TableDeJeu       PropsTable (types.ts)  ← à remplacer par la vraie table
//   bilan     BilanPartie      PropsBilan (types.ts)  ← à remplacer par le vrai bilan
//
// « Maîtrisée » / « Pas encore » passent par `juger` : l'enregistreur écrit
// la maîtrise de la carte comme le reste du site (boucle du paquet sur
// l'appareil et sur le compte, répétition espacée, Codex ; sans jamais
// bloquer la partie).

type Ecran = { nom: "reglages" } | { nom: "jeu"; partie: Partie; donne: number } | { nom: "bilan"; partie: Partie; verdicts: Verdicts; historique: boolean[] };

export function PartieDeCartes({
  matieres,
  joueur,
  compte,
  cochees,
}: {
  matieres: MatierePartie[];
  joueur: string;
  /** ce que le compte sait de la maîtrise du joueur, par boucle (« set:<id> », « matiere:<clé> ») */
  compte: Record<string, MaitriseCompte>;
  /** les matières à cocher à l'ouverture (la page Flashcards ou la matière d'où l'on vient) ; vide : toutes */
  cochees: string[];
}) {
  const [ecran, setEcran] = useState<Ecran>({ nom: "reglages" });
  const [reglages, setReglages] = useState<Reglages>(() => reglagesInitiaux(matieres, cochees));
  // la maîtrise : d'abord celle du compte (rendu serveur = premier rendu du navigateur), puis l'appareil, plus récent peut-être
  const [maitrisees, setMaitrisees] = useState<ReadonlySet<string>>(() => maitriseesDuJoueur(matieres, () => null, compte));
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [prefsLues, setPrefsLues] = useState(false);
  const enregistreur = useEnregistreurPartie(joueur, matieres);
  const lignes = useRef<Record<string, LigneProgression> | null>(null);
  const vivant = useRef(true);
  const donnes = useRef(0);

  useEffect(() => {
    vivant.current = true;
    return () => {
      vivant.current = false;
    };
  }, []);

  // les préférences gardées sur l'appareil (mains, cartes par main, filtre, mélange)
  useEffect(() => {
    const p = lirePrefs();
    if (Object.keys(p).length) setReglages((r) => ({ ...r, ...p }));
    setPrefsLues(true);
  }, []);
  useEffect(() => {
    if (prefsLues) ecrirePrefs(reglages);
  }, [prefsLues, reglages.mains, reglages.parMain, reglages.seulementNonMaitrisees, reglages.melanger]); // eslint-disable-line react-hooks/exhaustive-deps

  // la maîtrise lue sur l'appareil, à l'ouverture et à chaque retour aux réglages (la partie vient de l'écrire)
  const relireMaitrise = useCallback(() => {
    setMaitrisees(maitriseesDuJoueur(matieres, (cle, ids) => boucleDuJoueur(lireBoucle(cleLocale(cle), ids), joueur), compte));
  }, [matieres, compte, joueur]);
  useEffect(() => {
    if (ecran.nom === "reglages") relireMaitrise();
  }, [ecran.nom, relireMaitrise]);

  async function distribuer() {
    if (occupe) return;
    setErreur(null);
    const mains = tirer(reglages, matieres, maitrisees);
    const ids = mains.flat().map((c) => c.id);
    if (!ids.length) return;
    setOccupe(true);
    const rep = await chargerCartes(ids);
    if (!vivant.current) return;
    setOccupe(false);
    const partie = rep
      ? assembler(
          mains,
          Object.fromEntries(rep.cartes.map((c) => [c.id, { front: c.front, back: c.back }])),
          matieres,
          reglages.parMain
        )
      : null;
    if (!rep || !partie) {
      setErreur(PARTIE_REGLAGES.erreurDonne);
      return;
    }
    lignes.current = rep.lignes;
    enregistreur.nouvellePartie(rep.lignes);
    setEcran({ nom: "jeu", partie, donne: ++donnes.current });
  }

  const juger = useCallback((carte: CarteJeu, maitrisee: boolean) => enregistreur.enregistrer(carte, maitrisee), [enregistreur]);

  if (ecran.nom === "jeu") {
    return (
      <TableDeJeu
        key={ecran.donne}
        partie={ecran.partie}
        juger={juger}
        terminer={(verdicts, historique) => {
          enregistreur.terminer();
          setEcran({ nom: "bilan", partie: ecran.partie, verdicts, historique });
        }}
        abandonner={() => {
          enregistreur.terminer();
          setEcran({ nom: "reglages" });
        }}
      />
    );
  }

  if (ecran.nom === "bilan") {
    return (
      <BilanPartie
        partie={ecran.partie}
        verdicts={ecran.verdicts}
        historique={ecran.historique}
        nouvellePartie={() => setEcran({ nom: "reglages" })}
        rejouer={() => {
          const suite = redistribuer(ecran.partie, ecran.verdicts, { parMain: reglages.parMain });
          if (!suite) return;
          enregistreur.nouvellePartie(lignes.current);
          setEcran({ nom: "jeu", partie: suite, donne: ++donnes.current });
        }}
      />
    );
  }

  return <ReglagesPartie matieres={matieres} reglages={reglages} maitrisees={maitrisees} occupe={occupe} erreur={erreur} onChange={setReglages} onDistribuer={distribuer} />;
}
