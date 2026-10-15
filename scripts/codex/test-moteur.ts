// Tests légers du moteur du Codex (lib/codex/moteur.ts), sans base ni réseau.
//   npx tsx --tsconfig tsconfig.json scripts/codex/test-moteur.ts
// Vérifie : le catalogue, la cascade des prérequis (nœuds de convergence), la
// rétroactivité et ses plafonds, le tirage des contrats du jour, la
// recommandation, le dévoilement progressif, et que la table codex_matieres de
// migration_codex.sql reflète bien SUBJECTS (components/reviser/catalog.ts).
import { readFileSync } from "node:fs";
import { SUBJECTS } from "@/components/reviser/catalog";
import { notionsDeMatiere } from "@/lib/notions";
import { MODELES_CONTRATS, catalogueCodex, contenuDuProgramme, plafondQuete, plafondRetro, verifierCatalogue } from "@/lib/codex/catalogue";
import {
  LANCEMENT_CODEX, META_CODEX_VIDE, devoiler, evaluer, indexerLecture, planifier, recommander, tirerContrats,
  type Demande, type Entree, type LectureSql, type LigneProgression, type ResultatCompteur,
} from "@/lib/codex/moteur";
import { construireVue } from "@/lib/codex/vue";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};

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
check("231 quêtes", cat.length === 231, String(cat.length));

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
  check("les quêtes d'événements non suivis (cours, cartes, fiches ouvertes) restent masquées", !r.etats.some((s) => s.quete.id === "branche:fsa:cours") && !r.etats.some((s) => s.quete.id === "branche:fsa:flashcards"));
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
  check("branche fsa : premier pas et fiche en cascade, mais pas le drill complet (pages restantes inconnues)", fait(r, "branche:fsa:entree") && fait(r, "branche:fsa:fiche") && !fait(r, "branche:fsa:drill") && !fait(r, "branche:fsa:ciblee"));
  check("nœud de convergence : l'acte V reste fermé (aucune branche n'a passé sa séance ciblée)", !ouverte(r, "trame:a5:blanc"));
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
  check("l'acte IV est clos et l'acte V s'ouvre (acte IV clos + toutesBranches « ciblée »)", r.actesClos.includes("acte4") && ouverte(r, "trame:a5:blanc"));
  check("prérequis tombés après coup : les quêtes déjà remplies sont validées avec leur date, donc rétroactives", r.lot.filter((i) => i.etat === "terminee" && i.atteint?.startsWith("2026-09-01") && i.famille !== "contrat").every((i) => i.retro === true));
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
  const e = base({
    premier: false,
    lecture: { compteurs: {}, mesures: { xp_total: 0, maitrise: { fsa: { pct: 48, questions: 120, debut: 40 } }, ratures_ouvertes: { total: 12, matieres: {} }, jours: [{ jour: "2026-10-01", n: 300 }] }, speciaux: {} },
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
  check("trois contrats faits = trio fait (+50 XP) et chacun 30 XP", r.trioFait && r.lot.some((i) => i.quete === `contrat:trio:${jour}` && i.xp === 50) && r.lot.filter((i) => i.famille === "contrat" && i.xp === 30).length === 3);
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
  check("la vue : 10 branches, 8 actes, des chaînes au long cours", vue.branches.length === 10 && vue.trame.length === 8 && vue.longCours.length === 15, `${vue.branches.length}/${vue.trame.length}/${vue.longCours.length}`);
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
  check("10 questions : S'entraîner", d.devoile !== "tout" && d.devoile.includes("entrainer") && d.nouveaux.join() === "entrainer");
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

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
