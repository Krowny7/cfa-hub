// Test des cartes « parcours » de l'accueil « Le lobby » (lot 5), sans base, réseau
// ni navigateur (react-dom/server) :
//   npx tsx --tsconfig tsconfig.json scripts/accueil/test-lobby-parcours.tsx
// Les records (égalités, absents, repli sur la maîtrise du jour), l'avancement d'une
// condition de pièce (chaque type) et le choix du prochain déblocage, la quête (mode
// sobre, repli sur la semaine), la Grande Salle (absente sans examen), les amis (sans
// présence, sans ami), le carnet (364 cases, mois, seuil, aujourd'hui), les affiches
// sans lien, et les règles de DA du lot : aucun liquide, aucun Intl, aucun chemin de
// travail. Les noms de classes des modules CSS sont rendus tels quels.
import "../codex/sans-css";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { Affiche } from "@/components/accueil/lobby/Affiche";
import { BandeGrandeSalle } from "@/components/accueil/lobby/BandeGrandeSalle";
import { CarnetJours } from "@/components/accueil/lobby/CarnetJours";
import { CarteDeblocage } from "@/components/accueil/lobby/CarteDeblocage";
import { CarteQuete } from "@/components/accueil/lobby/CarteQuete";
import { CarteScores } from "@/components/accueil/lobby/CarteScores";
import { DuNouveau } from "@/components/accueil/lobby/DuNouveau";
import { TesAmis } from "@/components/accueil/lobby/TesAmis";
import {
  AFFICHES,
  SEMAINES_ANCIENNES,
  actionNouveau,
  amisLobby,
  avancementDe,
  carnetDe,
  carnetVue,
  choisirDeblocage,
  grandeSalleDe,
  jourDeSemaine,
  legendeCarnet,
  meilleurResultatBlanc,
  moisCarnet,
  phraseNouveau,
  queteLobby,
  quandNouveau,
  recordCopie,
  recordExamen,
  recordMaitrise,
  recordRang,
  scoresDe,
  texteDe,
  type PieceEnCours,
} from "@/components/accueil/lobby/modele-parcours";
import type { AmisLobby, CarnetLobby, DeblocageLobby, QueteLobby, ScoresLobby } from "@/components/accueil/lobby/types";
import { matieresA, mesuresDuJour, preparationA, type Mesure, type PointHistorique } from "@/components/moi/synthese/modele";
import { ILLUSTRATIONS } from "@/lib/illustrations";
import type { Acquis, Condition } from "@/lib/profil/acquis";
import type { Nouveaute } from "@/lib/profil/nouveau";
import { PIECES } from "@/lib/profil/pieces";
import { defSceau, type EtatSceau } from "@/lib/profil/sceaux";
import { compter } from "@/lib/trophees";

// le JSX des composants (tsconfig « preserve ») attend React en portée
(globalThis as { React?: typeof React }).React = React;

let ko = 0;
const titre = (t: string) => {
  console.log("");
  console.log(t);
};
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const compte = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const NB = String.fromCharCode(160);
const routeur = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
const rendre = (n: React.ReactNode): string =>
  renderToStaticMarkup(<AppRouterContext.Provider value={routeur}>{n}</AppRouterContext.Provider>)
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
const texte = (html: string) => html.replace(/<[^>]*>/g, "");
const segs = (s: readonly (string | { b: string } | { marque: string } | { neg: string })[]) => texteDe(s);

const AUJ = "2025-11-01";

// ═══ Tes meilleurs scores ═══════════════════════════════════════════════════
titre("# les records");
{
  const r1 = recordCopie([{ day: "2025-10-12", score: 28, total: 30 }, { day: "2025-10-20", score: 25, total: 30 }, { day: "2025-09-30", score: 27, total: 30 }], AUJ);
  check("meilleure copie : 28/30, le 12 oct.", r1?.val === "28" && r1.unite === "/30" && segs(r1.detail) === "le 12 oct.", JSON.stringify(r1));
  const eg = recordCopie([{ day: "2025-10-12", score: 28, total: 30 }, { day: "2025-10-25", score: 28, total: 30 }], AUJ);
  check("égalité de copie : la plus récente", segs(eg!.detail) === "le 25 oct.");
  check("une copie d'aujourd'hui se dit « aujourd'hui »", segs(recordCopie([{ day: AUJ, score: 20, total: 30 }], AUJ)!.detail) === "aujourd'hui");
  check("une copie de l'an passé porte son année", segs(recordCopie([{ day: "2024-03-02", score: 20, total: 30 }], AUJ)!.detail) === "le 2 mars 2024");
  check("aucune copie, ou un score absent : null", recordCopie([], AUJ) === null && recordCopie([{ day: "2025-10-12", score: null, total: null }], AUJ) === null);
  check("un total absent vaut 30", recordCopie([{ day: "2025-10-12", score: 12, total: null }], AUJ)?.unite === "/30");
}
{
  const dix = (pct: number, n = 60): Record<string, Mesure> => Object.fromEntries(["ethics", "quant", "economics", "fsa", "corporate", "equity", "fixed_income", "derivatives", "alternatives", "portfolio"].map((c) => [c, { pct, n }]));
  const jour = (j: string, pct: number): PointHistorique => ({ jour: j, matieres: dix(pct) });
  const m = (mesures: Record<string, Mesure>) => ({ matieres: matieresA(mesures), preparation: preparationA(mesures), couverture: 100, source: "unique" as const });
  check("la préparation de dix matières à 64 % vaut 64", preparationA(dix(64)) === 64);
  const histo = [jour("2025-10-02", 50), jour("2025-10-28", 64), jour("2025-10-21", 58)];
  const r = recordMaitrise(histo, m(dix(60)), AUJ);
  check("meilleure maîtrise : 64 %, le 28 oct.", r?.val === "64" && r.unite === `${NB}%` && segs(r.detail).startsWith("le 28 oct."), JSON.stringify(r));
  const mixte: Record<string, Mesure> = { ...dix(60), portfolio: { pct: 79, n: 60 } };
  const r2 = recordMaitrise([jour("2025-10-21", 50)], m(mixte), AUJ);
  check("aujourd'hui compte : la meilleure matière du jour (Portefeuille à 79 %)", r2 !== null && segs(r2.detail) === `aujourd'hui · meilleure matière : Portefeuille à 79${NB}%`, r2 ? segs(r2.detail) : "null");
  check("égalité de maîtrise : la plus récente", recordMaitrise([jour("2025-10-21", 64), jour("2025-10-28", 64)], null, AUJ) !== null && segs(recordMaitrise([jour("2025-10-21", 64), jour("2025-10-28", 64)], null, AUJ)!.detail).startsWith("le 28 oct."));
  check("repli sans historique : la maîtrise du jour seule", recordMaitrise(null, m(dix(61)), AUJ)?.val === "61");
  check("rien de mesuré : null", recordMaitrise([{ jour: "2025-10-02", matieres: {} }], m({}), AUJ) === null && recordMaitrise(null, null, AUJ) === null);
  check("mesuresDuJour reste l'entrée du repli (même forme)", Object.keys(mesuresDuJour(m(dix(60)))).length === 10);
}
{
  const b = meilleurResultatBlanc([
    { examId: "a", score: 100, total: 180, jour: "2025-09-15" },
    { examId: "b", score: 128, total: 180, jour: "2025-10-19" },
    { examId: "c", score: 128, total: 180, jour: "2025-10-30" },
    { examId: "d", score: null, total: 180, jour: "2025-10-31" },
    { examId: "e", score: 5, total: 0, jour: "2025-10-31" },
  ]);
  check("meilleur examen blanc : 71 %, à égalité le plus récent", b?.pct === 71 && b.examId === "c" && b.jour === "2025-10-30", JSON.stringify(b));
  check("aucun examen : null", meilleurResultatBlanc([]) === null);
  const r = recordExamen({ pct: 71, jour: "2025-10-19" }, "Examen blanc n° 3", AUJ);
  check("le record : 71 %, « Examen blanc n° 3, le 19 oct. »", r?.val === "71" && r.unite === `${NB}%` && segs(r.detail) === "Examen blanc n° 3, le 19 oct.");
  check("sans titre : la date seule ; sans date : le titre seul", segs(recordExamen({ pct: 71, jour: "2025-10-19" }, null, AUJ)!.detail) === "le 19 oct." && segs(recordExamen({ pct: 71, jour: null }, "Blanc", AUJ)!.detail) === "Blanc" && recordExamen(null, "x", AUJ) === null);
}
{
  const r = recordRang({ elo: 1512, jour: "2025-10-21" }, null, AUJ);
  check("meilleur rang : Platine I, 1 512 ELO, le 21 oct.", r?.val === "Platine I" && r.unite === null && segs(r.detail) === `1${NB}512${NB}ELO · le 21 oct.`, JSON.stringify(r));
  check("1 000 ELO : Bronze III, sans date", recordRang({ elo: 1000, jour: null }, null, AUJ)?.val === "Bronze III");
  check("matchs illisibles : le palier atteint seul", recordRang(null, 3, AUJ)?.val === "Platine" && recordRang(null, 3, AUJ)!.detail.length === 0);
  check("aucun match : null", recordRang(null, null, AUJ) === null);
}
{
  const vide = { copie: null, maitrise: null, examen: null, rang: null };
  check("les quatre absents : la carte n'est pas posée", scoresDe(vide) === null);
  check("un seul record suffit à poser la carte", scoresDe({ ...vide, rang: { val: "Or II", unite: null, detail: [] } })?.rang?.val === "Or II");
}

titre("# la carte « Tes meilleurs scores »");
const SCORES: ScoresLobby = {
  copie: { val: "28", unite: "/30", detail: ["le 12 oct."] },
  maitrise: { val: "64", unite: `${NB}%`, detail: ["le 28 oct. · meilleure matière : Portefeuille à ", { b: `79${NB}%` }] },
  examen: { val: "71", unite: `${NB}%`, detail: ["Examen blanc n° 3, le 19 oct."] },
  rang: { val: "Platine I", unite: null, detail: [`1${NB}512${NB}ELO`] },
};
{
  const h = rendre(<CarteScores scores={SCORES} className="place" />);
  check("quatre blocs, dans l'ordre copie, maîtrise, examen, rang", compte(h, /data-record="/g) === 4 && h.indexOf('data-record="copie"') < h.indexOf('data-record="maitrise"') && h.indexOf('data-record="examen"') < h.indexOf('data-record="rang"'));
  check("les valeurs de la maquette : 28/30, 64 %, 71 %, Platine I", /rv"?[^>]*>28<small>\/30/.test(h) || (h.includes(">28<small>/30</small>") && h.includes(`>64<small>${NB}%</small>`) && h.includes(`>71<small>${NB}%</small>`) && h.includes("Platine I")));
  check("la meilleure matière en gras : Portefeuille à 79 %", h.includes(`Portefeuille à <b>79${NB}%</b>`));
  check("le rang écrit en lettres (plus petit) ; ses chiffres en chasse fixe", h.includes("rv rvTexte") && /class="rd mono"/.test(h));
  check("le lien vers Moi ; le placement donné par la page est gardé", h.includes('href="/moi"') && h.includes("Tout ton parcours dans Moi →") && h.includes('class="carte petite place"'));
  check("titre : sceau, « Tes records », « Tes meilleurs scores », aria-labelledby", h.includes("Tes records") && h.includes("Tes meilleurs scores") && h.includes('aria-labelledby="lobby-scores-titre"') && h.includes('id="lobby-scores-titre"'));
  const un: ScoresLobby = { copie: null, maitrise: null, examen: SCORES.examen, rang: null };
  const hu = rendre(<CarteScores scores={un} />);
  check("un record absent garde sa place en « — » et dit pourquoi", compte(hu, /data-record="/g) === 4 && compte(hu, />—</g) === 3 && hu.includes("pas encore de copie rendue") && hu.includes("pas encore mesurée") && hu.includes("pas encore classé"));
  check("aucun bouton ni liquide dans la carte", !h.includes("<button") && !h.includes("rl-encre") && !h.includes("data-palette"));
}

// ═══ Prochain déblocage ═════════════════════════════════════════════════════
titre("# l'avancement d'une condition de pièce");
const acquis = (o: Partial<Acquis> = {}): Acquis => ({ questions: 0, pic: 0, sceaux: [], datesPic: [], codex: new Map(), trophees: null, fil: {}, programmesMenes: [], ...o });
const sceau = (cle: string, palier: 0 | 1 | 2 | 3, valeur: number, inconnu = false): EtatSceau => ({ def: defSceau(cle)!, palier, valeur, questions: null, prochain: null, avance: 0, ...(inconnu ? { inconnu: true as const } : {}) });
{
  const a = acquis({ questions: 4200, sceaux: [sceau("duelliste", 1, 20), sceau("assiduite", 1, 9), sceau("copie-pleine", 3, 12000), sceau("defi-tenu", 0, 1, true)] });
  const av = (c: Condition) => avancementDe(c, a);
  check("questions : 4 200 sur 5 000", JSON.stringify(av({ k: "questions", n: 5000 })) === JSON.stringify({ fait: 4200, total: 5000, unite: "questions" }));
  check("questions : plafonné au total", av({ k: "questions", n: 1000 })?.fait === 1000);
  check("sceaux gagnés : 3 sur 5 (le défi tenu, pas gagné, ne compte pas)", JSON.stringify(av({ k: "sceaux", n: 5 })) === JSON.stringify({ fait: 3, total: 5, unite: "sceaux" }));
  check("dorures : 1 sur 3", JSON.stringify(av({ k: "dorures", n: 3 })) === JSON.stringify({ fait: 1, total: 3, unite: "dorures" }));
  check("un sceau au palier 2 : 20 victoires sur 25", JSON.stringify(av({ k: "sceau", cle: "duelliste", palier: 2 })) === JSON.stringify({ fait: 20, total: 25, unite: "victoires" }));
  check("un sceau au palier 1 : assiduité 9 sur 7, plafonné", av({ k: "sceau", cle: "assiduite", palier: 1 })?.fait === 7);
  check("un sceau à mesure inconnue, ou absent : null", av({ k: "sceau", cle: "defi-tenu", palier: 1 }) === null && av({ k: "sceau", cle: "inexistant", palier: 1 }) === null);
  check("le pic de palier, une quête du Codex, un fil rouge, un programme : binaires, null", av({ k: "pic", palier: 4 }) === null && av({ k: "codex", quete: "x" }) === null && av({ k: "fil", chapitre: "c", palier: 1 }) === null && av({ k: "programme", programme: "p" }) === null);
  check("pas de condition : null", avancementDe(null, a) === null);
  check("« l'un de » : la plus avancée des conditions qui se mesurent", av({ k: "unDe", conditions: [{ k: "codex", quete: "x" }, { k: "questions", n: 10000 }, { k: "questions", n: 5000 }] })?.total === 5000);
  check("« l'un de » sans condition mesurable : null", av({ k: "unDe", conditions: [{ k: "codex", quete: "x" }] }) === null);
  const troph = compter([
    { source: "duel", palier: 3, n: 2 },
    { source: "blanc", palier: 3, n: 1 },
    { source: "fiche", palier: 1, n: 9 },
  ]);
  const at = acquis({ trophees: troph });
  check("trophées d'or : 3 sur 5", JSON.stringify(avancementDe({ k: "trophees", palier: 3, n: 5 }, at)) === JSON.stringify({ fait: 3, total: 5, unite: "trophees" }));
  check("trophées sur plusieurs sources : le facteur le plus bas (2 sources sur 4)", JSON.stringify(avancementDe({ k: "trophees", palier: 3, n: 3, sources: 4 }, at)) === JSON.stringify({ fait: 2, total: 4, unite: "sources" }));
  check("trophées non lus : null", avancementDe({ k: "trophees", palier: 3, n: 5 }, acquis()) === null);
}

titre("# le choix du prochain déblocage");
{
  const piece = (cle: string, type: PieceEnCours["type"], condition: Condition | null, ordre: number): PieceEnCours => ({ cle, type, nom: cle, condition, ordre });
  const a = acquis({ questions: 4200, sceaux: [sceau("duelliste", 1, 20)] });
  const pieces = [
    piece("libre", "cadre", null, 1),
    piece("deja", "cadre", { k: "questions", n: 1000 }, 2),
    piece("loin", "banniere", { k: "questions", n: 10000 }, 3),
    piece("proche", "ornement", { k: "questions", n: 5000 }, 4),
    piece("laurier", "ornement", { k: "sceau", cle: "duelliste", palier: 2 }, 5),
    piece("binaire", "titre", { k: "pic", palier: 5 }, 6),
  ];
  const d = choisirDeblocage(pieces, a);
  // proche : 4200/5000 = 0,84 ; laurier : 20/25 = 0,8 ; loin : 0,42
  check("la plus avancée : « proche » (4 200 sur 5 000), reste 800 questions", d?.nom === "proche" && d.fait === 4200 && d.total === 5000 && d.reste === `encore 800 questions` && d.unite === "questions", JSON.stringify(d));
  check("le lien mène à Mes pièces", d?.href === "/moi?onglet=pieces");
  const d2 = choisirDeblocage(pieces.filter((p) => p.cle !== "proche"), a);
  check("sans elle : « laurier », encore 5 duels gagnés (barre sur 25 duels gagnés)", d2?.nom === "laurier" && d2.reste === "encore 5 duels gagnés" && d2.unite === "duels gagnés" && d2.type === "ornement", JSON.stringify(d2));
  check("une pièce possédée, libre ou binaire n'est jamais choisie", !["libre", "deja", "binaire"].includes(d!.nom) && !["libre", "deja", "binaire"].includes(d2!.nom));
  check("le singulier quand il en reste un", choisirDeblocage([piece("x", "cadre", { k: "questions", n: 4201 }, 1)], a)?.reste === "encore 1 question");
  // égalité de ratio (50 %) : celle qui demande le moins ; puis l'ordre
  const a0 = acquis({ questions: 50 });
  const eg = choisirDeblocage([piece("grand", "cadre", { k: "questions", n: 200 }, 1), piece("petit", "cadre", { k: "questions", n: 100 }, 2)], a0);
  check("la plus avancée gagne : 50 sur 100 devant 50 sur 200", eg?.nom === "petit");
  const eg2 = choisirDeblocage([piece("b", "cadre", { k: "questions", n: 100 }, 2), piece("a", "cadre", { k: "questions", n: 100 }, 1)], a0);
  check("à tout égal, l'ordre du catalogue", eg2?.nom === "a");
  check("rien qui se mesure : null (la carte disparaît)", choisirDeblocage([piece("b", "titre", { k: "pic", palier: 5 }, 1), piece("l", "cadre", null, 2)], a) === null && choisirDeblocage([], a) === null);
  const reel = choisirDeblocage(PIECES, acquis({ questions: 4300 }));
  check("sur le vrai catalogue (" + PIECES.length + " pièces) : une pièce proche, sans exception", reel !== null && reel.fait < reel.total && reel.fait >= 0, JSON.stringify(reel));
  const vide = choisirDeblocage(PIECES, acquis());
  check("sur le vrai catalogue, joueur neuf : la plus facile (reste le plus petit)", vide === null || (vide.fait === 0 && vide.total > 0), JSON.stringify(vide));
}

titre("# la carte « Prochain déblocage »");
const DEB: DeblocageLobby & { unite: string } = { nom: "Laurier", type: "ornement", fait: 3, total: 5, reste: "encore 2 duels gagnés", href: "/moi?onglet=pieces", unite: "duels gagnés" };
{
  const h = rendre(<CarteDeblocage d={DEB} className="place" />);
  check("Ornement « Laurier », pour ta bannière : encore 2 duels gagnés", h.includes("Ornement « Laurier »") && h.includes("pour ta bannière : <b>encore 2 duels gagnés</b>"), texte(h).slice(0, 200));
  check("la barre : 60 %, lue « 3 sur 5 duels gagnés », et le pied 3/5", h.includes('style="width:60%"') && h.includes('aria-label="3 sur 5 duels gagnés"') && h.includes(">3/5<") && h.includes("duels gagnés"));
  check("la silhouette est une icône au trait, masquée aux lecteurs d'écran", h.includes("silh") && compte(h, /<svg/g) === 2 && h.includes('aria-hidden="true"'));
  check("le lien « Mes pièces → » mène à /moi?onglet=pieces", h.includes('href="/moi?onglet=pieces"') && h.includes("Mes pièces →"));
  check("le type change la silhouette et la phrase (titre : pour ton profil)", rendre(<CarteDeblocage d={{ ...DEB, type: "titre", nom: "Maître de FSA" }} />).includes("Titre « Maître de FSA »"));
  check("aucun liquide, aucun bouton", !h.includes("rl-encre") && !h.includes("<button"));
  check("légère : moins de 6 Ko", h.length < 6000, String(h.length));
}

// ═══ Ta prochaine quête ═════════════════════════════════════════════════════
titre("# la quête");
{
  const ligne = (o: Record<string, unknown> = {}) => ({ id: "q1", titre: "Trois fiches dans la semaine", etat: "active", affichage: "complet", valeur: 2, cible: 3, fraction: 2 / 3, xp: 120, ...o });
  const vue = (o: Record<string, unknown> = {}) => ({ disponible: true, sobre: false, prochaine: { ligne: ligne() }, hebdo: [], ...o }) as unknown as Parameters<typeof queteLobby>[0];
  const q = queteLobby(vue());
  check("la prochaine du Codex : 2/3, +120 XP, vers /codex", JSON.stringify(q) === JSON.stringify({ titre: "Trois fiches dans la semaine", valeur: 2, cible: 3, xp: 120, href: "/codex" }), JSON.stringify(q));
  check("mode sobre : l'XP est masquée", queteLobby(vue({ sobre: true }))?.xp === null);
  check("une quête sans XP : null", queteLobby(vue({ prochaine: { ligne: ligne({ xp: 0 }) } }))?.xp === null);
  check("Codex indisponible, ou pas de vue : null", queteLobby(vue({ disponible: false })) === null && queteLobby(null) === null);
  const repli = queteLobby(vue({ prochaine: null, hebdo: [ligne({ id: "h0", titre: "Fait", etat: "terminee" }), ligne({ id: "h1", titre: "Cachée", affichage: "cache" }), ligne({ id: "h2", titre: "Une série de 5", valeur: 1, cible: 5, xp: 40 })] }));
  check("sans prochaine : la première quête de la semaine pas faite et visible", repli?.titre === "Une série de 5" && repli.cible === 5);
  check("rien à proposer : null", queteLobby(vue({ prochaine: null, hebdo: [ligne({ etat: "terminee" })] })) === null);
  const bas = queteLobby(vue({ prochaine: { ligne: ligne({ valeur: 120, cible: 50, fraction: 0.4, baisse: { actuel: 120, seuil: 50 } }) } }));
  check("une quête « à faire baisser » : la fraction dit où l'on en est", bas?.valeur === 20 && bas.cible === 50, JSON.stringify(bas));
  check("la valeur ne dépasse jamais la cible", queteLobby(vue({ prochaine: { ligne: ligne({ valeur: 9, cible: 3 }) } }))?.valeur === 3);
}
{
  const Q: QueteLobby = { titre: "Trois fiches dans la semaine", valeur: 2, cible: 3, xp: 120, href: "/codex" };
  const h = rendre(<CarteQuete q={Q} className="place" />);
  check("« Trois fiches dans la semaine » entre guillemets, 2/3, +120 XP", h.includes("« Trois fiches dans la semaine »") && h.includes(">2/3<") && h.includes(`+120${NB}XP`));
  check("trois pastilles, deux allumées, lues « 2 sur 3 »", compte(h, /class="pip pipOn"/g) === 2 && compte(h, /class="pip"/g) === 1 && h.includes('aria-label="2 sur 3"'));
  check("le lien « Ouvrir le Codex → » vers /codex", h.includes('href="/codex"') && h.includes("Ouvrir le Codex →"));
  const g = rendre(<CarteQuete q={{ ...Q, valeur: 40, cible: 100, xp: null }} />);
  check("au-delà de 12 étapes : une piste à 40 %, sans XP", g.includes('style="width:40%"') && !g.includes("pip") && !g.includes("XP"));
  check("aucun liquide", !h.includes("rl-encre") && !h.includes("<button"));
}

// ═══ La Grande Salle et les affiches ═════════════════════════════════════════
titre("# la Grande Salle");
{
  const e = { id: "ex4", title: "Examen blanc n° 4", jourExamen: "2025-11-07", daysLeft: 6, registered: false };
  const g = grandeSalleDe(e)!;
  check("« Prochain examen blanc dans 6 jours », « Examen blanc n° 4, vendredi 7 novembre. »", g.titre === `Prochain examen blanc dans 6${NB}jours` && g.ligne === "Examen blanc n° 4, vendredi 7 novembre.", JSON.stringify(g));
  check("le bouton mène à l'examen : voir, ou ouvrir si je suis inscrit", g.action.href === "/mock-exams/ex4" && g.action.libelle === "Voir l'examen blanc" && grandeSalleDe({ ...e, registered: true })!.action.libelle === "Ouvrir mon examen blanc");
  check("demain, aujourd'hui, en cours", grandeSalleDe({ ...e, daysLeft: 1 })!.titre === "Prochain examen blanc demain" && grandeSalleDe({ ...e, daysLeft: 0 })!.titre === "Examen blanc aujourd'hui" && grandeSalleDe({ ...e, daysLeft: -1 })!.titre === "Examen blanc en cours");
  check("aucun examen à venir : null (la bande n'est pas posée)", grandeSalleDe(null) === null);
  check("jours de la semaine : 1er novembre 2025 est un samedi", jourDeSemaine("2025-11-01") === "samedi" && jourDeSemaine("2025-11-02") === "dimanche");
  const h = rendre(<BandeGrandeSalle g={g} className="place" />);
  check("la bande : « La Grande Salle », le titre, la ligne, le bouton noir vers l'examen", h.includes("La Grande Salle") && h.includes(`Prochain examen blanc dans 6${NB}jours`) && h.includes("Examen blanc n° 4, vendredi 7 novembre.") && h.includes('href="/mock-exams/ex4"') && /class="noir salleBouton"/.test(h));
  check("la peinture du site, décorative ; aucun /_blob/", h.includes("/illustrations/mock-grande-salle.webp") && h.includes('alt=""') && !h.includes("/_blob/"));
  check("le bouton est un aplat noir : aucun liquide", !h.includes("rl-encre") && !h.includes("data-palette") && !h.includes("<button"));
}
titre("# les deux affiches");
{
  check("les deux peintures existent dans lib/illustrations", AFFICHES.rival.nom in ILLUSTRATIONS && AFFICHES.scores.nom in ILLUSTRATIONS);
  check("à la place de la ligue : La Lice ; rangée des scores : La Bibliothèque", AFFICHES.rival.nom === "duel-lice" && AFFICHES.rival.legende === "La Lice" && AFFICHES.scores.nom === "reviser-bibliotheque" && AFFICHES.scores.legende === "La Bibliothèque");
  for (const cle of ["rival", "scores"] as const) {
    const h = rendre(<Affiche a={AFFICHES[cle]} className="place" />);
    check(`l'affiche « ${AFFICHES[cle].legende} » : une figure, une peinture, une légende, AUCUN lien ni bouton`, h.startsWith("<figure") && h.includes("<img") && h.includes("<figcaption") && h.includes(AFFICHES[cle].legende) && !h.includes("<a ") && !h.includes("<button") && !h.includes("href="), h.slice(0, 120));
    check(`l'affiche « ${AFFICHES[cle].legende} » : l'image vient de public/illustrations (alt lu), jamais de /_blob/`, h.includes(ILLUSTRATIONS[AFFICHES[cle].nom].src) && !h.includes("/_blob/") && h.includes(`alt="${ILLUSTRATIONS[AFFICHES[cle].nom].alt}"`));
  }
}

// ═══ Du nouveau ═════════════════════════════════════════════════════════════
titre("# Du nouveau");
const J = (id: string, nom: string) => ({ id, nom, avatarUrl: null });
const NOUVELLES: Nouveaute[] = [
  { type: "palier", cle: "p1", jour: "2025-10-31", joueur: J("u-hugo", "Hugo B."), palier: 3 },
  { type: "victoire", cle: "d1", jour: "2025-10-30", joueur: J("u-ines", "Inès K."), duel: "duel-1", score: [23, 19] },
  { type: "depasse", cle: "x1", jour: "2025-10-29", joueur: J("u-sarah", "Sarah T."), ecart: 8 },
  { type: "victoire", cle: "d2", jour: AUJ, joueur: J("u-luc", "Lucas M."), duel: "duel-2", score: null },
];
{
  check("palier : « monte en Platine »", segs(phraseNouveau(NOUVELLES[0])) === "monte en Platine");
  check("victoire : « t'a battu 23–19 » ; sans score : « t'a battu en duel »", segs(phraseNouveau(NOUVELLES[1])) === "t'a battu 23–19" && segs(phraseNouveau(NOUVELLES[3])) === "t'a battu en duel");
  check("dépassement : « t'a dépassé de 8 points »", segs(phraseNouveau(NOUVELLES[2])) === `t'a dépassé de 8 points`);
  check("revanche → le lobby des duels ; dépassement → le face-à-face ; palier → son profil", actionNouveau(NOUVELLES[1]).href === "/duel?adversaire=u-ines" && actionNouveau(NOUVELLES[1]).libelle === "Revanche" && actionNouveau(NOUVELLES[2]).href === "/people/u-sarah?onglet=face-a-face#profil-onglets" && actionNouveau(NOUVELLES[2]).libelle === "Voir" && actionNouveau(NOUVELLES[0]).href === "/people/u-hugo" && actionNouveau(NOUVELLES[0]).libelle === "Son profil");
  check("la date se dit au serveur : aujourd'hui, hier, avant-hier, il y a 4 j", quandNouveau(AUJ, AUJ) === "aujourd'hui" && quandNouveau("2025-10-31", AUJ) === "hier" && quandNouveau("2025-10-30", AUJ) === "avant-hier" && quandNouveau("2025-10-28", AUJ) === `il y a 4${NB}j`);
  const h = rendre(<DuNouveau nouvelles={NOUVELLES} aujourdhui={AUJ} className="place" />);
  check("la repère de Léonard est gardé : data-leonard=\"du-nouveau\"", compte(h, /data-leonard="du-nouveau"/g) === 1);
  check("quatre lignes, chacune avec son visage (initiales), son texte, sa date et son bouton", compte(h, /<li /g) === 4 && h.includes(">HB<") && h.includes(">IK<") && h.includes("<b>Hugo B.</b> monte en <b>Platine</b>") && h.includes("hier") && h.includes("avant-hier"));
  check("les boutons : Revanche (×2), Voir, Son profil ; aucun « Féliciter »", compte(h, />Revanche</g) === 2 && h.includes(">Voir<") && h.includes(">Son profil<") && !h.includes("Féliciter"));
  check("« Tout voir → » mène aux amis du classement", h.includes('href="/classement?onglet=amis"') && h.includes("Tout voir →"));
  check("le bouton se lit en entier : « Revanche : Inès K. t'a battu 23–19 »", h.includes('aria-label="Revanche : Inès K. t\'a battu 23–19"'));
  check("rien de neuf, ou amis illisibles : la carte n'est pas posée", rendre(<DuNouveau nouvelles={[]} aujourdhui={AUJ} />) === "" && rendre(<DuNouveau nouvelles={null} aujourdhui={AUJ} />) === "");
  check("aucun liquide (boutons secondaires à contour fin)", !h.includes("rl-encre") && !h.includes("<button"));
}

// ═══ Tes amis ═══════════════════════════════════════════════════════════════
titre("# Tes amis");
{
  const amis = ["Lucas M.", "Inès K.", "Hugo B.", "Marie L.", "Sarah T."].map((name, i) => ({ id: `u${i}`, name }));
  const a = amisLobby({ amis, total: 14, enLigne: new Set(["u3", "u1", "u4"]), demandes: 2 });
  check("3 en ligne sur 14 ; les visages : les amis en ligne d'abord, dans l'ordre de la liste", a.total === 14 && a.enLigne === 3 && a.visages.map((v) => v.nom).join() === "Inès,Marie,Sarah" && a.visages.every((v) => v.enLigne), JSON.stringify(a));
  check("initiales et prénom : « Inès K. » → IK / Inès", a.visages[0].initiales === "IK" && a.visages[0].nom === "Inès");
  check("moins de 3 en ligne : on complète avec les autres, sans pastille", amisLobby({ amis, total: 5, enLigne: new Set(["u2"]), demandes: 0 }).visages.map((v) => `${v.nom}:${v.enLigne}`).join() === "Hugo:true,Lucas:false,Inès:false");
  const sans = amisLobby({ amis, total: 14, enLigne: null, demandes: 0 });
  check("présence illisible : enLigne null, visages sans pastille", sans.enLigne === null && sans.visages.every((v) => !v.enLigne) && sans.visages.length === 3);
  check("le total ne descend jamais sous la liste lue", amisLobby({ amis, total: 2, enLigne: null, demandes: 0 }).total === 5);

  // la photo de profil de l'ami (profiles.avatar_url) : le composant Avatar du site ; sans photo, les initiales
  const PHOTO = "https://exemple.supabase.co/storage/v1/object/public/avatars/ines.png";
  const avecPhotos = amisLobby({ amis: amis.map((m, i) => ({ ...m, avatarUrl: i === 1 ? PHOTO : i === 3 ? "javascript:alert(1)" : null })), total: 14, enLigne: new Set(["u3", "u1", "u4"]), demandes: 0 });
  check("la photo suit le visage de l'ami (Inès) ; sans photo ou adresse dangereuse (javascript:) : null", avecPhotos.visages.map((v) => v.avatarUrl).join("|") === `${PHOTO}||` && a.visages.every((v) => v.avatarUrl === null) && sans.visages.every((v) => v.avatarUrl === null), JSON.stringify(avecPhotos.visages.map((v) => v.avatarUrl)));
  const hp = rendre(<TesAmis amis={avecPhotos} />);
  check(
    "avec photo : l'image de l'ami (alt vide, 36 px), à la place de ses initiales IK ; les deux autres gardent les leurs (ML, ST)",
    compte(hp, /<img /g) === 1 && hp.includes(`<img src="${PHOTO}"`) && hp.includes('alt=""') && hp.includes('width="36" height="36"') && hp.includes('class="av avPhoto"') && !hp.includes(">IK<") && hp.includes(">ML<") && hp.includes(">ST<"),
  );
  check("avec photo : la pastille verte « en ligne » reste sur chaque visage (3), lue aux lecteurs d'écran", compte(hp, /<i><\/i>/g) === 3 && compte(hp, /sr-only">, en ligne/g) === 3 && hp.indexOf("<img") < hp.indexOf("<i></i>"));
  check("sans photo : aucune image, que des initiales", !rendre(<TesAmis amis={a} />).includes("<img"));
  const hseule = rendre(<TesAmis amis={a} seule className="place" />);
  check("seule sur la rangée (pas de « Du nouveau ») : la carte se met en bande (amisSeule) ; à côté d'une autre, non", hseule.includes("amisSeule") && !rendre(<TesAmis amis={a} />).includes("amisSeule") && !rendre(<TesAmis amis={a} className="place" />).includes("amisSeule"));
  const hseule0 = rendre(<TesAmis amis={{ total: 0, enLigne: null, visages: [], demandes: 0 }} seule />);
  check("seule et sans ami : la bande reste lisible (invitation et lien)", hseule0.includes("amisSeule") && hseule0.includes("Ajoute tes premiers amis") && hseule0.includes("Trouver des joueurs →"));
  const css = readFileSync("components/accueil/lobby/Parcours.module.css", "utf8");
  check(
    "CSS : la bande (amisSeule) est une ligne qui passe à la ligne, le lien à droite ; sur téléphone elle redevient une colonne",
    /\.amisSeule\.amisSeule \{\s*flex-direction: row;\s*flex-wrap: wrap;/.test(css) && /\.amisSeule\.amisSeule \.basLien \{\s*margin: 0 0 0 auto/.test(css) && /@container \(max-width: 760px\)[\s\S]*\.amisSeule\.amisSeule \{\s*flex-direction: column/.test(css),
  );
  const h = rendre(<TesAmis amis={a} className="place" />);
  check("« 3 » en grand, « en ligne sur 14 », trois visages, trois pastilles vertes lues « en ligne »", h.includes("<b class=\"font-brand\">3</b>") && h.includes("en ligne sur 14") && compte(h, /class="visage"/g) === 3 && compte(h, /sr-only">, en ligne/g) === 3 && compte(h, /<i><\/i>/g) === 3);
  check("la pastille « 2 demandes d'ami » mène à la liste ; le lien « Tes amis → » aussi", h.includes("2 demandes d'ami") && compte(h, /href="\/people\?view=amis"/g) === 2 && h.includes("Tes amis →"));
  const hs = rendre(<TesAmis amis={sans} />);
  check("sans présence : « 14 amis »", hs.includes("<b class=\"font-brand\">14</b>") && hs.includes("<span>amis</span>") && !hs.includes("en ligne sur") && !hs.includes("<i></i>"));
  const h0 = rendre(<TesAmis amis={{ total: 0, enLigne: null, visages: [], demandes: 0 }} />);
  check("0 ami : « Ajoute tes premiers amis » et un lien vers les joueurs", h0.includes("Ajoute tes premiers amis") && h0.includes('href="/people"') && h0.includes("Trouver des joueurs →") && !h0.includes("visage"));
  const h1 = rendre(<TesAmis amis={{ total: 1, enLigne: null, visages: [{ id: "u", nom: "Léa", initiales: "L", avatarUrl: null, enLigne: false }], demandes: 1 }} />);
  check("un seul ami : « amis » devient « ami » ; une demande", h1.includes("<span>ami</span>") && h1.includes("1 demande d'ami"));
  check("aucun liquide, aucun bouton", !h.includes("rl-encre") && !h.includes("<button"));
}

// ═══ Ton carnet de jours ════════════════════════════════════════════════════
titre("# le carnet de jours");
const jourEncre = (dec: number) => {
  const d = new Date(AUJ + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - dec);
  return d.toISOString().slice(0, 10);
};
// 34 jours d'encre (10 traits ou plus) étalés sur l'année, quelques jours à peine entamés
const JOURS: [string, number][] = [
  ...Array.from({ length: 34 }, (_, i) => [jourEncre(i * 9 + 1), 10 + ((i * 7) % 40)] as [string, number]),
  [jourEncre(2), 3],
  [AUJ, 26],
];
const CARNET: CarnetLobby = { jours: JOURS, aujourdhui: AUJ, serie: 9, record: 11, seuil: 10 };
{
  const v = carnetVue(CARNET, { traits: 26, objectif: 40 });
  check("364 cases, 52 semaines de 7 jours", v.cases.length === 364 && v.mois.length === 52);
  check("35 jours d'encre : 34 jours passés à 10 traits ou plus, plus aujourd'hui (26) ; les 3 traits d'il y a deux jours ne comptent pas", v.joursEncre === 35, String(v.joursEncre));
  check("sans série d'encre (seuil null), une question suffit : 36 jours (les 3 traits comptent)", carnetVue({ ...CARNET, seuil: null }, null).joursEncre === 36);
  check("la série et le record", v.serie === 9 && v.record === 11);
  check("la grille finit le dimanche de cette semaine : samedi 1er novembre est l'avant-dernière case, dimanche à venir", v.cases[362].jour === AUJ && v.cases[363].avenir && v.cases.filter((c) => c.avenir).length === 1);
  check("une seule case cerclée : aujourd'hui", v.cases.filter((c) => c.auj).length === 1 && v.cases[362].auj);
  check("la case du jour : 26 traits sur 40 → niveau 3, infobulle « pas encore tenue »", v.cases[362].niveau === 3 && v.cases[362].titre === "aujourd'hui · 26 traits sur 40, pas encore tenue", String(v.cases[362].titre));
  check("journée tenue : « journée tenue » dans l'infobulle", carnetVue(CARNET, { traits: 42, objectif: 40 }).cases[362].titre === "aujourd'hui · 42 traits sur 40, journée tenue");
  check("les traits répondus à l'instant priment sur la grille (niveau 4 à 40 traits)", carnetVue({ ...CARNET, jours: [] }, { traits: 40, objectif: 40 }).cases[362].niveau === 4);
  const avecN = v.cases.find((c) => c.jour === jourEncre(2));
  check("une case à 3 traits : « jeudi 30 oct. · 3 traits (jour d'encre dès 10) »", avecN?.titre === "jeudi 30 oct. · 3 traits (jour d'encre dès 10)", String(avecN?.titre));
  const encre = v.cases.find((c) => c.jour === jourEncre(1));
  check("un jour d'encre : « … · 10 traits · jour d'encre » ; une case vide : « … · rien tracé » ; à venir : pas d'infobulle", /^[a-z]+ \d+ [a-zéû.]+ · \d+ traits · jour d'encre$/.test(encre?.titre ?? "") && / · rien tracé$/.test(v.cases[0].titre ?? "") && v.cases[363].titre === null, `${encre?.titre} | ${v.cases[0].titre}`);
  check("sans série d'encre (seuil null) : les traits seuls", carnetVue({ ...CARNET, seuil: null }, null).cases.find((c) => c.jour === jourEncre(2))?.titre === "jeudi 30 oct. · 3 traits");
  check("les 34 semaines les plus anciennes sont masquées au téléphone (et leurs mois)", SEMAINES_ANCIENNES === 34 && v.cases.filter((c) => c.ancien).length === 34 * 7 && v.mois.filter((m) => m.ancien).length === 34 && v.cases[34 * 7 - 1].ancien && !v.cases[34 * 7].ancien);
  const mois = moisCarnet(AUJ);
  const noms = mois.filter((m) => m.texte).map((m) => m.texte);
  check("les mois : un nom par mois, de novembre 2024 à novembre 2025, sans doublon de suite", noms.length >= 12 && noms.length <= 13 && noms.every((n, i) => n !== noms[i - 1]), noms.join(" "));
  const premier = mois.findIndex((m) => m.texte);
  const suivant = mois.findIndex((m, i) => i > premier && m.texte);
  check("le premier mois, coupé, n'est écrit que s'il reste trois colonnes avant le suivant", premier > 0 || suivant >= 3, `${premier} ${suivant}`);
  check("le premier mois écrit est novembre 2024, le dernier octobre (la dernière semaine commence le 27 octobre)", noms[0] === "nov." && noms[noms.length - 1] === "oct.", noms.join(" "));
  check("le carnet vide : 364 cases au niveau 0, 0 jour d'encre", (() => { const c = carnetVue({ jours: [], aujourdhui: AUJ, serie: 0, record: 0, seuil: 10 }, null); return c.cases.length === 364 && c.joursEncre === 0 && c.cases.every((x) => x.niveau === 0); })());
  check("carnetDe : la série d'encre donne le seuil de 10, l'ancien calcul une question", carnetDe({ jours: [], aujourdhui: AUJ, stats: { serie: 4, meilleureSerie: 7, serieEncre: true } }, 10).seuil === 10 && carnetDe({ jours: [], aujourdhui: AUJ, stats: { serie: 4, meilleureSerie: 7 } }, 10).seuil === null && carnetDe({ jours: [], aujourdhui: AUJ, stats: { serie: 4, meilleureSerie: 7 } }, 10).record === 7);
  check("la phrase sous la grille : générale sans journée, précise avec", legendeCarnet(null) === "La case cerclée, c'est aujourd'hui." && legendeCarnet({ traits: 26, objectif: 40 }) === "La case cerclée, c'est aujourd'hui : 26 traits sur 40, pas encore tenue.");
}
{
  const h = rendre(<CarnetJours carnet={CARNET} aujourdhui={{ traits: 26, objectif: 40 }} className="place" />);
  check("la carte sombre : titre, sous-titre, trois chiffres (jours d'encre, série, record)", h.includes("Ton carnet de jours") && h.includes("plus elle est claire, plus tu as tracé") && h.includes("<b>35</b>") && h.includes(`<b>9${NB}j</b>`) && h.includes(`<b>11${NB}j</b>`) && h.includes("jours d'encre<br/>sur 52 semaines") && h.includes("ta série<br/>en cours") && h.includes("ton<br/>record"), texte(h).slice(0, 220));
  const grille = h.slice(h.indexOf('class="cases"'), h.indexOf("</div>", h.indexOf('class="cases"')));
  check("364 cases dans la grille, dont une cerclée et une à venir", compte(grille, /<i /g) === 364 && compte(grille, /data-auj/g) === 1 && compte(grille, /data-f/g) === 1, String(compte(grille, /<i /g)));
  check("34 × 7 cases anciennes et 34 mois marqués pour le téléphone", compte(grille, /data-ancien/g) === 34 * 7 && compte(h.slice(h.indexOf('class="mois"'), h.indexOf('class="jours"')), /data-ancien/g) === 34);
  check("la grille se lit : « 35 jours d'encre sur 52 semaines ; série en cours de 9 jours, record de 11 jours »", h.includes('aria-label="35 jours d\'encre sur 52 semaines ; série en cours de 9 jours, record de 11 jours"'));
  check("lun., mer., ven. sur les lignes 1, 3 et 5 ; masqués aux lecteurs d'écran", h.includes("<span>lun.</span><span></span><span>mer.</span><span></span><span>ven.</span>"));
  check("la phrase du jour et la légende « moins ▢▢▢▢▢ plus »", h.includes("La case cerclée, c&#x27;est aujourd&#x27;hui") || h.includes("La case cerclée, c'est aujourd'hui : 26 traits sur 40, pas encore tenue."));
  check("la légende : cinq carrés (niveaux 0 à 4), « moins » et « plus »", compte(h.slice(h.indexOf('class="legende"')), /<i[ >]/g) === 5 && h.includes("moins<span") && h.includes("</span>plus"));
  check("aucune encre, aucun bouton, aucune image", !h.includes("rl-encre") && !h.includes("<button") && !h.includes("<img"));
  check("pesée : moins de 40 Ko (364 cases)", h.length < 40000, String(h.length));
  check("sans journée en cours (aujourdhui = null) : la phrase générale", rendre(<CarnetJours carnet={CARNET} aujourdhui={null} />).includes("La case cerclée, c'est aujourd'hui.</span>"));
  check("un carnet vide reste posé (les données sont celles du joueur)", rendre(<CarnetJours carnet={{ jours: [], aujourdhui: AUJ, serie: 0, record: 0, seuil: null }} aujourdhui={null} />).includes("<b>0</b>"));
}

// ═══ Règles du lot ══════════════════════════════════════════════════════════
titre("# les règles de DA et de code");
{
  const dossier = "components/accueil/lobby/";
  const fichiers = [
    ...["CarteScores.tsx", "CarteDeblocage.tsx", "CarteQuete.tsx", "BandeGrandeSalle.tsx", "Affiche.tsx", "DuNouveau.tsx", "TesAmis.tsx", "Visage.tsx", "CarnetJours.tsx", "modele-parcours.ts", "lecture-parcours.ts", "Parcours.module.css", "CarnetJours.module.css"].map((f) => dossier + f),
    "lib/voice-accueil-lobby-parcours.ts",
    "scripts/accueil/test-lobby-parcours.tsx",
  ];
  const lus = fichiers.map((f) => [f, readFileSync(f, "utf8")] as const);
  const bs = String.fromCharCode(92);
  // les chemins de travail s'écrivent en deux morceaux ici pour que ce fichier ne s'accuse pas lui-même
  const interdits = ["Te" + "mp/", "scratch" + "pad", "AppData", "C:" + "/Users", "/_blob/"];
  for (const [f, s] of lus) {
    if (f.includes("test-lobby-parcours")) continue;
    // une barre oblique inverse n'a sa place que dans une expression régulière ou un échappement de chaîne : on cherche un CHEMIN (lettre, barre inverse, lettre)
    check(`${f} : aucun chemin à antislash ni de travail`, !/[A-Za-z]:\\[A-Za-z]/.test(s) && !interdits.some((x) => s.includes(x)));
  }
  const code = (s: string) => s.split("\n").filter((ligne) => !/^\s*(\/\/|\/\*|\*)/.test(ligne)).join("\n");
  for (const [f, s] of lus) {
    if (f.includes("test-lobby-parcours") || f.endsWith(".css")) continue;
    check(`${f} : ni Intl ni toLocaleString (hors commentaires), ni "use client"`, !/Intl\.|toLocaleString/.test(code(s)) && !s.includes('"use client"'));
  }
  for (const [f, s] of lus) {
    if (!f.endsWith(".tsx") || f.includes("test-lobby-parcours")) continue;
    check(`${f} : aucune fonction passée en prop, aucun hook`, !/\buse(State|Effect|Ref|Memo|Callback|Router)\b/.test(s) && !/onClick|onChange/.test(s));
    check(`${f} : ni EncreVive ni Bouton d'encre (ce lot n'a aucun liquide)`, !/EncreVive|\bBouton\b|\bBoutonAction\b|\bSelecteur\b/.test(code(s)));
  }
  const tout = [
    rendre(<CarteScores scores={SCORES} />),
    rendre(<CarteDeblocage d={DEB} />),
    rendre(<CarteQuete q={{ titre: "t", valeur: 1, cible: 2, xp: 10, href: "/codex" }} />),
    rendre(<BandeGrandeSalle g={{ titre: "t", ligne: "l", action: { href: "/mock-exams/x", libelle: "Voir" } }} />),
    rendre(<Affiche a={AFFICHES.rival} />),
    rendre(<DuNouveau nouvelles={NOUVELLES} aujourdhui={AUJ} />),
    rendre(<TesAmis amis={{ total: 2, enLigne: 1, visages: [{ id: "a", nom: "A", initiales: "A", avatarUrl: null, enLigne: true }], demandes: 0 }} />),
    rendre(<CarnetJours carnet={CARNET} aujourdhui={null} />),
  ].join("\n");
  check("zéro liquide dans les huit cartes (aucun rl-encre, aucun data-palette)", !tout.includes("rl-encre") && !tout.includes("data-palette"));
  check("aucun antislash ni chemin de travail dans le rendu", !tout.includes(bs) && !interdits.some((x) => tout.includes(x)));
  check("aucun SVG lourd : le plus long attribut d d'un tracé fait moins de 400 caractères", Math.max(0, ...(tout.match(/ d="[^"]*"/g) ?? []).map((x) => x.length)) < 400);
  check("chaque section a son titre étiqueté (aria-labelledby → id présent)", [...tout.matchAll(/aria-labelledby="([^"]+)"/g)].every((m) => tout.includes(`id="${m[1]}"`)));
  check("aucun identifiant en double sur l'ensemble des cartes", (() => { const ids = [...tout.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]); return new Set(ids).size === ids.length; })());
}

console.log("");
console.log(ko === 0 ? "TOUT EST VERT" : `${ko} VÉRIFICATION(S) EN ÉCHEC`);
if (ko) process.exit(1);
