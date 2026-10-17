// Tests de la lecture des mesures v3 (lib/codex/mesures-v3.ts), sans base ni réseau.
//   npx tsx --tsconfig tsconfig.json scripts/codex/test-mesures-v3.ts
// Vérifie : le résultat de codex_mesures_v3 lu clé par clé (une clé absente
// ou mal formée reste inconnue) ; la maîtrise unique, la file « À revoir »,
// les ratures scellées, le débrief et les causes ; la clé « v3 » de
// codex_lire acceptée seulement pour le programme demandé ; les mesures v3
// versées dans celles du moteur sans écraser les autres ; le plan des
// compteurs avant de connaître les capacités (toutes, journal 3) demande
// au moins tout ce que demande le plan à capacités connues.
import { avecMesuresV3, CAPACITES_TOUTES, MESURES_V3_VIDES, mesuresV3De, mesuresV3DeLecture, mesuresV3DeReponse } from "@/lib/codex/mesures-v3";
import { readFileSync } from "node:fs";
import { CAPACITES_VIDE } from "@/lib/codex/reglage";
import { LECTURE_VIDE, planifier, type Entree } from "@/lib/codex/moteur";
import { contenuDuProgramme } from "@/lib/codex/catalogue";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const J = JSON.stringify;

// ce que rend codex_mesures_v3 avec migration_v3_profil.sql collée (banc sim-codex-v3.mjs)
const brut = {
  programme: "finance/cfa-l1",
  capacites: { fil: true, mesures: true, journal: 3, seances: false, revoir: true, maitrise: true, trophees: true, debrief: true, ratures_seches: true },
  jours_encre_total: 12,
  programmes_menes: 0,
  maitres_total: 1,
  trophees: [{ source: "ciblee", palier: 3, n: 2 }, { source: 4, palier: 1, n: 1 }],
  notions_tenues: { "fsa:2": { n: 7, j5: 4 }, "fsa:3": { n: "x" } },
  speciaux_matiere: { serie_bonnes: { fsa: 10, quant: "?" }, serie_calculs: {} },
  maitrise: {
    fsa: { pct: 64, questions: 60, total: 212, debut: 48, statut: "mesuree", derniere: "2026-10-15T18:00:00+00:00", ancienne: 61 },
    quant: { pct: null, questions: 4, total: 4, debut: null, statut: "non_mesuree", derniere: "2026-10-01T08:00:00+00:00", ancienne: null },
    ethics: { pct: 50, questions: 20, statut: "inconnu" },
  },
  revoir: { aujourdhui: 14, demain: 1, ratures: 3, rappels: 11 },
  ratures_scellees: 2,
  blancs_a_debriefer: 1,
  causes: { savoir: 20, lecture: 40, calcul: 20, temps: 20, chance: 0, n: 5 },
};

console.log("# le résultat de codex_mesures_v3");
{
  const m = mesuresV3De(brut);
  check("capacités lues (journal 3)", m.capacites.journal === 3 && m.capacites.debrief && !m.capacites.seances);
  check("mesures du fil rouge et du catalogue taillé : une ligne ou une entrée mal formée est ignorée",
    m.jours_encre_total === 12 && J(m.trophees) === J([{ source: "ciblee", palier: 3, n: 2 }]) && J(m.notions_tenues) === J({ "fsa:2": { n: 7, j5: 4 } }) && J(m.speciaux_matiere) === J({ serie_bonnes: { fsa: 10 }, serie_calculs: {} }));
  const avecJustes = mesuresV3De({ ...brut, speciaux_matiere: { ...brut.speciaux_matiere, justes_sur_20: { fsa: 15, quant: "?" } } });
  check("les justes parmi les 20 dernières, par matière, quand la base les rend (absents : inconnus, l'étape « serie » hors jeu)", J(avecJustes.speciaux_matiere?.justes_sur_20) === J({ fsa: 15 }) && m.speciaux_matiere?.justes_sur_20 === undefined);
  check("maîtrise unique : par matière, statut connu seulement (pct null sous 10 réponses)",
    J(Object.keys(m.maitrise_unique ?? {})) === J(["fsa", "quant"]) && m.maitrise_unique?.fsa.statut === "mesuree" && m.maitrise_unique.fsa.ancienne === 61 && m.maitrise_unique.quant.pct === null,
    J(m.maitrise_unique));
  check("file « À revoir », ratures scellées, blancs à débriefer, causes", J(m.revoir) === J(brut.revoir) && m.ratures_scellees === 2 && m.blancs_a_debriefer === 1 && J(m.causes) === J(brut.causes));
  const sansB = mesuresV3De({ ...brut, maitrise: undefined, revoir: undefined, ratures_scellees: undefined, blancs_a_debriefer: undefined, causes: undefined });
  check("sans le couloir B : ces mesures restent inconnues", [sansB.maitrise_unique, sansB.revoir, sansB.ratures_scellees, sansB.blancs_a_debriefer, sansB.causes].every((x) => x === undefined));
  check("une file ou des causes incomplètes : inconnues", mesuresV3De({ ...brut, revoir: { aujourdhui: 3 } }).revoir === undefined && mesuresV3De({ ...brut, causes: { lecture: 30 } }).causes === undefined);
  check("autre chose qu'un objet : la base ne sait rien faire de nouveau", J(mesuresV3De(null)) === J(MESURES_V3_VIDES) && J(mesuresV3De([1])) === J(MESURES_V3_VIDES) && J(MESURES_V3_VIDES.capacites) === J(CAPACITES_VIDE));
}

console.log("\n# la clé « v3 » de codex_lire");
{
  check("acceptée pour le programme demandé", mesuresV3DeLecture(brut, "finance/cfa-l1")?.maitres_total === 1);
  check("refusée pour un autre programme (l'appel à part la remplace)", mesuresV3DeLecture(brut, "finance/cfa-l2") === null);
  check("absente (§5 pas collée, mesures en panne) : null", mesuresV3DeLecture(undefined, "finance/cfa-l1") === null && mesuresV3DeLecture("x", "finance/cfa-l1") === null);
  const mesures = avecMesuresV3({ xp_total: 900, maitrise: { fsa: { pct: 70, questions: 45, debut: 50 } } }, mesuresV3De(brut));
  check("versées dans les mesures du moteur : l'ancienne maîtrise reste (le rang la garde), les capacités n'y sont pas",
    mesures.xp_total === 900 && mesures.maitrise?.fsa.pct === 70 && mesures.maitrise_unique?.fsa.pct === 64 && mesures.revoir?.aujourdhui === 14 && !("capacites" in mesures));
}

console.log("\n# le plan des compteurs avant de connaître les capacités");
{
  const base = (capacites: Entree["capacites"]): Entree => ({
    contenu: contenuDuProgramme(), now: new Date("2026-10-17T10:00:00Z"), jour: "2026-10-17", jourJ: "2026-11-12", objectif: null, visiteVue: true,
    progression: [], contrats: [], premier: false, dernierCalcul: null, lecture: LECTURE_VIDE, pointsFaibles: [], capacites,
  });
  const cle = (d: ReturnType<typeof planifier>[number]) => J([d.evenement, d.filtre ?? null, d.fenetre ?? null, d.jour ?? null, d.distinct ?? null, d.somme ?? null, d.seuil]);
  const toutes = new Set(planifier(base(CAPACITES_TOUTES)).map(cle));
  const vides = planifier(base(CAPACITES_VIDE)).map(cle);
  const v3 = planifier(base(mesuresV3De(brut).capacites)).map(cle);
  check("CAPACITES_TOUTES : toutes vraies, journal 3", CAPACITES_TOUTES.journal === 3 && Object.entries(CAPACITES_TOUTES).every(([k, v]) => k === "journal" || v === true));
  check("le plan à toutes capacités contient celui sans capacité et celui du couloir B", vides.every((k) => toutes.has(k)) && v3.every((k) => toutes.has(k)), `${toutes.size} / ${vides.length} / ${v3.length}`);
  check("… et y ajoute les compteurs du journal v3 (séances justes)", [...toutes].some((k) => k.includes("seance_juste")) && !vides.some((k) => k.includes("seance_juste")));
}

// l'appel à part en panne : rien n'est évalué ni écrit (aucun acte clos, aucun lot)
{
  check("réponse : fonction absente → rien de nouveau (capacités vides)", mesuresV3DeReponse({ data: null, error: { code: "PGRST202" } }, true) === MESURES_V3_VIDES);
  check("réponse : autre erreur (délai, réseau) ou appel qui lève → null (en panne)", mesuresV3DeReponse({ data: null, error: { code: "57014" } }, false) === null && mesuresV3DeReponse(null, false) === null);
  check("réponse : lue clé par clé", mesuresV3DeReponse({ data: brut, error: null }, false)?.capacites.maitrise === true);
  const src = readFileSync("lib/codex/serveur.ts", "utf8");
  const i = src.indexOf("const v3 = v3Lu ?? mesuresV3DeLecture(");
  const panne = src.indexOf("if (!v3) {", i);
  const sortie = src.indexOf("return repli(user.id, jour);", panne);
  check("serveur.ts : mesures v3 en panne → consigné puis repli, avant l'évaluation et codex_ecrire",
    i > 0 && panne > i && sortie > panne && sortie < src.indexOf("evaluer(entree, compteurs)", i) && src.indexOf("evaluer(entree, compteurs)", i) < src.indexOf(`a.rpc("codex_ecrire"`, i));
}

console.log(ko ? `\n${ko} échec(s)` : "\nTout est vert.");
process.exit(ko ? 1 : 0);
