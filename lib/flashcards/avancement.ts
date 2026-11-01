import { valider, type EtatBoucle } from "@/lib/flashcards/boucle";
import { boucleLocalePrime, cleLocale, cleMatiere, cleSet, majLigne, resumer, type LigneProgression } from "@/lib/flashcards/progression";

// Où en sont les flashcards, matière par matière (l'index « Le programme »
// de /flashcards) : combien de cartes déjà vues sur le total, et une pastille
// par paquet (maîtrisé, en cours, pas commencé). Module neutre (serveur et
// navigateur), testé par scripts/flashcards/test-avancement.tsx.
//
// D'où vient la donnée :
// - le compte (table flashcard_progress, lib/flashcards/progression.ts) : la
//   boucle de chaque paquet (« set:<id> ») et de la matière entière
//   (« matiere:<clé> »), lue par le serveur ;
// - l'appareil, après le montage : la même boucle gardée dans le navigateur
//   si elle est plus récente (boucleLocalePrime, comme les listes de paquets),
//   et la répétition espacée (lib/srs.ts) dont les paquets affichent déjà
//   leurs « vues ».
// Une carte est « vue » dès qu'elle a reçu une marque (« Je maîtrise » ou
// « À revoir »), quel que soit le tour : `premier` garde la première marque
// de chaque carte. Un paquet est « maîtrisé » quand sa boucle est bouclée sur
// toutes ses cartes d'aujourd'hui, « en cours » dès qu'une carte a été vue.

/** Cartes d'un paquet quand la base n'a pas donné le compte (4 paquets de 15 par matière). */
export const CARTES_PAR_PAQUET = 15;

export type StatutPaquet = "maitrise" | "cours" | "neuf";
/** Où en est une boucle : son statut et le nombre de cartes déjà vues (jamais au-delà du total). */
export type Avance = { statut: StatutPaquet; vues: number };

const NEUF: Avance = { statut: "neuf", vues: 0 };

/** Une boucle (null : jamais commencée, ou recommencée sans geste depuis → « neuf »). `total` : le nombre de cartes aujourd'hui. */
export function avanceBoucle(e: EtatBoucle | null | undefined, total?: number): Avance {
  if (!e) return NEUF;
  const r = resumer(e, total);
  if (!r) return NEUF;
  const vues = Object.keys(e.premier).length;
  return { statut: r.genre === "fini" ? "maitrise" : "cours", vues: total === undefined ? vues : Math.min(vues, total) };
}

/** Une ligne lue en base (état illisible : « neuf »). */
export function avanceLigne(ligne: LigneProgression | null | undefined, total?: number): Avance {
  return avanceBoucle(ligne ? valider(ligne.etat) : null, total);
}

// ---------------------------------------------------------------------------
// Ce que le serveur passe à la liste

/** Une boucle du compte, avec de quoi la relire sur l'appareil : sa clé locale, la version du compte (null sans ligne) et son nombre de cartes. */
export type SuiviBoucle = { local: string; maj: number | null; total: number; avance: Avance };

/** Une matière : ses paquets dans l'ordre, et la boucle de la matière entière. */
export type SuiviMatiere = { cle: string; nom: string; total: number; paquets: SuiviBoucle[]; matiere: SuiviBoucle };

/** Toutes les matières qui ont des paquets, par clé du programme, et le joueur (la boucle d'un autre compte du même navigateur est écartée). */
export type AvancesProgramme = { joueur: string; matieres: Record<string, SuiviMatiere> };

/** Les groupes de la liste /flashcards (components/ContentDetailHeader : BrowserGroup), réduits à ce qu'il faut ici. */
export type GroupeCartes = { key: string; name: string; rows: { id: string; kind: string; count: number | null }[] };

function suiviBoucle(cle: string, ligne: LigneProgression | null | undefined, total: number): SuiviBoucle {
  return { local: cleLocale(cle), maj: majLigne(ligne), total, avance: avanceLigne(ligne, total) };
}

/** Les clés de boucle à lire sur le compte pour ces groupes : chaque paquet et chaque matière qui en a. */
export function clesAvances(groupes: readonly GroupeCartes[]): string[] {
  const out: string[] = [];
  for (const g of groupes) {
    if (g.key.startsWith("x-")) continue;
    const sets = g.rows.filter((r) => r.kind === "set");
    if (sets.length) out.push(...sets.map((r) => cleSet(r.id)), cleMatiere(g.key));
  }
  return out;
}

/** L'avancement de chaque matière d'après les boucles lues sur le compte (celles de `clesAvances`). */
export function suiviProgramme(groupes: readonly GroupeCartes[], lignes: ReadonlyMap<string, LigneProgression>, joueur: string): AvancesProgramme {
  const matieres: Record<string, SuiviMatiere> = {};
  for (const g of groupes) {
    if (g.key.startsWith("x-")) continue;
    const paquets = g.rows.filter((r) => r.kind === "set").map((r) => suiviBoucle(cleSet(r.id), lignes.get(cleSet(r.id)), r.count ?? CARTES_PAR_PAQUET));
    const total = paquets.reduce((n, p) => n + p.total, 0);
    if (paquets.length === 0 || total === 0) continue;
    matieres[g.key] = { cle: g.key, nom: g.name, total, paquets, matiere: suiviBoucle(cleMatiere(g.key), lignes.get(cleMatiere(g.key)), total) };
  }
  return { joueur, matieres };
}

// ---------------------------------------------------------------------------
// Ce que la liste affiche

/** Ce que l'appareil sait : les boucles gardées (clé locale : id du paquet, ou « matiere:<clé> ») et la répétition espacée d'un paquet. */
export type LectureAppareil = {
  boucle: (local: string) => EtatBoucle | null;
  /** nombre de cartes du paquet déjà passées dans la répétition espacée (lib/srs.ts) */
  srs: (idPaquet: string) => number;
};

export type AvanceMatiere = { total: number; vues: number; paquets: StatutPaquet[] };

/** La boucle de l'appareil si elle l'emporte sur la version du compte, sinon ce que dit le compte. */
function avanceVue(s: SuiviBoucle, joueur: string, lecture?: LectureAppareil): Avance {
  const mien = lecture ? boucleLocalePrime(lecture.boucle(s.local), { maj: s.maj, joueur }) : null;
  return mien ? avanceBoucle(mien, s.total) : s.avance;
}

/**
 * L'avancement d'une matière. Sans `lecture` : le compte seul (rendu du
 * serveur). Avec : l'appareil s'y ajoute — par paquet, le plus grand des
 * cartes vues de sa boucle et de la répétition espacée ; pour la matière, le
 * plus grand de la somme des paquets et de la boucle « toute la matière »
 * (elle marque les cartes de plusieurs paquets d'un coup). Une boucle de
 * matière bouclée sur toutes les cartes maîtrise tous ses paquets.
 */
export function avanceMatiere(s: SuiviMatiere, joueur: string, lecture?: LectureAppareil): AvanceMatiere {
  const paquets = s.paquets.map((p) => {
    const a = avanceVue(p, joueur, lecture);
    const srs = lecture ? Math.min(p.total, Math.max(0, lecture.srs(p.local))) : 0;
    const vues = Math.max(a.vues, srs);
    return { statut: a.statut === "neuf" && vues > 0 ? ("cours" as const) : a.statut, vues };
  });
  const m = avanceVue(s.matiere, joueur, lecture);
  const somme = paquets.reduce((n, p) => n + p.vues, 0);
  return {
    total: s.total,
    vues: Math.min(s.total, Math.max(somme, m.vues)),
    paquets: paquets.map((p) => (m.statut === "maitrise" ? "maitrise" : p.statut)),
  };
}

/** Combien de paquets dans chaque statut. */
export function compterStatuts(statuts: readonly StatutPaquet[]): Record<StatutPaquet, number> {
  const n: Record<StatutPaquet, number> = { maitrise: 0, cours: 0, neuf: 0 };
  for (const s of statuts) n[s]++;
  return n;
}
