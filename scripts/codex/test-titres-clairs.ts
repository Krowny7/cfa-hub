// Les titres clairs du Codex (lib/codex/titres-clairs.ts, Codex simplifié §4) :
// toute quête visible a un titre clair, de 40 caractères au plus, sans mot
// banni, sans doublon (un miroir porte le titre de la quête qui paie), avec
// le seuil de son objectif ; les contrats du jour pour toutes les matières,
// notions et fiches ; le fil rouge sur 30 paliers ; les énigmes, les actes,
// les chaînes et les chapitres ; le repli et la recherche sur les deux noms ;
// les mots de l'écran (lib/voice-codex.ts) : la séance, les phases, Récupérer.
// Usage, depuis le dépôt : npx tsx --tsconfig tsconfig.json scripts/codex/test-titres-clairs.ts

import { ACTES, CHAINES, COMMANDES, MODELES_CONTRATS, catalogueCodex, contenuDuProgramme, genererBranches, quetesSemaine } from "@/lib/codex/catalogue";
import { CHAPITRES_FIL, paliersFil } from "@/lib/codex/fil-rouge";
import { instanceContrat } from "@/lib/codex/moteur";
import { actesGeneriques } from "@/lib/codex/programmes/generique";
import {
  ENIGMES_CLAIRES, POURQUOI_CHAINES, POURQUOI_CLAIRS, POURQUOI_FIL, RESUMES_SEMAINE, TITRES_CHAINES, TITRES_CHAPITRES_FIL, TITRES_CLAIRS, TITRES_CONTRATS, TITRE_MAX,
  butActe, correspond, enigmeClaire, modeleDeContrat, nomActe, pourquoiClair, resumeSemaine, titreActe, titreClair, titreClairDe, titreContrat,
} from "@/lib/codex/titres-clairs";
import { NOTIONS } from "@/lib/notions";
import { CODEX, MOTS_MAISON, PHASES_CLAIRES, SEANCE, familleDe } from "@/lib/voice-codex";
import type { Objectif, Quete } from "@/lib/codex/types";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const liste = (xs: string[]) => (xs.length ? xs.slice(0, 8).join(" | ") + (xs.length > 8 ? ` … (${xs.length})` : "") : "");

/**
 * Les mots bannis des titres, consignes, états et onglets (proposition §4.5),
 * sauf trait, rature et jour d'encre, gardés par l'utilisateur. Un mot entier,
 * au singulier ou au pluriel (« cap » ne prend pas « capital »).
 */
const BANNIS = [
  "bottega", "garzone", "pigments?", "couleurs?", "pots?", "palettes?", "tableaux?", "compas", "cercles?", "vélins?", "grattoirs?",
  "commandes?", "mécènes?", "guildes?", "coups? de pinceau", "tamponné(?:e|es|s)?", "scell(?:er|e|es|é|ée|ées|és)", "sèches?",
  "retouches?", "fuites?", "cap", "chantiers?", "contrats?", "paliers?", "carnets?",
].map((b) => new RegExp(`(?:^|[^\\p{L}])(${b})(?:$|[^\\p{L}])`, "iu"));
const banni = (t: string): string | null => {
  for (const r of BANNIS) {
    const m = r.exec(t);
    if (m) return m[1];
  }
  return null;
};
const mots = (t: string) => t.split(/\s+/).filter((m) => /[\p{L}\d]/u.test(m)).length;

check("les mots bannis sont repérés en mots entiers", banni("Le tour des pigments") === "pigments" && banni("Investissements et allocation du capital") === null && banni("Gratter le vélin") === "vélin" && banni("Trio tamponné") === "tamponné");

const contenu = contenuDuProgramme();

// ── Les quêtes visibles ────────────────────────────────────────────────

const semaines = COMMANDES.flatMap((c) => quetesSemaine({ lundi: "2026-10-12", cible: 4, commande: c.id, params: { matiere: "fsa", depart: 48 } }, contenu));
const fil = paliersFil([], 30);
const catalogue = [...catalogueCodex(contenu), ...semaines.filter((q) => q.id !== "contrat:hebdo:encre"), ...fil];
const visibles = catalogue.filter((q) => !q.retiree);

const sansTitre = visibles.filter((q) => titreClairDe(q) === null).map((q) => q.id);
check("toute quête visible a un titre clair (exploits : leur nom)", sansTitre.length === 0, liste(sansTitre));

const titres = visibles.map((q) => ({ q, t: titreClair(q) }));
const longs = titres.filter((x) => x.t.length > TITRE_MAX).map((x) => `${x.q.id} (${x.t.length}) ${x.t}`);
check(`aucun titre de plus de ${TITRE_MAX} caractères`, longs.length === 0, liste(longs));

// les noms d'exploits restent imagés (objets de collection, §4.7)
const bannis = titres.filter((x) => x.q.famille !== "exploit" && banni(x.t)).map((x) => `${x.q.id} « ${banni(x.t)} » ${x.t}`);
check("aucun mot banni dans les titres (hors noms d'exploits)", bannis.length === 0, liste(bannis));

const parTitre = new Map<string, Quete[]>();
for (const { q, t } of titres) parTitre.set(t, [...(parTitre.get(t) ?? []), q]);
const doublons = [...parTitre.entries()].filter(([, qs]) => {
  if (qs.length < 2) return false;
  // un miroir et la quête qui paie : la même quête, le même titre
  const payeuse = qs.find((q) => !q.miroir);
  return !qs.every((q) => q === payeuse || q.miroir === payeuse?.id);
});
check("aucun titre en double (un miroir porte celui de la quête qui paie)", doublons.length === 0, liste(doublons.map(([t, qs]) => `${t} : ${qs.map((q) => q.id).join(", ")}`)));
const miroirs = visibles.filter((q) => q.miroir);
check("un miroir porte le titre de la quête qui paie", miroirs.length > 0 && miroirs.every((q) => titreClair(q) === titreClair(catalogue.find((x) => x.id === q.miroir)!)));

const ids = new Set(catalogue.map((q) => q.id));
const orphelins = Object.keys(TITRES_CLAIRS).filter((id) => !ids.has(id));
check("chaque entrée de la table est une quête du catalogue", orphelins.length === 0, liste(orphelins));
const retirees = Object.keys(TITRES_CLAIRS).filter((id) => catalogue.find((q) => q.id === id)?.retiree);
check("la table ne titre aucune quête retirée", retirees.length === 0, liste(retirees));

/** Le seuil d'un objectif simple (un compteur ou une mesure), null sinon. */
const seuilSimple = (o: Objectif): number | null => (o.k === "compteur" || (o.k === "mesure" && o.mesure !== "pic_palier") ? o.seuil : null);
const sansEspaces = (t: string) => t.replace(/[\s\u202f\u00a0]/g, "");
const seuilsAbsents = titres
  .filter((x) => x.q.famille !== "exploit")
  .filter((x) => {
    const s = seuilSimple(x.q.objectif);
    return s !== null && s > 1 && s !== 100 && !sansEspaces(x.t).includes(String(s));
  })
  .map((x) => `${x.q.id} (${seuilSimple(x.q.objectif)}) ${x.t}`);
check("le seuil d'un objectif simple se lit dans son titre", seuilsAbsents.length === 0, liste(seuilsAbsents));

// quelques titres attendus (maquette validée, ajustement D de l'utilisateur)
const t = (id: string) => titreClair(catalogue.find((q) => q.id === id)!);
check("FSA à 60 % de maîtrise", t("branche:fsa:maitrise60") === "FSA à 60 % de maîtrise", t("branche:fsa:maitrise60"));
check("4 semaines à 4 jours d'encre (et son miroir)", t("trame:a4:semaines") === "4 semaines à 4 jours d'encre" && t("longcours:encre:2") === "4 semaines à 4 jours d'encre");
check("Programme entier à 60 % de maîtrise", t("longcours:compas:3") === "Programme entier à 60 % de maîtrise");
check("10 questions dans 3 matières", t("trame:a2:trois") === "10 questions dans 3 matières");
check("les ratures se corrigent", t("trame:a3:ratures") === "Corriger 20 ratures" && t("trame:a1:rature") === "Corriger ta première rature");
check("la signature dit la série (« 10 calculs sans faute en Quant »)", t("branche:quant:signature") === "10 calculs sans faute en Quant" && t("branche:equity:signature") === "Une page de drill d'Equity à 100 %", `${t("branche:quant:signature")} / ${t("branche:equity:signature")}`);
check("la semaine d'encre lit sa cible", titreClair(quetesSemaine({ lundi: "2026-10-12", cible: 3, commande: "copiste", params: {} }, contenu)[0]) === "3 jours d'encre cette semaine");
check("le banquier nomme sa matière et son seuil", titreClair(semaines.find((q) => q.id === "contrat:hebdo:banquier")!) === "+5 points en FSA : 53 %");
check("le fil rouge : 10 trophées diamant", titreClair(fil.find((q) => q.id === "fil:trophees:4")!) === "10 trophées diamant" && titreClair(fil.find((q) => q.id === "fil:trophees:1")!) === "1 trophée d'or");
check("le fil rouge : les milliers à l'espace fine", titreClair(fil.find((q) => q.id === "fil:questions:4")!) === "Répondre à 10\u202f000 questions");

const resumes = COMMANDES.map((c) => resumeSemaine(c));
check("le choix de la semaine : un résumé clair par choix, sans mot banni", COMMANDES.every((c) => RESUMES_SEMAINE[c.id]) && Object.keys(RESUMES_SEMAINE).length === COMMANDES.length && resumes.every((r) => !banni(r) && mots(r) <= 12), liste(resumes.filter((r) => banni(r))));

// ── Les contrats du jour ───────────────────────────────────────────────

const modeles = new Set(MODELES_CONTRATS.map((m) => m.id));
check("un gabarit par modèle de contrat, et rien d'autre", MODELES_CONTRATS.every((m) => TITRES_CONTRATS[m.id]) && Object.keys(TITRES_CONTRATS).every((id) => modeles.has(id)));

// chaque modèle avec toutes les valeurs possibles de ses paramètres
const instances = MODELES_CONTRATS.flatMap((m) => {
  const valeurs = m.params.includes("notion")
    ? NOTIONS.map((n) => ({ notion: n.id }))
    : m.params.includes("fiche")
      ? contenu.filter((x) => x.fiche).map((x) => ({ fiche: x.fiche! }))
      : m.params.includes("matiere")
        ? contenu.map((x) => ({ matiere: x.key }))
        : [{}];
  return valeurs.map((params) => ({ m, params, q: instanceContrat(m, params, "2026-10-17", contenu) }));
});
const contratsSans = instances.filter((x) => titreClairDe(x.q, { params: x.params }) === null).map((x) => `${x.q.id} ${JSON.stringify(x.params)}`);
check("chaque contrat du jour a un titre clair, quels que soient ses paramètres", contratsSans.length === 0, liste(contratsSans));
const contratsMauvais = instances
  .map((x) => ({ ...x, t: titreClair(x.q, { params: x.params }) }))
  .filter((x) => x.t.length > TITRE_MAX || x.t.includes("{"))
  .map((x) => `${x.m.id} (${x.t.length}) ${x.t}`);
check(`contrats : ${TITRE_MAX} caractères au plus, avec tous leurs paramètres`, contratsMauvais.length === 0, liste(contratsMauvais));
// le gabarit seulement : une notion s'appelle « Tableau des flux » (le mot banni l'est au sens du Codex)
const gabaritsBannis = Object.entries(TITRES_CONTRATS).filter(([, g]) => banni(g)).map(([id, g]) => `${id} : ${g}`);
check("aucun mot banni dans les gabarits de contrats", gabaritsBannis.length === 0, liste(gabaritsBannis));
const parModele = new Map(instances.map((x) => [x.m.id, titreClair(x.q, { params: x.params })]));
const contratsPris = [...parModele.entries()].filter(([, t]) => parTitre.has(t) || [...parModele.values()].filter((u) => u === t).length > 1).map(([id, t]) => `${id} : ${t}`);
check("un contrat ne prend le titre d'aucune autre quête", contratsPris.length === 0, liste(contratsPris));
const seuilsContrats = MODELES_CONTRATS.filter((m) => {
  const s = seuilSimple(m.objectif);
  return s !== null && s > 1 && !sansEspaces(TITRES_CONTRATS[m.id]).includes(String(s));
}).map((m) => m.id);
check("le seuil d'un contrat se lit dans son titre", seuilsContrats.length === 0, liste(seuilsContrats));
check("Corriger 5 ratures (ajustement D)", parModele.get("ratures") === "Corriger 5 ratures");
check("la matière d'un contrat : son nom court, l'article élidé", titreContrat("cours", { matiere: "equity" }) === "Écouter 20 min du cours d'Equity" && titreContrat("drill-page", { fiche: "economics" }) === "Page de drill d'Economics à 70 %");
check("une notion au nom long : le titre sans elle", titreContrat("notion-faible", { notion: NOTIONS.reduce((a, b) => (b.court.length > a.court.length ? b : a)).id }) === "8 justes sur ta notion faible");
check("un paramètre manquant : pas de titre clair, le repli du catalogue", titreContrat("notion-faible", {}) === null && titreClair({ id: "contrat:notion-faible:2026-10-17", titre: "Sur la notion : X", famille: "contrat", objectif: MODELES_CONTRATS[0].objectif }) === "Sur la notion : X");
check("l'id d'un contrat du jour donne son modèle", modeleDeContrat("contrat:ratures-vieilles:2026-10-17") === "ratures-vieilles" && modeleDeContrat("contrat:hebdo:encre") === null);

// ── Les exploits : l'énigme lisible ────────────────────────────────────

const aIndice = visibles.filter((q) => q.famille === "exploit" && q.visibilite === "indice");
check("chaque exploit à énigme a son énigme claire", aIndice.length > 0 && aIndice.every((q) => ENIGMES_CLAIRES[q.id]), liste(aIndice.filter((q) => !ENIGMES_CLAIRES[q.id]).map((q) => q.id)));
check("les énigmes claires : des exploits visibles", Object.keys(ENIGMES_CLAIRES).every((id) => aIndice.some((q) => q.id === id)));
const enigmesMauvaises = Object.entries(ENIGMES_CLAIRES).filter(([, e]) => banni(e) || mots(e) > 12 || !e.endsWith(".")).map(([id, e]) => `${id} : ${e}`);
check("une énigme : 12 mots au plus, sans mot banni, une phrase", enigmesMauvaises.length === 0, liste(enigmesMauvaises));
check("La Joconde garde son nom, l'énigme se lit", t("exploit:joconde") === "La Joconde" && enigmeClaire(catalogue.find((q) => q.id === "exploit:joconde")!) === "Un sans-faute sur une séance de 20 questions ou plus.");
const noms = visibles.filter((q) => q.famille === "exploit").filter((q) => q.titre.length > TITRE_MAX).map((q) => q.id);
check("les noms d'exploits tiennent en 40 caractères", noms.length === 0, liste(noms));

// ── Les actes, les chaînes, les chapitres ──────────────────────────────

const actesMauvais = ACTES.filter((a) => titreActe(a) === a.titre || banni(titreActe(a)) || banni(butActe(a)) || titreActe(a).length > TITRE_MAX).map((a) => `${a.id} : ${titreActe(a)} / ${butActe(a)}`);
check("chaque acte a un titre clair, sans mot banni, de 40 caractères au plus", actesMauvais.length === 0, liste(actesMauvais));
const butsMauvais = ACTES.filter((a) => {
  const b = butActe(a);
  return !b.endsWith(".") || /[.!?] /.test(b) || mots(b) > 15;
}).map((a) => `${a.id} : ${butActe(a)}`);
check("le but d'un acte : une phrase de 15 mots au plus", butsMauvais.length === 0, liste(butsMauvais));
const acte = (id: string) => ACTES.find((a) => a.id === id)!;
check("nomActe : « Prologue · … », « Acte II · Les 10 matières », « Dernier mois »", nomActe(acte("prologue")) === "Prologue · Premiers pas" && nomActe(acte("acte2")) === "Acte II · Les 10 matières" && nomActe(acte("acte4")) === "Acte IV · Premier examen blanc" && nomActe(acte("epilogue")) === "Dernier mois");
const generiques = actesGeneriques({ cle: "histoire/essai", court: "Essai", nom: "Un essai" });
check("les actes génériques : titres clairs, but du catalogue", generiques.every((a) => titreActe(a) !== a.titre && !banni(titreActe(a)) && butActe(a) === a.but) && nomActe(generiques[1]) === "Acte I · Toutes les matières");
check("un acte inconnu garde son titre et son but", titreActe({ id: "x", titre: "Le titre" }) === "Le titre" && butActe({ id: "x", but: "Le but." }) === "Le but.");

const chainesMauvaises = CHAINES.filter((c) => !TITRES_CHAINES[c.id] || banni(TITRES_CHAINES[c.id])).map((c) => c.id);
check("chaque chaîne a un nom clair, sans mot banni", chainesMauvaises.length === 0 && Object.keys(TITRES_CHAINES).every((id) => CHAINES.some((c) => c.id === id)), liste(chainesMauvaises));
const nomsChaines = CHAINES.map((c) => TITRES_CHAINES[c.id]);
check("deux chaînes n'ont jamais le même nom", new Set(nomsChaines).size === nomsChaines.length);
check("chaque chapitre du fil rouge a un nom clair", CHAPITRES_FIL.every((c) => TITRES_CHAPITRES_FIL[c.id] && !banni(TITRES_CHAPITRES_FIL[c.id])) && Object.keys(TITRES_CHAPITRES_FIL).length === CHAPITRES_FIL.length);

// ── Le repli et la recherche ───────────────────────────────────────────

const inconnue = { id: "trame:g0:premiere", titre: "La première question", famille: "trame" as const, objectif: MODELES_CONTRATS[0].objectif };
check("une quête inconnue d'ici garde le titre du catalogue", titreClairDe(inconnue) === null && titreClair(inconnue) === "La première question");
const branche = catalogue.find((q) => q.id === "branche:fsa:maitrise60")!;
check("une branche d'une matière inconnue garde son titre", titreClair({ ...branche, matiere: "inconnue" }) === branche.titre);
// un autre programme (clés de matière qualifiées ; genererArbre préfixera les ids) : son contenu donne les noms courts
const contenuL2 = contenu.map((m) => ({ ...m, key: `cfa-l2:${m.key}` }));
const branchesL2 = genererBranches(contenuL2, "finance/cfa-l2").filter((q) => !q.retiree);
const l2Mauvaises = branchesL2.filter((q) => {
  const x = titreClairDe(q, { contenu: contenuL2 });
  return !x || x.length > TITRE_MAX || banni(x);
}).map((q) => q.id);
check("les branches d'un autre programme : titres clairs avec son contenu", branchesL2.length > 50 && l2Mauvaises.length === 0 && titreClair(branchesL2.find((q) => q.id === "branche:fsa:maitrise60")!, { contenu: contenuL2 }) === "FSA à 60 % de maîtrise", liste(l2Mauvaises));
check("sans son contenu, une branche d'un autre programme garde son titre", titreClairDe(branchesL2[0]) === null);
// une ligne de la vue (LigneQuete) n'a pas l'objectif : il se lit dans le catalogue, la cible remplace le seuil
const ligne = (id: string, extra: Record<string, unknown> = {}) => {
  const q = catalogue.find((x) => x.id === id)!;
  return { id: q.id, titre: q.titre, famille: q.famille, matiere: q.matiere, etape: q.etape, ...extra };
};
check("une ligne sans objectif : le seuil du catalogue", titreClair(ligne("branche:fsa:maitrise60")) === "FSA à 60 % de maîtrise" && titreClair(ligne("branche:fsa:signature")) === "Une page de drill de FSA à 100 %" && titreClair(ligne("branche:derivatives:fiche")) === "Lire la fiche Derivatives" && titreClair(ligne("branche:economics:fiche")) === "Passer une page de drill en Economics");
check("une ligne de la semaine d'encre : sa cible", titreClair({ ...ligne("contrat:hebdo:encre"), cible: 4 }) === "4 jours d'encre cette semaine");
const dix = catalogue.find((q) => q.id === "trame:a2:dix")!;
check("la recherche lit les deux noms, sans accents ni majuscules", correspond(dix, "pigments") && correspond(dix, "CHAQUE MATIERE") && !correspond(dix, "examen blanc") && correspond(dix, "  "));

// ── Le pourquoi : un fait d'examen ─────────────────────────────────────

const pourquois = visibles.map((q) => ({ q, p: pourquoiClair(q) })).filter((x) => x.p !== null) as { q: Quete; p: string }[];
const pourquoisMauvais = pourquois.filter((x) => banni(x.p) || mots(x.p) > 12 || !x.p.endsWith(".")).map((x) => `${x.q.id} : ${x.p}`);
check("le pourquoi : une phrase de 12 mots au plus, sans mot banni", pourquois.length > 100 && pourquoisMauvais.length === 0, liste(pourquoisMauvais));
const sansPourquoi = visibles.filter((q) => (q.famille === "branche" || q.famille === "longcours" || q.famille === "fil") && pourquoiClair(q) === null).map((q) => q.id);
check("chaque étape de branche, d'objectif long et du fil rouge a son pourquoi", sansPourquoi.length === 0, liste(sansPourquoi));
check("le pourquoi d'une maîtrise : le poids de la matière", pourquoiClair(catalogue.find((q) => q.id === "branche:fsa:maitrise60")!) === "FSA pèse 12,5 % de l'examen.");
check("les pourquoi à id fixe : des quêtes du catalogue", Object.keys(POURQUOI_CLAIRS).every((id) => ids.has(id)) && Object.keys(POURQUOI_CHAINES).every((id) => CHAINES.some((c) => c.id === id)) && Object.keys(POURQUOI_FIL).length === CHAPITRES_FIL.length);
check("une quête sans pourquoi n'en invente pas", pourquoiClair(catalogue.find((q) => q.id === "trame:prologue:dix")!) === null);

// ── Les mots de l'écran (lib/voice-codex.ts) ───────────────────────────

/** Tous les textes d'un objet de libellés : ses chaînes, et ses fonctions appelées avec des valeurs d'exemple. */
function textes(o: unknown, chemin = ""): { chemin: string; texte: string }[] {
  if (typeof o === "string") return [{ chemin, texte: o }];
  if (typeof o === "function") {
    const r = (o as (...a: unknown[]) => unknown)(3, 2, 1);
    return typeof r === "string" ? [{ chemin, texte: r }] : [];
  }
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => textes(v, chemin ? `${chemin}.${k}` : k));
  return [];
}
// les fêtes et le rétroactif sont la place de l'histoire (et de Léonard) : hors règle
const ecran = textes({ ...CODEX, fete: undefined, retro: undefined });
const ecranBannis = ecran.filter((x) => banni(x.texte)).map((x) => `${x.chemin} « ${banni(x.texte)} » ${x.texte}`);
check("aucun mot banni dans les mots de l'écran (hors fêtes)", ecran.length > 50 && ecranBannis.length === 0, liste(ecranBannis));
check("l'état d'une quête faite : « Faite », plus « Tamponnée »", CODEX.etat.terminee === "Faite" && CODEX.detail.faiteLe("12 oct.") === "Faite le 12 oct.");
check("Moi : « 37 quêtes faites · 2 140 XP gagnés dans le Codex »", `${CODEX.quetesFaites(37)} · ${CODEX.xpGagnee(2140)}` === "37 quêtes faites · 2\u202f140 XP gagnés dans le Codex" && CODEX.quetesFaites(1) === "1 quête faite");
check("Récupérer : le bouton, le bloc et la pastille", CODEX.recuperer.tout(190) === "Tout récupérer · +190 XP" && CODEX.recuperer.titre(3) === "À récupérer · 3" && CODEX.recuperer.pastille(12) === "9+" && CODEX.recuperer.boutonXp(0) === "Récupérer");
check("« Quêtes du jour · 1 sur 3 · +50 XP à 3 sur 3 », sans bonus une fois les trois faites", CODEX.contrats.resume(1, 3, 50) === "Quêtes du jour · 1 sur 3 · +50 XP à 3 sur 3" && CODEX.contrats.resume(3, 3, 50) === "Quêtes du jour · 3 sur 3");
check("un contrat de la semaine n'est pas une quête du jour", familleDe({ famille: "contrat", repetition: "hebdomadaire" }) === "Quête de la semaine" && familleDe({ famille: "contrat", repetition: "quotidienne" }) === "Quête du jour");

const genres = ["cinq", "trente", "retouches", "coince", "nouveau", "epreuve"] as const;
const blocs = genres.flatMap((g) => contenu.flatMap((m) => [SEANCE.bloc(g, { n: 25, matiere: m.court, defi: true }), SEANCE.bloc(g, { n: 5, matiere: m.court, defi: false })]));
const blocsMauvais = [...new Set(blocs)].filter((b) => b.length > TITRE_MAX || banni(b));
check("les étapes de la séance : 40 caractères au plus, sans mot banni", blocsMauvais.length === 0, liste(blocsMauvais));
check("« Corriger 14 ratures » (ajustement D)", SEANCE.bloc("retouches", { n: 14 }) === "Corriger 14 ratures" && SEANCE.bloc("retouches", { n: 1 }) === "Corriger 1 rature");
const raisons = [
  SEANCE.raisons.cinq, SEANCE.raisons.trente, SEANCE.raisons.epreuve(true), SEANCE.raisons.epreuve(false),
  SEANCE.raisons.retouches({ aujourdhui: 15, demain: 22, ratures: 8, rappels: 7, complet: true }), SEANCE.raisons.retouches({ aujourdhui: 14, demain: 0, ratures: 14, rappels: 0, complet: false }),
  SEANCE.raisons.coince({ court: "FSA", poids: 12.5, pct: 48 }), SEANCE.raisons.coince({ court: "Fixed Income", poids: 12.5, pct: null }), SEANCE.raisons.nouveau("Fixed Income", 12, 19),
];
const raisonsMauvaises = raisons.filter((r) => banni(r) || mots(r) > 12);
check("les raisons de la séance : 12 mots au plus, sans mot banni", raisonsMauvaises.length === 0, liste(raisonsMauvaises));
check("la raison de « ce qui coince » : un fait d'examen", SEANCE.raisons.coince({ court: "FSA", poids: 12.5, pct: 48 }) === "FSA pèse 12,5 % de l'examen, tu es à 48 %");
check("l'en-tête de la séance", SEANCE.entete(25, 1, 3) === "Aujourd'hui · 25 min · 1 sur 3 fait");
const phasesMauvaises = Object.values(PHASES_CLAIRES).filter((p) => banni(p.nom) || banni(p.phrase) || mots(p.phrase) > 12);
check("les mots maison : trait, rature, jour d'encre et notion tenue, définis en clair", Object.values(MOTS_MAISON).map((m) => m.mot).join() === "trait,rature,jour d'encre,notion tenue" && Object.values(MOTS_MAISON).every((m) => !banni(m.definition) && mots(m.definition) <= 12));
check("les phases en clair, sans mot banni", Object.keys(PHASES_CLAIRES).length === 5 && phasesMauvaises.length === 0, liste(phasesMauvaises.map((p) => p.nom)));

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
