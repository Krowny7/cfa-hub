// Le bilan léger du Codex, ce que les écrans autres que /codex reçoivent
// (fin de séance, accueil) : les fanfares à jouer, l'acte qui vient de
// s'ouvrir, ce qui vient d'être dévoilé, la prochaine quête. Bâti sur la
// vue complète côté serveur, il ne porte que quelques lignes (la vue entière
// pèse une centaine de Ko). Module neutre.
//
// Chaque fête a sa taille (V3 §3.10, tailleFete) : une ligne pour un contrat
// ou une étape, une carte pour un jalon, une page qui se tourne pour un acte,
// le plein cadre pour « Maître de… », le chef-d'œuvre, un programme mené.

import type { PropsFete, TailleFete } from "@/components/fete/Fete";
import type { Budget, Famille, RepliqueCodex } from "@/lib/codex/types";
import { devoileLite } from "@/lib/codex/devoile-lite";
import { slugDeId } from "@/lib/codex/programmes/ids";
import { feteSobre } from "@/lib/codex/sobre";
import { CODEX } from "@/lib/voice-codex";
import { etapeSeance, gainsSeance, type GainSeance } from "@/lib/codex/seance-etat";
import type { EtatLigne, LigneQuete, VueCodex } from "@/lib/codex/vue";

export type FeteCodex = {
  quete: string;
  periode: string;
  titre: string;
  famille: Famille | "acte";
  xp: number;
  /** « Titre : Apprenti », « Bannière : Carnet de Léonard »… */
  recompense: string | null;
  /** la pièce gagnée (clé de PIECES, lib/profil/pieces : « cadre:sanguine ») ; montrée en grand au plein cadre */
  piece: string | null;
  /** 0 : la plus grande */
  rang: number;
};

export type BilanCodex = {
  disponible: boolean;
  fetes: FeteCodex[];
  /** l'acte qui vient de s'ouvrir après la clôture d'un acte (fanfare non jouée) */
  acteNouveau: { id: string; titre: string; sousTitre: string; replique: RepliqueCodex; precedent: string } | null;
  /** nouvel onglet dévoilé (nouveau compte seulement) */
  devoile: { devoile: string[] | "tout"; nouveaux: VueCodex["devoileNouveaux"] } | null;
  prochaine: { titre: string; lien: string | null; pourquoi: string; valeur: number; cible: number; duree: number | null } | null;
  /** les 3 contrats du jour, en petit (accueil) ; vides tant que les contrats ne sont pas dévoilés */
  contrats: { id: string; titre: string; etat: EtatLigne; valeur: number; cible: number }[];
  trio: { faits: number; total: number; fait: boolean };
  retro: VueCodex["retro"];
  /** la séance du jour lancée et tenue, pas encore close : « Ce que ça a fait avancer » en fin d'outil (V3 §6.5) */
  seance?: FinSeance | null;
  /** le mode sobre du joueur (lib/codex/sobre) : les fêtes tiennent en une ligne, sans XP ni pièce */
  sobre?: boolean;
};

/** La fin d'une séance tenue : ses plus grands gains depuis le lancement, de quoi annoncer les trophées, et le budget (pour « Encore un bloc ? »). */
export type FinSeance = { jour: string; budget: Budget; lanceeLe: string | null; gains: GainSeance[] };

export const BILAN_VIDE: BilanCodex = { disponible: false, fetes: [], acteNouveau: null, devoile: null, prochaine: null, contrats: [], trio: { faits: 0, total: 0, fait: false }, retro: null, sobre: false };

/** Les étapes d'une branche fêtées en carte : les jalons (la série remplace la séance ciblée là où il n'y en a pas). */
const JALONS: ReadonlySet<string> = new Set(["ciblee", "serie", "maitrise60", "maitrise75", "signature"]);
/** Les actes fêtés en plein cadre : le chef-d'œuvre (acte VI) et l'épilogue. */
const ACTES_PLEINS: ReadonlySet<string> = new Set(["acte6", "epilogue"]);

/** L'id local d'une quête : sans le préfixe de son programme (« cfa-l2/branche:fsa:maitre » → « branche:fsa:maitre »). */
function idLocal(id: string): string {
  const slug = slugDeId(id);
  if (!slug) return id;
  return id.startsWith("acte:") ? "acte:" + id.slice(5 + slug.length + 1) : id.slice(slug.length + 1);
}

/**
 * La taille de la fête d'une quête tamponnée (V3 §3.10) : `ligne` pour un
 * contrat ou une étape (trame, étape de branche) ; `carte` pour un jalon de
 * branche (séance ciblée, maîtrise 60 et 75, signature), un palier de chaîne
 * ou du fil rouge, un exploit ; `page` pour un acte clos ; `plein` pour
 * « Maître de… », le chef-d'œuvre (acte VI), l'épilogue et un programme mené
 * (fil:programmes). Le mode sobre la ramène à une ligne (lib/codex/sobre).
 */
export function tailleFete(f: Pick<FeteCodex, "quete">): TailleFete {
  const id = idLocal(f.quete);
  const [famille, a, b] = id.split(":");
  if (famille === "acte") return ACTES_PLEINS.has(a) ? "plein" : "page";
  if (famille === "branche") return b === "maitre" ? "plein" : JALONS.has(b) ? "carte" : "ligne";
  if (famille === "fil") return a === "programmes" ? "plein" : "carte";
  if (famille === "longcours" || famille === "exploit") return "carte";
  return "ligne";
}

const NOMS_TYPE: Record<string, string> = { titre: "Titre", banniere: "Bannière", cadre: "Cadre", folio: "Folio" };

function nomCosmetique(vue: VueCodex, cle: string | null | undefined): string | null {
  if (!cle) return null;
  const p = vue.possessions.find((x) => x.cle === cle);
  return p ? `${NOMS_TYPE[p.type] ?? "Pièce"} : ${p.nom}` : null;
}

const RANG: Record<Famille, number> = { exploit: 2, longcours: 2, fil: 2, branche: 3, trame: 3, contrat: 4 };

/** Toutes les lignes de la vue qui peuvent être fêtées. */
function lignes(vue: VueCodex): LigneQuete[] {
  return [...vue.trame.flatMap((a) => a.quetes), ...vue.branches.flatMap((b) => b.etapes), ...vue.longCours.flatMap((c) => c.paliers), ...vue.filRouge.chapitres.flatMap((c) => c.recents), ...vue.exploits, ...vue.contrats.map((c) => c.ligne), ...vue.hebdo];
}

/**
 * Ce que montre la fête d'une quête : sa taille (tailleFete), ramenée à une
 * ligne sans XP ni pièce en mode sobre ; la récompense et l'acte qui s'ouvre
 * en sous-titre ; la réplique de l'acte nouveau sur une page ou un plein
 * cadre ; `autres` : les quêtes tamponnées qui ne sont pas fêtées une à une.
 */
export function habitFete(f: FeteCodex, o: { sobre: boolean; acte: BilanCodex["acteNouveau"]; autres: number }): Omit<PropsFete, "onFin" | "ancre"> {
  const { taille, xp, piece } = feteSobre({ taille: tailleFete(f), xp: f.xp, piece: f.piece ?? undefined }, o.sobre);
  const ouvre = f.famille === "acte" && o.acte ? o.acte : null;
  const autres = o.autres > 0 ? CODEX.fete.autres(o.autres) : null;
  if (taille === "ligne") return { taille, titre: autres ? `${f.titre}, ${autres}` : f.titre, xp };
  const sous = [o.sobre ? null : f.recompense, ouvre ? CODEX.fete.acteNouveau(ouvre.titre) : null, autres].filter(Boolean).join(" · ");
  return { taille, titre: f.titre, ...(sous ? { sous } : {}), xp, piece, replique: ouvre && (taille === "page" || taille === "plein") ? ouvre.replique : null };
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
    fetes.push({ quete: l.id, periode: l.periode, titre: l.titre, famille: l.famille, xp: l.xpVersee ?? l.xp, recompense: nomCosmetique(vue, l.cosmetique) ?? nomCosmetique(vue, l.titreGagne), piece: l.cosmetique ?? l.folio ?? l.titreGagne ?? null, rang: l.etape === "maitre" ? 1 : RANG[l.famille] });
  }
  let acteNouveau: BilanCodex["acteNouveau"] = null;
  for (const a of vue.trame) {
    if (!a.aFeter) continue;
    // l'acte de la trame du joueur (CFA I ou générique), tel que la vue le porte
    const def = a.acte;
    fetes.push({ quete: `acte:${a.acte.id}`, periode: "", titre: a.acte.titre, famille: "acte", xp: def.recompense.xp, recompense: nomCosmetique(vue, def.recompense.cosmetique) ?? nomCosmetique(vue, def.recompense.titre), piece: def.recompense.cosmetique ?? def.recompense.titre ?? null, rang: 0 });
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
    seance: vue.seance && vue.seance.lancee && etapeSeance(vue.seance) === "tenue" ? { jour: vue.seance.jour, budget: vue.seance.budget, lanceeLe: vue.seance.lanceeLe, gains: gainsSeance(vue.seance.avant, vue) } : null,
    sobre: vue.sobre,
  };
}
