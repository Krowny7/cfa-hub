// « Récupérer » (Codex simplifié) : une quête remplie attend le clic du
// joueur, qui verse vraiment son XP et rend sa pièce portable
// (codex_recuperer, migration_codex_v3.sql §9). Ce module dit ce qui attend,
// ce qui est fait aujourd'hui, quelles fêtes jouer au clic, et les mots de
// l'écran. Module neutre (serveur et navigateur).
//
// Deux cas, sans changement à l'écran :
//  - à verser : la ligne est « terminee » (la base a différé sa récompense) ;
//    le clic verse l'XP (codex_recuperer) ;
//  - déjà versée (repli, §9 pas collée) : une ligne « recompensee » pas encore
//    vue (vu faux) qui rapporte quelque chose ; le clic joue le tampon et les
//    fêtes, puis la marque vue (codex_vus). La barre de niveau ne bouge pas.
// Le mode sobre (« versées d'office ») n'attend que ce qui reste à verser.
// Rien n'expire : une récompense attend sans fin et garde sa date.

import { tailleFete, type FeteCodex } from "@/lib/codex/bilan";
import type { LigneProgression } from "@/lib/codex/moteur";
import type { Famille } from "@/lib/codex/types";

/** Une quête faite qui attend « Récupérer ». */
export type ARecuperer = {
  quete: string;
  periode: string;
  titre: string;
  famille: Famille | "acte";
  /** l'XP versée au clic (déjà plafonnée) ; déjà versée : celle d'alors */
  xp: number;
  /** vrai : l'XP n'est pas encore versée (ligne « terminee ») ; faux : déjà versée, le clic en accuse réception */
  aVerser: boolean;
  /** le jour de Paris où elle a été faite (AAAA-MM-JJ) ; null : inconnu */
  le: string | null;
  /** « Cadre : Sfumato », « Titre : Apprenti » ; null : rien que de l'XP */
  recompense: string | null;
  /** la pièce gagnée (cosmétique ou titre, clé de PIECES) : sa fête se joue au clic */
  piece: string | null;
};

/** Les quêtes récompensées aujourd'hui (jour de Paris) : « Fait aujourd'hui : 4 · +230 XP ». */
export type FaitAujourdhui = { n: number; xp: number; quetes: { quete: string; periode: string; titre: string; xp: number }[] };

export const FAIT_VIDE: FaitAujourdhui = { n: 0, xp: 0, quetes: [] };

/** Au plus tant de quêtes récupérées d'un clic (codex_recuperer en prend 200). */
export const MAX_RECUPERER = 200;
/** Les lignes montrées dans le bloc ; le reste se dit « et N autres ». */
export const LIGNES_MONTREES = 3;
/** Le décalage du tampon d'une ligne à la suivante (ms). */
export const DECALAGE_TAMPON_MS = 100;
/** Le compte de l'XP (ms). */
export const COMPTE_XP_MS = 500;
/** Le geste entier, tampon et compte compris, avant les grandes fêtes (ms). */
export const GESTE_MS = 1500;

const JOUR_PARIS = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" });

/** Le jour de Paris d'un horodatage (AAAA-MM-JJ) ; null : illisible. */
export function jourDe(horodatage: string | null | undefined): string | null {
  if (!horodatage) return null;
  const t = Date.parse(horodatage);
  return Number.isFinite(t) ? JOUR_PARIS.format(new Date(t)) : null;
}

/** La clé d'une quête dans le temps. */
export const cleRecuperer = (x: { quete: string; periode: string }) => `${x.quete}|${x.periode}`;

/** Ce que la vue sait d'une quête pour la dire : son titre, et le nom lisible d'une pièce (« Cadre : Sfumato »). */
export type Noms = { titre: (id: string) => string | null; recompense: (cle: string | null) => string | null };

/** Une ligne rapporte-t-elle quelque chose (XP, pièce ou titre) ? */
const rapporte = (l: Pick<LigneProgression, "xp" | "cosmetique" | "titre">) => (Number(l.xp) || 0) > 0 || !!l.cosmetique || !!l.titre;

/**
 * Ce qui attend « Récupérer », les plus récentes d'abord : les lignes
 * « terminee » (à verser) ; et, hors mode sobre, les lignes « recompensee »
 * pas encore vues, non rétroactives, qui rapportent quelque chose (déjà
 * versées : le repli sans la §9). Les sceaux du profil ont leur cérémonie ;
 * `ignorer` : les miroirs (comptés avec leur quête payeuse).
 */
export function aRecupererDe(lignes: LigneProgression[], o: Noms & { sobre: boolean; ignorer?: (id: string) => boolean }): ARecuperer[] {
  const out: (ARecuperer & { t: number })[] = [];
  for (const l of lignes) {
    const aVerser = l.etat === "terminee";
    const accuse = !o.sobre && l.etat === "recompensee" && !l.vu && !l.retro && rapporte(l) && !l.quete_id.startsWith("exploit:sceau:");
    if (!(aVerser || accuse) || o.ignorer?.(l.quete_id)) continue;
    const piece = l.cosmetique ?? l.titre ?? null;
    out.push({
      quete: l.quete_id,
      periode: l.periode,
      titre: o.titre(l.quete_id) ?? TEXTES_RECUPERER.sansTitre,
      famille: familleDe(l.quete_id),
      xp: Math.max(0, Number(l.xp) || 0),
      aVerser,
      le: jourDe(l.terminee_le),
      recompense: o.recompense(l.cosmetique) ?? o.recompense(l.titre),
      piece,
      t: Date.parse(l.terminee_le ?? "") || 0,
    });
  }
  return out.sort((a, b) => b.t - a.t || a.quete.localeCompare(b.quete)).map(({ t: _t, ...x }) => x);
}

/**
 * Les quêtes récompensées aujourd'hui (jour de Paris), sans le rétroactif
 * (le rattrapage a sa cérémonie), ni les miroirs, ni ce qui attend encore
 * « Récupérer » (`attente` : leurs clés).
 */
export function faitAujourdhuiDe(lignes: LigneProgression[], jour: string, o: { titre: Noms["titre"]; attente: Set<string>; ignorer?: (id: string) => boolean }): FaitAujourdhui {
  const quetes = lignes
    .filter((l) => l.etat === "recompensee" && !l.retro && jourDe(l.recompensee_le) === jour && !o.attente.has(cleRecuperer({ quete: l.quete_id, periode: l.periode })) && !o.ignorer?.(l.quete_id))
    .sort((a, b) => (Date.parse(b.recompensee_le ?? "") || 0) - (Date.parse(a.recompensee_le ?? "") || 0))
    .map((l) => ({ quete: l.quete_id, periode: l.periode, titre: o.titre(l.quete_id) ?? TEXTES_RECUPERER.sansTitre, xp: Math.max(0, Number(l.xp) || 0) }));
  return { n: quetes.length, xp: quetes.reduce((s, q) => s + q.xp, 0), quetes };
}

/** La famille d'une quête, lue sur son identifiant (« acte:cfa-l2/acte3 », « branche:fsa:maitre », « cfa-l2/contrat:… »). */
export function familleDe(id: string): ARecuperer["famille"] {
  if (id.startsWith("acte:")) return "acte";
  const local = id.includes("/") ? id.slice(id.indexOf("/") + 1) : id;
  const f = local.split(":")[0];
  return (["trame", "branche", "longcours", "contrat", "exploit", "fil"] as const).find((x) => x === f) ?? "trame";
}

const NOMS_TYPE: Record<string, string> = { titre: "Titre", banniere: "Bannière", cadre: "Cadre", folio: "Folio" };
/** « Cadre : Sfumato » : le nom lisible d'une pièce ou d'un titre gagné. */
export const nomRecompense = (c: { type: string; nom: string }) => `${NOMS_TYPE[c.type] ?? "Pièce"} : ${c.nom}`;

/**
 * Le titre d'une quête qui n'est plus dans l'évaluation du jour : un contrat
 * d'un autre jour ou d'une autre semaine, le bonus des trois quêtes du jour.
 */
export function titreHorsVue(id: string): string | null {
  const local = id.includes("/") ? id.slice(id.indexOf("/") + 1) : id;
  if (local.startsWith("contrat:trio:")) return "Les 3 quêtes du jour";
  if (local.startsWith("contrat:hebdo:")) return "Quête de la semaine";
  if (local.startsWith("contrat:")) return "Quête du jour";
  return null;
}

/** Le « Fait aujourd'hui » une fois ces quêtes récupérées : elles passent en tête. */
export function faitApres(fait: FaitAujourdhui, recues: ARecuperer[], xpVersee: number): FaitAujourdhui {
  const deja = new Set(fait.quetes.map(cleRecuperer));
  const nouvelles = recues.filter((x) => !deja.has(cleRecuperer(x))).map((x) => ({ quete: x.quete, periode: x.periode, titre: x.titre, xp: x.xp }));
  const xpAccuse = recues.filter((x) => !x.aVerser).reduce((s, x) => s + x.xp, 0);
  return { n: fait.n + nouvelles.length, xp: fait.xp + xpVersee + xpAccuse, quetes: [...nouvelles, ...fait.quetes] };
}

/** L'XP que le bouton annonce : celle qui reste à verser (déjà versée, rien à annoncer). */
export const xpAVerser = (items: ARecuperer[]) => items.reduce((s, x) => s + (x.aVerser ? x.xp : 0), 0);

const RANG: Record<ARecuperer["famille"], number> = { acte: 0, exploit: 2, longcours: 2, fil: 2, branche: 3, trame: 3, contrat: 4 };

/** La fête d'une quête récupérée (même forme que celles du bilan). */
export function feteDe(x: ARecuperer): FeteCodex {
  const local = familleDe(x.quete) === "branche" && x.quete.endsWith(":maitre");
  return { quete: x.quete, periode: x.periode, titre: x.titre, famille: x.famille, xp: x.xp, recompense: x.recompense, piece: x.piece, rang: local ? 1 : RANG[x.famille] };
}

/**
 * Les grandes fêtes jouées au clic, une par une : un acte clos, « Maître
 * de… » (page, plein cadre) ou une pièce gagnée. Le reste n'a que le tampon
 * sur sa ligne. En mode sobre : aucune (sans animation).
 */
export function grandesFetes(items: ARecuperer[], sobre: boolean): FeteCodex[] {
  if (sobre) return [];
  return items
    .map(feteDe)
    .filter((f) => {
      const t = tailleFete(f);
      return t === "page" || t === "plein" || !!f.piece;
    })
    .sort((a, b) => a.rang - b.rang || b.xp - a.xp);
}

const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const JOURS_COURTS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

/**
 * La date d'une récompense qui attend : rien pour aujourd'hui, « d'hier »,
 * sinon « mar. 14 oct. ». Sans Intl : le serveur et le navigateur écrivent
 * la même chose.
 */
export function dateRecuperer(le: string | null, jour: string): string | null {
  if (!le || le >= jour) return null;
  const [a, m, j] = le.split("-").map(Number);
  const t = Date.UTC(a, m - 1, j);
  const [a2, m2, j2] = jour.split("-").map(Number);
  if (Date.UTC(a2, m2 - 1, j2) - t === 86_400_000) return "d'hier";
  return `${JOURS_COURTS[new Date(t).getUTCDay()]} ${j === 1 ? "1er" : j} ${MOIS_COURTS[m - 1]}`;
}

const xp = (n: number) => `+${n.toLocaleString("fr-FR")} XP`;

/** Les mots de « Récupérer ». */
export const TEXTES_RECUPERER = {
  titre: (n: number) => `À récupérer · ${n}`,
  /** le bouton plein du bloc */
  tout: (n: number) => (n > 0 ? `Tout récupérer · ${xp(n)}` : "Tout récupérer"),
  /** le bouton d'une seule quête, et celui de la ligne en fin d'outil */
  un: (n: number) => (n > 0 ? `Récupérer ${xp(n)}` : "Récupérer"),
  /** déjà versé (repli sans la §9) */
  dejaVerse: "Déjà versé",
  voir: "Voir ce que tu as gagné",
  autres: (n: number) => `et ${n} autre${n > 1 ? "s" : ""}`,
  /** la ligne de fin d'outil : « 2 quêtes à récupérer » */
  ligne: (n: number) => `${n} quête${n > 1 ? "s" : ""} à récupérer`,
  enCours: "Récupération…",
  echec: "Pas pu récupérer. Réessaie dans un instant.",
  fait: (f: Pick<FaitAujourdhui, "n" | "xp">, sobre = false) => `Fait aujourd'hui : ${f.n}${f.xp > 0 && !sobre ? ` · ${xp(f.xp)}` : ""}`,
  suite: (titre: string) => `La suite : ${titre}`,
  sansTitre: "Une quête du Codex",
};
