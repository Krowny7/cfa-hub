// Tests des programmes du Codex (lib/codex/programmes.ts, V3 §1), sans base ni réseau.
//   npx tsx --tsconfig tsconfig.json scripts/codex/test-programmes.ts
// Vérifie : l'arbre d'un programme d'essai (ids préfixés, trame générique,
// étape « serie » sans séance ciblée, aucun outil absent) ; les phases par
// avancement sans jour J ; les ids publiés de CFA I tous présents ; deux
// programmes aux mêmes noms de matière sans rien de commun ; le prérequis
// « apresExamen » ; les quêtes non branchées faute de capacité de la base.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ACTES, COSMETIQUES_CODEX, catalogueCodex, contenuDuProgramme, evenementsDe, phaseDe, titresMaitres, verifierQuetes } from "@/lib/codex/catalogue";
import { CFA_L1 } from "@/lib/codex/programmes/cfa-l1";
import { PROGRAMME_ESSAI, PROGRAMME_ESSAI_BIS } from "@/lib/codex/programmes/essai";
import {
  REGISTRE, actesDe, catalogueComplet, cosmetiquesDe, genererArbre, idDe, lireProgrammesJoueur, modelesContrats, nomEnTete, programmeActif, programmeDe, programmeDeId, slugDe, suiteDe,
  type DefinitionProgramme, type ProgrammeJoueur,
} from "@/lib/codex/programmes";
import { apresExamenDe, evaluer, indexerLecture, phaseJoueur, planifier, quetesASuivre, requisOk, tirerContrats, type Entree, type LectureSql } from "@/lib/codex/moteur";
import { CAPACITES_VIDE, lireCapacites } from "@/lib/codex/reglage";
import { construireVue } from "@/lib/codex/vue";
import type { Objectif, Quete } from "@/lib/codex/types";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};

/** Les erreurs de l'arbre d'un programme (avec ses actes et ses pièces). */
const erreursDe = (def: DefinitionProgramme, qs: Quete[]) =>
  verifierQuetes(qs, { actes: actesDe(def), cosmetiques: [...COSMETIQUES_CODEX, ...titresMaitres(def.matieres()), ...cosmetiquesDe(def)] });

/** Les filtres « matiere » d'un objectif (valeurs simples ou listes). */
function matieresDe(o: Objectif): string[] {
  if (o.k === "tous" || o.k === "unDe") return o.objectifs.flatMap(matieresDe);
  if (o.k !== "compteur" && o.k !== "mesure") return [];
  const v = (o.filtre as Record<string, unknown> | undefined)?.matiere;
  return typeof v === "string" ? [v] : Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Un événement que seul un outil absent du programme d'essai produit. */
function demandeOutilAbsent(o: Objectif): boolean {
  if (o.k === "tous" || o.k === "unDe") return o.objectifs.some(demandeOutilAbsent);
  if (o.k !== "compteur") return false;
  if (o.evenement === "session_terminee") return (o.filtre as Record<string, unknown> | undefined)?.source === "ciblee";
  return o.evenement === "drill_page_terminee" || o.evenement === "examen_blanc_rendu" || o.evenement === "duel_termine";
}

console.log("# 1. l'arbre du programme d'essai");
{
  const arbre = genererArbre(PROGRAMME_ESSAI);
  const erreurs = erreursDe(PROGRAMME_ESSAI, arbre);
  check("verifierQuetes : aucune erreur", erreurs.length === 0, erreurs.slice(0, 5).join(" | "));
  check(`${arbre.length} quêtes, toutes « essai/… » et du programme d'essai`, arbre.length > 0 && arbre.every((q) => q.id.startsWith("essai/") && q.programme === PROGRAMME_ESSAI.cle));
  check("programmeDeId rend le programme d'essai pour chacune", arbre.every((q) => programmeDeId(q.id) === PROGRAMME_ESSAI.cle));
  const absents = arbre.filter((q) => demandeOutilAbsent(q.objectif));
  check("aucune quête ne demande un outil absent (séance ciblée, drill, blanc, duel)", absents.length === 0, absents.map((q) => q.id).join(" "));
  check("aucun événement inconnu", arbre.every((q) => evenementsDe(q.objectif).every((e) => typeof e === "string")));
  for (const m of PROGRAMME_ESSAI.matieres()) {
    const etapes = new Set(arbre.filter((q) => q.matiere === m.key).map((q) => q.etape));
    const attendues = ["entree", "serie", "tour", "maitrise60", "maitrise75", "maitre"];
    check(`${m.key} : ${attendues.join(", ")} ; ni « ciblee », ni fiche, drill, cours, flashcards`,
      attendues.every((e) => etapes.has(e as never)) && !["ciblee", "fiche", "drill", "cours", "flashcards"].some((e) => etapes.has(e as never)), [...etapes].join(","));
  }
  const serie = arbre.find((q) => q.etape === "serie")!;
  check("« serie » : 15 justes sur les 20 dernières, après le premier pas", serie.objectif.k === "special" && serie.objectif.seuil === 15 && serie.prerequis.some((p) => p.k === "quete" && p.id === "essai/branche:renaissance:entree"));
  const maitrise60 = arbre.find((q) => q.id === "essai/branche:renaissance:maitrise60")!;
  check("« maitrise60 » s'ouvre après « serie »", maitrise60?.prerequis.some((p) => p.k === "quete" && p.id === "essai/branche:renaissance:serie"));
  const trame = arbre.filter((q) => q.famille === "trame");
  check(`trame générique : ${trame.length} quêtes « essai/trame:g<n>:<clé> » dans 5 actes`, trame.length > 0 && trame.every((q) => /^essai\/trame:g[0-4]:[a-z-]+$/.test(q.id)) && new Set(trame.map((q) => q.acte)).size === 5);
  check("les actes génériques : « essai/g0 » à « essai/g4 », le dernier donne « Maître d'Essai »",
    actesDe(PROGRAMME_ESSAI).map((a) => a.id).join(" ") === "essai/g0 essai/g1 essai/g2 essai/g3 essai/g4" && cosmetiquesDe(PROGRAMME_ESSAI)[0]?.nom === "Maître d'Essai" && actesDe(PROGRAMME_ESSAI)[4].recompense.titre === cosmetiquesDe(PROGRAMME_ESSAI)[0].cle);
  check("les réponses de la trame ne comptent que les matières du programme", trame.filter((q) => q.objectif.k === "compteur").every((q) => matieresDe(q.objectif).length === 3));
  const chaines = arbre.filter((q) => q.famille === "longcours");
  check("chaînes retenues seulement (memoire, encre), ouvertes à la clôture de l'acte 0", new Set(chaines.map((q) => q.chaine)).size === 2 && chaines.filter((q) => q.palier === 1).every((q) => q.prerequis.some((p) => p.k === "acte" && p.id === "essai/g0")));
  check("modèles de contrats : seulement ceux dont l'essai a les outils", modelesContrats(PROGRAMME_ESSAI).every((m) => (m.requiert ?? []).every((o) => PROGRAMME_ESSAI.outils.has(o))) && !modelesContrats(PROGRAMME_ESSAI).some((m) => m.id === "drill-page" || m.id === "duel"));
  check("CFA I tire tous ses modèles", modelesContrats(CFA_L1).length > 10);
}

console.log("\n# 2. les phases sans jour J suivent l'avancement");
{
  const ctx = (actesClos: string[], apresExamen = false) => ({ def: PROGRAMME_ESSAI, actesClos, apresExamen });
  check("rien de clos → fondations", phaseDe(null, ctx([])) === "fondations");
  check("acte 0 clos seulement → fondations", phaseDe(null, ctx(["essai/g0"])) === "fondations");
  check("actes 0 et 1 clos → consolidation", phaseDe(null, ctx(["essai/g0", "essai/g1"])) === "consolidation");
  check("jusqu'à l'avant-dernier clos → répétition", phaseDe(null, ctx(["essai/g0", "essai/g1", "essai/g2", "essai/g3"])) === "repetition");
  check("tout clos → après", phaseDe(null, ctx(["essai/g0", "essai/g1", "essai/g2", "essai/g3", "essai/g4"])) === "apres");
  check("un programme mené → après", phaseDe(null, ctx([], true)) === "apres");
  check("sans date, jamais de veillée (même avec des jours avant)", phaseDe(3, ctx([])) === "fondations");
  const cfa = (actesClos: string[]) => ({ def: CFA_L1, actesClos, apresExamen: false });
  check("CFA I daté : les règles d'avant (J-5 → veillée, J-40 → consolidation)", phaseDe(5, cfa([])) === "veillee" && phaseDe(40, cfa(["acte2", "acte3"])) === "consolidation");
  check("CFA I sans jour J : fondations tant que l'acte II n'est pas clos (l'acte I parallèle ne compte pas)", phaseDe(null, cfa(["prologue", "acte1"])) === "fondations");
  check("CFA I sans jour J : acte II clos → consolidation ; acte V → répétition ; acte VI → après", phaseDe(null, cfa(["prologue", "acte2"])) === "consolidation" && phaseDe(null, cfa(["prologue", "acte2", "acte3", "acte4", "acte5"])) === "repetition" && phaseDe(null, cfa(["prologue", "acte2", "acte3", "acte4", "acte5", "acte6"])) === "apres");
  check("sans contexte : fondations, comme avant", phaseDe(null) === "fondations");
}

console.log("\n# 3. CFA I : les ids publiés restent, le catalogue ne change pas");
{
  const publies = (JSON.parse(readFileSync(join(process.cwd(), "scripts/codex/ids-publies.json"), "utf8")) as { quetes: string[] }).quetes;
  const complet = catalogueComplet(CFA_L1.cle);
  const ids = new Set(complet.map((q) => q.id));
  const perdus = publies.filter((id) => !ids.has(id));
  check(`les ${publies.length} ids publiés (c20b3d6) sont tous dans le catalogue`, publies.length > 200 && perdus.length === 0, perdus.slice(0, 5).join(" "));
  const tri = (qs: Quete[]) => qs.map((q) => q.id).sort().join("\n");
  check("catalogueComplet(CFA I) = catalogueCodex() (mêmes quêtes)", tri(complet) === tri(catalogueCodex()));
  check("genererArbre(CFA I) : ids nus, aucun préfixe", genererArbre(CFA_L1).every((q) => !q.id.includes("/")));
  check("programmeDeId : CFA I, global, essai", programmeDeId("branche:fsa:maitre") === CFA_L1.cle && programmeDeId("exploit:joconde") === "global" && programmeDeId("fil:trophees:4") === "global" && programmeDeId("acte:acte2") === CFA_L1.cle && programmeDeId("acte:essai/g1") === PROGRAMME_ESSAI.cle && programmeDeId("cfa-l2/branche:fsa:entree") === "finance/cfa-l2");
  check("idDe / slugDe", idDe(CFA_L1.cle, "trame:a4:blanc") === "trame:a4:blanc" && idDe("finance/cfa-l2", "branche:fsa:entree") === "cfa-l2/branche:fsa:entree" && slugDe("finance/cfa-l2") === "cfa-l2");
  check("les exploits sont du programme « global »", catalogueCodex().filter((q) => q.famille === "exploit").every((q) => q.programme === "global"));
  const fsa = contenuDuProgramme().find((m) => m.key === "fsa")!;
  check("contenu de CFA I : ses outils par matière (fiche et drill en FSA, comme ses champs)", fsa.outils.includes("fiche") && fsa.outils.includes("drill") && fsa.outils.includes("cours") === !!fsa.cours && fsa.outils.includes("flashcards") === fsa.flashcards);
  check("registre : CFA I public, CFA II et III déclarés non publics, la route de Milan chaînée",
    REGISTRE.map((p) => `${p.cle}:${p.public}`).join(" ") === "finance/cfa-l1:true finance/cfa-l2:false finance/cfa-l3:false" && CFA_L1.suivant === "finance/cfa-l2" && programmeDe("finance/cfa-l2")?.suivant === "finance/cfa-l3");
  check("les programmes d'essai ne sont pas au registre, mais joignables", !REGISTRE.includes(PROGRAMME_ESSAI) && programmeDe("histoire/essai") === PROGRAMME_ESSAI);
}

console.log("\n# 6. deux programmes aux mêmes noms de matière");
{
  const bis = genererArbre(PROGRAMME_ESSAI_BIS);
  const cfa = catalogueCodex();
  check("verifierQuetes : aucune erreur", erreursDe(PROGRAMME_ESSAI_BIS, bis).length === 0, erreursDe(PROGRAMME_ESSAI_BIS, bis).slice(0, 3).join(" | "));
  const clesBis = PROGRAMME_ESSAI_BIS.matieres().map((m) => m.key);
  check("clés qualifiées : essai-bis:fsa, essai-bis:equity", clesBis.join(" ") === "essai-bis:fsa essai-bis:equity");
  const clesCfa = new Set(contenuDuProgramme().map((m) => m.key));
  check("aucune clé de matière commune avec CFA I", clesBis.every((k) => !clesCfa.has(k)));
  const filtresCfa = new Set(cfa.flatMap((q) => matieresDe(q.objectif)));
  const filtresBis = bis.flatMap((q) => matieresDe(q.objectif));
  check("aucun filtre de matière commun", filtresBis.length > 0 && filtresBis.every((k) => !filtresCfa.has(k)));
  const titres = (qs: Quete[]) => new Set(qs.map((q) => q.recompense.titre).filter((t): t is string => !!t));
  const titresCfa = titres(cfa);
  check("aucun titre de maître commun (titre:maitre:essai-bis:fsa)", [...titres(bis)].every((t) => !titresCfa.has(t)) && titres(bis).has("titre:maitre:essai-bis:fsa"));
  check("aucun id commun", bis.every((q) => !cfa.some((x) => x.id === q.id)));
}

console.log("\n# les programmes du joueur, « apresExamen », les capacités");
{
  const lus = lireProgrammesJoueur([{ programme: "finance/cfa-l1", statut: "mene", jour_j: "2026-11-12", mene_le: "2026-11-20T10:00:00Z" }, { programme: "x", statut: "bizarre" }, null]);
  check("lireProgrammesJoueur garde les lignes valides seulement", lus.length === 1 && lus[0].jourJ === "2026-11-12");
  check("sans ligne : CFA I actif", programmeActif(undefined) === CFA_L1 && programmeActif([]) === CFA_L1);
  check("la ligne « actif » choisit le programme", programmeActif([{ programme: "histoire/essai", statut: "actif", jourJ: null, meneLe: null }]) === PROGRAMME_ESSAI);
  check("sans actif : le dernier mené (on reste dans son arbre)", programmeActif([{ programme: "finance/cfa-l1", statut: "mene", jourJ: null, meneLe: "2026-11-20T10:00:00Z" }, { programme: "histoire/essai", statut: "mene", jourJ: null, meneLe: "2027-01-05T10:00:00Z" }]) === PROGRAMME_ESSAI);
  check("une ligne en pause seule : CFA I", programmeActif([{ programme: "histoire/essai", statut: "pause", jourJ: null, meneLe: null }]) === CFA_L1);
  const e = (o: Partial<Entree>) => ({ jour: "2026-11-20", jourJ: null, programmes: [], ...o });
  check("apresExamen : faux sans jour J ni programme mené", !apresExamenDe(e({})));
  check("apresExamen : vrai le lendemain du jour J, faux le jour même", apresExamenDe(e({ jourJ: "2026-11-19" })) && !apresExamenDe(e({ jourJ: "2026-11-20" })));
  check("apresExamen : vrai avec un programme mené", apresExamenDe(e({ programmes: [{ programme: "finance/cfa-l1", statut: "mene", jourJ: null, meneLe: null }] })));
  check("phaseJoueur : CFA I mené sans jour J → après", phaseJoueur(e({ programmes: [{ programme: "finance/cfa-l1", statut: "mene", jourJ: null, meneLe: null }] }), []) === "apres");
  check("lireCapacites : clés absentes à faux, journal 2 par défaut", JSON.stringify(lireCapacites({ fil: true, journal: 3, bidon: true })) === JSON.stringify({ ...CAPACITES_VIDE, fil: true, journal: 3 }) && JSON.stringify(lireCapacites(null)) === JSON.stringify(CAPACITES_VIDE));
  check("requisOk : rien d'exigé → vrai ; « fil » sans la capacité → faux ; « journal3 » avec le journal 3 → vrai",
    requisOk({}, CAPACITES_VIDE) && !requisOk({ requiert: ["fil"] }, CAPACITES_VIDE) && requisOk({ requiert: ["journal3"] }, { ...CAPACITES_VIDE, journal: 3 }));

  // une quête qui exige une capacité absente n'est pas suivie, et ne bloque pas celle qui en dépend
  const base: Entree = {
    contenu: contenuDuProgramme(), now: new Date("2026-10-17T10:00:00Z"), jour: "2026-10-17", jourJ: null, objectif: null, visiteVue: false,
    progression: [], contrats: [], premier: false, dernierCalcul: null, lecture: { compteurs: {}, mesures: { xp_total: 0 }, speciaux: {} },
  };
  const exige: Quete = { id: "trame:test:exige", famille: "trame", programme: CFA_L1.cle, titre: "Exige", consigne: "—", objectif: { k: "mesure", mesure: "questions_total", seuil: 0 }, prerequis: [], recompense: { xp: 10 }, repetition: "unique", visibilite: "visible", ordre: 1, requiert: ["fil"] };
  const suite: Quete = { ...exige, id: "trame:test:suite", requiert: undefined, prerequis: [{ k: "quete", id: exige.id }] };
  const apresEx: Quete = { ...exige, id: "trame:test:apres", requiert: undefined, prerequis: [{ k: "apresExamen" }] };
  const cat = [exige, suite, apresEx];
  const ids = (e: Entree) => quetesASuivre(e, e.contenu!).instances.map((i) => i.quete.id);
  check("sans la capacité : la quête exigeante n'est pas suivie", !ids({ ...base, catalogue: cat }).includes(exige.id) && ids({ ...base, catalogue: cat }).includes(suite.id));
  check("avec la capacité : elle l'est", ids({ ...base, catalogue: cat, capacites: { ...CAPACITES_VIDE, fil: true } }).includes(exige.id));
  const r = evaluer({ ...base, catalogue: cat }, {});
  const ouverte = (id: string) => r.etats.find((s) => s.quete.id === id)?.ouverte;
  check("sans la capacité : la quête suivante s'ouvre quand même (une quête non branchée ne bloque rien)", ouverte(suite.id) === true);
  check("« apresExamen » fermé avant l'examen", ouverte(apresEx.id) === false);
  const r2 = evaluer({ ...base, catalogue: cat, jourJ: "2026-10-10" }, {});
  check("« apresExamen » ouvert une fois le jour J passé", r2.etats.find((s) => s.quete.id === apresEx.id)?.ouverte === true);
  check("le lot d'écriture ne contient jamais une quête non suivie", !r.lot.some((x) => x.quete === exige.id));
  check("ACTES de CFA I inchangés (8 actes)", ACTES.length === 8);

  // la route de Milan
  const ligne = (programme: string, statut: ProgrammeJoueur["statut"]): ProgrammeJoueur => ({ programme, statut, jourJ: null, meneLe: null });
  check("la route de Milan : rien tant que CFA I n'est pas mené", suiteDe(undefined) === null && suiteDe([ligne("finance/cfa-l1", "actif")]) === null);
  check("CFA I mené : CFA II proposé", suiteDe([ligne("finance/cfa-l1", "mene")])?.cle === "finance/cfa-l2");
  check("CFA II déjà commencé (actif ou en pause) : plus de proposition", suiteDe([ligne("finance/cfa-l1", "mene"), ligne("finance/cfa-l2", "pause")]) === null);
  check("« Le Niveau II » en tête de phrase ; un autre programme garde son nom", nomEnTete(programmeDe("finance/cfa-l2")!) === "Le Niveau II" && nomEnTete(PROGRAMME_ESSAI) === "Programme d'essai");
  const vueDe = (e: Entree) => construireVue(e, evaluer(e, {}), null, { devoile: null });
  const s1 = vueDe({ ...base, programmes: [ligne("finance/cfa-l1", "mene")] }).suite;
  check("la vue l'annonce sans bouton tant que CFA II n'est pas public", s1?.annonce === "Le Niveau II arrive. Ton fil rouge continue d'ici là." && s1.ouvrable === false && s1.court === "CFA II", JSON.stringify(s1));
  check("rien à annoncer avant", vueDe(base).suite === null);

  // sans jour J, la phase vient de l'avancement : sa réplique n'annonce aucune durée
  const acteFait = (id: string) => ({ quete_id: `acte:${id}`, periode: "", etat: "recompensee" as const, progression: 1, cible: 1, ouverte_le: "2026-10-01T00:00:00Z", terminee_le: "2026-10-02T00:00:00Z", recompensee_le: "2026-10-02T00:00:00Z", retro: false, xp: 100, cosmetique: null, titre: null, vu: true });
  const v2 = vueDe({ ...base, progression: [acteFait("prologue"), acteFait("acte2")] });
  check("sans jour J, acte II clos : consolidation, sans « Trois mois »", v2.phase === "consolidation" && !v2.phaseReplique.includes("mois"), v2.phaseReplique);
  const v3 = vueDe({ ...base, jourJ: "2026-12-20", progression: [acteFait("prologue"), acteFait("acte2")] });
  check("avec un jour J : la règle par la date et sa réplique", v3.phase === "consolidation" && v3.phaseReplique.startsWith("Trois mois"), v3.phaseReplique);
}

console.log("\n# le moteur tourne sur l'arbre d'essai (ses actes, ses contrats)");
{
  const essai: ProgrammeJoueur = { programme: PROGRAMME_ESSAI.cle, statut: "actif", jourJ: null, meneLe: null };
  const e: Entree = {
    catalogue: catalogueComplet(PROGRAMME_ESSAI.cle), contenu: PROGRAMME_ESSAI.matieres(), programmes: [essai],
    now: new Date("2026-10-17T10:00:00Z"), jour: "2026-10-17", jourJ: null, objectif: null, visiteVue: false,
    progression: [], contrats: [], premier: false, dernierCalcul: new Date("2026-10-16T10:00:00Z"), lecture: { compteurs: {}, mesures: { xp_total: 0 }, speciaux: {} },
  };
  // des réponses dans les matières de l'essai (tous les compteurs de réponses remplis)
  const demandes = planifier(e);
  const brut: LectureSql = { ...e.lecture, compteurs: Object.fromEntries(demandes.map((d) => [d.id, d.evenement === "question_repondue" ? { n: 12, atteint: "2026-10-17T09:00:00Z" } : { n: 0, atteint: null }])) };
  const r = evaluer({ ...e, lecture: brut }, indexerLecture(demandes, brut));
  check("les actes 0 et 1 se closent (premier pas dans chaque matière), l'acte 2 devient l'acte en cours", r.actesClos.join(",") === "essai/g0,essai/g1" && r.acteCourant?.id === "essai/g2", `${r.actesClos.join(",")} · ${r.acteCourant?.id}`);
  check("la clôture s'écrit « acte:essai/g0 », aucun acte de CFA I", r.lot.some((x) => x.quete === "acte:essai/g0") && !r.lot.some((x) => /^acte:(prologue|acte\d|epilogue)$/.test(x.quete)));
  check("phase par avancement : consolidation (l'acte 1 est clos)", r.phase === "consolidation");
  const v = construireVue({ ...e, lecture: brut }, r, null, { devoile: null });
  check("la vue montre les cinq actes de l'essai", v.trame.map((a) => a.acte.id).join(" ") === "essai/g0 essai/g1 essai/g2 essai/g3 essai/g4" && v.trame[0].clos);
  const tires = tirerContrats({ ...e, lecture: brut }, "joueur-essai");
  check("ses contrats du jour n'utilisent que ses outils", tires.length > 0 && tires.every((t) => !["drill-page", "duel", "matiere-faible", "atelier", "calculs", "cours", "flashcards", "defi"].includes(t.modele)), tires.map((t) => t.modele).join(","));
}

console.log(ko ? `\n${ko} échec(s)` : "\nTout est vert.");
process.exit(ko ? 1 : 0);
