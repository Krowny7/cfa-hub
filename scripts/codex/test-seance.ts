// La séance du jour (lib/codex/seance.ts, V3 §6.1, §6.7) : 5 phases × 4
// budgets, l'ordre des blocs, la durée, l'épreuve mêlée, l'épreuve en veillée
// de J-7 à J-4, « Une autre idée ? » sans retirer un bloc fait, le stockage,
// les raisons, et les objectifs comptés depuis le lancement.
// Usage, depuis le dépôt : npx tsx --tsconfig tsconfig.json scripts/codex/test-seance.ts

import { contenuDuProgramme } from "@/lib/codex/catalogue";
import { maitriseDuCodex } from "@/lib/codex/cap";
import { budgetDuJour, contexteDestination, evaluer, evaluerObjectifs, planifier, type Entree, type MesuresSql } from "@/lib/codex/moteur";
import { CFA_L1 } from "@/lib/codex/programmes/cfa-l1";
import { notionsDeMatiere } from "@/lib/notions";
import {
  MARGE_SEANCE, MAX_BLOCS, ORDRE_BLOCS, aRecomposer, blocSuivant, budgetParDefaut, composerSeance, depuisStockage, ecartesSeance, faitsDeSeance, lireSeanceGardee, objectifBloc, raisonCoince, raisonEpreuve, raisonNouveau, raisonRetouches, revoirCodexDe, seanceTenue, versStockage,
  type EntreeSeance, type GenreBloc, type RevoirCodex, type VueSeance,
} from "@/lib/codex/seance";
import { PANNEAU_VIDE, panneauAGarder, panneauDuCache, pastilleSeance, seancePanneau } from "@/lib/codex/panneau";
import { MAX_GAINS, budgetSuivant, enteteSeance, etapeSeance, gainsSeance, instantaneSeance, lireInstantane, rangEnCours } from "@/lib/codex/seance";
import { bilanDe } from "@/lib/codex/bilan";
import { exempleCodex } from "@/scripts/codex/exemple";
import type { Budget, Phase } from "@/lib/codex/types";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const J = (o: unknown) => JSON.stringify(o);

const contenu = contenuDuProgramme();
const jour = "2026-10-17";
const now = new Date("2026-10-17T08:00:00Z");
// un joueur en route : toutes les matières mesurées, FSA basse (48 %), Ethics moyenne ; des notions jamais vues ; 18 questions à revoir
const mesures: MesuresSql = {
  xp_total: 4000,
  maitrise: {
    ...Object.fromEntries(contenu.map((m) => [m.key, { pct: 75, questions: 50, debut: 60 }])),
    fsa: { pct: 48, questions: 60, debut: 40 }, quant: { pct: 71, questions: 45, debut: 60 }, ethics: { pct: 66, questions: 50, debut: 55 },
  },
  notions: Object.fromEntries(notionsDeMatiere("quant").map((n) => [n.id, 9])),
};
const base = (o: Partial<Entree> = {}): Entree => ({
  contenu, now, jour, jourJ: null, objectif: null, visiteVue: true, progression: [], contrats: [], premier: false, dernierCalcul: null,
  lecture: { compteurs: {}, mesures, speciaux: {} }, ...o,
});
const dest = contexteDestination(base());
const maitrise = maitriseDuCodex(contenu, mesures);
const nonVues = contenu.map((m) => {
  const toutes = notionsDeMatiere(m.key);
  return { matiere: m.key, n: toutes.filter((n) => (mesures.notions?.[n.id] ?? 0) < 5).length, total: toutes.length };
});
const revoir: RevoirCodex = { aujourdhui: 18, demain: 22, ratures: 8, rappels: 10, complet: true };
const entree = (o: Partial<EntreeSeance> = {}): EntreeSeance => ({
  jour, phase: "fondations", joursAvant: null, budget: 30, maitrise, revoir, cinqFait: false, trenteFait: false, trenteDispo: true, questionsTotal: 800,
  notionsNonVues: nonVues, contrats: [], def: CFA_L1, ecartes: [], dest, ...o,
});
const genres = (s: { blocs: { genre: GenreBloc }[] }) => s.blocs.map((b) => b.genre);

console.log("# 5 phases × 4 budgets");
const PHASES: Phase[] = ["fondations", "consolidation", "repetition", "veillee", "apres"];
const BUDGETS: Budget[] = [15, 30, 60, 90];
const JOURS_AVANT: Record<Phase, number | null> = { fondations: 120, consolidation: 60, repetition: 20, veillee: 6, apres: -3 };
for (const phase of PHASES) {
  for (const budget of BUDGETS) {
    const s = composerSeance(entree({ phase, budget, joursAvant: JOURS_AVANT[phase] }));
    const g = genres(s);
    const ordre = g.map((x) => ORDRE_BLOCS[phase].indexOf(x));
    const somme = s.blocs.reduce((t, b) => t + b.duree, 0);
    check(
      `${phase} · ${budget} min : ${g.join(", ")} (${s.duree} min)`,
      s.duree === somme && s.duree <= budget + MARGE_SEANCE && s.blocs.length >= 1 && s.blocs.length <= MAX_BLOCS[budget]
        && ordre.every((i, k) => i >= 0 && (k === 0 || i > ordre[k - 1]))
        && s.blocs.every((b) => b.destination.href.startsWith("/") && b.destination.libelle === "Y aller" && b.raison.length > 0 && b.titre.length > 0)
        && new Set(g).size === g.length
        && (budget >= 60 || !g.includes("trente")),
      J(s.blocs.map((b) => [b.genre, b.duree, b.destination.href])),
    );
  }
}

console.log("\n# les règles des blocs");
{
  const s = composerSeance(entree({ phase: "fondations", budget: 30, cinqFait: true }));
  check("les 5 du jour faits : pas de bloc « cinq »", !genres(s).includes("cinq"), J(genres(s)));
  const t = composerSeance(entree({ phase: "fondations", budget: 90, revoir: null, notionsNonVues: [] }));
  check("90 min, rien à revoir ni de neuf : les 30 du jour entrent (≥ 60 min, disponibles, 100 questions posées)", genres(t).includes("trente") && t.blocs.find((b) => b.genre === "trente")!.destination.href === "/defi", J(genres(t)));
  check("… mais pas sous 100 questions posées, ni s'ils sont faits ou absents",
    !genres(composerSeance(entree({ phase: "fondations", budget: 90, revoir: null, notionsNonVues: [], questionsTotal: 99 }))).includes("trente")
      && !genres(composerSeance(entree({ phase: "fondations", budget: 90, revoir: null, notionsNonVues: [], trenteFait: true }))).includes("trente")
      && !genres(composerSeance(entree({ phase: "fondations", budget: 90, revoir: null, notionsNonVues: [], trenteDispo: false }))).includes("trente"));
  const peu = composerSeance(entree({ revoir: { ...revoir, aujourdhui: 4 } }));
  check("moins de 5 à revoir : pas de retouches", !genres(peu).includes("retouches"), J(genres(peu)));
  const r = composerSeance(entree({ phase: "consolidation", budget: 60 })).blocs.find((b) => b.genre === "retouches");
  check("retouches : n = min(à revoir, budget restant), lien /revoir pris par son repli tant que la page manque", r?.n === 18 && r.duree === 18 && r.destination.href === "/moi?onglet=erreurs&reprise=1", J(r?.destination));
  const v = composerSeance(entree({ phase: "veillee", joursAvant: 2, budget: 60, revoir: { ...revoir, aujourdhui: 25 } })).blocs.find((b) => b.genre === "retouches");
  check("veillée : retouches à 15 au plus", v?.n === 15, J(v?.n));
  const c = composerSeance(entree({ phase: "consolidation", budget: 60 })).blocs.find((b) => b.genre === "coince");
  check("ce qui coince : la matière au plus fort poids × manque (FSA, 48 %), 25 min à 60 min", c?.matiere === "fsa" && c.duree === 25 && c.raison === "FSA pèse 12,5 % et tu es à 48 % (zone basse)" && /topic=fsa/.test(c.destination.href), J(c));
  const c15 = composerSeance(entree({ phase: "consolidation", budget: 15, revoir: null, cinqFait: true })).blocs.find((b) => b.genre === "coince");
  check("ce qui coince : 15 min à 15 ou 30 min", c15?.duree === 15, J(c15?.duree));
  const pf = { ...dest, pointsFaibles: [{ notion: notionsDeMatiere("fsa")[0].id, score: 72 }] };
  const ca = composerSeance(entree({ phase: "consolidation", budget: 60, dest: pf })).blocs.find((b) => b.genre === "coince");
  check("ce qui coince : une notion de FSA en point faible net (≥ 60) et 20 min ou plus → l'Atelier", !!ca && ca.destination.href.startsWith("/atelier?notion="), J(ca?.destination.href));
  const cv = composerSeance(entree({ phase: "veillee", joursAvant: 2, budget: 90 })).blocs.find((b) => b.genre === "coince");
  check("veillée : ce qui coince vise une matière déjà en zone moyenne ou haute, 15 min", !!cv && cv.matiere !== "fsa" && ["moyenne", "haute"].includes(maitrise.matieres.find((m) => m.cle === cv.matiere)!.zone ?? "") && cv.duree === 15, J(cv));
  const n = composerSeance(entree({ phase: "fondations", budget: 60 })).blocs.find((b) => b.genre === "nouveau");
  check("du neuf : la matière au plus fort poids × part jamais vue, 20 min, sa fiche si elle a un drill", !!n && n.duree === 20 && !!n.matiere && n.matiere !== "quant" && /notions? .* jamais vues? sur \d+/.test(n.raison), J(n));
}

console.log("\n# l'épreuve");
{
  const rep = composerSeance(entree({ phase: "repetition", joursAvant: 20, budget: 90, trenteFait: true }));
  const e = rep.blocs.find((b) => b.genre === "epreuve");
  check("répétition : l'épreuve est mêlée aux poids officiels (topic=all, n=30, poids=1), 45 min", !!e && e.duree === 45 && /topic=all/.test(e.destination.href) && /n=30/.test(e.destination.href) && /poids=1/.test(e.destination.href), J(e?.destination));
  check("… et dit pourquoi : « J-20 : le rythme de l'examen, 30 questions mêlées aux poids officiels »", e?.raison === "J-20 : le rythme de l'examen, 30 questions mêlées aux poids officiels", e?.raison);
  const d = composerSeance(entree({ phase: "repetition", joursAvant: 20, budget: 90 })).blocs.find((b) => b.genre === "epreuve");
  check("les 30 du jour pas faits : l'épreuve, ce sont eux (/defi, 40 min)", d?.destination.href === "/defi" && d.duree === 40, J(d?.destination));
  const avant = composerSeance(entree({ phase: "repetition", joursAvant: 20, budget: 90, trenteFait: true, dest: { ...dest, practiceV3: false } })).blocs.find((b) => b.genre === "epreuve");
  check("sans les paramètres v3 de /practice : jamais topic=all, le lien nu", avant?.destination.href === "/practice", J(avant?.destination.href));
  for (const j of [7, 5, 4]) {
    const s = composerSeance(entree({ phase: "veillee", joursAvant: j, budget: 60 }));
    check(`veillée J-${j} (60 min) : l'épreuve est proposée`, genres(s).includes("epreuve"), J(genres(s)));
  }
  for (const j of [3, 1, 0]) {
    const s = composerSeance(entree({ phase: "veillee", joursAvant: j, budget: 60 }));
    check(`veillée J-${j} : plus d'épreuve`, !genres(s).includes("epreuve"), J(genres(s)));
  }
  check("fondations, consolidation, après : jamais d'épreuve", (["fondations", "consolidation", "apres"] as Phase[]).every((p) => BUDGETS.every((b) => !genres(composerSeance(entree({ phase: p, budget: b, joursAvant: JOURS_AVANT[p] }))).includes("epreuve"))));
}

console.log("\n# « Une autre idée ? » et les blocs faits");
{
  const s = composerSeance(entree({ phase: "consolidation", budget: 60 }));
  const fait = s.blocs[0];
  const autre = composerSeance(entree({ phase: "consolidation", budget: 60, ecartes: ["coince"], blocsFaits: [fait] }));
  check("« Une autre idée ? » sur ce qui coince : le bloc change, le bloc fait reste en tête",
    genres(s).includes("coince") && !genres(autre).includes("coince") && autre.blocs[0] === fait && genres(autre).length >= genres(s).length - 1 && J(genres(autre)) !== J(genres(s)),
    `${J(genres(s))} → ${J(genres(autre))}`);
  const cinq = s.blocs.find((b) => b.genre === "cinq")!;
  const apres = composerSeance(entree({ phase: "consolidation", budget: 60, cinqFait: true, ecartes: ["cinq"], blocsFaits: [cinq] }));
  check("un bloc fait n'est jamais retiré, même écarté ou plus proposable (les 5 rendus)", genres(apres)[0] === "cinq", J(genres(apres)));
  check("ecartesSeance lit les genres parmi les quêtes écartées du jour", J(ecartesSeance(["trame:a2:x", "seance:coince", "seance:inconnu", "seance:cinq"])) === J(["coince", "cinq"]));
  check("bloc suivant et séance tenue", blocSuivant({ blocs: s.blocs, faits: [s.blocs[0].genre] }) === s.blocs[1] && !seanceTenue({ blocs: s.blocs, faits: [] }) && seanceTenue({ blocs: s.blocs, faits: genres(s) }));
}

console.log("\n# le stockage (codex_seances.blocs)");
{
  const s = composerSeance(entree({ phase: "repetition", joursAvant: 20, budget: 90, trenteFait: true }));
  const stockes = versStockage(s.blocs);
  const relus = depuisStockage(JSON.parse(J(stockes)));
  check("aller-retour : mêmes genres, liens, durées, raisons et objectifs",
    J(relus.map((b) => [b.genre, b.destination.href, b.duree, b.raison, b.objectif, b.matiere ?? null, b.n ?? null])) === J(s.blocs.map((b) => [b.genre, b.destination.href, b.duree, b.raison, b.objectif, b.matiere ?? null, b.n ?? null])));
  check("un bloc mal formé est ignoré (genre inconnu, lien externe, durée absurde, doublon)",
    depuisStockage([{ genre: "x", titre: "a", duree: 5, href: "/a" }, { genre: "cinq", titre: "a", duree: 5, href: "https://x.fr" }, { genre: "cinq", titre: "a", duree: 500, href: "/a" }, { genre: "cinq", titre: "a", duree: 5, href: "//x" }, ...stockes.slice(0, 1), ...stockes.slice(0, 1)]).length === 1
      && depuisStockage(null).length === 0 && depuisStockage("x").length === 0);
}

console.log("\n# les raisons");
check("retouches : « 18 à revoir : 8 ratures sèches, 10 rappels · demain 22 »", raisonRetouches(revoir) === "18 à revoir : 8 ratures sèches, 10 rappels · demain 22", raisonRetouches(revoir));
check("retouches : le singulier et rien pour demain", raisonRetouches({ aujourdhui: 6, demain: 0, ratures: 1, rappels: 5, complet: true }) === "6 à revoir : 1 rature sèche, 5 rappels");
check("retouches sans la file (repli) : les ratures en cours", raisonRetouches({ aujourdhui: 12, demain: 0, ratures: 12, rappels: 0, complet: false }) === "12 ratures à remettre au propre");
{
  const inconnue = maitriseDuCodex(contenu, { maitrise: { fsa: { pct: 48, questions: 60, debut: 40 } } });
  const c = composerSeance(entree({ phase: "consolidation", budget: 30, revoir: null, cinqFait: true, maitrise: inconnue })).blocs.find((b) => b.genre === "coince");
  check("ce qui coince : une matière pas encore mesurée compte pour 20 % (la plus lourde passe devant FSA à 48 %)", !!c && c.matiere !== "fsa" && /n'est pas encore mesurée$/.test(c.raison), J(c?.raison));
}
check("ce qui coince, pas encore mesurée",raisonCoince({ court: "Ethics", poids: 15, pct: null, zone: null }) === "Ethics pèse 15 % et elle n'est pas encore mesurée");
check("du neuf, l'élision : « 4 notions d'Ethics jamais vues sur 9 » ; « 1 notion de FSA jamais vue sur 30 »", raisonNouveau("Ethics", 4, 9) === "4 notions d'Ethics jamais vues sur 9" && raisonNouveau("FSA", 1, 30) === "1 notion de FSA jamais vue sur 30");
check("l'épreuve sans jour J", raisonEpreuve(null, false) === "Le rythme de l'examen : 30 questions mêlées aux poids officiels");

console.log("\n# les objectifs, comptés depuis le lancement");
{
  const blocs = composerSeance(entree({ phase: "consolidation", budget: 60 })).blocs;
  const objectifs = blocs.map((b) => b.objectif);
  const lancee = "2026-10-17T07:30:00.000Z";
  const dLancee = planifier(base({ seance: { objectifs, lanceeLe: lancee } }));
  const dJour = planifier(base({ seance: { objectifs, lanceeLe: null } }));
  const sans = planifier(base());
  const cinq = (ds: typeof sans) => ds.filter((d) => d.evenement === "cinq_rendu" && (J(d.fenetre) === J({ depuis: lancee }) || (d.fenetre === "jour" && d.seuil === 1 && !d.filtre)));
  check("les compteurs des blocs partent dans le même appel : fenêtre { depuis: lancement }", cinq(dLancee).some((d) => J(d.fenetre) === J({ depuis: lancee })) && dLancee.length > sans.length, `${sans.length} → ${dLancee.length}`);
  check("pas encore lancée : la fenêtre du jour", dJour.some((d) => d.evenement === "cinq_rendu" && d.fenetre === "jour" && d.jour === jour));
  const e = base({ seance: { objectifs, lanceeLe: lancee } });
  const cle = (d: (typeof dLancee)[number]) => J([d.evenement, d.filtre ?? null, d.fenetre ?? null, d.jour ?? null, d.distinct ?? null, d.somme ?? null, d.seuil]);
  const compteurs = Object.fromEntries(dLancee.map((d) => [cle(d), { n: d.evenement === "cinq_rendu" || (d.evenement === "question_repondue" && J(d.filtre) === J({ matiere: "fsa" })) ? 12 : 0, atteint: null }]));
  const ev = evaluerObjectifs(e, compteurs, objectifs);
  const faits = blocs.filter((_, i) => ev[i].fait).map((b) => b.genre);
  check("fait d'après les compteurs : les 5 rendus, 12 réponses en FSA (ce qui coince) ; pas les retouches", J(faits) === J(["cinq", "coince"]), J(faits));
  check("retouches : la moitié des ratures rayées (⌈n/2⌉) ou une séance « À revoir » rendue", J(objectifBloc("retouches", { n: 15 })) === J({ k: "unDe", objectifs: [{ k: "compteur", evenement: "revoir_rendue", seuil: 1, fenetre: "depuisLancement" }, { k: "compteur", evenement: "rature_rayee", seuil: 8, fenetre: "depuisLancement" }] }));
  check("l'épreuve : une séance mêlée (matière null) de 30 questions ou plus compte", J(objectifBloc("epreuve")).includes(J({ matiere: null, questions: { min: 30 } })));
}

console.log("\n# garder ou recomposer, relire la base, la pastille");
{
  const s = composerSeance(entree({ phase: "consolidation", budget: 60 }));
  const ligne = { jour, budget_min: 60, blocs: versStockage(s.blocs), faits: ["cinq", "sieste"], lancee_le: "2026-10-17T07:30:00Z", finie_le: null };
  const g = lireSeanceGardee(JSON.parse(J(ligne)));
  check("une ligne de codex_seances relue : budget, blocs, faits (un genre inconnu tombe), lancement", !!g && g.budget === 60 && J(g.blocs.map((b) => b.genre)) === J(genres(s)) && J(g.faits) === J(["cinq"]) && g.lanceeLe === "2026-10-17T07:30:00Z" && g.finieLe === null, J(g));
  check("une ligne illisible : rien (la séance se recompose)", lireSeanceGardee(null) === null && lireSeanceGardee({ budget_min: 45, blocs: [] }) === null);
  check("la séance gardée tient : même budget, rien d'écarté", !aRecomposer(g, 60, [], ["cinq"]));
  check("recomposée : pas de séance, budget changé, ou un bloc à faire écarté", aRecomposer(null, 60, [], []) && aRecomposer(g, 30, [], ["cinq"]) && aRecomposer(g, 60, ["coince"], ["cinq"]));
  check("… mais pas pour un bloc déjà fait qu'on écarte (il reste)", !aRecomposer(g, 60, ["cinq"], ["cinq"]));
  check("la file pour la séance : revisions_dues complète, sinon les ratures en cours (25 au plus), sinon rien",
    J(revoirCodexDe({ revoir: { aujourdhui: 30, demain: 40, ratures: 20, rappels: 10 } })) === J({ aujourdhui: 25, demain: 25, ratures: 20, rappels: 10, complet: true })
      && J(revoirCodexDe({ ratures_ouvertes: { total: 120 } })) === J({ aujourdhui: 25, demain: 0, ratures: 25, rappels: 0, complet: false }) && revoirCodexDe({}) === null);
  const vs: VueSeance = { ...s, faits: ["cinq"], lancee: true, lanceeLe: "2026-10-17T07:30:00Z", finie: false, finieLe: null, gardee: true };
  const p = seancePanneau(vs);
  check("la pastille : « Séance 1/3 », lancée, le bloc suivant et son lien", !!p && p.lancee && p.faits === 1 && p.total === 3 && p.suivant?.titre === s.blocs[1].titre && p.suivant.href === s.blocs[1].destination.href, J(p));
  check("la pastille d'une séance finie : plus de bloc suivant ; pas de séance : rien", seancePanneau({ ...vs, finie: true, finieLe: "2026-10-17T09:00:00Z" })?.suivant === null && seancePanneau(null) === null);
}

console.log("\n# les blocs faits et le bonus du trio");
{
  const s = composerSeance(entree({ phase: "consolidation", budget: 60 }));
  const g = { blocs: s.blocs, faits: ["cinq"] as GenreBloc[], lanceeLe: "2026-10-17T07:30:00Z" };
  const ev = (...f: boolean[]) => f.map((fait) => ({ fait }));
  const lus = faitsDeSeance(g, ev(true, false, false, true, false));
  check("les sondes (5 et 30 rendus), puis un bloc par objectif ; un fait gardé ne se perd pas", lus.cinqFait && !lus.trenteFait && J(lus.faits) === J(["cinq", genres(s)[1]]) && !lus.tenue, J(lus));
  check("tous les blocs faits d'une séance lancée : tenue", faitsDeSeance(g, ev(false, false, true, true, true)).tenue);
  {
    const avec5 = composerSeance(entree({ phase: "fondations", budget: 60 }));
    const g5 = { blocs: avec5.blocs, faits: [] as GenreBloc[], lanceeLe: "2026-10-17T07:30:00Z" };
    const l5 = faitsDeSeance(g5, ev(true, false, ...avec5.blocs.map(() => false)));
    check("les 5 du jour rendus avant le lancement : leur bloc est fait quand même (coché des deux côtés de l'accueil)", genres(avec5).includes("cinq") && l5.faits.includes("cinq") && l5.faits.length === 1, J(l5.faits));
    const ep = composerSeance(entree({ phase: "repetition", budget: 90, joursAvant: 20 }));
    const blocEp = ep.blocs.find((b) => b.genre === "epreuve");
    const lEp = faitsDeSeance({ blocs: ep.blocs, faits: [], lanceeLe: null }, ev(false, true, ...ep.blocs.map(() => false)));
    check("… de même l'épreuve qui mène aux 30 du jour, une fois les 30 rendus", !blocEp || blocEp.destination.outil !== "trente" || lEp.faits.includes("epreuve"), J([blocEp?.destination.href, lEp.faits]));
  }
  check("… pas lancée : pas tenue (pas de bonus)", !faitsDeSeance({ ...g, lanceeLe: null }, ev(false, false, true, true, true)).tenue && !faitsDeSeance(null, ev(true, true)).tenue);
  const sansContrats = evaluer(base({ seance: { objectifs: [], lanceeLe: g.lanceeLe, tenue: true } }), {});
  check("la séance lancée et tenue verse le bonus du trio (même id, même XP), sans trois contrats sur trois", sansContrats.trioFait && sansContrats.lot.some((i) => i.quete === `contrat:trio:${jour}` && i.xp === 50), J(sansContrats.lot.filter((i) => i.famille === "contrat")));
  const deja = evaluer(base({ seance: { objectifs: [], lanceeLe: g.lanceeLe, tenue: true }, progression: [{ quete_id: `contrat:trio:${jour}`, periode: jour, etat: "recompensee", progression: 3, cible: 3, ouverte_le: now.toISOString(), terminee_le: now.toISOString(), recompensee_le: now.toISOString(), retro: false, xp: 50, cosmetique: null, titre: null, vu: true }] }), {});
  check("une fois par jour : déjà versé, rien de plus", !deja.lot.some((i) => i.quete === `contrat:trio:${jour}`));
  check("pas tenue : pas de bonus", !evaluer(base({ seance: { objectifs: [], lanceeLe: g.lanceeLe, tenue: false } }), {}).lot.some((i) => i.quete === `contrat:trio:${jour}`));
}

console.log("\n# l'instantané du panneau (codex_vue_cache)");
{
  const p = { ...PANNEAU_VIDE, disponible: true, jour };
  const t = Date.parse("2026-10-17T10:00:00Z");
  const ligne = (o: Record<string, unknown> = {}) => ({ jour, panneau: panneauAGarder(p), calcule_le: "2026-10-17T09:55:00Z", a_recalculer: false, ...o });
  check("relu : du jour, de moins de 10 min, pas marqué, de la même forme", J(panneauDuCache(ligne(), jour, t)) === J(p));
  check("recalculé : marqué, trop vieux, d'hier, d'une autre forme, absent ou d'un Codex indisponible",
    panneauDuCache(ligne({ a_recalculer: true }), jour, t) === null && panneauDuCache(ligne({ calcule_le: "2026-10-17T09:49:00Z" }), jour, t) === null
      && panneauDuCache(ligne({ jour: "2026-10-16" }), jour, t) === null && panneauDuCache(ligne({ panneau: { version: 0, panneau: p } }), jour, t) === null
      && panneauDuCache(ligne({ panneau: p }), jour, t) === null && panneauDuCache(null, jour, t) === null && panneauDuCache(ligne({ panneau: panneauAGarder(PANNEAU_VIDE) }), jour, t) === null);
}

console.log("\n# le budget par défaut");
check("sans historique : 30 min ; 40 questions par jour (48 min) : 60 ; 10 par jour : 15", budgetParDefaut([]) === 30 && budgetParDefaut([40, 38, 42, 40]) === 60 && budgetParDefaut([10, 12, 9]) === 15);
{
  const jours = (aujourdhui: number) => ({ ...mesures, jours: [{ jour: "2026-10-14", n: 40 }, { jour: "2026-10-15", n: 42 }, { jour: "2026-10-16", n: 38 }, { jour, n: aujourdhui }] });
  const b = (n: number) => budgetDuJour(base({ lecture: { compteurs: {}, mesures: jours(n), speciaux: {} } }));
  check("le budget par défaut ne bouge pas dans la journée (aujourd'hui n'y compte pas) : la séance non plus", b(0) === 60 && b(200) === 60 && b(3) === 60, J([b(0), b(200), b(3)]));
}

console.log("\n# l'écran de la séance : étapes, « Continuer · 2/3 », « Encore un bloc ? » (V3 §6.3–§6.5)");
{
  const s = composerSeance(entree({ phase: "consolidation", budget: 60 }));
  const v = (o: Partial<VueSeance> = {}): VueSeance => ({ ...s, faits: [], lancee: false, lanceeLe: null, finie: false, finieLe: null, gardee: true, ...o });
  const tous = s.blocs.map((b) => b.genre);
  check("proposée (« Commencer ») → en cours (« Continuer ») → tenue → close",
    etapeSeance(v()) === "proposee" && etapeSeance(v({ lancee: true, faits: [tous[0]] })) === "enCours" && etapeSeance(v({ lancee: true, faits: tous, finie: true })) === "tenue"
      && etapeSeance(v({ lancee: true, faits: [tous[0]], finie: true, finieLe: "2026-10-17T09:00:00Z" })) === "close");
  check("tous les blocs faits sans l'avoir lancée : tenue quand même (pas de bonus, mais rien à commencer)", etapeSeance(v({ faits: tous })) === "tenue");
  check("« Continuer · 2/3 » : le premier bloc pas fait ; tous faits : le total",
    J(rangEnCours(v({ faits: [tous[0]] }))) === J({ rang: 2, total: 3 }) && J(rangEnCours(v({ faits: tous }))) === J({ rang: 3, total: 3 }) && rangEnCours(v({ faits: [tous[1]] })).rang === 1);
  check("« Encore un bloc ? » : le budget du dessus, rien au-delà de 90 min", budgetSuivant(15) === 30 && budgetSuivant(30) === 60 && budgetSuivant(60) === 90 && budgetSuivant(90) === null);
  const plus = composerSeance(entree({ phase: "consolidation", budget: 90, blocsFaits: s.blocs }));
  check("… et la séance recomposée garde ses blocs faits en tête, avec un bloc de plus", plus.blocs.length > s.blocs.length && J(plus.blocs.slice(0, s.blocs.length).map((b) => b.genre)) === J(tous), J(plus.blocs.map((b) => b.genre)));
  check("l'en-tête : « J-10 · Répétition générale », « Jour J · … », la phase seule sans jour J",
    enteteSeance(10, "Répétition générale") === "J-10 · Répétition générale" && enteteSeance(0, "Veillée") === "Jour J · Veillée" && enteteSeance(null, "Fondations") === "Fondations" && enteteSeance(-2, "Après") === "Après");
}

console.log("\n# la pastille « Séance 2/3 · Continuer → »");
{
  const seance = { lancee: true, faits: 1, total: 3, suivant: { titre: "Ce qui coince", href: "/practice?topic=fsa&n=20" } };
  check("lancée : « Séance 2/3 » et le lien du bloc en cours", J(pastilleSeance(seance, "/dashboard")) === J({ rang: 2, total: 3, href: "/practice?topic=fsa&n=20" }));
  check("cachée sur la page du bloc en cours (requête ignorée), masquée pour la journée, pas lancée, finie, ou sans séance",
    pastilleSeance(seance, "/practice") === null && pastilleSeance(seance, "/practice/") === null && pastilleSeance(seance, "/dashboard", { masquee: true }) === null
      && pastilleSeance({ ...seance, lancee: false }, "/dashboard") === null && pastilleSeance({ ...seance, suivant: null }, "/dashboard") === null && pastilleSeance(null, "/dashboard") === null);
  check("sans la base : lancée dans ce navigateur, elle se montre", !!pastilleSeance({ ...seance, lancee: false }, "/codex", { lanceeIci: true }));
  check("une autre page qui commence pareil n'est pas la destination", !!pastilleSeance({ ...seance, suivant: { titre: "Les 5 du jour", href: "/defi/cinq" } }, "/defi"));
}

console.log("\n# « Ce que ça a fait avancer » (l'instantané au lancement, les gains)");
{
  const vue = exempleCodex("milieu", { unique: true });
  const avant = instantaneSeance(vue);
  check("l'instantané : la maîtrise mesurée, la file « À revoir », 5 quêtes visées au plus (la prochaine d'abord)",
    Object.keys(avant.quetes).length > 0 && Object.keys(avant.quetes).length <= 5 && (!vue.prochaine || `${vue.prochaine.ligne.id}|${vue.prochaine.ligne.periode}` in avant.quetes) && Object.keys(avant.maitrise).length > 0,
    J(avant).slice(0, 160));
  check("relu tel quel ; illisible : null ; valeurs hors bornes écartées",
    J(lireInstantane(JSON.parse(J(avant)))) === J(avant) && lireInstantane(null) === null && lireInstantane([1]) === null
      && J(lireInstantane({ maitrise: { fsa: 140, quant: 50 }, revoir: -3, quetes: { a: 2, b: 0.5 } })) === J({ maitrise: { quant: 50 }, revoir: null, quetes: { b: 0.5 } }));
  check("rien n'a bougé : aucun gain (la régularité, déjà) ; sans instantané : aucun", gainsSeance(avant, vue).length === 0 && gainsSeance(null, vue).length === 0);
  const [q0] = Object.keys(avant.quetes);
  const m0 = Object.keys(avant.maitrise)[0];
  const moins = { maitrise: { ...avant.maitrise, [m0]: avant.maitrise[m0] - 6 }, revoir: (avant.revoir ?? 0) + 9, quetes: { ...avant.quetes, [q0]: Math.max(0, avant.quetes[q0] - 0.4) } };
  const gains = gainsSeance(moins, vue);
  const court = vue.cap?.matieres.find((m) => m.cle === m0)?.court ?? "";
  check("les gains : la quête qui a avancé, la matière qui a monté ; trois au plus, le plus grand d'abord, jauges entre 0 et 1",
    gains.length >= 2 && gains.length <= MAX_GAINS && gains.some((g) => g.cle === `quete:${q0}`) && gains.some((g) => g.cle === `maitrise:${m0}` && g.texte === `${court} ${avant.maitrise[m0] - 6} % → ${avant.maitrise[m0]} %`)
      && gains.every((g, i) => i === 0 || gains[i - 1].poids >= g.poids) && gains.every((g) => g.fraction >= 0 && g.fraction <= 1),
    J(gains));
  check("« À revoir 23 → 14 » : la file qui baisse est un gain",
    avant.revoir === null || gainsSeance({ maitrise: {}, revoir: avant.revoir + 9, quetes: {} }, vue).some((g) => g.texte === `À revoir ${avant.revoir! + 9} → ${avant.revoir}`));
  const ligne = { budget_min: 60, blocs: versStockage(composerSeance(entree({ phase: "consolidation", budget: 60 })).blocs), faits: [], lancee_le: "2026-10-17T07:30:00Z", finie_le: null, avant: moins };
  check("la séance gardée relit son instantané (codex_seances.avant)", J(lireSeanceGardee(JSON.parse(J(ligne)))?.avant) === J(lireInstantane(moins)));
}

console.log("\n# la séance d'exemple (aperçus) et la fin de séance en fin d'outil (FeteCodex)");
{
  const etapes = ["proposee", "enCours", "tenue", "close"] as const;
  const vues = etapes.map((x) => exempleCodex("milieu", { seance: x }));
  check("une séance à chaque étape, avec des blocs lançables",
    vues.every((v, i) => !!v.seance && v.seance.blocs.length > 0 && etapeSeance(v.seance) === etapes[i] && v.seance.blocs.every((b) => b.destination.href.startsWith("/"))),
    J(vues.map((v) => v.seance && etapeSeance(v.seance))));
  const tenue = vues[2];
  const g = gainsSeance(tenue.seance!.avant, tenue);
  check("tenue : ce qu'elle a fait avancer (1 à 3 lignes)", g.length >= 1 && g.length <= MAX_GAINS, J(g));
  const b = bilanDe(tenue);
  check("le bilan de fin d'outil porte la séance tenue (gains, lancement, budget) ; pas une séance proposée, en cours ou close",
    !!b.seance && b.seance.gains.length >= 1 && b.seance.lanceeLe === tenue.seance!.lanceeLe && b.seance.budget === tenue.seance!.budget && [vues[0], vues[1], vues[3]].every((v) => !bilanDe(v).seance));
  check("sans séance (le Codex d'avant) : le bilan n'en dit rien", !bilanDe(exempleCodex("milieu")).seance);
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
