// Les cas pratiques de FSA. Ajouter un cas : écrire son fichier au format de ./types, puis
// l'ajouter à CAS_FSA ; la liste et sa page en découlent. Module neutre, à lire côté serveur :
// un composant client reçoit son cas en prop, pour que les autres ne partent pas au navigateur.
import { CAS_LVMH } from "./lvmh";
import type { CasFsa } from "./types";

export type { CasFsa, EtapeCas, EtatFinancier, Extrait, LigneEtat } from "./types";

export const CAS_FSA: CasFsa[] = [CAS_LVMH];

export const casDe = (id: string): CasFsa | null => CAS_FSA.find((c) => c.id === id) ?? null;
