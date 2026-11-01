// L'avancement des flashcards dans l'index du programme (lib/flashcards/
// avancement.ts, components/reviser/AvanceFlashcards.tsx, Pastilles.tsx,
// Briques.tsx, ListeReviser.tsx) : cartes déjà vues et statut d'une boucle,
// groupes de la page → suivi par matière (clés à lire, comptes manquants,
// matières vides écartées), fusion compte + appareil (boucle plus récente,
// boucle d'un autre compte, boucle recommencée, répétition espacée, boucle
// « toute la matière »), puis le rendu (react-dom/server, sans base, réseau
// ni navigateur) : une pastille par paquet, « 21/60 vues », aria-label, légende,
// et rien de changé sans donnée.
// Usage, depuis le dépôt : npx tsx --tsconfig tsconfig.json scripts/flashcards/test-avancement.tsx
import "../codex/sans-css";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { demarrer, marquer, tourSuivant, type EtatBoucle } from "@/lib/flashcards/boucle";
import { cleMatiere, cleSet } from "@/lib/flashcards/progression";
import { cleValide } from "@/lib/flashcards/progression-serveur";
import {
  CARTES_PAR_PAQUET,
  avanceBoucle,
  avanceLigne,
  avanceMatiere,
  clesAvances,
  compterStatuts,
  suiviProgramme,
  type GroupeCartes,
  type LectureAppareil,
} from "@/lib/flashcards/avancement";
import { AvanceFlashcards } from "@/components/reviser/AvanceFlashcards";
import { LegendeAvance } from "@/components/reviser/Pastilles";
import { IndexProgramme, shelfRows } from "@/components/reviser/Briques";
import { ListeReviser } from "@/components/reviser/ListeReviser";
import { SUBJECTS, type SubjectAvailability } from "@/components/reviser/catalog";

(globalThis as { React?: typeof React }).React = React;

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (!cond && extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const compte = (html: string, re: RegExp) => (html.match(re) ?? []).length;

const T0 = 1_760_000_000_000;
const JOUEUR = "joueur-a";
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const cartes = (prefixe: string, n = 15) => Array.from({ length: n }, (_, k) => `${prefixe}-${k}`);
const avec = (e: EtatBoucle, maj: number, plus: Partial<EtatBoucle> = {}): EtatBoucle => ({ ...e, maj, ...plus });

/** Une boucle de n cartes où les `k` premières sont marquées (true) : tour 1 en cours si k < n. */
function marquees(prefixe: string, n: number, k: number, su = true): EtatBoucle {
  let e = demarrer(cartes(prefixe, n), { maintenant: T0 });
  for (let i = 0; i < k; i++) e = marquer(e, su, T0 + i + 1);
  return e;
}
/** Une boucle bouclée : tout maîtrisé. */
const finie = (prefixe: string, n = 15) => marquees(prefixe, n, n);
/** Tour 2 : les 5 premières cartes à revoir. */
function tour2(prefixe: string, n = 15): EtatBoucle {
  let e = demarrer(cartes(prefixe, n), { maintenant: T0 });
  for (let i = 0; i < n; i++) e = marquer(e, i >= 5, T0 + i + 1);
  return tourSuivant(e, { maintenant: T0 + 99 });
}

// ---------------------------------------------------------------------------
console.log("# Une boucle : statut et cartes vues");
{
  check("jamais commencée : neuf, 0 vue", JSON.stringify(avanceBoucle(null)) === '{"statut":"neuf","vues":0}' && avanceBoucle(undefined).vues === 0);
  check("recommencée sans geste : neuf", avanceBoucle(demarrer(cartes("a"))).statut === "neuf");
  const t1 = avanceBoucle(marquees("a", 15, 6), 15);
  check("tour 1, 6 cartes marquées : en cours, 6 vues", t1.statut === "cours" && t1.vues === 6, JSON.stringify(t1));
  const t1b = avanceBoucle(marquees("a", 15, 6, false), 15);
  check("« À revoir » compte aussi comme vue", t1b.statut === "cours" && t1b.vues === 6);
  const t2 = avanceBoucle(tour2("a"), 15);
  check("tour 2 : en cours, les 15 cartes ont été vues", t2.statut === "cours" && t2.vues === 15, JSON.stringify(t2));
  const f = avanceBoucle(finie("a"), 15);
  check("bouclée : maîtrisé, 15 vues", f.statut === "maitrise" && f.vues === 15, JSON.stringify(f));
  const plus = avanceBoucle(finie("a"), 17);
  check("bouclée puis 2 cartes ajoutées : en cours (plus « Maîtrisé »), 15 vues", plus.statut === "cours" && plus.vues === 15, JSON.stringify(plus));
  check("jamais plus de vues que de cartes aujourd'hui (cartes retirées)", avanceBoucle(finie("a"), 12).vues === 12);
  check("sans total connu : les cartes marquées", avanceBoucle(marquees("a", 15, 4)).vues === 4);

  const ligne = avanceLigne({ etat: avec(finie("a"), T0 + 40), maj: 0 }, 15);
  check("depuis une ligne en base", ligne.statut === "maitrise" && ligne.vues === 15);
  check("état illisible ou ligne absente : neuf", avanceLigne({ etat: "x", maj: 0 }).statut === "neuf" && avanceLigne(null).statut === "neuf" && avanceLigne(undefined, 15).vues === 0);
  const n = compterStatuts(["maitrise", "cours", "cours", "neuf"]);
  check("compte des statuts", n.maitrise === 1 && n.cours === 2 && n.neuf === 1);
}

// ---------------------------------------------------------------------------
console.log("\n# Les groupes de la page → le suivi par matière");
const groupes: GroupeCartes[] = [
  { key: "ethics", name: "Ethics", rows: [1, 2, 3, 4].map((n) => ({ id: uuid(n), kind: "set", count: 15 })).concat([{ id: uuid(9), kind: "drill", count: 30 }]) },
  { key: "quant", name: "Quantitative Methods", rows: [] },
  { key: "fsa", name: "Financial Statement Analysis", rows: [{ id: uuid(21), kind: "set", count: 14 }, { id: uuid(22), kind: "set", count: null }] },
  { key: "x-autres", name: "Autres", rows: [{ id: uuid(31), kind: "set", count: 15 }] },
];
{
  const cles = clesAvances(groupes);
  check("clés à lire : 4 paquets + la matière, 2 paquets + la matière ; ni drill, ni matière vide, ni groupe annexe", cles.length === 8 && cles.includes(cleSet(uuid(1))) && cles.includes(cleMatiere("ethics")) && cles.includes(cleMatiere("fsa")) && !cles.includes(cleSet(uuid(9))) && !cles.includes(cleMatiere("quant")) && !cles.includes(cleSet(uuid(31))), cles.join(" "));
  check("toutes les clés sont permises par la table", cles.every((c) => cleValide(c)));

  const lignes = new Map([
    [cleSet(uuid(1)), { etat: avec(finie("e1"), T0 + 50), maj: 0 }],
    [cleSet(uuid(2)), { etat: avec(marquees("e2", 15, 6), T0 + 60), maj: 0 }],
    [cleSet(uuid(21)), { etat: avec(marquees("f1", 14, 3), T0 + 70), maj: 0 }],
  ]);
  const s = suiviProgramme(groupes, lignes, JOUEUR);
  check("matières retenues : ethics et fsa seulement", Object.keys(s.matieres).sort().join() === "ethics,fsa" && s.joueur === JOUEUR);
  const e = s.matieres.ethics;
  check("ethics : 4 paquets, 60 cartes, nommée", e.paquets.length === 4 && e.total === 60 && e.nom === "Ethics" && e.cle === "ethics");
  check("ethics : paquet 1 maîtrisé, 2 en cours (6 vues), 3 et 4 neufs", e.paquets[0].avance.statut === "maitrise" && e.paquets[1].avance.vues === 6 && e.paquets[2].avance.statut === "neuf" && e.paquets[3].avance.statut === "neuf");
  check("ethics : clé locale = id du paquet, version du compte lue", e.paquets[0].local === uuid(1) && e.paquets[0].maj === T0 + 50 && e.paquets[2].maj === null);
  check("ethics : pas de boucle de matière → neuve, clé locale « matiere:ethics »", e.matiere.local === "matiere:ethics" && e.matiere.avance.statut === "neuf" && e.matiere.total === 60);
  const f = s.matieres.fsa;
  check(`fsa : un compte de cartes manquant vaut ${CARTES_PAR_PAQUET}`, f.paquets[0].total === 14 && f.paquets[1].total === CARTES_PAR_PAQUET && f.total === 14 + CARTES_PAR_PAQUET);
  check("sans aucun groupe : rien", Object.keys(suiviProgramme([], new Map(), JOUEUR).matieres).length === 0);
  check("un paquet à 0 carte partout : matière écartée", Object.keys(suiviProgramme([{ key: "ethics", name: "Ethics", rows: [{ id: uuid(1), kind: "set", count: 0 }] }], new Map(), JOUEUR).matieres).length === 0);
}

// ---------------------------------------------------------------------------
console.log("\n# Le compte et l'appareil");
{
  const lignes = new Map([
    [cleSet(uuid(1)), { etat: avec(finie("e1"), T0 + 50), maj: 0 }],
    [cleSet(uuid(2)), { etat: avec(marquees("e2", 15, 6), T0 + 60), maj: 0 }],
  ]);
  const s = suiviProgramme(groupes, lignes, JOUEUR).matieres.ethics;
  const sans = avanceMatiere(s, JOUEUR);
  check("compte seul : 21 vues sur 60, pastilles pleine / moitié / vide / vide", sans.vues === 21 && sans.total === 60 && sans.paquets.join() === "maitrise,cours,neuf,neuf", JSON.stringify(sans));

  const rien: LectureAppareil = { boucle: () => null, srs: () => 0 };
  check("appareil vide : comme le compte", JSON.stringify(avanceMatiere(s, JOUEUR, rien)) === JSON.stringify(sans));

  const lecture = (boucles: Record<string, EtatBoucle>, srs: Record<string, number> = {}): LectureAppareil => ({ boucle: (l) => boucles[l] ?? null, srs: (id) => srs[id] ?? 0 });
  const mien = (e: EtatBoucle): EtatBoucle => ({ ...e, u: JOUEUR });

  const p3 = avanceMatiere(s, JOUEUR, lecture({ [uuid(3)]: mien(avec(marquees("e3", 15, 4), T0 + 80)) }));
  check("paquet commencé sur cet appareil, pas encore sur le compte : en cours, 25 vues", p3.paquets[2] === "cours" && p3.vues === 25, JSON.stringify(p3));

  const plusRecent = avanceMatiere(s, JOUEUR, lecture({ [uuid(2)]: { ...mien(avec(marquees("e2", 15, 10), T0 + 90)), base: T0 + 60 } }));
  check("boucle de l'appareil plus récente que le compte : ses 10 vues", plusRecent.vues === 25 && plusRecent.paquets[1] === "cours", JSON.stringify(plusRecent));

  const plusVieux = avanceMatiere(s, JOUEUR, lecture({ [uuid(2)]: mien(avec(marquees("e2", 15, 2), T0 + 10)) }));
  check("boucle de l'appareil plus ancienne : le compte l'emporte", plusVieux.vues === 21);

  const ailleurs = avanceMatiere(s, JOUEUR, lecture({ [uuid(2)]: { ...mien(avec(marquees("e2", 15, 2), T0 + 70)), base: T0 + 10 } }));
  check("le compte a changé ailleurs depuis la base de l'appareil : le compte l'emporte", ailleurs.vues === 21);

  const autre = avanceMatiere(s, JOUEUR, lecture({ [uuid(3)]: { ...avec(marquees("e3", 15, 4), T0 + 80), u: "joueur-b" } }));
  check("boucle d'un autre compte du même navigateur : ignorée", autre.vues === 21 && autre.paquets[2] === "neuf");

  const recommencee = avanceMatiere(s, JOUEUR, lecture({ [uuid(1)]: mien(avec(demarrer(cartes("e1")), T0 + 200)) }));
  check("paquet recommencé sur l'appareil : repart à neuf, ses 15 vues s'en vont", recommencee.paquets[0] === "neuf" && recommencee.vues === 6, JSON.stringify(recommencee));

  const rep = avanceMatiere(s, JOUEUR, lecture({}, { [uuid(4)]: 8 }));
  check("répétition espacée seule (paquet jamais bouclé) : 8 vues, en cours", rep.paquets[3] === "cours" && rep.vues === 29, JSON.stringify(rep));
  const repGrand = avanceMatiere(s, JOUEUR, lecture({}, { [uuid(2)]: 10, [uuid(3)]: 99 }));
  check("répétition espacée plus fournie que la boucle : la plus grande, jamais au-delà du paquet", repGrand.vues === 15 + 10 + 15 && repGrand.paquets[1] === "cours" && repGrand.paquets[2] === "cours", JSON.stringify(repGrand));

  // la boucle « toute la matière »
  const avecMatiere = (e: EtatBoucle, maj: number) => {
    const m = new Map(lignes);
    m.set(cleMatiere("ethics"), { etat: avec(e, maj), maj: 0 });
    return m;
  };
  const toute = suiviProgramme(groupes, avecMatiere(finie("m", 60), T0 + 300), JOUEUR).matieres.ethics;
  const m1 = avanceMatiere(toute, JOUEUR);
  check("boucle de matière bouclée sur 60 cartes : 60 vues, les 4 paquets maîtrisés", m1.vues === 60 && m1.paquets.join() === "maitrise,maitrise,maitrise,maitrise", JSON.stringify(m1));
  const entamee = suiviProgramme(groupes, avecMatiere(marquees("m", 60, 40), T0 + 300), JOUEUR).matieres.ethics;
  const m2 = avanceMatiere(entamee, JOUEUR);
  check("boucle de matière entamée (40 cartes) : 40 vues (plus que la somme des paquets), pastilles des paquets inchangées", m2.vues === 40 && m2.paquets.join() === "maitrise,cours,neuf,neuf", JSON.stringify(m2));
  const ancienne = suiviProgramme(groupes, avecMatiere(finie("m", 52), T0 + 300), JOUEUR).matieres.ethics;
  const m3 = avanceMatiere(ancienne, JOUEUR);
  check("boucle de matière bouclée avant l'ajout de 8 cartes : 52 vues, pas « maîtrisé »", m3.vues === 52 && m3.paquets.join() === "maitrise,cours,neuf,neuf", JSON.stringify(m3));
  const surAppareil = avanceMatiere(s, JOUEUR, lecture({ "matiere:ethics": mien(avec(finie("m", 60), T0 + 400)) }));
  check("boucle de matière bouclée sur l'appareil seulement : tout est maîtrisé", surAppareil.vues === 60 && surAppareil.paquets.every((x) => x === "maitrise"));
}

// ---------------------------------------------------------------------------
console.log("\n# Rendu");
const lignesRendu = new Map([
  [cleSet(uuid(1)), { etat: avec(finie("e1"), T0 + 50), maj: 0 }],
  [cleSet(uuid(2)), { etat: avec(marquees("e2", 15, 6), T0 + 60), maj: 0 }],
]);
const avances = suiviProgramme(groupes, lignesRendu, JOUEUR);
const subjects: SubjectAvailability[] = SUBJECTS.map((s) => ({
  key: s.key,
  name: s.name,
  pct: s.key === "ethics" ? 62 : null,
  fiche: s.fiche,
  course: s.course,
  flashcards: s.key === "derivatives" ? null : `/flashcards?subject=${s.key}#paquets`,
  flashcardSets: s.key === "derivatives" ? 0 : 4,
}));
{
  const html = renderToStaticMarkup(<AvanceFlashcards suivi={avances.matieres.ethics} joueur={JOUEUR} />);
  check("la ligne : 4 pastilles, « 21/60 vues »", compte(html, /rounded-full/g) === 4 && html.includes(">21/60 vues<"), html.slice(0, 200));
  const iPleine = html.indexOf("background:currentColor");
  const iMoitie = html.indexOf("linear-gradient(90deg, currentColor 50%");
  check("pleine, à moitié, vide, vide (dans cet ordre)", iPleine >= 0 && iMoitie > iPleine && compte(html, /background:currentColor/g) === 1 && compte(html, /linear-gradient/g) === 1 && compte(html, /background:transparent/g) === 2, html);
  check("une seule image pour le lecteur d'écran, avec son aria-label", /role="img" aria-label="Ethics : 21 cartes vues sur 60\. Paquets : 1 maîtrisé, 1 en cours, 2 pas commencés\."/.test(html), html.slice(0, 260));
  check("même phrase en infobulle", html.includes('title="Ethics : 21 cartes vues sur 60.'));
  check("aucune encre : ni barre d'encre ni fond d'encre", !/ink-bar|bg-\[var\(--ink\)\]|BandeEncre/.test(html));

  const une = renderToStaticMarkup(<AvanceFlashcards suivi={{ ...avances.matieres.ethics, total: 60, paquets: avances.matieres.ethics.paquets.slice(0, 1), matiere: avances.matieres.ethics.matiere }} joueur={JOUEUR} />);
  check("un seul paquet : une pastille, « 15/60 vues » et l'accord au singulier", compte(une, /rounded-full/g) === 1 && une.includes("1 maîtrisé, 0 en cours, 0 pas commencé."), une.slice(0, 300));

  const legende = renderToStaticMarkup(<LegendeAvance />);
  check("légende : trois pastilles et leurs mots", compte(legende, /rounded-full/g) === 3 && ["Une pastille par paquet", "maîtrisé", "en cours", "pas commencé"].every((m) => legende.includes(m)));

  const rows = shelfRows("cartes", subjects);
  const sans = renderToStaticMarkup(<IndexProgramme rows={rows} />);
  check("sans donnée, l'index est comme avant : « 4 paquets · 60 cartes », aucune pastille", sans.includes("4 paquets · 60 cartes") && !sans.includes("rounded-full") && !sans.includes("vues"));
  const avec2 = renderToStaticMarkup(<IndexProgramme rows={rows} avances={avances} />);
  check("avec données : ethics et fsa ont leur avancement, 4 + 2 pastilles", compte(avec2, /role="img"/g) === 2 && compte(avec2, /rounded-full/g) === 6 && avec2.includes(">21/60 vues<") && avec2.includes(">0/29 vues<"), `${compte(avec2, /role="img"/g)} ${compte(avec2, /rounded-full/g)}`);
  check("les matières sans suivi gardent leur ligne d'avant, la matière à venir aussi", avec2.includes("4 paquets · 60 cartes") && avec2.includes(">à venir<"));
  check("la maîtrise (barre, %) reste en place", avec2.includes("62 %") && avec2.includes('role="progressbar"'));

  const page = (kind: "cartes" | "fiche", a?: typeof avances) => renderToStaticMarkup(<ListeReviser kind={kind} subjects={subjects} bande={<div />} avances={a} />);
  const cartesAvec = page("cartes", avances);
  check("la page : légende au-dessus de l'index, avancement dans les lignes", cartesAvec.includes("Une pastille par paquet") && cartesAvec.includes(">21/60 vues<"));
  const cartesSans = page("cartes");
  check("la page sans donnée : ni légende ni pastille", !cartesSans.includes("Une pastille par paquet") && !cartesSans.includes("rounded-full") && cartesSans.includes("4 paquets · 60 cartes"));
  const vide = page("cartes", { joueur: JOUEUR, matieres: {} });
  check("aucune matière suivie : comme sans donnée", !vide.includes("Une pastille par paquet") && vide.includes("4 paquets · 60 cartes"));
  const fiches = page("fiche", avances);
  check("les fiches et les cours ne montrent jamais d'avancement de cartes", !fiches.includes("Une pastille par paquet") && !fiches.includes("vues"));
}

// ---------------------------------------------------------------------------
console.log("\n# Fichiers");
{
  const lire = (f: string) => readFileSync(join(process.cwd(), f), "utf8");
  const neufs = ["lib/flashcards/avancement.ts", "components/reviser/AvanceFlashcards.tsx", "components/reviser/Pastilles.tsx"];
  check("pas d'Intl ni de toLocale dans l'îlot client, la lib et les pastilles", neufs.every((f) => !/Intl\.|toLocale/.test(lire(f))));
  check("aucun chemin du bac à sable ni antislash dans les fichiers neufs", neufs.every((f) => !/Temp[\\/]|scratchpad|AppData|[A-Za-z]:\\/.test(lire(f))));
  check("l'îlot client est bien « use client » ; la lib et les pastilles sont neutres", lire(neufs[1]).startsWith('"use client"') && !lire(neufs[0]).includes("use client") && !lire(neufs[2]).includes("use client"));
  const page = lire("app/flashcards/page.tsx");
  check("la page lit les boucles en une requête et passe l'avancement à la liste", (page.match(/lireProgressions\(/g) ?? []).length === 1 && page.includes("avances={avances}") && page.includes("clesAvances(groups)") && page.includes("progressions ? suiviProgramme(groups, progressions, user.id) : undefined"));
}

console.log(ko === 0 ? "\nTout est vert." : `\n${ko} échec(s).`);
process.exit(ko === 0 ? 0 : 1);
