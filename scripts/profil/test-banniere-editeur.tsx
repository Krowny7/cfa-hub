// Test de l'éditeur de la bannière composée (Personnaliser › Ta bannière), sans
// base ni réseau ni navigateur (react-dom/server et fonctions pures) :
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-banniere-editeur.tsx
// Vérifie : la géométrie du glisser (déplacer, huit poignées, quatre coins
// quand les proportions sont verrouillées, le clavier) avec des milliers de
// gestes tirés au hasard — jamais hors de la zone de débordement, jamais sous
// le minimum, le bord opposé reste en place — ; un geste complet (début,
// mouvements, fin ; un simple toucher n'écrit rien) ; l'ordre d'empilement ;
// les changements de composition (image mise, remplacée, retirée, préréglage,
// verrou, réinitialisation, cadrage du fond) et leur validation par le serveur
// (validerComposition) ; le rendu de la scène posable (cadre du calque choisi,
// poignées, zones à toucher) ; le rendu de l'éditeur (onglets, envoi, pièces
// du site, curseurs, ordre, panneau et son aperçu) à chaque état ; l'aperçu du
// panneau identique à celui du profil ; pas d'écouteur de fenêtre ; aucun
// chemin local.
import "./sans-css";
import "./react-global";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { STYLE_DEFAUT, type StyleProfil } from "@/lib/profil/catalogue";
import {
  BANNIERE_H,
  BANNIERE_L,
  CALQUE_H_MIN,
  CALQUE_L_MIN,
  PREREGLAGES,
  SCENE,
  bornerCalque,
  compositionDefaut,
  hauteurCalque,
  imagePrereglage,
  poserCalque,
  serialiserComposition,
  validerComposition,
  memeComposition,
  type Calque,
  type Composition,
} from "@/lib/profil/banniere";
import {
  COINS,
  POIGNEES,
  PAS_FIN,
  PAS_VITE,
  agrandir,
  avancerGeste,
  avecCadrage,
  avecCalque,
  avecChamp,
  avecImage,
  avecVerrou,
  commencerGeste,
  dansLaScene,
  deplacer,
  devantLeCadre,
  finDeGeste,
  parClavier,
  peutPousser,
  pointDeScene,
  poigneesDe,
  pousser,
  redimensionner,
  reinitialiser,
  selectionDepart,
  type Poignee,
} from "@/lib/profil/banniere-edition";
import { assemblerPanneau, statsCompletees } from "@/lib/profil/panneau-editeur";
import { panneauVue } from "@/lib/profil/panneau-vue";
import { ScenePosable } from "@/components/profil/ScenePosable";
import { EditeurBanniere } from "@/components/profil/EditeurBanniere";
import { ChoixPanneau, deplacerDans } from "@/components/profil/ChoixPanneau";
import { EditeurApercu } from "@/app/preview-da/bannieres/EditeurApercu";
import { FOND_EXEMPLE, LEONARD, RATIO_LEONARD, STATS_EXEMPLE, compositionExemple, panneauExemple } from "./composition-exemple";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const compte = (html: string, re: RegExp) => (html.match(re) ?? []).length;
/** les apostrophes et les espaces insécables d'un rendu ramenées à du texte simple */
const rendre = (el: React.ReactElement): string => renderToStaticMarkup(el).replace(/&#x27;/g, "'").replace(/\s/g, " ");
const K = BANNIERE_L / BANNIERE_H;
/** le bouton portant cet aria-label est-il désactivé ? */
const desactive = (html: string, label: string) => (html.match(new RegExp(`<button[^>]*aria-label="${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`)) ?? [""])[0].includes("disabled");

// un tirage reproductible
let graine = 20261030;
const hasard = () => {
  graine = (graine * 1664525 + 1013904223) % 4294967296;
  return graine / 4294967296;
};
const entre = (a: number, b: number) => a + hasard() * (b - a);

/** Un calque tiré au hasard, valide (verrouillé ou non), avec une image. */
function calqueAuHasard(): Calque {
  const r = entre(0.15, 4);
  const verrouille = hasard() < 0.5;
  return bornerCalque({ image: "https://exemple.supabase.co/x.png", x: entre(-25, 100), y: entre(-20, 100), l: entre(CALQUE_L_MIN, 140), h: verrouille ? null : entre(CALQUE_H_MIN, 90), r });
}
const droite = (k: Calque) => k.x + k.l;
const bas = (k: Calque) => k.y + hauteurCalque(k);
const proche = (a: number, b: number, tol = 0.25) => Math.abs(a - b) <= tol;

const UUID = "1b2c3d4e-0000-4000-8000-000000000001";
const PREFIXE = `https://exemple.supabase.co/storage/v1/object/public/profil-medias/${UUID}/`;
const url = (cle: string, ext = "png", quand = 1760000000000) => `${PREFIXE}${cle}-${quand}.${ext}`;

const brouillon = (style: StyleProfil) => ({ style, setStyle: () => {} });
const jamais = () => {
  throw new Error("le client de stockage n'est pas appelé à l'affichage");
};
const fondProfil = <span className="fond-du-profil" />;

async function main() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://exemple.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "cle-factice";

  console.log("# Du pointeur à la scène");
  {
    const r = { left: 100, top: 50, width: 540, height: 1300 };
    const a = pointDeScene(100, 50, r);
    const b = pointDeScene(640, 1350, r);
    const m = pointDeScene(370, 700, r);
    check("le coin haut gauche de la scène est (−25, −20), le coin bas droit (125, 110), le centre (50, 45)", a.x === -25 && a.y === -20 && b.x === 125 && b.y === 110 && proche(m.x, 50, 1e-9) && proche(m.y, 45, 1e-9));
    check("la bannière elle-même (100 %, 100 %) tombe à 25 / 150 de la largeur et 20 / 130 de la hauteur", proche(pointDeScene(100 + (540 * 125) / 150, 50 + (1300 * 120) / 130, r).x, 100, 1e-9) && proche(pointDeScene(100 + (540 * 125) / 150, 50 + (1300 * 120) / 130, r).y, 100, 1e-9));
    check("une boîte sans taille ne divise pas par zéro", Number.isFinite(pointDeScene(5, 5, { left: 0, top: 0, width: 0, height: 0 }).x));
  }

  console.log("\n# Déplacer");
  {
    let dehors = 0;
    for (let i = 0; i < 3000; i++) {
      const k = calqueAuHasard();
      const d = deplacer(k, entre(-400, 400), entre(-400, 400));
      if (!dansLaScene(d) || d.l !== k.l || d.h !== k.h || d.image !== k.image) dehors++;
    }
    check("3 000 déplacements au hasard : toujours dans la zone de débordement, taille et image intactes", dehors === 0, `${dehors} hors bornes`);
    const k = poserCalque("perso", "x", 0.75);
    const loin = deplacer(k, 1000, 1000);
    check("tiré très loin à droite et en bas : collé au bord de la scène (125 %, 110 %)", proche(droite(loin), SCENE.x1, 0.11) && proche(bas(loin), SCENE.y1, 0.11));
    const loin2 = deplacer(k, -1000, -1000);
    check("tiré très loin à gauche et en haut : collé à (−25 %, −20 %)", loin2.x === SCENE.x0 && loin2.y === SCENE.y0);
    check("un petit déplacement est exact (au dixième)", deplacer({ ...k, x: 10, y: 10 }, 5.04, -2.51).x === 15 && deplacer({ ...k, x: 10, y: 10 }, 5.04, -2.51).y === 7.5);
  }

  console.log("\n# Redimensionner");
  {
    let hors = 0;
    let verrou = 0;
    let libre = 0;
    let ancre = 0;
    let n = 0;
    for (let i = 0; i < 2500; i++) {
      const k = calqueAuHasard();
      const dx = entre(-200, 200);
      const dy = entre(-200, 200);
      for (const p of poigneesDe(k)) {
        n++;
        const r = redimensionner(k, p, dx, dy);
        if (!dansLaScene(r)) hors++;
        if (k.h === null && r.h !== null) verrou++;
        if (k.h !== null && r.h === null) libre++;
        // le bord (ou coin) opposé reste en place
        const ex = p.includes("e") ? 1 : p.includes("w") ? -1 : 0;
        const ey = p.includes("s") ? 1 : p.includes("n") ? -1 : 0;
        const tol = 0.45;
        if (ex > 0 && !proche(r.x, k.x, tol)) ancre++;
        if (ex < 0 && !proche(droite(r), droite(k), tol)) ancre++;
        if (ey > 0 && !proche(r.y, k.y, tol)) ancre++;
        if (ey < 0 && !proche(bas(r), bas(k), tol)) ancre++;
        if (k.h !== null && ex === 0 && (!proche(r.x, k.x, tol) || !proche(r.l, k.l, tol))) ancre++;
        if (k.h !== null && ey === 0 && (!proche(r.y, k.y, tol) || !proche(hauteurCalque(r), hauteurCalque(k), tol))) ancre++;
      }
    }
    check(`${n} gestes de poignée au hasard (calques verrouillés : 4 coins ; libres : 8 poignées) : toujours dans la zone, jamais sous le minimum`, hors === 0, `${hors} hors bornes`);
    check("un calque verrouillé le reste (h null), un calque libre le reste (h nombre)", verrou === 0 && libre === 0);
    check("le bord ou le coin opposé à la poignée ne bouge pas", ancre === 0, `${ancre} écarts`);

    const k = bornerCalque({ image: "x", x: 10, y: 10, l: 30, h: null, r: 1 });
    const double = redimensionner(k, "se", 30, hauteurCalque(k));
    check("verrouillé, le coin bas droit tiré de (largeur, hauteur) double le calque (mise à l'échelle)", proche(double.l, 60, 0.4) && double.h === null && proche(double.x, 10, 0.11) && proche(double.y, 10, 0.11), JSON.stringify(double));
    const demi = redimensionner(k, "nw", 15, hauteurCalque(k) / 2);
    check("verrouillé, le coin haut gauche tiré vers l'intérieur réduit le calque de moitié, le coin bas droit reste fixe", proche(demi.l, 15, 0.4) && proche(droite(demi), droite(k), 0.3) && proche(bas(demi), bas(k), 0.3), JSON.stringify(demi));
    const libreK = bornerCalque({ image: "x", x: 10, y: 10, l: 30, h: 20, r: 1 });
    const largeur = redimensionner(libreK, "e", 20, 77);
    check("libre, la poignée du bord droit n'agit que sur la largeur (la hauteur ne bouge pas, même si le pointeur descend)", proche(largeur.l, 50, 0.11) && largeur.h === 20 && largeur.y === 10);
    const hauteur = redimensionner(libreK, "s", 99, 15);
    check("libre, la poignée du bord bas n'agit que sur la hauteur", hauteur.h === 35 && hauteur.l === 30 && hauteur.x === 10);
    const ecrase = redimensionner(libreK, "se", -500, -500);
    check("tiré bien au-delà du coin opposé : jamais sous le minimum (8 % de large, 4 % de haut)", ecrase.l === CALQUE_L_MIN && ecrase.h === CALQUE_H_MIN && ecrase.x === 10 && ecrase.y === 10);
    const grand = redimensionner(libreK, "se", 900, 900);
    check("tiré bien au-delà de la scène : le calque s'arrête au bord (125 %, 110 %)", proche(droite(grand), SCENE.x1, 0.11) && proche(bas(grand), SCENE.y1, 0.11));
    check("les poignées proposées : 4 coins verrouillé, 8 libre", poigneesDe({ h: null }).length === 4 && poigneesDe({ h: 10 }).length === 8 && COINS.length === 4 && POIGNEES.length === 8);
    // un calque déjà grand ne dépasse jamais en s'agrandissant
    const large = bornerCalque({ image: "x", x: -25, y: -20, l: 150, h: null, r: 1.5 });
    check("un calque qui remplit déjà la scène ne grandit plus ; il se réduit par ses coins", dansLaScene(redimensionner(large, "se", 50, 50)) && redimensionner(large, "se", -50, -50).l < 150);
  }

  console.log("\n# Au clavier");
  {
    const k = bornerCalque({ image: "x", x: 20, y: 30, l: 40, h: null, r: 1 });
    check("flèche droite : +0,5 %, avec Maj +2 % ; gauche, haut, bas de même", parClavier(k, "ArrowRight", false)!.x === 20.5 && parClavier(k, "ArrowRight", true)!.x === 22 && parClavier(k, "ArrowLeft", false)!.x === 19.5 && parClavier(k, "ArrowUp", true)!.y === 28 && parClavier(k, "ArrowDown", false)!.y === 30.5 && PAS_FIN === 0.5 && PAS_VITE === 2);
    const plus = parClavier(k, "+", false)!;
    check("+ agrandit de 1 % de largeur autour du centre ; − réduit ; Maj : 5 %", plus.l === 41 && proche(plus.x + plus.l / 2, k.x + k.l / 2, 0.11) && parClavier(k, "-", false)!.l === 39 && parClavier(k, "+", true)!.l === 45 && parClavier(k, "=", false)!.l === 41);
    check("une autre touche ne fait rien (null : la page garde la touche)", parClavier(k, "a", false) === null && parClavier(k, "Tab", false) === null && parClavier(k, "Escape", true) === null);
    const bord = bornerCalque({ image: "x", x: SCENE.x1 - 40, y: 30, l: 40, h: null, r: 1 });
    check("à la limite de la scène, la flèche ne la dépasse pas", dansLaScene(parClavier(bord, "ArrowRight", true)!) && parClavier(bord, "ArrowRight", true)!.x === bord.x);
    let sorti = 0;
    for (let i = 0; i < 500; i++) {
      let c = calqueAuHasard();
      for (const t of ["ArrowLeft", "ArrowUp", "+", "-", "ArrowRight", "ArrowDown"]) c = parClavier(c, t, hasard() < 0.5) ?? c;
      if (!dansLaScene(c)) sorti++;
    }
    check("500 suites de touches au hasard : toujours dans la zone", sorti === 0);
    const libre = bornerCalque({ image: "x", x: 20, y: 30, l: 40, h: 20, r: 1 });
    check("libre, + garde la forme (la hauteur suit la largeur)", agrandir(libre, 4).l === 44 && proche(agrandir(libre, 4).h!, 22, 0.11));
  }

  console.log("\n# Un geste complet");
  {
    const k = bornerCalque({ image: "x", x: 10, y: 10, l: 30, h: null, r: 1 });
    const g0 = commencerGeste(7, "deplacer", "perso", k, { x: 20, y: 20 });
    const g1 = avancerGeste(g0, { x: 30, y: 25 });
    const g2 = avancerGeste(g1, { x: 40, y: 35 });
    const final = finDeGeste(g2);
    check("déplacer : le calque suit le pointeur depuis le départ (+20, +15), pas de dérive entre deux mouvements", final !== null && final.x === 30 && final.y === 25 && g2.depart === k);
    check("revenir au point de départ ramène le calque à sa place : un geste sans effet n'enregistre rien", finDeGeste(avancerGeste(g2, { x: 20, y: 20 })) === null);
    check("un simple toucher (aucun mouvement) n'enregistre rien", finDeGeste(g0) === null);
    const redim = avancerGeste(commencerGeste(8, "se", "haut", k, { x: 40, y: 20 }), { x: 70, y: 20 + hauteurCalque(k) * 2 });
    check("poignée : le geste redimensionne depuis le départ (coin bas droit tiré)", finDeGeste(redim)!.l > 30 && finDeGeste(redim)!.x === 10);
    let sorti = 0;
    for (let i = 0; i < 300; i++) {
      const depart = calqueAuHasard();
      const modes: Poignee[] = [...poigneesDe(depart)];
      let g = commencerGeste(1, hasard() < 0.4 ? "deplacer" : modes[Math.floor(hasard() * modes.length)], "perso", depart, { x: entre(-25, 125), y: entre(-20, 110) });
      for (let m = 0; m < 12; m++) g = avancerGeste(g, { x: entre(-60, 160), y: entre(-50, 140) });
      if (!dansLaScene(g.dernier)) sorti++;
    }
    check("300 gestes de 12 mouvements chacun, pointeur partout (même hors de la scène) : toujours dans la zone", sorti === 0);
  }

  console.log("\n# L'ordre d'empilement");
  {
    const o = compositionDefaut().ordre;
    check("par défaut, du fond vers l'avant : cadre, personnage, pièce du bas, pièce du haut", o.join(" ") === "cadre perso bas haut");
    check("avancer le personnage d'un cran : il passe devant la pièce du bas", pousser(o, "perso", 1).join(" ") === "cadre bas perso haut");
    check("reculer le personnage : il passe derrière le cadre", pousser(o, "perso", -1).join(" ") === "perso cadre bas haut" && !devantLeCadre(pousser(o, "perso", -1), "perso") && devantLeCadre(o, "perso"));
    check("aux extrémités, l'ordre ne change pas (et le bouton se désactive)", pousser(o, "haut", 1).join(" ") === o.join(" ") && !peutPousser(o, "haut", 1) && !peutPousser(o, "cadre", -1) && peutPousser(o, "perso", 1) && peutPousser(o, "perso", -1));
    let ok = true;
    let ordre = [...o];
    for (let i = 0; i < 200; i++) {
      ordre = pousser(ordre, (["perso", "haut", "bas", "cadre"] as const)[Math.floor(hasard() * 4)], hasard() < 0.5 ? 1 : -1);
      if (ordre.length !== 4 || !["cadre", "perso", "bas", "haut"].every((x) => ordre.filter((y) => y === x).length === 1)) ok = false;
    }
    check("200 mouvements au hasard : l'ordre reste une permutation des quatre éléments", ok);
    const c = { ...compositionDefaut(), ordre };
    check("le serveur accepte l'ordre qu'on obtient", validerComposition(serialiserComposition(c), { prefixe: PREFIXE, gagnes: null }).refus.length === 0);
  }

  console.log("\n# Changer la composition");
  {
    const vide = compositionDefaut();
    const avecPerso = avecImage(vide, "perso", url("perso"), 0.8);
    check("une image sur un calque vide : posé à sa place par défaut (poserCalque), avec la proportion de l'image", avecPerso.perso.image === url("perso") && avecPerso.perso.r === 0.8 && JSON.stringify(avecPerso.perso) === JSON.stringify(poserCalque("perso", url("perso"), 0.8)));
    const bouge = avecCalque(avecPerso, "perso", bornerCalque({ ...avecPerso.perso, x: 3, y: 7, l: 60 }));
    const remplace = avecImage(bouge, "perso", url("perso", "webp", 1760000000999), 2);
    check("remplacer l'image garde la place et la largeur ; la hauteur suit la nouvelle proportion", remplace.perso.x === 3 && remplace.perso.y === 7 && remplace.perso.l === 60 && remplace.perso.r === 2 && hauteurCalque(remplace.perso) < hauteurCalque(bouge.perso));
    const retire = avecImage(bouge, "perso", null);
    check("retirer l'image remet le calque à sa place par défaut, sans image", retire.perso.image === null && retire.perso.x === poserCalque("perso", null, bouge.perso.r).x);
    const piece = avecImage(vide, "haut", imagePrereglage("royal"), 5);
    check("un préréglage donne sa propre proportion (jamais celle qu'on lui passe)", piece.haut.image === "piece:royal" && Math.abs(piece.haut.r - 977 / 387) < 0.002);
    check("un préréglage ne se met pas sur le personnage ni le fond (le serveur le refuse) : l'éditeur ne le propose qu'au haut et au bas", PREREGLAGES.length === 4 && validerComposition({ perso: { image: "piece:meca" } }, { prefixe: PREFIXE, gagnes: null }).refus.length > 0);
    const fond = avecImage({ ...vide, fond: { image: null, px: 20, py: 80 } }, "fond", url("fond", "jpg"));
    check("l'image du fond remet son cadrage au centre", fond.fond.image === url("fond", "jpg") && fond.fond.px === 50 && fond.fond.py === 50);
    check("réinitialiser un calque le remet à sa place par défaut, son image reste", JSON.stringify(reinitialiser(bouge, "perso").perso) === JSON.stringify(poserCalque("perso", url("perso"), 0.8)));
    check("réinitialiser le fond recentre son cadrage", reinitialiser({ ...vide, fond: { image: "x", px: 3, py: 99 } }, "fond").fond.px === 50);
    const libre = avecVerrou(bouge.perso, false);
    check("déverrouiller fige la hauteur à sa valeur du moment ; reverrouiller la rend proportionnelle", libre.h !== null && proche(libre.h, hauteurCalque(bouge.perso), 0.11) && avecVerrou(libre, true).h === null);
    check("un champ tapé à la main est ramené dans les bornes", avecChamp(bouge.perso, "x", 9999).x + bouge.perso.l <= SCENE.x1 + 1e-9 && avecChamp(bouge.perso, "l", 0).l >= CALQUE_L_MIN && avecChamp(bouge.perso, "l", 0).l < 10 && avecChamp(bouge.perso, "y", -999).y === SCENE.y0 && dansLaScene(avecChamp(bouge.perso, "h", 500)));
    const cad = avecCadrage(vide, 150, -4);
    check("le cadrage du fond reste entre 0 et 100 (un nombre absurde revient au centre)", cad.fond.px === 100 && cad.fond.py === 0 && avecCadrage(vide, Number.NaN, 12.34).fond.px === 50 && avecCadrage(vide, 1, 12.34).fond.py === 12.3);
    check("le premier élément ouvert : le premier calque qui a une image, sinon le fond s'il en a un, sinon le personnage", selectionDepart(vide) === "perso" && selectionDepart(piece) === "haut" && selectionDepart({ ...vide, fond: { image: "x", px: 50, py: 50 } }) === "fond" && selectionDepart(compositionExemple()) === "perso");
    // tout ce que l'éditeur peut faire est accepté par le serveur
    let c: Composition = compositionDefaut();
    c = avecImage(c, "fond", url("fond", "jpg"));
    c = avecCadrage(c, 30, 70);
    c = avecImage(c, "perso", url("perso"), 0.75);
    c = avecImage(c, "haut", imagePrereglage("meca"));
    c = avecImage(c, "bas", url("bas", "webp"), 3);
    c = avecCalque(c, "bas", avecVerrou(c.bas, false));
    c = { ...c, ordre: pousser(c.ordre, "perso", -1), panneau: { badges: [], stats: ["place", "serie", "heures"] } };
    const v = validerComposition(serialiserComposition(c), { prefixe: PREFIXE, gagnes: null });
    check("une composition faite à l'éditeur (fond, personnage, préréglage, pièce envoyée, verrou, ordre, chiffres) passe la validation du serveur telle quelle", v.refus.length === 0 && v.composition !== null && memeComposition(v.composition, c), v.refus.join(" ; "));
    // les gestes aussi
    let g = commencerGeste(1, "se", "perso", c.perso, { x: 100, y: 100 });
    g = avancerGeste(g, { x: 140, y: 130 });
    const apresGeste = avecCalque(c, "perso", finDeGeste(g)!);
    check("une composition après un geste de poignée passe la validation du serveur", validerComposition(serialiserComposition(apresGeste), { prefixe: PREFIXE, gagnes: null }).refus.length === 0);
  }

  console.log("\n# La scène posable");
  {
    const c = compositionExemple({ fond: FOND_EXEMPLE, pieces: "meca", perso: "fier" });
    const faux = () => {};
    const scene = (selection: Parameters<typeof ScenePosable>[0]["selection"], comp: Composition = c) => rendre(<ScenePosable composition={comp} selection={selection} fond={fondProfil} onSelect={faux} onVivre={faux} onValider={faux} />);
    const sp = scene("perso");
    check("la scène : l'aperçu en grand (le même rendu que le profil), sa marge de débordement bordée et nommée", sp.includes("data-scene-posable") && sp.includes("debord") && sp.includes(">Débordement<") && sp.includes("data-composee"));
    check("le calque choisi a son cadre : focalisable, nommé, avec ses coordonnées et l'aide du clavier", sp.includes('data-selection="perso"') && sp.includes('tabindex="0"') && /aria-label="Personnage : gauche [-\d.]+ %, haut [-\d.]+ %, largeur [\d.]+ %, hauteur [\d.]+ %\. Flèches pour déplacer/.test(sp) && sp.includes('role="group"'));
    check("verrouillé (h null), le cadre a ses quatre poignées de coin", compte(sp, /data-poignee="/g) === 4 && ["nw", "ne", "se", "sw"].every((p) => sp.includes(`data-poignee="${p}"`)));
    check("les autres calques (haut, bas) se choisissent d'un toucher, ni focalisables ni cachés du doigt ; le fond aussi", sp.includes('data-choisir="haut"') && sp.includes('data-choisir="bas"') && !sp.includes('data-choisir="perso"') && sp.includes("zoneFond"));
    const libre = avecCalque(c, "perso", avecVerrou(c.perso, false));
    check("libre (h nombre), huit poignées", compte(scene("perso", libre), /data-poignee="/g) === 8);
    const sf = scene("fond");
    check("le fond choisi : pas de cadre à glisser, tous les calques qui ont une image se choisissent d'un toucher", !sf.includes("data-selection") && compte(sf, /data-choisir="/g) === 3 && !sf.includes("zoneFond"));
    const sansImage = scene("perso", compositionExemple({ pieces: null, perso: null }));
    check("un calque sans image n'a ni cadre ni zone à toucher", !sansImage.includes("data-selection") && !sansImage.includes("data-choisir"));
    check("les zones à toucher suivent l'ordre d'empilement (le plus en avant en dernier)", scene("fond", { ...c, ordre: ["haut", "cadre", "bas", "perso"] }).match(/data-choisir="([a-z]+)"/g)!.join(" ") === 'data-choisir="haut" data-choisir="bas" data-choisir="perso"');
    check("l'aperçu garde le même ordre d'empilement que le profil (les images sont rendues dans l'ordre choisi)", [...scene("perso", { ...c, ordre: ["perso", "cadre", "bas", "haut"] }).matchAll(/<(?:img|svg)\b[^>]*data-calque="([a-z]+)"/g)].map((m) => m[1]).join(" ") === "perso cadre bas haut");
  }

  console.log("\n# L'éditeur");
  {
    const { donnees, badges } = panneauExemple();
    const edit = (style: StyleProfil, o: Partial<Parameters<typeof EditeurBanniere>[0]> = {}) =>
      rendre(<EditeurBanniere b={brouillon(style)} enregistree={null} dispo fond={fondProfil} donnees={donnees} badges={badges} titre="Copiste" onEnvoi={() => {}} ranger={async () => false} client={jamais} {...o} />);
    const compo = compositionExemple({ fond: FOND_EXEMPLE, pieces: "meca", perso: "fier", panneau: { badges: ["titre:copiste"], stats: ["elo", "duels", "sceaux"] } });
    const html = edit({ ...STYLE_DEFAUT, banniere: compo });
    check("la section : « Ta bannière », reliée à son titre, avec l'aide", html.includes('id="rl-perso-banniere"') && html.includes('aria-labelledby="rl-bn-titre"') && html.includes(">Ta bannière<") && html.includes("rien ne sort au-delà"));
    check("quatre onglets (fond, personnage, pièce du haut, pièce du bas) ; le personnage est ouvert", compte(html, /role="tab"/g) === 4 && ["fond", "perso", "haut", "bas"].every((k) => html.includes(`id="rl-bn-onglet-${k}"`)) && /id="rl-bn-onglet-perso"[^>]*aria-selected="true"/.test(html) && compte(html, /aria-selected="true"/g) === 1);
    check("le volet : relié à son onglet", html.includes('role="tabpanel"') && html.includes('aria-labelledby="rl-bn-onglet-perso"'));
    check("l'envoi : PNG, WebP et JPG (pas de GIF), « Changer d'image » et « Retirer » quand il y a une image", html.includes('accept="image/png,image/webp,image/jpeg"') && !html.includes("gif") && html.includes("Changer d'image") && html.includes("Retirer") && html.includes("4 Mo au plus"));
    check("le placement du personnage : quatre curseurs (gauche, haut, largeur, hauteur) et leur case numérique", compte(html, /type="range"/g) === 4 && compte(html, /type="number"/g) === 4 && ["Gauche", "Haut", "Largeur", "Hauteur"].every((x) => html.includes(`>${x}</label>`)));
    check("les bornes des curseurs : gauche de −25 à 125 − largeur, largeur de 8 à 150", html.includes('min="-25"') && html.includes('min="8"') && html.includes('max="150"') && html.includes('min="-20"'));
    check("le verrou des proportions est coché ; la hauteur, calculée, est désactivée", /type="checkbox"[^>]*checked/.test(html) && html.includes(">Hauteur</label>") && html.slice(html.indexOf(">Hauteur</label>")).match(/<input[^>]*type="range"[^>]*>/)![0].includes("disabled") && html.includes("Garder les proportions de l'image"));
    check("« Réinitialiser » et l'aide du clavier (flèches, Maj, + et −)", html.includes("Réinitialiser") && html.includes("Flèches pour déplacer · Maj pour aller plus vite"));
    check("pas de pièces du site sur le personnage", !html.includes("data-prereglage"));
    const libre = edit({ ...STYLE_DEFAUT, banniere: avecCalque(compo, "perso", avecVerrou(compo.perso, false)) });
    check("proportions déverrouillées : la case est décochée, la hauteur se règle", !/type="checkbox"[^>]*checked/.test(libre) && compte(libre, /type="range"[^>]*disabled/g) === 0);
    const haut = edit({ ...STYLE_DEFAUT, banniere: compo }, { selectionInitiale: "haut" });
    check("la pièce du haut : les quatre pièces du site et « Aucune », la pièce prise est cochée, « Changer d'image » est proposé à la place de « Retirer » seulement s'il y a une image envoyée", compte(haut, /data-prereglage="/g) === 4 && PREREGLAGES.every((p) => haut.includes(`data-prereglage="${p.id}"`)) && /data-prereglage="meca"[^>]*aria-checked="true"|aria-checked="true"[^>]*data-prereglage="meca"/.test(haut) && haut.includes("Aucune") && haut.includes("royal-haut.webp") && !haut.includes("royal-base.webp") && haut.includes("Envoyer une image"));
    const bas = edit({ ...STYLE_DEFAUT, banniere: compo }, { selectionInitiale: "bas" });
    check("la pièce du bas montre les pièces du bas", bas.includes("royal-base.webp") && !bas.includes("royal-haut.webp"));
    const fond = edit({ ...STYLE_DEFAUT, banniere: compo }, { selectionInitiale: "fond" });
    check("le fond : envoyer, retirer, et seulement le point de cadrage (deux curseurs et un carré), pas de placement", compte(fond, /type="range"/g) === 2 && fond.includes("Cadrage du fond") && fond.includes("Cadrage horizontal") && !fond.includes("data-placement") && !fond.includes("Garder les proportions") && fond.includes("Le fond remplit la bannière"));
    const fondVide = edit({ ...STYLE_DEFAUT, banniere: compositionExemple({ pieces: "meca" }) }, { selectionInitiale: "fond" });
    check("sans image de fond : c'est le fond du profil, aucun cadrage à régler", fondVide.includes("c'est le fond de ton profil") && compte(fondVide, /type="range"/g) === 0);
    const vide = edit({ ...STYLE_DEFAUT, banniere: compositionExemple({ pieces: null, perso: null }) }, { selectionInitiale: "perso" });
    check("un calque vide : « Envoyer une image », ni « Retirer » ni placement", vide.includes("Envoyer une image") && !vide.includes("Retirer<") && !vide.includes("data-placement"));
    // l'ordre
    const ordre = [...html.matchAll(/data-ordre="([a-z]+)"/g)].map((m) => m[1]);
    check("l'ordre : du plus en avant au plus en arrière — pièce du haut, pièce du bas, personnage, cadre (dessiné par le site), fond", ordre.join(" ") === "haut bas perso cadre fond" && html.includes("dessiné par le site"));
    check("chaque calque dit s'il est devant ou derrière le cadre ; deux boutons « devant » / « derrière » par calque, désactivés aux extrémités", compte(html, /devant le cadre/g) === 3 && compte(html, /Passer devant : /g) === 3 && compte(html, /Passer derrière : /g) === 3 && /aria-label="Passer devant : Pièce du haut"[^>]*disabled|disabled=""[^>]*aria-label="Passer devant : Pièce du haut"/.test(html));
    const derriere = edit({ ...STYLE_DEFAUT, banniere: { ...compo, ordre: ["perso", "cadre", "bas", "haut"] } });
    check("le personnage derrière le cadre : « derrière le cadre »", derriere.includes("derrière le cadre"));
    // le panneau
    check("le panneau : l'aperçu de la carte complète, à jour, avec le titre porté, et trois emplacements de badges", html.includes("data-panneau-editeur") && html.includes("data-carte-banniere") && html.includes("Carte de Sforzinda") && html.includes(">Copiste<") && compte(html, /data-emplacement="/g) === 3);
    check("l'emplacement 01 porte le titre choisi (Copiste) ; 02 et 03 sont libres", /data-emplacement="1"[^>]*data-vide="false"|data-vide="false"[^>]*data-emplacement="1"/.test(html) && compte(html, /Emplacement libre/g) === 2);
    check("les badges proposés (sceaux, trophées, titres) sont des cases à cocher ; celui qui est pris est coché", html.includes('data-badge="trophee:ciblee:3"') && html.includes('data-badge="titre:copiste"') && compte(html, /aria-pressed="true"[^>]*data-badge|data-badge="[^"]+"[^>]*aria-pressed="true"/g) >= 1 && html.includes("Sceaux") && html.includes("Trophées") && html.includes("Titres"));
    check("trois listes de chiffres avec leur vraie valeur (ELO · 1 612, Duels gagnés · 48, Sceaux)", compte(html, /data-stat-slot="/g) === 3 && html.includes("ELO · 1 612") && html.includes("Duels gagnés · 48") && html.includes("Place au classement · n° 7"));
    check("chaque liste désactive les chiffres déjà pris ailleurs (une statistique ne se pose qu'une fois)", compte(html, /<option value="elo" disabled/g) === 2 && !/<option value="elo" disabled[^>]*selected/.test(html));
    check("rien de choisi : la ligne dit que le site pose ses sceaux les plus rares", edit({ ...STYLE_DEFAUT, banniere: compositionExemple({}) }).includes("tes trois sceaux les plus rares"));
    const trois = edit({ ...STYLE_DEFAUT, banniere: compositionExemple({ panneau: { badges: ["titre:copiste", "trophee:ciblee:3", badges.find((b) => b.genre === "sceau")!.id], stats: ["elo", "duels", "sceaux"] } }) });
    const nonPris = [...trois.matchAll(/<button[^>]*aria-pressed="false"[^>]*data-badge="[^"]+"[^>]*>/g)].map((m) => m[0]);
    check("trois badges pris : tous les autres sont désactivés", nonPris.length > 0 && nonPris.every((b) => b.includes("disabled")) && compte(trois, /data-vide="false"/g) === 3 && !trois.includes("Emplacement libre"));
    check("« Revenir à la bannière simple » quand la bannière est composée", html.includes("Revenir à la bannière simple"));
    // les autres états
    const sans = edit({ ...STYLE_DEFAUT, banniere: null });
    check("pas encore de bannière composée : l'éditeur s'ouvre sur une bannière vide (rien d'envoyé), sans « Revenir à… », sans note de reprise", sans.includes('role="tablist"') && !sans.includes("Revenir à la bannière simple") && !sans.includes("ancien personnage") && sans.includes("Envoyer une image"));
    const ancien = edit({ ...STYLE_DEFAUT, banniere: null, perso: url("perso") });
    check("l'ancien personnage est repris comme calque, avec la note qui dit d'enregistrer", ancien.includes("Ton ancien personnage a été repris comme calque") && ancien.includes(`src="${url("perso")}"`) && ancien.includes("Changer d'image"));
    const sansBase = edit({ ...STYLE_DEFAUT, banniere: compo }, { dispo: false });
    check("sans la colonne (migration pas collée) : une ligne dit que ça arrive, aucun éditeur, aucun envoi", sansBase.includes("arrive bientôt") && !sansBase.includes('role="tablist"') && !sansBase.includes("<input") && !sansBase.includes("data-scene-posable") && !sansBase.includes("Revenir à la bannière simple"));
  }

  console.log("\n# L'aperçu local de l'éditeur (app/preview-da/bannieres)");
  {
    const { donnees, badges } = panneauExemple();
    const avec = rendre(<EditeurApercu depart={compositionExemple({ fond: FOND_EXEMPLE, pieces: "royal" })} donnees={donnees} badges={badges} fondProfil={FOND_EXEMPLE} />);
    check("l'aperçu rend l'éditeur avec la composition d'exemple (onglets, scène, carte) ; le brouillon n'a pas bougé tant qu'on n'a rien fait", avec.includes('role="tablist"') && avec.includes("data-scene-posable") && avec.includes("data-carte-banniere") && avec.includes("Brouillon : la composition a changé."));
    const rien = rendre(<EditeurApercu depart={null} donnees={donnees} badges={badges} fondProfil={FOND_EXEMPLE} nu />);
    check("sans composition : l'éditeur s'ouvre vide (« Rien de composé »)", rien.includes('role="tablist"') && rien.includes("Rien de composé."));
    const bientot = rendre(<EditeurApercu depart={null} donnees={donnees} badges={badges} fondProfil={FOND_EXEMPLE} dispo={false} nu />);
    check("base pas prête : la ligne « arrive bientôt »", bientot.includes("arrive bientôt") && !bientot.includes('role="tablist"'));
  }

  console.log("\n# Le choix du panneau");
  {
    const { donnees, badges } = panneauExemple();
    const choix = (badgesPris: string[], stats: string[]) =>
      rendre(<ChoixPanneau panneau={{ badges: badgesPris, stats: stats as never }} badges={badges} donnees={donnees} onChange={() => {}} />);
    check("deplacerDans : un élément change de place, les bornes sont tenues", deplacerDans(["a", "b", "c"], 0, 2).join("") === "bca" && deplacerDans(["a", "b", "c"], 2, 0).join("") === "cab" && deplacerDans(["a", "b"], 0, 5).join("") === "ab" && deplacerDans(["a", "b"], -1, 0).join("") === "ab");
    const h = choix(["titre:copiste", "trophee:ciblee:3"], ["elo", "duels", "sceaux"]);
    check("deux badges pris : leurs flèches (monter / descendre / retirer) sont là, le premier ne monte pas et le dernier ne descend pas", compte(h, /aria-label="Monter : /g) === 2 && desactive(h, "Monter : Copiste") && !desactive(h, "Descendre : Copiste") && desactive(h, "Descendre : Trophée d'or · Entraînement ciblé") && compte(h, /Retirer ce badge : /g) === 2);
    check("les emplacements se glissent (draggable) quand ils sont pris", compte(h, /draggable="true"/g) === 2);
    check("les chiffres : trois listes, quinze statistiques chacune", compte(h, /data-stat-slot="/g) === 3 && compte(h, /<option value="elo"/g) === 3 && compte(h, /<option /g) === 45);
    check("des chiffres incomplets sont complétés avec ceux de la maquette, sans doublon", statsCompletees(["place"]).join(" ") === "place elo duels" && statsCompletees([]).join(" ") === "elo duels sceaux" && statsCompletees(["elo", "elo", "inconnue"]).join(" ") === "elo duels sceaux" && statsCompletees(null).length === 3);
    check("rien à afficher (rien gagné) : une ligne le dit", rendre(<ChoixPanneau panneau={{ badges: [], stats: ["elo", "duels", "sceaux"] }} badges={[]} donnees={donnees} onChange={() => {}} />).includes("Tu n'as encore rien gagné"));
  }

  console.log("\n# L'aperçu du panneau est celui du profil");
  {
    const { donnees, badges } = panneauExemple();
    const etats = SCEAUX_EXEMPLE();
    const meme = (choix: { badges: string[]; stats: never[] }, titre: string | null) => {
      const reel = panneauVue({ panneau: choix as never, nom: "Sforzinda", titre, elo: 1612, mastery: 62, place: 7, gamesPlayed: 40, stats: STATS_EXEMPLE, extras: { secondes: 3600 * 41.5, trophees: 12 }, etats });
      return JSON.stringify(assemblerPanneau(donnees, choix as never, titre)) === JSON.stringify(reel);
    };
    check("aucun choix : mêmes badges (les sceaux les plus rares), mêmes chiffres que le profil", meme({ badges: [], stats: [] }, null));
    check("un choix de badges et de chiffres : identique au profil, valeur par valeur", meme({ badges: ["trophee:ciblee:3", "titre:copiste", badges.find((b) => b.genre === "sceau")!.id], stats: ["place", "serie", "heures"] as never[] }, "Copiste"));
    check("des chiffres tous différents : identique au profil", meme({ badges: [], stats: ["questions", "maitrise", "taux-duels"] as never[] }, null));
    const rendu = assemblerPanneau(donnees, { badges: ["sceau:retire-du-catalogue"], stats: [] });
    check("un badge qu'on ne sait plus décrire est sauté : le repli du site", rendu.badges.length === 3 && rendu.badges.every((b) => b.genre === "sceau"));
  }

  console.log("\n# Pas d'écouteur oublié, pas de chemin local");
  {
    const lire = (f: string) => fs.readFileSync(f, "utf8");
    const scene = lire("components/profil/ScenePosable.tsx");
    const editeur = lire("components/profil/EditeurBanniere.tsx");
    const choix = lire("components/profil/ChoixPanneau.tsx");
    const css = lire("components/profil/EditeurBanniere.module.css");
    check("aucun écouteur sur la fenêtre ni le document (le pointeur est capturé par l'élément : rien à retirer)", ![scene, editeur, choix].some((s) => /(?:window|document)\.(?:add|remove)EventListener/.test(s)) && scene.includes("setPointerCapture") && scene.includes("releasePointerCapture"));
    check("un geste interrompu rend le calque à sa place (pointercancel), un geste perdu est validé (lostpointercapture)", scene.includes("onPointerCancel") && scene.includes("onLostPointerCapture") && scene.includes("finDeGeste"));
    check("le calque choisi ne laisse pas le doigt faire défiler la page (touch-action: none) ; les zones à toucher, si", /\.selection\s*{[^}]*touch-action:\s*none/.test(css) && !/\.zoneCalque\s*{[^}]*touch-action:\s*none/.test(css));
    check("les poignées ont une zone de toucher de plus de 40 px", /\.poignee::after\s*{[^}]*inset:\s*-14px/.test(css));
    const fichiers = [
      "lib/profil/banniere-edition.ts",
      "lib/profil/panneau-editeur.ts",
      "lib/voice-banniere.ts",
      "components/profil/ScenePosable.tsx",
      "components/profil/EditeurBanniere.tsx",
      "components/profil/EditeurBanniere.module.css",
      "components/profil/ChoixPanneau.tsx",
      "components/profil/Personnaliser.tsx",
      "components/profil/ModePersonnaliser.tsx",
      "scripts/profil/composition-exemple.ts",
      "app/preview-da/bannieres/page.tsx",
      "app/preview-da/bannieres/EditeurApercu.tsx",
    ]
      .map(lire)
      .join("\n");
    check("aucun chemin local ni de scratchpad dans les fichiers du lot", !/AppData|scratchpad|C:[\\/]Users/i.test(fichiers));
    const pers = lire("components/profil/Personnaliser.tsx");
    check("Personnaliser monte l'éditeur (et la feuille Bannière renvoie vers lui) ; l'ancien « Ton personnage » a disparu", pers.includes("<EditeurBanniere") && pers.includes("versBanniere") && !pers.includes("SectionPersonnage") && !lire("components/profil/SectionsPersonnaliser.tsx").includes("SectionPersonnage"));
    check("le serveur donne à Personnaliser la base prête, les badges proposables et le panneau", lire("components/profil/ModePersonnaliser.tsx").includes("banniereDisponible") && lire("components/profil/ModePersonnaliser.tsx").includes("donneesPanneau") && lire("components/profil/ModePersonnaliser.tsx").includes("badgesGagnes"));
    check("le ratio de Léonard est celui de ses images (598 × 660)", Math.abs(RATIO_LEONARD - 598 / 660) < 1e-9 && LEONARD.fier.endsWith(".webp") && K > 0);
  }

  console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
  process.exit(ko ? 1 : 0);
}

import { SCEAUX, etatSceau } from "@/lib/profil/sceaux";
function SCEAUX_EXEMPLE() {
  return SCEAUX.map((d) => etatSceau(d, { ...STATS_EXEMPLE, meilleureSerie: 45, questions: 6000, duelsGagnes: 120 }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

