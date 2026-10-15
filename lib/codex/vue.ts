// Le Codex : la vue que lit l'écran. Module neutre : construit, à partir de
// l'évaluation du moteur (lib/codex/moteur.ts), exactement ce que la page
// affiche, dans l'ordre décidé (CONCEPTION.md) : la prochaine quête, la trame
// (acte en cours), les contrats du jour et de la semaine, les branches, le
// long cours, les exploits. L'écran ne calcule rien : il lit ceci.

import { ACTES, CHAINES, COSMETIQUES_CODEX, DECOUVERTE, ETAPES, PHASES, titresMaitres, contenuDuProgramme, type ContenuMatiere } from "@/lib/codex/catalogue";
import { affichage, joursAvantExamen, type EtatDevoilement, type EtatQuete, type Entree, type Recommandation, type Resultat } from "@/lib/codex/moteur";
import type { Acte, Chaine, CosmetiqueCodex, Emplacement, EtapeBranche, Famille, Phase, RepliqueCodex } from "@/lib/codex/types";

export type EtatLigne = "verrouillee" | "disponible" | "active" | "terminee";

/** Une quête telle que l'écran l'affiche. */
export type LigneQuete = {
  id: string;
  periode: string;
  famille: Famille;
  titre: string;
  consigne: string;
  pourquoi?: string;
  etat: EtatLigne;
  /** complet | verrouille (on voit le chemin) | indice (énigme) | cache : à ne pas montrer */
  affichage: "complet" | "verrouille" | "indice" | "cache";
  indice?: string;
  valeur: number;
  cible: number;
  /** 0–1 */
  fraction: number;
  /** l'XP visée / l'XP réellement versée (plafonnée), seulement si terminée */
  xp: number;
  xpVersee: number | null;
  cosmetique?: string;
  titreGagne?: string;
  retro: boolean;
  termineeLe: string | null;
  /** la fanfare n'a pas été jouée */
  aFeter: boolean;
  lien?: string;
  duree?: number;
  optionnelle?: boolean;
  acte?: string;
  chaine?: string;
  palier?: number;
  matiere?: string;
  etape?: EtapeBranche;
};

export type VueActe = {
  acte: Acte;
  clos: boolean;
  courant: boolean;
  faites: number;
  total: number;
  quetes: LigneQuete[];
  /** la réplique du moment : ouverture tant que l'acte est en cours, clôture quand il est clos */
  replique: RepliqueCodex;
};

export type VueContrat = {
  emplacement: Emplacement;
  modele: string;
  ligne: LigneQuete;
  /** le changement du jour est encore possible pour ce contrat */
  changeable: boolean;
};

export type VueBranche = {
  contenu: ContenuMatiere;
  etapes: LigneQuete[];
  faites: number;
  total: number;
  /** « Maître de … » obtenu */
  maitre: boolean;
};

export type VueChaine = { chaine: Chaine; paliers: LigneQuete[]; courant: LigneQuete | null; suivant: LigneQuete | null; faits: number };

export type Possession = { cle: string; type: CosmetiqueCodex["type"]; nom: string; quete: string; le: string | null; retro: boolean };

export type VueCodex = {
  /** la migration est collée et la base répond */
  disponible: boolean;
  jour: string;
  phase: Phase;
  phaseNom: string;
  phaseReplique: string;
  joursAvant: number | null;
  niveau: number;
  prochaine: (Recommandation & { ligne: LigneQuete }) | null;
  trame: VueActe[];
  contrats: VueContrat[];
  trio: { fait: boolean; xp: number; faits: number; total: number; changementPossible: boolean };
  hebdo: LigneQuete[];
  branches: VueBranche[];
  longCours: VueChaine[];
  exploits: LigneQuete[];
  /** ce que le joueur possède grâce au Codex (cadres, bannières, titres) */
  possessions: Possession[];
  stats: { faites: number; total: number; xpCodex: number };
  devoile: EtatDevoilement | null;
  /** récompenses versées à CET appel (fanfare) */
  nouvelles: { quete: string; periode: string; xp: number; nominal: number; cosmetique: string | null; titre: string | null; titreQuete: string }[];
  /** « Léonard a feuilleté ton carnet » : à jouer une fois */
  retro: { xp: number; quetes: number; actes: string[]; cosmetiques: string[]; titres: string[] } | null;
};

export const VUE_INDISPONIBLE = (jour: string): VueCodex => ({
  disponible: false, jour, phase: "fondations", phaseNom: PHASES[0].nom, phaseReplique: PHASES[0].replique, joursAvant: null, niveau: 1, prochaine: null,
  trame: [], contrats: [], trio: { fait: false, xp: 0, faits: 0, total: 0, changementPossible: false }, hebdo: [], branches: [], longCours: [], exploits: [],
  possessions: [], stats: { faites: 0, total: 0, xpCodex: 0 }, devoile: null, nouvelles: [], retro: null,
});

export function ligneDe(s: EtatQuete): LigneQuete {
  const q = s.quete;
  const l = s.ligne;
  const ev = s.ev;
  const valeur = s.fait ? (ev?.cible ?? l?.cible ?? 1) : (ev?.valeur ?? Number(l?.progression ?? 0));
  const cible = ev?.cible ?? l?.cible ?? 1;
  return {
    id: q.id,
    periode: s.periode,
    famille: q.famille,
    titre: q.titre,
    consigne: q.consigne,
    ...(q.pourquoi ? { pourquoi: q.pourquoi } : {}),
    etat: s.fait ? "terminee" : s.ouverte ? (valeur > 0 ? "active" : "disponible") : "verrouillee",
    affichage: affichage(s),
    ...(q.indice ? { indice: q.indice } : {}),
    valeur,
    cible,
    fraction: s.fait ? 1 : cible ? Math.max(0, Math.min(1, valeur / cible)) : 0,
    xp: q.recompense.xp,
    xpVersee: l && (l.etat === "recompensee" || l.etat === "terminee") ? l.xp : null,
    ...(q.recompense.cosmetique ? { cosmetique: q.recompense.cosmetique } : {}),
    ...(q.recompense.titre ? { titreGagne: q.recompense.titre } : {}),
    retro: s.retro,
    termineeLe: l?.terminee_le ?? (s.fait && s.atteint ? s.atteint.toISOString() : null),
    aFeter: !!l && l.etat === "recompensee" && !l.vu && !l.retro,
    ...(q.lien ? { lien: q.lien } : {}),
    ...(q.duree ? { duree: q.duree } : {}),
    ...(q.optionnelle ? { optionnelle: true } : {}),
    ...(q.acte ? { acte: q.acte } : {}),
    ...(q.chaine ? { chaine: q.chaine } : {}),
    ...(q.palier ? { palier: q.palier } : {}),
    ...(q.matiere ? { matiere: q.matiere } : {}),
    ...(q.etape ? { etape: q.etape } : {}),
  };
}

/** Quel cosmétique vient de quelle quête (ou de quel acte) : la possession se déduit de ce qu'on a fait. */
export function donneurs(contenu: ContenuMatiere[] = contenuDuProgramme(), quetes: { id: string; recompense: { cosmetique?: string; titre?: string } }[] = []): Map<string, string> {
  const m = new Map<string, string>();
  for (const a of ACTES) for (const c of [a.recompense.cosmetique, a.recompense.titre]) if (c) m.set(c, `acte:${a.id}`);
  for (const q of quetes) for (const c of [q.recompense.cosmetique, q.recompense.titre]) if (c) m.set(c, q.id);
  return m;
}

export function construireVue(
  e: Entree,
  r: Resultat,
  reco: Recommandation | null,
  extra: { devoile: EtatDevoilement | null; nouvelles?: VueCodex["nouvelles"]; retro?: VueCodex["retro"]; changementFait?: boolean },
): VueCodex {
  const contenu = e.contenu ?? contenuDuProgramme();
  const lignes = r.etats.map((s) => ({ s, l: ligneDe(s) }));
  const unique = lignes.filter((x) => x.s.quete.repetition === "unique");
  const phase = PHASES.find((p) => p.phase === r.phase) ?? PHASES[0];

  const trame: VueActe[] = ACTES.map((a) => {
    const quetes = unique.filter((x) => x.s.quete.famille === "trame" && x.s.quete.acte === a.id).sort((p, q) => p.s.quete.ordre - q.s.quete.ordre).map((x) => x.l);
    const clos = r.actesClos.includes(a.id);
    const comptees = quetes.filter((x) => !x.optionnelle);
    return { acte: a, clos, courant: r.acteCourant?.id === a.id, faites: comptees.filter((x) => x.etat === "terminee").length, total: comptees.length, quetes, replique: clos ? a.cloture : a.ouverture };
  });

  const contrats: VueContrat[] = r.contrats
    .filter((i) => i.emplacement)
    .map((i) => {
      const s = r.etats.find((x) => x.quete.id === i.quete.id && x.periode === i.periode)!;
      const l = ligneDe(s);
      return { emplacement: i.emplacement!, modele: i.quete.id.split(":")[1], ligne: l, changeable: !extra.changementFait && l.etat !== "terminee" };
    });
  const faitsDuJour = contrats.filter((c) => c.ligne.etat === "terminee").length;

  const hebdo = lignes.filter((x) => x.s.quete.famille === "contrat" && x.s.quete.repetition === "hebdomadaire" && x.l.affichage !== "cache").map((x) => x.l);

  const branches: VueBranche[] = contenu.map((m) => {
    const etapes = unique
      .filter((x) => x.s.quete.famille === "branche" && x.s.quete.matiere === m.key)
      .sort((p, q) => ETAPES.indexOf(p.s.quete.etape!) - ETAPES.indexOf(q.s.quete.etape!))
      .map((x) => x.l);
    const comptees = etapes.filter((x) => !x.optionnelle);
    return { contenu: m, etapes, faites: comptees.filter((x) => x.etat === "terminee").length, total: comptees.length, maitre: etapes.some((x) => x.etape === "maitre" && x.etat === "terminee") };
  });

  const longCours: VueChaine[] = CHAINES.map((c) => {
    const paliers = unique.filter((x) => x.s.quete.chaine === c.id).sort((p, q) => (p.s.quete.palier ?? 0) - (q.s.quete.palier ?? 0)).map((x) => x.l);
    const faits = paliers.filter((x) => x.etat === "terminee").length;
    return { chaine: c, paliers, faits, courant: paliers.find((x) => x.etat !== "terminee") ?? null, suivant: paliers.filter((x) => x.etat !== "terminee")[1] ?? null };
  }).filter((c) => c.paliers.length > 0);

  const exploits = unique.filter((x) => x.s.quete.famille === "exploit" && x.l.affichage !== "cache").sort((p, q) => p.s.quete.ordre - q.s.quete.ordre).map((x) => x.l);

  const par = donneurs(contenu, r.etats.map((s) => s.quete));
  const noms = new Map<string, CosmetiqueCodex>([...COSMETIQUES_CODEX, ...titresMaitres(contenu)].map((c) => [c.cle, c]));
  const faitesPar = new Map(e.progression.filter((l) => l.etat === "recompensee").map((l) => [l.quete_id, l]));
  const possessions: Possession[] = [];
  for (const [cle, id] of par) {
    const c = noms.get(cle);
    const l = faitesPar.get(id) ?? (r.etats.find((s) => s.quete.id === id && s.fait) ? { terminee_le: null, retro: false } : null);
    if (c && l) possessions.push({ cle, type: c.type, nom: c.nom, quete: id, le: l.terminee_le, retro: !!l.retro });
  }

  const faites = r.etats.filter((s) => s.fait && s.quete.famille !== "contrat").length;
  const ligneReco = reco ? lignes.find((x) => x.s.quete.id === reco.quete.id && x.s.periode === reco.periode)?.l : null;
  void DECOUVERTE;
  return {
    disponible: true,
    jour: e.jour,
    phase: r.phase,
    phaseNom: phase.nom,
    phaseReplique: phase.replique,
    joursAvant: joursAvantExamen(e.jour, e.jourJ),
    niveau: r.niveau,
    prochaine: reco && ligneReco ? { ...reco, ligne: ligneReco } : null,
    trame,
    contrats,
    trio: { fait: r.trioFait, xp: 50, faits: faitsDuJour, total: contrats.length, changementPossible: !extra.changementFait && contrats.some((c) => c.changeable) },
    hebdo,
    branches,
    longCours,
    exploits,
    possessions,
    stats: { faites, total: r.etats.filter((s) => s.quete.famille !== "contrat" && !s.quete.optionnelle).length, xpCodex: e.progression.reduce((s, l) => s + (l.etat === "recompensee" ? l.xp : 0), 0) },
    devoile: extra.devoile,
    nouvelles: extra.nouvelles ?? [],
    retro: extra.retro ?? null,
  };
}
