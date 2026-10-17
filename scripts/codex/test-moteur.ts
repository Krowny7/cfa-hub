// Tests légers du moteur du Codex (lib/codex/moteur.ts), sans base ni réseau.
//   npx tsx --tsconfig tsconfig.json scripts/codex/test-moteur.ts
// Vérifie : le catalogue, la cascade des prérequis (nœuds de convergence), la
// rétroactivité et ses plafonds, le tirage des contrats du jour, la
// recommandation, le dévoilement progressif, et que la table codex_matieres de
// migration_codex.sql reflète bien SUBJECTS (components/reviser/catalog.ts) ; puis
// un test par correction immédiate de docs/codex/V3.md §6 (élision, séance
// ciblée, objectifs à faire baisser, acte courant, veille, après le jour J,
// textes, XP affichée, migration_codex_v3.sql) ; enfin le fil rouge et le
// rattrapage au déploiement (V3 §1.5, §1.9 : un joueur de 12 000 réponses) ;
// le catalogue taillé (V3 §8.1 à §8.4, §8.6 : retraits, miroirs, actes I et V,
// quêtes hors jeu sans le SQL, prérequis souples, XP des contrats) ; la
// maîtrise unique, le cap et les mesures de la mémoire (V3 §4.6, §4.7, lot A4b) ;
// les tailles de fête et le mode sobre (V3 §3.10, §11.5, lot A9) ;
// le rythme long (V3 §10.2 à §10.5, lot A8 : plan daté, sprint, reprise, semaine,
// verdict, jours neutres de la série d'encre).
import { readFileSync } from "node:fs";
import { SUBJECTS } from "@/components/reviser/catalog";
import { notionsDeMatiere } from "@/lib/notions";
import { ACTES, COSMETIQUES_CODEX, DECOUVERTE, MODELES_CONTRATS, VAGUES_DECOUVERTE, PROGRAMME, SEUIL_ACTE_V, catalogueCodex, cibleeDe, compterCatalogue, contenuDuProgramme, phaseDe, plafondQuete, plafondRetro, questionsCiblee, titresMaitres, verifierCatalogue, xpContrat } from "@/lib/codex/catalogue";
import {
  LANCEMENT_CODEX, META_CODEX_VIDE, acteCourantDe, capacitesDe, dependancesDe, demandesActivite, semaineEntamee, devoiler, evaluer, indexerLecture, instanceContrat, libelle, lireActivite, maitriseDe, planifier, recommander, repliquesDeVague, revoirDe, tirerContrats,
  budgetDuJour, contexteDestination, repriseDuJour,
  type Demande, type Entree, type LectureSql, type LigneProgression, type MesuresSql, type ResultatCompteur,
} from "@/lib/codex/moteur";
import { construireVue } from "@/lib/codex/vue";
import { panneauDe } from "@/lib/codex/panneau";
import { CAPACITES_VIDE } from "@/lib/codex/reglage";
import { bilanDe, habitFete, tailleFete, type FeteCodex } from "@/lib/codex/bilan";
import { CLE_SOBRE, feteSobre, lireSobre } from "@/lib/codex/sobre";
import { de, gabarit } from "@/lib/codex/elision";
import { CODEX } from "@/lib/voice-codex";
import { CFA_L1 } from "@/lib/codex/programmes/cfa-l1";
import type { Quete } from "@/lib/codex/types";
import { quetesSemaine, xpSemaineEncre } from "@/lib/codex/catalogue";
import { JALONS_CFA_L1, commandesPossibles, dateApproximative, enReprise, estSprint, facteurBande, libelleEcart, lireSemaine, lireVerdict, matiereBanquier, planDe, recalageVerdict, sessionDe } from "@/lib/codex/plan";
import { matiereCoince } from "@/lib/codex/seance";
import { maitriseDuCodex } from "@/lib/codex/cap";
import { calculerSerie, joursDePause, lirePauses } from "@/lib/serie-encre";
import { decaleJour } from "@/lib/objectif-calc";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bandesValides, vueRythme } from "@/lib/codex/rythme";
import { destinationDe } from "@/lib/codex/destinations";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
/** les vérifications asynchrones, attendues avant le compte final */
const attentes: Promise<unknown>[] = [];

const contenu = contenuDuProgramme();
const jour = "2026-10-15";
const now = new Date("2026-10-15T10:00:00Z");
const base = (o: Partial<Entree> = {}): Entree => ({
  contenu, now, jour, jourJ: null, objectif: null, visiteVue: false, progression: [], contrats: [], premier: true, dernierCalcul: null,
  lecture: { compteurs: {}, mesures: { xp_total: 0 }, speciaux: {} }, ...o,
});
/** Répond aux demandes avec une fonction : (demande) -> n. */
const repondre = (e: Entree, f: (d: Demande) => number) => {
  const demandes = planifier(e);
  const brut: LectureSql = { ...e.lecture, compteurs: Object.fromEntries(demandes.map((d): [string, ResultatCompteur] => [d.id, { n: f(d), atteint: f(d) >= d.seuil ? "2026-09-01T10:00:00+00:00" : null }])) };
  const e2 = { ...e, lecture: brut };
  return { e: e2, r: evaluer(e2, indexerLecture(demandes, brut)), demandes };
};
const fait = (r: ReturnType<typeof evaluer>, id: string) => r.etats.find((s) => s.quete.id === id)?.fait === true;
const ouverte = (r: ReturnType<typeof evaluer>, id: string) => r.etats.find((s) => s.quete.id === id)?.ouverte === true;

console.log("# le catalogue");
check("verifierCatalogue() ne trouve rien", verifierCatalogue().length === 0, verifierCatalogue().join(" | "));
const cat = catalogueCodex();
check("269 quêtes (231 avant la v3, 38 ajoutées : V3 §8.8)", cat.length === 269, String(cat.length));

console.log("\n# un compte neuf (aucun historique)");
{
  const e = base();
  const { r, e: e2 } = repondre(e, () => 0);
  check("rien n'est fait", r.etats.every((s) => !s.fait));
  check("le prologue est ouvert (premier trait, jour J)", ouverte(r, "trame:prologue:premier-trait") && ouverte(r, "trame:prologue:jour-j"));
  check("« dix coups de pinceau » attend le premier trait", !ouverte(r, "trame:prologue:dix"));
  check("l'acte I attend le premier trait, l'acte II attend le prologue", !ouverte(r, "trame:a1:fiche") && !ouverte(r, "trame:a2:trois"));
  check("aucun contrat avant le tirage", r.contrats.length === 0);
  const reco = recommander(e2, r);
  check("LA prochaine quête : le premier trait", reco?.quete.id === "trame:prologue:premier-trait", reco?.quete.id);
  check("rien à écrire sauf les ouvertures (disponible)", r.lot.every((i) => i.etat === "disponible") && r.lot.length > 0, String(r.lot.length));
  check("cours, cartes et fiches ouvertes sont branchés (codexNoter) : leurs étapes bonus sont là, facultatives", r.etats.some((s) => s.quete.id === "branche:fsa:cours" && s.quete.optionnelle) && r.etats.some((s) => s.quete.id === "branche:fsa:flashcards" && s.quete.optionnelle));
}

console.log("\n# la cascade (le même historique valide tout ce qui est déjà rempli)");
{
  const e = base({ jourJ: "2027-02-20", lecture: { compteurs: {}, mesures: { xp_total: 0, maitrise: {}, ratures_ouvertes: { total: 0, matieres: {} } }, speciaux: {} } });
  // 60 réponses dans chaque matière, une session ciblée réussie dans chaque matière sauf Ethics
  const { r } = repondre(e, (d) => {
    if (d.evenement === "question_repondue") return 60;
    if (d.evenement === "session_terminee") return d.filtre && d.filtre.matiere === "ethics" ? 0 : 1;
    if (d.evenement === "drill_page_terminee") return 1;
    return 0;
  });
  check("prologue : premier trait, dix, jour J fixé, première séance → fait", fait(r, "trame:prologue:premier-trait") && fait(r, "trame:prologue:dix") && fait(r, "trame:prologue:jour-j") && fait(r, "trame:prologue:premiere-seance"));
  check("l'acte du prologue est clos (la visite est facultative)", r.actesClos.includes("prologue"));
  check("acte I : « première fiche » faite en cascade", fait(r, "trame:a1:fiche"));
  check("acte II : « les dix pigments » faite (toutes les branches ont fait leur premier pas)", fait(r, "trame:a2:dix"));
  const drill = r.etats.find((s) => s.quete.id === "branche:fsa:drill");
  check("branche fsa : premier pas et fiche en cascade ; le drill complet (pages inconnues) est hors jeu et masqué, il ne bloque pas la séance ciblée (V3 §8)", fait(r, "branche:fsa:entree") && fait(r, "branche:fsa:fiche") && !fait(r, "branche:fsa:drill") && !!drill?.horsJeu && drill.masquee && fait(r, "branche:fsa:ciblee"));
  check("nœud de convergence : l'acte V reste fermé (l'acte IV n'est pas clos)", !ouverte(r, "trame:a5:blanc") && !r.actesClos.includes("acte4"));
  check("Ethics (sans drill) : sa séance ciblée est ouverte dès le premier pas, mais pas faite", ouverte(r, "branche:ethics:ciblee") && !fait(r, "branche:ethics:ciblee"));
  const retro = r.lot.filter((i) => i.etat === "terminee");
  check("tout ce qui est validé au premier calcul est rétroactif (sauf les contrats)", retro.length > 10 && retro.filter((i) => i.famille !== "contrat").every((i) => i.retro === true), String(retro.length));
  check("les contrats de la semaine ne sont jamais rétroactifs", retro.filter((i) => i.famille === "contrat").every((i) => i.retro === false));
  check("la date d'atteinte vient du compteur", retro.some((i) => i.atteint?.startsWith("2026-09-01")));
  check("le plafond par quête est la moitié du niveau (niveau 1 : 50)", retro.every((i) => i.plafond === plafondQuete(1)) && plafondQuete(1) === 50);
  check("le budget rétroactif est un niveau entier (100 XP au niveau 1)", r.budgetRetro === plafondRetro(1) && r.budgetRetro === 100);
  check("l'acte du prologue part avec son titre « Apprenti »", retro.some((i) => i.quete === "acte:prologue" && i.cosmetique === "titre:apprenti"));
  check("aucune quête n'est écrite deux fois dans le lot", new Set(r.lot.map((i) => i.quete + "|" + i.periode)).size === r.lot.length);
}

console.log("\n# le nœud de convergence de l'acte V");
{
  const e = base({
    premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), jourJ: "2027-02-20",
    lecture: {
      compteurs: {},
      mesures: {
        xp_total: 5000, serie: 4, meilleure_serie: 10,
        notions: Object.fromEntries(contenu.flatMap((m) => notionsDeMatiere(m.key).map((n) => [n.id, 10]))),
        drill_totaux: { fsa: 1, equity: 1, economics: 1, fixed_income: 1, portfolio: 1 },
        drill_pages: ["fsa", "equity", "economics", "fixed_income", "portfolio"].map((m) => ({ matiere: m, page: 1, meilleur: 90 })),
        ratures_ouvertes: { total: 10, matieres: {} },
        maitrise: Object.fromEntries(contenu.map((m) => [m.key, { pct: 90, questions: 200, debut: 50 }])),
        jours: Array.from({ length: 6 }, (_, w) => [0, 1, 2, 3, 4].map((d) => ({ jour: new Date(Date.UTC(2026, 8, 7 + 7 * w + d)).toISOString().slice(0, 10), n: 20 }))).flat(),
      },
      speciaux: {},
    },
  });
  const { r } = repondre(e, () => 99);
  check("avec tout validé : toutes les branches ont passé leur séance ciblée", contenu.every((m) => fait(r, `branche:${m.key}:ciblee`)));
  check("l'acte IV est clos et l'acte V s'ouvre (acte IV clos + 8 branches sur 10 à leur séance ciblée)", r.actesClos.includes("acte4") && ouverte(r, "trame:a5:blanc"));
  check("prérequis tombés après coup : les quêtes déjà remplies sont validées avec leur date, donc rétroactives", r.lot.filter((i) => i.etat === "terminee" && i.atteint?.startsWith("2026-09-01") && i.famille !== "contrat").every((i) => i.retro === true));
  // V3 §1.8 : sans les capacités de la base (rien de collé), rien ne change
  const cap = capacitesDe(e);
  check("v3 §1.8 : sans capacités, toutes fausses (journal 2), aucun item « fil » dans le lot", Object.entries(cap).every(([k, v]) => (k === "journal" ? v === 2 : v === false)) && r.lot.every((i) => (i.famille as string) !== "fil"));
  check("v3 §1.8 : sans capacités, les actes III et V se closent comme aujourd'hui, « Maître de… » atteignable", r.actesClos.includes("acte3") && r.actesClos.includes("acte5") && contenu.every((m) => fait(r, `branche:${m.key}:maitre`)), r.actesClos.join());
}

console.log("\n# la récompense d'une quête gagnée aujourd'hui n'est pas rétroactive");
{
  const e = base({ premier: false, dernierCalcul: new Date("2026-10-15T09:00:00Z") });
  const demandes = planifier(e);
  const brut: LectureSql = { compteurs: Object.fromEntries(demandes.map((d): [string, ResultatCompteur] => [d.id, d.evenement === "question_repondue" && !d.filtre ? { n: 1, atteint: "2026-10-15T09:30:00+00:00" } : { n: 0, atteint: null }])), mesures: { xp_total: 0 }, speciaux: {} };
  const r = evaluer({ ...e, lecture: brut }, indexerLecture(demandes, brut));
  const t = r.lot.find((i) => i.quete === "trame:prologue:premier-trait");
  check("le premier trait de 9 h 30 (après le dernier calcul) : terminée, pas rétroactive, 20 XP", t?.etat === "terminee" && t.retro === false && t.xp === 20, JSON.stringify(t));
  check("et ouvre la suivante, déjà entamée (1 réponse sur 10)", r.lot.some((i) => i.quete === "trame:prologue:dix" && i.etat === "active" && i.progression === 1 && i.cible === 10), JSON.stringify(r.lot.find((i) => i.quete === "trame:prologue:dix")));
}

console.log("\n# les contrats du jour");
{
  // des joueurs actifs (une réponse hier) : sans elle, ce serait le jour de la reprise douce (V3 §10.4)
  const e = base({
    premier: false,
    lecture: { compteurs: {}, mesures: { xp_total: 0, maitrise: { fsa: { pct: 48, questions: 120, debut: 40 } }, ratures_ouvertes: { total: 12, matieres: {} }, jours: [{ jour: "2026-10-01", n: 300 }, { jour: "2026-10-14", n: 10 }] }, speciaux: {} },
    pointsFaibles: [{ notion: "fixed_income:11", score: 80 }],
  });
  const t1 = tirerContrats(e, "joueur-1");
  const t2 = tirerContrats(e, "joueur-1");
  check("3 contrats, un par emplacement", t1.length === 3 && new Set(t1.map((c) => c.emplacement)).size === 3, JSON.stringify(t1.map((c) => c.modele)));
  check("tirage déterministe (joueur + jour)", JSON.stringify(t1) === JSON.stringify(t2));
  const duree = t1.reduce((s, c) => s + (MODELES_CONTRATS.find((m) => m.id === c.modele)?.duree ?? 0), 0);
  check("le trio tient en 45 minutes", duree <= 45, `${duree} min`);
  check("aucun modèle dont l'événement n'est pas suivi (cours, flashcards)", !t1.some((c) => c.modele === "cours" || c.modele === "flashcards"));
  const autres = new Set(Array.from({ length: 30 }, (_, i) => tirerContrats(e, "joueur-" + i).map((c) => c.modele).join(",")));
  check("des joueurs différents ont des tirages différents", autres.size > 3, String(autres.size));
  const hier = tirerContrats(e, "joueur-1", { faiblesse: t1[0].modele });
  check("le modèle de la veille n'est pas retiré dans le même emplacement", hier[0].modele !== t1[0].modele || MODELES_CONTRATS.filter((m) => m.emplacement === "faiblesse").length < 2);
  const sans = tirerContrats({ ...e, pointsFaibles: [], lecture: { compteurs: {}, mesures: { xp_total: 0 }, speciaux: {} } }, "joueur-1");
  check("sans point faible ni ratures : pas de contrat « notion », « ratures » ni « 30 du jour »", !sans.some((c) => c.modele === "notion-faible" || c.modele === "ratures" || c.modele === "defi"));
  // les instances sont évaluées comme n'importe quelle quête, avec leur jour
  const e2 = base({ premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), contrats: t1, lecture: e.lecture, pointsFaibles: e.pointsFaibles });
  const { r, demandes } = repondre(e2, (d) => (d.fenetre === "jour" ? 99 : 0));
  check("trois instances du jour (contrat:<modèle>:<jour>)", r.contrats.length === 3 && r.contrats.every((i) => i.quete.id.endsWith(":" + jour)));
  check("les demandes de contrat portent le jour et la fenêtre « jour »", demandes.some((d) => d.fenetre === "jour" && d.jour === jour));
  const xpAttendue = (id: string) => xpContrat(MODELES_CONTRATS.find((m) => id.startsWith(`contrat:${m.id}:`))?.duree ?? 0);
  check("trois contrats faits = trio fait (+50 XP), chacun l'XP de sa durée (V3 §8.6)", r.trioFait && r.lot.some((i) => i.quete === `contrat:trio:${jour}` && i.xp === 50) && r.lot.filter((i) => i.famille === "contrat" && i.quete !== `contrat:trio:${jour}` && i.xp === xpAttendue(i.quete)).length === 3);
  check("jamais rétroactif", r.lot.filter((i) => i.famille === "contrat").every((i) => !i.retro));
  const deja: LigneProgression[] = r.lot.filter((i) => i.famille === "contrat").map((i) => ({ quete_id: i.quete, periode: i.periode, etat: "recompensee", progression: 1, cible: 1, ouverte_le: now.toISOString(), terminee_le: now.toISOString(), recompensee_le: now.toISOString(), retro: false, xp: i.xp ?? 0, cosmetique: null, titre: null, vu: false }));
  const r2 = repondre({ ...e2, progression: deja }, (d) => (d.fenetre === "jour" ? 99 : 0)).r;
  check("déjà récompensés : rien à réécrire (idempotence côté moteur)", !r2.lot.some((i) => i.famille === "contrat" && i.etat === "terminee"));
}

console.log("\n# la fenêtre « depuis l'ouverture » (épilogue) : pas de rétroactivité");
{
  const e = base({ premier: true, jourJ: "2026-11-05" });
  const { r, demandes } = repondre(e, (d) => (d.evenement === "examen_blanc_rendu" ? 3 : d.evenement === "question_repondue" ? 99 : 0));
  const ep = demandes.find((d) => d.evenement === "examen_blanc_rendu" && JSON.stringify(d.fenetre).includes("depuis"));
  check("J-21 : la répétition générale est ouverte, sa demande compte depuis l'ouverture", !!ep && ouverte(r, "trame:ep:blanc"));
  check("validée au premier calcul mais JAMAIS rétroactive", r.lot.filter((i) => i.quete === "trame:ep:blanc").every((i) => i.retro === false));
}

console.log("\n# la prochaine quête pèse la matière");
{
  const e = base({
    premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), jourJ: "2027-03-01",
    lecture: { compteurs: {}, mesures: { xp_total: 3000, maitrise: { ethics: { pct: 92, questions: 300, debut: 60 }, fsa: { pct: 30, questions: 100, debut: 30 }, equity: { pct: 90, questions: 100, debut: 60 } }, ratures_ouvertes: { total: 3, matieres: {} } }, speciaux: {} },
  });
  const { r, e: e2 } = repondre(e, (d) => (d.evenement === "question_repondue" ? 80 : d.evenement === "drill_page_terminee" ? 1 : d.evenement === "session_terminee" ? 1 : 0));
  const reco = recommander(e2, r);
  check("une seule recommandation, ouverte et non faite", !!reco && !fait(r, reco.quete.id) && ouverte(r, reco.quete.id), reco?.quete.id);
  check("avec une ligne de pourquoi", !!reco && reco.pourquoi.length > 10, reco?.pourquoi);
  const vue = construireVue(e2, r, reco, { devoile: null });
  check("la vue : 10 branches, 8 actes, 9 chaînes au long cours (6 retirées, V3 §8.1)", vue.branches.length === 10 && vue.trame.length === 8 && vue.longCours.length === 9, `${vue.branches.length}/${vue.trame.length}/${vue.longCours.length}`);
  check("la vue : les exploits cachés ne sont pas montrés", vue.exploits.every((x) => x.affichage !== "cache"));
}

console.log("\n# le dévoilement progressif");
{
  const neuf = { inscritLe: "2026-10-16T09:00:00+02:00", questions: 0, faites: new Set<string>(), now: new Date("2026-10-16T09:01:00+02:00"), jour: "2026-10-16" };
  let d = devoiler(META_CODEX_VIDE, neuf);
  check("minute 1 : rien (Accueil, Codex, Moi seuls)", d.devoile !== "tout" && d.devoile.length === 0);
  d = devoiler(META_CODEX_VIDE, { ...neuf, faites: new Set(["trame:prologue:premier-trait|"]) });
  check("premier trait : Réviser et les branches", d.devoile !== "tout" && d.devoile.includes("reviser") && d.devoile.includes("branches") && !d.devoile.includes("entrainer"));
  d = devoiler({ devoile: d.devoile, jours: d.jours }, { ...neuf, faites: new Set(["trame:prologue:premier-trait|", "trame:prologue:dix|"]) });
  check("10 questions : la vague 2, S'entraîner et les contrats", d.devoile !== "tout" && d.nouveaux.join() === "entrainer,contrats", d.nouveaux.join());
  d = devoiler({ devoile: d.devoile, jours: d.jours }, { ...neuf, faites: new Set(["trame:prologue:premier-trait|", "trame:prologue:dix|", "trame:prologue:premiere-seance|"]) });
  check("une séance entière : la vague 3, classement, long cours (et fil rouge), exploits", d.devoile !== "tout" && d.nouveaux.join() === "classement,longcours,exploits", d.nouveaux.join());
  const a = (min: number) => devoiler(META_CODEX_VIDE, { ...neuf, now: new Date(Date.parse(neuf.inscritLe) + min * 60_000) }).devoile;
  check("10 minutes : la vague 1 seule", JSON.stringify(a(10)) === JSON.stringify(["reviser", "branches"]) && JSON.stringify(a(9)) === "[]", JSON.stringify(a(10)));
  check("20 minutes : les vagues 1 et 2", JSON.stringify(a(20)) === JSON.stringify(["reviser", "branches", "entrainer", "contrats"]) && !a(44).includes("classement"), JSON.stringify(a(20)));
  check("un duel seul ne dévoile plus le classement (déclencheurs communs de la vague 3)", !(devoiler(META_CODEX_VIDE, { ...neuf, faites: new Set(["trame:a1:duel|"]) }).devoile as string[]).includes("classement"));
  check("les lignes d'une vague partagent ses déclencheurs, les trois vagues sont remplies", DECOUVERTE.every((x) => x.quand === VAGUES_DECOUVERTE[x.vague]) && ([1, 2, 3] as const).every((v) => DECOUVERTE.some((x) => x.vague === v)));
  check("les identifiants rangés dans rl_codex.devoile ne changent pas", DECOUVERTE.map((x) => x.id).sort().join() === "branches,classement,contrats,entrainer,exploits,longcours,reviser");
  // Léonard : une réplique par vague, celle du premier dévoilement de la vague
  check("tout d'un coup : trois répliques, une par vague", [...repliquesDeVague(DECOUVERTE.map((x) => x.id), [])].join() === "reviser,entrainer,classement");
  check("une vague déjà entamée ne fait plus parler Léonard", repliquesDeVague(["contrats"], ["reviser", "branches", "entrainer"]).size === 0);
  check("la première ligne dévoilée d'une vague parle, même si ce n'est pas la première du catalogue", [...repliquesDeVague(["branches", "longcours"], ["reviser"])].join() === "longcours");
  {
    const { r, e } = repondre(base(), () => 0);
    const tout = devoiler(META_CODEX_VIDE, { ...neuf, jour: "2026-10-17", now: new Date("2026-10-17T09:00:00+02:00") });
    const v = construireVue(e, r, null, { devoile: tout });
    const parle = v.devoileNouveaux.filter((x) => x.replique);
    check("la vue : sept dévoilements, trois répliques", v.devoileNouveaux.length === 7 && parle.map((x) => x.id).join() === "reviser,entrainer,classement", parle.map((x) => x.id).join());
    check("le bilan porte les mêmes répliques", bilanDe(v).devoile?.nouveaux.filter((x) => x.replique).length === 3);
  }
  d = devoiler(META_CODEX_VIDE, { ...neuf, now: new Date("2026-10-16T09:50:00+02:00") });
  check("45 minutes : tout est là, sans rien avoir fait", d.devoile !== "tout" && d.devoile.length === 7, d.devoile === "tout" ? "tout" : String(d.devoile.length));
  d = devoiler({ devoile: [], jours: ["2026-10-16"] }, { ...neuf, jour: "2026-10-17" });
  check("le 2e jour de visite : tout est là", d.devoile !== "tout" && d.devoile.length === 7);
  d = devoiler({ devoile: "tout", jours: [] }, neuf);
  check("« Tout montrer » est définitif", d.devoile === "tout");
  d = devoiler(META_CODEX_VIDE, { ...neuf, inscritLe: "2026-05-01T00:00:00Z" });
  check("compte inscrit avant le lancement : tout visible d'emblée", d.devoile === "tout" && Date.parse("2026-05-01") < Date.parse(LANCEMENT_CODEX));
  d = devoiler(META_CODEX_VIDE, { ...neuf, questions: 50 });
  check("50 questions et plus : tout visible", d.devoile === "tout");
}

console.log("\n# v3 §6.1 : l'élision devant un nom de matière");
{
  const cat2 = catalogueCodex();
  const titre = (id: string) => cat2.find((q) => q.id === id)?.titre;
  check("« Le tour d'Ethics », « Le tour de FSA »", titre("branche:ethics:tour") === "Le tour d'Ethics" && titre("branche:fsa:tour") === "Le tour de FSA", `${titre("branche:ethics:tour")} / ${titre("branche:fsa:tour")}`);
  check("« Maître d'Equity » (quête et titre gagné)", titre("branche:equity:maitre") === "Maître d'Equity" && titresMaitres().find((c) => c.cle === "titre:maitre:equity")?.nom === "Maître d'Equity");
  check("contrat : « Séance d'Economics », « Une page d'Equity »", libelle("Séance de {matiere}", { matiere: "economics" }) === "Séance d'Économie" || libelle("Séance de {matiere}", { matiere: "economics" }) === "Séance d'Economics", libelle("Séance de {matiere}", { matiere: "economics" }));
  check("« Une page de {fiche} » élide devant Equity", libelle("Une page de {fiche}", { fiche: "equity" }) === "Une page d'Equity", libelle("Une page de {fiche}", { fiche: "equity" }));
  check("pas d'élision devant une consonne ou un chiffre", de("Quant") === "de Quant" && gabarit("de {n} questions", { n: "14" }) === "de 14 questions");
  check("aucune quête ne dit plus « de » devant une voyelle", !cat2.some((q) => /\bde [AEIOUÉÈaeiouéè]/.test(q.titre + " " + q.consigne)), cat2.filter((q) => /\bde [AEIOUÉÈaeiouéè]/.test(q.titre + " " + q.consigne)).map((q) => q.id).join(" "));
}

console.log("\n# v3 §6.5 : la séance ciblée à la taille réelle de la matière");
{
  const poids = (k: string) => contenu.find((m) => m.key === k)!.poids;
  check("même arrondi que la base : Quant 14, Derivatives 12, Ethics 32 en format 180", questionsCiblee(poids("quant"), 180) === 14 && questionsCiblee(poids("derivatives"), 180) === 12 && questionsCiblee(poids("ethics"), 180) === 32);
  check("seuil : Quant, Economics, Corporate 14 ; Derivatives 12 ; les autres 15", ["quant", "economics", "corporate"].every((k) => cibleeDe(poids(k)).questions === 14) && cibleeDe(poids("derivatives")).questions === 12 && ["ethics", "fsa", "equity", "fixed_income", "alternatives", "portfolio"].every((k) => cibleeDe(poids(k)).questions === 15));
  check("format : 90 pour Ethics (16 questions), 180 pour les autres", cibleeDe(poids("ethics")).format === 90 && cibleeDe(poids("quant")).format === 180 && cibleeDe(poids("fsa")).format === 180);
  const q = catalogueCodex().find((x) => x.id === "branche:quant:ciblee")!;
  const f = (q.objectif as { filtre?: { questions?: { min?: number } } }).filtre;
  check("branche Quant : 14 questions au moins, lien en format 180", f?.questions?.min === 14 && q.lien === "/practice?topic=quant&format=180" && q.consigne.includes("14 questions"), `${f?.questions?.min} ${q.lien}`);
  check("acte II, « Une matière, une séance » : lien en format 180", catalogueCodex().find((x) => x.id === "trame:a2:ciblee")?.lien === "/practice?format=180");
  const qe = catalogueCodex().find((x) => x.id === "branche:ethics:ciblee")!;
  check("branche Ethics : 15 questions, format par défaut", (qe.objectif as { filtre?: { questions?: { min?: number } } }).filtre?.questions?.min === 15 && qe.lien === "/practice?topic=ethics");
  const m = MODELES_CONTRATS.find((x) => x.id === "matiere-faible")!;
  const inst = instanceContrat(m, { matiere: "derivatives" }, jour, contenu);
  const fi = (inst.objectif as { filtre?: { questions?: { min?: number } } }).filtre;
  check("contrat « Séance d'Instruments Dérivés » : 12 questions, lien en format 180", fi?.questions?.min === 12 && inst.lien === "/practice?topic=derivatives&format=180" && inst.consigne.includes("12 questions") && inst.titre === "Séance d'Instruments Dérivés", `${inst.titre} · ${inst.consigne} · ${inst.lien}`);
  // une séance Quant de 14 questions à 80 % remplit la branche
  const e = base({ premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), lecture: { compteurs: {}, mesures: { xp_total: 0, drill_totaux: {} }, speciaux: {} } });
  const { r } = repondre(e, (d) => (d.evenement === "question_repondue" ? 60 : d.evenement === "session_terminee" ? ((d.filtre?.questions as { min?: number } | undefined)?.min ?? 99) <= 14 ? 1 : 0 : 0));
  check("une séance Quant de 14 questions suffit à la branche (l'acte V redevient possible)", fait(r, "branche:quant:ciblee"));
}

console.log("\n# v3 §6.8 : les objectifs « à faire baisser », le drill complet, la continuité");
{
  const avec = (total: number, extra: Partial<Entree["lecture"]["mesures"]> = {}) =>
    base({ premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), lecture: { compteurs: {}, mesures: { xp_total: 0, ratures_ouvertes: { total, matieres: {} }, ...extra }, speciaux: {} } });
  const ev = (rr: ReturnType<typeof evaluer>, id: string) => rr.etats.find((s) => s.quete.id === id)!;
  const loin = repondre(avec(120), (d) => (d.evenement === "question_repondue" ? 2000 : 0)).r;
  const pres = repondre(avec(60), (d) => (d.evenement === "question_repondue" ? 2000 : 0)).r;
  const a = ev(loin, "longcours:carnet:1"), b = ev(pres, "longcours:carnet:1");
  const fa = a.ev!.valeur / a.ev!.cible, fb = b.ev!.valeur / b.ev!.cible;
  check("« 100 ratures au plus » : la jauge n'est pas pleine à 120 ratures", !a.fait && fa < 1, fa.toFixed(2));
  check("et elle monte quand les ratures baissent (120 → 60)", fb > fa, `${fa.toFixed(2)} → ${fb.toFixed(2)}`);
  const seul = repondre(avec(120, { maitrise: {} }), () => 0).r;
  const vente = ev(seul, "exploit:velin-immacule");
  check("« aucune rature » : 120 ratures, jauge presque vide", !!vente.ev && vente.ev.valeur / vente.ev.cible < 0.5);
  // le drill complet : pages passées sur pages de la fiche
  const d = avec(0, { drill_totaux: { fsa: 6 }, drill_pages: [{ matiere: "fsa", page: 1, meilleur: 80 }] });
  const rd = repondre(d, (x) => (x.evenement === "question_repondue" ? 60 : x.evenement === "drill_page_terminee" ? 1 : 0)).r;
  const dr = ev(rd, "branche:fsa:drill");
  check("« Le drill complet » après une page : 1/6, pas 2/2", !dr.fait && dr.ev?.valeur === 1 && dr.ev?.cible === 6, `${dr.ev?.valeur}/${dr.ev?.cible}`);
  const d6 = avec(0, { drill_totaux: { fsa: 6 }, drill_pages: [1, 2, 3, 4, 5, 6].map((p) => ({ matiere: "fsa", page: p, meilleur: 80 })) });
  check("six pages sur six : fait", fait(repondre(d6, (x) => (x.evenement === "question_repondue" ? 60 : x.evenement === "drill_page_terminee" ? 1 : 0)).r, "branche:fsa:drill"));
  // la continuité : une quête « à faire baisser » loin du but n'a pas le bonus « à moitié faite »
  const ep = { ...avec(120), jourJ: "2026-10-30" };
  const rep = repondre(ep, () => 0);
  const vc = construireVue(rep.e, rep.r, null, { devoile: null });
  const net = vc.trame.flatMap((x) => x.quetes).find((x) => x.id === "trame:ep:carnet");
  check("« Nettoyer le carnet » à 120 ratures (seuil 20) : jauge basse, la valeur mesurée gardée", !!net && net.fraction < 0.5 && net.baisse?.actuel === 120 && net.baisse.seuil === 20, `${net?.fraction} ${JSON.stringify(net?.baisse)}`);
  const reco = recommander(rep.e, rep.r);
  check("la continuité ne la pousse plus : son avancée est sous la moitié", reco?.quete.id !== "trame:ep:carnet" || reco.avancee < 0.5, `${reco?.quete.id} ${reco?.avancee}`);
}

console.log("\n# v3 §6.9 : l'acte courant (l'acte I parallèle ne le capte plus)");
{
  check("prologue en cours : le prologue", acteCourantDe([])?.id === "prologue");
  check("prologue clos, acte I ouvert : l'acte II (le fil)", acteCourantDe(["prologue"])?.id === "acte2");
  check("prologue et acte II clos, acte I pas fini : l'acte III", acteCourantDe(["prologue", "acte2"])?.id === "acte3");
  check("tout le fil clos : l'acte I reste à finir", acteCourantDe(["prologue", "acte2", "acte3", "acte4", "acte5", "acte6"])?.id === "acte1");
  const e = base({ premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), progression: ["prologue", "acte1"].map((a): LigneProgression => ({ quete_id: `acte:${a}`, periode: "", etat: "recompensee", progression: 1, cible: 1, ouverte_le: now.toISOString(), terminee_le: now.toISOString(), recompensee_le: now.toISOString(), retro: false, xp: 10, cosmetique: null, titre: null, vu: a !== "acte1" })) });
  const { r, e: e2 } = repondre(e, () => 0);
  const b = bilanDe(construireVue(e2, r, null, { devoile: null }));
  check("l'acte I se referme : fanfare, mais pas de « rideau » (le fil n'a pas bougé)", b.fetes.some((f) => f.quete === "acte:acte1") && b.acteNouveau === null);
  check("l'acte I est bien marqué parallèle", ACTES.find((a) => a.id === "acte1")?.parallele === true);
}

console.log("\n# v3 §6.10 : la veille, de J-3 à J-1");
for (const [j, attendu] of [[4, false], [3, true], [2, true], [1, true], [0, false]] as const) {
  const jj = new Date(Date.parse(jour + "T12:00:00Z") + j * 86400000).toISOString().slice(0, 10);
  const { r } = repondre(base({ jourJ: jj }), () => 0);
  check(`J-${j} : « La veille » ${attendu ? "ouverte" : "fermée"}`, ouverte(r, "trame:ep:veille") === attendu);
}

console.log("\n# v3 §6.11 : après le jour J");
{
  check("phase « apres » une fois le jour J passé, « fondations » sans jour J", phaseDe(-1) === "apres" && phaseDe(-40) === "apres" && phaseDe(null) === "fondations" && phaseDe(0) === "veillee");
  check("l'en-tête : « C'est le jour J » le jour même, rien après", CODEX.jourJ(0) === "C'est le jour J" && CODEX.jourJ(-3) === null && CODEX.jourJ(5) === "J-5");
  const { r, e: e2 } = repondre(base({ jourJ: "2026-10-01" }), () => 0);
  const v = construireVue(e2, r, null, { devoile: null });
  check("la vue dit « Après l'épreuve »", v.phase === "apres" && v.phaseNom === "Après l'épreuve", v.phaseNom);
  const t = tirerContrats({ ...base({ jourJ: "2026-10-01" }), lecture: { compteurs: {}, mesures: { xp_total: 0, ratures_ouvertes: { total: 12, matieres: {} }, jours: [{ jour: "2026-09-01", n: 400 }, { jour: "2026-10-14", n: 10 }] }, speciaux: {} } }, "joueur-1");
  check("les contrats se tirent encore après l'examen", t.length === 3, String(t.length));
  // le jour J, même un prologue encore ouvert ne fait rien recommander (V3 §7.4)
  const { r: rJ, e: eJ } = repondre(base({ jourJ: jour }), () => 0);
  check("le jour J, prologue ouvert : aucune quête recommandée", ouverte(rJ, "trame:prologue:premier-trait") && recommander(eJ, rJ) === null, recommander(eJ, rJ)?.quete.id);
}

console.log("\n# v3 §6.12 : les textes qui mentent");
{
  const notion = MODELES_CONTRATS.find((m) => m.id === "notion-faible")!;
  check("« Sur la notion : … » (pas « Atelier : » : toute réponse compte)", notion.titre.startsWith("Sur la notion") && !notion.titre.startsWith("Atelier"));
  const lecture = { compteurs: {}, mesures: { xp_total: 0, maitrise: {}, ratures_ouvertes: { total: 0, matieres: {} }, jours: [{ jour: "2026-10-01", n: 300 }, { jour: "2026-10-14", n: 10 }] }, speciaux: {} };
  const tirer = (activite?: Entree["activite"]) => Array.from({ length: 40 }, (_, i) => tirerContrats({ ...base({ lecture }), activite }, "j" + i)).flat();
  check("sans l'activité par matière : jamais « prend la poussière »", !tirer().some((c) => c.modele === "matiere-oubliee"));
  const activite = Object.fromEntries(contenu.map((m) => [m.key, { recentes: m.key === "equity" || m.key === "quant" ? 0 : 5, total: m.key === "quant" ? 0 : 50 }]));
  const oub = tirer(activite).filter((c) => c.modele === "matiere-oubliee");
  check("« prend la poussière » : une matière déjà travaillée, sans réponse depuis 10 jours (Equity, pas Quant jamais ouverte)", oub.length > 0 && oub.every((c) => c.params.matiere === "equity"), oub.map((c) => c.params.matiere).join());
  const dem = demandesActivite(contenu, jour);
  const act = lireActivite(contenu, { compteurs: Object.fromEntries(dem.map((d) => [d.id, { n: d.id.endsWith(":total") ? 9 : 0, atteint: null }])), mesures: {}, speciaux: {} });
  check("l'activité se demande à la base (fenêtre de 10 jours et depuis toujours)", dem.length === 2 * contenu.length && dem.some((d) => JSON.stringify(d.fenetre) === '{"jours":10}') && act.fsa.total === 9 && act.fsa.recentes === 0);
  const m = MODELES_CONTRATS.find((x) => x.id === "matiere-oubliee")!;
  check("sa consigne dit vrai (10 jours au moins)", libelle(m.consigne, { matiere: "equity" }).includes("10 jours au moins") && libelle(m.consigne, { matiere: "equity" }).includes("d'Investissements en Actions"), libelle(m.consigne, { matiere: "equity" }));
}

console.log("\n# v3 §1.5 et §1.9 : le fil rouge et le rattrapage (un joueur de 12 000 réponses)");
{
  const ligneFaite = (id: string, o: Partial<LigneProgression> = {}): LigneProgression => ({
    quete_id: id, periode: "", etat: "recompensee", progression: 1, cible: 1, ouverte_le: "2026-09-01T00:00:00Z", terminee_le: "2026-09-01T00:00:00Z",
    recompensee_le: "2026-09-01T00:00:00Z", retro: true, xp: 0, cosmetique: null, titre: null, vu: true, ...o,
  });
  const AVEC_FIL = { ...CAPACITES_VIDE, fil: true };
  // un joueur avancé : prologue clos, 12 000 réponses, 45 jours d'encre ; premier calcul v3 (aucun marqueur), la base sait écrire le fil
  const avance = (o: Partial<Entree> = {}) =>
    base({
      premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), jourJ: "2026-11-12", progression: [ligneFaite("acte:prologue")], capacites: AVEC_FIL, capacitesVues: null,
      lecture: { compteurs: {}, mesures: { xp_total: 30000, jours_encre_total: 45, maitres_total: 0, programmes_menes: 0, trophees: [] }, speciaux: {} },
      ...o,
    });
  const toutes = (d: Demande) => (d.evenement === "question_repondue" && !d.filtre ? 12000 : 0);
  const { r, e: e1 } = repondre(avance(), toutes);
  const fil = r.lot.filter((i) => i.famille === "fil");
  const faits = fil.filter((i) => i.etat === "terminee").map((i) => i.quete).sort();
  check("un seul calcul verse les 5 paliers atteints (4 du copiste, 1 de l'encre)", faits.join(" ") === "fil:encre:1 fil:questions:1 fil:questions:2 fil:questions:3 fil:questions:4", faits.join(" "));
  check("le palier suivant est en cours (12 000 / 20 000), pas versé", fil.some((i) => i.quete === "fil:questions:5" && i.etat === "active" && i.progression === 12000 && i.cible === 20000));
  const termines = r.lot.filter((i) => i.etat === "terminee");
  // (les quêtes d'avant la v3 que ce profil factice n'a pas en base suivent la règle d'avant : une mesure remplie sans date n'est pas rétro)
  const rattrapees = termines.filter((i) => i.famille === "fil");
  check("tout le nouveau versé est en rétro : une seule cérémonie, aucune fête par quête", rattrapees.length === 5 && rattrapees.every((i) => i.retro === true), termines.filter((i) => !i.retro).map((i) => i.quete).join(" "));
  const verse = Math.min(r.budgetRetro, termines.filter((i) => i.retro).reduce((s, i) => s + Math.min(i.xp ?? 0, i.plafond ?? 0), 0));
  check(`XP versée ≤ plafondRetro (${verse} ≤ ${plafondRetro(r.niveau)})`, verse <= plafondRetro(r.niveau) && r.budgetRetro === plafondRetro(r.niveau));
  check("le marqueur à écrire : la capacité « fil » vue", r.capacitesVues?.fil === true);
  const v = construireVue(e1, r, null, { devoile: null });
  check("la vue : 7 chapitres, le copiste en cours au 5e palier, tamponnable (pas « à venir »)", v.filRouge.chapitres.length === 7 && !v.filRouge.aVenir && v.filRouge.chapitres[0].courant?.id === "fil:questions:5");
  check("le fil n'entre pas dans le compte des quêtes du Codex", v.stats.total === construireVue(e1, { ...r, etats: r.etats.filter((s) => s.quete.famille !== "fil") }, null, { devoile: null }).stats.total);

  // le calcul suivant : tout est écrit, le marqueur a avancé → rien de plus
  const ecrit = r.lot.filter((i) => i.etat === "terminee").map((i) => ligneFaite(i.quete, { periode: i.periode, retro: !!i.retro, xp: i.xp ?? 0 }));
  const { r: r2 } = repondre(avance({ progression: [ligneFaite("acte:prologue"), ...ecrit], capacitesVues: r.capacitesVues }), toutes);
  check("le calcul suivant ne verse rien, le marqueur ne bouge plus", !r2.lot.some((i) => i.etat === "terminee") && r2.capacitesVues === null, r2.lot.filter((i) => i.etat === "terminee").map((i) => i.quete).join(" "));

  // la capacité « fil » s'allume après coup (SQL collé plus tard) : rattrapage, même pour un palier atteint aujourd'hui
  const vuSansFil = { ...CAPACITES_VIDE };
  const { r: r3 } = repondre(avance({ capacitesVues: vuSansFil, dernierCalcul: new Date("2026-10-15T09:59:00Z") }), toutes);
  check("capacité vue pour la première fois : les paliers déjà remplis passent en rétro", r3.lot.filter((i) => i.famille === "fil" && i.etat === "terminee").every((i) => i.retro) && r3.lot.some((i) => i.famille === "fil" && i.etat === "terminee"));

  // le marqueur posé, la capacité déjà vue : un palier franchi pour de bon se fête
  const { r: r4 } = repondre(
    avance({ capacitesVues: AVEC_FIL, dernierCalcul: new Date("2026-10-15T09:59:00Z"), progression: [ligneFaite("acte:prologue"), ...[1, 2, 3, 4].map((n) => ligneFaite(`fil:questions:${n}`)), ligneFaite("fil:encre:1")] }),
    (d) => (d.evenement === "question_repondue" && !d.filtre ? 20000 : 0),
  );
  const cinquieme = r4.lot.find((i) => i.quete === "fil:questions:5");
  check("20 000 réponses, marqueur posé : le 5e palier du copiste est versé sans rétro (fête), 260 XP visés", cinquieme?.etat === "terminee" && cinquieme.retro === false && cinquieme.xp === 260, JSON.stringify(cinquieme));

  // sans la capacité « fil » (CHECK pas élargi) : rien du fil n'est écrit, il se lit « à venir »
  const { r: r5, e: e5 } = repondre(avance({ capacites: CAPACITES_VIDE }), toutes);
  check("sans la capacité « fil » : aucun item « fil » dans le lot", !r5.lot.some((i) => (i.famille as string) === "fil"));
  const v5 = construireVue(e5, r5, null, { devoile: null });
  check("… et la vue le dit « à venir », les chapitres toujours lisibles", v5.filRouge.aVenir && v5.filRouge.chapitres.every((c) => c.faits === 0) && v5.filRouge.chapitres[0].courant !== null);
  check("sans marqueur dans l'entrée (aperçus, anciens tests) : pas de rattrapage, pas de marqueur", r5.capacitesVues !== null && repondre(avance({ capacitesVues: undefined }), toutes).r.capacitesVues === null);
  check("« Garder la main » reste fermé avant l'examen", !r.etats.find((s) => s.quete.id === "fil:entretien:1")?.ouverte);
  check("le fil n'est jamais LA prochaine quête tant que le programme en propose une", recommander(e1, r)?.quete.famille !== "fil");
}

console.log("\n# v3 §6.15 : l'XP plafonnée s'affiche sobrement");
check("« +50 XP » (plus « versés, visés, plafonnés »)", CODEX.detail.xpPlafonnee(50) === "+50 XP");

console.log("\n# v3 §6.14 : migration_codex_v3.sql (le banc PGlite la joue : sim-codex-v3.mjs)");
{
  const sql = readFileSync("migration_codex_v3.sql", "utf8");
  // seules les tables temporaires de la transaction (le cache des réponses, le journal de codex_lire) se suppriment
  // et un seul DELETE : le retrait d'un jour de repos à venir, par le joueur lui-même (§8f)
  check("idempotente : aucune suppression de table ni de données", !/DROP\s+TABLE(?!\s+(IF\s+EXISTS\s+)?pg_temp\.)|DELETE\s+FROM(?!\s+serie_pauses\s+WHERE\s+user_id\s*=\s*v_uid\s+AND\s+jour\s*=\s*p_jour;)|TRUNCATE/i.test(sql));
  check("codex_erreurs : RLS, le joueur lit les siennes, aucune politique d'écriture", /ALTER TABLE codex_erreurs ENABLE ROW LEVEL SECURITY/.test(sql) && /codex_erreurs FOR SELECT TO authenticated USING \(user_id = auth\.uid\(\)\)/.test(sql) && !/codex_erreurs FOR (INSERT|UPDATE|DELETE|ALL)/.test(sql));
  check("codex_ecrire : une sous-transaction par quête, l'erreur consignée", /EXCEPTION WHEN OTHERS THEN\s+v_err := v_err \+ 1;\s+PERFORM _codex_erreur/.test(sql));
  const fonctions = [...sql.matchAll(/CREATE OR REPLACE FUNCTION (\w+)\(/g)].map((m) => m[1]);
  const joueur = new Set([...sql.matchAll(/GRANT EXECUTE ON FUNCTION (\w+)\([^)]*\) TO authenticated/g)].map((m) => m[1]));
  check("fonctions en SECURITY DEFINER SET search_path = public, fermées à anon et authenticated", fonctions.length >= 5 && (sql.match(/SECURITY DEFINER SET search_path = public/g) ?? []).length === fonctions.length && fonctions.every((f) => new RegExp(`REVOKE ALL ON FUNCTION ${f}\\([^)]*\\) FROM PUBLIC, anon, authenticated`).test(sql) || joueur.has(f)), fonctions.join());
  check("les fonctions du joueur (repos, pause) : fermées à anon, ouvertes à authenticated, sur auth.uid()", joueur.size === 2 && [...joueur].every((f) => new RegExp(`REVOKE ALL ON FUNCTION ${f}\\([^)]*\\) FROM PUBLIC, anon;`).test(sql) && new RegExp(`CREATE OR REPLACE FUNCTION ${f}\\([^]*?v_uid\\s+uuid := auth\\.uid\\(\\)`).test(sql)), [...joueur].join());
  check("§2 : colonnes de codex_joueur ajoutées sans rien retirer, budget borné", /ADD COLUMN IF NOT EXISTS budget_min smallint CHECK \(budget_min IN \(15, 30, 60, 90\)\)/.test(sql) && /ADD COLUMN IF NOT EXISTS capacites_vues jsonb/.test(sql) && !/ALTER TABLE codex_joueur DROP/i.test(sql));
}

console.log("\n# v3 §8 : le catalogue taillé (retraits, miroirs, actes I et V, hors jeu, souple, XP des contrats)");
{
  const cat = catalogueCodex();
  const retirees = cat.filter((q) => q.retiree);
  const publies = (JSON.parse(readFileSync("scripts/codex/ids-publies.json", "utf8")) as { quetes: string[] }).quetes;
  const ids = new Set(cat.map((q) => q.id));
  check("58 quêtes retirées (V3 §8.1), toujours au catalogue", retirees.length === 58, String(retirees.length));
  check("tous les ids publiés sont encore là (retirés ou non)", publies.every((id) => ids.has(id)), publies.filter((id) => !ids.has(id)).join(" "));
  check("les 22 « Sceau X », l'aube, la machine volante, les tours, la carte, justesse/trentaine/atelier/calculs/sources sont retirés",
    cat.filter((q) => q.id.startsWith("exploit:sceau:")).every((q) => q.retiree) && cat.filter((q) => q.id.startsWith("exploit:sceau:")).length === 22
    && ["exploit:aube", "exploit:machine-volante", "trame:a3:notions", "trame:a4:defis", "trame:a5:notions"].every((id) => cat.find((q) => q.id === id)?.retiree)
    && contenu.every((m) => cat.find((q) => q.id === `branche:${m.key}:tour`)?.retiree)
    && ["carte", "justesse", "trentaine", "atelier", "calculs", "sources"].every((c) => cat.filter((q) => q.chaine === c).every((q) => q.retiree)));
  const miroirs = cat.filter((q) => q.miroir);
  check("6 miroirs, chacun vers une quête de la trame qui paie", miroirs.length === 6 && miroirs.every((q) => cat.find((x) => x.id === q.miroir && x.famille === "trame" && !x.retiree)), miroirs.map((q) => q.id).join(" "));
  check("SEUIL_ACTE_V = CFA_L1.seuils.acteV = 8 (D6)", SEUIL_ACTE_V === 8 && CFA_L1.seuils.acteV === 8);
  check("xpContrat : 5 → 10, 10 → 10, 15 → 20, 20 → 25, 25 → 30, 30 → 35, 40 → 50", [[5, 10], [10, 10], [15, 20], [20, 25], [25, 30], [30, 35], [40, 50]].every(([d, x]) => xpContrat(d) === x));

  const ligne = (id: string, o: Partial<LigneProgression> = {}): LigneProgression => ({ quete_id: id, periode: "", etat: "recompensee", progression: 1, cible: 1, ouverte_le: "2026-09-01T10:00:00Z", terminee_le: "2026-09-01T10:00:00Z", recompensee_le: "2026-09-01T10:00:00Z", retro: false, xp: 50, cosmetique: null, titre: null, vu: true, ...o });

  // retirées : jamais suivies ni montrées, mais ce qu'elles ont donné reste
  {
    const sceaux = cat.filter((q) => q.id.startsWith("exploit:sceau:")).map((q) => ligne(q.id));
    const e = base({ premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), progression: [...sceaux, ligne("longcours:carte:5", { cosmetique: "banniere:imola", xp: 450 })] });
    const { r, e: e2 } = repondre(e, () => 0);
    const v = construireVue(e2, r, null, { devoile: null, joueur: "u1" });
    check("aucune retirée dans les états ni dans le lot", !r.etats.some((s) => s.quete.retiree) && !r.lot.some((i) => retirees.some((q) => q.id === i.quete)));
    check("la vue : ni sceau parmi les exploits, ni « Le tour », ni « La carte »", !v.exploits.some((l) => l.id.startsWith("exploit:sceau:")) && v.branches.every((b) => !b.etapes.some((l) => l.etape === "tour")) && !v.longCours.some((c) => c.chaine.id === "carte"));
    check("« Codex Atlanticus » compte les quêtes retirées déjà tamponnées (22 sceaux et la carte)", r.etats.find((s) => s.quete.id === "exploit:codex-atlanticus")?.ev?.valeur === 23, String(r.etats.find((s) => s.quete.id === "exploit:codex-atlanticus")?.ev?.valeur));
    check("la bannière d'Imola, gagnée par une chaîne retirée, reste possédée", v.possessions.some((x) => x.cle === "banniere:imola" && x.quete === "longcours:carte:5"));
    check("le lien vers la Collection, sous les exploits", v.collection === "/people/u1?onglet=sceaux#profil-onglets" && construireVue(e2, r, null, { devoile: null }).collection === null);
  }

  // les miroirs : tamponnés avec leur quête payeuse, jamais payés deux fois
  {
    const { r, e: e2 } = repondre(base({ premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), jourJ: "2027-02-20", lecture: { compteurs: {}, mesures: { xp_total: 0, jours: Array.from({ length: 5 }, (_, w) => [0, 1, 2, 3].map((d) => ({ jour: new Date(Date.UTC(2026, 8, 7 + 7 * w + d)).toISOString().slice(0, 10), n: 20 }))).flat() }, speciaux: {} } }), () => 0);
    const item = r.lot.find((i) => i.quete === "longcours:encre:2");
    check("« Un mois d'encre » rempli avant l'acte IV : tamponné sans XP, la chaîne continue", item?.etat === "terminee" && item.xp === 0 && !item.cosmetique && ouverte(r, "longcours:encre:3") && !ouverte(r, "trame:a4:semaines"), JSON.stringify(item));
    const v = construireVue(e2, r, null, { devoile: null });
    const l = v.longCours.find((c) => c.chaine.id === "encre")?.paliers.find((x) => x.id === "longcours:encre:2");
    check("la vue : le miroir ne vise aucune XP et dit avec quoi il compte", l?.xp === 0 && l.compteeAvec?.id === "trame:a4:semaines" && l.compteeAvec.titre === "Un mois d'atelier", `${l?.xp} ${JSON.stringify(l?.compteeAvec)}`);
  }
  {
    // la payeuse tombe : le miroir se tamponne avec elle, elle seule paie ; un miroir déjà payé n'est pas repris
    const e = base({
      premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), jourJ: "2027-02-20",
      progression: [...["prologue", "acte2", "acte3"].map((a) => ligne(`acte:${a}`)), ligne("longcours:remontee:1", { xp: 120, vu: false })],
      lecture: { compteurs: {}, mesures: { xp_total: 0, maitrise: Object.fromEntries(contenu.map((m) => [m.key, { pct: 70, questions: 200, debut: 40 }])) }, speciaux: {} },
    });
    const { r, e: e2 } = repondre(e, (d) => (d.evenement === "examen_blanc_rendu" ? 1 : 0));
    const blanc = r.lot.find((i) => i.quete === "trame:a4:blanc");
    const mecene = r.lot.find((i) => i.quete === "longcours:commandes:1");
    check("« La commande » paie, « Le premier mécène » (son miroir) est tamponné à 0 XP", blanc?.etat === "terminee" && (blanc.xp ?? 0) > 0 && mecene?.etat === "terminee" && mecene.xp === 0, `${JSON.stringify(blanc)} ${JSON.stringify(mecene)}`);
    const remontee = r.lot.find((i) => i.quete === "trame:a4:remontee");
    check("un miroir déjà payé avant la v3 (120) n'est ni réécrit ni repris ; sa payeuse (120) est tamponnée à 0 XP", !r.lot.some((i) => i.quete === "longcours:remontee:1") && remontee?.etat === "terminee" && remontee.xp === 0, JSON.stringify(remontee));
    const l = construireVue(e2, r, null, { devoile: null }).longCours.flatMap((c) => c.paliers).find((x) => x.id === "longcours:remontee:1");
    check("pas de fanfare pour un miroir (même non vu)", l?.aFeter === false);
  }
  {
    // un miroir payé 120 avant la v3, une payeuse à 150 : elle ne verse que les 30 qui manquent, et compte pour l'acte
    const catalogue = catalogueCodex().filter((q) => ["trame:a4:semaines", "longcours:encre:1", "longcours:encre:2"].includes(q.id));
    const jours = Array.from({ length: 5 }, (_, w) => [0, 1, 2, 3].map((d) => ({ jour: new Date(Date.UTC(2026, 8, 7 + 7 * w + d)).toISOString().slice(0, 10), n: 20 }))).flat();
    const e = base({ catalogue, premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), progression: [...["prologue", "acte2", "acte3"].map((a) => ligne(`acte:${a}`)), ligne("longcours:encre:1"), ligne("longcours:encre:2", { xp: 120 })], lecture: { compteurs: {}, mesures: { xp_total: 0, jours }, speciaux: {} } });
    const { r } = repondre(e, () => 0);
    const semaines = r.lot.find((i) => i.quete === "trame:a4:semaines");
    check("miroir payé 120 avant la v3, payeuse à 150 : 30 XP, terminée", cat.find((x) => x.id === "trame:a4:semaines")?.recompense.xp === 150 && semaines?.etat === "terminee" && semaines.xp === 30 && fait(r, "trame:a4:semaines"), JSON.stringify(semaines));
  }
  {
    // la payeuse et son miroir ouverts, ni l'une ni l'autre faite : c'est la payeuse qu'on propose, une seule fois
    const catalogue = catalogueCodex().filter((q) => ["trame:a4:semaines", "longcours:encre:1", "longcours:encre:2"].includes(q.id));
    const jours = Array.from({ length: 2 }, (_, w) => [0, 1, 2, 3].map((d) => ({ jour: new Date(Date.UTC(2026, 8, 7 + 7 * w + d)).toISOString().slice(0, 10), n: 20 }))).flat();
    const e = base({ catalogue, premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), progression: ["prologue", "acte2", "acte3"].map((a) => ligne(`acte:${a}`)), lecture: { compteurs: {}, mesures: { xp_total: 0, jours }, speciaux: {} } });
    const { r, e: e2 } = repondre(e, () => 0);
    const reco = recommander(e2, r);
    check("la payeuse ouverte passe devant son miroir", ouverte(r, "longcours:encre:2") && ouverte(r, "trame:a4:semaines") && reco?.quete.id === "trame:a4:semaines", reco?.quete.id);
    const pn = panneauDe(construireVue(e2, r, reco, { devoile: null }));
    check("le panneau ne propose pas le miroir en plus de sa payeuse", pn.quetes.some((q) => q.cle === "trame:a4:semaines|") && !pn.quetes.some((q) => q.cle.startsWith("longcours:encre:2|")), pn.quetes.map((q) => q.cle).join(" "));
  }

  // l'acte I : la visite de la bottega, close avec 4 outils sur 7 ; le prologue sans jour J
  {
    const outils = new Set(["drill_page_terminee", "cinq_rendu", "rature_rayee", "seance_atelier"]);
    const avec = (n: number) => repondre(base({ premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z") }), (d) => (d.evenement === "question_repondue" ? 50 : [...outils].slice(0, n).includes(d.evenement) ? 1 : 0));
    const { r: r4, e: e4 } = avec(4);
    const { r: r3 } = avec(3);
    const a1 = ACTES.find((a) => a.id === "acte1")!;
    check("acte I : « La visite de la bottega », clos avec 4 quêtes sur 7", a1.titre === "La visite de la bottega" && a1.closAvec?.n === 4 && catalogueCodex().filter((q) => q.acte === "acte1" && !q.retiree).length === 7);
    check("4 outils sans le duel : l'acte I se clôt ; 3 : pas encore", r4.actesClos.includes("acte1") && !fait(r4, "trame:a1:duel") && !r3.actesClos.includes("acte1"));
    check("ses 7 quêtes sont facultatives", catalogueCodex().filter((q) => q.acte === "acte1").every((q) => q.optionnelle));
    const va = construireVue(e4, r4, null, { devoile: null }).trame.find((a) => a.acte.id === "acte1");
    check("la vue compte l'acte I sur 4", va?.total === 4 && va.faites === 4 && va.clos, `${va?.faites}/${va?.total}`);
    check("sans jour J : le prologue se clôt, la chaîne du rythme s'ouvre après « Dix coups de pinceau »", r4.actesClos.includes("prologue") && !fait(r4, "trame:prologue:jour-j") && ouverte(r4, "longcours:rythme:1"));
  }

  // l'acte V à 8 matières sur 10, et les matières à rattraper
  const convergence = (sans: string[], o: Partial<Entree> = {}) =>
    repondre(base({
      premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), jourJ: "2027-02-20",
      lecture: {
        compteurs: {},
        mesures: {
          xp_total: 5000, serie: 4, meilleure_serie: 10,
          notions: Object.fromEntries(contenu.flatMap((m) => notionsDeMatiere(m.key).map((n) => [n.id, 10]))),
          drill_totaux: { fsa: 1, equity: 1, economics: 1, fixed_income: 1, portfolio: 1 },
          drill_pages: ["fsa", "equity", "economics", "fixed_income", "portfolio"].map((m) => ({ matiere: m, page: 1, meilleur: 90 })),
          ratures_ouvertes: { total: 10, matieres: {} },
          maitrise: Object.fromEntries(contenu.map((m) => [m.key, { pct: 90, questions: 200, debut: 50 }])),
          jours: Array.from({ length: 6 }, (_, w) => [0, 1, 2, 3, 4].map((d) => ({ jour: new Date(Date.UTC(2026, 8, 7 + 7 * w + d)).toISOString().slice(0, 10), n: 20 }))).flat(),
        },
        speciaux: {},
      },
      ...o,
    }), (d) => (d.evenement === "session_terminee" && sans.includes(String(d.filtre?.matiere)) ? 0 : 99));
  {
    const { r, e: e2 } = convergence(["quant", "economics"]);
    check("8 séances ciblées sur 10 : l'acte V s'ouvre", r.actesClos.includes("acte4") && ouverte(r, "trame:a5:blanc") && !fait(r, "branche:quant:ciblee"));
    const a5 = construireVue(e2, r, null, { devoile: null }).trame.find((a) => a.acte.id === "acte5");
    check("la vue : Quant et Economics « à rattraper »", JSON.stringify([...(a5?.aRattraper ?? [])].sort()) === JSON.stringify(["economics", "quant"]), JSON.stringify(a5?.aRattraper));
    const { r: r7 } = convergence(["quant", "economics", "ethics"]);
    check("7 sur 10 : l'acte V reste fermé", r7.actesClos.includes("acte4") && !ouverte(r7, "trame:a5:blanc"));
  }

  // sans §4 (V3 §8) : une quête dont la mesure est inconnue est hors jeu ; les actes se closent, « Maître de… » reste atteignable
  {
    const q = (id: string, acte: string | undefined, objectif: Quete["objectif"], prerequis: Quete["prerequis"]): Quete => ({ id, famille: acte ? "trame" : "branche", programme: PROGRAMME, titre: id, consigne: "Une quête de la v3.", objectif, prerequis, recompense: { xp: 100 }, repetition: "unique", visibilite: "visible", ordre: 99, ...(acte ? { acte } : { matiere: "fsa" }) });
    const tenues3 = q("trame:a3:essai-v3", "acte3", { k: "mesure", mesure: "trophees", seuil: 1 }, [{ k: "acte", id: "acte2" }]);
    const tenues5 = q("trame:a5:essai-v3", "acte5", { k: "mesure", mesure: "jours_encre_total", seuil: 30 }, [{ k: "acte", id: "acte4" }]);
    const carte = q("branche:fsa:essai-v3", undefined, { k: "mesure", mesure: "maitres_total", seuil: 1 }, []);
    const signature = q("branche:fsa:essai-souple", undefined, { k: "compteur", evenement: "duel_termine", seuil: 1000 }, []);
    const catalogue = [
      ...catalogueCodex().map((x) => (x.id === "branche:fsa:maitre" ? { ...x, prerequis: [...x.prerequis, { k: "quete" as const, id: carte.id }, { k: "quete" as const, id: signature.id, souple: true as const }] } : x)),
      tenues3, tenues5, carte, signature,
    ];
    const { r, e: e2 } = convergence([], { catalogue, progression: [ligne("trame:a5:essai-v3", { etat: "active", progression: 12, cible: 30, terminee_le: null, recompensee_le: null, xp: 0 })] });
    const st = (id: string) => r.etats.find((s) => s.quete.id === id);
    check("sans §4 : les actes III et V se closent sans leurs quêtes v3", r.actesClos.includes("acte3") && r.actesClos.includes("acte5"), r.actesClos.join());
    check("« Maître de FSA » atteignable : prérequis hors jeu ignoré, prérequis souple seulement conseillé avant l'examen", fait(r, "branche:fsa:maitre"));
    check("hors jeu jamais commencée : masquée ; commencée : affichée, gelée", !!st("trame:a3:essai-v3")?.masquee && !!st("trame:a5:essai-v3")?.horsJeu && !st("trame:a5:essai-v3")?.masquee);
    check("rien ne s'écrit pour une quête hors jeu (la progression gelée reste en base)", !r.lot.some((i) => i.quete.endsWith("essai-v3")));
    const v = construireVue(e2, r, null, { devoile: null });
    const a3 = v.trame.find((a) => a.acte.id === "acte3")!;
    const a5 = v.trame.find((a) => a.acte.id === "acte5")!;
    const gelee = a5.quetes.find((l) => l.id === "trame:a5:essai-v3");
    check("la vue : la masquée n'apparaît pas, la gelée garde sa progression et ne compte pas", !a3.quetes.some((l) => l.id === "trame:a3:essai-v3") && gelee?.gelee === true && gelee.valeur === 12 && a5.faites === a5.total, `${gelee?.valeur} ${a5.faites}/${a5.total}`);
    const { r: rApres } = convergence([], { catalogue, jourJ: "2026-10-01" });
    check("après l'examen, le prérequis souple bloque « Maître de FSA »", !fait(rApres, "branche:fsa:maitre") && fait(rApres, "branche:equity:maitre"));
    // un nœud de convergence ne bloque pas sur une étape hors jeu (le drill complet sans le nombre de pages)
    const noeud = q("trame:a2:essai-noeud", "acte2", { k: "compteur", evenement: "duel_termine", seuil: 1 }, [{ k: "toutesBranches", etape: "drill" }]);
    const { r: rn } = repondre(base({ catalogue: [...catalogueCodex(), noeud] }), () => 0);
    check("« toutes les branches au drill » : les drills hors jeu ne bloquent pas le nœud", rn.etats.filter((x) => x.quete.etape === "drill").every((x) => x.horsJeu) && ouverte(rn, "trame:a2:essai-noeud"));
  }
}

console.log("\n# v3 §8.5, §8.7, §8.8 : les ajouts (main juste, carte tenue, cartes et signatures, folios, exploits, débrief)");
{
  const cat = catalogueCodex();
  const q = (id: string) => cat.find((x) => x.id === id)!;
  const ligne = (id: string, o: Partial<LigneProgression> = {}): LigneProgression => ({ quete_id: id, periode: "", etat: "recompensee", progression: 1, cible: 1, ouverte_le: "2026-09-01T10:00:00Z", terminee_le: "2026-09-01T10:00:00Z", recompensee_le: "2026-09-01T10:00:00Z", retro: false, xp: 50, cosmetique: null, titre: null, vu: true, ...o });
  const st = (r: ReturnType<typeof evaluer>, id: string) => r.etats.find((s) => s.quete.id === id);

  // le compte final (V3 §8.8)
  const c = compterCatalogue();
  check(`visibles du CFA I : ${c.total.visibles}, dans [170, 190] (≈ 184)`, c.total.visibles >= 170 && c.total.visibles <= 190, JSON.stringify(c.total));
  check("par famille : trame 40, branches 80, long cours 43, exploits 17, contrats 4 ; 58 retirées, 27 hors compte",
    c.trame.visibles === 40 && c.branche.visibles === 80 && c.longcours.visibles === 43 && c.exploit.visibles === 17 && c.contrat.visibles === 4 && c.total.retirees === 58 && c.total.horsCompte === 27,
    (["trame", "branche", "longcours", "exploit", "contrat"] as const).map((f) => `${f} ${c[f].visibles}`).join(" "));
  check("les 21 satellites hors compte : cours, flashcards, fiche sans drill (facultatifs)", cat.filter((x) => x.famille === "branche" && x.optionnelle && !x.retiree).every((x) => ["cours", "flashcards", "fiche"].includes(x.etape ?? "")));

  // les branches : la carte (notions tenues) et l'épreuve signature, avant « Maître de… »
  const tenu = { n: 6, j5: 3 };
  const toutesTenues = (m: string) => Object.fromEntries(notionsDeMatiere(m).map((n) => [n.id, tenu]));
  check("chaque matière : « La carte de … » (notions tenues à 100 %) et une épreuve signature à 200 XP",
    contenu.every((m) => q(`branche:${m.key}:carte`)?.objectif.k === "mesure" && q(`branche:${m.key}:signature`)?.recompense.xp === 200));
  const prerequisMaitre = q("branche:fsa:maitre").prerequis;
  check("« Maître de… » : maîtrise 75, puis carte et signature en prérequis SOUPLES (U2)",
    prerequisMaitre.some((p) => p.k === "quete" && p.id === "branche:fsa:maitrise75" && !p.souple)
    && ["carte", "signature"].every((e) => prerequisMaitre.some((p) => p.k === "quete" && p.id === `branche:fsa:${e}` && p.souple)) && !prerequisMaitre.some((p) => p.k === "quete" && p.id.endsWith(":tour")));
  check("signatures du CFA I : Ethics 10 bonnes, Quant 10 calculs, Fixed Income 20 calculs, FSA une page à 100 %",
    JSON.stringify(q("branche:ethics:signature").objectif) === JSON.stringify({ k: "special", cle: "serie_bonnes_matiere", seuil: 10, matiere: "ethics" })
    && JSON.stringify(q("branche:quant:signature").objectif) === JSON.stringify({ k: "special", cle: "serie_calculs_matiere", seuil: 10, matiere: "quant" })
    && JSON.stringify(q("branche:fixed_income:signature").objectif) === JSON.stringify({ k: "special", cle: "serie_calculs_matiere", seuil: 20, matiere: "fixed_income" })
    && q("branche:fsa:signature").objectif.k === "compteur" && q("branche:fsa:signature").titre === "Le bilan sans faute");
  const MESURES = { ...CAPACITES_VIDE, mesures: true };
  const avance = (mesures: Partial<LectureSql["mesures"]>, o: Partial<Entree> = {}) => repondre(base({
    premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), jourJ: "2027-02-20", capacites: MESURES,
    lecture: { compteurs: {}, mesures: { xp_total: 0, maitrise: Object.fromEntries(contenu.map((m) => [m.key, { pct: 65, questions: 200, debut: 40 }])), ...mesures }, speciaux: { serie_bonnes: 30 } },
    ...o,
  }), (d) => (d.evenement === "drill_page_terminee" && (d.filtre?.pct as { min?: number } | undefined)?.min === 100 ? 0 : 99));
  {
    const equity = Object.fromEntries(notionsDeMatiere("equity").map((n, i) => [n.id, i === 0 ? { n: 5, j5: 2 } : tenu]));
    const { r } = avance({ notions_tenues: { ...toutesTenues("fsa"), ...equity }, speciaux_matiere: { serie_bonnes: { ethics: 10, economics: 11 }, serie_calculs: { quant: 10 } } });
    check("la carte de FSA : toutes ses notions tenues → faite ; Equity, une notion à 2 justes sur 5 → pas encore", fait(r, "branche:fsa:carte") && !fait(r, "branche:equity:carte") && st(r, "branche:equity:carte")?.horsJeu === false);
    check("signatures par matière : Ethics à 10 d'affilée faite, Economics à 11 pas encore (12), Quant à 10 calculs faite", fait(r, "branche:ethics:signature") && !fait(r, "branche:economics:signature") && fait(r, "branche:quant:signature"));
    check("une suite globale de 30 ne remplit pas une signature de matière ; une matière absente vaut 0, pas « inconnue »", !fait(r, "branche:corporate:signature") && st(r, "branche:corporate:signature")?.horsJeu === false && st(r, "branche:corporate:signature")?.ev?.valeur === 0);
    check("FSA : la page de drill à 100 % pas encore passée", !fait(r, "branche:fsa:signature"));
  }
  {
    const { r: sans } = avance({}, { capacites: CAPACITES_VIDE });
    check("sans codex_mesures_v3 (capacité « mesures ») : cartes et signatures par suite pas suivies, la page de drill reste en jeu", !st(sans, "branche:fsa:carte") && !st(sans, "branche:ethics:signature") && st(sans, "branche:fsa:signature")?.horsJeu === false);
    const { r, e: e2 } = avance({});
    check("avec elle mais sans la clé (fonction d'une version antérieure) : hors jeu, masquées", st(r, "branche:fsa:carte")?.masquee === true && st(r, "branche:ethics:signature")?.masquee === true);
    const v = construireVue(e2, r, null, { devoile: null });
    const montrees = v.branches.flatMap((b) => b.etapes.filter((l) => l.etape === "carte" || l.etape === "signature").map((l) => l.id));
    check("la vue : seules les signatures par page de drill (FSA, Equity, Portfolio) restent montrées", JSON.stringify(montrees.sort()) === JSON.stringify(["branche:equity:signature", "branche:fsa:signature", "branche:portfolio:signature"]), montrees.join(" "));
  }

  // les notions tenues : pondérées par le poids des matières (trame, carte tenue)
  {
    const { r } = avance({ notions_tenues: toutesTenues("ethics") }, { progression: ["prologue", "acte2"].map((x) => ligne(`acte:${x}`)) });
    const poidsEthics = contenu.find((m) => m.key === "ethics")!.poids;
    const pct = Math.floor((100 * poidsEthics) / contenu.reduce((s, m) => s + m.poids, 0));
    check(`Ethics seule tenue : ${pct} % pondérés (son poids), pas sa part des notions`, st(r, "longcours:carte-tenue:2")?.ev?.valeur === Math.min(25, pct) && fait(r, "longcours:carte-tenue:1") === pct >= 10, String(st(r, "longcours:carte-tenue:2")?.ev?.valeur));
    check("« Vingt-cinq carnets tenus » : le nombre de notions tenues", st(r, "trame:a3:tenues")?.ev?.valeur === Math.min(25, notionsDeMatiere("ethics").length), String(st(r, "trame:a3:tenues")?.ev?.valeur));
    check("la carte tenue au palier 4 est le miroir de « Les trois quarts de la carte » ; le sommet donne Imola", q("longcours:carte-tenue:4").miroir === "trame:a5:tenues" && q("longcours:carte-tenue:5").recompense.cosmetique === "banniere:imola");
    const presque = Object.fromEntries(notionsDeMatiere("fsa").map((n) => [n.id, { n: 4, j5: 4 }]));
    check("une notion à 4 réponses (même toutes justes) n'est pas tenue", avance({ notions_tenues: presque }).r.etats.find((s) => s.quete.id === "branche:fsa:carte")?.ev?.valeur === 0);
  }

  // le rattrapage (V3 §1.9) : la §4 collée après le premier calcul v3, une carte déjà tenue passe en rétro
  {
    const vues = { ...CAPACITES_VIDE };
    const { r } = avance({ notions_tenues: toutesTenues("fsa") }, { capacitesVues: vues });
    const { r: ensuite } = avance({ notions_tenues: toutesTenues("fsa") }, { capacitesVues: MESURES, dernierCalcul: new Date("2026-10-16T00:00:00Z") });
    const item = (x: typeof r, id: string) => x.lot.find((i) => i.quete === id);
    check("la capacité « mesures » vue pour la première fois : la carte de FSA, déjà tenue, est rattrapée en rétro", item(r, "branche:fsa:carte")?.retro === true, JSON.stringify(item(r, "branche:fsa:carte")));
    check("… une fois la capacité vue, une carte qui se remplit paie normalement", item(ensuite, "branche:fsa:carte")?.retro === false, JSON.stringify(item(ensuite, "branche:fsa:carte")));
  }

  // la main juste : le journal v3 d'abord
  {
    const compteSeances = (d: Demande) => (d.evenement === "seance_juste" ? 16 : 0);
    const { r: sans } = repondre(base({ premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z") }), compteSeances);
    const v3 = { ...CAPACITES_VIDE, journal: 3 as const };
    const { r: avecJ, demandes } = repondre(base({ premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), capacites: v3 }), compteSeances);
    check("sans journal v3 : la main juste n'est pas suivie, rien n'est demandé à la base", !sans.etats.some((s) => s.quete.chaine === "main-juste") && !planifier(base()).some((d) => d.evenement === "seance_juste"));
    check("avec : 16 séances justes → deux paliers, filtre 70 % / 10 questions / 50 % de fraîches", fait(avecJ, "longcours:main-juste:1") && fait(avecJ, "longcours:main-juste:2") && !fait(avecJ, "longcours:main-juste:3")
      && demandes.some((d) => d.evenement === "seance_juste" && JSON.stringify(d.filtre) === JSON.stringify({ pct: { min: 70 }, questions: { min: 10 }, fraiches: { min: 50 } })));
    check("le sommet donne le titre « La main juste »", q("longcours:main-juste:5").recompense.titre === "titre:main-juste" && COSMETIQUES_CODEX.some((x) => x.cle === "titre:main-juste"));
  }

  // les folios : un par acte clos et par « Maître de… » du CFA I, plus deux du fil rouge
  {
    const folios = COSMETIQUES_CODEX.filter((x) => x.type === "folio");
    const donnes = [...ACTES.map((a) => a.recompense.folio), ...cat.map((x) => x.recompense.folio)].filter((x): x is string => !!x);
    check("19 folios (17 du CFA I, 2 du fil rouge) ; ceux du CFA I provisoires, sans image", folios.length === 19 && folios.filter((f) => f.folio).length === 17 && folios.every((f) => !f.folio || (f.folio.image === null && f.folio.provisoire)), String(folios.length));
    check("les actes I à VI et l'épilogue en donnent un ; chaque « Maître de… » aussi ; jamais deux fois le même",
      ACTES.filter((a) => a.id !== "prologue").every((a) => !!a.recompense.folio) && contenu.every((m) => !!q(`branche:${m.key}:maitre`).recompense.folio) && donnes.length === 17 && new Set(donnes).size === 17);
    const avecFil = { ...CAPACITES_VIDE, fil: true };
    const { r } = repondre(base({ premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), capacites: avecFil, progression: [ligne("acte:prologue"), ligne("acte:acte1"), ligne("branche:fsa:maitre", { titre: "titre:maitre:fsa" })] }), () => 0);
    const collection = r.etats.find((s) => s.quete.id === "fil:collection:1");
    check("les pièces de collection comptent les folios gagnés (acte I, Maître de FSA) avec le titre", collection?.ev?.valeur === 3, String(collection?.ev?.valeur));
    // la sonde du fil rouge compte comme l'évaluation : les folios des quêtes y sont (10 « Maître de… » : 10 titres + 10 folios = 20 pièces)
    const maitres = contenu.map((m) => ligne(`branche:${m.key}:maitre`, { titre: `titre:maitre:${m.key}` }));
    const { r: r20 } = repondre(base({ premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), capacites: avecFil, progression: [ligne("acte:prologue"), ...maitres] }), () => 0);
    const paliers = r20.etats.filter((s) => s.quete.id.startsWith("fil:collection:"));
    check("20 pièces dont 10 folios de quêtes : les paliers 1 à 3 atteints au même calcul, le 4e (35) instancié en suivant",
      [1, 2, 3].every((n) => paliers.some((s) => s.quete.id === `fil:collection:${n}` && s.fait)) && paliers.some((s) => s.quete.id === "fil:collection:4" && !s.fait),
      paliers.map((s) => `${s.quete.palier}:${s.fait ? "fait" : "-"}`).join(" "));
  }

  // les exploits de la v3 et le débrief
  {
    const TROPHEES = { ...MESURES, trophees: true };
    const trophees = (t: { source: string; palier: number; n: number }[]) => repondre(base({ premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), capacites: TROPHEES, lecture: { compteurs: {}, mesures: { xp_total: 0, trophees: t }, speciaux: {} } }), () => 0).r;
    const quatreOr = trophees(["ciblee", "blanc", "trente", "fiche"].map((source) => ({ source, palier: 3, n: 1 })).concat([{ source: "cinq", palier: 1, n: 4 }, { source: "drill", palier: 2, n: 1 }]));
    check("le grand chelem : un or sur quatre chemins ; la vitrine : un trophée sur six", fait(quatreOr, "exploit:grand-chelem") && fait(quatreOr, "exploit:vitrine"));
    const troisOr = trophees(["ciblee", "blanc", "trente"].map((source) => ({ source, palier: 4, n: 3 })));
    check("… trois sources seulement (même en diamant) : ni l'un ni l'autre", !fait(troisOr, "exploit:grand-chelem") && !fait(troisOr, "exploit:vitrine"));
    const { r: rien } = repondre(base(), () => 0);
    const { r: sansCle } = repondre(base({ capacites: TROPHEES }), () => 0);
    check("sans codex_mesures_v3 : les exploits de trophées pas suivis, la cadence attend le journal v3 ; trophées non lus : hors jeu", !st(rien, "exploit:grand-chelem") && !st(rien, "exploit:rythme") && st(sansCle, "exploit:grand-chelem")?.horsJeu === true);
    // sans trophees_joueur (la seule source « ciblee ») : plusieurs chemins sont impossibles, les deux exploits attendent
    const cibleeSeule = repondre(base({ premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), capacites: MESURES, lecture: { compteurs: {}, mesures: { xp_total: 0, trophees: [{ source: "ciblee", palier: 3, n: 2 }] }, speciaux: {} } }), () => 0).r;
    check("sans la capacité « trophees » : ni le grand chelem ni la vitrine suivis ; ils en dépendent (rattrapage)", !st(cibleeSeule, "exploit:grand-chelem") && !st(cibleeSeule, "exploit:vitrine") && dependancesDe(q("exploit:vitrine")).includes("trophees"));
    check("… le chapitre « trophees » du fil reste suivi sur la source ciblée, et passe en rétro quand la capacité s'allume", dependancesDe({ famille: "fil", objectif: { k: "mesure", mesure: "trophees", seuil: 1 } }).includes("trophees"));
    check("la cadence garde la bannière de la machine volante", q("exploit:rythme").recompense.cosmetique === "banniere:machine-volante" && q("exploit:machine-volante").retiree === true);
    const debrief = q("contrat:debrief");
    check("le débrief : quotidien, 80 XP, attend le journal v3 et blanc_debrief", debrief.repetition === "quotidienne" && debrief.recompense.xp === 80 && JSON.stringify(debrief.requiert) === JSON.stringify(["journal3", "debrief"]) && !rien.etats.some((s) => s.quete.id === "contrat:debrief"));
    const capa = { ...CAPACITES_VIDE, journal: 3 as const, debrief: true };
    const ouvert = (n: number | undefined) => repondre(base({ capacites: capa, lecture: { compteurs: {}, mesures: { xp_total: 0, ...(n === undefined ? {} : { blancs_a_debriefer: n }) }, speciaux: {} } }), () => 0).r;
    check("prérequis d'état : un blanc à débriefer l'ouvre ; aucun, ou la mesure inconnue, non", ouverte(ouvert(1), "contrat:debrief") && !ouverte(ouvert(0), "contrat:debrief") && !ouverte(ouvert(undefined), "contrat:debrief"));
  }

  // la malle et le lendemain (V3 §7.3, §7.5)
  {
    const malle = (coches: number | undefined, jourJ: string) => repondre(base({ jourJ, ...(coches === undefined ? {} : { malleCoches: coches }) }), () => 1).r;
    check("la malle : hors jeu tant qu'elle n'est pas lue ; prête à 5 cases, à J-2", st(malle(undefined, "2026-10-17"), "trame:ep:malle")?.horsJeu === true && fait(malle(5, "2026-10-17"), "trame:ep:malle") && !fait(malle(4, "2026-10-17"), "trame:ep:malle"));
    check("… fermée à J-10", !ouverte(malle(7, "2026-10-25"), "trame:ep:malle"));
    check("le lendemain : 0 XP, ouvert une fois le jour J passé, jamais avant", q("trame:ep:lendemain").recompense.xp === 0 && fait(malle(7, "2026-10-14"), "trame:ep:lendemain") && !ouverte(malle(7, "2026-10-17"), "trame:ep:lendemain"));
    check("ni l'une ni l'autre ne retient l'épilogue (facultatives)", q("trame:ep:malle").optionnelle === true && q("trame:ep:lendemain").optionnelle === true);
  }
}

console.log("\n# v3 §4.6, §4.7 : la maîtrise unique, le cap, la mémoire (A4b)");
{
  type Unique = NonNullable<MesuresSql["maitrise_unique"]>[string];
  const u = (pct: number | null, questions: number, statut: Unique["statut"], o: Partial<Unique> = {}): Unique => ({ pct, questions, total: questions, debut: null, statut, derniere: null, ancienne: null, ...o });
  const avecMesures = (m: MesuresSql, o: Partial<Entree> = {}) => base({ ...o, lecture: { compteurs: {}, mesures: { xp_total: 0, ...m }, speciaux: {} } });
  const ancien = { fsa: { pct: 70, questions: 40, debut: 50 }, quant: { pct: 90, questions: 39, debut: null } };
  check("format ancien : mesurée à 40 questions, pas à 39", maitriseDe(avecMesures({ maitrise: ancien }), "fsa") === 70 && maitriseDe(avecMesures({ maitrise: ancien }), "quant") === null);
  const unique = avecMesures({ maitrise: ancien, maitrise_unique: { fsa: u(55, 23, "provisoire"), quant: u(62, 45, "mesuree") } });
  check("maîtrise unique : seul le statut « mesuree » compte, elle passe devant l'ancienne", maitriseDe(unique, "quant") === 62 && maitriseDe(unique, "fsa") === null);
  check("… une matière absente de la maîtrise unique n'a aucune réponse : pas mesurée", maitriseDe(unique, "ethics") === null);
  const seuil60 = (m: MesuresSql) => fait(repondre(avecMesures(m), () => 99).r, "branche:quant:maitrise60");
  check("« maîtrise 60 » de Quant : faite au format ancien (62 % sur 120) et au nouveau (62 % mesurée)", seuil60({ maitrise: { quant: { pct: 62, questions: 120, debut: null } } }) && seuil60({ maitrise_unique: { quant: u(62, 60, "mesuree") } }));
  check("… pas sur une maîtrise unique provisoire, même haute", !seuil60({ maitrise: { quant: { pct: 62, questions: 120, debut: null } }, maitrise_unique: { quant: u(80, 30, "provisoire") } }));
  const remontee: Quete = { id: "essai:remontee", famille: "longcours", programme: PROGRAMME, titre: "r", consigne: "r", objectif: { k: "mesure", mesure: "matieres_remontees", filtre: { n: 10 }, seuil: 1 }, prerequis: [], recompense: { xp: 0 }, repetition: "unique", visibilite: "visible", ordre: 1 };
  const remontees = (m: MesuresSql) => repondre(avecMesures(m, { catalogue: [remontee] }), () => 0).r.etats.find((x) => x.quete.id === remontee.id)?.ev?.valeur;
  check("matières remontées : le début de la maîtrise unique quand elle est là", remontees({ maitrise_unique: { quant: u(70, 60, "mesuree", { debut: 40 }) } }) === 1 && remontees({ maitrise_unique: { quant: u(70, 30, "provisoire", { debut: 40 }) } }) === 0);

  // le rattrapage (V3 §1.9) : la capacité « maitrise » vue pour la première fois, la maîtrise unique remplit
  // « maîtrise 60 » d'un coup (sans date d'atteinte) : en rétro, plafonnée, une seule cérémonie
  {
    const vues = { ...CAPACITES_VIDE, mesures: true };
    const capa = { ...CAPACITES_VIDE, mesures: true, maitrise: true };
    const tout = (o: Partial<Entree>) => repondre(avecMesures({ maitrise_unique: Object.fromEntries(contenu.map((m) => [m.key, u(m.key === "quant" ? 62 : 20, 60, "mesuree")])) }, { premier: false, dernierCalcul: new Date("2026-10-14T00:00:00Z"), capacites: capa, ...o }), () => 99).r;
    const r = tout({ capacitesVues: vues });
    const item = r.lot.find((i) => i.quete === "branche:quant:maitrise60");
    const dependantes = r.lot.filter((i) => i.etat === "terminee" && dependancesDe(cat.find((x) => x.id === i.quete) ?? { famille: "contrat", objectif: { k: "special", cle: "" } }).includes("maitrise"));
    const verse = Math.min(r.budgetRetro, r.lot.filter((i) => i.etat === "terminee" && i.retro).reduce((s, i) => s + Math.min(i.xp ?? 0, i.plafond ?? 0), 0));
    check("capacité « maitrise » vue pour la première fois : « maîtrise 60 » de Quant rattrapée en rétro, aucune fête par quête, XP ≤ plafondRetro", item?.etat === "terminee" && item.retro === true && dependantes.length > 0 && dependantes.every((i) => i.retro) && verse <= plafondRetro(r.niveau) && r.capacitesVues?.maitrise === true, JSON.stringify(item));
    const ensuite = tout({ capacitesVues: capa }).lot.find((i) => i.quete === "branche:quant:maitrise60");
    check("… une fois la capacité vue, une maîtrise 60 qui se remplit paie normalement", ensuite?.retro === false, JSON.stringify(ensuite));
    const m60 = cat.find((x) => x.id === "branche:quant:maitrise60")!;
    check("la dépendance ne sert qu'au rattrapage : « maîtrise 60 » n'exige rien de la base pour être suivie", !(m60.requiert ?? []).includes("maitrise") && dependancesDe(m60).includes("maitrise"));
  }

  // le rang garde l'ancienne règle (V3 §4.5) : la maîtrise unique ne fait monter aucun palier
  const palierOr = (m: MesuresSql) => repondre(avecMesures({ elo: 1500, ...m }), () => 99).r.etats.find((x) => x.quete.objectif.k === "mesure" && x.quete.objectif.mesure === "pic_palier" && x.quete.objectif.seuil === 2)?.ev?.valeur;
  const vieux = { maitrise: Object.fromEntries(contenu.map((m) => [m.key, { pct: 30, questions: 60, debut: null }])) };
  check("le palier atteint se calcule sur l'ancienne maîtrise, avec ou sans la maîtrise unique",
    palierOr(vieux) !== undefined && palierOr(vieux) === palierOr({ ...vieux, maitrise_unique: Object.fromEntries(contenu.map((m) => [m.key, u(95, 60, "mesuree")])) }), `${palierOr(vieux)}`);

  // les mesures nouvelles, lues par une quête d'essai
  const essai = (mesure: "revisions_dues" | "ratures_scellees" | "preparation", seuil: number): Quete => ({
    id: `essai:${mesure}`, famille: "longcours", programme: PROGRAMME, titre: mesure, consigne: mesure, objectif: { k: "mesure", mesure, seuil }, prerequis: [], recompense: { xp: 0 }, repetition: "unique", visibilite: "visible", ordre: 1,
  });
  const ev = (q: Quete, m: MesuresSql) => repondre(avecMesures(m, { catalogue: [q] }), () => 0).r.etats.find((x) => x.quete.id === q.id);
  const revoir = { aujourdhui: 40, demain: 30, ratures: 12, rappels: 28 };
  check("« à revoir aujourd'hui » : la file de revisions_dues, 25 au plus ; sans elle, inconnue (hors jeu)", ev(essai("revisions_dues", 25), { revoir })?.fait === true && ev(essai("revisions_dues", 26), { revoir })?.ev?.valeur === 25 && ev(essai("revisions_dues", 1), { ratures_ouvertes: { total: 9, matieres: {} } })?.horsJeu === true);
  check("ratures scellées : lues ; sans elles, inconnues", ev(essai("ratures_scellees", 3), { ratures_scellees: 3 })?.fait === true && ev(essai("ratures_scellees", 3), {})?.horsJeu === true);
  const poids = contenu.reduce((x, m) => x + m.poids, 0);
  const fsa = contenu.find((m) => m.key === "fsa")!;
  const prep = Math.round((fsa.poids * 80) / poids);
  check("la préparation : la maîtrise pondérée par les poids, provisoires comprises, jamais inconnue", ev(essai("preparation", prep), { maitrise_unique: { fsa: u(80, 20, "provisoire") } })?.fait === true && ev(essai("preparation", prep + 1), { maitrise_unique: { fsa: u(80, 20, "provisoire") } })?.fait === false && ev(essai("preparation", 1), {})?.horsJeu === false, String(prep));

  // la file « À revoir » portée par la vue et le panneau (V3 §5.4)
  check("la file : revisions_dues bornée à 25 ; repli : les ratures en cours bornées à 25, rien pour demain ; rien de connu : null",
    JSON.stringify(revoirDe(avecMesures({ revoir }))) === JSON.stringify({ aujourdhui: 25, demain: 25 }) && JSON.stringify(revoirDe(avecMesures({ ratures_ouvertes: { total: 285, matieres: {} } }))) === JSON.stringify({ aujourdhui: 25, demain: 0 }) && revoirDe(avecMesures({})) === null);

  // le débrief vivant : il paie, il se montre, il ne fausse pas le trio du jour
  const capa = { ...CAPACITES_VIDE, journal: 3 as const, debrief: true };
  const e0 = avecMesures({ blancs_a_debriefer: 1, ratures_ouvertes: { total: 20, matieres: {} } }, { capacites: capa });
  const e1 = { ...e0, contrats: tirerContrats(e0, "joueur-debrief") };
  const { r, e: e2 } = repondre(e1, () => 99);
  check("trois contrats tirés, le débrief en plus : le trio compte trois contrats, et se fait", r.contrats.length === 3 && r.trioFait && r.lot.some((i) => i.quete === `contrat:trio:${jour}`), `${r.contrats.length} · ${r.trioFait}`);
  check("le débrief fait verse ses 80 XP, à la période du jour", r.lot.some((i) => i.quete === "contrat:debrief" && i.periode === jour && i.etat === "terminee" && i.xp === 80));
  const vue = construireVue(e2, r, recommander(e2, r), { devoile: null });
  check("la vue le porte à part des contrats tirés (les 3 contrats restent 3)", vue.debrief?.id === "contrat:debrief" && vue.contrats.length === 3 && vue.trio.total === 3);
  const { r: rOuvert, e: eOuvert } = repondre(e1, (d) => (d.evenement === "blanc_debriefe" ? 0 : 99));
  const pOuvert = panneauDe(construireVue(eOuvert, rOuvert, recommander(eOuvert, rOuvert), { devoile: null }));
  check("pas encore fait : le panneau le propose, avec sa destination (les examens blancs)", pOuvert.quetes.some((x) => x.id === "contrat:debrief" && x.sur === "Contrat du jour · le débrief" && x.destination?.href === "/mock-exams"), pOuvert.quetes.map((x) => x.id).join());
  const sans = avecMesures({ blancs_a_debriefer: 0 }, { capacites: capa });
  const vSans = construireVue(sans, repondre(sans, () => 0).r, null, { devoile: null });
  check("aucun blanc à débriefer : rien à montrer", vSans.debrief === null);
  // le parcours naturel : blanc rendu puis débriefé d'une traite entre deux calculs (blancs_a_debriefer déjà
  // retombé à 0) : la quête s'ouvre sur le débrief du jour et paie
  const traite = repondre(sans, (d) => (d.evenement === "blanc_debriefe" && (d.filtre?.part as { min?: number } | undefined)?.min === 80 ? 1 : 0)).r;
  check("débrief complété avant le premier calcul du jour : la quête paie ses 80 XP", traite.lot.some((i) => i.quete === "contrat:debrief" && i.periode === jour && i.etat === "terminee" && i.xp === 80), traite.lot.filter((i) => i.quete.includes("debrief")).map((i) => JSON.stringify(i)).join(" "));
  check("… et rien sans débrief du jour ni blanc qui attend", !repondre(sans, () => 0).r.lot.some((i) => i.quete === "contrat:debrief" && i.etat === "terminee"));
}

console.log("\n# v3 §3.10 et §11.5 : les tailles de fête, le mode sobre (A9)");
{
  const J = JSON.stringify;
  const t = (quete: string) => tailleFete({ quete });
  const attendu: [string, string][] = [
    ["contrat:quotidien:serie", "ligne"], ["contrat:debrief", "ligne"], ["trame:prologue:dix", "ligne"], ["branche:fsa:entree", "ligne"], ["branche:fsa:drill", "ligne"],
    ["branche:fsa:ciblee", "carte"], ["branche:ethics:serie", "carte"], ["branche:fsa:maitrise60", "carte"], ["branche:fsa:maitrise75", "carte"], ["branche:fsa:signature", "carte"],
    ["longcours:remontee:1", "carte"], ["fil:encre:3", "carte"], ["exploit:nuit-blanche", "carte"],
    ["acte:acte3", "page"], ["acte:prologue", "page"], ["acte:essai/g1", "page"],
    ["branche:fixed_income:maitre", "plein"], ["cfa-l2/branche:fsa:maitre", "plein"], ["acte:acte6", "plein"], ["acte:epilogue", "plein"], ["fil:programmes:1", "plein"],
  ];
  const faux = attendu.filter(([q, x]) => t(q) !== x).map(([q, x]) => `${q} : ${t(q)} au lieu de ${x}`);
  check("tailleFete : ligne (contrat, étape), carte (jalon, palier, exploit), page (acte), plein (Maître, chef-d'œuvre, épilogue, programme mené)", faux.length === 0, faux.join(" ; "));
  check("une étape préfixée d'un autre programme garde sa taille", t("cfa-l2/branche:fsa:ciblee") === "carte" && t("cfa-l2/branche:fsa:cours") === "ligne");

  // le mode sobre : la clé du compte, fixée par V3 §13.2
  check("lireSobre : vrai seulement si rl_sobre vaut true", CLE_SOBRE === "rl_sobre" && lireSobre({ user_metadata: { rl_sobre: true } }) && !lireSobre({ user_metadata: { rl_sobre: "true" } }) && !lireSobre({ user_metadata: {} }) && !lireSobre({ user_metadata: null }) && !lireSobre(null));
  check("feteSobre : une ligne sans XP ni pièce ; hors mode sobre, rien ne change", J(feteSobre({ taille: "plein", xp: 400, piece: "titre:maitre-bottega" }, true)) === J({ taille: "ligne" }) && J(feteSobre({ taille: "carte", xp: 50 }, false)) === J({ taille: "carte", xp: 50 }));

  const acte: FeteCodex = { quete: "acte:acte3", periode: "", titre: "La bottega", famille: "acte", xp: 150, recompense: "Cadre : Sanguine", piece: "cadre:sanguine", rang: 0 };
  const ouvre = { id: "acte4", titre: "Le grand atelier", sousTitre: "", replique: { texte: "On monte d'un étage.", pose: "fier" as const }, precedent: "La bottega" };
  const h = habitFete(acte, { sobre: false, acte: ouvre, autres: 0 });
  check("un acte clos : une page, l'XP, la pièce, l'acte qui s'ouvre, et la réplique de Léonard", h.taille === "page" && h.xp === 150 && h.piece === "cadre:sanguine" && !!h.sous?.includes("Le grand atelier") && h.replique?.texte === "On monte d'un étage.", J(h));
  const hs = habitFete(acte, { sobre: true, acte: ouvre, autres: 0 });
  check("le même acte en mode sobre : une ligne, sans XP, sans pièce, sans réplique", hs.taille === "ligne" && hs.xp === undefined && hs.piece === undefined && !hs.replique, J(hs));
  const contrat: FeteCodex = { quete: "contrat:quotidien:serie", periode: "2026-10-17", titre: "Série de cinq", famille: "contrat", xp: 20, recompense: null, piece: null, rang: 4 };
  check("la dernière fête jouée dit les autres quêtes tamponnées", habitFete(contrat, { sobre: false, acte: null, autres: 2 }).titre === `Série de cinq, ${CODEX.fete.autres(2)}`);
  check("un jalon : une carte, sans réplique (Léonard passe la dire)", (() => { const c = habitFete({ ...contrat, quete: "branche:fsa:ciblee", famille: "branche" }, { sobre: false, acte: null, autres: 0 }); return c.taille === "carte" && !c.replique && c.xp === 20; })());

  // la vue et le bilan portent le mode sobre ; par défaut, il est éteint
  const { r, e } = repondre(base(), () => 0);
  const vs = construireVue(e, r, null, { devoile: null, sobre: true });
  const vn = construireVue(e, r, null, { devoile: null });
  check("la vue et le bilan portent le mode sobre ; sans réglage, éteint", vs.sobre && bilanDe(vs).sobre === true && !vn.sobre && bilanDe(vn).sobre === false);
  check("le mode sobre garde la séance, les quêtes du panneau, le cap et les contrats", J(panneauDe(vs).quetes) === J(panneauDe(vn).quetes) && J(panneauDe(vs).seance) === J(panneauDe(vn).seance) && J(vs.contrats) === J(vn.contrats) && J(vs.cap) === J(vn.cap) && J(vs.seance) === J(vn.seance));
  // les écrans : la fête branchée sur components/fete, l'XP rangée en mode sobre
  const fete = readFileSync("components/codex/FeteCodex.tsx", "utf8");
  // Codex simplifié : plus de fête automatique, les grandes fêtes se jouent au clic « Récupérer » (scripts/codex/test-recuperer.ts)
  const recuperer = readFileSync("components/codex/Recuperer.tsx", "utf8");
  check("les fêtes jouées au clic « Récupérer » (components/fete, chargée à la demande), une par une", !fete.includes("habitFete(") && recuperer.includes('import("@/components/fete/Fete")') && recuperer.includes("ssr: false") && recuperer.includes("habitFete(fete"));
  const detail = readFileSync("components/codex/DetailQuete.tsx", "utf8");
  const carte = readFileSync("components/codex/CarteCodex.tsx", "utf8");
  check("mode sobre : le détail d'une quête sans récompense, le trio sans XP, le tampon ancré sur la carte (data-quete)", detail.includes("const recompense = sobre ? []") && carte.includes("vue.sobre ? CODEX.contrats.trioFaitSobre") && carte.includes("data-quete={nd.cle}"));
}

console.log("\n# le rythme long (V3 §10.2 à §10.5, lot A8)");
{
  // le plan daté : la frise se lit sur le dernier jalon échu
  const J = "2026-11-12";
  const evs = (fait: boolean, atteint: string | null) => JALONS_CFA_L1.map((x) => (x.j === 45 ? { fait, atteint: atteint ? new Date(atteint + "T10:00:00Z") : null } : { fait: x.j > 45, atteint: null }));
  check("plan : le 10 octobre, dernier jalon échu J-45 (le 28 septembre), fait le 20 : 8 jours d'avance", planDe(JALONS_CFA_L1, evs(true, "2026-09-20"), "2026-10-10", J).libelle === "8 jours d'avance");
  check("plan : pas fait : 12 jours de retard", planDe(JALONS_CFA_L1, evs(false, null), "2026-10-10", J).ecart === -12);
  check("plan : une mesure faite sans date d'atteinte : à l'heure", planDe(JALONS_CFA_L1, evs(true, null), "2026-10-10", J).libelle === "à l'heure");
  const tot = planDe(JALONS_CFA_L1, JALONS_CFA_L1.map((x) => ({ fait: x.j === 120, atteint: x.j === 120 ? new Date("2026-07-05T10:00:00Z") : null })), "2026-07-01", J);
  check("plan : aucun jalon échu, le prochain déjà fait : 10 jours d'avance", tot.libelle === "10 jours d'avance" && tot.prochain?.j === 120, tot.libelle);
  check("plan : les libellés (« 1 jour de retard »)", libelleEcart(-1) === "1 jour de retard" && libelleEcart(5) === "5 jours d'avance" && libelleEcart(0) === "à l'heure");
  check("plan : ses objectifs partent avec les compteurs (jour J connu), aucun sans jour J", planifier(base({ jourJ: J })).length > planifier(base()).length);

  // le mode sprint
  check("sprint : jour J à 4 semaines du premier calcul", estSprint(J, "2026-10-16T08:00:00Z", "2026-10-17") && !estSprint(J, "2026-08-01T08:00:00Z", "2026-10-17") && !estSprint(null, null, "2026-10-17"));
  const eS = base({ jourJ: J, premierCalcul: "2026-10-15T08:00:00Z", premier: false });
  const { r: rS, e: eS2 } = repondre(eS, () => 0);
  const encre = rS.etats.filter((s) => s.quete.chaine === "encre");
  check("sprint : les paliers « Deux mois » et au-delà passent après l'examen, pas « Un mois »", encre.filter((s) => s.differee).map((s) => s.quete.palier).join(",") === "3,4,5", encre.map((s) => `${s.quete.palier}:${!!s.differee}`).join(" "));
  const reco = recommander(eS2, rS);
  check("sprint : jamais proposés", !reco || !rS.etats.some((s) => s.differee && s.quete.id === reco.quete.id));
  // six semaines déjà tenues (4 jours d'encre chacune), 4 semaines restantes : il manque 2 à « Deux mois », 6 à « Une saison »
  const tenues = Array.from({ length: 6 }, (_, w) => [0, 1, 2, 3].map((d) => ({ jour: new Date(Date.UTC(2026, 7, 31 + 7 * w + d)).toISOString().slice(0, 10), n: 20 }))).flat();
  const r6 = repondre({ ...eS, lecture: { compteurs: {}, mesures: { xp_total: 0, jours: tenues }, speciaux: {} } }, () => 0).r;
  const differe = (palier: number) => r6.etats.find((s) => s.quete.chaine === "encre" && s.quete.palier === palier)?.differee === true;
  check("sprint, 6 semaines tenues : « Deux mois » (il en manque 2) reste proposé, « Une saison » (il en manque 6) passe après l'examen", !differe(3) && differe(4) && differe(5), r6.etats.filter((s) => s.quete.chaine === "encre").map((s) => `${s.quete.palier}:${!!s.differee}`).join(" "));
  const hors = repondre(base({ jourJ: J, premierCalcul: "2026-06-01T08:00:00Z", premier: false }), () => 0).r;
  check("hors sprint : aucun palier différé", !hors.etats.some((s) => s.differee));
  const duree = (c: { modele: string }) => MODELES_CONTRATS.find((m) => m.id === c.modele)?.duree ?? 0;
  const sprintes = Array.from({ length: 30 }, (_, i) => tirerContrats(eS, "sprint-" + i)).flat();
  check("sprint : des contrats courts (15 minutes au plus chacun)", sprintes.length >= 60 && sprintes.every((c) => duree(c) <= 15), String(Math.max(...sprintes.map(duree))));
  const longs = Array.from({ length: 30 }, (_, i) => tirerContrats({ ...eS, premierCalcul: "2026-06-01T08:00:00Z" }, "sprint-" + i)).flat();
  check("hors sprint : des contrats plus longs restent possibles", longs.some((c) => duree(c) > 15));

  // le retour après 4 jours sans réponse
  const retour = (dernier: string, o: Partial<Entree> = {}) => base({ lecture: { compteurs: {}, mesures: { xp_total: 0, jours: [{ jour: "2026-09-01", n: 50 }, { jour: dernier, n: 30 }] }, speciaux: {} }, ...o });
  const t4 = tirerContrats(retour("2026-10-10"), "j-retour");
  check("retour à 4 jours (le 10, puis rien les 11, 12, 13 et 14) : un seul contrat, la reprise", t4.length === 1 && t4[0].modele === "reprise" && t4[0].emplacement === "entretien", JSON.stringify(t4));
  check("... son id : contrat:reprise:<jour>, 10 questions", instanceContrat(MODELES_CONTRATS.find((m) => m.id === "reprise")!, {}, jour, contenu).id === "contrat:reprise:2026-10-15");
  check("... la séance du jour : 15 minutes (budget choisi : gardé)", budgetDuJour(retour("2026-10-10")) === 15 && budgetDuJour(retour("2026-10-10", { budget: 60 })) === 60);
  check("3 jours sans réponse : pas de reprise", !repriseDuJour(retour("2026-10-11")) && tirerContrats(retour("2026-10-11"), "j-retour").length === 3);
  check("un compte neuf n'est pas un retour", !enReprise([], jour) && !enReprise(undefined, jour));
  check("la reprise n'est jamais tirée au sort", Array.from({ length: 40 }, (_, i) => tirerContrats(base(), "j" + i)).flat().every((c) => c.modele !== "reprise"));

  // la semaine choisie
  const lundi = "2026-10-12";
  const ids = (s: Entree["semaine"]) => repondre(base({ semaine: s }), () => 0).r.etats.filter((x) => x.quete.repetition === "hebdomadaire" && x.quete.famille === "contrat").map((x) => x.quete.id).sort().join(",");
  check("sans choix : les trois contrats de la semaine d'avant", ids(null) === "contrat:hebdo:commande,contrat:hebdo:encre,contrat:hebdo:pigments", ids(null));
  check("l'ingénieur : semaine d'encre + demi-examen + deux 30 du jour", ids({ lundi, cible: 3, commande: "ingenieur", params: {} }) === "contrat:hebdo:encre,contrat:hebdo:ingenieur-blanc,contrat:hebdo:ingenieur-trente");
  check("un choix d'une autre semaine ne compte pas", ids({ lundi: "2026-10-05", cible: 3, commande: "ingenieur", params: {} }) === ids(null));
  const ban = quetesSemaine({ lundi, cible: 4, commande: "banquier", params: { matiere: "quant", depart: 52 } }, contenu);
  const obj = ban[1]?.objectif;
  check("le banquier : la matière choisie à 57 % (52 + 5)", ban.length === 2 && obj?.k === "mesure" && obj.seuil === 57 && (obj.filtre as { matiere?: string } | undefined)?.matiere === "quant" && ban[1].id === "contrat:hebdo:banquier");
  const enc = ban[0].objectif;
  check("la semaine d'encre prend la cible (4 jours, 110 XP ; 3 : 95 ; 5 : 120)", enc.k === "compteur" && enc.seuil === 4 && ban[0].recompense.xp === 110 && xpSemaineEncre(3) === 95 && xpSemaineEncre(5) === 120);
  check("le banquier sans matière : la semaine d'encre seule", quetesSemaine({ lundi, cible: 5, commande: "banquier", params: {} }, contenu).length === 1);
  check("le copiste attend la base (journal v3, À revoir, ratures sèches)", quetesSemaine({ lundi, cible: 5, commande: "copiste", params: {} }, contenu).slice(1).every((q) => (q.requiert ?? []).includes("journal3")));
  check("lireSemaine : autre semaine, cible 6 ou commande inconnue → rien", lireSemaine({ lundi, cible: 4, commande: "copiste" }, lundi)?.cible === 4 && !lireSemaine({ lundi: "2026-10-05", cible: 4, commande: "copiste" }, lundi) && !lireSemaine({ lundi, cible: 6, commande: "copiste" }, lundi) && !lireSemaine({ lundi, cible: 4, commande: "peintre" }, lundi));
  const mb = matiereBanquier(contenu, (c) => ({ ethics: 80, fsa: 45, equity: 62, fixed_income: 50 } as Record<string, number>)[c] ?? 90);
  check("la matière du banquier : la plus faible des lourdes", mb?.matiere === "fsa" && mb.depart === 45, JSON.stringify(mb));
  // la même lecture que l'objectif (maitriseDe) : une matière provisoire (moins de 40 questions) n'est pas visée
  const lourdesMesurees = (provisoire: string | null) => ({ xp_total: 0, maitrise: Object.fromEntries(contenu.map((m) => [m.key, m.key === provisoire ? { pct: 55, questions: 20, debut: null } : { pct: 70, questions: 80, debut: 50 }])) });
  const eProv = base({ lecture: { compteurs: {}, mesures: lourdesMesurees("fsa"), speciaux: {} } });
  const mbProv = matiereBanquier(contenu, (c) => maitriseDe(eProv, c));
  check("le banquier ne vise pas une matière provisoire (FSA à 55 %, 20 questions) : une mesurée, départ juste", !!mbProv && mbProv.matiere !== "fsa" && mbProv.depart === 70, JSON.stringify(mbProv));
  const eRien = base({ lecture: { compteurs: {}, mesures: { xp_total: 0, maitrise: Object.fromEntries(contenu.map((m) => [m.key, { pct: 55, questions: 20, debut: null }])) }, speciaux: {} } });
  check("aucune matière lourde mesurée : pas de banquier (jamais « 5 % de maîtrise »)", matiereBanquier(contenu, (c) => maitriseDe(eRien, c)) === null);
  check("le copiste n'est proposé qu'avec ce que la base sait faire", commandesPossibles(() => false).join(",") === "banquier,ingenieur" && commandesPossibles(() => true).length === 3);
  check("une commande demande aussi ses outils au programme (sans blancs ni 30 du jour : pas d'ingénieur)", commandesPossibles(() => true, new Set(["revoir", "cinq"] as const)).join(",") === "banquier,copiste" && commandesPossibles(() => true, CFA_L1.outils).length === 3);

  const ctxD = contexteDestination(base());
  const dela = (["banquier", "copiste", "ingenieur"] as const).flatMap((c) => quetesSemaine({ lundi, cible: 4, commande: c, params: { matiere: "quant", depart: 40 } }, contenu));
  const sansDest = dela.filter((q) => !destinationDe(q, {}, ctxD));
  check("chaque contrat de la semaine a sa destination (« Y aller »)", dela.length === 8 && sansDest.length === 0, sansDest.map((q) => q.id).join());

  // un choix tardif ne repaie pas le même travail : la commande de la semaine (le blanc) déjà payée
  const payeCetteSemaine = (id: string): LigneProgression => ({ quete_id: id, periode: lundi, etat: "recompensee", progression: 1, cible: 1, ouverte_le: "2026-10-13T08:00:00Z", terminee_le: "2026-10-13T09:00:00Z", recompensee_le: "2026-10-13T09:00:00Z", retro: false, xp: 150, cosmetique: null, titre: null, vu: true });
  const ingenieur = { lundi, cible: 3, commande: "ingenieur" as const, params: {} };
  const blancRendu = (d: Demande) => (d.evenement === "examen_blanc_rendu" ? 1 : 0);
  const tardif = repondre(base({ jourJ: "2026-11-12", semaine: ingenieur, progression: [payeCetteSemaine("contrat:hebdo:commande")] }), blancRendu).r;
  check("commande de la semaine payée, puis l'ingénieur choisi : aucun nouvel item à XP pour le même blanc", !tardif.lot.some((i) => i.quete.startsWith("contrat:hebdo:ingenieur")) && !tardif.lot.some((i) => (i.xp ?? 0) > 0 && i.quete.startsWith("contrat:hebdo:")) && !tardif.etats.some((s) => s.quete.id.startsWith("contrat:hebdo:ingenieur")), tardif.lot.map((i) => `${i.quete}:${i.xp ?? ""}`).join(" "));
  check("… le tour des pigments payé : même chose ; la semaine d'encre payée ne bloque rien (même id)", !semaineEntamee([payeCetteSemaine("contrat:hebdo:encre")], lundi) && semaineEntamee([payeCetteSemaine("contrat:hebdo:pigments")], lundi) && !semaineEntamee([{ ...payeCetteSemaine("contrat:hebdo:pigments"), periode: "2026-10-05" }], lundi));
  const aTemps = repondre(base({ jourJ: "2026-11-12", semaine: ingenieur, progression: [payeCetteSemaine("contrat:hebdo:ingenieur-blanc")] }), blancRendu).r;
  check("un choix posé à temps tient après que ses propres contrats ont payé", aTemps.etats.some((s) => s.quete.id === "contrat:hebdo:ingenieur-trente") && !aTemps.etats.some((s) => s.quete.id === "contrat:hebdo:commande"));

  // la date approximative
  const auj = "2026-10-17";
  check("date : « vers mi-novembre » → le 15", dateApproximative("vers mi-novembre", auj) === "2026-11-15");
  check("date : début (5), fin (25), le mois seul (15)", dateApproximative("début décembre", auj) === "2026-12-05" && dateApproximative("fin novembre", auj) === "2026-11-25" && dateApproximative("Novembre", auj) === "2026-11-15");
  check("date : un mois passé tombe l'an prochain", dateApproximative("mi-septembre", auj) === "2027-09-15");
  check("date : une date exacte est gardée", dateApproximative("12/11/2026", auj) === "2026-11-12" && dateApproximative("12 novembre", auj) === "2026-11-12" && dateApproximative("2026-11-12", auj) === "2026-11-12");
  check("date : illisible → null", dateApproximative("un jour", auj) === null);

  // le verdict
  const v = lireVerdict({ programme: "finance/cfa-l1", session: "2026-11", statut: "pas_cette_fois", bandes: { quant: "basse", fsa: "moyenne", x: "nulle" }, saisi_le: "2026-12-20T10:00:00Z" });
  check("verdict lu, bande inconnue écartée", v?.statut === "pas_cette_fois" && v.bandes.quant === "basse" && !("x" in v.bandes));
  check("verdict mal formé → null", !lireVerdict({ programme: "finance/cfa-l1", session: "2026-13", statut: "admis" }) && !lireVerdict({ programme: "finance/cfa-l1", session: "2026-11", statut: "recale" }));
  check("bande basse : ×1,3 pendant 60 jours, puis ×1 ; moyenne ou admis : ×1", facteurBande(v, "quant", "2027-01-10") === 1.3 && facteurBande(v, "quant", "2027-02-19") === 1 && facteurBande(v, "fsa", "2027-01-10") === 1 && facteurBande(v && { ...v, statut: "admis" }, "quant", "2027-01-10") === 1);
  check("la session d'un jour J", sessionDe("2026-11-12") === "2026-11");
  const rec = recalageVerdict(v, "2027-01-10");
  check("recalage : 60 jours après un « pas cette fois », puis plus rien ; jamais après « admis »", !!rec && rec.facteur("quant") === 1.3 && rec.facteur("fsa") === 1 && !recalageVerdict(v, "2027-02-19") && !recalageVerdict(v && { ...v, statut: "admis" }, "2027-01-10"));
  const pcts: Record<string, number> = { quant: 20, fsa: 40 };
  const mc = maitriseDuCodex(contenu, { maitrise: Object.fromEntries(contenu.map((m) => [m.key, { pct: pcts[m.key] ?? 80, questions: 60, debut: 40 }])) });
  check("séance : « ce qui coince » passe à la matière en bande basse (Quant ×1,3 devant FSA)", matiereCoince(mc, false)?.cle === "fsa" && matiereCoince(mc, false, rec!.facteur)?.cle === "quant");

  // ce que /codex en montre (lib/codex/rythme.ts)
  const active = (o: Partial<Entree> = {}) => base({ jourJ: "2026-11-12", lecture: { compteurs: {}, mesures: { ...lourdesMesurees(null), jours: [{ jour: "2026-10-06", n: 40 }, { jour: "2026-10-08", n: 9 }, { jour: "2026-10-14", n: 12 }] }, speciaux: {} }, ...o });
  const vr = (e: Entree, o: Partial<Parameters<typeof vueRythme>[2]> = {}) => vueRythme(e, {}, { semaineDispo: true, capacites: CAPACITES_VIDE, moment: "courant", verdicts: [], ...o });
  const v1 = vr(active());
  check("vue : le plan (six jalons) au cours ordinaire", v1.plan?.jalons.length === 6 && !vr(active(), { moment: "veillee" }).plan);
  check("vue : le lundi relit la semaine passée (49 questions, 1 jour d'encre)", v1.lundi?.questions === 49 && v1.lundi.joursEncre === 1 && v1.lundi.lundi === "2026-10-12", JSON.stringify(v1.lundi));
  check("vue : sans la base qui le garde, pas de carte du lundi", !vr(active(), { semaineDispo: false }).lundi);
  check("vue : sans les capacités, le copiste n'est pas proposé", v1.lundi?.commandes.map((c) => c.id).join(",") === "banquier,ingenieur");
  const sansMesure = vr(active({ lecture: { compteurs: {}, mesures: { xp_total: 0, jours: [{ jour: "2026-10-06", n: 40 }] }, speciaux: {} } }));
  check("vue : aucune matière lourde mesurée, le banquier n'est pas proposé", sansMesure.lundi?.commandes.map((c) => c.id).join(",") === "ingenieur", JSON.stringify(sansMesure.lundi?.commandes));
  const choisi = vr(active({ semaine: { lundi: "2026-10-12", cible: 4, commande: "ingenieur", params: {} } }));
  check("vue : la semaine choisie, plus de carte du lundi", !choisi.lundi && choisi.semaine?.commande === "ingenieur" && choisi.semaine.nom === "L'ingénieur");
  check("vue : la commande de la semaine déjà payée, plus de carte du lundi", !vr(active({ progression: [payeCetteSemaine("contrat:hebdo:commande")] })).lundi && !!vr(active({ progression: [payeCetteSemaine("contrat:hebdo:encre")] })).lundi);
  check("vue : pas de carte du lundi en veillée ni pour un compte neuf", !vr(active(), { moment: "veillee" }).lundi && !vr(base({ jourJ: "2026-11-12" })).lundi);
  const apres = base({ jourJ: "2026-10-01" });
  const vv = vr(apres, { moment: "apres", verdicts: [{ programme: "finance/cfa-l1", session: "2026-10", statut: "reporte", bandes: {}, saisiLe: "2026-10-12T10:00:00Z" }] });
  check("vue : le verdict après l'examen, session du jour J, déjà saisi", vv.verdict?.session === "2026-10" && vv.verdict.saisi?.statut === "reporte" && vv.verdict.matieres.length === 10);
  check("vue : le verdict dès le lendemain (J+1, V3 §7.1), jamais avant l'examen ni en veillée", !v1.verdict && !!vr(apres, { moment: "lendemain" }).verdict && !vr(apres, { moment: "veillee" }).verdict && !vr(apres, { moment: "jourJ" }).verdict);
  check("vue : la reprise du jour", vr(base({ lecture: { compteurs: {}, mesures: { xp_total: 0, jours: [{ jour: "2026-10-01", n: 30 }] }, speciaux: {} } })).reprise && !v1.reprise);
  check("les bandes reçues : matières connues et bandes valides seulement", JSON.stringify(bandesValides({ quant: "basse", fsa: "nulle", inconnue: "haute", ethics: "haute" }, ["quant", "fsa", "ethics"])) === JSON.stringify({ quant: "basse", ethics: "haute" }) && Object.keys(bandesValides("x", ["quant"])).length === 0);

  // la série d'encre et ses jours neutres (lib/serie-encre.ts, mêmes règles que _serie_avancer)
  const js = new Map([["2026-09-01", 10], ["2026-09-02", 10], ["2026-09-03", 10], ["2026-09-06", 12]]);
  const pauses = new Set(["2026-09-04", "2026-09-05"]);
  check("série : deux jours de pause d'affilée ne cassent rien (4)", calculerSerie(js, "2026-09-07", 10, pauses).serie === 4);
  check("série : sans les pauses, deux manqués d'affilée la cassent (1)", calculerSerie(js, "2026-09-07").serie === 1);
  check("série : un jour de pause à 10 questions compte quand même", calculerSerie(new Map([["2026-09-01", 10], ["2026-09-02", 10]]), "2026-09-03", 10, new Set(["2026-09-02"])).serie === 2);
  // les cas de sim-rythme.mjs (_serie_avancer de migration_codex_v3.sql §8), mêmes jours, même nombre
  // que le profil (statsProfil) et le Journal, qui passent maintenant les pauses à calculerSerie
  const jd = (debut: string, n: number) => Array.from({ length: n }, (_, i) => decaleJour(debut, i));
  const dix = (jours: string[]) => new Map(jours.map((j) => [j, 10] as [string, number]));
  const repos = calculerSerie(dix(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-05", "2026-09-06"]), "2026-09-07", undefined, new Set(["2026-09-04"]));
  check("série = SQL : un repos au milieu, ni +1 ni cassure (5)", repos.serie === 5);
  check("série = SQL : une pause de 5 jours, 4 + 1 = 5 ; sans elle, 1", calculerSerie(dix([...jd("2026-09-01", 4), "2026-09-10"]), "2026-09-11", undefined, new Set(jd("2026-09-05", 5))).serie === 5 && calculerSerie(dix([...jd("2026-09-01", 4), "2026-09-10"]), "2026-09-11").serie === 1);
  check("série = SQL : un manqué juste après une pause, couvert par le joker (3)", calculerSerie(dix(["2026-09-01", "2026-09-02", "2026-09-05"]), "2026-09-06", undefined, new Set(["2026-09-03"])).serie === 3);
  check("série = SQL : manqué, pause, manqué : la série casse (0)", calculerSerie(dix(["2026-09-01", "2026-09-02"]), "2026-09-06", undefined, new Set(["2026-09-04"])).serie === 0);
  // lirePauses : toujours filtrée par joueur (le client admin ne passe pas par la policy)
  const filtres: string[] = [];
  const faux = { from: () => { const q = { select: () => q, eq: (c: string, v: string) => (filtres.push(`${c}=${v}`), q), order: () => q, limit: async () => ({ data: [{ jour: "2026-09-04", genre: "repos" }, { jour: "2026-10-20", genre: "pause" }, { jour: "2026-10-21", genre: "autre" }], error: null }) }; return q; } } as unknown as SupabaseClient;
  const panne = { from: () => { throw new Error("relation serie_pauses does not exist"); } } as unknown as SupabaseClient;
  attentes.push(
    (async () => {
      const lp = await lirePauses(faux, "u-1", "2026-10-17");
      check("lirePauses : filtrée par joueur, jours passés gardés pour la série, à venir dans l'ordre", JSON.stringify(filtres) === JSON.stringify(["user_id=u-1"]) && lp?.jours.size === 2 && lp.aVenir.length === 1 && lp.aVenir[0].genre === "pause");
      check("joursDePause : vide sans la migration", (await joursDePause(panne, "u-1", "2026-10-17")).size === 0);
    })(),
  );
}

console.log("\n# codex_matieres (migration_codex.sql) reflète SUBJECTS");
{
  const sql = readFileSync("migration_codex.sql", "utf8");
  const bloc = sql.slice(sql.indexOf("INSERT INTO codex_matieres"), sql.indexOf("ON CONFLICT (cle) DO UPDATE"));
  for (const s of SUBJECTS) {
    const ligne = bloc.split("\n").find((l) => l.includes(`('${s.key}'`)) ?? "";
    const dossiers = s.flashcardFolders.every((f) => ligne.includes(`'${f.replace(/'/g, "''")}'`));
    const prefixe = s.drillPrefix ? ligne.includes(`'${s.drillPrefix}'`) : /NULL/.test(ligne);
    const fiche = s.fiche ? ligne.includes(`'${s.fiche}')`) : ligne.trim().replace(/,$/, "").endsWith("NULL)");
    check(`${s.key} : dossiers, préfixe de drill, fiche`, !!ligne && dossiers && prefixe && fiche);
  }
}

void Promise.all(attentes).then(
  () => {
    console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
    process.exit(ko ? 1 : 0);
  },
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
