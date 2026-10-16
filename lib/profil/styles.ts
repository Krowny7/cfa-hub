import type { SupabaseClient } from "@supabase/supabase-js";
import { baseAbsente } from "@/lib/profil/sceaux-base";
import { AMBIANCES, HAUTEURS, STYLE_DEFAUT, estCouleur, nettoyerBio, vitrineDepuis, type Ambiance, type HauteurBanniere, type StyleProfil } from "@/lib/profil/catalogue";
import { blocsDe, dispositionDepuis, validerDisposition, type Prefixes } from "@/lib/profil/disposition";
import { pieceNue, piecesDuType, possede, type Acquis, type TypePiece } from "@/lib/profil/pieces";

// Le style d'un profil (table profile_style) : son unique lecteur, sa
// lecture en StyleProfil et la validation de ce que le joueur veut porter.
// Les colonnes titre et folio arrivent avec migration_v3_profil.sql §1 :
// lireStyles les demande et, tant qu'elles manquent, relit sans elles
// (titre et folio à null), sans jamais perdre le reste de la ligne.
// Un cadre, une bannière, un titre ou un folio se porte s'il est gagné
// (lib/profil/pieces.ts) ou s'il est déjà porté : rien de gagné n'est repris.
// Module serveur en pratique : il connaît toutes les pièces (le Codex
// compris), ce qu'un composant client n'a pas à charger.

/** Les colonnes de migration_v3_profil.sql §1 (null tant qu'elle n'est pas collée). */
export const COLONNES_V3 = ["titre", "folio"] as const;
const estV3 = (c: string) => (COLONNES_V3 as readonly string[]).includes(c);

/** Une ligne de profile_style telle que la base la rend (titre et folio toujours présents, null au besoin). */
export type LigneStyle = Record<string, unknown> & { user_id: string; titre: unknown; folio: unknown };

/**
 * Les lignes de profile_style des joueurs demandés, par joueur (un joueur
 * sans ligne n'a pas d'entrée). `colonnes` : « * » (toute la ligne, ce que
 * la base a), ou la liste voulue ; si une colonne de la v3 y figure et
 * manque en base (42703), la lecture est relancée sans elle. null : table
 * illisible (migration du profil absente, réseau).
 */
export async function lireStyles(sb: SupabaseClient, ids: string[], colonnes: "*" | readonly string[] = "*"): Promise<Map<string, LigneStyle> | null> {
  const joueurs = [...new Set(ids.filter((id) => typeof id === "string" && id))];
  const out = new Map<string, LigneStyle>();
  if (!joueurs.length) return out;
  const lire = (cols: "*" | readonly string[]) => sb.from("profile_style").select(cols === "*" ? "*" : ["user_id", ...cols.filter((c) => c !== "user_id")].join(",")).in("user_id", joueurs);
  try {
    let { data, error } = await lire(colonnes);
    if (error && colonnes !== "*" && colonnes.some(estV3) && baseAbsente(error)) ({ data, error } = await lire(colonnes.filter((c) => !estV3(c))));
    if (error || !Array.isArray(data)) return null;
    for (const r of data as unknown as Record<string, unknown>[]) {
      if (typeof r.user_id !== "string") continue;
      out.set(r.user_id, { ...r, user_id: r.user_id, titre: r.titre ?? null, folio: r.folio ?? null });
    }
    return out;
  } catch {
    return null;
  }
}

/** La clé nue d'une pièce connue de ce type, sinon null. */
const nueConnue = (type: TypePiece, v: unknown): string | null => (typeof v === "string" && pieceNue(type, v) ? v : null);

/** Le nom lisible du titre porté (« Copiste », « Maître de Fixed Income ») ; aucun, ou inconnu : null. */
export const nomTitre = (nue: string | null | undefined): string | null => (nue ? (pieceNue("titre", nue)?.nom ?? null) : null);

export type TitrePortable = { nue: string; nom: string; description: string };
/** Les titres que le joueur peut porter : ceux qu'il possède, et celui qu'il porte déjà (dans l'ordre du catalogue). */
export function titresPortables(a: Acquis, porte: string | null = null): TitrePortable[] {
  return piecesDuType("titre")
    .filter((p) => possede(p, a) || p.nue === porte)
    .map((p) => ({ nue: p.nue, nom: p.nom, description: p.description }));
}

/** Un style lu en base (colonnes de profile_style), valeurs inconnues ramenées au défaut. */
export function styleDepuis(row: Record<string, unknown> | null | undefined): StyleProfil {
  if (!row) return STYLE_DEFAUT;
  return {
    banner: nueConnue("banniere", row.banner) ?? STYLE_DEFAUT.banner,
    bannerUrl: typeof row.banner_url === "string" && row.banner_url ? row.banner_url : null,
    bannerPos: Number.isFinite(Number(row.banner_pos)) ? Math.max(0, Math.min(100, Number(row.banner_pos))) : 50,
    accent: estCouleur(row.accent) ? (row.accent as string) : STYLE_DEFAUT.accent,
    frame: nueConnue("cadre", row.frame) ?? STYLE_DEFAUT.frame,
    showcase: Array.isArray(row.showcase) ? vitrineDepuis(row.showcase) : STYLE_DEFAUT.showcase,
    radar: row.show_radar !== false,
    bio: typeof row.bio === "string" ? nettoyerBio(row.bio) : null,
    disposition: dispositionDepuis(row.layout, row.show_radar !== false),
    ambiance: AMBIANCES.some((a) => a.key === row.ambiance) ? (row.ambiance as Ambiance) : STYLE_DEFAUT.ambiance,
    bannerH: HAUTEURS.some((h) => h.key === row.banner_h) ? (row.banner_h as HauteurBanniere) : STYLE_DEFAUT.bannerH,
    titre: nueConnue("titre", row.titre),
    folio: nueConnue("folio", row.folio),
  };
}

export type Porte = Pick<StyleProfil, "frame" | "banner" | "titre" | "folio">;

/**
 * Ne garde que des valeurs connues et des pièces gagnées ou déjà portées (le
 * reste revient au défaut, et une pièce connue mais pas gagnée s'ajoute aux
 * refus). `prefixeImage` : l'adresse publique du dossier du joueur dans le
 * stockage ; une image ailleurs est refusée. `prefixesMedias` : de même pour
 * les images et la vidéo de la disposition (buckets profil-medias et
 * profil-videos). `porte` : ce qu'il porte aujourd'hui (portable même si la
 * condition ne l'est plus : un pic de Top 10 perdu garde son cadre). Titre et
 * folio absents de `input` : ceux qu'il porte, inchangés.
 */
export function validerStyle(input: Partial<StyleProfil>, a: Acquis, prefixeImage: string | null, prefixesMedias: Prefixes | null = null, porte: Porte | null = null): { style: StyleProfil; refus: string[] } {
  const refus: string[] = [];
  /** la pièce voulue, si elle est connue et (gagnée ou déjà portée) ; sinon null */
  const choisir = (type: TypePiece, voulu: unknown, deja: string | null | undefined, refusDe: (nom: string) => string): string | null => {
    const p = typeof voulu === "string" && voulu ? pieceNue(type, voulu) : null;
    if (!p) return null;
    if (possede(p, a) || p.nue === deja) return p.nue;
    refus.push(refusDe(p.nom));
    return null;
  };
  const frame = choisir("cadre", input.frame, porte?.frame, (nom) => `le cadre ${nom}`) ?? STYLE_DEFAUT.frame;
  const banner = choisir("banniere", input.banner, porte?.banner, (nom) => `la bannière ${nom}`) ?? STYLE_DEFAUT.banner;
  const titre = input.titre === undefined ? nueConnue("titre", porte?.titre) : choisir("titre", input.titre, porte?.titre, (nom) => `le titre ${nom}`);
  const folio = input.folio === undefined ? nueConnue("folio", porte?.folio) : choisir("folio", input.folio, porte?.folio, (nom) => `le folio ${nom}`);
  const url = typeof input.bannerUrl === "string" ? input.bannerUrl.trim() : "";
  const bannerUrl = url && prefixeImage && url.startsWith(prefixeImage) && /^[A-Za-z0-9:/._%-]+$/.test(url) && url.length <= 500 ? url : null;
  if (url && !bannerUrl) refus.push("l'image de bannière");
  const disp = Array.isArray(input.disposition) ? validerDisposition(input.disposition, prefixesMedias) : null;
  if (disp) refus.push(...disp.refus);
  const disposition = disp ? disp.disposition : dispositionDepuis(null, input.radar !== false);
  return {
    style: {
      banner,
      bannerUrl,
      bannerPos: Math.max(0, Math.min(100, Math.round(Number(input.bannerPos ?? 50)) || 0)),
      accent: estCouleur(input.accent) ? input.accent.toLowerCase() : STYLE_DEFAUT.accent,
      frame,
      showcase: vitrineDepuis(input.showcase),
      radar: blocsDe(disposition).some((b) => b.k === "radar"),
      bio: nettoyerBio(input.bio),
      disposition,
      ambiance: AMBIANCES.some((x) => x.key === input.ambiance) ? (input.ambiance as Ambiance) : STYLE_DEFAUT.ambiance,
      bannerH: HAUTEURS.some((h) => h.key === input.bannerH) ? (input.bannerH as HauteurBanniere) : STYLE_DEFAUT.bannerH,
      titre,
      folio,
    },
    refus,
  };
}
