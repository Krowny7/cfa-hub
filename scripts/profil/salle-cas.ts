// Les cas de rendu de la Salle des trophées gardés par test-grille.tsx : son
// balisage ne doit pas changer. REFERENCE_SALLE : l'empreinte (SHA-256, 24
// premiers caractères) du balisage de chaque cas, prise avant l'extraction
// de ParSource.
import type { LigneTrophee } from "@/lib/trophees";

export const REFERENCE_SALLE = [
  "2e732c322a608e8a7c5ef61a",
  "2e732c322a608e8a7c5ef61a",
  "59365a33775772f4375013b0",
  "0b9ffe12795e370652fbd50b",
  "3a256930d978bf1e6bd0da01",
  "eaa74f20e06bfe025bb081de",
  "5edebeb3f7dd1f6c3719530c",
];

const RICHE: LigneTrophee[] = [
  { source: "ciblee", palier: 1, n: 7 },
  { source: "ciblee", palier: 2, n: 4 },
  { source: "ciblee", palier: 3, n: 2 },
  { source: "cinq", palier: 1, n: 5 },
  { source: "cinq", palier: 4, n: 1 },
  { source: "duel", palier: 2, n: 3 },
];

export const CAS_SALLE: { lignes: LigneTrophee[]; complet: boolean; compact?: boolean; moi?: boolean }[] = [
  { lignes: RICHE, complet: true },
  { lignes: RICHE, complet: true, moi: false },
  { lignes: RICHE, complet: true, compact: true },
  { lignes: RICHE, complet: false },
  { lignes: [], complet: true },
  { lignes: [], complet: false },
  { lignes: [], complet: true, moi: false },
];
