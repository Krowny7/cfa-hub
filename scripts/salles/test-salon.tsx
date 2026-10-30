// Test de rendu du salon, des réglages et des pages d'entrée des Salles
// (react-dom/server, sans base, réseau ni navigateur) :
//   npx tsx --tsconfig tsconfig.json scripts/salles/test-salon.tsx
// Le salon (nom, code à partager, joueurs avec l'admin marqué, plus de 12 joueurs
// repliés), la vue de l'admin (réglages, bouton « Lancer la partie ») et celle d'un
// membre (« En attente du lancement », réglages de la dernière partie en lecture
// seule, rien pour lancer), le formulaire de réglages (valeurs par défaut,
// type / nombre / source / matières / difficulté / temps, part des calculs), le
// champ de code et la route /salles dans la navigation.
import "../codex/sans-css";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { CarteSalles } from "@/components/salles/CarteSalles";
import { FormCode, saisieCode } from "@/components/salles/FormCode";
import { FormCreer } from "@/components/salles/FormCreer";
import { Reglages, ReglagesLecture, disponibles, reglagesDeDepart } from "@/components/salles/Reglages";
import { SalonView, type DonneesSalon } from "@/components/salles/SalonView";
import { activeSpace } from "@/lib/nav";
import { ROUTES } from "@/lib/codex/destinations";
import { paramsParDefaut } from "@/lib/salles/logique";
import type { QuestionsDisponibles, SalleMembre, SalleParams, SalleSession } from "@/lib/salles/types";

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
  const lecture = rendre(<ReglagesLecture params={paramsParDefaut()} />);
  check("lecture seule, réglages par défaut : toutes les matières, difficulté mélangée, aucun champ", lecture.includes("Toutes les matières") && lecture.includes("Mélangé") && !lecture.includes("<input") && !lecture.includes("<button"));
}

console.log("# les réglages de l'admin");
{
  const html = rendre(<Reglages onLancer={noop} />);
  check("par défaut : questions, 10 au total, banque complète, difficulté mélangée, 45 s", /aria-checked="true"[^>]*><b>Questions</.test(html) && />10 <small>au total/.test(html) && /aria-checked="true"[^>]*><b>Banque complète</.test(html) && /aria-checked="true"[^>]*><b>Mélangé</.test(html) && /aria-checked="true"[^>]*><b>45 s</.test(html));
  check("les 10 matières, toutes cochées", compte(html, /type="checkbox"/g) === 10 && compte(html, /checked=""/g) === 10 && html.includes("Toutes les matières"));
  check("trois types, deux sources, quatre difficultés, sept temps", compte(html, /role="radio"/g) === 3 + 2 + 4 + 7);
  check("le curseur du nombre va de 5 à 50 par 5", /type="range"[^>]*min="5"[^>]*max="50"[^>]*step="5"/.test(html));
  check("pas de part de calculs avec des questions seules", !html.includes("Part des calculs"));
  check("le résumé et la durée estimée (10 × 50 s − 5 s + 8 s = 8 min 23 s)", html.includes("10 questions · banque complète · toutes les matières · difficulté mélangée · 45 s") && html.includes("Durée estimée : 8 min 23 s"));
  check("le bouton « Lancer la partie », un bouton d'encre (désactivé seulement sans matière ou en partie)", html.includes("Lancer la partie") && !/<button[^>]*disabled[^>]*>(?:(?!<\/button>)[^])*Lancer la partie/.test(html) && /<button type="submit" class="rl-encre encre bouton[^"]*"[^>]*>(?:(?!<\/button>)[^])*Lancer la partie/.test(html));

  const mixte = rendre(<Reglages initial={PRECEDENTS} onLancer={noop} />);
  check("reprise de la dernière partie : mixte, 20, examens blancs, 2 matières, difficile, 30 s", /aria-checked="true"[^>]*><b>Les deux</.test(mixte) && />20 <small>au total/.test(mixte) && /aria-checked="true"[^>]*><b>Questions d'examen</.test(mixte) && compte(mixte, /checked=""/g) === 2 && /aria-checked="true"[^>]*><b>Difficile</.test(mixte) && /aria-checked="true"[^>]*><b>30 s</.test(mixte));
  check("mixte : le curseur de la part des calculs (40 % → 8 calculs, 12 questions)", mixte.includes("Part des calculs") && />40 <small>%/.test(mixte) && mixte.includes("8 calculs · 12 questions"));

  const calculs = rendre(<Reglages initial={{ ...PRECEDENTS, type: "calculs", partCalculs: 100 }} onLancer={noop} />);
  check("calculs seuls : pas de choix de source (les calculs ne dépendent pas d'elle)", calculs.includes("exercices de calcul du site") && !calculs.includes("Questions d'examen</b>") && calculs.includes("20 calculs"));

  const dispos: QuestionsDisponibles[] = [
    { topic: "quant", total: 30, facile: 10, moyen: 12, difficile: 8 },
    { topic: "derivatives", total: 4, facile: 1, moyen: 1, difficile: 2 },
  ];
  check("disponibles : somme des matières cochées à la difficulté choisie (difficile : 8 + 2)", disponibles(dispos, ["quant", "derivatives"], "difficile") === 10 && disponibles(dispos, ["quant"], "melange") === 30 && disponibles(null, ["quant"], "melange") === null);
  const peu = rendre(<Reglages initial={{ type: "questions", nombre: 20, topics: ["quant", "derivatives"], difficulte: "difficile" }} onLancer={noop} demoDispos={{ banque: dispos }} />);
  check("trop peu de questions : l'admin est prévenu (10 pour 20 demandées)", peu.includes("Il n'y a que 10 questions pour ces réglages (tu en demandes 20)") && peu.includes("la partie sera plus courte"));
  const effectifs = rendre(<Reglages onLancer={noop} demoDispos={{ banque: dispos }} />);
  check("l'effectif de chaque matière à côté de sa case", effectifs.includes('class="topicDispo" title="30">30<') && effectifs.includes('title="4">4<'));

  const depart = reglagesDeDepart({ nombre: 999, type: "mixte" });
  check("des réglages invalides retombent sur les valeurs par défaut", depart.nombre === 10 && depart.type === "questions");
  const sans = rendre(<Reglages initial={{ topics: [] }} onLancer={noop} />);
  check("une dernière partie sans matière retombe sur toutes les matières (jamais zéro case)", compte(sans, /checked=""/g) === 10);
  const desactive = rendre(<Reglages onLancer={noop} desactive />);
  check("partie en cours : le bouton est désactivé", /<button type="submit" disabled="" class="rl-encre encre bouton[^"]*"[^>]*>(?:(?!<\/button>)[^])*Lancer la partie/.test(desactive));
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
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
console.log("# la peau du site");
{
  const lire = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
  const css = lire("components/salles/Salles.module.css") + lire("components/salles/Partie.module.css");
  check("plus de police Barlow Condensed (ni dans le CSS, ni dans le layout), plus de biseaux", !/font-hud|Barlow|polygon\(/.test(css) && !/Barlow|font-hud/.test(lire("app/layout.tsx")));
  check("les titres et gros chiffres en Dela Gothic One (--font-brand), le code et les petits chiffres en Geist Mono (--font-mono)", css.includes("var(--font-brand)") && css.includes("var(--font-mono"));
  check("la police du logo cède la place à Geist en mode discret", css.includes('html[data-discreet="1"]) .jetons'));
  const entree = rendre(<CarteSalles salles={{ pret: true, publiques: [{ id: "p1", nom: "Quant", description: null, adminUsername: "Léa", nbMembres: 3, enCours: false, derniereActivite: "", dejaMembre: false }], mes: [] }} demo />);
  check("la carte d'entrée : le sceau et les boutons d'encre de S'affronter (Créer, Rejoindre), plus de bouton orange plat", compte(entree, /class="rl-encre encre sceau/g) === 1 && compte(entree, /class="rl-encre encre bouton/g) >= 3 && !entree.includes("btnPrimaire"));
}

process.exit(ko ? 1 : 0);
