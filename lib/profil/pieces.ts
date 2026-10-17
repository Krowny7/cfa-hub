// Les pièces de collection : un modèle unique pour tout ce qui se porte sur
// le profil (cadres, bannières, titres, folios), d'où que cela vienne : les
// cadres et motifs du profil, les cosmétiques et les titres du Codex, les
// trophées, le fil rouge, les programmes menés. Une pièce a une clé unique
// « <type>:<nue> » ; profile_style stocke la clé nue. Pas d'inventaire : une
// pièce se possède parce que sa condition est remplie (lib/profil/acquis.ts).
// Rien ne s'achète, rien ne se tire au sort, une pièce portée ne se reprend pas.
// Module neutre (client et serveur).

import { TIERS } from "@/lib/ranks";
import { CADRES, MOTIFS } from "@/lib/profil/catalogue";
import { idFil, remplie, type Acquis, type Condition, type ConditionProfil } from "@/lib/profil/acquis";
import { ACTES, COSMETIQUES_CODEX, PROGRAMME, catalogueCodex, contenuDuProgramme, titresMaitres } from "@/lib/codex/catalogue";
import { programmeDe } from "@/lib/codex/programmes";
import { donneurs } from "@/lib/codex/vue";
import { romain } from "@/lib/voice-codex";
import { enigmeClaire, titreActe, titreClair, titreClairDe } from "@/lib/codex/titres-clairs";
import { conditionPiece } from "@/lib/voice-profil";

export { dateGagnee, remplie, type Acquis, type Condition } from "@/lib/profil/acquis";

export type TypePiece = "cadre" | "banniere" | "titre" | "folio";
export type Rarete = "commune" | "rare" | "precieuse" | "legendaire";
export type OriginePiece = "libre" | "questions" | "rang" | "sceau" | "codex" | "trophee" | "fil" | "programme";

export type Piece = {
  /** clé unique « <type>:<nue> » : « cadre:liquide-diamant », « titre:maitre:fsa », « folio:mains » */
  cle: string;
  type: TypePiece;
  /** ce que stocke profile_style (frame, banner, titre, folio) : la clé sans le type */
  nue: string;
  nom: string;
  /** une ligne : ce que c'est */
  description: string;
  /** une ligne : comment l'obtenir (sous la silhouette) */
  obtention: string;
  rarete: Rarete;
  origine: OriginePiece;
  /** null : libre */
  condition: Condition | null;
  /** elle bouge ; « css » = animation légère du lot B6 ; les autres = rendus existants */
  anime?: "css" | "liquide" | "aura" | "dorure" | "vivant";
  /** programme d'origine (titres reportés), « global » sinon */
  programme: string;
  folio?: { image: string | null; anecdote: [string, string]; provisoire: boolean; oeuvre: string };
  ordre: number;
};

export const TYPES_PIECE: TypePiece[] = ["cadre", "banniere", "titre", "folio"];
/** Le programme des pièces qui n'en viennent d'aucun (même valeur que PROGRAMME_GLOBAL du Codex, lib/codex/programmes.ts). */
const PROGRAMME_GLOBAL = "global";

/** « cadre:sanguine » → « sanguine » ; « titre:maitre:fsa » → « maitre:fsa ». */
export const cleNue = (cle: string): string => (cle.includes(":") ? cle.slice(cle.indexOf(":") + 1) : cle);
const estTypePiece = (t: unknown): t is TypePiece => typeof t === "string" && (TYPES_PIECE as string[]).includes(t);
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ── Raretés ────────────────────────────────────────────────────────────
// commune : libre ou ≤ 500 questions ; rare : sceau encre, pic Or ou
// Platine, quête de branche, 1 diamant ; précieuse : vermillon, acte clos,
// sommet de chaîne, 10 diamants ; légendaire : dorure, Grand Maître, Maître
// de bottega, exploit caché, programme mené. À l'écran : un liseré de la
// couleur de la rareté, rien d'autre.

/** La rareté d'une pièce du profil, d'après sa condition. */
function rareteProfil(c: ConditionProfil | null): Rarete {
  if (!c) return "commune";
  switch (c.k) {
    case "questions":
      return c.n <= 500 ? "commune" : c.n <= 2500 ? "rare" : c.n <= 5000 ? "precieuse" : "legendaire";
    case "pic":
      // index dans TIERS : 2 Or, 3 Platine, 4 Diamant, 5 Maître, 6 Grand Maître, 7 Top 10
      return c.palier <= 3 ? "rare" : c.palier <= 5 ? "precieuse" : "legendaire";
    case "sceau":
      return c.palier >= 3 ? "legendaire" : c.palier === 2 ? "precieuse" : "rare";
    case "dorures":
      return "legendaire";
  }
}

const origineProfil = (c: ConditionProfil | null): OriginePiece => (!c ? "libre" : c.k === "questions" ? "questions" : c.k === "pic" ? "rang" : "sceau");
/** « 1 000 questions posées », « Atteindre le palier Diamant une fois », « Sceau Assiduité · vermillon ». */
const obtentionProfil = (c: ConditionProfil | null): string =>
  !c ? "Libre" : c.k === "pic" ? `Atteindre le palier ${TIERS[c.palier]?.name ?? c.palier} une fois` : majuscule(conditionPiece(c));

// ── Les quêtes du Codex qui donnent une pièce ──────────────────────────
const CONTENU = contenuDuProgramme();
const QUETES = catalogueCodex(CONTENU);
/**
 * cosmétique → quêtes (ou « acte:<id> ») qui le donnent : la quête retirée
 * qui le donnait, et celle qui le donne aujourd'hui (V3 §8.1)
 */
const DONNEURS = donneurs(CONTENU, QUETES);
/** La quête qui donne la pièce aujourd'hui (une non retirée d'abord) : elle dit l'obtention, la rareté, le programme. */
const donneurPrincipal = (ids: string[] | undefined): string | undefined => ids?.find((id) => !QUETES.find((q) => q.id === id)?.retiree) ?? ids?.[0];

/**
 * La consigne d'un palier du fil rouge, en clair : « Fil rouge : Répondre à
 * 10 000 questions » (le seuil lu dans CHAPITRES_FIL, lib/codex/fil-rouge.ts,
 * par titres-clairs) ; un chapitre inconnu : son numéro de palier.
 */
const obtentionFil = (chapitre: string, n: number) => {
  const t = titreClairDe({ id: `fil:${chapitre}:${n}`, titre: "", famille: "fil" });
  return t ? `Fil rouge : ${t}` : `Fil rouge, palier ${n}`;
};
const FIL_ID = /^fil:([a-z0-9-]+):([1-9][0-9]*)$/;

/**
 * Comment s'obtient une pièce du Codex, en clair (Codex simplifié) : la
 * consigne de la quête qui la donne (« Quête du Codex : FSA à 60 % de
 * maîtrise »), l'acte à finir (« Finir l'acte IV : Premier examen blanc »),
 * l'énigme lisible d'un exploit ; un exploit caché ne se dévoile pas.
 */
function obtentionCodex(quete: string): string {
  const acte = ACTES.find((a) => `acte:${a.id}` === quete);
  if (acte) {
    const titre = titreActe(acte);
    return acte.numero === 0 ? `Finir le prologue : ${titre}` : acte.numero === 99 ? `Finir l'épilogue : ${titre}` : `Finir l'acte ${romain(acte.numero)} : ${titre}`;
  }
  const palier = FIL_ID.exec(quete);
  if (palier) return obtentionFil(palier[1], Number(palier[2]));
  const q = QUETES.find((x) => x.id === quete);
  if (!q) return "Une quête du Codex";
  if (q.visibilite === "cachee") return "Un exploit caché du Codex";
  if (q.famille === "exploit") {
    const enigme = enigmeClaire(q);
    return enigme ? `Exploit « ${q.titre} » : ${enigme}` : `Exploit « ${q.titre} » du Codex`;
  }
  return `Quête du Codex : ${titreClair(q)}`;
}

/** La rareté d'une pièce du Codex, d'après la quête qui la donne. */
function rareteCodex(cle: string, quete: string): Rarete {
  if (cle === "titre:maitre-bottega") return "legendaire";
  if (quete === "acte:prologue") return "commune";
  if (quete.startsWith("acte:") || FIL_ID.test(quete)) return "precieuse";
  const q = QUETES.find((x) => x.id === quete);
  if (q?.famille === "exploit") return q.visibilite === "cachee" ? "legendaire" : "precieuse";
  // sommet d'une chaîne au long cours ; une quête de branche (ou autre) : rare
  return q?.famille === "longcours" ? "precieuse" : "rare";
}

/** Le nom court du programme d'origine (« CFA I »), affiché après le nom (V3 §1.6) ; global ou inconnu : null. */
export function programmeCourt(p: Pick<Piece, "programme">): string | null {
  return p.programme === PROGRAMME_GLOBAL ? null : (programmeDe(p.programme)?.court ?? null);
}

/** Le programme d'origine d'un titre gagné au Codex (les exploits et le fil rouge sont globaux). */
function programmeCodex(type: TypePiece, quete: string): string {
  if (type !== "titre" || FIL_ID.test(quete)) return PROGRAMME_GLOBAL;
  if (quete.startsWith("acte:")) return PROGRAMME;
  const q = QUETES.find((x) => x.id === quete);
  return !q || q.famille === "exploit" ? PROGRAMME_GLOBAL : q.programme;
}

// ── Pièces déclarées ici : trophées, fil rouge, programme ──────────────
type Declaree = Omit<Piece, "type" | "nue" | "ordre" | "programme">;
const trophees = (palier: 1 | 2 | 3 | 4, n: number, sources?: number): Condition => ({ k: "trophees", palier, n, ...(sources ? { sources } : {}) });
const fil = (chapitre: string, palier: number): Condition => ({ k: "fil", chapitre, palier });
const unDe = (...conditions: Condition[]): Condition => ({ k: "unDe", conditions });

const DECLAREES: Declaree[] = [
  { cle: "cadre:diamant-taille", nom: "Diamant taillé", description: "Six facettes qui scintillent tour à tour autour du sceau.", obtention: "Un trophée diamant", rarete: "rare", origine: "trophee", condition: unDe(trophees(4, 1), fil("trophees", 3)), anime: "css" },
  { cle: "banniere:salle-trophees", nom: "La salle des trophées", description: "Des éclats d'or qui montent lentement sur le papier.", obtention: "Dix trophées d'or ou mieux", rarete: "precieuse", origine: "trophee", condition: unDe(trophees(3, 10), fil("trophees", 5)), anime: "css" },
  { cle: "titre:collectionneur", nom: "Collectionneur", description: "A rangé dix diamants dans sa salle des trophées.", obtention: "Dix trophées diamant", rarete: "precieuse", origine: "trophee", condition: unDe(trophees(4, 10), fil("trophees", 4)) },
  { cle: "cadre:vitrine-or", nom: "Vitrine d'or", description: "Un reflet doré qui fait le tour du sceau.", obtention: "Un trophée d'or dans quatre sources différentes", rarete: "legendaire", origine: "trophee", condition: trophees(3, 1, 4), anime: "css" },
  { cle: "cadre:plume", nom: "Plume", description: "Une plume qui glisse le long du cadre.", obtention: obtentionFil("encre", 3), rarete: "rare", origine: "fil", condition: fil("encre", 3), anime: "css" },
  { cle: "titre:copiste", nom: "Copiste", description: "Dix mille questions posées, à la main.", obtention: obtentionFil("questions", 4), rarete: "precieuse", origine: "fil", condition: fil("questions", 4) },
  { cle: "titre:encre-vie", nom: "Encre de toute une vie", description: "Trois cents jours d'encre au compteur.", obtention: obtentionFil("encre", 6), rarete: "legendaire", origine: "fil", condition: fil("encre", 6) },
  { cle: "titre:entretien", nom: "La main gardée", description: "A gardé la main douze semaines après l'examen.", obtention: obtentionFil("entretien", 2), rarete: "precieuse", origine: "fil", condition: fil("entretien", 2) },
  { cle: "banniere:route-milan", nom: "La route de Milan", description: "Une route au trait qui se dessine jusqu'à Milan.", obtention: "Mener le CFA Niveau I à son terme", rarete: "legendaire", origine: "programme", condition: { k: "programme", programme: PROGRAMME }, anime: "css" },
];

// ── Folios : un dessin de Léonard par acte clos et par « Maître de… » ──
// Chacun a son anecdote : deux lignes sobres et vérifiables, sans date
// inventée (les sources : docs/codex/FOLIOS.md). L'image vient de
// public/folios/<nue>.webp quand elle y est (FOLIOS_ILLUSTRES) ; d'ici là,
// une carte « papier » avec le nom de l'œuvre à la plume, jamais d'image cassée.
export const FOLIOS: { nue: string; quete: string; oeuvre: string; anecdote: [string, string] }[] = [
  { nue: "mains", quete: "acte:acte1", oeuvre: "Étude de mains", anecdote: ["Pointe d'argent rehaussée de blanc, sur papier préparé.", "On la rapproche du portrait de Ginevra de' Benci, dont le bas a été coupé."] },
  { nue: "draperie", quete: "acte:acte2", oeuvre: "Étude de draperie", anecdote: ["Peinte au pinceau, en gris et en blanc, sur une toile de lin.", "Vasari raconte qu'il drapait des modèles d'argile d'étoffes trempées dans la terre."] },
  { nue: "codex-leicester", quete: "acte:acte3", oeuvre: "Une page du Codex Leicester", anecdote: ["Un carnet sur l'eau, la Lune et les fossiles, écrit de droite à gauche.", "C'est le seul grand carnet de Léonard resté entre des mains privées."] },
  { nue: "adoration", quete: "acte:acte4", oeuvre: "Étude pour l'Adoration des Mages", anecdote: ["Une étude de perspective pour le fond du tableau : escaliers, arcades, cavaliers.", "Le tableau, commandé par les moines de San Donato a Scopeto, est resté inachevé."] },
  { nue: "chevaux", quete: "acte:acte5", oeuvre: "Études de chevaux", anecdote: ["Des études pour le cheval de bronze promis aux Sforza, à Milan.", "Le bronze qui lui était réservé finit fondu en canons : le cheval ne fut jamais coulé."] },
  { nue: "autoportrait", quete: "acte:acte6", oeuvre: "Autoportrait à la sanguine", anecdote: ["Une sanguine conservée à la Biblioteca Reale de Turin, rarement montrée.", "On discute encore pour savoir si c'est bien Léonard qui s'y est dessiné."] },
  { nue: "deluge", quete: "acte:epilogue", oeuvre: "Le Déluge", anecdote: ["Une série de dessins à la pierre noire, faite dans ses dernières années.", "L'eau et le vent y emportent tout, en tourbillons qui se répondent."] },
  { nue: "vieillard", quete: "branche:ethics:maitre", oeuvre: "Profil de vieillard", anecdote: ["Léonard dessinait volontiers les visages marqués, de profil.", "Vasari dit qu'il suivait parfois toute une journée un passant dont la tête l'intriguait."] },
  { nue: "polyedres", quete: "branche:quant:maitre", oeuvre: "Polyèdres dessinés pour la Divina proportione", anecdote: ["Les solides du traité de Luca Pacioli, son ami mathématicien.", "Léonard les dessine pleins puis évidés, pour qu'on voie au travers."] },
  { nue: "moulin", quete: "branche:economics:maitre", oeuvre: "Étude de moulin", anecdote: ["Roues, engrenages et chutes d'eau : Léonard cherchait comment l'eau travaille.", "Beaucoup de ses machines sont réunies dans le Codex Atlanticus, à Milan."] },
  { nue: "tourbillons", quete: "branche:fsa:maitre", oeuvre: "Études de tourbillons d'eau", anecdote: ["L'eau qui contourne un obstacle, observée trait par trait.", "Dans ses notes, il compare ces tourbillons aux boucles d'une chevelure."] },
  { nue: "pont", quete: "branche:corporate:maitre", oeuvre: "Projet de pont", anecdote: ["Un pont d'une seule arche, proposé au sultan Bayezid II pour la Corne d'Or.", "Il ne fut pas bâti ; une version réduite existe aujourd'hui en Norvège."] },
  { nue: "chats", quete: "branche:equity:maitre", oeuvre: "Études de chats", anecdote: ["Des chats qui dorment, se lèchent, se battent, sur une même feuille.", "En cherchant bien, on y trouve aussi un petit dragon."] },
  { nue: "arbalete", quete: "branche:fixed_income:maitre", oeuvre: "L'arbalète géante", anecdote: ["Une arbalète de plus de vingt mètres d'envergure, montée sur six roues.", "Elle ne fut jamais construite : Léonard se présentait aussi en ingénieur militaire."] },
  { nue: "vis-aerienne", quete: "branche:derivatives:maitre", oeuvre: "La vis aérienne", anecdote: ["Une vis de lin amidonné qui devait s'élever en tournant dans l'air.", "On la cite souvent comme une lointaine aïeule de l'hélicoptère."] },
  { nue: "char", quete: "branche:alternatives:maitre", oeuvre: "Le char d'assaut", anecdote: ["Un char couvert comme une carapace de tortue, armé tout autour.", "Huit hommes devaient le faire avancer à la manivelle, de l'intérieur."] },
  { nue: "ornithoptere", quete: "branche:portfolio:maitre", oeuvre: "L'ornithoptère", anecdote: ["Une machine à ailes battantes, mue par la seule force d'un homme.", "Léonard a rempli un carnet entier sur le vol des oiseaux, aujourd'hui à Turin."] },
  { nue: "galerie", quete: "fil:maitres:2", oeuvre: "Études de proportions", anecdote: ["Léonard mesurait les corps pour en trouver les rapports, comme Vitruve avant lui.", "Son Homme de Vitruve est conservé à Venise, aux Gallerie dell'Accademia."] },
  { nue: "cabinet", quete: "fil:collection:3", oeuvre: "Feuille d'études diverses", anecdote: ["Sur une même feuille : une machine, un visage, une note, un calcul.", "Il écrivait de droite à gauche, en miroir, et passait d'un sujet à l'autre."] },
];
/** Les folios dont l'image est dans public/folios (<nue>.webp, 600 × 800) : les autres restent provisoires. */
export const FOLIOS_ILLUSTRES: string[] = [];
/** L'image d'un folio, si elle est là. */
export const imageFolio = (nue: string): string | null => (FOLIOS_ILLUSTRES.includes(nue) ? `/folios/${nue}.webp` : null);

// ── L'assemblage ───────────────────────────────────────────────────────
/** La condition couvre déjà la quête (la même quête, ou le même palier du fil rouge). */
function couvre(c: Condition, quete: string): boolean {
  if (c.k === "codex") return c.quete === quete;
  if (c.k === "fil") return idFil(c.chapitre, c.palier) === quete;
  return c.k === "unDe" && c.conditions.some((x) => couvre(x, quete));
}
/** Une quête du Codex récompensée, l'une des quêtes qui donnent la pièce (une retirée garde ce qu'elle a donné). */
const conditionCodex = (ids: string[]): Condition => (ids.length === 1 ? { k: "codex", quete: ids[0] } : unDe(...ids.map((quete): Condition => ({ k: "codex", quete }))));
/** La condition, ou elle OU les quêtes du Codex qui donnent aussi la pièce. */
const ouQuete = (c: Condition, quetes: string[] | undefined): Condition => {
  const manquent = (quetes ?? []).filter((q) => !couvre(c, q));
  return !manquent.length ? c : unDe(...(c.k === "unDe" ? c.conditions : [c]), ...manquent.map((quete): Condition => ({ k: "codex", quete })));
};

function assembler(): Piece[] {
  const out: Piece[] = [];
  const ordre: Record<TypePiece, number> = { cadre: 0, banniere: 0, titre: 0, folio: 0 };
  const ajouter = (p: Omit<Piece, "type" | "nue" | "ordre">) => {
    const type = p.cle.slice(0, p.cle.indexOf(":")) as TypePiece;
    out.push({ ...p, type, nue: cleNue(p.cle), ordre: ordre[type]++ });
  };

  // 1. les cadres du profil
  for (const c of CADRES) {
    const description =
      c.key === "aucun"
        ? "Le sceau seul, sans cadre."
        : c.key === "pinceau"
          ? "Un trait de pinceau autour du sceau."
          : c.anime === "liquide"
            ? `Le liquide marbré du palier ${TIERS[c.palier ?? 0].name}, qui ondule autour du sceau.`
            : c.anime === "aura"
              ? "L'aura électrique du Grand Maître, qui crépite autour du sceau."
              : c.anime === "dorure"
                ? "Un reflet d'or qui court sur le cadre."
                : `Un cadre de métal aux couleurs du palier ${c.nom}.`;
    ajouter({ cle: `cadre:${c.key}`, nom: c.nom, description, obtention: obtentionProfil(c.condition), rarete: rareteProfil(c.condition), origine: origineProfil(c.condition), condition: c.condition, ...(c.anime ? { anime: c.anime } : {}), programme: PROGRAMME_GLOBAL });
  }
  // 2. les motifs de bannière
  for (const m of MOTIFS) {
    const condition = m.condition ?? null;
    const description = m.anime ? "Un motif vivant, qui bouge doucement sur la bannière." : "Un motif fixe, sous ton image ou seul.";
    ajouter({ cle: `banniere:${m.key}`, nom: m.nom, description, obtention: obtentionProfil(condition), rarete: rareteProfil(condition), origine: origineProfil(condition), condition, ...(m.anime ? { anime: "vivant" as const } : {}), programme: PROGRAMME_GLOBAL });
  }

  // 3. les pièces du Codex (celles déclarées ici aussi gardent leur fiche, aux points 4 et 5)
  const declarees = new Set([...DECLAREES.map((d) => d.cle), ...FOLIOS.map((f) => `folio:${f.nue}`)]);
  const codex = new Map<string, { nom: string; description: string }>();
  for (const c of [...COSMETIQUES_CODEX, ...titresMaitres(CONTENU)]) {
    const type: unknown = c.type;
    if (!estTypePiece(type) || !c.cle.startsWith(`${type}:`)) continue; // type inconnu : ignoré
    codex.set(c.cle, { nom: c.nom, description: c.description });
    const ids = DONNEURS.get(c.cle);
    const quete = donneurPrincipal(ids);
    // déclarée ici : traitée plus bas ; qu'aucune quête ne donne : rien ne l'ouvre, elle n'est pas montrée
    if (declarees.has(c.cle) || !ids || !quete) continue;
    ajouter({
      cle: c.cle,
      nom: c.nom,
      description: c.description,
      obtention: obtentionCodex(quete),
      rarete: rareteCodex(c.cle, quete),
      origine: "codex",
      condition: conditionCodex(ids),
      ...(c.anime ? { anime: "css" as const } : {}),
      programme: programmeCodex(type, quete),
    });
  }

  // 4. trophées, fil rouge, programme : la fiche d'ici ; la quête du Codex qui la donne aussi, en « ou »
  for (const d of DECLAREES) ajouter({ ...d, condition: d.condition && ouQuete(d.condition, DONNEURS.get(d.cle)), programme: PROGRAMME_GLOBAL });

  // 5. les folios : nom et description du Codex s'il les déclare, rareté et obtention d'ici
  for (const f of FOLIOS) {
    const cle = `folio:${f.nue}`;
    const duCodex = codex.get(cle);
    ajouter({
      cle,
      nom: duCodex?.nom ?? f.oeuvre,
      description: duCodex?.description ?? "Un dessin de Léonard, à poser sur ton profil.",
      obtention: obtentionCodex(f.quete),
      rarete: rareteCodex(cle, f.quete),
      origine: FIL_ID.test(f.quete) ? "fil" : "codex",
      condition: { k: "codex", quete: f.quete },
      programme: PROGRAMME_GLOBAL,
      folio: { image: imageFolio(f.nue), anecdote: f.anecdote, provisoire: !imageFolio(f.nue), oeuvre: f.oeuvre },
    });
  }
  return out;
}

/** Toutes les pièces, assemblées une fois, dans l'ordre d'affichage de chaque type. */
export const PIECES: Piece[] = assembler();

const PAR_CLE = new Map<string, Piece>();
for (const p of PIECES) if (!PAR_CLE.has(p.cle)) PAR_CLE.set(p.cle, p);

export const pieceDe = (cle: string): Piece | null => PAR_CLE.get(cle) ?? null;
export const pieceNue = (type: TypePiece, nue: string): Piece | null => PAR_CLE.get(`${type}:${nue}`) ?? null;
export const piecesDuType = (t: TypePiece): Piece[] => PIECES.filter((p) => p.type === t);
/** Le joueur possède la pièce (sa condition est remplie ; libre : toujours). */
export const possede = (p: Piece, a: Acquis): boolean => remplie(p.condition, a);

/** Les quêtes du Codex (ou « acte:<id> », « fil:<c>:<n> ») que nomme une condition, dans l'ordre. */
const quetesDe = (c: Condition | null): string[] =>
  !c ? [] : c.k === "codex" ? [c.quete] : c.k === "fil" ? [idFil(c.chapitre, c.palier)] : c.k === "unDe" ? c.conditions.flatMap(quetesDe) : [];

/**
 * La quête du Codex où aller chercher la pièce (« Y aller » de l'étagère) :
 * celle qui la donne aujourd'hui (une non retirée), sinon la première que
 * nomme sa condition ; aucune (questions, rang, sceaux, trophées) : null.
 */
export function queteDe(p: Piece): string | null {
  const ids = quetesDe(p.condition);
  if (!ids.length) return null;
  return donneurPrincipal(DONNEURS.get(p.cle)?.filter((id) => ids.includes(id))) ?? ids.find((id) => !QUETES.find((q) => q.id === id)?.retiree) ?? null;
}
