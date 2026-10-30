import type { SupabaseClient } from "@supabase/supabase-js";
import { baseAbsente } from "@/lib/profil/sceaux-base";
import { AMBIANCES, HAUTEURS, ORNEMENT_DEFAUT, STYLE_DEFAUT, estCouleur, nettoyerBio, vitrineDepuis, type Ambiance, type HauteurBanniere, type StyleBanniere, type StyleProfil } from "@/lib/profil/catalogue";
import { bornerPersoPos, bornerPersoTaille, persoDepuis, persoValide } from "@/lib/profil/perso";
import { compositionDepuis, serialiserComposition, validerComposition, type Composition } from "@/lib/profil/banniere";
import { badgesGagnes } from "@/lib/profil/banniere-badges";
import { blocsDe, dispositionDepuis, validerDisposition, type Prefixes } from "@/lib/profil/disposition";
import { pieceNue, piecesDuType, possede, programmeCourt, type Acquis, type Rarete, type TypePiece } from "@/lib/profil/pieces";
import { avanceePiece } from "@/lib/voice-profil";

// Le style d'un profil (table profile_style) : son unique lecteur, sa
// lecture en StyleProfil, la validation de ce que le joueur veut porter et
// son écriture.
// Les colonnes titre et folio arrivent avec migration_v3_profil.sql §1, et
// le personnage et l'ornement de la bannière (perso_url, perso_taille,
// perso_pos, ornement) avec migration_bannieres_perso.sql : lireStyles les
// demande et, tant qu'elles manquent, relit sans elles (titre et folio à
// null, pas de personnage, le filet d'encre), sans jamais perdre le reste de
// la ligne ; ecrireStyle, de même, réécrit sans elles.
// La bannière composée (fond, personnage, pièces, ordre, panneau : une colonne
// jsonb, profile_style.banniere) arrive avec migration_bannieres_composees.sql,
// qui reprend aussi les colonnes ci-dessus : même repli, sans composition (null).
// Un cadre, une bannière, un titre, un folio ou un ornement se porte s'il est gagné
// (lib/profil/pieces.ts) ou s'il est déjà porté : rien de gagné n'est repris.
// Module serveur en pratique : il connaît toutes les pièces (le Codex
// compris), ce qu'un composant client n'a pas à charger.

/** Les colonnes de migration_v3_profil.sql §1 (null tant qu'elle n'est pas collée). */
export const COLONNES_V3 = ["titre", "folio"] as const;
const estV3 = (c: string) => (COLONNES_V3 as readonly string[]).includes(c);
/** Les colonnes de migration_bannieres_perso.sql : le personnage de la bannière (adresse, taille, position) et l'ornement porté. */
export const COLONNES_PERSO = ["perso_url", "perso_taille", "perso_pos", "ornement"] as const;
const estPerso = (c: string) => (COLONNES_PERSO as readonly string[]).includes(c);
/** La colonne de migration_bannieres_composees.sql : la bannière composée (null tant qu'elle n'est pas collée). */
export const COLONNES_BANNIERE = ["banniere"] as const;
const estBanniere = (c: string) => (COLONNES_BANNIERE as readonly string[]).includes(c);

/** Une ligne de profile_style telle que la base la rend (titre et folio toujours présents, null au besoin). */
export type LigneStyle = Record<string, unknown> & { user_id: string; titre: unknown; folio: unknown };

/**
 * Les lignes de profile_style des joueurs demandés, par joueur (un joueur
 * sans ligne n'a pas d'entrée). `colonnes` : « * » (toute la ligne, ce que
 * la base a), ou la liste voulue ; si une colonne de la v3 ou du personnage
 * y figure et manque en base (42703), la lecture est relancée sans elles. null : table
 * illisible (migration du profil absente, réseau).
 */
export async function lireStyles(sb: SupabaseClient, ids: string[], colonnes: "*" | readonly string[] = "*"): Promise<Map<string, LigneStyle> | null> {
  const joueurs = [...new Set(ids.filter((id) => typeof id === "string" && id))];
  const out = new Map<string, LigneStyle>();
  if (!joueurs.length) return out;
  const lire = (cols: "*" | readonly string[]) => sb.from("profile_style").select(cols === "*" ? "*" : ["user_id", ...cols.filter((c) => c !== "user_id")].join(",")).in("user_id", joueurs);
  try {
    let cols = colonnes;
    let { data, error } = await lire(cols);
    // les colonnes les plus récentes d'abord : sans la bannière composée, puis sans le personnage, puis sans le titre ni le folio
    for (const recente of [estBanniere, estPerso, estV3]) {
      if (!error || cols === "*" || !cols.some(recente) || !baseAbsente(error)) continue;
      cols = cols.filter((c) => !recente(c));
      ({ data, error } = await lire(cols));
    }
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

/**
 * Les colonnes du personnage et de l'ornement existent-elles
 * (migration_bannieres_perso.sql collée) ? Une lecture d'une ligne ; faux
 * seulement quand la base dit qu'une colonne manque (une panne passagère ne
 * cache pas la fonction : l'enregistrement se replie de toute façon).
 */
export async function persoDisponible(sb: SupabaseClient): Promise<boolean> {
  try {
    const { error } = await sb.from("profile_style").select(COLONNES_PERSO.join(",")).limit(1);
    return !(error && baseAbsente(error));
  } catch {
    return true;
  }
}

/**
 * La colonne de la bannière composée existe-t-elle (migration_bannieres_composees.sql
 * collée) ? Même règle que persoDisponible : faux seulement quand la base dit
 * qu'elle manque.
 */
export async function banniereDisponible(sb: SupabaseClient): Promise<boolean> {
  try {
    const { error } = await sb.from("profile_style").select(COLONNES_BANNIERE.join(",")).limit(1);
    return !(error && baseAbsente(error));
  } catch {
    return true;
  }
}

/** Ce que l'écriture du style a pu enregistrer. */
export type EcritureStyle = {
  /** l'erreur qui reste après les replis (null : enregistré) */
  error: { message: string; code?: string } | null;
  /** le titre et le folio sont enregistrés (migration_v3_profil.sql collée) */
  titreFolio: boolean;
  /** la bannière composée est enregistrée (migration_bannieres_composees.sql collée) */
  banniere: boolean;
  /** le personnage et l'ornement sont enregistrés (migration_bannieres_perso.sql, ou migration_bannieres_composees.sql qui la reprend) */
  perso: boolean;
  /** la disposition, l'ambiance et la hauteur de bannière sont enregistrées (migration_profil_medias.sql collée) */
  disposition: boolean;
};

/**
 * Écrit le style d'un joueur, déjà validé (client service role : les joueurs
 * n'écrivent pas profile_style). Les colonnes venues après
 * migration_profil.sql se replient l'une après l'autre : sans la bannière
 * composée (migration_bannieres_composees.sql), sans le personnage ni
 * l'ornement (migration_bannieres_perso.sql), puis sans titre ni folio
 * (migration_v3_profil.sql), puis sans disposition, ambiance ni hauteur de
 * bannière (migration_profil_medias.sql) ; le reste s'enregistre.
 */
export async function ecrireStyle(admin: SupabaseClient, userId: string, style: StyleProfil, quand: string): Promise<EcritureStyle> {
  const ligne = {
    user_id: userId,
    banner: style.banner,
    banner_url: style.bannerUrl,
    banner_pos: style.bannerPos,
    accent: style.accent,
    frame: style.frame,
    showcase: style.showcase,
    show_radar: style.radar,
    bio: style.bio,
    updated_at: quand,
  };
  const complet = { ...ligne, layout: style.disposition, ambiance: style.ambiance, banner_h: style.bannerH };
  const ecrire = (l: Record<string, unknown>) => admin.from("profile_style").upsert(l, { onConflict: "user_id" });
  const v3 = { ...complet, titre: style.titre, folio: style.folio };
  const avecPerso = { ...v3, perso_url: style.perso, perso_taille: style.persoTaille, perso_pos: style.persoPos, ornement: style.ornement === ORNEMENT_DEFAUT ? null : style.ornement };
  let s = await ecrire({ ...avecPerso, banniere: style.banniere ? serialiserComposition(style.banniere) : null });
  const banniere = !s.error;
  // la base dit que « banniere » manque (et seulement elle) : on réécrit avec le personnage, sans la bannière composée
  if (s.error && baseAbsente(s.error) && /banniere/i.test(s.error.message)) s = await ecrire(avecPerso);
  const perso = !s.error;
  if (s.error && baseAbsente(s.error)) s = await ecrire(v3);
  const titreFolio = !s.error;
  if (s.error && baseAbsente(s.error)) s = await ecrire(complet);
  const disposition = !s.error;
  if (s.error && /layout|ambiance|banner_h|column|schema cache/i.test(s.error.message)) s = await ecrire(ligne);
  return { error: s.error ? { message: s.error.message, code: s.error.code } : null, titreFolio, banniere, perso, disposition };
}

/** La clé nue d'une pièce connue de ce type, sinon null. */
const nueConnue = (type: TypePiece, v: unknown): string | null => (typeof v === "string" && pieceNue(type, v) ? v : null);

/** Le nom lisible du titre porté (« Copiste », « Maître de Fixed Income ») ; aucun, ou inconnu : null. */
export const nomTitre = (nue: string | null | undefined): string | null => (nue ? (pieceNue("titre", nue)?.nom ?? null) : null);

/** `programme` : le nom court du programme d'origine (« CFA I »), null pour un titre global (V3 §1.6). */
export type TitrePortable = { nue: string; nom: string; description: string; programme: string | null };
/** Les titres que le joueur peut porter : ceux qu'il possède, et celui qu'il porte déjà (dans l'ordre du catalogue). */
export function titresPortables(a: Acquis, porte: string | null = null): TitrePortable[] {
  return piecesDuType("titre")
    .filter((p) => possede(p, a) || p.nue === porte)
    .map((p) => ({ nue: p.nue, nom: p.nom, description: p.description, programme: programmeCourt(p) }));
}

/** Un ornement tel que Personnaliser le propose (données simples : le composant ne charge pas le catalogue des pièces). */
export type OrnementChoix = {
  nue: string;
  nom: string;
  description: string;
  /** comment l'obtenir, en clair */
  obtention: string;
  /** l'avancée vers sa condition (« 2/5 »), quand elle se mesure et qu'il n'est pas encore à lui */
  avancee: string | null;
  rarete: Rarete;
  /** gagné, ou déjà porté (rien de gagné n'est repris) ; sinon grisé avec sa condition */
  possede: boolean;
};
/** Tous les ornements, dans l'ordre du catalogue : ceux qu'il possède (et celui qu'il porte déjà) sont ouverts, les autres grisés. */
export function ornementsPortables(a: Acquis, porte: string | null = null): OrnementChoix[] {
  return piecesDuType("ornement").map((p) => {
    const possedee = possede(p, a) || p.nue === porte;
    const c = p.condition;
    return { nue: p.nue, nom: p.nom, description: p.description, obtention: p.obtention, avancee: !possedee && c?.k === "sceaux" ? avanceePiece(c, a) : null, rarete: p.rarete, possede: possedee };
  });
}

/**
 * Le personnage, son cadrage, l'ornement et la bannière composée lus d'une
 * ligne de profile_style (ce que dessine la bannière verticale : profil, carte
 * joueur, podium ; pour dessiner, compositionDe de lib/profil/banniere.ts
 * choisit la composition enregistrée, sinon l'ancien personnage) ; colonnes
 * absentes (migration_bannieres_perso.sql, migration_bannieres_composees.sql
 * pas collées) ou valeurs étrangères : aucun personnage, taille 100, position
 * 50, le filet d'encre, pas de composition.
 */
export function banniereDepuis(row: Record<string, unknown> | null | undefined): StyleBanniere {
  return {
    perso: persoDepuis(row?.perso_url),
    persoTaille: bornerPersoTaille(row?.perso_taille),
    persoPos: bornerPersoPos(row?.perso_pos),
    ornement: nueConnue("ornement", row?.ornement) ?? STYLE_DEFAUT.ornement,
    banniere: compositionDepuis(row?.banniere),
  };
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
    ...banniereDepuis(row),
  };
}

/** Ce qu'il porte : le cadre, la bannière, le titre et le folio ; l'ornement et le personnage s'y ajoutent quand on les connaît. */
export type Porte = Pick<StyleProfil, "frame" | "banner" | "titre" | "folio"> & Partial<Pick<StyleProfil, "ornement" | "perso" | "persoTaille" | "persoPos" | "banniere">>;

/**
 * Ne garde que des valeurs connues et des pièces gagnées ou déjà portées (le
 * reste revient au défaut, et une pièce connue mais pas gagnée s'ajoute aux
 * refus). `prefixeImage` : l'adresse publique du dossier du joueur dans le
 * stockage ; une image ailleurs est refusée. `prefixesMedias` : de même pour
 * les images et la vidéo de la disposition (buckets profil-medias et
 * profil-videos). `porte` : ce qu'il porte aujourd'hui (portable même si la
 * condition ne l'est plus : un pic de Top 10 perdu garde son cadre). Titre,
 * folio, ornement et personnage absents de `input` : ceux qu'il porte,
 * inchangés. Le personnage vient du dossier du joueur dans profil-medias
 * (`prefixesMedias.images`), sous son nom exact ; une autre adresse est refusée.
 * La bannière composée : absente de `input`, celle qu'il porte (déjà validée à
 * son enregistrement) ; null, aucune ; un objet, validée strictement
 * (validerComposition : images de son dossier sous le nom exact de chaque
 * élément ou préréglages du site, badges gagnés ou déjà portés, statistiques
 * connues, nombres ramenés dans la scène).
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
  const ornement =
    input.ornement === undefined
      ? (nueConnue("ornement", porte?.ornement) ?? STYLE_DEFAUT.ornement)
      : (choisir("ornement", input.ornement, porte?.ornement, (nom) => `l'ornement ${nom}`) ?? STYLE_DEFAUT.ornement);
  // le personnage : un fichier de son dossier (ou celui qu'il porte déjà, que la base garde tel quel)
  const persoVoulu = input.perso === undefined ? (porte?.perso ?? null) : input.perso;
  const perso = persoValide(persoVoulu, prefixesMedias?.images ?? null) ?? (persoVoulu && persoVoulu === porte?.perso ? persoDepuis(persoVoulu) : null);
  if (persoVoulu && !perso) refus.push("l'image du personnage");
  // la bannière composée : celle qu'il porte, ou celle qu'il veut, validée dans son dossier avec ce qu'il a gagné
  let banniere: Composition | null = null;
  if (input.banniere === undefined) banniere = porte?.banniere ?? null;
  else if (input.banniere !== null) {
    const gagnes = new Set(badgesGagnes(a).map((b) => b.id));
    const v = validerComposition(input.banniere, { prefixe: prefixesMedias?.images ?? null, gagnes, porte: porte?.banniere ?? null });
    banniere = v.composition;
    refus.push(...v.refus);
  }
  const url = typeof input.bannerUrl === "string" ? input.bannerUrl.trim() : "";
  // après le dossier du joueur, un nom de fichier seul (« banniere-<ms>.<ext> ») : ni « .. » ni « %2e »
  const nomBanniere = url && prefixeImage && url.startsWith(prefixeImage) ? url.slice(prefixeImage.length) : "";
  const bannerUrl = /^[A-Za-z0-9_-]+[.][A-Za-z0-9]{2,5}$/.test(nomBanniere) && url.length <= 500 ? url : null;
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
      perso,
      banniere,
      persoTaille: bornerPersoTaille(input.persoTaille ?? porte?.persoTaille ?? STYLE_DEFAUT.persoTaille),
      persoPos: bornerPersoPos(input.persoPos ?? porte?.persoPos ?? STYLE_DEFAUT.persoPos),
      ornement,
    },
    refus,
  };
}
