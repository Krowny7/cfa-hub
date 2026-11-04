// Test de rendu de la page Moi « La synthèse » entière (lots 1 à 7),
// react-dom/server, sans base, réseau ni navigateur :
//   npx tsx --tsconfig tsconfig.json scripts/moi/test-synthese.tsx
// L'en-tête et ses quatre liens, l'ordre des cartes de la maquette D (Objectif |
// Joueur, Tes matières, Lacunes | Forces | Où gagner, la carte du programme,
// Calcul | Rythme | Progression, la salle des trophées), les ancres, la palette
// « jade » et l'inventaire des liquides (8 par défaut), la cible de Léonard
// (présente avec le Codex, absente sans), les variantes (nouveau joueur, sans
// objectif, placement, sans temps, sans admin, objectif atteint, cas extrêmes)
// et le poids de la page. Les noms de classes des modules CSS sont rendus tels
// quels.
import "../codex/sans-css";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { SyntheseView } from "@/components/moi/synthese/SyntheseView";
import { exemple, ID_EXEMPLE, type Variante } from "./synthese-exemple";

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
const routeur = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
const rendre = (v: Variante): string => {
  try {
    return renderToStaticMarkup(
      <AppRouterContext.Provider value={routeur}>
        <SyntheseView s={exemple(v)} />
      </AppRouterContext.Provider>,
    )
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"');
  } catch (e) {
    console.log(e);
    return "";
  }
};
const NB = String.fromCharCode(160);

const base = rendre("base");

console.log("# la page de la maquette");
check("le rendu n'est pas vide", base.length > 5000, String(base.length));
check("l'en-tête : « Moi · Theo » et « Où tu en es »", base.includes("Moi · Theo") && base.includes("<h1") && base.includes("Où tu en es"));
{
  const nav = base.slice(base.indexOf('aria-label="Ton compte"'), base.indexOf("</nav>"));
  check(
    "les cinq liens discrets : Réglages, Mes pièces, Personnaliser, Carnet, Activités",
    nav.includes('href="/moi?onglet=reglages"') && nav.includes('href="/moi?onglet=pieces"') && nav.includes(`href="/people/${ID_EXEMPLE}?personnaliser=1"`) && nav.includes('href="/moi?onglet=erreurs"') && nav.includes('href="/moi?onglet=activites"') && compte(nav, /<a /g) === 5,
    nav.slice(0, 300),
  );
}
{
  const ordre = ["objectif", "joueur", "matieres", "lacunes", "forces", "gagner", "carte", "calcul", "rythme", "progression", "trophees"].map((k) => base.indexOf(`id="syn-${k}"`));
  check("l'ordre de la maquette D : Objectif, Joueur, Tes matières, Lacunes, Forces, Où gagner, la carte, Calcul, Rythme, Progression, Trophées", ordre.every((x, i) => x > 0 && (i === 0 || x > ordre[i - 1])), ordre.join());
}
check("les rangées : Objectif | Joueur (c8 | c4), puis 5 | 4 | 3 et 3 | 4 | 5 à trois cartes", base.includes('class="carte moyenne c8"') && base.includes('class="carte joueur c4"') && compte(base, /data-n="3"/g) === 2);
check("les ancres : matieres, points-faibles, gagner, carte, trophees (une fois chacune)", ["matieres", "points-faibles", "gagner", "carte", "trophees"].every((a) => compte(base, new RegExp(`id="${a}"`, "g")) === 1));
check("les liens internes mènent à une ancre de la page : #gagner (objectif), #carte (lacunes)", base.includes('href="#gagner"') && base.includes('href="#carte"'));
check("un même gabarit de titre : le sceau dans le titre des petites et des grandes cartes", compte(base, /class="font-brand titreCarte titreSceau"/g) === 5 && !base.includes('class="teteGauche"><span class="sceau sceauGrand"'), String(compte(base, /class="font-brand titreCarte titreSceau"/g)));
check("le cadre de la page est un conteneur (requêtes de conteneur de la racine)", base.includes('class="rl-wide rl-page cadre"'));
check("les chiffres de la maquette : 1 240 / 3 000, 41 %, reste 1 760, J-110", base.includes(`1${NB}240`) && base.includes(`/ 3${NB}000`) && base.includes(`41${NB}%`) && base.includes(`1${NB}760`) && base.includes("J-110"));
check("la phrase : 16 par jour, 14 en moyenne sur 14 jours, un peu en retard", base.includes("16 par jour") && base.includes("sur 14 jours") && base.includes("un peu en retard"));
check("la quête du jour : 7 / 16 · encore 9, 16 pastilles dont 7 allumées", base.includes(`7 / 16 · encore 9`) && compte(base, /class="pip"/g) + compte(base, /class="pip pipOn"/g) === 16 && compte(base, /class="pip pipOn"/g) === 7);
check("le bouton : « Faire mes 9 questions » vers une séance de 10 (Éthique), go=1", base.includes("Faire mes 9 questions") && base.includes('href="/practice?topic=ethics&amp;n=10&amp;go=1"'));
check("la trajectoire : deux dessins (compact et large), 3 000 / 2 780 / −220 dedans", compte(base, /Ta trajectoire jusqu'au jour J/g) === 1 && compte(base, /aria-label="Questions faites depuis le 16 juin/g) === 2 && base.includes(">−220<") && base.includes(`>2${NB}780<`));
check("la jauge : 61 %, « Il te manquerait 9 points », lien vers #gagner", base.includes(`61${NB}%`) && base.includes("9 points") && base.includes('href="#gagner"'));
check("« Ce que ça veut dire » : 2 780 le 18 février, 220 sous, deux de plus par jour", base.includes("Ce que ça veut dire") && base.includes("le 18 février, 220 sous ton objectif") && base.includes("deux de plus par jour"));
check("le joueur : Platine II, « 1 478 ELO · 7e sur 412 », « Plus que 22 ELO avant Platine I »", base.includes("Platine II") && base.includes(`1${NB}478${NB}ELO · 7e sur 412`) && base.includes(`22${NB}ELO</b> avant Platine I`));
check("les trois lignes : temps (34 h 20, 4 h 10 ces 7 jours), Codex (37, 2 à récupérer), Marquées (23)", base.includes(`34${NB}h 20`) && base.includes(`4${NB}h 10 ces 7 jours`) && base.includes("depuis le 16 juin") && base.includes("2 à récupérer") && base.includes("15 questions · 8 flashcards") && base.includes(">23<"));
check("le lien « Récupérer mes 2 quêtes → » vers /codex", base.includes("Récupérer mes 2 quêtes →"));
check("la salle : 23 trophées, Diamant 1 · Or 3 · Argent 6 · Bronze 13, dernier gagné et sa règle", base.includes("23 trophées gagnés") && base.includes("Dernier gagné") && base.includes("Trophée d'or · Les 30 du jour") && base.includes("27/30 ou plus") && /Diamant/.test(base) && />13</.test(base));

titre("# l'encre : 8 liquides par défaut, la palette jade");
check("exactement 9 class rl-encre-vif : 6 boutons (objectif, Mon profil, lacunes, gagner, calculs, série chronométrée) et 3 options (Radar, 30 j, Aucune)", compte(base, /class="rl-encre-vif"/g) === 9, String(compte(base, /class="rl-encre-vif"/g)));
{
  const liquides = ["Faire mes 9 questions", "Mon profil", "Atelier sur ta pire notion", "Commencer par", "Session de calculs", "Série chronométrée"];
  check("les 5 boutons d'encre attendus sont là", liquides.every((t) => base.includes(t)), liquides.filter((t) => !base.includes(t)).join(" | "));
  const parCarte = base.split("<section").slice(1).map((x) => compte(x.slice(0, x.indexOf("</section>")), /class="rl-encre-vif"/g));
  check("un liquide au plus par carte, sauf Tes matières (ses deux options actives)", parCarte.every((n, i) => n <= 1 || (i === 2 && n === 2)), parCarte.join());
}
check('data-palette="jade" sur chaque liquide, et aucune autre palette', compte(base, /data-palette="jade"/g) === 9 && !/data-palette="(?!jade)/.test(base));
check("la palette est posée sur la racine : --pal-1 noir … --pal-4 blanc, texture jade.webp", base.includes("--pal-1:#121016") && base.includes("--pal-2:#5a3a8f") && base.includes("--pal-3:#2f8f5f") && base.includes("--pal-4:#f4f2f7") && base.includes("/encres/jade.webp"));
check("aucune trace d'ébène, ni d'image de la maquette", !/ebene/i.test(base) && !base.includes("/_blob/") && !base.includes("Ébène"));
check("aucun antislash ni chemin de travail dans la page", !base.includes(String.fromCharCode(92)) && !/scratchpad|AppData|C:[/]/.test(base));

titre("# la cible de Léonard et les icônes");
check('data-leonard="moi-codex" présent avec le Codex (une fois), vers /codex', compte(base, /data-leonard="moi-codex"/g) === 1 && /data-leonard="moi-codex"[^>]*>/.test(base) && base.includes('href="/codex"'));
{
  const html = rendre("sansCodex");
  check('sans Codex : plus de data-leonard="moi-codex", plus de lien « Récupérer »', !html.includes("moi-codex") && !html.includes("Récupérer mes") && html.length > 5000);
}
check("l'icône de trophée : un seul tracé dans la page, repris par des <use>", compte(base, /<symbol id="syn-trophee"/g) === 1 && compte(base, /M18 2H6v7a6 6 0 0 0 12 0V2Z/g) === 1 && compte(base, /<use href="#syn-trophee"/g) === 6, String(compte(base, /<use href="#syn-trophee"/g)));
// environ 120 Ko : la carte du programme (93 liens, environ 30 Ko) et la salle des trophées pèsent le plus
check("la page reste légère (piège d'hydratation #418 : pas de longs tracés recopiés)", base.length < 150_000, String(base.length));

titre("# les variantes");
{
  const sans = rendre("sansObjectif");
  const objectifDe = (html: string) => html.slice(html.indexOf('aria-labelledby="syn-objectif"'), html.indexOf("</section>", html.indexOf('aria-labelledby="syn-objectif"')));
  check("sans objectif : « Fixe ton jour J » et un lien vers reglages#objectif ; ce bouton reste le seul liquide de la carte", sans.includes("Fixe ton jour J") && sans.includes('href="/moi?onglet=reglages#objectif"') && compte(objectifDe(sans), /class="rl-encre-vif"/g) === 1 && compte(sans, /class="rl-encre-vif"/g) === 9 && !sans.includes("Ta quête du jour"));
  const sd = rendre("sansDate");
  check("sans date : pas de pavé J-n, la carte invite à fixer le jour J", sd.includes("Fixe ton jour J") && !/class="jour"/.test(sd));
  const neuf = rendre("nouveau");
  check("nouveau joueur : placement 0/5, jauge masquée (« Encore tôt »), Codex et marquées à zéro, salle vide avec son invitation", neuf.includes("Placement 0/5") && neuf.includes("Encore tôt") && !neuf.includes('aria-label="Note estimée') && neuf.includes("aucune quête faite pour l'instant") && neuf.includes("rien de marqué pour l'instant") && neuf.includes("Aucun trophée encore"));
  check("nouveau joueur : pas de ligne de temps, pas de « Dernier gagné »", !neuf.includes("Temps sur le site") && !neuf.includes("Dernier gagné"));
  const pl = rendre("placement");
  check("placement : « Placement 3/5 » et « Plus que 2 parties classées »", pl.includes("Placement 3/5") && pl.includes("Plus que 2 parties classées"));
  check("nouveau joueur : toutes les cartes restent, en état vide (rien de mesuré), sans comparaison dans le temps", ["matieres", "lacunes", "carte", "progression"].every((k) => neuf.includes(`id="syn-${k}"`)) && !neuf.includes("Se comparer"));
  const st = rendre("sansTemps");
  check("sans temps : la ligne disparaît, les deux autres restent", !st.includes("Temps sur le site") && st.includes("Codex") && st.includes("Marquées"));
  const sa = rendre("sansAdmin");
  check("sans admin : pas de « Dernier gagné », la salle dit que les autres trophées arrivent", !sa.includes("Dernier gagné") && sa.includes("Les autres trophées arrivent") && sa.includes('id="trophees"'));
  check("sans admin (sans maitrise_synthese ni rythme_joueur) : ni Calcul, ni Rythme, ni Progression ; la carte sur 90 jours ; pas de comparaison dans le temps", !sa.includes("syn-calcul") && !sa.includes("syn-rythme") && !sa.includes("syn-progression") && sa.includes("pas vue depuis 90") && sa.includes('id="carte"') && !sa.includes("Se comparer") && compte(sa, /class="rl-encre-vif"/g) === 5, String(compte(sa, /class="rl-encre-vif"/g)));
  const at = rendre("atteint");
  check("objectif atteint : félicitation, plus de bouton d'encre dans la carte, plus de quête", at.includes("est atteint : bravo") && !objectifDe(at).includes("rl-encre-vif") && compte(at, /class="rl-encre-vif"/g) === 8 && !at.includes("Ta quête du jour") && at.includes(`100${NB}%`));
  const pire = rendre("pire");
  check("cas extrêmes : pseudo très long, 0 % fait, note à 100 %, quête de 100 par jour en barre", pire.includes("Rochefoucauld-Montmorency") && pire.includes(`0${NB}%`) && pire.includes(`100${NB}%`) && !/class="pip/.test(pire) && pire.includes("Faire mes 100 questions"));
  const zero = rendre("zero");
  check("note à 0 % : la jauge s'affiche sans tracé de valeur, « Il te manquerait 70 points »", zero.includes("70 points") && zero.includes(`0${NB}%`));
  for (const v of ["base", "nouveau", "sansObjectif", "sansDate", "placement", "sansCodex", "sansTemps", "sansAdmin", "atteint", "pire", "zero"] as Variante[]) {
    const h = rendre(v);
    check(`variante « ${v} » : rendue, sans NaN ni undefined`, h.length > 4000 && !/NaN|undefined/.test(h) && !h.includes("[object"), String(h.length));
  }
}

titre("# Tes matières : la comparaison à 3 jours et les réponses de la période (activite_depuis)");
{
  const groupe = base.slice(base.indexOf('aria-label="Se comparer à toi il y a"'));
  const options = groupe.slice(0, groupe.indexOf("</div>")).split(NB).join(" ");
  check("le sélecteur : 3 j, 30 j, 60 j, 90 j, dans cet ordre (30 j reste le choix d'ouverture : voir l'inventaire des liquides)", compte(options, /<button/g) === 4 && options.indexOf(">3 j<") > 0 && options.indexOf(">3 j<") < options.indexOf(">30 j<") && options.indexOf(">30 j<") < options.indexOf(">60 j<") && options.indexOf(">60 j<") < options.indexOf(">90 j<"));
  check("à 30 jours, toutes les matières ont été travaillées : 10 lignes avec leurs réponses en petit, « · 665 réponses » au total", compte(base, /class="evRep"/g) === 10 && base.includes('class="nbRep">· 665 réponses<') && !base.includes("evSans"));
  const neuf = rendre("nouveau");
  const sa = rendre("sansAdmin");
  check("nouveau joueur et sans admin : aucun nombre de réponses ni ligne « Sans réponse »", ![neuf, sa].some((h) => h.includes("evRep") || h.includes("nbRep") || h.includes("evSans")));
}

console.log("");
console.log(ko === 0 ? "Tout est vert." : `${ko} échec(s).`);
process.exit(ko === 0 ? 0 : 1);
