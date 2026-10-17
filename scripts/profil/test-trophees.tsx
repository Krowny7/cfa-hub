// Tests légers de l'interface des trophées et des paramètres de /practice,
// sans base ni réseau ni navigateur (rendu statique par react-dom/server).
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-trophees.tsx
// Vérifie : lireLienPractice (topic seul, liste, all, inconnu ; n borné à
// 10..90 ; poids ; format ; go), repartir (poids officiels et parts égales,
// plus forts restes, matière épuisée dont le manque passe aux autres, clé
// inconnue), tirerSeance (taille, sans doublon, matières servies, mélange),
// le plafond par taille vu du constructeur ; nomPalier, nomTrophee,
// annonceTrophees (connus d'abord, remplacés par la base, 3 lignes puis
// « +n »), tableauSalle ; le rendu de SalleDesTrophees (résumé, détail par
// source, repli, vide, compact, profil d'un autre), de PracticeTrophies
// (adaptateur) et d'AnnonceTrophee (les trophées connus, sans attendre) ;
// sans migration_v3_profil.sql §2, la Salle compte comme l'ancien bloc.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TAILLE_MAX, TAILLE_MIN, lireLienPractice, matieresServies, melanger, repartir, tirerSeance } from "@/lib/practice-lien";
import { TOPICS } from "@/lib/practiceTopics";
import type { SupabaseClient } from "@supabase/supabase-js";
import { annonceTrophees, compter, lireTrophees, nomPalier, nomTrophee, palierCiblee, tableauSalle, type LigneTrophee, type TropheeGagne } from "@/lib/trophees";
import { SalleDesTrophees } from "@/components/trophees/SalleDesTrophees";
import { AnnonceTrophee } from "@/components/trophees/AnnonceTrophee";
import { PracticeTrophies } from "@/components/PracticeTrophies";

// tsx compile le JSX à l'ancienne (React.createElement) : React global pour les composants rendus
(globalThis as { React?: typeof React }).React = React;

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const egal = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
const lien = (q: string) => {
  const sp = new URLSearchParams(q);
  return lireLienPractice((k) => sp.get(k));
};
const somme = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);
const TOUTES = TOPICS.map((t) => t.key);

// ── lireLienPractice ──
check("lien : sans paramètre → rien de demandé", egal(lien(""), { matieres: null, taille: null, poids: false, format: null, go: false }));
check("lien : topic=fsa → une matière (comme avant)", egal(lien("topic=fsa").matieres, ["fsa"]));
check("lien : topic=all → les dix matières", egal(lien("topic=all").matieres, TOUTES));
check("lien : topic=equity,fsa,inconnue → les connues, dans l'ordre de TOPICS", egal(lien("topic=equity,%20fsa,inconnue").matieres, ["fsa", "equity"]));
check("lien : topic inconnu → aucune (la séance conseillée)", lien("topic=histoire").matieres === null && lien("topic=").matieres === null);
check("lien : n=30 → 30", lien("n=30").taille === 30);
check(`lien : n borné à ${TAILLE_MIN}..${TAILLE_MAX}`, lien("n=3").taille === TAILLE_MIN && lien("n=500").taille === TAILLE_MAX && lien("n=90").taille === 90);
check("lien : n illisible → taille du format", lien("n=abc").taille === null && lien("n=").taille === null && lien("n=-5").taille === null && lien("n=12.5").taille === null);
check("lien : poids=1, go=1, format=180", egal(lien("topic=all&n=30&poids=1&go=1&format=180"), { matieres: TOUTES, taille: 30, poids: true, format: 180, go: true }));
check("lien : format=90 lu, format inconnu ignoré, poids et go seulement à 1", lien("format=90").format === 90 && lien("format=120").format === null && !lien("poids=oui").poids && !lien("go=true").go);

// ── repartir ──
const poids30 = repartir(30, TOUTES, { poids: true });
check(
  "repartir : 30 questions aux poids officiels (plus forts restes)",
  egal(poids30, { ethics: 5, quant: 2, economics: 2, fsa: 4, corporate: 2, equity: 4, fixed_income: 4, derivatives: 2, alternatives: 2, portfolio: 3 }),
  JSON.stringify(poids30),
);
check("repartir : la somme fait n (10 à 90, aux poids)", [10, 15, 20, 30, 45, 60, 89, 90].every((n) => somme(repartir(n, TOUTES, { poids: true })) === n));
check("repartir : parts égales sans poids, à égalité l'ordre donné", egal(repartir(30, ["fsa", "quant", "ethics"]), { fsa: 10, quant: 10, ethics: 10 }) && egal(repartir(10, ["fsa", "quant", "ethics"]), { fsa: 4, quant: 3, ethics: 3 }));
const petite = repartir(10, TOUTES, { poids: true });
check("repartir : 10 questions aux poids → Derivatives (6,5 %) n'en reçoit aucune", petite.derivatives === 0 && matieresServies(petite).length === 9 && somme(petite) === 10);
check("repartir : une matière épuisée donne tout, le manque passe aux autres", egal(repartir(20, ["quant", "fsa"], { dispo: { quant: 4, fsa: 50 } }), { quant: 4, fsa: 16 }));
check(
  "repartir : manque reporté aux poids des autres",
  egal(repartir(30, ["ethics", "fsa", "derivatives"], { poids: true, dispo: { ethics: 2, fsa: 40, derivatives: 40 } }), { ethics: 2, fsa: 18, derivatives: 10 }),
  JSON.stringify(repartir(30, ["ethics", "fsa", "derivatives"], { poids: true, dispo: { ethics: 2, fsa: 40, derivatives: 40 } })),
);
check("repartir : toutes épuisées → la somme reste sous n", somme(repartir(30, ["quant", "fsa"], { dispo: { quant: 3, fsa: 5 } })) === 8);
check("repartir : clé inconnue, n nul ou doublon", egal(repartir(10, ["fsa", "histoire"]), { fsa: 10, histoire: 0 }) && somme(repartir(0, TOUTES)) === 0 && egal(repartir(10, ["fsa", "fsa"]), { fsa: 10 }));

// ── tirerSeance ──
const reserve = (m: string, k: number) => Array.from({ length: k }, (_, i) => `${m}-${i}`);
const pools = Object.fromEntries(TOUTES.map((m) => [m, reserve(m, m === "derivatives" ? 1 : 20)]));
let graine = 7;
const alea = () => ((graine = (graine * 16807) % 2147483647) - 1) / 2147483646;
const t30 = tirerSeance(pools, 30, TOUTES, { poids: true, alea });
check("tirerSeance : 30 questions mêlées, sans doublon", t30.questions.length === 30 && new Set(t30.questions).size === 30);
check("tirerSeance : Derivatives n'a qu'une question → elle la donne, le reste passe aux autres", t30.questions.filter((q) => q.startsWith("derivatives-")).length === 1 && t30.matieres.length === 10);
check("tirerSeance : les questions d'une matière sont les premières de sa réserve (déjà au hasard)", t30.questions.filter((q) => q.startsWith("ethics-")).every((q) => Number(q.split("-")[1]) < 6));
check("tirerSeance : mêlées (pas rangées par matière)", t30.questions.slice(0, 5).some((q) => !q.startsWith("ethics-")) && !egal(t30.questions, [...t30.questions].sort()));
const seule = tirerSeance({ quant: reserve("quant", 14) }, 15, ["quant"]);
check("tirerSeance : une matière de 14 questions, n=15 → 14", seule.questions.length === 14 && egal(seule.matieres, ["quant"]));
check("tirerSeance : matière sans question → non servie", egal(tirerSeance({ fsa: reserve("fsa", 20), quant: [] }, 10, ["fsa", "quant"]).matieres, ["fsa"]));
check("melanger : une permutation", egal([...melanger([1, 2, 3, 4, 5], alea)].sort(), [1, 2, 3, 4, 5]));

// ── le plafond par taille, vu du constructeur et de la fin de séance ──
check("plafond : l'épreuve du jour (10 matières, 30 questions) → or, jamais diamant", palierCiblee(matieresServies(repartir(30, TOUTES, { poids: true })).length, 30) === 3);
check("plafond : 10 matières en demi-examen (90) → diamant ; 7 matières sur 55 questions → or", palierCiblee(10, 90) === 4 && palierCiblee(7, 55) === 3);
check("plafond : une matière, 15 questions → bronze ; 3 matières, 25 questions → argent", palierCiblee(1, 15) === 1 && palierCiblee(3, 25) === 2);

// ── noms et annonce ──
check("nomPalier", egal([1, 2, 3, 4].map((p) => nomPalier(p as 1 | 2 | 3 | 4)), ["Bronze", "Argent", "Or", "Diamant"]));
check(
  "nomTrophee : « Trophée d'or · Les 30 du jour »",
  nomTrophee({ source: "trente", palier: 3 }) === "Trophée d'or · Les 30 du jour" &&
    nomTrophee({ source: "ciblee", palier: 4 }) === "Trophée de diamant · Entraînement ciblé" &&
    nomTrophee({ source: "cinq", palier: 1 }) === "Trophée de bronze · Les 5 du jour" &&
    nomTrophee({ source: "blanc", palier: 2 }) === "Trophée d'argent · Examen blanc",
);
const local: TropheeGagne = { source: "ciblee", palier: 3, ref: "FSA, Equity" };
const base: TropheeGagne[] = [
  { source: "cinq", palier: 1, ref: "Les 5 du jour du 14 oct." },
  { source: "ciblee", palier: 3, ref: "FSA, Equity, Ethics" },
];
check("annonce : rien → rien", egal(annonceTrophees([], []), { lignes: [], reste: 0 }));
check("annonce : sans la base, le trophée connu seul", egal(annonceTrophees([], [local]), { lignes: [local], reste: 0 }));
check("annonce : le connu d'abord, remplacé par celui de la base (son libellé), puis les autres", egal(annonceTrophees(base, [local]).lignes, [base[1], base[0]]));
check("annonce : un connu d'un autre palier reste à côté", annonceTrophees(base, [{ ...local, palier: 2 }]).lignes.length === 3);
const cinq: TropheeGagne[] = Array.from({ length: 5 }, (_, i) => ({ source: "drill", palier: 1, ref: `Page ${i + 1}` }));
check("annonce : 3 lignes au plus, puis « +n »", egal(annonceTrophees(cinq).reste, 2) && annonceTrophees(cinq).lignes.length === 3 && annonceTrophees(cinq, [], 0).reste === 5);
check("annonce : deux connus pareils face à un seul de la base → un seul remplacé", egal(annonceTrophees([base[1]], [local, local]).lignes, [base[1], local]));

// ── tableauSalle ──
const lignes: LigneTrophee[] = [
  { source: "ciblee", palier: 1, n: 3 },
  { source: "ciblee", palier: 4, n: 1 },
  { source: "cinq", palier: 1, n: 12 },
  { source: "trente", palier: 3, n: 2 },
];
const tab = tableauSalle(lignes);
check("tableauSalle : les 9 sources dans l'ordre", tab.length === 9 && tab[0].source === "ciblee" && tab[8].source === "revoir");
check("tableauSalle : nombres par palier et total", egal(tab[0].cases.map((c) => c.n), [3, 0, 0, 1]) && tab[0].total === 4 && tab[2].total === 2);
check("tableauSalle : un palier que la source ne donne pas → null, avec sa règle absente", egal(tab[3].cases.map((c) => c.n), [12, null, null, null]) && tab[3].cases[1].regle === null && tab[3].cases[0].regle === "5/5");
check("tableauSalle : un trophée à un palier hors règle reste compté", tableauSalle([{ source: "cinq", palier: 2, n: 1 }])[3].cases[1].n === 1);
check("tableauSalle : sources choisies", egal(tableauSalle(lignes, ["trente", "ciblee"]).map((l) => l.source), ["ciblee", "trente"]));

// ── rendus ──
const plein = renderToStaticMarkup(<SalleDesTrophees compte={compter(lignes)} complet />);
const tuiles = (html: string) => (html.match(/rounded-\[14px\]/g) ?? []).length;
const rangees = (html: string) => (html.match(/role="tooltip"/g) ?? []).length;
check("Salle : titre, total et quatre paliers", plein.includes("Salle des trophées") && plein.includes("18 trophées") && tuiles(plein) === 4);
const sansDiamant = renderToStaticMarkup(<SalleDesTrophees compte={compter(lignes.filter((l) => l.palier !== 4))} complet />);
check("Salle : le diamant gagné en case inversée, pas avant", plein.includes("bg-white text-black") && !sansDiamant.includes("bg-white text-black"));
check("Salle : le détail replié, une ligne par source (9), la règle en infobulle", plein.includes("<details") && plein.includes("Par source") && rangees(plein) === 9 && plein.includes("27/30 ou plus"));
check("Salle complète : pas de mot sur la mise à jour", !plein.includes("prochaine mise à jour"));
const repli = renderToStaticMarkup(<SalleDesTrophees compte={compter([{ source: "ciblee", palier: 2, n: 2 }])} complet={false} />);
check("Salle en repli : la phrase de la mise à jour, le détail réduit à l'entraînement ciblé", repli.includes("Les autres trophées arrivent avec la prochaine mise à jour.") && rangees(repli) === 1);
const vide = renderToStaticMarkup(<SalleDesTrophees compte={compter([])} complet />);
const videAutre = renderToStaticMarkup(<SalleDesTrophees compte={compter([])} complet moi={false} />);
check("Salle vide : l'invitation (les siens), une phrase neutre (un autre joueur)", vide.includes("le premier est à toi") && tuiles(vide) === 0 && videAutre.includes("Aucun trophée pour l&#x27;instant.") && !videAutre.includes("réussis"));
const compacte = renderToStaticMarkup(<SalleDesTrophees compte={compter(lignes)} complet compact />);
check("Salle compacte : une ligne de paliers, sans cases, le détail gardé", tuiles(compacte) === 0 && compacte.includes("Diamant") && compacte.includes("Par source"));
const adapte = renderToStaticMarkup(<PracticeTrophies rows={[{ topic_count: 1, trophy_count: 4 }, { topic_count: 3, trophy_count: 2 }, { topic_count: 7, trophy_count: 1 }]} />);
check("PracticeTrophies : l'adaptateur rend la Salle de l'entraînement ciblé seul", adapte.includes(">Trophées<") && adapte.includes("7 trophées") && rangees(adapte) === 1 && !adapte.includes("prochaine mise à jour"));
// sans migration_v3_profil.sql §2 : la Salle du profil et de Moi montre les mêmes nombres que l'ancien bloc
const anciennes = [{ topic_count: 1, trophy_count: 4 }, { topic_count: 3, trophy_count: 2 }, { topic_count: 7, trophy_count: 1 }];
const sansSection = { rpc: async (nom: string) => (nom === "get_user_trophees" ? { data: null, error: { code: "PGRST202", message: "Could not find the function" } } : { data: anciennes, error: null }) } as unknown as SupabaseClient;
const nombresTuiles = (html: string) => [...html.matchAll(/t-num block text-\[26px\] tabular-nums">(\d+)</g)].map((m) => Number(m[1]));
const avantSalle = renderToStaticMarkup(<PracticeTrophies rows={anciennes} />);

const annonce = renderToStaticMarkup(<AnnonceTrophee depuis="" connus={[local]} />);
check("AnnonceTrophee : les trophées connus s'affichent sans attendre la base", annonce.includes("Trophée d&#x27;or · Entraînement ciblé") && annonce.includes("FSA, Equity") && annonce.includes('role="status"'));
check("AnnonceTrophee : rien à annoncer → rien", renderToStaticMarkup(<AnnonceTrophee depuis="2026-10-17T00:00:00Z" />) === "");

void lireTrophees(sansSection, "u").then((lu) => {
  const salle = renderToStaticMarkup(<SalleDesTrophees compte={lu} complet={lu.complet} />);
  check(
    "sans la §2 : la Salle (profil, Moi) compte comme l'ancien bloc, et le dit",
    !lu.complet && egal(nombresTuiles(salle), nombresTuiles(avantSalle)) && egal(nombresTuiles(salle), [4, 2, 0, 1]) && salle.includes("prochaine mise à jour"),
    JSON.stringify(nombresTuiles(salle)),
  );
  console.log(ko === 0 ? "\nTout est vert." : `\n${ko} échec(s).`);
  process.exit(ko === 0 ? 0 : 1);
});
