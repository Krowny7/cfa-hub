// « En ce moment dans le lobby » et le personnage du vainqueur : les calculs
// purs de la carte (sans base, sans horloge cachée : l'instant est un argument).
// La lecture (lecture-direct.ts) rassemble des faits bruts, partagés par tous
// les joueurs ; ce module en tire ce que CE joueur voit : les copies dans
// l'heure, les quatre faits les plus récents (les siens à la deuxième personne,
// ceux des joueurs qui masquent leur présence retirés), les trois chiffres, les
// petits visages des joueurs en ligne (toi d'abord, tes amis, les autres) et le
// cadrage du personnage de la bannière du vainqueur.

import { agoLabel } from "@/components/accueil/format";
import { initials } from "@/components/classement/format";
import { hauteurCalque, type Composition } from "@/lib/profil/banniere";
import { bornerPersoPos, bornerPersoTaille } from "@/lib/profil/perso";
import { nombre } from "@/lib/voice";
import { DIRECT, type GenreFait } from "@/lib/voice-accueil-lobby-direct";
import type { EnDirectLobby, EvenementLobby, JoueurLobby, PersoVainqueur } from "./types";

// ── Les faits bruts (ce que la lecture met en cache, 60 s, pour tout le monde) ──

/** Une copie rendue à un défi du jour (les 30 ou les 5), telle que le classement la montre. */
export type CopieBrute = { userId: string; nom: string; score: number; total: number; finishedAt: string; format: "trente" | "cinq" };
/** Un duel gagné : le gagnant et l'instant du règlement. */
export type VictoireBrute = { userId: string; nom: string; finishedAt: string };
/** Un joueur en ligne, tel que la lecture l'a vu : son identifiant, son pseudo et sa photo de profil (null : aucune). */
export type JoueurBrut = { id: string; nom: string; avatarUrl: string | null };
/** Tout ce que la lecture rapporte, sans rien de propre au joueur qui regarde. */
export type DirectBrut = {
  /** joueurs en ligne (présence montrée, signal de moins de 2 min 30) ; null : non lu (pas d'accès admin, table absente) */
  enLigne: number | null;
  /** duels acceptés, pas encore réglés ni expirés ; null : non lu */
  duels: number | null;
  copies: CopieBrute[];
  victoires: VictoireBrute[];
  /** parmi les joueurs des faits les plus récents, ceux qui masquent leur présence (Moi › Réglages) */
  masques: string[];
  /** les joueurs en ligne qu'on a pu nommer (les plus récents d'abord, JOUEURS_LUS au plus) ; absent : non lus */
  joueurs?: JoueurBrut[];
};

/** « Dans l'heure » : strictement moins d'une heure. */
export const FENETRE_MS = 60 * 60 * 1000;
/** Une heure de fin un peu dans le futur (horloge de la base en avance) compte pour « à l'instant », au-delà non. */
export const DERIVE_MS = 5 * 60 * 1000;
/** Le fil montre quatre faits au plus. */
export const EVENEMENTS_MAX = 4;
/** Combien de faits récents la lecture vérifie côté présence (de quoi en garder quatre si quelques-uns se masquent). */
export const CANDIDATS_MAX = 16;
/** Combien de joueurs en ligne la lecture nomme au plus (de quoi trouver ses amis parmi eux). */
export const JOUEURS_LUS = 40;
/** La rangée des visages en montre huit au plus, toi compris ; le reste se dit « +N ». */
export const JOUEURS_MAX = 8;

/** L'instant d'une date ISO, en ms ; null si elle est illisible. */
function instantDe(iso: string): number | null {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/** Un fait de cet instant est-il « dans l'heure » ? (bords : 59 min 59 s oui, 60 min non) */
export function dansLHeure(iso: string, maintenant: number): boolean {
  const t = instantDe(iso);
  if (t === null) return false;
  const age = maintenant - t;
  return age >= -DERIVE_MS && age < FENETRE_MS;
}

/** Le prénom d'un pseudo (« Marie L. » → « Marie ») ; le pseudo en un mot et « Joueur a1b2c3d4 » restent entiers. */
export function prenomDe(nom: string): string {
  const n = nom.trim();
  if (!n) return DIRECT.inconnu;
  if (n.startsWith("Joueur ")) return n;
  return n.split(" ")[0] || DIRECT.inconnu;
}

// ── Les faits récents ──

/** Un fait candidat au fil : le plus récent de chaque joueur. */
export type Candidat = { cle: string; userId: string; nom: string; t: number; genre: GenreFait; score: string };

/**
 * Les faits de la dernière heure, du plus récent au plus ancien, un seul par
 * joueur (le plus récent : le fil ne se remplit pas d'une même personne), au
 * plus `max`. À égalité d'instant, l'ordre est celui des clés (stable).
 */
export function candidatsDe(brut: Pick<DirectBrut, "copies" | "victoires">, maintenant: number, max = CANDIDATS_MAX): Candidat[] {
  const tous: Candidat[] = [];
  for (const c of brut.copies) {
    const t = dansLHeure(c.finishedAt, maintenant) ? instantDe(c.finishedAt) : null;
    if (t === null) continue;
    tous.push({ cle: `${c.format}-${c.userId}-${t}`, userId: c.userId, nom: c.nom, t, genre: c.format, score: `${c.score}/${c.total}` });
  }
  for (const v of brut.victoires) {
    const t = dansLHeure(v.finishedAt, maintenant) ? instantDe(v.finishedAt) : null;
    if (t === null) continue;
    tous.push({ cle: `duel-${v.userId}-${t}`, userId: v.userId, nom: v.nom, t, genre: "duel", score: "" });
  }
  tous.sort((a, b) => b.t - a.t || (a.cle < b.cle ? -1 : a.cle > b.cle ? 1 : 0));
  const vus = new Set<string>();
  const uniques: Candidat[] = [];
  for (const c of tous) {
    if (vus.has(c.userId)) continue;
    vus.add(c.userId);
    uniques.push(c);
  }
  return uniques.slice(0, max);
}

/**
 * Les quatre faits du fil. Un joueur qui masque sa présence n'y figure pas
 * (« les autres ne voient alors plus rien ») ; toi, tu t'y vois toujours, à la
 * deuxième personne. Pastille sombre : un fait d'armes (copie des 30, duel
 * gagné) ; claire : les 5 du jour.
 */
export function evenementsDe(brut: DirectBrut, maintenant: number, moiId: string): EvenementLobby[] {
  const masques = new Set(brut.masques);
  return candidatsDe(brut, maintenant)
    .filter((c) => c.userId === moiId || !masques.has(c.userId))
    .slice(0, EVENEMENTS_MAX)
    .map((c): EvenementLobby => {
      const toi = c.userId === moiId;
      return {
        cle: c.cle,
        initiales: initials(c.nom),
        sombre: c.genre !== "cinq",
        texte: DIRECT.fait(c.genre, prenomDe(c.nom), toi, c.score),
        quand: agoLabel(new Date(c.t).toISOString(), maintenant),
      };
    });
}

// ── Les joueurs en ligne ──

/** Ce que CE joueur apporte à la carte : son pseudo et sa photo (le contexte ne les donne pas) et ses amis. */
export type RegardDirect = {
  moi?: { nom: string | null; avatarUrl: string | null };
  /** les identifiants de ses amis : ceux qui sont en ligne passent devant les autres */
  amis?: Iterable<string>;
};

/**
 * Les petits visages de la carte et le vrai nombre de joueurs en ligne. Toi,
 * tu es en ligne par définition : tu ouvres toujours la rangée (« Toi »), même
 * si ta présence est masquée, pas encore comptée ou illisible, et le compte te
 * rajoute quand la liste lue (complète) ne te contient pas. Viennent ensuite
 * tes amis en ligne, puis les autres, chacun dans l'ordre de la lecture (les
 * plus récents d'abord) ; huit visages au plus, le reste se compte dans `plus`.
 * `enLigne` reste null quand le compte n'a pas pu être lu.
 */
export function joueursDe(brut: Pick<DirectBrut, "enLigne" | "joueurs">, moiId: string, regard: RegardDirect = {}): { enLigne: number | null; joueurs: JoueurLobby[]; plus: number } {
  const lus = brut.joueurs ?? [];
  const amis = new Set(regard.amis ?? []);
  // te rajouter au compte seulement si la liste lue est complète et ne te contient pas (sinon on ne sait pas)
  const moiLu = lus.some((j) => j.id === moiId);
  const complete = brut.enLigne !== null && lus.length >= brut.enLigne;
  const enLigne = brut.enLigne === null ? null : Math.max(1, brut.enLigne + (!moiLu && complete ? 1 : 0));

  const vus = new Set<string>([moiId]);
  const autres: JoueurBrut[] = [];
  for (const j of lus) {
    if (!j.id || vus.has(j.id)) continue;
    vus.add(j.id);
    autres.push(j);
  }
  const tries = [...autres.filter((j) => amis.has(j.id)), ...autres.filter((j) => !amis.has(j.id))];

  const nomMoi = regard.moi?.nom?.trim() || DIRECT.toi;
  const toi: JoueurLobby = { id: moiId, nom: nomMoi, prenom: DIRECT.toi, initiales: initials(nomMoi), avatarUrl: photoDe(regard.moi?.avatarUrl), moi: true, ami: false };
  const joueurs = [
    toi,
    ...tries.slice(0, JOUEURS_MAX - 1).map(
      (j): JoueurLobby => ({ id: j.id, nom: j.nom, prenom: prenomDe(j.nom), initiales: initials(j.nom), avatarUrl: photoDe(j.avatarUrl), moi: false, ami: amis.has(j.id) }),
    ),
  ];
  return { enLigne, joueurs, plus: enLigne === null ? 0 : Math.max(0, enLigne - joueurs.length) };
}

/**
 * La carte, pour ce joueur. null quand il n'y a rien à montrer : aucun chiffre
 * au-dessus de zéro et aucun fait récent (une carte de zéros ne donne pas
 * envie de venir). Le compte des joueurs en ligne, une fois lu, n'est jamais
 * nul : tu en fais partie (voir joueursDe).
 */
export function directDe(brut: DirectBrut, maintenant: number, moiId: string, regard: RegardDirect = {}): EnDirectLobby | null {
  const copiesHeure = brut.copies.filter((c) => c.format === "trente" && dansLHeure(c.finishedAt, maintenant)).length;
  const evenements = evenementsDe(brut, maintenant, moiId);
  const { enLigne, joueurs, plus } = joueursDe(brut, moiId, regard);
  if ((enLigne ?? 0) <= 0 && (brut.duels ?? 0) <= 0 && copiesHeure === 0 && evenements.length === 0) return null;
  return { enLigne, duels: brut.duels, copiesHeure, evenements, joueurs, plus };
}

/** Un chiffre de la colonne de gauche : sa clé, sa valeur (nombre à l'espace insécable), son libellé. */
export type ChiffreDirect = { cle: "enLigne" | "duels" | "copies"; val: string; lib: string };

/**
 * Les chiffres à montrer : les joueurs en ligne et les duels quand ils sont lus
 * (sans accès admin ils sont null : les lignes disparaissent), les copies des
 * 30 dès qu'il y en a ou dès qu'un autre chiffre est là (trois lignes, jamais
 * deux qui laissent croire que le troisième est caché).
 */
export function chiffresDe(d: Pick<EnDirectLobby, "enLigne" | "duels" | "copiesHeure">): ChiffreDirect[] {
  const out: ChiffreDirect[] = [];
  if (d.enLigne !== null) out.push({ cle: "enLigne", val: nombre(d.enLigne), lib: DIRECT.enLigne(d.enLigne) });
  if (d.duels !== null) out.push({ cle: "duels", val: nombre(d.duels), lib: DIRECT.duels(d.duels) });
  if (d.copiesHeure > 0 || out.length > 0) out.push({ cle: "copies", val: nombre(d.copiesHeure), lib: DIRECT.copies(d.copiesHeure) });
  return out;
}

// ── Le personnage du vainqueur ──

/** Dans la bannière du lobby (large et basse), le personnage garde un cadrage modeste : il sort par le haut, il ne mange pas la rangée voisine. */
export const PERSO_TAILLE = { min: 70, max: 115 } as const;
export const PERSO_POS = { min: 35, max: 65 } as const;

const entre = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/** Une adresse qu'on peut mettre dans un <img> sans crainte : du site ou d'un stockage en https. */
const adresseSure = (v: unknown): v is string => typeof v === "string" && (v.startsWith("https://") || v.startsWith("http://") || (v.startsWith("/") && !v.startsWith("//")));

/** La photo de profil d'un joueur, pour un <img> : son adresse si elle est sûre, sinon null (ses initiales). */
export const photoDe = (v: unknown): string | null => (adresseSure(v) ? v : null);

/** Ce que la carte lit du style d'un joueur (podiumDe, lib/profil/styles.ts : banniereDepuis). */
export type StylePerso = { perso?: string | null; persoTaille?: number; persoPos?: number; banniere?: Composition | null };

/**
 * Le personnage de la bannière du joueur, pour la bannière du vainqueur :
 * celui de sa bannière composée (calque « perso »), sinon l'ancien personnage
 * de son profil (perso_url, avec sa taille et sa position). Taille et position
 * suivent la bannière verticale (taille en % de la base, 100 par défaut ;
 * position de 0 remonté à 100 descendu, 50 posé), ramenées dans les bornes de
 * la carte. null : pas de personnage (ou aucune adresse sûre).
 */
export function persoDe(style: StylePerso | null | undefined): PersoVainqueur | null {
  if (!style) return null;
  const calque = style.banniere?.perso;
  if (calque && adresseSure(calque.image)) {
    // l'inverse de compositionDepuisAncien (lib/profil/banniere.ts) : le décalage vertical du calque, en pos
    const h = hauteurCalque(calque);
    const pos = h > 0 ? 50 + (200 * (calque.y - (100 - h))) / h : 50;
    return {
      src: calque.image,
      taille: Math.round(entre(Number.isFinite(calque.l) ? calque.l : 100, PERSO_TAILLE.min, PERSO_TAILLE.max)),
      pos: Math.round(entre(Number.isFinite(pos) ? pos : 50, PERSO_POS.min, PERSO_POS.max)),
    };
  }
  if (adresseSure(style.perso)) {
    return {
      src: style.perso,
      taille: Math.round(entre(bornerPersoTaille(style.persoTaille), PERSO_TAILLE.min, PERSO_TAILLE.max)),
      pos: Math.round(entre(bornerPersoPos(style.persoPos), PERSO_POS.min, PERSO_POS.max)),
    };
  }
  return null;
}
