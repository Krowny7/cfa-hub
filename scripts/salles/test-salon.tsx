// Test de rendu du salon, des réglages et des pages d'entrée des Salles
// (react-dom/server, sans base, réseau ni navigateur) :
//   npx tsx --tsconfig tsconfig.json scripts/salles/test-salon.tsx
// Le salon (nom, code à partager, joueurs avec l'admin marqué, plus de 12 joueurs
// repliés), la vue de l'admin (réglages, bouton « Lancer la partie ») et celle d'un
// membre (« En attente du lancement », réglages de la dernière partie en lecture
// seule, rien pour lancer), le parcours des réglages (une question à la fois,
// valeurs par défaut, résumé, « Plus d'options », mocks et variantes), la carte
// peinte de S'affronter, les lignes de /salles, le champ de code et la route
// /salles dans la navigation.
import { SALLES } from "@/lib/voice-salles";
import { PresentsContext } from "@/components/salles/presence";
import "../codex/sans-css";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { CarteSalles } from "@/components/salles/CarteSalles";
import { FormCode, saisieCode } from "@/components/salles/FormCode";
import { FormCreer } from "@/components/salles/FormCreer";
import { LigneMaSalle, LigneSallePublique } from "@/components/salles/LigneSalle";
import { Reglages, ReglagesLecture, disponibles, reglagesDeDepart } from "@/components/salles/Reglages";
import { SalonView, type DonneesSalon } from "@/components/salles/SalonView";
import { activeSpace } from "@/lib/nav";
import { ROUTES } from "@/lib/codex/destinations";
import { paramsParDefaut } from "@/lib/salles/logique";
import type { MockDisponible, QuestionsDisponibles, SalleMembre, SalleMock, SalleParams, SalleSession } from "@/lib/salles/types";

(globalThis as { React?: typeof React }).React = React;

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const compte = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const routeur = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
const rendre = (el: React.ReactElement): string => {
  try {
    return renderToStaticMarkup(<AppRouterContext.Provider value={routeur}>{el}</AppRouterContext.Provider>).replace(/&#x27;/g, "'").replace(/[  ]/g, " ");
  } catch (e) {
    console.log(e);
    return "";
  }
};
const noop = async () => ({ ok: true as const });

const membre = (i: number, o: Partial<SalleMembre> = {}): SalleMembre => ({
  userId: `u${i}`,
  username: `Joueur ${i}`,
  avatarUrl: null,
  role: i === 0 ? "admin" : "membre",
  estAdmin: i === 0,
  elo: 1200 + i * 10,
  rejointLe: new Date(2026, 9, 30, 12, i).toISOString(),
  ...o,
});
const membres = (n: number) => Array.from({ length: n }, (_, i) => membre(i));

const PRECEDENTS: SalleParams = { type: "mixte", nombre: 20, source: "mocks", topics: ["quant", "derivatives"], difficulte: "difficile", temps: 30, partCalculs: 40 };
const session: SalleSession = {
  id: "s1",
  numero: 1,
  statut: "terminee",
  params: { ...PRECEDENTS, nbQuestions: 12, nbCalculs: 8 },
  nb: 20,
  temps: 30,
  pause: 5,
  startedAt: new Date(2026, 9, 30, 10).toISOString(),
  finAt: new Date(2026, 9, 30, 10, 12).toISOString(),
  index: 20,
  phase: "fin",
  nbVisibles: 20,
  nbFermees: 20,
  reponduCourante: 0,
  nbJoueurs: 8,
  chrono: "question",
  avancement: null,
};
const donnees = (n: number, moi: string, extra: Partial<DonneesSalon> = {}): DonneesSalon => ({
  salle: { id: "00000000-0000-4000-8000-000000000001", nom: "Les révisions du jeudi", description: "Quant et Fixed Income.", code: "K7MX2Q", publique: true, adminId: "u0", createdAt: new Date().toISOString() },
  moi: { userId: moi, estAdmin: moi === "u0" },
  nbMembres: n,
  membres: membres(n),
  session: null,
  historique: [],
  ...extra,
});

console.log("# le salon");
{
  const html = rendre(<SalonView donnees={donnees(8, "u0")} reglages={<Reglages onLancer={noop} />} />);
  check("le nom de la salle en titre, son kicker", html.includes('class="nomSalle">Les révisions du jeudi</h1>') && html.includes("S'affronter · Salon"));
  check("publique : l'étiquette « Salle publique », 8 joueurs, l'admin nommé", html.includes("Salle publique") && html.includes("<b>8</b> joueurs") && html.includes("Admin de la salle <b>Joueur 0</b>"));
  check("le code en grand, avec son tiret (K7M-X2Q), et ses deux boutons de copie", html.includes(">K7M-X2Q<") && html.includes("Copier le code") && html.includes("Copier le lien"));
  check("la liste des joueurs : 8 lignes, l'admin marqué d'une couronne, toi surligné", compte(html, /<li class="membre[ "]/g) === 8 && compte(html, /class="couronne"/g) === 1 && compte(html, /membreMoi/g) === 1 && html.includes(">toi<"));
  check("8 joueurs : pas de bouton « Voir les … autres »", !html.includes("autres"));
  check("l'admin : le formulaire de réglages et « Lancer la partie »", html.includes("Réglages de la partie") && html.includes("Lancer la partie") && !html.includes("En attente du lancement"));
  check("le pied : Quitter, rendre privée, supprimer", html.includes("Quitter la salle") && html.includes("Rendre privée") && html.includes("Supprimer la salle"));

  const seul = rendre(<SalonView donnees={donnees(1, "u0")} reglages={<Reglages onLancer={noop} />} />);
  check("salon vide (toi seul) : 1 joueur, l'admin, les réglages", seul.includes("<b>1</b> joueur<") && compte(seul, /<li class="membre[ "]/g) === 1 && seul.includes("Lancer la partie"));

  const foule = rendre(<SalonView donnees={donnees(30, "u3")} />);
  check("30 joueurs : les 12 premiers, « Voir les 18 autres », sans limite de membres", compte(foule, /<li class="membre[ "]/g) === 12 && foule.includes("Voir les 18 autres") && foule.includes("<b>30</b> joueurs"));

  const prive = rendre(<SalonView donnees={donnees(3, "u1", { salle: { ...donnees(3, "u1").salle, publique: false } })} />);
  check("privée : l'étiquette « Salle privée »", prive.includes("Salle privée") && !prive.includes("Salle publique") && !prive.includes("Rendre privée") && !prive.includes("Supprimer la salle"));
}

console.log("# la vue d'un membre");
{
  const sans = rendre(<SalonView donnees={donnees(8, "u3")} />);
  check("un membre : « En attente du lancement », aucun bouton pour lancer, pas de formulaire", sans.includes("En attente du lancement") && !sans.includes("Lancer la partie") && !sans.includes('aria-label="Réglages de la partie"') && !sans.includes("Rendre privée"));
  check("sans partie passée : la phrase d'attente des réglages", sans.includes("Les réglages s'affichent ici dès que l'admin lance la partie."));
  const avec = rendre(
    <SalonView
      donnees={donnees(8, "u3", {
        session,
        historique: [{ sessionId: "s1", numero: 1, nb: 20, params: session.params, startedAt: session.startedAt, finAt: session.finAt, nbJoueurs: 8, gagnant: { userId: "u1", username: "Joueur 1", points: 14820 }, moi: { rang: 3, points: 11000 } }],
      })}
    />,
  );
  check("après une partie : ses réglages en lecture seule", avec.includes("Dernière partie") && avec.includes("<dt>Ce qu'on joue</dt><dd>Questions et calculs</dd>") && avec.includes("Questions d'examen") && avec.includes("Quant, Derivatives") && avec.includes("<dd>30 s</dd>"));
  check("l'historique : la dernière partie, son gagnant et ton rang", avec.includes("Partie 1") && avec.includes("Joueur 1 gagne avec 14 820 points") && avec.includes("Tu finis 3e sur 8"));
  check("lecture seule : le chrono par question", avec.includes("<dt>Chrono</dt><dd>Par question · correction après chaque question</dd>") && avec.includes("<dt>Temps par question</dt>"));
  const lectureGlobale = rendre(<ReglagesLecture params={{ ...PRECEDENTS, chrono: "global" }} />);
  check("lecture seule, chrono global : le mode, le temps moyen et le chrono total", lectureGlobale.includes("<dt>Chrono</dt><dd>Global · un seul chrono, correction à la fin, comme les 30 du jour</dd>") && lectureGlobale.includes("<dt>Temps moyen par question</dt><dd>30 s</dd>") && lectureGlobale.includes("Chrono total : 10 min"));
  const lecture = rendre(<ReglagesLecture params={paramsParDefaut()} />);
  check("lecture seule, réglages par défaut : toutes les matières, difficulté mélangée, aucun champ", lecture.includes("Toutes les matières") && lecture.includes("Mélangé") && !lecture.includes("<input") && !lecture.includes("<button"));
}

console.log("# les réglages de l'admin");
{
  const html = rendre(<Reglages onLancer={noop} />);
  check("par défaut : banque complète, questions, 10 au total, difficulté mélangée, 90 s", /aria-checked="true"[^>]*><b>Banque complète</.test(html) && /aria-checked="true"[^>]*><b>Questions</.test(html) && /value="10"/.test(html) && /aria-checked="true"[^>]*><b>Mélangé</.test(html) && /aria-checked="true"[^>]*><b>90 s</.test(html));
  check("une question à la fois : trois étapes dans l'ordre (Source, Matières, Combien), seule la première visible", compte(html, /role="tab"/g) === 3 && compte(html, /role="tabpanel"/g) === 3 && compte(html, /role="tabpanel"[^>]*hidden=""/g) === 2 && html.indexOf(">Source<") < html.indexOf(">Matières<") && html.indexOf(">Matières<") < html.indexOf(">Combien<") && html.includes("D'où viennent les questions ?"));
  check("l'étape ouverte est un onglet d'encre, comme ceux du Classement général", /role="tab" aria-selected="true"[^>]*class="onglet rl-encre encre"[^>]*data-palette=/.test(html) && compte(html, /aria-selected="true"/g) === 1);
  check("quatre sources : banque complète, questions d'examen, mock officiel, calculs", ["Banque complète", "Questions d'examen", "Mock exam officiel", "Calculs"].every((n) => html.includes(`<b>${n}</b>`)));
  check("les 10 matières, toutes cochées", compte(html, /type="checkbox"/g) === 10 && compte(html, /checked=""/g) === 10 && html.includes("Toutes les matières"));
  check("quatre sources, deux chronos, sept temps, quatre difficultés, deux types", compte(html, /role="radio"/g) === 4 + 2 + 7 + 4 + 2);
  check("les rounds : une seule partie par défaut, le nombre se tape", html.includes(">Rounds<") && /value="1"/.test(html) && compte(html, /inputMode="numeric"|inputmode="numeric"/g) === 2);
  check("le rythme et le reste dans « Plus d'options », replié, avec le réglage en cours", /<details class="options"><summary/.test(html) && html.includes("Plus d'options") && html.includes("Chrono global · 90 s") && html.indexOf("Plus d'options") < html.indexOf("<b>Global</b>") && html.indexOf("Plus d'options") < html.indexOf("<b>Facile</b>"));
  check("le chrono : « Global » coché par défaut (correction à la fin, comme les 30 du jour), « Par question » proposé", /aria-checked="true"[^>]*><b>Global<\/b><span>Un seul chrono, correction à la fin, comme les 30 du jour/.test(html) && /aria-checked="false"[^>]*><b>Par question<\/b><span>Correction après chaque question/.test(html) && html.includes("Temps moyen par question"));
  check("le nombre de questions n'a pas de plafond : plus de curseur à 50", !/type="range"[^>]*max="50"/.test(html));
  check("pas de part de calculs avec des questions seules", !html.includes("Part des calculs"));
  check("le résumé après les étapes et les options, et le chrono total (10 × 90 s = 15 min)", html.includes("10 questions · banque complète · toutes les matières · difficulté mélangée · chrono global 15 min") && html.indexOf('class="barre"') > html.indexOf("</details>") && html.includes("Chrono total : 15 min") && !html.includes("Durée estimée"));
  const parQuestion = rendre(<Reglages initial={{ chrono: "question" }} onLancer={noop} />);
  check("dernière partie par question : « Par question » coché, la durée estimée (10 × 95 s − 5 s + 30 s = 16 min 15 s)", /aria-checked="true"[^>]*><b>Par question<\/b>/.test(parQuestion) && parQuestion.includes("Temps par question") && !parQuestion.includes("Temps moyen par question") && parQuestion.includes("difficulté mélangée · 90 s") && parQuestion.includes("Durée estimée : 16 min 15 s"));
  check("reglagesDeDepart : chrono global sans partie précédente ou pour une partie d'avant le réglage, sinon celui de la dernière partie", reglagesDeDepart(null).chrono === "global" && reglagesDeDepart({ type: "questions", nombre: 10 }).chrono === "global" && reglagesDeDepart({ chrono: "question" }).chrono === "question" && reglagesDeDepart({ chrono: "global" }).chrono === "global" && reglagesDeDepart({ nombre: 999 }).chrono === "global");
  check("le bouton « Lancer la partie », un bouton d'encre (désactivé seulement sans matière ou en partie)", html.includes("Lancer la partie") && !/<button[^>]*disabled[^>]*>(?:(?!<\/button>)[^])*Lancer la partie/.test(html) && /<button type="submit" class="rl-encre encre bouton[^"]*"[^>]*>(?:(?!<\/button>)[^])*Lancer la partie/.test(html));

  const mixte = rendre(<Reglages initial={PRECEDENTS} onLancer={noop} />);
  check("reprise de la dernière partie : mixte, 20, examens blancs, 2 matières, difficile, 30 s", /aria-checked="true"[^>]*><b>Les deux</.test(mixte) && /value="20"/.test(mixte) && /aria-checked="true"[^>]*><b>Questions d'examen</.test(mixte) && compte(mixte, /checked=""/g) === 2 && /aria-checked="true"[^>]*><b>Difficile</.test(mixte) && /aria-checked="true"[^>]*><b>30 s</.test(mixte));
  const global = rendre(<Reglages initial={{ ...PRECEDENTS, chrono: "global" }} onLancer={noop} />);
  check("chrono global : coché, « Temps moyen par question », le chrono total (20 × 30 s = 10 min)", /aria-checked="true"[^>]*><b>Global</.test(global) && global.includes("Temps moyen par question") && global.includes("Chrono total : 10 min (20 × 30 s)") && !global.includes("Durée estimée"));
  check("chrono global : le résumé le dit, la règle des points aussi (1 000 par bonne réponse)", global.includes("20 questions et calculs · mocks · 2 matières · difficile · chrono global 10 min") && global.includes("1 000 points par bonne réponse") && !global.includes("De 500 à 1 000 points"));
  check("par question : la règle des points suit (de 500 à 1 000)", parQuestion.includes("De 500 à 1 000 points par bonne réponse") && !parQuestion.includes("1 000 points par bonne réponse ;"));
  check("mixte : le curseur de la part des calculs (40 % → 8 calculs, 12 questions)", mixte.includes("Part des calculs") && />40 <small>%/.test(mixte) && mixte.includes("8 calculs · 12 questions"));

  const calculs = rendre(<Reglages initial={{ ...PRECEDENTS, type: "calculs", partCalculs: 100 }} onLancer={noop} />);
  check("calculs seuls : une source à part entière, sans le mélange questions et calculs", /aria-checked="true"[^>]*><b>Calculs</.test(calculs) && !calculs.includes("<b>Les deux</b>") && !calculs.includes("Part des calculs") && calculs.includes("20 calculs"));

  const dispos: QuestionsDisponibles[] = [
    { topic: "quant", total: 30, facile: 10, moyen: 12, difficile: 8 },
    { topic: "derivatives", total: 4, facile: 1, moyen: 1, difficile: 2 },
  ];
  check("disponibles : somme des matières cochées à la difficulté choisie (difficile : 8 + 2)", disponibles(dispos, ["quant", "derivatives"], "difficile") === 10 && disponibles(dispos, ["quant"], "melange") === 30 && disponibles(null, ["quant"], "melange") === null);
  const peu = rendre(<Reglages initial={{ type: "questions", nombre: 20, topics: ["quant", "derivatives"], difficulte: "difficile" }} onLancer={noop} demoDispos={{ banque: dispos }} />);
  check("trop peu de questions : le nombre se cale sur ce qui est disponible (10 pour 20 demandées)", /value="10"/.test(peu) && peu.includes("10 questions sur 10 disponibles"));
  const effectifs = rendre(<Reglages onLancer={noop} demoDispos={{ banque: dispos }} />);
  check("l'effectif de chaque matière à côté de sa case", effectifs.includes('class="topicDispo" title="30">30<') && effectifs.includes('title="4">4<'));

  const rouverts = reglagesDeDepart({ notions: ["fsa:3"], concepts: ["EPS"] });
  check("reglagesDeDepart : les réglages rouverts gardent le choix par notion", rouverts.notions?.[0] === "fsa:3" && rouverts.concepts?.[0] === "EPS" && !("notions" in reglagesDeDepart(null)));
  const depart = reglagesDeDepart({ nombre: 999, type: "mixte" });
  check("des réglages invalides retombent sur les valeurs par défaut", depart.nombre === 10 && depart.type === "questions");
  const sans = rendre(<Reglages initial={{ topics: [] }} onLancer={noop} />);
  check("une dernière partie sans matière retombe sur toutes les matières (jamais zéro case)", compte(sans, /checked=""/g) === 10);
  const desactive = rendre(<Reglages onLancer={noop} desactive />);
  check("partie en cours : le bouton est désactivé", /<button type="submit" disabled="" class="rl-encre encre bouton[^"]*"[^>]*>(?:(?!<\/button>)[^])*Lancer la partie/.test(desactive));
}

console.log("# les mocks officiels et leurs variantes");
{
  const MOCKS: MockDisponible[] = [
    { examen: "Mock A — Session 1", topic: "ethics", base: 27, variantes: 54 },
    { examen: "Mock A — Session 1", topic: "quant", base: 63, variantes: 126 },
    { examen: "Mock A — Session 2", topic: "equity", base: 90, variantes: 0 },
  ];
  const surMock = (m: Partial<SalleMock> = {}, dispos: MockDisponible[] = MOCKS) =>
    rendre(<Reglages initial={{ type: "questions", source: "examen", temps: 90, mock: { examens: ["Mock A — Session 1"], version: "base", complet: true, ordre: "examen", ...m } }} demoMocks={dispos} onLancer={noop} />);
  const onglet = (nom: string) => new RegExp(`role="tab"[^>]*>(?:<canvas[^>]*></canvas>)?${nom}<`);

  const banque = rendre(<Reglages onLancer={noop} />);
  check("hors d'un mock, ni version ni variantes à choisir", !banque.includes("<b>Variantes</b>") && !onglet("Version").test(banque));

  const base = surMock();
  check("un mock : quatre étapes (Source, Version, Sessions, Combien), une seule visible", compte(base, /role="tab"/g) === 4 && ["Source", "Version", "Sessions", "Combien"].every((n) => onglet(n).test(base)) && !onglet("Matières").test(base) && compte(base, /role="tabpanel"[^>]*hidden=""/g) === 3);
  check("origine, variantes ou les deux, avec leurs nombres réels", /<b>D'origine<\/b>(?:(?!<\/button>)[^])*180 questions · 2 sessions/.test(base) && /<b>Variantes<\/b>(?:(?!<\/button>)[^])*180 questions · 1 session</.test(base) && /<b>Les deux<\/b>(?:(?!<\/button>)[^])*270 questions · 1 session</.test(base));
  check("questions d'origine : toutes les sessions s'ouvrent, avec leur nombre", !base.includes("Pas de variante") && base.includes('class="topicNom">Mock A · Session 2</span><span class="topicDispo">90 questions<'));
  check("le résumé d'un mock : session, version, ordre, chrono du jour J", base.includes("90 questions (tout) · Mock A · S1 · questions d'origine · ordre de l'examen · chrono global 2 h 15"));

  const variantes = surMock({ version: "variantes" });
  const session2Fermee = /<label[^>]*data-off="1"[^>]*><input[^>]*disabled=""[^>]*\/><span class="topicNom">Mock A · Session 2<\/span><span class="topicDispo">Pas de variante</;
  check("variantes : la session sans variante le dit et se désactive", session2Fermee.test(variantes));
  check("variantes : la session qui en a affiche leur nombre réel", variantes.includes('class="topicNom">Mock A · Session 1</span><span class="topicDispo">180 variantes<'));
  check("variantes : le résumé compte les variantes seules (180 × 90 s = 4 h 30)", variantes.includes("180 questions (tout) · Mock A · S1 · variantes · ordre de l'examen · chrono global 4 h 30"));
  const lesDeux = surMock({ version: "tout" });
  check("les deux : origine et variantes de la même session, la session sans variante reste fermée", session2Fermee.test(lesDeux) && lesDeux.includes(">90 + 180 variantes<") && lesDeux.includes("270 questions (tout) · Mock A · S1 · origine + variantes"));

  const perdue = surMock({ version: "variantes", examens: ["Mock A — Session 2"] });
  check("variantes sur une session qui n'en a pas : la sélection passe sur celle qui en a", perdue.includes("180 questions (tout) · Mock A · S1 · variantes"));
  const melees = surMock({ version: "variantes", examens: ["Mock A — Session 1", "Mock A — Session 2"] });
  check("la session sans variante ne compte pas dans une sélection de variantes", melees.includes("180 questions (tout) · Mock A · S1 · variantes") && !melees.includes("Mock A · S2"));

  const sansVariante = surMock({ version: "variantes" }, MOCKS.map((d) => ({ ...d, variantes: 0 })));
  check("aucune variante nulle part : le choix le dit, se désactive, et le résumé revient à l'origine", /<button[^>]*disabled=""[^>]*><b>Variantes<\/b>(?:(?!<\/button>)[^])*Pas encore de variantes/.test(sansVariante) && /<button[^>]*disabled=""[^>]*><b>Les deux<\/b>/.test(sansVariante) && sansVariante.includes("questions d'origine") && /aria-checked="true"[^>]*><b>D'origine</.test(sansVariante));
  check("les matières d'un mock : dans « Plus d'options », celles sans question se désactivent", base.indexOf("Plus d'options") < base.indexOf("Dans quel ordre") && /<label[^>]*data-off="1"[^>]*><input[^>]*disabled=""[^>]*\/><span class="topicNom">/.test(base));
  const partie = surMock({ complet: false });
  check("une partie du mock : le nombre se tape, tirées au hasard", compte(partie, /inputMode="numeric"|inputmode="numeric"/g) === 2 && partie.includes("Tirées au hasard"));
  const lecture = rendre(<ReglagesLecture params={{ ...paramsParDefaut(), source: "examen", temps: 90, chrono: "global", nombre: 180, mock: { examens: ["Mock A — Session 1"], version: "variantes", complet: true, ordre: "melange" } }} />);
  check("lecture seule d'une partie de variantes : la session, la version, l'ordre", lecture.includes("<dd>Mock A · Session 1</dd>") && lecture.includes("<dt>Version</dt><dd>Variantes</dd>") && lecture.includes("<dd>Mélangé</dd>"));
}

console.log("# entrer dans une salle");
{
  check("saisieCode : majuscules, tiret après trois caractères, six au plus", saisieCode("k7mx2q") === "K7M-X2Q" && saisieCode("k7m-x2q99") === "K7M-X2Q" && saisieCode("k7") === "K7" && saisieCode("") === "");
  const html = rendre(<FormCode initial="k7mx2q" />);
  check("le champ de code : pré-rempli depuis le lien (K7M-X2Q), libellé, bouton", html.includes('value="K7M-X2Q"') && html.includes("Code de la salle (6 caractères)") && html.includes("Rejoindre"));
  const creer = rendre(<FormCreer />);
  check("créer : nom, privée par défaut, publique au choix, description facultative", creer.includes("Nom de la salle") && /aria-checked="true"[^>]*><b>[^]*?Privée/.test(creer) && /aria-checked="false"[^>]*><b>[^]*?Publique/.test(creer) && creer.includes("Créer la salle"));
  check("/salles appartient à l'espace S'affronter, avec ses pages", activeSpace("/salles") === "classement" && activeSpace("/salles/abc") === "classement" && activeSpace("/salles/rejoindre") === "classement");
  check("les routes connues : /salles, /salles/[id], /salles/rejoindre", ROUTES.has("/salles") && ROUTES.has("/salles/[id]") && ROUTES.has("/salles/rejoindre"));
  const publique = rendre(<ul><LigneSallePublique salle={{ id: "p1", nom: "Quant", description: null, adminUsername: "Léa", nbMembres: 3, nbPresents: 3, enCours: true, derniereActivite: "", dejaMembre: false }} demo /></ul>);
  check("/salles : une salle publique (nom, joueurs, admin, partie en cours, Rejoindre)", publique.includes("Quant") && publique.includes("3 présents · par Léa") && publique.includes("Partie en cours") && publique.includes('aria-label="Rejoindre la salle Quant"'));
  const miennePublique = rendre(<ul><LigneSallePublique salle={{ id: "p2", nom: "Fixed", description: null, adminUsername: null, nbMembres: 1, nbPresents: 1, enCours: false, derniereActivite: "", dejaMembre: true }} /></ul>);
  check("/salles : déjà membre, « Ouvrir » mène au salon", miennePublique.includes('href="/salles/p2"') && miennePublique.includes("Salon ouvert") && !miennePublique.includes("Rejoindre"));
  const mienne = rendre(<ul><LigneMaSalle salle={{ id: "m1", nom: "Les miens", description: null, code: "K7MX2Q", publique: false, estAdmin: true, nbMembres: 2, nbPresents: 2, enCours: false, derniereActivite: "" }} /></ul>);
  check("/salles : tes salles (joueurs, privée, code, admin, Ouvrir)", mienne.includes("2 présents · Privée · K7M-X2Q · Admin") && mienne.includes('href="/salles/m1"'));
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
console.log("# la peau du site");
{
  const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
  const css = lire("components/salles/Salles.module.css") + lire("components/salles/Partie.module.css");
  check("plus de police Barlow Condensed (ni dans le CSS, ni dans le layout), plus de biseaux", !/font-hud|Barlow|polygon\(/.test(css) && !/Barlow|font-hud/.test(lire("app/layout.tsx")));
  check("les titres et gros chiffres en Dela Gothic One (--font-brand), le code et les petits chiffres en Geist Mono (--font-mono)", css.includes("var(--font-brand)") && css.includes("var(--font-mono"));
  check("la police du logo cède la place à Geist en mode discret", css.includes('html[data-discreet="1"]) .jetons'));
  const peau = lire("components/salles/Salles.module.css");
  const horsJetons = peau.slice(peau.indexOf("/* ——— la scène"), peau.indexOf("/* ——— sur S'affronter")).replace("border: 1px solid #000;", "");
  check("hors des jetons et de la carte peinte, aucune couleur écrite en dur : un seul style de carte et de bouton", peau.includes("/* ——— la scène") && !/rgba\(|#[0-9a-f]{3,8}\b/i.test(horsJetons));
  const jetonsEncre = [...peau.slice(peau.indexOf(".jetons {"), peau.indexOf(":global(html[data-discreet")).matchAll(/(--sl-(?!brand|mono)[a-z0-9-]+):\s/g)].map((m) => m[1]);
  const jetonsPapier = peau.slice(peau.indexOf('.jetons[data-sobre="1"] {'), peau.indexOf(":global(html[data-theme"));
  check("le papier du site remappe chaque jeton de l'encre noire", jetonsEncre.length > 20 && jetonsEncre.every((j) => jetonsPapier.includes(`${j}:`)), jetonsEncre.filter((j) => !jetonsPapier.includes(`${j}:`)).join(","));

  const entree = rendre(<CarteSalles salles={{ pret: true }} demo />);
  check("la carte d'entrée : la peinture, le sceau noir, un seul bouton d'encre, vers /salles", entree.includes("/illustrations/salles-entree.webp") && entree.includes('class="sceauNoir"') && compte(entree, /class="rl-encre encre bouton/g) === 1 && /<a[^>]*href="\/salles"[^>]*>(?:(?!<\/a>)[^])*Voir les salles/.test(entree) && !entree.includes("btnPrimaire"));
  check("la carte d'entrée : le champ de code, libellé pour les lecteurs d'écran", entree.includes('id="cl-salles-code"') && entree.includes('class="sr-only"') && entree.includes("Rejoindre"));
  check("la carte d'entrée : aucune liste de salles", !entree.includes("<ul") && !entree.includes("<li") && !entree.includes("Salles ouvertes à tous") && !entree.includes("Tes salles"));
  const bientot = rendre(<CarteSalles salles={{ pret: false }} />);
  check("sans la migration : la peinture et une ligne, ni bouton ni champ", bientot.includes('data-salles="bientot"') && bientot.includes("/illustrations/salles-entree.webp") && bientot.includes("Les Salles arrivent bientôt") && !bientot.includes("<a ") && !bientot.includes("<input"));
  const salon = rendre(<SalonView donnees={donnees(3, "u0")} reglages={<Reglages onLancer={noop} />} />);
  check("seuls les joueurs présents s'affichent, et on se voit toujours soi-même", (() => {
    const html = rendre(
      <PresentsContext.Provider value={new Set(["u1"])}>
        <SalonView donnees={donnees(3, "u0")} reglages={null} />
      </PresentsContext.Provider>,
    );
    return (html.match(/<b>2<\/b>/g) ?? []).length >= 1 && !html.includes("<b>3</b>");
  })());
  check("une salle sans personne est inactive", rendre(<ul><LigneMaSalle salle={{ id: "m9", nom: "Vide", description: null, code: "ABC123", publique: false, estAdmin: false, nbMembres: 4, nbPresents: 0, enCours: false, derniereActivite: "" }} /></ul>).includes(SALLES.inactive));
  check("la salle d'attente a son chat dès qu'on est deux, pas quand on est seul", salon.includes('aria-labelledby="salle-chat"') && !rendre(<SalonView donnees={donnees(1, "u0")} reglages={<Reglages onLancer={noop} />} />).includes('aria-labelledby="salle-chat"'));
  check("le salon se pose sur le papier du site, l'écran de jeu par question garde son encre", salon.includes('data-salon="attente" data-sobre="1"') && !rendre(<SalonView donnees={donnees(3, "u0", { session: { ...session, statut: "en_cours", phase: "question" } })} partie={<p>Jeu</p>} />).includes("data-sobre"));
  const enJeu = rendre(<SalonView donnees={donnees(3, "u0", { session: { ...session, statut: "en_cours", phase: "question", chrono: "global" } })} partie={<p>Jeu</p>} />);
  check("le chrono global : le papier, une simple ligne, ni en-tête ni pied", enJeu.includes('data-sobre="1"') && !enJeu.includes("nomSalle") && !enJeu.includes("Quitter la salle"));
}

process.exit(ko ? 1 : 0);
