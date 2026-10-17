// Le Codex : le segment « Tout le Codex » de /codex et le détail d'une quête
// (Codex simplifié, §2, §3.3, §3.4 et §3.6). Ce qu'ils montrent, calculé ici
// une fois : les quatre états d'une ligne, le résumé d'une ligne de chaque
// repli (Parcours, Matières, Objectifs longs, Exploits), l'ordre de leurs
// lignes, la quête montrée d'office dans le détail sur ordinateur, et les
// lignes du détail allégé (sur-titre, avancée, récompense, durée honnête,
// « Plus »). Module neutre et LÉGER : des types seulement, pour que l'écran
// n'en charge pas le poids dans le navigateur.

import type { VueCap } from "@/lib/codex/cap";
import type { Famille } from "@/lib/codex/types";
import type { LigneQuete, VueActe, VueBranche, VueChaine, VueCodex } from "@/lib/codex/vue";

export const TEXTES_TOUT = {
  parcours: "Parcours",
  matieres: "Matières",
  objectifs: "Objectifs longs",
  exploits: "Exploits",
  trouves: (n: number) => `Trouvés (${n})`,
  semaine: "Ta semaine",
  carte: "Voir la carte",
  retourCarte: "Tout le Codex",
  but: (b: string) => `But : ${b}`,
  autresFaites: (n: number) => (n === 1 ? "et 1 autre faite" : `et ${n} autres faites`),
  matieresFinies: (n: number) => (n === 1 ? "et 1 matière menée au bout" : `et ${n} matières menées au bout`),
  rien: "Rien ici pour l'instant.",
  detailVide: "Touche une quête pour voir son détail.",
  facultative: "Facultative",
  facultatives: (n: number) => (n === 1 ? "1 facultative" : `${n} facultatives`),
  pourquoi: "Pourquoi",
  plus: "Plus",
  manque: "Ce qui manque",
  recuperer: (xp: number) => (xp > 0 ? `Récupérer +${xp.toLocaleString("fr-FR")} XP` : "Récupérer"),
  aller: "Y aller",
  changer: "Changer cette quête",
  plusieursSemaines: "sur plusieurs semaines",
  jusquaDimanche: "jusqu'à dimanche",
  minutes: (m: number) => `≈ ${m} min`,
  apresExamen: "Pour après l'examen : d'ici là, elle ne te sera pas proposée. Elle compte quand même si tu y arrives.",
} as const;

// ── Les quatre états ───────────────────────────────────────────────────

/** Les quatre états d'une quête, partout : à faire (une verrouillée aussi), en cours, à récupérer, faite. */
export type EtatClair = "afaire" | "encours" | "recuperer" | "faite";

export function etatClair(l: Pick<LigneQuete, "etat" | "aRecuperer">): EtatClair {
  if (l.aRecuperer) return "recuperer";
  if (l.etat === "terminee") return "faite";
  return l.etat === "active" ? "encours" : "afaire";
}

const jourCourt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });

/** « À faire », « En cours », « À récupérer », « Faite le 12 oct. » (« Faite » sans date). */
export function libelleEtat(l: Pick<LigneQuete, "etat" | "aRecuperer" | "termineeLe">): string {
  const e = etatClair(l);
  if (e === "faite") return l.termineeLe ? `Faite le ${jourCourt(l.termineeLe)}` : "Faite";
  return e === "recuperer" ? "À récupérer" : e === "encours" ? "En cours" : "À faire";
}

// ── Les replis de « Tout le Codex » ────────────────────────────────────

const visibles = (l: LigneQuete[]) => l.filter((q) => q.affichage !== "cache");
/** La quête d'où l'on part : la première entamée, sinon la première ouverte, sinon la première pas faite. */
export const prochaineDe = (l: LigneQuete[]): LigneQuete | null =>
  visibles(l).find((q) => q.etat === "active") ?? visibles(l).find((q) => q.etat === "disponible") ?? visibles(l).find((q) => q.etat !== "terminee") ?? null;

/** La visite (acte I) : des outils facultatifs à côté du tronc, pas l'acte à suivre. */
const estVisite = (a: VueActe) => a.acte.numero === 1 && a.quetes.length > 0 && a.quetes.every((q) => q.optionnelle);

/**
 * Un acte compté : ses étapes faites sur celles qui le closent (le compte du
 * moteur, `faites` et `total`), et ses étapes facultatives à part. Un acte
 * clos par n étapes au choix (la visite : 4 outils sur 7) n'en a pas « à part ».
 */
export function compteActe(a: Pick<VueActe, "acte" | "faites" | "total" | "quetes">): { faites: number; total: number; facultatives: number } {
  const facultatives = a.acte.closAvec ? 0 : visibles(a.quetes).filter((q) => q.optionnelle).length;
  return { faites: a.faites, total: a.total, facultatives };
}

/** « 4 sur 5 », « 1 sur 5 + 2 facultatives ». */
export function avanceeActe(a: VueActe): string {
  const c = compteActe(a);
  return `${c.faites} sur ${c.total}${c.facultatives ? ` + ${TEXTES_TOUT.facultatives(c.facultatives)}` : ""}`;
}

/** Les actes du parcours, dans l'ordre (la visite comprise, à sa place) : ceux qui ont une étape à montrer. */
export const actesParcours = (trame: VueActe[]): VueActe[] => trame.filter((a) => visibles(a.quetes).length > 0);

/** La ligne « À récupérer » d'une quête (vue.aRecuperer) ; null : rien n'attend pour elle. */
export const aRecupererDe = <T extends { quete: string; periode: string }>(items: T[], l: Pick<LigneQuete, "id" | "periode">): T | null => items.find((x) => x.quete === l.id && x.periode === l.periode) ?? null;

/** Toutes les quêtes que l'écran peut montrer (pour retrouver une quête ouverte dans une vue nouvelle). */
export function lignesDeLaVue(v: Pick<VueCodex, "trame" | "branches" | "longCours" | "exploits" | "contrats" | "hebdo" | "debrief" | "filRouge">): LigneQuete[] {
  return [
    ...v.trame.flatMap((a) => a.quetes),
    ...v.branches.flatMap((b) => b.etapes),
    ...v.longCours.flatMap((c) => c.paliers),
    ...v.exploits,
    ...v.contrats.map((c) => c.ligne),
    ...v.hebdo,
    ...(v.debrief ? [v.debrief] : []),
    ...v.filRouge.chapitres.flatMap((c) => [c.courant, c.suivant].filter((x): x is LigneQuete => !!x)),
  ];
}

/** La même quête dans une vue nouvelle (même id, même période) ; null : elle n'y est plus. */
export const retrouver = (v: Parameters<typeof lignesDeLaVue>[0], l: Pick<LigneQuete, "id" | "periode">): LigneQuete | null => lignesDeLaVue(v).find((x) => x.id === l.id && x.periode === l.periode) ?? null;

/** « · Acte II · 4 sur 5 » : l'acte en cours ; null : aucun (le parcours est fini). */
export function resumeParcours(trame: VueActe[], etiquette: (a: VueActe["acte"]) => string): string | null {
  const a = trame.find((x) => x.courant && !estVisite(x));
  return a ? `· ${etiquette(a.acte)} · ${avanceeActe(a)}` : null;
}

/** Les étapes d'un acte à montrer : celles à faire d'abord ; les faites, au plus `faites`, le reste compté. */
export function etapesMontrees(a: VueActe, faites = 2): { lignes: LigneQuete[]; autres: number } {
  const v = visibles(a.quetes);
  const ouvertes = v.filter((q) => q.etat !== "terminee");
  const closes = v.filter((q) => q.etat === "terminee");
  const montrees = ouvertes.length ? closes.slice(-faites) : closes;
  return { lignes: [...ouvertes, ...montrees], autres: closes.length - montrees.length };
}

/** Le seuil de maîtrise que vise l'étape suivante d'une matière (60 puis 75 %) ; 0 : plus rien à gagner. */
function seuilVise(etape: LigneQuete | null, pct: number | null): number {
  if (etape?.etape === "maitrise60") return 60;
  if (etape?.etape === "maitrise75") return 75;
  const p = pct ?? 0;
  return p < 60 ? 60 : p < 75 ? 75 : 0;
}

export type LigneMatiere = { b: VueBranche; etape: LigneQuete; gain: number };

/**
 * Les matières : une ligne par matière avec son étape suivante, triées par ce
 * qu'elles font gagner en préparation (poids × points à gagner jusqu'au seuil
 * visé, au dixième). Une matière menée au bout n'a plus de ligne.
 */
export function matieresTout(branches: VueBranche[], cap: Pick<VueCap, "matieres"> | null): LigneMatiere[] {
  const total = (cap?.matieres ?? []).reduce((s, m) => s + m.poids, 0);
  const out: (LigneMatiere & { i: number })[] = [];
  branches.forEach((b, i) => {
    const etape = prochaineDe(b.etapes);
    if (!etape) return;
    const m = cap?.matieres.find((x) => x.cle === b.contenu.key);
    const seuil = seuilVise(etape, m?.pct ?? null);
    const gain = m && total > 0 ? Math.round(((m.poids / total) * Math.max(0, seuil - (m.pct ?? 0))) * 10) / 10 : 0;
    out.push({ b, etape, gain, i });
  });
  return out.sort((x, y) => y.gain - x.gain || x.i - y.i).map(({ i: _i, ...x }) => x);
}

/** « +1,2 pt » : le gain de préparation d'une matière ; null : rien à gagner. */
export const texteGain = (gain: number): string | null => (gain > 0 ? `+${gain.toLocaleString("fr-FR")} pt` : null);

/** « · 2 validées sur 10 » : les matières dont on est « Maître ». */
export function resumeMatieres(branches: VueBranche[]): string {
  const n = branches.filter((b) => b.maitre).length;
  return `· ${n} ${n > 1 ? "validées" : "validée"} sur ${branches.length}`;
}

/** Les matières menées au bout (plus aucune étape à faire) : elles n'ont plus de ligne. */
export const matieresFinies = (branches: VueBranche[]): number => branches.filter((b) => !prochaineDe(b.etapes)).length;

export type LigneObjectif = { ligne: LigneQuete; sous: string };

/**
 * Les objectifs longs : une ligne par chaîne, avec seulement son étape en
 * cours (« étape 2 sur 5 »), de la plus proche de la fin à la plus
 * lointaine ; le fil rouge en dernier (« Fil rouge · Le métier »).
 */
export function objectifsLongs(chaines: VueChaine[], fil: VueCodex["filRouge"]): LigneObjectif[] {
  const enCours = chaines
    .map((ch, i) => ({ ch, i }))
    .filter((x) => !!x.ch.courant && x.ch.courant.affichage !== "cache")
    .sort((a, b) => b.ch.courant!.fraction - a.ch.courant!.fraction || a.i - b.i)
    .map(({ ch }) => ({ ligne: ch.courant!, sous: `étape ${Math.min(ch.faits + 1, ch.paliers.length)} sur ${ch.paliers.length}` }));
  const fils = fil.chapitres.filter((c) => !!c.courant).map((c) => ({ ligne: c.courant!, sous: `Fil rouge · ${c.titre}` }));
  return [...enCours, ...fils];
}

/** « · 11 en cours » : les chaînes qui ont une étape en cours (le fil rouge à part). */
export const resumeObjectifs = (chaines: VueChaine[]): string => `· ${chaines.filter((c) => !!c.courant).length} en cours`;

/** Les exploits : d'abord ceux à récupérer, puis ceux à trouver, puis les trouvés (repliés). Jamais un caché. */
export function exploitsTout(exploits: LigneQuete[]): { aRecuperer: LigneQuete[]; aTrouver: LigneQuete[]; trouves: LigneQuete[] } {
  const v = visibles(exploits);
  return {
    aRecuperer: v.filter((q) => q.aRecuperer),
    aTrouver: v.filter((q) => q.etat !== "terminee"),
    trouves: v.filter((q) => q.etat === "terminee" && !q.aRecuperer),
  };
}

/** « · 5 sur 17 » : les exploits trouvés (récupérés ou non), sur tous ceux qui se voient. */
export const resumeExploits = (exploits: LigneQuete[]): string => `· ${visibles(exploits).filter((q) => q.etat === "terminee").length} sur ${visibles(exploits).length}`;

/** Ce qu'une énigme laisse lire sous le nom d'un exploit : son indice, sinon sa consigne. */
export const texteExploit = (l: Pick<LigneQuete, "indice" | "consigne" | "affichage" | "etat">): string => (l.affichage === "indice" && l.etat !== "terminee" ? (l.indice ?? l.consigne) : l.consigne);

/**
 * La quête montrée d'office dans le détail, sur ordinateur : la première à
 * récupérer, sinon la première en cours, sinon la première à faire, dans
 * l'ordre de l'écran.
 */
export function queteParDefaut(lignes: LigneQuete[]): LigneQuete | null {
  return lignes.find((l) => l.aRecuperer) ?? lignes.find((l) => l.etat === "active") ?? lignes.find((l) => l.etat === "disponible") ?? null;
}

// ── Le détail allégé (§3.6) ────────────────────────────────────────────

const FAMILLES: Record<Famille, string> = { trame: "Parcours", branche: "Matière", longcours: "Objectif long", contrat: "Quête du jour", exploit: "Exploit", fil: "Fil rouge" };

/** Le sur-titre : famille · matière (deux informations au plus). `semaine` : une quête de la semaine. */
export function surTitre(l: Pick<LigneQuete, "famille">, o: { matiere?: string; semaine?: boolean } = {}): string {
  const f = l.famille === "contrat" && o.semaine ? "Quête de la semaine" : FAMILLES[l.famille];
  return o.matiere ? `${f} · ${o.matiere}` : f;
}

const n = (x: number) => Math.floor(x).toLocaleString("fr-FR");

/** L'avancée du détail : « 51 sur 60 » et « Il manque : 9 » ; à faire baisser : « 120, à passer sous 50 ». Null : rien à mesurer. */
export function avanceeDetail(l: Pick<LigneQuete, "etat" | "valeur" | "cible" | "baisse" | "affichage">): { texte: string; manque: string | null } | null {
  if (l.etat === "terminee" || (l.affichage === "indice") || l.cible <= 1) return null;
  if (l.baisse) return { texte: `${n(l.baisse.actuel)}, à passer sous ${n(l.baisse.seuil)}`, manque: null };
  const reste = Math.max(0, Math.ceil(l.cible - l.valeur));
  return { texte: `${n(l.valeur)} sur ${n(l.cible)}`, manque: reste > 0 ? `Il manque : ${reste.toLocaleString("fr-FR")}` : null };
}

/** La récompense sur une ligne : « +40 XP · Cadre : Sfumato ». Le mode sobre ne la dit pas. */
export function recompenseDetail(l: Pick<LigneQuete, "xp" | "xpVersee" | "etat" | "titreGagne" | "titreNom" | "cosmetique" | "cosmetiqueNom" | "folio" | "folioNom">, sobre: boolean): string | null {
  if (sobre) return null;
  const xp = l.etat === "terminee" && l.xpVersee !== null ? l.xpVersee : l.xp;
  const parts = [
    xp > 0 ? `+${xp.toLocaleString("fr-FR")} XP` : null,
    l.titreGagne ? `Titre : ${l.titreNom ?? l.titreGagne}` : null,
    l.cosmetique ? (l.cosmetiqueNom ?? l.cosmetique) : null,
    l.folio ? `Folio : ${l.folioNom ?? l.folio}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Les étapes d'une matière qui se comptent en semaines : la maîtrise ne monte pas en une séance. */
const LONGUES = new Set(["maitrise60", "maitrise75", "maitre", "tour", "carte"]);

/**
 * La durée honnête : « ≈ 10 min » seulement si la quête peut se finir
 * aujourd'hui ; sinon « jusqu'à dimanche » (une quête de la semaine) ou
 * « sur plusieurs semaines ». Null : faite, à récupérer, ou rien à dire.
 */
export function dureeDetail(l: Pick<LigneQuete, "etat" | "aRecuperer" | "famille" | "etape" | "duree" | "destination" | "affichage">, o: { semaine?: boolean } = {}): string | null {
  if (l.etat === "terminee" || l.aRecuperer || l.affichage === "indice") return null;
  if (o.semaine) return TEXTES_TOUT.jusquaDimanche;
  if (l.famille === "longcours" || l.famille === "fil" || (l.etape && LONGUES.has(l.etape))) return TEXTES_TOUT.plusieursSemaines;
  const m = l.destination?.duree ?? l.duree;
  return m ? TEXTES_TOUT.minutes(m) : null;
}

const jourLong = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

/**
 * « Plus ▸ » : la chaîne ou la matière et la place de l'étape (« Matière FSA ·
 * étape 3 sur 6 »), « comptée avec », les dates. Vide : pas de repli.
 */
export function plusDetail(l: LigneQuete, vue: Pick<VueCodex, "longCours" | "branches" | "trame">): string[] {
  const out: string[] = [];
  const ch = l.chaine ? vue.longCours.find((c) => c.chaine.id === l.chaine) : undefined;
  if (ch) {
    const i = ch.paliers.findIndex((p) => p.id === l.id);
    if (i >= 0) out.push(`${ch.chaine.titre} · étape ${i + 1} sur ${ch.paliers.length}`);
  }
  const b = l.famille === "branche" && l.matiere ? vue.branches.find((x) => x.contenu.key === l.matiere) : undefined;
  if (b) {
    const v = visibles(b.etapes);
    const i = v.findIndex((p) => p.id === l.id);
    if (i >= 0) out.push(`Matière ${b.contenu.court} · étape ${i + 1} sur ${v.length}`);
  }
  const a = l.famille === "trame" ? vue.trame.find((x) => x.quetes.some((q) => q.id === l.id)) : undefined;
  if (a) out.push(`${a.acte.titre} · ${avanceeActe(a)}`);
  if (l.compteeAvec) out.push(`Comptée avec « ${l.compteeAvec.titre} » : une seule récompense pour les deux.`);
  if (l.etat === "terminee" && l.termineeLe) out.push(l.retro ? `Déjà acquise avant le ${jourLong(l.termineeLe)}` : `Faite le ${jourLong(l.termineeLe)}`);
  return out;
}
