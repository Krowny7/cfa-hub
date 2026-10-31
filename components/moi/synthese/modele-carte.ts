import { MIN_REPONSES } from "@/lib/points-faibles";
import { SEUIL_ACQUIS, SEUIL_BAS, infoMatiere, ton, valeurMatiere } from "@/components/moi/synthese/modele";
import type { EtatNotion, MatiereSynthese, NotionSynthese, Zone } from "@/components/moi/synthese/types";
import { NBSP } from "@/lib/voice";
import { CARTE } from "@/lib/voice-moi-carte";

// Le calcul de la « Carte du programme » (page Moi « La synthèse »), pur et sans
// hook : une rangée par matière, une case par notion, cinq états (rouge sous
// 50 %, ambre de 50 à 69, acquise à 70 et plus, en cours de 1 à 7 réponses,
// jamais vue), les compteurs de la légende, la phrase « Ce que ça veut dire »
// et le panneau du téléphone. Aucun Intl : les nombres s'écrivent à la main
// (lib/voice.ts), pour que le serveur et le navigateur rendent la même chaîne.
// Les notions viennent de `modele.ts` (notionsDe / notionsDepuisPointsFaibles),
// qui range chaque notion sous l'index de sa matière (`m`).

/** « unique » : 20 réponses sans limite de date ; « 90j » : le repli (20 réponses sur 90 jours, sans pondération). */
export type SourceNotions = "unique" | "90j";

/** Une case : la notion, ce que la case écrit (« 45 », « 3/8 », « — »), son nom lu et son lien. */
export type CaseCarte = {
  id: string;
  nom: string;
  etat: EtatNotion;
  /** la maîtrise de la notion (null : en cours ou jamais vue) */
  pct: number | null;
  valeur: string;
  /** l'infobulle et le nom lu : « Code et Standards (Éthique) : 45 %. Réviser cette notion. » */
  titre: string;
  href: string;
};

/** La rangée d'une matière : sa valeur dans la colonne de gauche et ses cases. */
export type RangCarte = {
  /** l'index de la matière dans `matieres` (la clé de l'isolation) */
  i: number;
  cle: string;
  nom: string;
  court: string;
  /** « 58 % », « ≈ 52 % » (provisoire), « — » (pas mesurée) */
  valeur: string;
  info: string | null;
  /** le nom lu de la valeur : « 58 % », « environ 52 %, mesure provisoire », « pas encore mesurée » */
  valeurAria: string;
  zone: Zone | null;
  /** notions mesurées sous 70 % */
  sous: number;
  mesurees: number;
  enCours: number;
  jamais: number;
  cases: CaseCarte[];
};

export type ResumeCarte = {
  total: number;
  rouges: number;
  ambres: number;
  acquises: number;
  enCours: number;
  jamais: number;
  /** rouges + ambres : le compteur « N notions sous 70 % » */
  sous: number;
  /** rouges + ambres + acquises */
  mesurees: number;
};

/** Une ligne du panneau du téléphone : la case, plus la barre fine. */
export type LigneCarte = CaseCarte & {
  /** largeur de la barre, de 0 à 100 (au moins 1,5 pour qu'une petite valeur se voie) */
  w: number;
  ton: Zone | null;
};

export type PanneauCarte = {
  i: number;
  nom: string;
  /** « 3 sous 70 % · 1 en cours · 2 jamais vues » */
  resume: string;
  lignes: LigneCarte[];
};

/** Le chiffre d'une case (« 45 », « 3/8 », « — ») et son nom lu. */
export function caseDe(n: NotionSynthese, matiere: string, source: SourceNotions): CaseCarte {
  const C = CARTE.cases;
  let valeur: string;
  let titre: string;
  if (n.pct !== null) {
    valeur = String(Math.round(n.pct));
    titre = C.mesuree(n.court, matiere, n.pct);
  } else if (n.etat === "encours") {
    valeur = C.valeurEnCours(n.n, MIN_REPONSES);
    titre = C.enCours(n.court, matiere, n.n, MIN_REPONSES);
  } else {
    valeur = C.tiret;
    titre = C.jamais(n.court, matiere, source);
  }
  return { id: n.id, nom: n.court, etat: n.etat, pct: n.pct, valeur, titre, href: n.href };
}

/**
 * Les rangées de la carte, dans l'ordre des matières (celui du programme).
 * Une notion dont la matière est inconnue (`m` hors de `matieres`) n'est pas
 * dessinée ; une matière sans notion n'a pas de rangée.
 */
export function rangsCarte(matieres: readonly MatiereSynthese[], notions: readonly NotionSynthese[], source: SourceNotions): RangCarte[] {
  const parMatiere: NotionSynthese[][] = matieres.map(() => []);
  for (const n of notions) if (n.m >= 0 && n.m < matieres.length) parMatiere[n.m].push(n);
  const rangs: RangCarte[] = [];
  matieres.forEach((m, i) => {
    const cases = parMatiere[i].map((n) => caseDe(n, m.court, source));
    if (!cases.length) return;
    const sous = parMatiere[i].filter((n) => n.pct !== null && n.pct < SEUIL_ACQUIS).length;
    rangs.push({
      i,
      cle: m.cle,
      nom: m.nom,
      court: m.court,
      valeur: valeurMatiere(m),
      info: infoMatiere(m),
      valeurAria: CARTE.matiere.valeurAria(m.pct, m.statut === "provisoire"),
      zone: ton(m.pct),
      sous,
      mesurees: parMatiere[i].filter((n) => n.pct !== null).length,
      enCours: cases.filter((c) => c.etat === "encours").length,
      jamais: cases.filter((c) => c.etat === "jamais").length,
      cases,
    });
  });
  return rangs;
}

/** Les compteurs de la légende : rouges + ambres + acquises + en cours + jamais vues = le nombre de cases. */
export function resumeCarte(rangs: readonly RangCarte[]): ResumeCarte {
  const r: ResumeCarte = { total: 0, rouges: 0, ambres: 0, acquises: 0, enCours: 0, jamais: 0, sous: 0, mesurees: 0 };
  for (const rang of rangs) {
    for (const c of rang.cases) {
      r.total++;
      if (c.etat === "r") r.rouges++;
      else if (c.etat === "a") r.ambres++;
      else if (c.etat === "e") r.acquises++;
      else if (c.etat === "encours") r.enCours++;
      else r.jamais++;
    }
  }
  r.sous = r.rouges + r.ambres;
  r.mesurees = r.sous + r.acquises;
  return r;
}

/** Vrai si la matière `i` est estompée parce qu'une autre est isolée. */
export function estompee(i: number, iso: number | null): boolean {
  return iso !== null && iso !== i;
}

/** « Ce que ça veut dire » : celle de la matière isolée, ou celle de l'ensemble du programme. */
export function phraseCarte(rangs: readonly RangCarte[], resume: ResumeCarte, iso: number | null, source: SourceNotions): string {
  const L = CARTE.lire;
  const isolee = iso !== null ? rangs.find((r) => r.i === iso) : undefined;
  if (isolee) return `${L.iso.tete(isolee.court, isolee.sous, isolee.jamais, isolee.enCours, source, SEUIL_ACQUIS)} ${L.iso.suite(isolee.sous, isolee.jamais, isolee.enCours, source)}`;
  if (resume.mesurees === 0) return `${L.aucune(MIN_REPONSES)}${resume.enCours > 0 ? ` ${L.global.enCours(resume.enCours)}` : ""}`;
  // les matières qui comptent le plus de notions sous 70 %
  const max = Math.max(0, ...rangs.map((r) => r.sous));
  const tops = max > 0 ? rangs.filter((r) => r.sous === max).map((r) => r.court) : [];
  return [
    L.global.sous(resume.sous, resume.rouges, SEUIL_ACQUIS, SEUIL_BAS),
    tops.length ? L.global.tops(tops, max) : "",
    resume.enCours > 0 ? L.global.enCours(resume.enCours) : "",
    resume.jamais > 0 ? L.global.jamais(resume.jamais, source) : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Le panneau des notions d'une matière (téléphone) : une ligne par notion, dans l'ordre du catalogue. */
export function panneauCarte(rang: RangCarte, source: SourceNotions): PanneauCarte {
  const P = CARTE.panneau;
  return {
    i: rang.i,
    nom: rang.nom,
    resume: P.resume(rang.sous, rang.mesurees, rang.enCours, rang.jamais, source, SEUIL_ACQUIS),
    lignes: rang.cases.map((c): LigneCarte => {
      return {
        ...c,
        valeur: c.pct !== null ? `${Math.round(c.pct)}${NBSP}%` : c.etat === "encours" ? c.valeur : P.valeurJamais(source),
        w: c.pct !== null ? Math.max(c.pct, 1.5) : 0,
        ton: ton(c.pct),
      };
    }),
  };
}
