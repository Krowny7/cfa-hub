// Le dévoilement progressif, version légère pour le navigateur (barre de
// navigation, écran du Codex) : aucune dépendance au catalogue, qui pèse
// lourd. Les identifiants sont ceux de DECOUVERTE (lib/codex/catalogue.ts) ;
// un test de scripts/codex/test-ecran.ts vérifie qu'ils concordent.
// Module neutre (pas de "use client").

/** « quoi » (lib/codex/catalogue.ts DECOUVERTE) → identifiant du dévoilement. */
export const ID_DEVOILE: Record<string, string> = {
  "menu:reviser": "reviser",
  "codex:branches": "branches",
  "menu:entrainer": "entrainer",
  "codex:contrats": "contrats",
  "codex:longcours": "longcours",
  "menu:classement": "classement",
  "codex:exploits": "exploits",
};

/** L'espace du menu → ce qui le dévoile (le Codex et Moi sont toujours visibles). */
export const DEVOILE_DE_L_ESPACE: Record<string, string | undefined> = {
  reviser: "menu:reviser",
  entrainer: "menu:entrainer",
  classement: "menu:classement",
};

export type Devoile = string[] | "tout";

/** Une chose est-elle dévoilée ? Ne sert qu'à ranger : les liens directs marchent toujours. */
export function devoileLite(d: Devoile, quoi: string): boolean {
  if (d === "tout") return true;
  const id = ID_DEVOILE[quoi];
  return !id ? true : d.includes(id);
}

/** L'événement qui annonce un dévoilement à la barre de navigation (même onglet). */
export const EVENEMENT_DEVOILE = "rl:devoile";
export type DetailDevoile = { devoile: Devoile; nouveaux: string[] };
