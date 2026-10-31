// Test de rendu de la bannière verticale « façon jeu » (lot « rendu » : le
// composant partagé, le podium, l'aperçu de Personnaliser, l'en-tête du
// profil), sans base ni réseau ni navigateur (react-dom/server) :
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-banniere-heros.tsx
// Vérifie : avec / sans personnage ; chaque ornement ; l'alt vide et l'aria-hidden
// du décor ; le pseudo en vrai texte ; le cadrage ; la place du débordement
// au-dessus ; le podium (place, insigne, pseudo, chiffres lisibles ; l'insigne
// qui se pousse dans le coin avec un personnage) ; Personnaliser (les
// vignettes d'ornement) ; le mouvement réduit ; aucun chemin local.
import "./sans-css";
import "./react-global";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { STATS_VIDES, STYLE_DEFAUT, acquisDe } from "@/lib/profil/catalogue";
import { cadragePerso } from "@/lib/profil/perso";
import { ornementsPortables } from "@/lib/profil/styles";
import { BanniereHeros, ORNEMENTS_DESSINES, OrnementBanniere, PersoBanniere, PersoSurBandeau, PseudoBanniere, VignetteOrnement } from "@/components/profil/BanniereHeros";
import { PodiumBannieres } from "@/components/classement/PodiumBannieres";
import type { BoardRow } from "@/components/classement/types";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const compte = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const routeur = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
const rendre = (el: React.ReactElement): string => renderToStaticMarkup(<AppRouterContext.Provider value={routeur}>{el}</AppRouterContext.Provider>).replace(/&#x27;/g, "'").replace(/[  ]/g, " ");

/** Toutes les images d'un rendu : leur alt est vide ? */
const altsVides = (html: string) => (html.match(/<img\b[^>]*>/g) ?? []).every((img) => /\balt=""/.test(img));

const PERSO = "https://exemple.supabase.co/storage/v1/object/public/profil-medias/1b2c3d4e-0000-4000-8000-000000000001/perso-1760000000000.png";
const fond = <span className="fond-exemple" />;

async function main() {
  // le client du navigateur exige ces variables (rien n'est appelé au rendu statique)
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://exemple.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "cle-factice";

  console.log("# La bannière, sans personnage");
  {
    const html = renderToStaticMarkup(
      <BanniereHeros fond={fond}>
        <PseudoBanniere>Sforzinda</PseudoBanniere>
      </BanniereHeros>,
    );
    check("sans personnage : aucune image, aucune marge de débordement (data-perso=0)", !html.includes("<img") && !html.includes("persoBoite") && html.includes('data-perso="0"'));
    check("l'ornement par défaut est le filet d'encre", html.includes('data-ornement="filet"'));
    check("le fond (la bannière du joueur) est dans la carte, sous le voile", html.indexOf("fond-exemple") > html.indexOf('class="forme"') && html.indexOf('class="ombre"') > html.indexOf("fond-exemple"));
    check("le pseudo est du vrai texte (ni aria-hidden, ni dans une image)", html.includes('<span class="contenu"><span class="pseudo font-brand">Sforzinda</span></span>'));
    check("le décor est caché des lecteurs d'écran (cadre, carte, ornement)", html.includes('<span aria-hidden="true" class="cadre">') && html.includes('<span aria-hidden="true" class="forme">') && /<svg[^>]*aria-hidden="true"/.test(html));
    const sansTexte = renderToStaticMarkup(<BanniereHeros fond={fond} ornement="fronton" />);
    check("sans texte : pas de bloc de contenu", !sansTexte.includes('class="contenu"'));
  }

  console.log("\n# Chaque ornement");
  {
    const rendus = Object.fromEntries(ORNEMENTS_DESSINES.map((o) => [o, renderToStaticMarkup(<OrnementBanniere cle={o} />)]));
    check("quatre ornements : filet, cartouche, laurier, fronton", ORNEMENTS_DESSINES.join(" ") === "filet cartouche laurier fronton");
    check("chacun rend son SVG (viewBox 90 × 150), sa clé, caché des lecteurs d'écran", ORNEMENTS_DESSINES.every((o) => rendus[o].includes('viewBox="0 0 90 150"') && rendus[o].includes(`data-ornement="${o}"`) && rendus[o].includes('aria-hidden="true"') && rendus[o].includes('focusable="false"')));
    check("les quatre dessins sont différents", new Set(Object.values(rendus).map((h) => h.replace(/data-ornement="[a-z]+"|id="[^"]*"|url\(#[^)]*\)/g, ""))).size === 4);
    check("filet : deux traits (l'encre et le papier), rien d'autre", compte(rendus.filet, /<path\b/g) === 2 && !rendus.filet.includes("<circle") && !rendus.filet.includes("<ellipse"));
    check("cartouche : un double filet de laiton aux coins retaillés, deux losanges", compte(rendus.cartouche, /<path\b/g) === 4 && rendus.cartouche.includes("A6.5,6.5") && compte(rendus.cartouche, /<circle\b/g) === 2);
    check("laurier : deux branches de feuilles (2 × 23 ellipses) qui se rejoignent", compte(rendus.laurier, /<ellipse\b/g) === 46 && compte(rendus.laurier, /scale\(-1 1\)/g) === 1);
    check("fronton : un dégradé doré, le tympan, le médaillon, deux pilastres, le socle", rendus.fronton.includes("<linearGradient") && compte(rendus.fronton, /<circle\b/g) === 3 && compte(rendus.fronton, /<rect\b/g) === 3 && rendus.fronton.includes("M3.4,127L45,144.2L86.6,127"));
    const inconnu = renderToStaticMarkup(<OrnementBanniere cle="inconnu" />);
    const absent = renderToStaticMarkup(<OrnementBanniere cle={null} />);
    check("une clé inconnue ou absente retombe sur le filet", inconnu.includes('data-ornement="filet"') && absent.includes('data-ornement="filet"'));
    const deux = renderToStaticMarkup(
      <>
        <OrnementBanniere cle="fronton" />
        <OrnementBanniere cle="fronton" />
      </>,
    );
    const ids = [...deux.matchAll(/<linearGradient id="([^"]+)"/g)].map((m) => m[1]);
    check("deux frontons sur la page ne partagent pas leurs identifiants de dégradé", ids.length === 4 && new Set(ids).size === 4, ids.join(" "));
    check("aucune couleur de néon : la dorure reste sobre (laiton, encre, papier)", !/#(?:0ff|f0f|0f0|ff00ff|00ffff)/i.test(Object.values(rendus).join("")));
  }

  console.log("\n# Le personnage");
  {
    const html = renderToStaticMarkup(
      <BanniereHeros fond={fond} ornement="laurier" perso={PERSO} persoTaille={120} persoPos={30}>
        <PseudoBanniere>Sforzinda</PseudoBanniere>
      </BanniereHeros>,
    );
    check("avec personnage : une image, la boîte réserve la place du débordement (data-perso=1)", compte(html, /<img\b/g) === 1 && html.includes('data-perso="1"') && html.includes(`src="${PERSO}"`));
    check("le personnage est du décor : alt vide, aria-hidden, aucun clic", altsVides(html) && /<span aria-hidden="true" class="persoBoite"/.test(html) && html.includes('draggable="false"'));
    check("le cadrage : taille 120 / position 30 → translateY(-10%) scale(1.2)", html.includes("translateY(-10%) scale(1.2)"), cadragePerso(120, 30).echelle + " " + cadragePerso(120, 30).decalageY);
    check("l'image est après l'ornement (devant lui) et avant le texte (derrière)", html.indexOf("<svg") < html.indexOf("<img") && html.indexOf("<img") < html.indexOf('class="contenu"'));
    check("le pseudo reste du vrai texte avec un personnage", html.includes('<span class="pseudo font-brand">Sforzinda</span>') && !/aria-hidden="[^"]*"[^>]*><span class="pseudo/.test(html));
    const defaut = renderToStaticMarkup(<PersoBanniere perso={PERSO} />);
    check("taille et position par défaut : à sa place (translateY(0%) scale(1))", defaut.includes("translateY(0%) scale(1)"));
    const borne = renderToStaticMarkup(<PersoBanniere perso={PERSO} taille={900} pos={-5} />);
    check("une taille et une position hors bornes sont ramenées (160 / 0)", borne.includes("translateY(-25%) scale(1.6)"));
    const bandeau = renderToStaticMarkup(<PersoSurBandeau perso={PERSO} taille={100} pos={50} className="[--x:70%]" />);
    check("sur un bandeau horizontal : image décor, contenue, centre réglable (--x)", altsVides(bandeau) && bandeau.includes("data-perso-bandeau") && bandeau.includes("[--x:70%]") && bandeau.includes('aria-hidden="true"'));
    const vignette = renderToStaticMarkup(<VignetteOrnement cle="laurier" />);
    check("la vignette d'un ornement : le dessin seul, ni image, ni texte", vignette.includes('data-ornement="laurier"') && !vignette.includes("<img") && !vignette.includes('class="contenu"') && vignette.includes('aria-hidden="true"'));
  }

  console.log("\n# La feuille de style");
  {
    const css = fs.readFileSync("components/profil/BanniereHeros.module.css", "utf8");
    check("la marge du débordement : 33 % de la largeur quand il y a un personnage", /\.boite\[data-perso="1"\]\s*\{\s*padding-top:\s*33%/.test(css));
    check("le personnage est découpé : 20 % au-dessus, 3 % sur les côtés, le bas suit la pointe", css.includes("--dx: 3cqw") && css.includes("--dy: 20%") && /\.persoBoite\s*\{[^}]*clip-path:\s*polygon/.test(css));
    check("l'ombre portée douce et le voile du bas (masque) sont là", css.includes("drop-shadow") && css.includes("mask-image"));
    check("le mouvement réduit coupe la respiration (prefers-reduced-motion, ?mouvement=off, mode discret)", css.includes("prefers-reduced-motion: reduce") && css.includes('data-rl-motion="off"') && css.includes('data-discreet="1"'));
    check("le personnage ne capte aucun clic", /\.persoBoite\s*\{[^}]*pointer-events:\s*none/.test(css) && /\.bandeau\s*\{[^}]*pointer-events:\s*none/.test(css) && /\.orn\s*\{[^}]*pointer-events:\s*none/.test(css));
    const pod = fs.readFileSync("components/classement/Podium.module.css", "utf8");
    check("le podium garde la place des têtes au-dessus (data-perso=1 : 20 % d'un fanion 15 % moins haut, soit 10,2 % et 71 px), l'insigne se pousse dans le coin", /\.podium\[data-perso="1"\]\s*\{\s*padding-top:\s*min\(10\.2%,\s*71px\)/.test(pod) && pod.includes(".avecPerso .insigne"));
  }

  console.log("\n# Le podium");
  {
    const rang = (i: number, name: string, extra: Partial<BoardRow> = {}): BoardRow => ({ userId: "u" + i, name, avatarUrl: null, elo: 1800 - i * 100, gamesPlayed: 30 - i, rank: i + 1, mastery: 70 - i * 3, lastDelta: 12 - i * 9, isMe: false, bannerUrl: null, titre: null, ...extra });
    const trois = (a: Partial<BoardRow>, b: Partial<BoardRow>, c: Partial<BoardRow>): [BoardRow, BoardRow, BoardRow] => [rang(0, "Camille", a), rang(1, "Hugo", b), rang(2, "Léa", c)];

    const sans = rendre(<PodiumBannieres rows={trois({}, {}, {})} label="Podium" />);
    check("sans personnage : le podium est celui d'avant (data-perso=0, aucune image de personnage, aucun insigne déplacé)", sans.includes('data-perso="0"') && !sans.includes("persoBoite") && !sans.includes("avecPerso"));
    check("sans ornement choisi : le filet d'encre sur chaque carte", compte(sans, /<svg\b[^>]*data-ornement="filet"/g) === 3);

    const html = rendre(
      <PodiumBannieres
        rows={trois({ perso: PERSO, persoTaille: 140, persoPos: 30, ornement: "fronton" }, { perso: PERSO.replace("1760000000000", "1760000000001"), persoTaille: 100, persoPos: 50, ornement: "laurier" }, { ornement: "cartouche" })}
        label="Podium"
      />,
    );
    check("le podium réserve la place des têtes (data-perso=1)", html.includes('data-perso="1"') && html.includes('role="group" aria-label="Podium"'));
    check("deux personnages sur trois : deux images, jamais de personnage pour la place sans perso", compte(html, /class="persoBoite"/g) === 2 && compte(html, /perso-17600000000/g) === 2);
    check("les trois ornements, dans l'ordre des places : fronton, laurier, cartouche", [...html.matchAll(/<svg\b[^>]*data-ornement="([a-z]+)"/g)].map((m) => m[1]).join(" ") === "fronton laurier cartouche");
    check("toutes les images du podium (personnages, insignes, fond) ont un alt vide : du décor", altsVides(html));
    check("seules les cartes avec personnage passent l'insigne dans le coin (avecPerso)", compte(html, /class="banniere premier avecPerso"|class="banniere avecPerso"/g) === 2 && compte(html, /avecPerso/g) === 2);
    check("le cadrage du premier : taille 140 / position 30 → translateY(-10%) scale(1.4)", html.includes("translateY(-10%) scale(1.4)") && html.includes("translateY(0%) scale(1)"));
    // la place, l'insigne, le pseudo, le rang et les trois chiffres restent là, en texte
    check("les trois pseudos sont du vrai texte, avec leur rang et leur ELO", ["Camille", "Hugo", "Léa"].every((n) => html.includes(`<span class="pseudo font-brand">${n}</span>`)) && html.includes("<b>1 800</b>") && html.includes("<b>1 600</b>"));
    check("la place (1, 2, 3) et l'insigne de chaque carte sont là", compte(html, /class="place font-brand"/g) === 3 && compte(html, /class="insigne"/g) === 3);
    check("les trois chiffres de chaque carte (parties, maîtrise, dernier match)", compte(html, /<small>parties<\/small>/g) === 3 && compte(html, /<small>maîtrise<\/small>/g) === 3 && compte(html, /<small>dernier<\/small>/g) === 3);
    check("le nom accessible de chaque carte dit la place, le joueur, le rang, l'ELO", /aria-label="[^"]*Camille[^"]*1800 ELO"/.test(html) && /aria-label="[^"]*Léa[^"]*1600 ELO"/.test(html));
    // l'ordre des couches : le personnage devant l'ornement, derrière la place et le texte
    const carte = html.slice(html.indexOf('data-ornement="fronton"'));
    const un = carte.slice(0, carte.indexOf('data-ornement="laurier"'));
    check("couches d'une carte : la carte, l'ornement, le personnage, puis la place, l'insigne, le texte, le reflet", ["class=\"forme\"", "<svg", "persoBoite", "class=\"place", "class=\"insigne\"", "class=\"bas\"", "class=\"reflet\""].map((x) => un.indexOf(x)).every((x, i, t) => x >= 0 && (i === 0 || x > t[i - 1])));
    const unSeul = rendre(<PodiumBannieres rows={[rang(0, "Camille", { perso: PERSO, ornement: "laurier" }), null, null]} label="Podium" />);
    check("des places libres restent libres : le personnage du premier ne s'étend pas aux autres", compte(unSeul, /class="persoBoite"/g) === 1 && unSeul.includes('data-perso="1"') && compte(unSeul, /<a [^>]*href="\/duel"/g) === 2);
  }

  console.log("\n# Personnaliser");
  {
    const { SectionOrnement } = await import("@/components/profil/SectionsPersonnaliser");
    const sceau = (cle: string, palier: 0 | 1 | 2 | 3) => ({ def: { cle, famille: "regularite" as const, unite: "jours" as const, seuils: [7, 30, 100] as [number, number, number], difficulte: 1 as const }, palier, valeur: 3, questions: null, prochain: 7, avance: 0.4 });
    const brouillon = (style: typeof STYLE_DEFAUT) => ({ style, set: () => {}, setStyle: () => {} });
    const acquis = { ...acquisDe(STATS_VIDES), sceaux: [sceau("a", 1), sceau("b", 2)] };
    const liste = renderToStaticMarkup(<SectionOrnement b={brouillon({ ...STYLE_DEFAUT, ornement: "cartouche" })} ornements={ornementsPortables(acquis, "cartouche")} dispo />);
    const vignettes = [...liste.matchAll(/<svg\b[^>]*data-ornement="([a-z]+)"/g)].map((m) => m[1]);
    check("la liste des ornements : une vignette dessinée par ornement, dans l'ordre", vignettes.join(" ") === "filet cartouche laurier fronton", vignettes.join(" "));
    check("les vignettes sont du décor (aria-hidden) ; les grisés restent désactivés avec leur consigne", compte(liste, /<span aria-hidden="true" class="block w-\[40px\]/g) === 4 && compte(liste, /disabled=""/g) === 2);
  }

  console.log("\n# En-tête du profil et carte joueur");
  {
    const entete = fs.readFileSync("components/profil/EnteteJoueur.tsx", "utf8");
    const carte = fs.readFileSync("components/profil/CarteJoueur.tsx", "utf8");
    check("l'en-tête du profil pose le personnage sur le bandeau (apercu et pleine largeur), sans toucher à la grille", entete.includes("PersoSurBandeau") && entete.includes("d.style.perso &&") && entete.includes("lg:grid-cols-12"));
    check("la carte joueur pose le personnage sur son bandeau si elle en a un", carte.includes("PersoSurBandeau") && carte.includes("c.style.perso &&"));
    const { EnteteJoueur } = await import("@/components/profil/EnteteJoueur");
    const d = { id: "u1", name: "Sforzinda", nomComplet: null, avatarUrl: null, style: { ...STYLE_DEFAUT, perso: PERSO, persoTaille: 110, persoPos: 40 }, niveau: 5, levelPct: 40, xpTotal: 1200, elo: 1500, mastery: 60, place: 7, gamesPlayed: 20, linkedin: null, amis: 3 };
    let html = "";
    try {
      html = rendre(<EnteteJoueur d={d} apercu />);
    } catch (e) {
      console.log(e);
    }
    check("en-tête (aperçu) avec personnage : image décor, contenue dans le bandeau", html.includes("data-perso-bandeau") && altsVides(html.slice(html.indexOf("data-perso-bandeau") - 120, html.indexOf("data-perso-bandeau") + 400)));
    let sansPerso = "";
    try {
      sansPerso = rendre(<EnteteJoueur d={{ ...d, style: STYLE_DEFAUT }} apercu />);
    } catch (e) {
      console.log(e);
    }
    check("en-tête sans personnage : rien de plus qu'avant", sansPerso.length > 0 && !sansPerso.includes("data-perso-bandeau"));
  }

  console.log("\n# Chemins");
  {
    const fichiers = ["components/profil/BanniereHeros.tsx", "components/profil/BanniereHeros.module.css", "components/classement/PodiumBannieres.tsx", "components/classement/Podium.module.css", "app/preview-da/bannieres/page.tsx"].map((f) => fs.readFileSync(f, "utf8")).join("\n");
    check("aucun chemin local ni de scratchpad dans les fichiers du lot", !/AppData|scratchpad|C:[\\/]Users/i.test(fichiers));
  }

  console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
  process.exit(ko ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
