// Le bilan léger du Codex, ce que les écrans autres que /codex reçoivent
// (fin de séance, accueil) : les fanfares à jouer, l'acte qui vient de
// s'ouvrir, ce qui vient d'être dévoilé, la prochaine quête. Bâti sur la
// vue complète côté serveur, il ne porte que quelques lignes (la vue entière
// pèse une centaine de Ko). Module neutre.

import { ACTES } from "@/lib/codex/catalogue";
import type { Famille, RepliqueCodex } from "@/lib/codex/types";
import { devoileLite } from "@/lib/codex/devoile-lite";
import type { EtatLigne, LigneQuete, VueCodex } from "@/lib/codex/vue";

export type FeteCodex = {
  quete: string;
  periode: string;
  titre: string;
  famille: Famille | "acte";
  xp: number;
  /** « Titre : Apprenti », « Bannière : Carnet de Léonard »… */
  recompense: string | null;
  /** 0 : la plus grande */
  rang: number;
};

export type BilanCodex = {
  disponible: boolean;
  fetes: FeteCodex[];
  /** l'acte qui vient de s'ouvrir après la clôture d'un acte (fanfare non jouée) */
  acteNouveau: { id: string; titre: string; sousTitre: string; replique: RepliqueCodex; precedent: string } | null;
  /** nouvel onglet dévoilé (nouveau compte seulement) */
  devoile: { devoile: string[] | "tout"; nouveaux: { id: string; quoi: string; libelle: string; replique: string }[] } | null;
  prochaine: { titre: string; lien: string | null; pourquoi: string; valeur: number; cible: number; duree: number | null } | null;
  /** les 3 contrats du jour, en petit (accueil) ; vides tant que les contrats ne sont pas dévoilés */
  contrats: { id: string; titre: string; etat: EtatLigne; valeur: number; cible: number }[];
  trio: { faits: number; total: number; fait: boolean };
  retro: VueCodex["retro"];
};

export const BILAN_VIDE: BilanCodex = { disponible: false, fetes: [], acteNouveau: null, devoile: null, prochaine: null, contrats: [], trio: { faits: 0, total: 0, fait: false }, retro: null };

const NOMS_TYPE: Record<string, string> = { titre: "Titre", banniere: "Bannière", cadre: "Cadre" };

function nomCosmetique(vue: VueCodex, cle: string | null | undefined): string | null {
  if (!cle) return null;
  const p = vue.possessions.find((x) => x.cle === cle);
  return p ? `${NOMS_TYPE[p.type] ?? "Pièce"} : ${p.nom}` : null;
}

const RANG: Record<Famille, number> = { exploit: 2, longcours: 2, branche: 3, trame: 3, contrat: 4 };

/** Toutes les lignes de la vue qui peuvent être fêtées. */
function lignes(vue: VueCodex): LigneQuete[] {
  return [...vue.trame.flatMap((a) => a.quetes), ...vue.branches.flatMap((b) => b.etapes), ...vue.longCours.flatMap((c) => c.paliers), ...vue.exploits, ...vue.contrats.map((c) => c.ligne), ...vue.hebdo];
}

export function bilanDe(vue: VueCodex): BilanCodex {
  if (!vue.disponible) return BILAN_VIDE;
  const fetes: FeteCodex[] = [];
  const vues = new Set<string>();
  for (const l of lignes(vue)) {
    const cle = `${l.id}|${l.periode}`;
    if (!l.aFeter || vues.has(cle)) continue;
    vues.add(cle);
    // les sceaux : leur propre cérémonie (components/profil/CeremonieSceaux) les fête déjà
    if (l.id.startsWith("exploit:sceau:")) continue;
    fetes.push({ quete: l.id, periode: l.periode, titre: l.titre, famille: l.famille, xp: l.xpVersee ?? l.xp, recompense: nomCosmetique(vue, l.cosmetique) ?? nomCosmetique(vue, l.titreGagne), rang: l.etape === "maitre" ? 1 : RANG[l.famille] });
  }
  let acteNouveau: BilanCodex["acteNouveau"] = null;
  for (const a of vue.trame) {
    if (!a.aFeter) continue;
    const def = ACTES.find((x) => x.id === a.acte.id);
    fetes.push({ quete: `acte:${a.acte.id}`, periode: "", titre: a.acte.titre, famille: "acte", xp: def?.recompense.xp ?? 0, recompense: nomCosmetique(vue, def?.recompense.cosmetique) ?? nomCosmetique(vue, def?.recompense.titre), rang: 0 });
    // un acte parallèle (l'acte I) se referme sans lever de rideau : le fil n'a pas bougé
    const courant = a.acte.parallele ? null : vue.trame.find((x) => x.courant);
    if (courant && !acteNouveau) acteNouveau = { id: courant.acte.id, titre: courant.acte.titre, sousTitre: courant.acte.sousTitre, replique: courant.acte.ouverture, precedent: a.acte.titre };
  }
  fetes.sort((a, b) => a.rang - b.rang || b.xp - a.xp);
  const p = vue.prochaine;
  return {
    disponible: true,
    fetes,
    acteNouveau,
    devoile: vue.devoile ? { devoile: vue.devoile.devoile, nouveaux: vue.devoileNouveaux } : null,
    contrats: vue.devoile && !devoileLite(vue.devoile.devoile, "codex:contrats") ? [] : vue.contrats.map((c) => ({ id: c.ligne.id, titre: c.ligne.titre, etat: c.ligne.etat, valeur: c.ligne.valeur, cible: c.ligne.cible })),
    trio: { faits: vue.trio.faits, total: vue.trio.total, fait: vue.trio.fait },
    prochaine: p ? { titre: p.ligne.titre, lien: p.ligne.destination?.href ?? p.ligne.lien ?? null, pourquoi: p.ligne.destination?.raison ?? p.pourquoi, valeur: p.ligne.valeur, cible: p.ligne.cible, duree: p.ligne.destination?.duree ?? p.ligne.duree ?? null } : null,
    retro: vue.retro,
  };
}
