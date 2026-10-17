// Tests du résolveur de destinations du Codex (lib/codex/destinations.ts), sans base ni réseau.
//   npx tsx --tsconfig tsconfig.json scripts/codex/test-destinations.ts
// Vérifie : ROUTES = les pages du dossier app/ ; chaque quête du catalogue
// (hors exploits, quêtes retirées et miroirs) et chaque modèle de contrat
// instancié a une destination interne, dans ROUTES, d'une durée positive ;
// les replis (« /revoir » absent → le carnet ; practiceV3 faux → jamais
// topic=all, n, poids ni go ; vrai depuis A4a) ; le premier sous-objectif non rempli ; les
// raisons ; que recommander ne propose jamais une quête non lançable ; et
// que l'arbre d'un programme d'essai (V3 §1.7) mène partout, dans ses outils ;
// les lignes du cap et de la mémoire (A4b : « à revoir », préparation, fuites).
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { MODELES_CONTRATS, PROGRAMME, catalogueCodex, cibleeDe, contenuDuProgramme, genererBranches, lienCiblee } from "@/lib/codex/catalogue";
import { contexteDestination, evaluer, indexerLecture, instanceContrat, planifier, recommander, type Ev, type Entree, type LectureSql, type ResultatCompteur } from "@/lib/codex/moteur";
import { PRACTICE_V3, REPLIS, ROUTES, destinationCoince, destinationDe, lancable, raisonDe, routeExiste, type ContexteDestination, type Destination } from "@/lib/codex/destinations";
import { notionsDeMatiere } from "@/lib/notions";
import { genererArbre } from "@/lib/codex/programmes";
import { PROGRAMME_ESSAI } from "@/lib/codex/programmes/essai";
import { paliersFil } from "@/lib/codex/fil-rouge";
import type { Quete } from "@/lib/codex/types";

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
const fsa = contenu.find((m) => m.key === "fsa")!;
const notionFsa = notionsDeMatiere("fsa")[0].id;

// deux joueurs : un compte neuf, et un joueur en route (maîtrises, notions, drill, points faibles, jour J) ;
// liens d'avant F1 (practiceV3 faux), le repli, sauf mention contraire
const neuf: ContexteDestination = { ...contexteDestination(base()), practiceV3: false };
const enRoute: ContexteDestination = {
  ...contexteDestination(
  base({
    jourJ: "2026-11-12",
    pointsFaibles: [{ notion: notionFsa, score: 72 }],
    lecture: {
      compteurs: {},
      speciaux: {},
      mesures: {
        xp_total: 4000,
        maitrise: Object.fromEntries(contenu.map((m, i) => [m.key, { pct: 40 + 4 * i, questions: 120, debut: 35 }])),
        notions: Object.fromEntries(contenu.flatMap((m) => notionsDeMatiere(m.key).slice(0, 2).map((n) => [n.id, 8]))),
        drill_pages: [{ matiere: "equity", page: 2, meilleur: 90 }, { matiere: "equity", page: 3, meilleur: 55 }, { matiere: "fsa", page: 1, meilleur: 80 }],
      },
    },
  }),
  ),
  practiceV3: false,
};
const avec = (ctx: ContexteDestination, o: Partial<ContexteDestination>): ContexteDestination => ({ ...ctx, ...o });
const quete = (id: string) => catalogueCodex().find((q) => q.id === id)!;

/** Une destination bien formée : interne, sans trou, dans les routes, d'une durée positive. */
const defaut = (d: Destination | null, routes: ReadonlySet<string> = ROUTES): string | null => {
  if (!d) return "aucune destination";
  if (!d.href.startsWith("/") || d.href.startsWith("//")) return `href externe ${d.href}`;
  if (/undefined|null|NaN/.test(d.href)) return `href à trous ${d.href}`;
  if (!routeExiste(d.href.split(/[?#]/)[0], routes)) return `route absente ${d.href}`;
  if (!(d.duree > 0)) return `durée ${d.duree}`;
  if (d.libelle !== "Y aller") return `libellé ${d.libelle}`;
  if (d.raison !== null && (!d.raison.trim() || /undefined|NaN|Quête principale/.test(d.raison))) return `raison ${d.raison}`;
  return null;
};

console.log("# ROUTES = les pages du dossier app/");
{
  /** Les routes d'un dossier de l'App Router : un dossier avec page.* est une page ; (groupe) ne compte pas ; _privé, api et les aperçus locaux (app/preview-da, hors git) non plus. */
  const routesDe = (dossier: string, prefixe = ""): string[] => {
    const entrees = readdirSync(dossier, { withFileTypes: true });
    const out = entrees.some((d) => d.isFile() && /^page\.(tsx|ts|jsx|js|mdx)$/.test(d.name)) ? [prefixe || "/"] : [];
    for (const d of entrees) {
      if (!d.isDirectory() || d.name.startsWith("_") || d.name.startsWith("@")) continue;
      if (!prefixe && (d.name === "api" || d.name === "preview-da")) continue;
      out.push(...routesDe(join(dossier, d.name), prefixe + (/^\(.*\)$/.test(d.name) ? "" : "/" + d.name)));
    }
    return out;
  };
  const app = new Set(routesDe(join(process.cwd(), "app")));
  const manquantes = [...app].filter((r) => !ROUTES.has(r));
  const enTrop = [...ROUTES].filter((r) => !app.has(r));
  check(`ROUTES liste les ${app.size} pages, pas une de plus`, !manquantes.length && !enTrop.length, [manquantes.length ? "manquent " + manquantes.join(" ") : "", enTrop.length ? "en trop " + enTrop.join(" ") : ""].filter(Boolean).join(" ; "));
  check("un segment [x] accepte n'importe quel segment, pas un segment vide", routeExiste("/courses/fsa") && routeExiste("/mock-exams/abc") && !routeExiste("/courses/") && !routeExiste("/fiches/inconnue"));
}

console.log("\n# toutes les quêtes du catalogue ont une destination");
{
  const aSuivre = catalogueCodex().filter((q) => !q.retiree && q.famille !== "exploit" && !(q as Quete & { miroir?: string }).miroir);
  for (const [nom, ctx] of [["compte neuf", neuf], ["joueur en route", enRoute]] as const) {
    const ko_ = aSuivre.map((q) => [q.id, defaut(destinationDe(q, {}, ctx))] as const).filter(([, e]) => e);
    check(`${nom} : ${aSuivre.length - ko_.length}/${aSuivre.length} quêtes lançables`, ko_.length === 0, ko_.slice(0, 5).map(([id, e]) => `${id} (${e})`).join(" | "));
    check(`${nom} : lancable() d'accord avec destinationDe()`, aSuivre.every((q) => lancable(q, ctx) === (destinationDe(q, {}, ctx) !== null)));
  }
  const exploitsSans = catalogueCodex().filter((q) => q.famille === "exploit" && defaut(destinationDe(q, {}, enRoute)));
  check("les exploits aussi (jamais proposés, mais « Y aller » marche)", exploitsSans.length === 0, exploitsSans.map((q) => q.id).join(" "));
}

console.log("\n# chaque modèle de contrat, avec des paramètres plausibles");
{
  const fiches = contenu.filter((m) => m.fiche && m.drill);
  const erreurs: string[] = [];
  for (const m of MODELES_CONTRATS) {
    for (const mat of contenu) {
      const params = { matiere: mat.key, notion: notionsDeMatiere(mat.key)[0]?.id, fiche: fiches[contenu.indexOf(mat) % fiches.length].fiche! };
      const choisis = Object.fromEntries(m.params.map((p) => [p, params[p]]));
      const q = instanceContrat(m, choisis, jour, contenu);
      for (const ctx of [neuf, enRoute]) {
        const e = defaut(destinationDe(q, choisis, ctx));
        if (e) erreurs.push(`${m.id}/${mat.key} : ${e}`);
      }
    }
  }
  check(`${MODELES_CONTRATS.length} modèles × ${contenu.length} matières : tous ont une destination`, erreurs.length === 0, erreurs.slice(0, 5).join(" | "));
  const modele = (id: string) => MODELES_CONTRATS.find((m) => m.id === id)!;
  const dest = (id: string, params: Record<string, string>, ctx = enRoute) => destinationDe(instanceContrat(modele(id), params, jour, contenu), params, ctx);
  check("« Sur la notion » ouvre l'Atelier sur la notion", dest("notion-faible", { notion: notionFsa })?.href === `/atelier?notion=${encodeURIComponent(notionFsa)}`);
  check("« Une page de… » ouvre la page de drill la plus faible", dest("drill-page", { fiche: "equity" })?.href === "/fiches/equity?page=3", dest("drill-page", { fiche: "equity" })?.href);
  check("« Séance de Quant » : format 180 (14 questions au plus)", dest("matiere-faible", { matiere: "quant" })?.href === "/practice?topic=quant&format=180", dest("matiere-faible", { matiere: "quant" })?.href);
  check("« Séance de FSA » : le lien de la séance ciblée (même format que la quête)", dest("matiere-faible", { matiere: "fsa" })?.href === lienCiblee("fsa", cibleeDe(fsa.poids).format));
  check("« Les vieilles ratures » : le carnet, les plus anciennes d'abord", dest("ratures-vieilles", {})?.href === "/moi?onglet=erreurs&reprise=1&ordre=anciennes");
  check("la durée d'un contrat est celle de son modèle", dest("defi", {})?.duree === modele("defi").duree && dest("cinq", {})?.duree === modele("cinq").duree);
}

console.log("\n# les replis");
{
  check("REPLIS : /revoir → le carnet de ratures", REPLIS["/revoir"] === "/moi?onglet=erreurs&reprise=1");
  check("aucune page de repli n'est elle-même absente", Object.values(REPLIS).every((h) => routeExiste(h.split(/[?#]/)[0])));
  check("avant F2, /revoir n'est pas une page de cette copie", !ROUTES.has("/revoir"));
  const rature = quete("trame:a1:rature");
  check("sans /revoir : une rature à rayer mène au carnet", destinationDe(rature, {}, enRoute)?.href === "/moi?onglet=erreurs&reprise=1");
  const avecRevoir = avec(enRoute, { routes: new Set([...ROUTES, "/revoir"]) });
  check("avec /revoir : elle mène à « À revoir »", destinationDe(rature, {}, avecRevoir)?.href === "/revoir");
  const sansDuel = avec(enRoute, { routes: new Set([...ROUTES].filter((r) => r !== "/duel")) });
  check("page absente sans repli : pas de destination, pas lançable", destinationDe(quete("trame:a1:duel"), {}, sansDuel) === null && !lancable(quete("trame:a1:duel"), sansDuel));

  check("practiceV3 vaut vrai depuis F1 (A4a), et le contexte du moteur le porte", PRACTICE_V3 === true && contexteDestination(base()).practiceV3 === true);
  const tous: string[] = [];
  for (const q of catalogueCodex()) for (const ctx of [neuf, enRoute]) { const d = destinationDe(q, {}, ctx); if (d) tous.push(d.href); }
  const fautifs = tous.filter((h) => h.includes("topic=all") || /[?&](n|poids|go)=/.test(h));
  check("practiceV3 faux : aucun topic=all, n, poids ni go", fautifs.length === 0, [...new Set(fautifs)].slice(0, 3).join(" "));
  check("practiceV3 faux : une séance mêlée ouvre /practice nu", destinationDe(quete("longcours:justesse:1"), {}, enRoute)?.href === "/practice");
  const v3 = avec(enRoute, { practiceV3: true });
  check("practiceV3 vrai : séance mêlée aux poids officiels", destinationDe(quete("longcours:justesse:1"), {}, v3)?.href === "/practice?topic=all&n=20&poids=1");
  check("practiceV3 vrai : séance ciblée de FSA (20 questions, format 90)", destinationDe(quete("branche:fsa:ciblee"), {}, v3)?.href === "/practice?topic=fsa&n=20&format=90");
  check("practiceV3 vrai : séance ciblée de Quant (14 questions, format 180)", destinationDe(quete("branche:quant:ciblee"), {}, v3)?.href === "/practice?topic=quant&n=14&format=180");
  check("practiceV3 vrai : maîtrise d'Ethics", destinationDe(quete("trame:a6:ethique"), {}, v3)?.href === "/practice?topic=ethics&n=20&format=180");
}

console.log("\n# les règles");
{
  const d = (id: string, ctx = enRoute, ev?: Ev) => destinationDe(quete(id), {}, ctx, ev);
  check("le premier trait : les 5 du jour, sa durée à lui (2 min)", d("trame:prologue:premier-trait")?.href === "/defi/cinq" && d("trame:prologue:premier-trait")?.duree === 2);
  check("le jour J : les réglages, au réglage de l'objectif", d("trame:prologue:jour-j")?.href === "/moi?onglet=reglages#objectif");
  check("le premier pas d'une branche : une séance de la matière", d("branche:fsa:entree")?.href === "/practice?topic=fsa");
  check("la fiche d'une branche ouvre la fiche", d("branche:equity:fiche")?.href?.startsWith("/fiches/equity") === true);
  check("le cours d'une branche ouvre le cours", d("branche:fsa:cours")?.href === `/courses/${fsa.cours}`);
  check("l'acte II sans matière : une séance ciblée possible à 15 questions", (() => {
    const h = d("trame:a2:ciblee")?.href ?? "";
    const m = contenu.find((x) => h.includes(`topic=${x.key}&`) || h.endsWith(`topic=${x.key}`));
    return !!m && cibleeDe(m.poids).questions >= 15 && h === lienCiblee(m.key, cibleeDe(m.poids).format);
  })(), d("trame:a2:ciblee")?.href);
  // ce qui coince : poids × faiblesse ; une notion nette en point faible de cette matière → l'Atelier
  const coince = d("trame:a4:moitie");
  check("la maîtrise du programme : ce qui coince (Atelier si une notion de la matière est en point faible, sinon une séance)", !!coince && (coince.href.startsWith("/atelier?notion=") || coince.href.startsWith("/practice?topic=")), coince?.href);
  const pf = avec(enRoute, { maitrise: { ...enRoute.maitrise, fsa: { pct: 5 } } });
  check("… FSA à 5 % et une notion de FSA à 72 : l'Atelier sur cette notion", d("trame:a4:moitie", pf)?.href === `/atelier?notion=${encodeURIComponent(notionFsa)}`, d("trame:a4:moitie", pf)?.href);
  // tous : le premier sous-objectif non rempli
  const maitre = quete("branche:fsa:maitre");
  const sous = (...faits: boolean[]): Ev => ({ fait: false, valeur: 0, cible: faits.length, atteint: null, sous: faits.map((f) => ({ fait: f, valeur: f ? 1 : 0, cible: 1, atteint: null })) });
  check("« Maître de FSA » sans évaluation : la maîtrise d'abord", destinationDe(maitre, {}, enRoute)?.href === "/practice?topic=fsa&format=180");
  check("… maîtrise faite : les notions (la fiche)", destinationDe(maitre, {}, enRoute, sous(true, false, false))?.href === "/fiches/financial-statement-analysis");
  check("… maîtrise et notions faites : les ratures (repli : le carnet)", destinationDe(maitre, {}, enRoute, sous(true, true, false))?.href === "/moi?onglet=erreurs&reprise=1");
  // branches à une étape : la plus lourde qui ne l'a pas
  const drills = contenu.filter((m) => m.fiche && m.drill).sort((a, b) => b.poids - a.poids);
  const a2drill = quete("trame:a2:drill");
  check("« Une fiche de bout en bout » : la fiche la plus lourde", destinationDe(a2drill, {}, enRoute)?.href === `/fiches/${drills[0].fiche}`);
  const dejaFaite = avec(enRoute, { faites: new Set([`branche:${drills[0].key}:drill`]) });
  check("… déjà faite : la suivante", destinationDe(a2drill, {}, dejaFaite)?.href === `/fiches/${drills[1].fiche}`);
  check("« Trois pigments » : le premier pas de la matière la plus lourde, sa durée à lui", destinationDe(quete("trame:a2:trois"), {}, enRoute)?.href === "/practice?topic=ethics" && destinationDe(quete("trame:a2:trois"), {}, enRoute)?.duree === genererBranches([contenu[0]]).find((q) => q.etape === "entree")!.duree);
  check("une quête sans destination nulle part : null", destinationDe({ ...maitre, id: "test:special", objectif: { k: "special", cle: "inconnu" } }, {}, enRoute) === null);
}

console.log("\n# les raisons");
{
  const virgule = (n: number) => String(n).replace(".", ",");
  const pctFsa = enRoute.maitrise.fsa.pct;
  // une quête de maîtrise dit ce qu'elle rapporte au cap (V3 §4.7) : (poids / Σ poids) × (seuil − pct), dès un demi-point
  const gain = (pct: number) => Math.round(((fsa.poids / contenu.reduce((s, m) => s + m.poids, 0)) * (60 - pct)) * 10) / 10;
  const gainFsa = gain(pctFsa ?? 0);
  check("matière mesurée, et son gain de préparation", gainFsa >= 0.5 && raisonDe(quete("branche:fsa:maitrise60"), enRoute) === `FSA pèse ${virgule(fsa.poids)} % de l'examen et tu es à ${pctFsa} % · +${virgule(gainFsa)} pt de préparation`, raisonDe(quete("branche:fsa:maitrise60"), enRoute) ?? "");
  check("matière pas encore mesurée : le gain compte depuis zéro", raisonDe(quete("branche:fsa:maitrise60"), neuf) === `FSA pèse ${virgule(fsa.poids)} % de l'examen et tu n'y as pas encore de mesure · +${virgule(gain(0))} pt de préparation`, raisonDe(quete("branche:fsa:maitrise60"), neuf) ?? "");
  const proche = avec(enRoute, { maitrises: enRoute.maitrises!.map((m) => (m.cle === "fsa" ? { ...m, pct: 58 } : m)) });
  check("un gain sous le demi-point ne se dit pas", raisonDe(quete("branche:fsa:maitrise60"), proche) === `FSA pèse ${virgule(fsa.poids)} % de l'examen et tu es à ${pctFsa} %`, raisonDe(quete("branche:fsa:maitrise60"), proche) ?? "");
  check("sans la maîtrise du cap dans le contexte : pas de gain", raisonDe(quete("branche:fsa:maitrise60"), avec(enRoute, { maitrises: undefined })) === `FSA pèse ${virgule(fsa.poids)} % de l'examen et tu es à ${pctFsa} %`);
  const n = notionsDeMatiere("fsa").length;
  check("les notions d'une matière", raisonDe(quete("branche:fsa:tour"), enRoute) === `FSA pèse ${virgule(fsa.poids)} % de l'examen et tu n'as vu que 2 de ses ${n} notions`, raisonDe(quete("branche:fsa:tour"), enRoute) ?? "");
  check("… aucune encore", raisonDe(quete("branche:fsa:tour"), neuf) === `FSA pèse ${virgule(fsa.poids)} % de l'examen et tu n'as encore vu aucune de ses ${n} notions`);
  const carte = quete("longcours:carte:2");
  const r = raisonDe(carte, enRoute, { fait: false, valeur: 12, cible: 25, atteint: null }) ?? "";
  check("une chaîne : l'avancée et son pourquoi (80 caractères au plus)", r.startsWith("12/25 · ") && r.length - "12/25 · ".length <= 80, r);
  check("… sans évaluation : le pourquoi seul", raisonDe(carte, enRoute) === "Une notion jamais vue, c'est une question donnée au hasard le jour J.");
  check("« À revoir » : le compte du jour", raisonDe(quete("trame:a3:ratures"), avec(enRoute, { revoir: { aujourdhui: 15 } })) === "15 à revoir aujourd'hui");
  const j = enRoute.joursAvant!;
  check("une quête du dernier mois : les jours qui restent", raisonDe(quete("trame:ep:carnet"), enRoute) === `L'examen est dans ${j} jours`, raisonDe(quete("trame:ep:carnet"), enRoute) ?? "");
  check("sans rien d'utile à dire : null", raisonDe(quete("trame:a4:defis"), enRoute) === null);
  const destinations = catalogueCodex().map((q) => destinationDe(q, {}, enRoute)).filter((x): x is Destination => !!x);
  check("aucune raison sur plusieurs lignes ni « Quête principale »", destinations.every((x) => x.raison === null || (!x.raison.includes("\n") && !x.raison.includes("Quête principale"))));
}

console.log("\n# les ajouts du catalogue taillé (V3 §8.5) : chacun mène quelque part");
{
  const d = (id: string, ctx = enRoute) => destinationDe(quete(id), {}, ctx);
  const nouvelles = catalogueCodex().filter((q) => q.nouvelle === "v3" && !q.miroir);
  const sans = nouvelles.filter((q) => defaut(d(q.id)) || defaut(d(q.id, neuf)));
  check(`${nouvelles.length} quêtes nouvelles de la v3 : toutes lançables, compte neuf comme joueur en route`, nouvelles.length > 30 && sans.length === 0, sans.map((q) => `${q.id} (${defaut(d(q.id))})`).slice(0, 4).join(" | "));
  check("la carte de FSA : une séance de FSA, raison sur la matière", d("branche:fsa:carte")?.href === "/practice?topic=fsa" && !!d("branche:fsa:carte")?.raison?.startsWith("FSA pèse"), `${d("branche:fsa:carte")?.href} · ${d("branche:fsa:carte")?.raison}`);
  const nFsa = notionsDeMatiere("fsa").length;
  const tenues = avec(enRoute, { notionsNonTenues: { ...Object.fromEntries(contenu.map((m) => [m.key, m.notions])), fsa: nFsa - 3 } });
  check("… les notions tenues lues : la raison les compte", raisonDe(quete("branche:fsa:carte"), tenues) === `FSA pèse 12,5 % de l'examen et tu tiens 3 de ses ${nFsa} notions`, raisonDe(quete("branche:fsa:carte"), tenues) ?? "");
  check("… aucune encore", raisonDe(quete("branche:fsa:carte"), avec(tenues, { notionsNonTenues: Object.fromEntries(contenu.map((m) => [m.key, m.notions])) })) === `FSA pèse 12,5 % de l'examen et tu ne tiens encore aucune de ses ${nFsa} notions`);
  check("… pas encore lues : la maîtrise, comme avant (sans gain : ce n'est pas une quête de maîtrise)", raisonDe(quete("branche:fsa:carte"), enRoute) === raisonDe(quete("branche:fsa:maitrise60"), avec(enRoute, { maitrises: undefined })));
  check("… avec practiceV3 : 20 questions", d("branche:fsa:carte", avec(enRoute, { practiceV3: true }))?.href === "/practice?topic=fsa&n=20");
  check("signatures : Ethics une séance d'Ethics, Quant les calculs, FSA sa fiche", d("branche:ethics:signature")?.href === "/practice?topic=ethics" && d("branche:quant:signature")?.href === "/calculs" && d("branche:fsa:signature")?.href?.startsWith("/fiches/financial-statement-analysis") === true,
    [d("branche:ethics:signature")?.href, d("branche:quant:signature")?.href, d("branche:fsa:signature")?.href].join(" "));
  const mj = d("longcours:main-juste:1");
  check("la main juste : ce qui coince (une séance, ou l'Atelier sur une notion faible)", !!mj && (mj.href.startsWith("/practice?topic=") || mj.href.startsWith("/atelier?notion=")), mj?.href);
  check("la carte tenue : une séance de la matière la plus lourde à couvrir", d("longcours:carte-tenue:1")?.href.startsWith("/practice?topic=") === true, d("longcours:carte-tenue:1")?.href);
  check("la malle : le Codex ; le débrief : les examens blancs (10 min)", d("trame:ep:malle")?.href === "/codex" && d("contrat:debrief")?.href === "/mock-exams" && d("contrat:debrief")?.duree === 10);
  check("la raison de la malle : les jours qui restent", raisonDe(quete("trame:ep:malle"), avec(enRoute, { joursAvant: 2 })) === "J-2 · Le jour J, rien ne doit manquer que tu aurais pu prévoir la veille.", raisonDe(quete("trame:ep:malle"), avec(enRoute, { joursAvant: 2 })) ?? "");
}

console.log("\n# recommander ne propose que des quêtes lançables");
{
  const q = (id: string, objectif: Quete["objectif"], ordre: number): Quete => ({ id, famille: "trame", programme: PROGRAMME, titre: id, consigne: id, objectif, prerequis: [], recompense: { xp: 10 }, repetition: "unique", visibilite: "visible", ordre });
  // à score égal, la première l'emporterait ; elle ne mène nulle part (son spécial est lu, à 0 : sinon elle serait hors jeu, V3 §8)
  const catalogue = [q("test:nulle-part", { k: "special", cle: "inconnu" }, 1), q("test:cinq", { k: "compteur", evenement: "cinq_rendu", seuil: 1 }, 2)];
  const e = base({ catalogue });
  const demandes = planifier(e);
  const brut: LectureSql = { ...e.lecture, speciaux: { ...e.lecture.speciaux, inconnu: 0 }, compteurs: Object.fromEntries(demandes.map((d): [string, ResultatCompteur] => [d.id, { n: 0, atteint: null }])) };
  const r = evaluer({ ...e, lecture: brut }, indexerLecture(demandes, brut));
  check("la quête sans destination est ouverte (visible dans l'arbre)", r.etats.some((s) => s.quete.id === "test:nulle-part" && s.ouverte && !s.fait));
  check("… mais jamais proposée", recommander({ ...e, lecture: brut }, r)?.quete.id === "test:cinq", recommander({ ...e, lecture: brut }, r)?.quete.id);
}

console.log("\n# l'arbre d'un programme d'essai (V3 §1.7) : une destination partout, dans ses outils");
{
  const contenuEssai = PROGRAMME_ESSAI.matieres();
  const ctx: ContexteDestination = { ...contexteDestination(base({ contenu: contenuEssai })), programme: PROGRAMME_ESSAI.cle, outils: PROGRAMME_ESSAI.outils };
  const arbre = genererArbre(PROGRAMME_ESSAI);
  const ko_ = arbre.map((q) => [q.id, defaut(destinationDe(q, {}, ctx))] as const).filter(([, e]) => e);
  check(`${arbre.length - ko_.length}/${arbre.length} quêtes lançables`, ko_.length === 0, ko_.slice(0, 5).map(([id, e]) => `${id} (${e})`).join(" | "));
  const horsOutils = arbre.map((q) => destinationDe(q, {}, ctx)).filter((d) => d && !["cinq", "eclair", "revoir", "codex", "profil", "classement"].includes(d.outil));
  check("aucune ne mène à un outil que l'essai n'a pas (séance ciblée, drill, blanc, duel…)", horsOutils.length === 0, horsOutils.map((d) => `${d!.outil} ${d!.href}`).join(" "));
  const serie = destinationDe(arbre.find((q) => q.id === "essai/branche:renaissance:serie")!, {}, ctx);
  check("« serie » : la série éclair (repli d'entraînement de l'essai), raison sur la matière", serie?.href === "/eclair" && !!serie.raison?.startsWith("Renaissance pèse 50 %"), `${serie?.href} · ${serie?.raison}`);
  const pigments = destinationDe(arbre.find((q) => q.id === "essai/trame:g1:pigments")!, {}, { ...ctx, faites: new Set(["essai/branche:renaissance:entree"]) });
  check("« branches à une étape » vise la première branche qui ne l'a pas (ids préfixés)", pigments?.raison?.startsWith("Cartographie pèse 30 %") ?? false, pigments?.raison ?? "");
}

console.log("\n# le fil rouge (V3 §1.5) : chaque palier figé mène quelque part, dans les outils du programme");
{
  const paliers = paliersFil([{ k: "acte", id: "prologue" }]);
  for (const [nom, ctx] of [["compte neuf", neuf], ["joueur en route", enRoute]] as const) {
    const ko_ = paliers.map((q) => [q.id, defaut(destinationDe(q, {}, ctx))] as const).filter(([, e]) => e);
    check(`${nom} : ${paliers.length - ko_.length}/${paliers.length} paliers lançables`, ko_.length === 0, ko_.slice(0, 5).map(([id, e]) => `${id} (${e})`).join(" | "));
  }
  const diamant = destinationDe(paliers.find((q) => q.id === "fil:trophees:3")!, {}, neuf);
  check("un trophée sans source : une séance mêlée (avant F1, /practice nu)", diamant?.href === "/practice", diamant?.href);
  const essai: ContexteDestination = { ...contexteDestination(base({ contenu: PROGRAMME_ESSAI.matieres() })), programme: PROGRAMME_ESSAI.cle, outils: PROGRAMME_ESSAI.outils };
  const horsOutils = paliers.map((q) => [q.id, destinationDe(q, {}, essai)] as const).filter(([, d]) => !d || !["cinq", "eclair", "revoir", "codex", "profil", "classement"].includes(d.outil));
  check("dans l'arbre d'essai : aucun palier ne mène à un outil absent", horsOutils.length === 0, horsOutils.map(([id, d]) => `${id} ${d?.outil} ${d?.href}`).join(" | "));
}

console.log("\n# le cap et la mémoire (A4b) : les lignes nouvelles");
{
  const avecRevoir = avec(enRoute, { routes: new Set([...ROUTES, "/revoir"]) });
  const essai = (mesure: "revisions_dues" | "ratures_scellees" | "preparation"): Quete => ({
    id: `essai:${mesure}`, famille: "longcours", programme: PROGRAMME, titre: mesure, consigne: mesure, objectif: { k: "mesure", mesure, seuil: 1 }, prerequis: [], recompense: { xp: 0 }, repetition: "unique", visibilite: "visible", ordre: 1,
  });
  check("« à revoir aujourd'hui », ratures scellées : « À revoir » (15 min) ; avant F2, le carnet",
    (["revisions_dues", "ratures_scellees"] as const).every((m) => destinationDe(essai(m), {}, avecRevoir)?.href === "/revoir" && destinationDe(essai(m), {}, avecRevoir)?.duree === 15 && destinationDe(essai(m), {}, enRoute)?.href === REPLIS["/revoir"]));
  check("… avec la file connue, la raison la compte", destinationDe(essai("revisions_dues"), {}, avec(avecRevoir, { revoir: { aujourdhui: 15 } }))?.raison === "15 à revoir aujourd'hui");
  const prep = destinationDe(essai("preparation"), {}, avec(enRoute, { practiceV3: true }));
  check("la préparation : ce qui coince (25 min)", !!prep && prep.duree === 25 && (prep.href.startsWith("/atelier?notion=") || prep.href.startsWith("/practice?topic=")), prep?.href);

  // « Y aller » du cap : ce qui coince dans la matière de la première fuite
  const pf = destinationCoince(enRoute, "fsa");
  check("la première fuite a un point faible net : l'Atelier sur la notion, raison sur la matière", pf?.href === `/atelier?notion=${encodeURIComponent(notionFsa)}` && pf.duree === 25 && !!pf.raison?.startsWith("FSA pèse"), pf?.href);
  const sansPf = destinationCoince(avec(neuf, { practiceV3: true }), "fsa");
  check("… sinon une séance de la matière (20 questions)", sansPf?.href === "/practice?topic=fsa&n=20", sansPf?.href);
  check("… une matière hors du programme : rien", destinationCoince(enRoute, "histoire") === null);

  // la chaîne « La mémoire longue » et le contrat de rappel ont enfin leur séance : « À revoir » (V3.md, cran 4)
  const memoire = catalogueCodex().filter((q) => q.chaine === "memoire");
  check(`la mémoire longue (${memoire.length} paliers) : « À revoir » ; avant F2, le carnet`, memoire.length === 5 && memoire.every((q) => destinationDe(q, {}, avecRevoir)?.href === "/revoir" && destinationDe(q, {}, enRoute)?.href === REPLIS["/revoir"]));
  const rappel = MODELES_CONTRATS.find((m) => m.id === "rappel")!;
  check("le contrat de rappel : « À revoir »", destinationDe(instanceContrat(rappel, {}, jour, contenu), {}, avecRevoir)?.href === "/revoir");
}

console.log(ko ? `\n${ko} échec(s)` : "\nTout est vert.");
process.exit(ko ? 1 : 0);
