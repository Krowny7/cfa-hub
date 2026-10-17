// Tests légers de « Récupérer » (Codex simplifié, lot A2), sans base ni réseau :
//   npx tsx --tsconfig tsconfig.json scripts/codex/test-recuperer.ts
// Vérifie : la capacité « recuperer » (lue, hors rattrapage) ; le moteur qui
// diffère les récompenses (capacité, hors mode sobre, hors rétroactif, ce qui
// rapporte quelque chose) et calcule le plafond sur l'XP en attente ; la vue
// (« À récupérer », le repli déjà versé, « Fait aujourd'hui », les pièces pas
// encore portables) ; les fêtes jouées au clic ; les dates et les mots ; que
// les écrans sont branchés (plus de fête automatique en fin d'outil).
import { readFileSync } from "node:fs";
import { contenuDuProgramme, plafondQuete } from "@/lib/codex/catalogue";
import { evaluer, indexerLecture, marqueurDe, nouveautesDe, planifier, xpEnAttente, type Demande, type Entree, type LectureSql, type LigneProgression, type ResultatCompteur } from "@/lib/codex/moteur";
import { construireVue } from "@/lib/codex/vue";
import { bilanDe } from "@/lib/codex/bilan";
import { panneauDe } from "@/lib/codex/panneau";
import { CAPACITES_VIDE, lireCapacites } from "@/lib/codex/reglage";
import { levelInfoFromXp } from "@/lib/leveling";
import {
  LIGNES_MONTREES, TEXTES_RECUPERER as T, aRecupererDe, dateRecuperer, faitApres, faitAujourdhuiDe, familleDe, grandesFetes, jourDe, titreHorsVue, xpAVerser, type ARecuperer,
} from "@/lib/codex/recuperer";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const J = (x: unknown) => JSON.stringify(x);

const contenu = contenuDuProgramme();
const jour = "2026-10-17";
const now = new Date("2026-10-17T10:00:00Z");
const AVEC = { ...CAPACITES_VIDE, recuperer: true };
const base = (o: Partial<Entree> = {}): Entree => ({
  contenu, now, jour, jourJ: null, objectif: null, visiteVue: false, progression: [], contrats: [], premier: false, dernierCalcul: new Date("2026-10-16T08:00:00Z"),
  lecture: { compteurs: {}, mesures: { xp_total: 0 }, speciaux: {} }, ...o,
});
/** Le premier trait posé ce matin (après le dernier calcul : rien de rétroactif). */
const repondre = (e: Entree, f: (d: Demande) => number = (d) => (d.evenement === "question_repondue" ? 1 : 0)) => {
  const demandes = planifier(e);
  const brut: LectureSql = { ...e.lecture, compteurs: Object.fromEntries(demandes.map((d): [string, ResultatCompteur] => [d.id, { n: f(d), atteint: f(d) >= d.seuil ? "2026-10-17T09:00:00+00:00" : null }])) };
  const e2 = { ...e, lecture: brut };
  return { e: e2, r: evaluer(e2, indexerLecture(demandes, brut)) };
};
const ligne = (id: string, o: Partial<LigneProgression> = {}): LigneProgression => ({
  quete_id: id, periode: "", etat: "recompensee", progression: 1, cible: 1, ouverte_le: "2026-10-01T10:00:00Z", terminee_le: "2026-10-17T09:00:00Z", recompensee_le: "2026-10-17T09:00:00Z", retro: false, xp: 20, cosmetique: null, titre: null, vu: true, ...o,
});
const trait = (r: ReturnType<typeof evaluer>) => r.lot.find((i) => i.quete === "trame:prologue:premier-trait");

console.log("# la capacité « recuperer »");
{
  check("absente ou mal formée : faux ; rendue par la base : vraie", CAPACITES_VIDE.recuperer === false && lireCapacites({}).recuperer === false && lireCapacites({ recuperer: "oui" }).recuperer === false && lireCapacites({ recuperer: true }).recuperer === true);
  const n = nouveautesDe({ capacites: AVEC, capacitesVues: { ...CAPACITES_VIDE } });
  check("elle n'entre pas dans le rattrapage (aucune quête ne l'exige)", !!n && n.requis.size === 0 && marqueurDe({ capacites: AVEC, capacitesVues: { ...CAPACITES_VIDE } }) === null);
}

console.log("\n# le moteur diffère ce qui rapporte");
{
  const avec = trait(repondre(base({ capacites: AVEC })).r);
  check("avec la capacité : le premier trait part « differer » (terminee, non rétroactif, +20 XP)", avec?.etat === "terminee" && avec.retro === false && avec.differer === true && avec.xp === 20, J(avec));
  const sans = trait(repondre(base({ capacites: CAPACITES_VIDE })).r);
  check("sans la capacité (§9 pas collée) : versé tout de suite, comme avant", sans?.etat === "terminee" && sans.differer === undefined);
  const sobre = trait(repondre(base({ capacites: AVEC, sobre: true })).r);
  check("mode sobre (versées d'office) : rien ne diffère", sobre?.etat === "terminee" && sobre.differer === undefined);
  const retro = trait(repondre(base({ capacites: AVEC, premier: true, dernierCalcul: null })).r);
  check("le rétroactif reste versé d'office (sa cérémonie ne change pas)", retro?.retro === true && retro.differer === undefined);
  const { r } = repondre(base({ capacites: AVEC }), (d) => (d.evenement === "question_repondue" ? 12 : 0));
  check("tout ce qui est fait et rapporte attend ; rien de ce qui ne rapporte rien", r.lot.filter((i) => i.etat === "terminee").every((i) => (i.differer === true) === ((i.xp ?? 0) > 0 || !!i.cosmetique || !!i.titre)));
  // une quête qui attend reste faite : elle ne se réécrit pas
  const deja = repondre(base({ capacites: AVEC, progression: [ligne("trame:prologue:premier-trait", { etat: "terminee", vu: false, recompensee_le: null })] })).r;
  check("une quête qui attend (« terminee ») compte pour faite et ne se réécrit pas", !trait(deja) && deja.etats.find((s) => s.quete.id === "trame:prologue:premier-trait")?.fait === true);
  // le plafond : sur xp_total plus l'XP en attente
  const attente = [ligne("trame:prologue:jour-j", { etat: "terminee", xp: 4000, recompensee_le: null, vu: false })];
  check("xpEnAttente : les seules lignes « terminee »", xpEnAttente([...attente, ligne("x", { xp: 99 })]) === 4000);
  const plafond = trait(repondre(base({ capacites: AVEC, progression: attente })).r)?.plafond;
  check("le plafond se calcule sur xp_total + l'XP en attente", plafond === plafondQuete(levelInfoFromXp(4000).level) && plafond !== plafondQuete(levelInfoFromXp(0).level), String(plafond));
}

console.log("\n# la vue : « À récupérer » et « Fait aujourd'hui »");
{
  const lignes = [
    ligne("trame:prologue:premier-trait", { etat: "terminee", vu: false, recompensee_le: null, terminee_le: "2026-10-16T18:00:00Z" }),
    ligne("trame:prologue:dix", { etat: "terminee", vu: false, recompensee_le: null, xp: 30, terminee_le: "2026-10-17T08:00:00Z" }),
    ligne("acte:prologue", { etat: "terminee", vu: false, recompensee_le: null, xp: 60, cosmetique: "banniere:carnet", terminee_le: "2026-10-17T08:30:00Z" }),
    ligne("contrat:trio:2026-10-14", { periode: "2026-10-14", etat: "terminee", vu: false, recompensee_le: null, xp: 50, terminee_le: "2026-10-14T19:00:00Z" }),
    ligne("trame:prologue:jour-j", { xp: 15 }),
    ligne("trame:prologue:visite", { xp: 0, retro: true, vu: true }),
  ];
  const { r, e } = repondre(base({ capacites: AVEC, progression: lignes }), () => 0);
  const v = construireVue(e, r, null, { devoile: null });
  const cles = v.aRecuperer.map((x) => x.quete);
  check("les quatre qui attendent, les plus récentes d'abord", J(cles) === J(["acte:prologue", "trame:prologue:dix", "trame:prologue:premier-trait", "contrat:trio:2026-10-14"]), J(cles));
  const acte = v.aRecuperer[0];
  check("un acte : son titre, sa pièce nommée, sa date de Paris", acte.famille === "acte" && acte.titre.length > 0 && acte.titre !== T.sansTitre && acte.recompense?.startsWith("Bannière : ") === true && acte.le === "2026-10-17" && acte.aVerser, J(acte));
  check("un contrat d'un autre jour garde un titre clair et sa date", v.aRecuperer[3].titre === "Les 3 quêtes du jour" && v.aRecuperer[3].le === "2026-10-14");
  check("« Fait aujourd'hui » : la quête versée aujourd'hui, pas le rétroactif ni ce qui attend", v.faitAujourdhui.n === 1 && v.faitAujourdhui.xp === 15 && v.faitAujourdhui.quetes[0].quete === "trame:prologue:jour-j", J(v.faitAujourdhui));
  check("une pièce qui attend n'est pas encore possédée", !v.possessions.some((p) => p.cle === "banniere:carnet"));
  check("le bilan de fin d'outil porte ce qui attend, le jour et « Fait aujourd'hui »", J(bilanDe(v).aRecuperer) === J(v.aRecuperer) && bilanDe(v).jour === jour && bilanDe(v).fait?.n === 1);
  check("l'XP annoncée : celle qui reste à verser", xpAVerser(v.aRecuperer) === 20 + 30 + 60 + 50);
  const p = panneauDe(v);
  check("le panneau : combien attendent (la pastille), l'XP à verser, les trois premières, « Fait aujourd'hui »", p.recuperer.n === 4 && p.recuperer.xp === 160 && p.recuperer.items.length === 3 && p.fait.n === 1, J(p.recuperer.n));
  check("mode sobre : le panneau n'annonce pas d'XP", panneauDe({ ...v, sobre: true }).recuperer.xp === 0);
  // sans la §9 : déjà versée, pas vue ; l'ouverture du panneau ne doit pas l'acquitter avant le clic
  const sansSql = repondre(base({ progression: [ligne("trame:prologue:premier-trait", { vu: false })] }), () => 0);
  const vr = construireVue(sansSql.e, sansSql.r, null, { devoile: null });
  check("repli : elle attend « Récupérer » (déjà versée) et le panneau ne l'annonce pas en pied", vr.aRecuperer.length === 1 && !vr.aRecuperer[0].aVerser && panneauDe(vr).versees === null && panneauDe(vr).recuperer.n === 1 && panneauDe(vr).recuperer.xp === 0, J(panneauDe(vr).versees));

  // le repli sans la §9 : déjà versé, pas encore vu
  const repli = [ligne("trame:prologue:premier-trait", { vu: false }), ligne("trame:prologue:dix", { vu: false, xp: 0 }), ligne("exploit:sceau:fsa", { vu: false }), ligne("trame:prologue:jour-j", { vu: false, retro: true })];
  const noms = { titre: () => "t", recompense: () => null };
  const a = aRecupererDe(repli, { ...noms, sobre: false });
  check("repli : seules les quêtes versées, pas vues, non rétroactives, qui rapportent (ni les sceaux du profil)", J(a.map((x) => x.quete)) === J(["trame:prologue:premier-trait"]) && a[0].aVerser === false && a[0].xp === 20, J(a));
  check("repli en mode sobre : rien n'attend", aRecupererDe(repli, { ...noms, sobre: true }).length === 0);
  check("mode sobre : ce qui reste à verser attend quand même (versé d'office par le serveur)", aRecupererDe([ligne("q", { etat: "terminee" })], { ...noms, sobre: true }).length === 1);
  check("un miroir ne s'annonce pas (compté avec sa quête payeuse)", aRecupererDe([ligne("m", { etat: "terminee" })], { ...noms, sobre: false, ignorer: (id) => id === "m" }).length === 0);
  const f = faitAujourdhuiDe([ligne("a", { recompensee_le: "2026-10-16T22:30:00Z" }), ligne("b", { recompensee_le: "2026-10-16T21:30:00Z" })], jour, { titre: () => "t", attente: new Set() });
  check("« Fait aujourd'hui » se compte au jour de Paris (23 h 30 à Paris = le 16)", f.n === 1 && f.quetes[0].quete === "a", J(f));
}

console.log("\n# le clic : les fêtes, le repli");
{
  const x = (quete: string, o: Partial<ARecuperer> = {}): ARecuperer => ({ quete, periode: "", titre: quete, famille: familleDe(quete), xp: 20, aVerser: true, le: jour, recompense: null, piece: null, ...o });
  const items = [x("contrat:quotidien:serie:2026-10-17", { periode: jour }), x("branche:fsa:maitre", { xp: 100, piece: "titre:maitre:fsa" }), x("acte:acte2", { xp: 150 }), x("branche:fsa:ciblee"), x("exploit:joconde", { piece: "cadre:sfumato" })];
  const fetes = grandesFetes(items, false);
  check("les grandes fêtes : l'acte, « Maître de… », la pièce ; pas un contrat ni un simple jalon", J(fetes.map((f) => f.quete)) === J(["acte:acte2", "branche:fsa:maitre", "exploit:joconde"]), J(fetes.map((f) => f.quete)));
  check("mode sobre : aucune fête (sans animation)", grandesFetes(items, true).length === 0);
  check("familleDe : un acte d'un autre programme, une quête préfixée", familleDe("acte:cfa-l2/acte3") === "acte" && familleDe("cfa-l2/branche:fsa:maitre") === "branche" && familleDe("contrat:trio:2026-10-17") === "contrat");
  check("titreHorsVue : trio, contrat d'un autre jour ou d'une autre semaine", titreHorsVue("contrat:trio:2026-10-14") === "Les 3 quêtes du jour" && titreHorsVue("contrat:hebdo:encre") === "Quête de la semaine" && titreHorsVue("contrat:faiblesse:2026-10-14") === "Quête du jour" && titreHorsVue("trame:a1:fiche") === null);
  const apres = faitApres({ n: 1, xp: 15, quetes: [{ quete: "j", periode: "", titre: "j", xp: 15 }] }, [x("a", { xp: 30 }), x("b", { xp: 40, aVerser: false })], 30);
  check("après le clic : « Fait aujourd'hui » gagne les quêtes récupérées et leur XP (versée ou déjà versée)", apres.n === 3 && apres.xp === 15 + 30 + 40 && apres.quetes[0].quete === "a", J(apres));
  check("trois lignes au plus dans le bloc", LIGNES_MONTREES === 3);
}

console.log("\n# les dates et les mots");
{
  check("dateRecuperer : aujourd'hui rien, « d'hier », sinon « mer. 14 oct. »", dateRecuperer("2026-10-17", jour) === null && dateRecuperer("2026-10-16", jour) === "d'hier" && dateRecuperer("2026-10-14", jour) === "mer. 14 oct." && dateRecuperer("2026-10-01", jour) === "jeu. 1er oct." && dateRecuperer(null, jour) === null);
  check("jourDe : le jour de Paris d'un horodatage", jourDe("2026-10-16T22:30:00Z") === "2026-10-17" && jourDe(null) === null && jourDe("n'importe quoi") === null);
  check("les boutons", T.tout(190) === "Tout récupérer · +190 XP" && T.tout(0) === "Tout récupérer" && T.un(60) === "Récupérer +60 XP" && T.tout(1250) === "Tout récupérer · +1 250 XP");
  check("les lignes", T.titre(3) === "À récupérer · 3" && T.faites(2) === "2 quêtes faites" && T.faites(1) === "1 quête faite" && T.autres(4) === "et 4 autres" && T.fait({ n: 4, xp: 230 }) === "Fait aujourd'hui : 4 · +230 XP" && T.fait({ n: 4, xp: 230 }, true) === "Fait aujourd'hui : 4");
  check("le repli et l'échec", T.dejaVerse === "Déjà versé" && T.voir === "Voir ce que tu as gagné" && T.echec === "Pas pu récupérer. Réessaie dans un instant.");
}

console.log("\n# les écrans");
{
  const fete = readFileSync("components/codex/FeteCodex.tsx", "utf8");
  check("FeteCodex : plus de fête automatique, la ligne « Récupérer » et « La suite » en fin d'outil", !fete.includes("codexVus(") && !fete.includes("components/fete/Fete") && fete.includes('<Recuperer variante="ligne"') && fete.includes("TEXTES_RECUPERER.suite("));
  const rec = readFileSync("components/codex/Recuperer.tsx", "utf8");
  check("Recuperer : le clic récupère tout ce qui attend (le serveur relit la liste)", rec.includes("r = await codexRecuperer();"));
  check("Recuperer : l'action, le tampon décalé, le compte, le mouvement réduit, les fêtes une par une, l'échec", rec.includes("codexRecuperer(") && rec.includes("DECALAGE_TAMPON_MS") && rec.includes("COMPTE_XP_MS") && rec.includes("mouvementReduit()") && rec.includes("onFin={() => setTour((t) => t + 1)}") && rec.includes("T.echec") && rec.includes("disabled={occupe}"));
  const actions = readFileSync("lib/codex/actions.ts", "utf8");
  const action = actions.slice(actions.indexOf("export async function codexRecuperer"));
  check("codexRecuperer : le joueur vérifié, les clés validées, le niveau rafraîchi, les grandes fêtes rendues", action.includes("if (!user)") && action.includes("clesValides(cles)") && action.includes('revalidatePath("/", "layout")') && action.includes("grandesFetes(r.recues, r.sobre)"));
  const serveur = readFileSync("lib/codex/serveur.ts", "utf8").replace(/\r\n/g, "\n");
  check("serveur : codex_recuperer, le repli codex_vus, la vue gardée et le panneau oubliés", serveur.includes('a.rpc("codex_recuperer"') && serveur.includes("await marquerVus(user.id") && serveur.includes("MEMO.delete(user.id);\n  await oublierPanneau(user.id);\n  return { ok: true, recues"));
  check("serveur : le mode sobre verse d'office ce qui attendait", serveur.includes("entree.sobre && entree.progression.some((l) => l.etat === \"terminee\")") && serveur.includes("sobre: lireSobre(user)"));
  const page = readFileSync("app/codex/page.tsx", "utf8");
  check("/codex montre le bloc « À récupérer »", page.includes("<Recuperer items={vue.aRecuperer}"));
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
