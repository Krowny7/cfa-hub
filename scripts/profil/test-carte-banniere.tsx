// Test de rendu de la bannière composée, de son panneau de gauche, de la carte
// complète, du podium et de l'en-tête du profil (lot « rendu » de la bannière
// composée), sans base ni réseau ni navigateur (react-dom/server) :
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-carte-banniere.tsx
// Vérifie : la place des calques dans la scène (% de la bannière → % de la scène),
// l'ordre d'empilement, le fond (image cadrée ou fond du profil), le cadre, le
// repli sur la bannière d'avant, le décor caché des lecteurs d'écran ; le panneau
// (badges choisis ou les plus rares, statistiques avec leurs vraies valeurs, rang) ;
// la carte (la plaque derrière la bannière : celle de l'aperçu de l'éditeur) ; le podium
// (la bannière composée à la place du fanion, seule visible, son panneau dans le volet qui
// sort au survol ; le fanion d'avant pour qui n'a rien composé) ; le panneau seul dans sa
// boîte ; l'en-tête du profil (sans carte : celui d'avant) ; aucun chemin local.
import "./sans-css";
import "./react-global";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { STYLE_DEFAUT } from "@/lib/profil/catalogue";
import { SCENE, compositionDefaut, imagePrereglage, poserCalque } from "@/lib/profil/banniere";
import { badgeVue, badgesDuPanneau, panneauVue, statsDuPanneau } from "@/lib/profil/panneau-vue";
import { SCEAUX, etatSceau } from "@/lib/profil/sceaux";
import { BanniereComposee, styleCalque } from "@/components/profil/BanniereComposee";
import { PanneauJoueur, tonBadge } from "@/components/profil/PanneauJoueur";
import { CarteBanniere } from "@/components/profil/CarteBanniere";
import { PodiumBannieres } from "@/components/classement/PodiumBannieres";
import type { BoardRow } from "@/components/classement/types";
import { FOND_EXEMPLE, LEONARD, RATIO_LEONARD, STATS_EXEMPLE, compositionExemple } from "./composition-exemple";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const compte = (html: string, re: RegExp) => (html.match(re) ?? []).length;
const routeur = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
/** les espaces insécables d'un nombre groupé (« 1 612 ») ramenés à une espace simple */
const esp = (s: string) => s.replace(/[  ]/g, " ");
const rendre = (el: React.ReactElement): string => esp(renderToStaticMarkup(<AppRouterContext.Provider value={routeur}>{el}</AppRouterContext.Provider>).replace(/&#x27;/g, "'"));
const altsVides = (html: string) => (html.match(/<img\b[^>]*>/g) ?? []).every((img) => /\balt=""/.test(img));
/** les images d'un rendu, dans l'ordre, par leur `data-calque` */
const calques = (html: string) => [...html.matchAll(/<(?:img|svg)\b[^>]*data-calque="([a-z]+)"/g)].map((m) => m[1]);
const fondProfil = <span className="fond-du-profil" />;

async function main() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://exemple.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "cle-factice";

  console.log("# Où se posent les calques (la scène : x de −25 à 125 %, y de −20 à 110 %)");
  {
    check("la scène est celle de lib/profil/banniere.ts (150 % × 130 % de la bannière)", SCENE.x0 === -25 && SCENE.x1 === 125 && SCENE.y0 === -20 && SCENE.y1 === 110);
    const plein = styleCalque({ image: "x", x: -25, y: -20, l: 150, h: 130, r: 1 });
    check("un calque qui remplit toute la scène : 0 %, 0 %, 100 %, 100 %", plein.left === "0%" && plein.top === "0%" && plein.width === "100%" && plein.height === "100%", JSON.stringify(plein));
    const banniere = styleCalque({ image: "x", x: 0, y: 0, l: 100, h: 100, r: 1 });
    check("la bannière elle-même : à 16,667 % du bord gauche, 15,385 % du haut, 66,667 % de large, 76,923 % de haut", banniere.left === "16.667%" && banniere.top === "15.385%" && banniere.width === "66.667%" && banniere.height === "76.923%", JSON.stringify(banniere));
    // la hauteur proportionnelle : 140 % de large sur une pièce de 966 × 334, soit 140 × (360 / 850) / 2,892 = 20,5 % de la hauteur de la bannière
    const haut = poserCalque("haut", imagePrereglage("meca"), 966 / 334);
    const s = styleCalque(haut);
    check("la pièce du haut : centrée (x = −20 → 3,333 %), largeur 140 / 150 de la scène, hauteur proportionnelle", s.left === "3.333%" && s.width === "93.333%" && Math.abs(parseFloat(String(s.height)) - (20.5 / 130) * 100) < 0.3, JSON.stringify(s));
  }

  console.log("\n# La bannière composée");
  {
    const c = compositionExemple({ pieces: "meca", perso: "fier" });
    const html = rendre(<BanniereComposee composition={c} fond={fondProfil} charge="eager" />);
    check("c'est du décor : cachée des lecteurs d'écran, marquée composée, toutes les images ont un alt vide", html.includes('aria-hidden="true"') && html.includes("data-composee") && altsVides(html) && compte(html, /<img\b/g) === 3);
    check("par défaut, du fond du profil : le cadre, puis le personnage, la pièce du bas, la pièce du haut (l'ordre d'empilement)", calques(html).join(" ") === "cadre perso bas haut", calques(html).join(" "));
    check("le fond du profil est dans la bannière, sous les calques (avant le cadre)", html.indexOf("fond-du-profil") > 0 && html.indexOf("fond-du-profil") < html.indexOf('data-calque="cadre"') && html.includes('data-fond="profil"'));
    check("le cadre : un SVG de la proportion de la bannière (360 × 850), sans clic", html.includes('viewBox="0 0 360 850"') && html.includes('focusable="false"'));
    check("le personnage et les pièces : les images du site (préréglages) ou du joueur, chargées sans attendre (eager)", html.includes(`src="${LEONARD.fier}"`) && html.includes('src="/bannieres/pieces/meca-haut.webp"') && html.includes('src="/bannieres/pieces/meca-base.webp"') && compte(html, /loading="eager"/g) === 3);
    check("chaque calque est posé en pourcentages de la scène (gauche, haut, largeur, hauteur)", [...html.matchAll(/<img\b[^>]*style="([^"]*)"/g)].every((m) => /left:[\d.-]+%;top:[\d.-]+%;width:[\d.]+%;height:[\d.]+%/.test(m[1])));
    // l'ordre voulu par le joueur
    const derriere = rendre(<BanniereComposee composition={compositionExemple({ ordre: ["perso", "cadre", "bas", "haut"] })} fond={fondProfil} />);
    check("perso derrière le cadre : le personnage vient avant le cadre", calques(derriere).join(" ") === "perso cadre bas haut", calques(derriere).join(" "));
    const devant = rendre(<BanniereComposee composition={compositionExemple({ ordre: ["cadre", "bas", "haut", "perso"] })} fond={fondProfil} />);
    check("perso devant tout : le personnage vient en dernier", calques(devant).join(" ") === "cadre bas haut perso", calques(devant).join(" "));
    // le fond du joueur
    const avecFond = compositionExemple({ fond: FOND_EXEMPLE });
    avecFond.fond = { image: FOND_EXEMPLE, px: 30, py: 70 };
    const f = rendre(<BanniereComposee composition={avecFond} fond={fondProfil} />);
    check("le fond du joueur remplace celui du profil, cadré par son point (object-position 30 % 70 %)", f.includes(`src="${FOND_EXEMPLE}"`) && f.includes("object-position:30% 70%") && !f.includes("fond-du-profil") && f.includes('data-fond="image"'));
    // sans image : pas de balise
    const vide = rendre(<BanniereComposee composition={compositionExemple({ pieces: null, perso: null })} fond={fondProfil} />);
    check("sans personnage ni pièces : rien que le fond et le cadre (aucune image)", compte(vide, /<img\b/g) === 0 && calques(vide).join(" ") === "cadre");
    // un préréglage inconnu ne casse rien
    const inconnu = compositionDefaut();
    inconnu.haut = { ...poserCalque("haut", "piece:inconnue", 2), image: "piece:inconnue" };
    check("un préréglage inconnu : le calque est sauté, pas d'image cassée", compte(rendre(<BanniereComposee composition={inconnu} />), /<img\b/g) === 0);
    // la bannière d'avant
    const avant = rendre(
      <BanniereComposee composition={null} fond={fondProfil} ornement="laurier" perso="https://exemple.supabase.co/x.png" persoTaille={120} persoPos={30}>
        <span>Sforzinda</span>
      </BanniereComposee>,
    );
    check("sans composition : la bannière d'avant (le fanion, son ornement, son personnage, son pseudo)", avant.includes('data-ornement="laurier"') && avant.includes("data-perso") && avant.includes("Sforzinda") && !avant.includes("data-composee") && avant.includes("translateY(-10%) scale(1.2)"));
  }

  console.log("\n# Ce que le panneau affiche");
  {
    const etats = SCEAUX.map((d) => etatSceau(d, { ...STATS_EXEMPLE, meilleureSerie: 45, questions: 6000, duelsGagnes: 120 }));
    const gagnes = etats.filter((e) => e.palier > 0);
    check("l'exemple a bien des sceaux gagnés (de quoi tester les replis)", gagnes.length >= 3);
    const defaut = badgesDuPanneau(null, etats);
    check("aucun badge choisi : les trois sceaux les plus rares (jamais plus de trois)", defaut.length === 3 && defaut.every((b) => b.genre === "sceau" && b.palier >= 1), defaut.map((b) => b.id).join(" "));
    const choisis = badgesDuPanneau({ badges: ["trophee:ciblee:3", "titre:copiste", `sceau:${gagnes[0].def.cle}`], stats: [] }, etats);
    check("badges choisis : dans l'ordre du joueur, un trophée, un titre, un sceau", choisis.map((b) => b.genre).join(" ") === "trophee titre sceau", choisis.map((b) => b.id).join(" "));
    const t = choisis[0];
    check("le trophée dit sa source et son palier (« Or »), le titre son nom, le sceau son palier", t.palier === 3 && t.detail === "Or" && t.nom.length > 2 && choisis[1].nom === "Copiste" && choisis[1].palier === 0 && choisis[2].palier === gagnes[0].palier);
    check("un badge qu'on ne sait plus dessiner est sauté (sceau retiré, titre disparu, identifiant bancal)", badgeVue("sceau:retire-du-catalogue", etats) === null && badgeVue("titre:n-existe-pas", etats) === null && badgeVue("n-importe-quoi", etats) === null && badgesDuPanneau({ badges: ["sceau:retire-du-catalogue", "titre:copiste"], stats: [] }, etats).length === 1);
    check("au plus trois badges, même si la base en garde plus", badgesDuPanneau({ badges: ["titre:copiste", "trophee:ciblee:1", "trophee:ciblee:2", "trophee:ciblee:3"], stats: [] }, etats).length === 3);
    const st = statsDuPanneau({ badges: [], stats: ["elo", "duels", "serie"] }, STATS_EXEMPLE, { elo: 1612 });
    check("les statistiques : leurs vraies valeurs, écrites à la française (1 612, 48, 12 j)", esp(st.map((s) => s.valeur).join("|")) === "1 612|48|12 j" && st.map((s) => s.etiquette).join("|") === "ELO|DUELS GAGNÉS|SÉRIE D'ENCRE", esp(st.map((s) => s.valeur).join("|")));
    const inconnue = statsDuPanneau({ badges: [], stats: ["heures", "place", "maitrise"] }, STATS_EXEMPLE, {});
    check("une valeur qu'on ne connaît pas : un tiret, jamais « 0 » inventé", inconnue.every((s) => s.valeur === "—"), inconnue.map((s) => s.valeur).join("|"));
    check("sans choix : les trois statistiques de la maquette (ELO, duels gagnés, sceaux)", statsDuPanneau(null, STATS_EXEMPLE, { elo: 1500, sceaux: 4 }).map((s) => s.cle).join(" ") === "elo duels sceaux");
    const v = panneauVue({ panneau: { badges: [], stats: ["elo", "sceaux", "heures"] }, nom: "Sforzinda", titre: "Copiste", elo: 1612, mastery: 62, place: 7, gamesPlayed: 40, stats: STATS_EXEMPLE, extras: { secondes: 3600 * 41.5 }, etats });
    check("le panneau entier : pseudo, titre, rang (palier et division), métal du rang, trois badges, trois chiffres", v.nom === "Sforzinda" && v.titre === "Copiste" && /^\S+( [I]+)?$/.test(v.rang.nom.replace(/ (Maître|Master)$/, "")) && v.rang.provisoire === null && /^#[0-9A-Fa-f]{6}$/.test(v.metal) && v.badges.length === 3 && v.stats.length === 3, JSON.stringify(v.rang));
    check("les chiffres tirés de ce que la page sait : ELO, nombre de sceaux gagnés, heures (41,5 h → 42 h)", esp(v.stats[0].valeur) === "1 612" && v.stats[1].valeur === String(gagnes.length) && v.stats[2].valeur === "42 h", v.stats.map((s) => s.valeur).join("|"));
    const placement = panneauVue({ panneau: null, nom: "Léa", elo: 1000, mastery: null, place: null, gamesPlayed: 3, stats: STATS_EXEMPLE, etats });
    check("pendant le placement, le rang est dit provisoire (« Placement 3/5 »)", placement.rang.provisoire === "Placement 3/5", String(placement.rang.provisoire));
    check("les tons des badges : sceau encre / vermillon / dorure, trophée bronze à diamant, titre parchemin", tonBadge({ genre: "sceau", palier: 3 }) === "#c9a24a" && tonBadge({ genre: "trophee", palier: 1 }) === "#b8713f" && tonBadge({ genre: "trophee", palier: 4 }) === "#afc0f5" && tonBadge({ genre: "titre", palier: 0 }) === "#d8cba8");
  }

  console.log("\n# Le panneau et la carte");
  {
    const etats = SCEAUX.map((d) => etatSceau(d, { ...STATS_EXEMPLE, meilleureSerie: 45, questions: 6000, duelsGagnes: 120 }));
    const v = panneauVue({ panneau: { badges: ["trophee:ciblee:3", "titre:copiste"], stats: ["elo", "duels", "sceaux"] }, nom: "Sforzinda", titre: "Copiste", elo: 1612, mastery: 62, place: 7, gamesPlayed: 40, stats: STATS_EXEMPLE, etats });
    const html = rendre(<PanneauJoueur v={v} />);
    check("le pseudo est du vrai texte, en Dela Gothic One (font-brand), avec le titre porté", html.includes('<p class="nom font-brand">Sforzinda</p>') && html.includes('<p class="titre">Copiste</p>'));
    check("le vrai insigne du palier (image du site), décor (alt vide), et le nom du rang en texte", html.includes(`/ranks/v2/petit-${v.rang.tier}-128.png`) && altsVides(html) && html.includes(`<b class="font-brand">${v.rang.nom}</b>`));
    check("les badges : une liste, un élément par badge, numérotés 01, 02, avec leur nom", html.includes('<ul class="badges" aria-label="Badges">') && compte(html, /<li class="badge"/g) === 2 && html.includes("<small aria-hidden=\"true\">01</small>") && html.includes("<b>Copiste</b>"));
    check("un dessin par badge (losange), caché des lecteurs d'écran, selon son genre", compte(html, /<svg\b[^>]*class="losange"[^>]*aria-hidden="true"/g) === 2 && html.includes('data-genre="trophee"') && html.includes('data-genre="titre"'));
    check("les chiffres : une liste de définitions (étiquette puis valeur), en Dela Gothic One", html.includes("<dl class=\"stats\">") && compte(html, /<dt>/g) === 3 && html.includes('<dd class="font-brand">1 612</dd>') && html.includes("<dt>DUELS GAGNÉS</dt>"));
    check("la plaque a un nom accessible", html.includes('aria-label="Carte de Sforzinda"'));
    const sansBadge = rendre(<PanneauJoueur v={{ ...v, badges: [], titre: null }} />);
    check("sans badge ni titre : pas de liste vide, pas de ligne de titre", !sansBadge.includes('class="badges"') && !sansBadge.includes('class="titre"'));
    const carte = rendre(<CarteBanniere composition={compositionExemple({})} panneau={v} fond={fondProfil} />);
    check("la carte : un groupe nommé ; la plaque d'abord, la bannière ensuite (elle passe devant)", carte.includes('role="group"') && carte.includes('aria-label="Carte de Sforzinda"') && carte.indexOf("cartePlaque") < carte.indexOf("carteBanniere") && carte.indexOf('data-panneau') < carte.indexOf("data-composee"));
    check("la carte contient les trois calques et le panneau, toutes images décoratives", calques(carte).join(" ") === "cadre perso bas haut" && altsVides(carte));
  }

  console.log("\n# Le podium");
  {
    const etats = SCEAUX.map((d) => etatSceau(d, { ...STATS_EXEMPLE, meilleureSerie: 45, questions: 6000, duelsGagnes: 120 }));
    const rang = (i: number, name: string, extra: Partial<BoardRow> = {}): BoardRow => ({ userId: "u" + i, name, avatarUrl: null, elo: 1800 - i * 100, gamesPlayed: 30 - i, rank: i + 1, mastery: 70 - i * 3, lastDelta: 12 - i * 9, isMe: false, bannerUrl: null, titre: null, ...extra });
    const PERSO = "https://exemple.supabase.co/storage/v1/object/public/profil-medias/1b2c3d4e-0000-4000-8000-000000000001/perso-1760000000000.png";
    // Camille a son panneau (lu comme le fait la page : panneauVue) ; Hugo, composé aussi, n'en a pas (aucune donnée lue) ; Léa garde son fanion
    const panneauCamille = panneauVue({ panneau: { badges: ["trophee:ciblee:3", "titre:copiste"], stats: ["elo", "duels", "sceaux"] }, nom: "Camille", titre: "Copiste", elo: 1800, mastery: 70, place: 1, gamesPlayed: 30, stats: STATS_EXEMPLE, etats });
    const html = rendre(
      <PodiumBannieres
        rows={[rang(0, "Camille", { banniere: compositionExemple({ pieces: "meca" }), titre: "Copiste", panneau: panneauCamille }), rang(1, "Hugo", { banniere: compositionExemple({ pieces: "royal", fond: FOND_EXEMPLE }) }), rang(2, "Léa", { perso: PERSO, persoTaille: 140, persoPos: 30, ornement: "cartouche" })]}
        label="Podium"
      />,
    );
    const liens = html.match(/<a [^>]*data-composee=""[\s\S]*?<\/a>/g) ?? [];
    check("deux bannières composées et un fanion : deux scènes composées, un seul fanion avec son personnage", liens.length === 2 && compte(html, /<span aria-hidden="true" class="scene"/g) === 2 && compte(html, /class="persoBoite"/g) === 1);
    check("la carte composée remplace le fanion : ni cadre liquide, ni reflet, ni insigne de fanion, mais le pied (la place, l'insigne)", liens.every((a) => !a.includes('class="forme"') && !a.includes('class="reflet"') && !a.includes('class="insigne"') && a.includes('class="plaqueId"') && a.includes('class="placeC font-brand"') && a.includes('class="insigneC"')));
    check("seule la bannière est visible : ni le pseudo, ni le titre, ni le rang, ni les chiffres ne sont dans la bannière (ils sont dans le panneau)", liens.every((a) => !a.includes('class="pseudo') && !a.includes("Copiste") && !a.includes("<b>1 800</b>") && !a.includes('class="rang"')));
    check("le pied dit la place et l'insigne du palier (images décor) ; il n'a plus de plaque d'identité", compte(html, /class="placeC font-brand"/g) === 2 && compte(html, /class="insigneC"/g) === 2 && !html.includes("plaqueTete"));
    check("le n° 1 garde son arc électrique (autour de l'insigne du pied) ; le n° 2, non", compte(html, /class="arcPlaque"/g) === 1 && html.indexOf("arcPlaque") < html.indexOf('data-hote=""', html.indexOf('data-hote=""') + 1));
    check("le n° 1 est au centre et plus grand (premier), comme avant : c'est la place (l'hôte) qui porte l'ordre et la taille", /class="hote premier"/.test(html) && compte(html, /class="hote"/g) === 1);
    check("toutes les images du podium ont un alt vide (décor) ; le nom accessible du lien dit la place, le joueur, le rang, l'ELO", altsVides(html) && /aria-label="[^"]*Camille[^"]*1800 ELO"/.test(html));
    check("le fond de la bannière composée sans image : l'image de bannière du profil, sinon la peinture du Classement", html.includes("/illustrations/") && html.includes('data-fond="profil"') && html.includes('data-fond="image"'));
    check("le podium ne réserve pas de place de tête pour une bannière composée (elle a sa marge) : data-perso=1 seulement pour le fanion avec personnage", html.includes('data-perso="1"'));
    // le volet : le panneau de gauche, fermé au départ, hors du lien, avec un libellé
    check("chaque place composée a son volet, hors du lien (frère de la bannière), caché au départ : fermé, côté gauche", compte(html, /<\/a><div [^>]*class="volet"/g) === 2 && compte(html, /data-ouvert="0"/g) === 2 && compte(html, /data-ouvert="1"/g) === 0);
    check("la bannière est un lien focusable qui annonce son état (aria-expanded=false) et nomme son volet (aria-controls)", liens.every((a) => /aria-expanded="false"/.test(a)) && liens.every((a) => /aria-controls="([^"]+)"/.test(a)) && [...html.matchAll(/aria-controls="([^"]+)"/g)].every((m) => html.includes(`id="${m[1]}"`)));
    check("le volet est le panneau du joueur, seul dans sa boîte (isole), avec un libellé : « Carte de Camille »", compte(html, /<aside [^>]*aria-label="Carte de (?:Camille|Hugo)"[^>]*data-isole=""/g) === 2 && html.includes('data-cote="gauche"'));
    const volet = (nom: string) => (html.match(new RegExp(`<aside [^>]*aria-label="Carte de ${nom}"[\\s\\S]*?</aside>`)) ?? [""])[0];
    const camille = volet("Camille");
    check("le panneau de Camille : pseudo, titre, rang, les badges qu'elle a choisis et ses chiffres avec leurs vraies valeurs (1 800 ELO)", camille.includes('<p class="nom font-brand">Camille</p>') && camille.includes('<p class="titre">Copiste</p>') && camille.includes(`<b class="font-brand">${panneauCamille.rang.nom}</b>`) && camille.includes('data-badge="trophee:ciblee:3"') && camille.includes('data-badge="titre:copiste"') && camille.includes('<dd class="font-brand">1 800</dd>') && compte(camille, /<div class="stat"/g) === 3);
    const hugo = volet("Hugo");
    check("sans données lues : le panneau se réduit au pseudo et au rang, sans badge ni chiffre inventé", hugo.includes('<p class="nom font-brand">Hugo</p>') && hugo.includes('class="rangTexte"') && !hugo.includes('class="badges"') && !hugo.includes('class="stats"') && !hugo.includes('class="stat"'));
    const src = fs.readFileSync("components/classement/PodiumBannieres.tsx", "utf8").replace(/\r\n/g, "\n");
    check("au survol de la souris (pas du doigt), au focus clavier (:focus-visible), au premier toucher : le volet s'ouvre ; Échap, un toucher ailleurs, la sortie le ferment", src.includes('e.pointerType !== "touch"') && src.includes("onPointerEnter") && src.includes("onPointerLeave") && src.includes(":focus-visible") && src.includes('ev.key === "Escape"') && src.includes('document.addEventListener("pointerdown"') && src.includes("hote.current.contains"));
    check("au doigt, le premier toucher n'ouvre pas la carte du joueur (preventDefault + stopPropagation en capture) ; le second suit le lien", src.includes("onClickCapture") && src.includes("doigt.current && !ouvert") && src.includes("e.preventDefault()") && src.includes("e.stopPropagation()") && src.includes('onPointerDownCapture={(e) => {\n        doigt.current = e.pointerType === "touch"'));
    check("le côté du volet est calculé sur des mesures (placerVolet) et le décalage posé en --dx", src.includes("placerVolet(") && src.includes('setProperty("--dx"'));
    const seulesComposees = rendre(<PodiumBannieres rows={[rang(0, "Camille", { banniere: compositionExemple({}), perso: PERSO }), rang(1, "Hugo", { banniere: compositionExemple({}) }), null]} label="Podium" />);
    check("des bannières composées seules : pas de marge de tête en plus (même si l'ancien personnage traîne dans la base)", seulesComposees.includes('data-perso="0"') && compte(seulesComposees, /<a [^>]*href="\/duel"/g) === 1);
    const sans = rendre(<PodiumBannieres rows={[rang(0, "Camille"), rang(1, "Hugo"), rang(2, "Léa")]} label="Podium" />);
    check("sans bannière composée, le podium est celui d'avant (fanions, reflet, pas de volet)", !sans.includes("composee") && !sans.includes('class="volet"') && compte(sans, /class="reflet"/g) === 3);
  }

  console.log("\n# Le panneau seul dans sa boîte (le volet)");
  {
    const etats = SCEAUX.map((d) => etatSceau(d, { ...STATS_EXEMPLE, meilleureSerie: 45, questions: 6000, duelsGagnes: 120 }));
    const v = panneauVue({ panneau: { badges: [], stats: ["elo", "duels", "sceaux"] }, nom: "Sforzinda", titre: null, elo: 1612, mastery: 62, place: 7, gamesPlayed: 40, stats: STATS_EXEMPLE, etats });
    const carte = rendre(<PanneauJoueur v={v} />);
    const seul = rendre(<PanneauJoueur v={v} isole />);
    const droite = rendre(<PanneauJoueur v={v} isole cote="droite" />);
    check("dans la carte complète : rien de plus (ni isole ni côté)", !carte.includes("data-isole") && !carte.includes("data-cote"));
    check("seul : marqué isolé, du côté gauche par défaut ; posé à droite, il le dit (le texte se décale, la bannière en cache la gauche)", seul.includes('data-isole=""') && seul.includes('data-cote="gauche"') && droite.includes('data-cote="droite"'));
    const sansChiffres = rendre(<PanneauJoueur v={{ ...v, stats: [], badges: [] }} isole />);
    check("sans chiffre : pas de liste vide", !sansChiffres.includes("<dl") && sansChiffres.includes('<p class="nom font-brand">Sforzinda</p>'));
  }

  console.log("\n# L'en-tête du profil (sans carte)");
  {
    const { EnteteJoueur } = await import("@/components/profil/EnteteJoueur");
    const PERSO = "https://exemple.supabase.co/storage/v1/object/public/profil-medias/1b2c3d4e-0000-4000-8000-000000000001/perso-1760000000000.png";
    const d = { id: "u1", name: "Sforzinda", nomComplet: null, avatarUrl: null, style: { ...STYLE_DEFAUT, perso: PERSO }, niveau: 5, levelPct: 40, xpTotal: 1200, elo: 1500, mastery: 60, place: 7, gamesPlayed: 20, linkedin: null, amis: 3 };
    let entete = "";
    try {
      entete = rendre(<EnteteJoueur d={d} />);
    } catch (e) {
      console.log(e);
    }
    check("l'en-tête est celui d'avant : le personnage du bandeau, la carte du rang seule à droite (lg:col-span-5)", entete.length > 0 && entete.includes("data-perso-bandeau") && entete.includes("lg:col-span-5") && !entete.includes("lg:items-start") && entete.includes("card-ink"));
    const enteteSrc = fs.readFileSync("components/profil/EnteteJoueur.tsx", "utf8");
    check("EnteteJoueur n'a plus de prop `carte` : la bannière composée n'est plus sur le profil", !/\bcarte\?:|carte = null|avecCarte|CarteBanniere/.test(enteteSrc));
    const page = fs.readFileSync("app/people/[id]/page.tsx", "utf8");
    check("la page du profil ne construit plus de carte : ni CarteBanniere, ni panneauVue, ni `carte=`", !page.includes("CarteBanniere") && !page.includes("panneauVue") && !page.includes("carte={carte}") && !page.includes("let carte"));
    const editeur = fs.readFileSync("components/profil/EditeurBanniere.tsx", "utf8");
    check("l'éditeur de Personnaliser garde son aperçu (la carte complète : CarteBanniere)", editeur.includes("CarteBanniere"));
  }

  console.log("\n# La feuille de style");
  {
    const compo = fs.readFileSync("components/profil/BanniereComposee.module.css", "utf8");
    const carte = fs.readFileSync("components/profil/CarteBanniere.module.css", "utf8");
    const pan = fs.readFileSync("components/profil/PanneauJoueur.module.css", "utf8");
    const pod = fs.readFileSync("components/classement/Podium.module.css", "utf8");
    check("la scène est un conteneur de la proportion 540 × 1105 ; la bannière y a ses 16,67 % et 15,38 %", /container-type:\s*inline-size/.test(compo) && compo.includes("aspect-ratio: 540 / 1105") && compo.includes("left: 16.6667%") && compo.includes("top: 15.3846%"));
    check("le décor ne capte aucun clic et le fond est coupé aux coins du cadre (26 / 850 : à 45°)", /\.scene\s*\{[^}]*pointer-events:\s*none/.test(compo) && compo.includes("clip-path: polygon(7.5% 0") && compo.includes("100% 3.0588%"));
    check("la carte : 860 × 1105, la plaque à 54,65 % de large et la bannière à 37,21 %", carte.includes("aspect-ratio: 860 / 1105") && carte.includes("width: 54.6512%") && carte.includes("left: 37.2093%"));
    check("le panneau se mesure en unités de la carte (cqw) avec des minimums lisibles (max(…px, …)) ; seul dans sa boîte (le volet), 470 unités de large", pan.includes("--u: calc(100cqw / 860)") && /font-size:\s*max\(\d+(?:\.\d+)?px/.test(pan) && pan.includes("clip-path") && pan.includes("--u: calc(100cqw / 470)") && pan.includes('.panneau[data-cote="droite"] .contenu'));
    check("le podium : la bannière garde son inclinaison, le pied est sous elle, le mouvement réduit la fige", pod.includes(".composee") && pod.includes(".plaqueId") && /prefers-reduced-motion[\s\S]*\.composee/.test(pod) && pod.includes('data-discreet="1"') && pod.includes('data-rl-motion="off"'));
    check("le volet : caché derrière la bannière, glisse et apparaît (data-ouvert), côté gauche, droit ou par-dessus (data-cote), au-dessus du reste, avec une ombre", /\.volet\s*\{[^}]*visibility:\s*hidden/.test(pod) && /\.volet\s*\{[^}]*pointer-events:\s*none/.test(pod) && pod.includes('.hote[data-ouvert="1"] .volet') && pod.includes('.hote[data-cote="droite"] .volet') && pod.includes('.hote[data-cote="dessus"] .volet') && /\.hote\[data-ouvert="1"\]\s*\{[^}]*z-index:\s*30/.test(pod) && /\.volet\s*\{[^}]*filter:\s*drop-shadow/.test(pod) && /\.composee\s*\{[^}]*z-index:\s*1/.test(pod));
    check("le volet : 1,3 fois la largeur de la bannière, 224 px au moins, 60 / 470 sous la bannière, aux proportions du panneau (470 / 850)", pod.includes("--pw: max(86.7cqw, 224px)") && pod.includes("var(--pw) * 60 / 470") && pod.includes("aspect-ratio: 470 / 850"));
    check("le volet : animation courte, coupée par le mouvement réduit, ?mouvement=off et le mode discret", /\.volet\s*\{[^}]*transition:[^;]*0\.24s/.test(pod) && /prefers-reduced-motion[\s\S]*\.volet/.test(pod) && /data-rl-motion="off"\]\) \.volet/.test(pod) && /data-discreet="1"\]\) \.volet/.test(pod));
    check("le fanion d'avant fait 15 % de moins en hauteur (9 : 12,75) et la place des têtes suit (10,2 %, 71 px)", /\.banniere\s*\{[^}]*aspect-ratio:\s*9 \/ 12\.75/.test(pod) && /padding-top:\s*min\(10\.2%,\s*71px\)/.test(pod));
    check("pas de noms de classe en double entre la carte et le panneau (CSS modules : deux plaques, deux bannières)", !/^\.plaque\s*[{,]/m.test(carte) && !/^\.banniere\s*[{,]/m.test(carte));
  }

  console.log("\n# Chemins");
  {
    const fichiers = [
      "components/profil/BanniereComposee.tsx",
      "components/profil/BanniereComposee.module.css",
      "components/profil/PanneauJoueur.tsx",
      "components/profil/PanneauJoueur.module.css",
      "components/profil/CarteBanniere.tsx",
      "components/profil/CarteBanniere.module.css",
      "components/classement/PodiumBannieres.tsx",
      "components/classement/Podium.module.css",
      "components/classement/podium.ts",
      "lib/profil/panneau-vue.ts",
      "scripts/profil/composition-exemple.ts",
      "app/preview-da/bannieres/page.tsx",
    ]
      .map((f) => fs.readFileSync(f, "utf8"))
      .join("\n");
    check("aucun chemin local ni de scratchpad dans les fichiers du lot", !/AppData|scratchpad|C:[\\/]Users/i.test(fichiers));
    check("le ratio de Léonard est celui de ses images (598 × 660)", Math.abs(RATIO_LEONARD - 598 / 660) < 1e-9);
  }

  console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
  process.exit(ko ? 1 : 0);
}
main();
