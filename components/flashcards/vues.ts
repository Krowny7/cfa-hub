import { valider } from "@/lib/flashcards/boucle";
import { cleLocale, type LigneProgression } from "@/lib/flashcards/progression";
import type { SourcesVues } from "@/components/flashcards/GrilleCartes";

// Ce que le compte sait des cartes d'une grille (module neutre, lu par les pages serveur) : une carte
// est « vue » dès qu'elle a reçu une marque dans une des boucles (paquet ou matière), « maîtrisée »
// si la dernière marque de la boucle est « Je maîtrise ». Les cartes d'aujourd'hui seulement.

export function sourcesVues(o: {
  lignes: ReadonlyMap<string, LigneProgression> | null;
  /** les clés de boucle du compte (« set:<id> », « matiere:<clé> ») */
  cles: string[];
  ids: readonly string[];
  /** les paquets dont l'appareil garde la répétition espacée */
  paquets: string[];
  joueur: string;
}): SourcesVues {
  const ici = new Set(o.ids);
  const vues = new Set<string>();
  const tenues = new Set<string>();
  for (const cle of o.cles) {
    const ligne = o.lignes?.get(cle);
    const e = ligne ? valider(ligne.etat) : null;
    if (!e) continue;
    for (const id of Object.keys(e.premier)) if (ici.has(id)) vues.add(id);
    for (const [id, m] of Object.entries(e.marques)) if (m === true && ici.has(id)) tenues.add(id);
  }
  for (const id of tenues) vues.add(id);
  return { vues: [...vues], tenues: [...tenues], joueur: o.joueur, boucles: o.cles.map(cleLocale), paquets: o.paquets };
}
