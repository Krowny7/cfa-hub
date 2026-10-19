// Tests des données du visiteur (lib/profil/visiteur.ts) et du bandeau
// « Rapport de force » (components/profil/RapportDeForce.tsx,
// RapportMemoire.tsx), sans base ni réseau ni navigateur.
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-visiteur.ts
// Vérifie : l'essentiel (questions, série d'encre ou ancienne, jours des 52
// semaines avec aujourd'hui, le reste à 0), la maîtrise mesurée, ce que la
// page a déjà lu de toi (lignes brutes), les besoins selon les blocs posés,
// les séances gardées, la courbe d'ELO (fenêtre, départ, matchs au même
// instant), le cercle d'amis (places, égalités, toi ami ou non) et les amis
// montrés (tranche autour de lui et de toi), les semaines comparées, le
// carnet sans journalDe ; le bandeau dans les trois vues (chez un autre :
// jetons, score, infobulles, rattrapage, liens vers les tuiles posées ;
// aperçu : « toi ± », « toi – – » ; chez soi : rien), et la flèche « depuis
// ta dernière visite » (mémoire lue, seuils).
import "./sans-css";
import "./react-global";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { STATS_VIDES, STYLE_DEFAUT } from "@/lib/profil/catalogue";
import { DEFAULT_ELO } from "@/lib/ranks";
import { decaleJour } from "@/lib/objectif-calc";
import { blocsDe, type Bloc } from "@/lib/profil/disposition";
import type { LigneStyle } from "@/lib/profil/styles";
import type { DonneesBlocs, SeanceProgression } from "@/lib/profil/blocs-donnees";
import {
  baseDuVisiteur,
  besoinsVisiteur,
  carnetDepuis,
  cercleDe,
  choisirAmis,
  courbeDepuis,
  essentielDepuis,
  maitriseMesuree,
  seancesRecentes,
  semaines,
  serieDepuis,
  type MembreCercle,
} from "@/lib/profil/visiteur";
import { RapportDeForce, ancreBloc, cibleDe, manchesRapport } from "@/components/profil/RapportDeForce";
import { fleche, lireMemoire, memoireDe } from "@/components/profil/RapportMemoire";
import { DISPO_RICHE, RICHE, RICHE_TOI, TOI_EXEMPLE } from "./donnees-blocs-exemple";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const rend = (n: React.ReactNode) => renderToStaticMarkup(React.createElement(React.Fragment, null, n));
const compte = (html: string, motif: string) => html.split(motif).length - 1;
/** l'espace insécable des milliers (nombre) et devant « % » (pct), et l'apostrophe échappée du HTML */
const nb = (s: string) => s.replace(/(\d) (?=\d)/g, "$1 ").replace(/ %/g, " %");
const html = (s: string) => s.replace(/'/g, "&#x27;");

const AUJ = "2026-10-18";

// ── L'essentiel ──
{
  const avant = [
    ...Array.from({ length: 10 }, (_, i) => ({ day: decaleJour(AUJ, -(10 - i)), n: 12 })),
    { day: "2025-01-01", n: 5 },
    { day: "2026-10-01", n: 0 },
  ];
  const topics = [
    { key: "fsa", label: "FSA", pct: 70, answered: 200, statut: "mesuree" as const },
    { key: "quant", label: "Quant", pct: null, answered: 3 },
  ];
  const e = essentielDepuis({ avant, duJour: 15, topics, serieLue: { meilleure: 20 }, pauses: new Set(), aujourdhui: AUJ });
  check("essentiel : questions = jours d'avant + aujourd'hui (140)", e.stats.questions === 140, String(e.stats.questions));
  check("essentiel : série d'encre (10 jours à 12 + aujourd'hui à 15 : 11)", e.stats.serie === 11, String(e.stats.serie));
  check("essentiel : record = la meilleure en base si plus haute (20)", e.stats.meilleureSerie === 20 && e.stats.serieEncre === true);
  check("essentiel : questions du jour", e.stats.duJour === 15);
  check("essentiel : jours des 52 semaines seulement, n > 0, aujourd'hui compris", e.jours.length === 11 && e.jours[e.jours.length - 1][0] === AUJ && e.jours[e.jours.length - 1][1] === 15 && !e.jours.some(([j]) => j === "2025-01-01" || j === "2026-10-01"));
  check("essentiel : jours du plus ancien au plus récent", e.jours.every(([j], i) => i === 0 || e.jours[i - 1][0] < j));
  check("essentiel : matières reprises (statut gardé s'il existe)", e.stats.matieres.length === 2 && e.stats.matieres[0].statut === "mesuree" && !("statut" in e.stats.matieres[1]) && e.stats.matieres[1].pct === null);
  check("essentiel : duels, défis, calculs, examens non lus (0)", e.stats.duelsJoues === 0 && e.stats.defisRendus === 0 && e.stats.calculsJustes === 0 && e.stats.examensBlancs === 0);
  check("essentiel : aujourd'hui transmis", e.aujourdhui === AUJ);

  const ancien = essentielDepuis({ avant, duJour: 15, topics: [], serieLue: null, pauses: new Set(), aujourdhui: AUJ });
  check("essentiel sans la série d'encre : l'ancien calcul (11 jours d'affilée, record 11)", ancien.stats.serie === 11 && ancien.stats.meilleureSerie === 11 && ancien.stats.serieEncre === false);
  const rien = essentielDepuis({ avant: [], duJour: null, topics: [], serieLue: null, pauses: new Set(), aujourdhui: AUJ });
  check("essentiel vide : 0 partout, aucun jour", rien.stats.questions === 0 && rien.stats.serie === 0 && rien.jours.length === 0 && rien.stats.duJour === 0);

  // une série d'encre : un jour sous 10 questions casse (après le joker de la semaine)
  const parJour = new Map<string, number>([
    [decaleJour(AUJ, -3), 12],
    [decaleJour(AUJ, -2), 4],
    [decaleJour(AUJ, -1), 12],
  ]);
  const s = serieDepuis(parJour, AUJ, { meilleure: 0 });
  check("serieDepuis : un jour à 4 questions passe sur le joker (série 2 à la veille, rien aujourd'hui)", s.serie === 2, JSON.stringify(s));
  const sp = serieDepuis(parJour, AUJ, { meilleure: 0 }, new Set([decaleJour(AUJ, -2)]));
  check("serieDepuis : un jour de pause est neutre", sp.serie === 2);
}

// ── La maîtrise mesurée, ce que la page a déjà lu de toi ──
{
  check("maitriseMesuree : 0 (rien de mesuré) → null ; 64 → 64 ; absente → null", maitriseMesuree(0) === null && maitriseMesuree(64) === 64 && maitriseMesuree(undefined) === null && maitriseMesuree(NaN) === null);
  const style = { user_id: "moi", accent: "#3b6fd6", folio: "chats", titre: null } as LigneStyle;
  const b = baseDuVisiteur("moi", {
    profils: [
      { id: "lui", username: "Inès", avatar_url: null },
      { id: "moi", username: "Théo", avatar_url: "/a.png" },
    ],
    ratings: [
      { user_id: "lui", elo: 1480, games_played: 40 },
      { user_id: "moi", elo: 1360, games_played: 19 },
    ],
    style,
    maitrises: new Map([
      ["lui", 64],
      ["moi", 58],
    ]),
  });
  check("baseDuVisiteur : ELO, parties, maîtrise, couleur, folio porté, profil", b.elo === 1360 && b.parties === 19 && b.maitrise === 58 && b.accent === "#3b6fd6" && b.folio === "chats" && b.profil.name === "Théo" && b.profil.avatarUrl === "/a.png" && b.id === "moi");
  const vide = baseDuVisiteur("moi", { profils: null, ratings: [{ user_id: "moi", elo: null, games_played: null }], style: null, maitrises: new Map([["moi", 0]]) });
  check("baseDuVisiteur : sans lignes, l'ELO de départ, 0 partie, maîtrise null, couleur par défaut, « Joueur »", vide.elo === DEFAULT_ELO && vide.parties === 0 && vide.maitrise === null && vide.accent === STYLE_DEFAUT.accent && vide.folio === null && vide.profil.name === "Joueur");
}

// ── Les besoins selon les blocs posés ──
{
  const pose = (...k: string[]) => new Set(k);
  const sans = { showcase: [] as string[], journalOuvert: true, folio: true };
  const tous = besoinsVisiteur(pose("vitrine", "trophees", "saisons", "progression", "journal", "folio", "amis"), { ...sans, showcase: ["duels", "examens"] });
  check("besoins : plus aucune lecture en plus (seuls le bandeau et le radar comparent, avec l'essentiel)", Object.values(tous).every((x) => x === false));
}

// ── Les séances gardées ──
{
  const s = (i: number, jour: string): SeanceProgression => ({ id: `s${i}`, topics: ["fsa"], format: 10, score: 7, total: 10, completed_at: `${jour}T18:00:00Z` });
  const toutes = [s(1, "2026-10-15"), s(2, "2026-01-02"), s(3, "2026-09-30"), s(4, "2026-02-10"), s(5, "2026-03-03"), s(6, "2026-10-01"), s(7, "2026-04-04"), s(8, "2026-05-05")];
  const r = seancesRecentes(toutes, AUJ);
  check("séances : les 60 derniers jours, et au moins les 5 dernières, de la plus ancienne à la plus récente", r.map((x) => x.id).join(",") === "s7,s8,s3,s6,s1", r.map((x) => x.id).join(","));
  const peu = seancesRecentes([s(1, "2026-10-15"), s(2, "2026-10-10")], AUJ);
  check("séances : moins de 5 → toutes", peu.length === 2 && peu[0].id === "s2");
}

// ── La courbe d'ELO des 90 jours ──
{
  const debut = decaleJour(AUJ, -89);
  const ev = [
    { avant: 1250, apres: 1300, quand: "2026-07-01T10:00:00Z" },
    // deux matchs réglés au même instant (un examen blanc classé), donnés à l'envers
    { avant: 1320, apres: 1335, quand: "2026-09-01T10:00:00Z" },
    { avant: 1300, apres: 1320, quand: "2026-09-01T10:00:00Z" },
    { avant: 1335, apres: 1350, quand: "2026-10-10T20:00:00Z" },
  ];
  const c = courbeDepuis(ev, debut, 1350);
  check("courbe : départ = l'ELO avant le 1er match de la fenêtre", c.depart === 1300, String(c.depart));
  check("courbe : les matchs au même instant remis bout à bout", c.points.join(",") === "1320,1335,1350", c.points.join(","));
  check("courbe : un jour (Paris) par point", c.dates.join(",") === "2026-09-01,2026-09-01,2026-10-10");
  const vide = courbeDepuis([ev[0]], debut, 1300);
  check("courbe : aucun match dans la fenêtre → part de l'ELO actuel, sans point", vide.depart === 1300 && vide.points.length === 0 && vide.dates.length === 0);
  const beaucoup = Array.from({ length: 120 }, (_, i) => ({ avant: 1200 + i, apres: 1201 + i, quand: new Date(Date.UTC(2026, 8, 1, 0, i)).toISOString() }));
  const b = courbeDepuis(beaucoup, debut, 1320);
  check("courbe : 90 points au plus (les derniers)", b.points.length === 90 && b.points[89] === 1320 && b.dates.length === 90 && b.depart === 1200);
}

// ── Le cercle d'amis ──
const amisDe = (n: number): MembreCercle[] => Array.from({ length: n }, (_, i) => ({ id: `a${i}`, elo: 1620 - i * 37 }));
{
  const amis = amisDe(20); // 1620, 1583, 1546, 1509, 1472, 1435, 1398, 1361, 1324, …
  const { cercle, ordre } = cercleDe({ id: "lui", elo: 1478 }, amis, { id: "moi", elo: 1360 });
  check("cercle : sa place (4 amis plus haut : 5e)", cercle.lui === 5, String(cercle.lui));
  check("cercle : ta place (8 amis et lui plus haut : 10e)", cercle.toi === 10, String(cercle.toi));
  check("cercle : taille = ses amis, lui et toi (22)", cercle.taille === 22);
  check("cercle : ordre par ELO décroissant, lui et toi marqués non amis", ordre[4].id === "lui" && !ordre[4].ami && ordre[9].id === "moi" && !ordre[9].ami && ordre.filter((m) => m.ami).length === 20);

  const ami = cercleDe({ id: "lui", elo: 1478 }, [...amis, { id: "moi", elo: 1360 }], { id: "moi", elo: 1360 });
  check("cercle : toi déjà son ami → compté une fois (21 amis et lui : 22), marqué ami", ami.cercle.taille === 22 && ami.cercle.toi === 10 && ami.ordre.find((m) => m.id === "moi")?.ami === true);

  const egal = cercleDe({ id: "lui", elo: 1509 }, amis, null);
  check("cercle : à égalité d'ELO, la place se partage (lui 4e comme a3) ; sans toi, toi null", egal.cercle.lui === 4 && egal.cercle.toi === null && egal.cercle.taille === 21 && egal.ordre[3].id === "lui");
  const seul = cercleDe({ id: "lui", elo: 1400 }, [], { id: "moi", elo: 1500 });
  check("cercle : aucun ami → lui 2e derrière toi, sur 2", seul.cercle.lui === 2 && seul.cercle.toi === 1 && seul.cercle.taille === 2);
}

// ── Les amis montrés ──
{
  const amis = amisDe(30);
  const { ordre } = cercleDe({ id: "lui", elo: 1478 }, amis, { id: "moi", elo: 1360 });
  const c = choisirAmis(ordre, "lui", "moi", 12);
  const ids = c.map((m) => m.id);
  check("amis montrés : 12, d'un seul tenant, par ELO décroissant", c.length === 12 && c.every((m, i) => i === 0 || c[i - 1].elo >= m.elo) && ids.every((id, i) => i === 0 || Number(id.slice(1)) === Number(ids[i - 1].slice(1)) + 1));
  check("amis montrés : la tranche contient sa place et la tienne (a3/a4 autour de lui, a7/a8 autour de toi)", ["a3", "a4", "a7", "a8"].every((x) => ids.includes(x)), ids.join(","));
  check("amis montrés : ni lui ni toi (pas son ami) dans la liste", !ids.includes("lui") && !ids.includes("moi"));

  const loin = cercleDe({ id: "lui", elo: 1600 }, amis, { id: "moi", elo: 100 });
  const cl = choisirAmis(loin.ordre, "lui", "moi", 6).map((m) => m.id);
  check("amis montrés : toi trop loin → la tranche centrée sur lui", cl.join(",") === "a0,a1,a2,a3,a4,a5", cl.join(","));

  const bas = cercleDe({ id: "lui", elo: 500 }, amis, null);
  const cb = choisirAmis(bas.ordre, "lui", null, 6).map((m) => m.id);
  check("amis montrés : lui en bas → les 6 derniers", cb.join(",") === "a24,a25,a26,a27,a28,a29", cb.join(","));

  const chezSoi = choisirAmis(bas.ordre, "lui", null, 6, false).map((m) => m.id);
  check("amis montrés chez soi : les plus hauts ELO", chezSoi.join(",") === "a0,a1,a2,a3,a4,a5");

  const peu = cercleDe({ id: "lui", elo: 1500 }, amisDe(4), { id: "moi", elo: 1400 });
  check("amis montrés : moins d'amis que de places → tous", choisirAmis(peu.ordre, "lui", "moi", 12).length === 4);

  const avecToi = cercleDe({ id: "lui", elo: 1600 }, [...amis.slice(0, 25), { id: "moi", elo: 600 }], { id: "moi", elo: 600 });
  const ct = choisirAmis(avecToi.ordre, "lui", "moi", 30).map((m) => m.id);
  check("amis montrés : toi, son ami, fait partie des amis montrés", ct.includes("moi") && ct.length === 26);
}

// ── Les semaines comparées (le ruban) ──
{
  const lui: [string, number][] = [
    ["2026-10-13", 5],
    ["2026-10-18", 7],
    ["2026-10-05", 3],
    ["2026-10-19", 50], // après aujourd'hui : ne compte pas
    ["2025-01-01", 99], // avant les 52 semaines
  ];
  const toi: [string, number][] = [["2026-10-12", 20]];
  const s = semaines(lui, toi, AUJ);
  check("semaines : 52, du lundi d'il y a 51 semaines au lundi de cette semaine", s.length === 52 && s[51][0] === "2026-10-12" && s[0][0] === decaleJour("2026-10-12", -7 * 51));
  check("semaines : ses questions et les tiennes, semaine par semaine", s[51][1] === 12 && s[51][2] === 20 && s[50][1] === 3 && s[50][2] === 0);
  check("semaines : rien après aujourd'hui ni avant la 1re semaine", s.reduce((t, w) => t + w[1], 0) === 15);
  const r = semaines(RICHE_TOI.carnet!.jours, TOI_EXEMPLE.jours, AUJ, 18);
  check("semaines : 18 au téléphone", r.length === 18 && r[17][0] === "2026-10-12");
  const somme = RICHE_TOI.carnet!.jours.filter(([j]) => j >= decaleJour("2026-10-12", -7 * 51)).reduce((t, [, n]) => t + n, 0);
  check("semaines : tout son carnet des 52 semaines est compté", semaines(RICHE_TOI.carnet!.jours, [], AUJ).reduce((t, w) => t + w[1], 0) === somme);
}

// ── Son carnet, sans journalDe ──
{
  const avant = [
    { day: "2026-10-16", n: 12 },
    { day: "2026-10-17", n: 4 },
    { day: "2024-01-01", n: 9 },
  ];
  const c = carnetDepuis(avant, { ...STATS_VIDES, duJour: 36, serie: 12, meilleureSerie: 31, serieEncre: true }, AUJ);
  check("carnet : jours des 52 semaines et aujourd'hui, série, record, seuil 10", c.jours.length === 3 && c.jours[2][0] === AUJ && c.jours[2][1] === 36 && c.serie === 12 && c.record === 31 && c.seuil === 10 && c.aujourdhui === AUJ);
  const ancien = carnetDepuis(avant, { ...STATS_VIDES, serie: 2, meilleureSerie: 2 }, AUJ);
  check("carnet : sans la série d'encre, seuil null ; rien aujourd'hui", ancien.seuil === null && ancien.jours.length === 2);
}

// ── Le bandeau « Rapport de force » ──
// la page riche sans son Carnet (le Carnet posé est essayé à part, « avecCarnet »)
const BLOCS_RICHES: Bloc[] = blocsDe(DISPO_RICHE).filter((b) => b.k !== "carnet");
{
  const h = rend(RapportDeForce({ d: RICHE_TOI, blocs: BLOCS_RICHES }));
  check("bandeau chez un autre : une demi-bande nommée", h.includes('aria-label="Rapport de force avec Sforzinda"') && h.includes("demi") && h.includes("rapport"));
  check("bandeau : les 5 étiquettes, fixes", ["Rapport de force", "ELO", "Maîtrise", "Questions", "Série"].every((x) => h.includes(`>${x}<`)));
  check("bandeau : ses chiffres (1 478, 64 %, 3 412, 12 j)", ["1 478", "64 %", "3 412", "12 j"].every((x) => h.includes(nb(x))));
  check("bandeau : les jetons (toi −118, toi −6, toi −1 692, toi −7 j)", ["toi −118", "toi −6", "toi −1 692", "toi −7 j"].every((x) => h.includes(nb(x))));
  check("bandeau : le score des 4 manches, rouge (toi 0 – 4 Sforzinda)", h.includes("toi 0 – 4</span>") && h.includes("color:var(--perte)") && h.includes("Sforzinda</span>"), "");
  check("bandeau : l'infobulle du score", h.includes(html("Tu mènes dans 0, Sforzinda dans 4")));
  check("bandeau : l'infobulle de l'ELO (les deux ELO, l'enjeu du prochain duel)", h.includes(nb("ELO · Sforzinda 1 478 · toi 1 360 · enjeu du prochain duel +")));
  check("bandeau : le rattrapage d'ELO (victoires contre Sforzinda)", /victoires? contre Sforzinda pour passer devant/.test(h));
  check("bandeau : le rattrapage des questions (à ton rythme)", h.includes("À ton rythme : "));
  check("bandeau : l'infobulle de la série (records compris)", h.includes("Série · Sforzinda 12 j (record 31 j) · toi 5 j (record 19 j)"));
  check("bandeau : l'infobulle de la maîtrise", h.includes(nb("Maîtrise · Sforzinda 64 % · toi 58 %")));
  check("bandeau : pas d'aperçu chez un autre", !h.includes("toi ±") && !h.includes("toi – –"));
  check("bandeau : les cellules mènent aux tuiles posées (Journal, radar, Questions) ; sans Carnet, la Série n'est pas un lien (Chiffres clés ne la montre pas chez un autre)", ["journal", "radar", "reponses"].every((k) => h.includes(`href="#${ancreBloc(k)}"`)) && compte(h, "href=") === 3 && !h.includes("#bloc-carnet") && !h.includes("#bloc-vitrine"));
  check("bandeau : le lien dit où il mène", h.includes(nb('aria-label="ELO 1 478 : voir le Journal"')));

  const sansTuiles = rend(RapportDeForce({ d: RICHE_TOI, blocs: [] }));
  check("bandeau : aucune tuile posée → aucun lien", !sansTuiles.includes("<a "));
  const avecCarnet = rend(RapportDeForce({ d: RICHE_TOI, blocs: [...BLOCS_RICHES, { k: "carnet", f: "demi" }] }));
  check("bandeau : le Carnet posé → la Série y mène", avecCarnet.includes(`href="#${ancreBloc("carnet")}"`) && !avecCarnet.includes(`href="#${ancreBloc("vitrine")}"`));
  const journalFerme = rend(RapportDeForce({ d: { ...RICHE_TOI, journal: null }, blocs: BLOCS_RICHES }));
  check("bandeau : Journal posé mais fermé (rien à montrer) → l'ELO n'est pas un lien", !journalFerme.includes("#bloc-journal"));
  check("cibleDe : la première cible posée, sinon rien", cibleDe({ cibles: ["reponses", "vitrine"] }, [{ k: "vitrine", f: "demi" }], RICHE_TOI) === "vitrine" && cibleDe({ cibles: ["reponses"] }, [{ k: "vitrine", f: "demi" }], RICHE_TOI) === null);

  // la maîtrise pas encore mesurée chez toi : pas de jeton, l'infobulle, une manche de moins
  const nonMesure = rend(RapportDeForce({ d: { ...RICHE_TOI, toi: { ...TOI_EXEMPLE, maitrise: null } }, blocs: [] }));
  check("bandeau : ta maîtrise pas mesurée → pas de jeton, « toi : pas encore mesuré », score sur 3 manches", !nonMesure.includes("toi −6") && nonMesure.includes("toi : pas encore mesuré") && nonMesure.includes("toi 0 – 3</span>"));
  // égalité et avance
  const m = manchesRapport({ ...RICHE_TOI, toi: { ...TOI_EXEMPLE, elo: 1483, stats: { ...TOI_EXEMPLE.stats, questions: 5000, serie: 12 } } });
  check("manches : ELO à moins de 10 → égalité ; questions devant → vert ; série égale", m.manches[0].e?.long === "toi =" && m.manches[2].e?.sens === "gain" && m.manches[2].e?.long === nb("toi +1 588") && m.manches[3].e?.long === "toi =");
  check("manches : le score compte les égalités à part (toi 1 – 1, égalité 2)", m.score?.toi === 1 && m.score?.lui === 1 && m.score?.egal === 2);
  check("manches : pas de rattrapage sur un jeton qui n'est pas rouge", !m.manches[0].bulle?.includes("pour passer devant") && !m.manches[2].bulle?.includes("À ton rythme"));
  const egal = rend(RapportDeForce({ d: { ...RICHE_TOI, toi: { ...TOI_EXEMPLE, elo: 1483, stats: { ...TOI_EXEMPLE.stats, questions: 5000, serie: 12 } } }, blocs: [] }));
  check("bandeau : score à égalité à l'encre douce", egal.includes("color:var(--ink-2)") && egal.includes(html("Tu mènes dans 1, Sforzinda dans 1, égalité dans 2")));
  check("manches : seuils de la flèche (ELO 10, points 1, compte 1 % dès 100, jours 1)", m.manches[0].seuil === 10 && m.manches[1].seuil === 1 && m.manches[2].seuil === 50 && m.manches[3].seuil === 1);

  // l'aperçu « voir comme les autres »
  const ap = rend(RapportDeForce({ d: { ...RICHE, apercu: true }, blocs: BLOCS_RICHES }));
  check("aperçu : le score « toi – – » à l'encre douce, son infobulle", ap.includes(">toi – –</span>") && ap.includes(html("Ici, l'écart avec la personne qui regarde")));
  check("aperçu : « toi ± » sous les chiffres qui existent (sans ELO ni maîtrise lus : 2)", compte(ap, "toi ±") === 2 && !ap.includes("toi −"));
  const ap4 = rend(RapportDeForce({ d: { ...RICHE_TOI, toi: null, apercu: true }, blocs: BLOCS_RICHES }));
  check("aperçu : 4 « toi ± » quand ses 4 chiffres existent, aucun chiffre de toi", compte(ap4, "toi ±") === 4 && !ap4.includes("1 360") && !ap4.includes("enjeu"));

  // chez soi, et sans personne pour comparer
  check("chez soi : pas de bandeau", rend(RapportDeForce({ d: { ...RICHE_TOI, moi: true, toi: null }, blocs: BLOCS_RICHES })) === "");
  check("visiteur non connecté : pas de bandeau", rend(RapportDeForce({ d: { ...RICHE, toi: null } as DonneesBlocs, blocs: BLOCS_RICHES })) === "");
}

// ── Depuis ta dernière visite ──
{
  check("flèche : l'écart s'est amélioré du seuil ou plus → monte", fleche({ d: -100, t: "toi −100", seuil: 10 }, { d: -150, t: "toi −150" }) === "monte");
  check("flèche : dégradé → baisse", fleche({ d: -160, t: "toi −160", seuil: 10 }, { d: -150, t: "toi −150" }) === "baisse");
  check("flèche : sous le seuil → rien", fleche({ d: -145, t: "toi −145", seuil: 10 }, { d: -150, t: "toi −150" }) === null);
  check("flèche : manche absente d'un côté → rien", fleche(undefined, { d: 0, t: "toi =" }) === null && fleche({ d: 0, t: "toi =", seuil: 1 }, undefined) === null);
  const note = memoireDe({ elo: { d: -150, t: "toi −150", seuil: 10 } }, "2026-10-12");
  check("mémoire : { date, ecarts } sans le seuil", JSON.stringify(note) === JSON.stringify({ date: "2026-10-12", ecarts: { elo: { d: -150, t: "toi −150" } } }));
  check("mémoire : relue telle quelle", JSON.stringify(lireMemoire(JSON.stringify(note))) === JSON.stringify(note));
  check("mémoire : illisible ou mal formée → null ; entrées fausses écartées", lireMemoire("{") === null && lireMemoire(null) === null && lireMemoire('{"date":"hier","ecarts":{}}') === null && Object.keys(lireMemoire('{"date":"2026-10-12","ecarts":{"elo":{"d":"x","t":"a"},"serie":{"d":2,"t":"toi +2 j"}}}')?.ecarts ?? {}).join() === "serie");
  const h = rend(RapportDeForce({ d: RICHE_TOI, blocs: [] }));
  check("flèche : rien au rendu du serveur (la mémoire se lit une fois la page montée)", !h.includes("▲") && !h.includes("▼"));
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est vert");
process.exit(ko ? 1 : 0);
