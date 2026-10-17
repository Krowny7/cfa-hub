// Tests de l'accueil « Le rendez-vous » (react-dom/server, sans base, réseau ni
// navigateur) :
//   npx tsx --tsconfig tsconfig.json scripts/accueil/test-accueil.tsx
// Vérifie ce que l'utilisateur a fixé pour l'accueil (Codex simplifié, 17 oct.) :
// - en grand et dans cet ordre : Les 30 du jour, Les 5 du jour, Tes traits du
//   jour AVEC L'ANNEAU, sur téléphone comme sur ordinateur (plus de simple barre
//   au téléphone) ;
// - rien du Codex : ni séance du jour, ni cérémonie, ni quête, ni « récupérer » ;
// - la suite comme avant : vainqueur du jour, reprendre, duel, rang, liens.
import "../profil/sans-css";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import type { AccueilData, TodayDaily } from "@/components/accueil/types";
import { RDV, VAINQUEUR } from "@/lib/voice-accueil";

// le JSX des composants (tsconfig « preserve ») attend React en portée, dès leur
// chargement (certains posent du JSX au niveau du module) : le rendez-vous est
// donc importé après, dans main()
(globalThis as { React?: typeof React }).React = React;
let Rendezvous: typeof import("@/components/accueil/Rendezvous").Rendezvous;

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const compte = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const rendre = (d: AccueilData): string => {
  try {
    return renderToStaticMarkup(<Rendezvous d={d} />).replace(/&#x27;/g, "'");
  } catch (e) {
    console.log(e);
    return "";
  }
};
/** Les positions de ces repères dans le HTML, dans l'ordre donné ; -1 si l'un manque. */
const positions = (html: string, reperes: string[]) => reperes.map((r) => html.indexOf(r));
const croissant = (xs: number[]) => xs.every((x, i) => x >= 0 && (i === 0 || x > xs[i - 1]));

// ── Données d'exemple : une journée en cours (26/40), sans base ──
const NOW = new Date("2026-10-17T09:00:00Z");
const JOUR = "2026-10-17";
const defi = (format: TodayDaily["format"], status: TodayDaily["status"]): TodayDaily => ({
  format,
  status,
  day: JOUR,
  href: format === "cinq" ? "/defi/cinq" : "/defi",
  players: 14,
  playing: 2,
  topScore: format === "cinq" ? 5 : 27,
  questionCount: format === "cinq" ? 5 : 30,
  answered: 0,
  score: null,
  total: null,
  rank: null,
  seconds: null,
  deadline: null,
  closesAt: JOUR + "T22:00:00Z",
});
const exemple = (o: Partial<AccueilData> = {}): AccueilData => ({
  name: "Théo",
  hello: "Bonjour",
  dateLabel: "Samedi 17 octobre",
  dayKey: JOUR,
  hour: 11,
  examDaysLeft: 26,
  examDateLabel: "le 12 novembre 2026",
  streak: 7,
  serieEncre: null,
  serieReste: null,
  dayState: "fait",
  seenBefore: true,
  returning: false,
  daily: defi("trente", "todo"),
  cinq: defi("cinq", "todo"),
  vainqueur: { day: "2026-10-16", userId: "u2", name: "Inès B.", isMe: false, score: 29, total: 30, seconds: 1902, players: 14, tier: 3, placement: false, bannerUrl: null },
  reviewDuel: { id: "d1", opponentName: "Hugo P.", myScore: 19, theirScore: 22, total: 30, myDelta: -9, won: false, finishedAt: "2026-10-17T04:00:00Z" },
  nowIso: NOW.toISOString(),
  rating: { elo: 1312, gamesPlayed: 23, leaderboardRank: 7, last: { delta: 14, source: "duel" } },
  incomingDuel: null,
  demandesAmi: null,
  duNouveau: null,
  resume: {
    kind: "fiche",
    context: "Equity · fiche page 3",
    title: "Market Efficiency",
    done: 9,
    total: 15,
    progressLabel: "questions de la série",
    at: "2026-10-17T07:00:00Z",
    href: "/fiches/equity",
    cta: "Continuer le quiz",
    audio: null,
  },
  activity: { today: 26, days: [] },
  dailyGoal: 40,
  // l'objectif d'ici l'examen n'est lu que par « Ta progression », pas par le rendez-vous
  objectif: {} as AccueilData["objectif"],
  errors: { available: true, total: 12, answered: 184, bySubject: [], carnet: true },
  pointFaible: { libelle: "FSA", repere: "48 %", phrase: "", action: "atelier" },
  mockExam: null,
  topics: [],
  mastery: 54,
  masteryAvg: 49,
  ...o,
});

async function main() {
Rendezvous = (await import("@/components/accueil/Rendezvous")).Rendezvous;

console.log("# les trois infos principales, en grand et dans cet ordre");
{
  const html = rendre(exemple());
  check("l'accueil se rend sans erreur", html.length > 0);
  const ordre = positions(html, [`aria-label="${RDV.trente.nom}"`, `aria-label="${RDV.cinq.nom}"`, `aria-label="${RDV.traits.nom}"`]);
  check("Les 30 du jour, puis Les 5 du jour, puis Tes traits du jour (l'ordre du téléphone)", croissant(ordre), ordre.join(" < "));
  check("un seul bouton plein en haut de page (Rendre ma copie)", compte(html, /btn-primary/g) === 1 && /btn-primary[^>]*>Rendre ma copie/.test(html));
}

console.log("\n# l'anneau des traits du jour, sur téléphone comme sur ordinateur");
{
  const html = rendre(exemple());
  const anneaux = html.match(/<div data-leonard="anneau" class="([^"]*)"/g) ?? [];
  check("un seul anneau, dans la carte des traits", anneaux.length === 1, String(anneaux.length));
  check("il n'est caché à aucune taille d'écran", anneaux.length === 1 && anneaux[0].endsWith('class="self-center"'), anneaux[0] ?? "");
  const debut = html.indexOf(`aria-label="${RDV.traits.nom}"`);
  const carte = html.slice(debut, html.indexOf("</section>", debut));
  check("l'anneau est dans la carte des traits", carte.includes('data-leonard="anneau"'));
  check("plus de simple barre au téléphone (aucune jauge dans la carte des traits)", !carte.includes('role="progressbar"'));
}

console.log("\n# sans défi jouable : les traits prennent le héros, l'anneau suit le titre au téléphone");
{
  const html = rendre(exemple({ daily: null, cinq: null, dayState: "attente", incomingDuel: { id: "d2", from: "Inès B.", kind: "incoming" } }));
  check("l'accueil se rend sans les 30 ni les 5 du jour", html.length > 0 && html.includes(`aria-label="${RDV.traits.nom}"`));
  // un seul anneau par page : son masque SVG porte un id fixe (deux copies se le disputeraient)
  const anneaux = compte(html, /data-leonard="anneau"/g);
  check("un seul anneau, jamais en double", anneaux === 1, String(anneaux));
  const ordre = positions(html, ["<h1", 'data-leonard="anneau"', RDV.traits.gagner, "Inès B. te défie"]);
  check("ordre du téléphone : titre, anneau, bouton des traits, liste « Aujourd'hui »", croissant(ordre), ordre.join(" < "));
  check(
    "sur ordinateur, la liste en haut à droite et l'anneau dessous",
    /data-leonard="anneau" class="[^"]*md:col-start-2 md:row-start-2/.test(html) && /class="min-w-0 md:col-start-2 md:row-start-1"/.test(html),
  );
  check("aucune jauge à la place de l'anneau", !html.includes('role="progressbar"'));
}

console.log("\n# rien du Codex sur l'accueil");
{
  const html = rendre(exemple());
  for (const mot of ["Codex", "quête", "Quête", "récupérer", "Récupérer", "séance du jour", "Séance du jour", "La suite", "data-quete"]) {
    check(`aucun « ${mot} » à l'écran`, !html.includes(mot));
  }
  for (const f of ["app/dashboard/page.tsx", "components/DashboardView.tsx", "components/accueil/Rendezvous.tsx"]) {
    const src = readFileSync(f, "utf8");
    check(`${f} n'importe rien du Codex`, !/from "@\/(components|lib)\/codex\//.test(src));
  }
  const page = readFileSync("app/dashboard/page.tsx", "utf8");
  check("la page ne passe plus ni cérémonie ni séance à l'accueil", !/CodexAccueil|SeanceAccueil|codex=|seance=/.test(page));
}

console.log("\n# la suite, comme avant le Codex v3");
{
  const html = rendre(exemple());
  const suite = positions(html, [`aria-label="${RDV.traits.nom}"`, VAINQUEUR.sur, `aria-label="${RDV.reprise.titre}"`, "Hugo P.", RDV.rang.voir, RDV.liens.label, RDV.liens.pointFaible]);
  check("traits, vainqueur du jour, reprendre, duel, rang, liens (point faible compris)", croissant(suite), suite.join(" < "));
}

console.log(ko ? `\n${ko} KO` : "\nTout est bon.");
process.exit(ko ? 1 : 0);
}

void main();
