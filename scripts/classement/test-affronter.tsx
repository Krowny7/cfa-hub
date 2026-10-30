// Test de rendu de la page S'affronter (disposition A « L'arène »),
// react-dom/server, sans base, réseau ni navigateur :
//   npx tsx --tsconfig tsconfig.json scripts/classement/test-affronter.tsx
// L'ordre des blocs, le diptyque, la carte Duels fusionnée, les onglets du
// classement général (dont ?onglet=) et l'onglet Amis (liste, toi surligné,
// état vide). Les noms de classes des modules CSS sont rendus tels quels.
import "../codex/sans-css";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ClassementView } from "@/components/classement/ClassementView";
import type { AmiRow, BoardRow, ClassementData } from "@/components/classement/types";
import type { DuelSummary } from "@/lib/rating";

// le JSX des composants (tsconfig « preserve ») attend React en portée
(globalThis as { React?: typeof React }).React = React;

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const compte = (html: string, re: RegExp) => (html.match(re) ?? []).length;
/** Le diptyque « Ton rang | La Grande Salle » seul (le podium porte lui aussi un arc électrique). */
const diptyqueDe = (html: string) => html.slice(html.indexOf('aria-label="Ton rang et La Grande Salle"'), html.indexOf('id="cl-trouver"'));
/** Le panneau d'un onglet du classement général. */
const panneauDe = (html: string, cle: string) => html.slice(html.indexOf(`id="cl-panel-${cle}"`)).split('role="tabpanel"')[1] ?? "";
const routeur = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
const rendre = (el: React.ReactElement): string => {
  try {
    return renderToStaticMarkup(<AppRouterContext.Provider value={routeur}>{el}</AppRouterContext.Provider>).replace(/&#x27;/g, "'").replace(/[  ]/g, " ");
  } catch (e) {
    console.log(e);
    return "";
  }
};

const DAY = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * DAY).toISOString();
const ligne = (i: number, name: string, elo: number, isMe = false): BoardRow => ({
  userId: "u" + i,
  name,
  avatarUrl: null,
  elo,
  gamesPlayed: 20 + i,
  rank: i + 1,
  mastery: 60,
  lastDelta: i % 2 ? -5 : 8,
  isMe,
});
const board = [ligne(0, "Camille", 1742), ligne(1, "Hugo", 1618), ligne(2, "Léa", 1524), ligne(3, "Théo", 1512, true), ligne(4, "Nadia", 1497), ligne(5, "Karim", 1471)];
const duel = (id: string, p: Partial<DuelSummary>): DuelSummary => ({
  id,
  status: "finished",
  incoming: false,
  opponentId: "u1",
  opponentName: "Hugo",
  opponentAvatar: null,
  myScore: 22,
  theirScore: 19,
  myDelta: 18,
  won: true,
  createdAt: ago(2),
  finishedAt: ago(2),
  ...p,
});
const attente = { myScore: null, theirScore: null, myDelta: null, won: null, finishedAt: null };
const ami = (b: BoardRow): AmiRow => ({ userId: b.userId, name: b.name, avatarUrl: null, elo: b.elo, gamesPlayed: b.gamesPlayed, rank: b.rank, mastery: b.mastery, isMe: b.isMe });
const amis: AmiRow[] = [board[1], board[2], board[3], board[4], board[5]].map(ami);

const data: ClassementData = {
  me: { elo: 1512, gamesPlayed: 23, mastery: 61, leaderboardRank: 4, totalPlayers: 37 },
  history: [
    { id: "e0", source: "duel", refId: null, eloBefore: 1466, eloAfter: 1480, delta: 14, createdAt: ago(3) },
    { id: "e1", source: "duel", refId: null, eloBefore: 1480, eloAfter: 1512, delta: 32, createdAt: ago(1) },
  ],
  board,
  meRow: null,
  exam: {
    id: "x1",
    title: "Examen",
    scheduledAt: new Date(Date.now() + 8 * DAY).toISOString(),
    durationMinutes: 135,
    questionCount: 90,
    status: "open",
    registered: false,
    registrants: 14,
    windowOpen: false,
    windowEnd: new Date(Date.now() + 10 * DAY).toISOString(),
  },
  pastExams: [],
  openDuels: [duel("d1", { status: "active", ...attente }), duel("d2", { status: "pending", opponentId: "u5", opponentName: "Karim", ...attente })],
  recentDuels: [duel("d3", {}), duel("d4", { finishedAt: ago(1) }), duel("d5", { finishedAt: ago(30) })],
  amis: [...amis],
};

console.log("# la page");
{
  const html = rendre(<ClassementView data={data} />);
  check("en-tête : « S'affronter · Finance », le titre, plus de pastilles de rang par domaine", html.includes("S'affronter · Finance") && html.includes("Se mesurer aux autres") && !html.includes("Tes rangs par domaine"));
  const ordre = ["Ton rang et La Grande Salle", 'id="cl-trouver"', 'id="cl-salles"', 'id="cl-tableau"'].map((x) => html.indexOf(x));
  check("l'ordre : le diptyque, la bande Trouver un adversaire, la carte Les Salles, Classement général", ordre.every((x) => x > 0) && ordre.every((x, i) => i === 0 || x > ordre[i - 1]), ordre.join(" < "));
  check("le diptyque : « La Grande Salle » d'abord (la pièce maîtresse), puis la carte du duel (repère Léonard)", html.includes('data-leonard="rang"') && html.indexOf('aria-label="La Grande Salle"') < html.indexOf('data-leonard="rang"'));
  check("la bande de recherche : un formulaire vers /people, le champ q, une liste de suggestions", html.includes('action="/people"') && html.includes('name="q"') && html.includes('role="search"') && html.includes('role="combobox"') && html.includes('aria-controls="cl-trouver-liste"'));
  check("la carte du duel : ton ELO en haut, la peinture des duels, « Lancer un duel » vers /duel", html.includes("classement-duels") && /1\s?512 <small>ELO<\/small>/.test(html) && html.includes("Lancer un duel") && html.includes('href="/duel"'));
  check("la carte du duel : le titre « Duels » et sa phrase sur la peinture", html.includes(">Duels</h3>") && html.includes("Mesure-toi à un autre joueur"));
  check("la carte du duel : plus d'Autour de toi ni de phrase du rival", !html.includes("Autour de toi") && !html.includes("devant toi"));
  check("plus de carte « Duels » (en cours, à revoir) : retirée à la demande de l'utilisateur", !html.includes('id="cl-duels"') && !html.includes("Tous tes duels"));
  check("La Grande Salle : l'examen, ses inscrits, le bouton d'inscription", html.includes("Je m'inscris") && html.includes("14 inscrits") && html.includes("L'examen classé"));
  check("l'arc électrique n'est là que s'il y a de l'enjeu (palier à 38 points, pas de défi reçu : non)", compte(diptyqueDe(html), /data-arc="contour"/g) === 0);
  const enjeu = rendre(<ClassementView data={{ ...data, openDuels: [duel("d9", { status: "pending", incoming: true, opponentName: "Hugo", ...attente })] }} />);
  check("l'arc électrique avec un défi reçu qui attend", compte(diptyqueDe(enjeu), /data-arc="contour"/g) === 1);
  check("l'emplacement du lot 2 est vide (ni rival, ni maîtres)", !html.includes("Ton plus grand rival") && !html.includes("Les maîtres de chaque matière"));
}


console.log("# la carte Les Salles");
{
  const bientot = rendre(<ClassementView data={data} />);
  check("sans la migration (pas de données) : une ligne dit que les salles arrivent, ni bouton ni champ", bientot.includes('data-salles="bientot"') && bientot.includes("Les Salles arrivent bientôt") && !bientot.includes("Créer une salle") && !bientot.includes("cl-salles-code"));
  const nonPret = rendre(<ClassementView data={{ ...data, salles: { pret: false, publiques: [], mes: [] } }} />);
  check("migration absente (pret faux) : le même message", nonPret.includes('data-salles="bientot"') && nonPret.includes("Les Salles arrivent bientôt"));
  const salles = {
    pret: true,
    publiques: [
      { id: "s1", nom: "Les révisions du jeudi", description: null, adminUsername: "Léa", nbMembres: 8, enCours: true, derniereActivite: ago(0), dejaMembre: false },
      { id: "s2", nom: "Quant en équipe", description: null, adminUsername: null, nbMembres: 1, enCours: false, derniereActivite: ago(1), dejaMembre: true },
    ],
    mes: [{ id: "s2", nom: "Quant en équipe", description: null, code: "K7MX2Q", publique: true, estAdmin: true, nbMembres: 1, enCours: false, derniereActivite: ago(1) }],
  };
  const pret = rendre(<ClassementView data={{ ...data, salles }} />);
  check("la carte prête : « Créer une salle » vers /salles", pret.includes('data-salles="pret"') && />\s*Créer une salle<\/a>/.test(pret) && pret.includes('href="/salles"'));
  check("le champ de code : un seul, 6 caractères au plus (maxlength 7 avec le tiret), libellé associé", pret.includes('id="cl-salles-code"') && pret.includes('maxLength="7"') || pret.includes('maxlength="7"'));
  check("les salles publiques : nom, joueurs, partie en cours ou salon ouvert", pret.includes("Les révisions du jeudi") && pret.includes("8 joueurs") && pret.includes("par Léa") && pret.includes("Partie en cours") && pret.includes("Salon ouvert") && pret.includes("1 joueur<"));
  check("« Rejoindre » sur une salle où l'on n'est pas, « Ouvrir » sur la sienne (lien vers le salon)", pret.includes('aria-label="Rejoindre la salle Les révisions du jeudi"') && pret.includes('href="/salles/s2"') && pret.includes("Ouvrir"));
  check("tes salles : la tienne, en lien", pret.includes("Tes salles") && pret.includes("1 salle<"));
  const vide = rendre(<ClassementView data={{ ...data, salles: { pret: true, publiques: [], mes: [] } }} />);
  check("aucune salle publique : une invitation à créer la première", vide.includes("Aucune salle publique pour l'instant"));
  const erreur = rendre(<ClassementView data={{ ...data, salles: { pret: true, erreur: true, publiques: [], mes: [] } }} />);
  check("lecture en échec : la carte tient, avec un message", erreur.includes("n'a pas pu être lue"));
}

console.log("# les onglets du classement général");
{
  const html = rendre(<ClassementView data={data} />);
  const onglets = [...html.matchAll(/id="cl-tab-([a-z]+)" type="button" role="tab" aria-selected="(true|false)"/g)].map((m) => m[1] + ":" + m[2]);
  check("cinq onglets, dans l'ordre, Classement actif", onglets.join(" ") === "classement:true amis:false courbe:false rangs:false regles:false", onglets.join(" "));
  check("le rôle tablist porte le nom du classement général", html.includes('role="tablist" aria-label="Le classement général"'));
  const panneaux = [...html.matchAll(/<div id="cl-panel-([a-z]+)"([^>]*)>/g)].map((m) => m[1] + (/\bhidden=""/.test(m[2]) ? ":hidden" : ""));
  check("cinq panneaux, seul celui du Classement est visible", panneaux.join(" ") === "classement amis:hidden courbe:hidden rangs:hidden regles:hidden", panneaux.join(" "));
  check("le Classement : le bandeau (37 joueurs), le podium, la liste", html.includes("37 joueurs · Finance") && html.includes('aria-label="Podium"') && html.includes('data-leonard="joueurs"'));
  check("plus de volets repliés en bas de page (Les 8 rangs, Comment ça marche sont des onglets)", !/<summary[^>]*>[^]*?Les 8 rangs/.test(html) && html.includes("Comment ça marche</button>"));
  const amisOuvert = rendre(<ClassementView data={data} tab="amis" />);
  check("?onglet=amis : l'onglet Amis est choisi, son panneau visible", /id="cl-tab-amis"[^>]*aria-selected="true"/.test(amisOuvert) && !/<div id="cl-panel-amis"[^>]*hidden/.test(amisOuvert));
  check("la courbe, les rangs et les règles ont leur contenu", html.includes("ELO depuis le") && html.includes("Huit rangs. Un seul sommet.") && html.includes("fixe ton palier"));
}

console.log("# l'onglet Amis");
{
  const html = rendre(<ClassementView data={data} tab="amis" />);
  check("l'en-tête : 4 amis (toi non compté), ta place parmi eux, « Ajouter un ami »", html.includes("<b>4 amis</b>") && /tu es <b>3e<\/b> parmi eux/.test(html) && html.includes("Ajouter un ami") && html.includes('href="/people"'));
  const lignes = [...panneauDe(html, "amis").split('id="cl-panel-courbe"')[0].matchAll(/aria-label="Défier ([^"]+)"/g)].map((m) => m[1]);
  check("un bouton « Défier » par ami, jamais sur toi", lignes.join(",") === "Hugo,Léa,Nadia,Karim", lignes.join(","));
  check("le bouton mène à /duel?adversaire=<id>", html.includes('href="/duel?adversaire=u1"') && html.includes('href="/duel?adversaire=u5"'));
  check("ta ligne est surlignée (aria-current) et dit « toi »", compte(html, /aria-current="true"/g) >= 1 && html.includes("· toi"));
  check("les colonnes : Place, Ami, Rang, ELO", ["Place", "Ami", "Rang", "ELO"].every((c) => html.includes(`<span>${c}</span>`)));
  check("les places générales (2e, 3e, 4e…)", html.includes(">2e<") && html.includes(">3e<") && html.includes(">4e<"));
  const vide = rendre(<ClassementView data={{ ...data, amis: [] }} tab="amis" />);
  check("sans ami : « Pas encore d'amis » et « Chercher un joueur » vers /people", vide.includes("Pas encore d'amis") && /href="\/people"[^>]*>[^]*Chercher un joueur/.test(vide));
  const nul = rendre(<ClassementView data={{ ...data, amis: null }} tab="amis" />);
  check("lecture indisponible (null) : le même état vide, la page tient", nul.includes("Pas encore d'amis"));
  const absent = rendre(<ClassementView data={{ ...data, amis: undefined }} tab="amis" />);
  check("champ absent : le même état vide", absent.includes("Pas encore d'amis"));
  const seul = rendre(<ClassementView data={{ ...data, amis: [ami(board[3])] }} tab="amis" />);
  check("seulement toi dans la liste : état vide (pas de liste d'un seul)", seul.includes("Pas encore d'amis"));
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
