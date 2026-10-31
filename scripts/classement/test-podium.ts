// Test du choix des trois du podium de S'affronter et du volet (le panneau de gauche
// qui sort de derrière la bannière), sans base, réseau ni navigateur :
//   npx tsx --tsconfig tsconfig.json scripts/classement/test-podium.ts
// Vérifie : qui monte sur le podium (les trois meilleurs parmi ceux qui ont fait au moins un
// duel, dans l'ordre du classement : un joueur qui n'a jamais joué n'y monte pas, le 6e du
// classement qui a joué peut être 2e du podium), que la page et le tableau font le même choix,
// où se pose le volet (à gauche, à droite si la place manque, par-dessus sur un écran étroit), qu'il a
// la taille de la bannière (96 % en largeur et en hauteur, ses proportions 360 × 850 ; sous 194 px de
// place, le plancher de 129 px des textes de 10 px l'emporte en largeur, jamais en hauteur), que ce qu'il
// garde y tient (les lignes retirées sous 202 px de place, recalculées depuis la feuille de style), et
// que la lecture des panneaux dégrade proprement (aucune exception, aucune entrée inventée).
import fs from "node:fs";
import React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PODIUM_PLACES, RECOUVREMENT_VOLET, TEXTE_VOLET, VOLET_LARGEUR_MIN, debordCalques, decalerVolet, idsDuPodium, joueursDuPodium, placerVolet } from "@/components/classement/podium";
import { SCENE, SCENE_L } from "@/lib/profil/banniere";
import type { BoardRow } from "@/components/classement/types";
import { compositionExemple } from "../profil/composition-exemple";

// statsProfil (lib/profil/donnees.ts) se range dans React.cache, qu'il n'y a que sous Next : ici, une fonction toute simple
(React as unknown as { cache?: unknown }).cache ??= (f: unknown) => f;

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const egal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** Un tableau de `parties.length` joueurs dans l'ordre du classement : parties[i] = le nombre de duels du joueur de la place i + 1. */
const tableau = (parties: number[]) => parties.map((g, i) => ({ userId: "u" + (i + 1), gamesPlayed: g, rank: i + 1, elo: 1800 - i * 40 }));
const lu = (rows: Array<{ userId: string } | null>) => rows.map((r) => r?.userId ?? null);

async function main() {
  console.log("# Qui monte sur le podium");
  {
    check("trois places", PODIUM_PLACES === 3);
    check("les trois premiers du classement, quand tous ont joué", egal(idsDuPodium(tableau([9, 8, 7, 6, 5])), ["u1", "u2", "u3"]));
    check("un joueur qui n'a jamais joué n'y monte pas : le 2e du classement (0 duel) cède sa place", egal(idsDuPodium(tableau([12, 0, 5, 3])), ["u1", "u3", "u4"]), JSON.stringify(idsDuPodium(tableau([12, 0, 5, 3]))));
    const t6 = tableau([12, 0, 0, 0, 0, 3]);
    check("le 6e du classement, qui a joué, est 2e du podium (et ce n'est pas le 2e du classement)", lu(joueursDuPodium(t6)).join(" ") === "u1 u6 " && idsDuPodium(t6)[1] === "u6" && idsDuPodium(t6).join() !== t6.slice(0, 3).map((r) => r.userId).join());
    check("il en manque : la place reste vide (null) au lieu d'y mettre quelqu'un qui n'a pas joué", egal(lu(joueursDuPodium(t6)), ["u1", "u6", null]) && idsDuPodium(t6).length === 2);
    check("le placement en cours compte : un seul duel suffit", egal(idsDuPodium(tableau([0, 1, 0, 1, 2])), ["u2", "u4", "u5"]));
    check("l'ordre est celui du classement, jamais celui d'un autre critère", egal(idsDuPodium([{ userId: "a", gamesPlayed: 3 }, { userId: "b", gamesPlayed: 90 }, { userId: "c", gamesPlayed: 1 }, { userId: "d", gamesPlayed: 40 }]), ["a", "b", "c"]));
    check("personne n'a joué : aucun joueur, trois places vides", egal(idsDuPodium(tableau([0, 0, 0, 0])), []) && egal(lu(joueursDuPodium(tableau([0, 0]))), [null, null, null]));
    check("un tableau vide : rien", egal(idsDuPodium([]), []) && egal(lu(joueursDuPodium([])), [null, null, null]));
    check("au plus trois, même avec huit joueurs qui ont tous joué", idsDuPodium(tableau([5, 5, 5, 5, 5, 5, 5, 5])).length === 3);
    const lignes = tableau([12, 0, 0, 0, 0, 3]);
    check("la fonction rend les lignes elles-mêmes (le tableau s'en sert pour dessiner)", joueursDuPodium(lignes)[1] === lignes[5]);
  }

  console.log("\n# La page et le tableau font le même choix");
  {
    const page = fs.readFileSync("app/classement/page.tsx", "utf8");
    const tab = fs.readFileSync("components/classement/Leaderboard.tsx", "utf8");
    check("la page charge les bannières des joueurs du podium (idsDuPodium), plus des trois premières lignes (slice(0, 3))", page.includes("podiumDe(supabase, idsDuPodium(leaderboard))") && !/leaderboard\.slice\(0,\s*3\)/.test(page));
    check("le tableau choisit avec la même fonction (joueursDuPodium), sans refaire son propre filtre", tab.includes("joueursDuPodium(board)") && !/board\.filter\(\(r\) => r\.gamesPlayed > 0\)/.test(tab));
    check("la page calcule le panneau des joueurs du podium (panneauxDuPodium) et le joint à leur ligne", page.includes("panneauxDuPodium(") && page.includes("joueursDuPodium(lignes)") && page.includes("panneau: panneaux.get(r.userId)"));
  }

  // les mesures du volet, lues dans la feuille de style du podium : largeur max(A cqw, B px) ; hauteur min(proportions, C × la bannière)
  const pod = fs.readFileSync("components/classement/Podium.module.css", "utf8");
  const pan = fs.readFileSync("components/profil/PanneauJoueur.module.css", "utf8");
  const mw = pod.match(/--pw: max\(([\d.]+)cqw, (\d+)px\);/);
  const mh = pod.match(/--ph: min\(var\(--pw\) \* 850 \/ 360, 100cqw \* 850 \/ 540 \* ([\d.]+)\);/);
  /** la part de la place que fait le volet en largeur (64 cqw : 0,64) */
  const A = Number(mw?.[1] ?? NaN) / 100;
  /** la part de la hauteur de la bannière où le volet plafonne (0,96) */
  const C = Number(mh?.[1] ?? NaN);
  /** pour une place de W px : le volet (pw × ph), la bannière (bw × bh : 360 et 850 sur les 540 de la scène), la hauteur du volet en unités (sur 360 de large) */
  const mesures = (W: number) => {
    const pw = Math.max(A * W, VOLET_LARGEUR_MIN);
    const ph = Math.min((pw * 850) / 360, ((W * 850) / 540) * C);
    return { pw, ph, bw: (W * 360) / 540, bh: (W * 850) / 540, hu: (ph * 360) / pw };
  };

  console.log("\n# Où se pose le volet");
  {
    const B = { gauche: -SCENE.x0 / SCENE_L, droite: (100 - SCENE.x0) / SCENE_L };
    const L = VOLET_LARGEUR_MIN + 11; // 140 (pair : les centrages tombent juste)
    const sous = L * RECOUVREMENT_VOLET;
    check("la bannière est à 1/6 du bord gauche de sa boîte et à 5/6 du bord droit ; 60 / 360 du volet passent derrière elle", Math.abs(B.gauche - 1 / 6) < 1e-9 && Math.abs(B.droite - 5 / 6) < 1e-9 && Math.abs(RECOUVREMENT_VOLET - 60 / 360) < 1e-12 && (pod.match(/var\(--pw\) \* 60 \/ 360/g) ?? []).length === 2);
    const large = placerVolet({ hote: { left: 600, width: 210 }, bannieres: B, largeur: L, zone: { left: 0, right: 1400 } });
    check("de la place : à gauche de la bannière, sans décalage", large.cote === "gauche" && large.dx === 0);
    const gauche = placerVolet({ hote: { left: 28, width: 190 }, bannieres: B, largeur: L, zone: { left: 0, right: 1400 } });
    check("la bannière la plus à gauche, où la place manque : à droite", gauche.cote === "droite" && gauche.dx === 0, JSON.stringify(gauche));
    // la page ne coupe pas le volet au-delà de son contenu (main, derrière la barre latérale) : la zone, pas la fenêtre, décide
    const barre = placerVolet({ hote: { left: 400, width: 200 }, bannieres: B, largeur: L, zone: { left: 330, right: 1400 } });
    check("la zone de la page (derrière la barre latérale) compte, pas le bord de la fenêtre : pas assez de place à gauche → à droite", barre.cote === "droite", JSON.stringify(barre));
    const juste = placerVolet({ hote: { left: 400, width: 200 }, bannieres: B, largeur: L, zone: { left: 100, right: 1400 } });
    check("la même place avec assez de place à gauche dans la zone → à gauche", juste.cote === "gauche");
    // téléphone de 375 px : la carte « Classement général » de 16 à 359, trois places (102, 122, 102 px, 8 px d'écart)
    const tel = { left: 16, right: 359 };
    const p2 = placerVolet({ hote: { left: 16, width: 102 }, bannieres: B, largeur: L, zone: tel });
    const p1 = placerVolet({ hote: { left: 126, width: 122 }, bannieres: B, largeur: L, zone: tel });
    const p3 = placerVolet({ hote: { left: 256, width: 102 }, bannieres: B, largeur: L, zone: tel });
    check("téléphone : la place de gauche ouvre à droite, celle de droite à gauche", p2.cote === "droite" && p3.cote === "gauche", `${p2.cote} ${p3.cote}`);
    check("téléphone : le volet, plus étroit qu'avant, tient à gauche du n° 1 (par-dessus la 2e place)", p1.cote === "gauche" && p1.dx === 0, JSON.stringify(p1));
    // un téléphone de 320 px (carte de 16 à 304 : places de 85, 102, 85 px) : le n° 1 n'a de place ni à gauche ni à droite
    const etroit = placerVolet({ hote: { left: 109, width: 102 }, bannieres: B, largeur: L, zone: { left: 16, right: 304 } });
    check("téléphone étroit : le n° 1 au milieu, sans place d'aucun côté : par-dessus la bannière, centré sur la place", etroit.cote === "dessus" && etroit.dx === 0, JSON.stringify(etroit));
    // une page encore plus étroite : par-dessus, ramené dans la page (6 px de marge)
    const g = placerVolet({ hote: { left: 20, width: 100 }, bannieres: B, largeur: L, zone: { left: 0, right: 200 } });
    const d = placerVolet({ hote: { left: 100, width: 100 }, bannieres: B, largeur: L, zone: { left: 0, right: 210 } });
    check("une page étroite, la place près du bord gauche : par-dessus, décalé vers la droite pour garder 6 px de marge", g.cote === "dessus" && Math.round(20 + 50 - L / 2 + g.dx) === 6, JSON.stringify(g));
    check("une page étroite, la place près du bord droit : par-dessus, décalé vers la gauche pour garder 6 px de marge", d.cote === "dessus" && d.dx < 0 && Math.round(100 + 50 - L / 2 + d.dx + L) === 210 - 6, JSON.stringify(d));
    check("une page plus étroite que le volet : pas d'exception, un décalage fini", Number.isFinite(placerVolet({ hote: { left: 0, width: 80 }, bannieres: B, largeur: L, zone: { left: 0, right: 120 } }).dx));
    check("le volet est assez large pour se lire : 129 px au moins (ses plus petits textes, 28 unités sur 360, font alors 10 px), le plancher du CSS", VOLET_LARGEUR_MIN === 129 && (28 * VOLET_LARGEUR_MIN) / 360 >= 10 && (28 * (VOLET_LARGEUR_MIN - 1)) / 360 < 10 && Number(mw?.[2]) === VOLET_LARGEUR_MIN && sous > 0);
  }

  console.log("\n# Le volet ne se cache pas derrière ce qui déborde de la bannière, ni sous le bord de la carte");
  {
    const B = { gauche: -SCENE.x0 / SCENE_L, droite: (100 - SCENE.x0) / SCENE_L };
    // le pire cas : le volet le plus étroit (la part qui reste sous la bannière, donc l'écart permis, est la plus petite)
    const L = VOLET_LARGEUR_MIN;
    const sous = L * RECOUVREMENT_VOLET;
    // la composition d'exemple : pièces de 140 % (20 % de chaque côté), personnage de 110 % (5 %)
    const c = compositionExemple({ pieces: "hexa", perso: "fier" });
    const deb = debordCalques([c.perso, c.haut, c.bas]);
    check("ce qui déborde : les pièces par défaut dépassent de 20 % de chaque côté", Math.abs(deb.gauche - 0.2) < 1e-6 && Math.abs(deb.droite - 0.2) < 1e-6, JSON.stringify(deb));
    check("un calque sans image ne compte pas", egal(debordCalques([{ image: null, x: -25, l: 150 }]), { gauche: 0, droite: 0 }));
    check("un calque dans la bannière : rien ne déborde", egal(debordCalques([{ image: "x", x: 10, l: 80 }]), { gauche: 0, droite: 0 }));
    // la 2e place à 1440 px (mesurée) : place de 200 px, à 95 px du bord, la carte de 100 à 1340 : le volet s'ouvre à droite
    const hote = { left: 95, width: 200 };
    const largeB = hote.width * (B.droite - B.gauche);
    const d = placerVolet({ hote, bannieres: B, largeur: L, zone: { left: 100, right: 1340 }, debord: deb });
    const debutTexte = hote.left + hote.width * B.droite - sous + d.pousse + TEXTE_VOLET * L;
    const finPieces = hote.left + hote.width * B.droite + deb.droite * largeB;
    check("ouvert à droite : écarté pour que le texte commence après le bout des pièces (le pseudo n'est plus mangé)", d.cote === "droite" && d.pousse > 0 && debutTexte >= finPieces + 3, `${JSON.stringify(d)} texte ${debutTexte.toFixed(1)} pièces ${finPieces.toFixed(1)}`);
    check("écarté, il passe encore derrière la bannière (6 px au moins)", sous - d.pousse >= 6 - 1e-9);
    const sans = placerVolet({ hote, bannieres: B, largeur: L, zone: { left: 100, right: 1340 } });
    check("sans débordement : pas d'écart, le même côté", sans.pousse === 0 && sans.cote === d.cote);
    const g = placerVolet({ hote: { left: 600, width: 200 }, bannieres: B, largeur: L, zone: { left: 0, right: 1400 }, debord: deb });
    check("ouvert à gauche : écarté de même", g.cote === "gauche" && g.pousse === d.pousse);
    // juste la place à gauche : l'écart ne fait jamais sortir le volet de la zone, ni changer de côté
    const bG = 400 + 200 * B.gauche;
    const juste = placerVolet({ hote: { left: 400, width: 200 }, bannieres: B, largeur: L, zone: { left: bG + sous - L - 6 - 5, right: 1400 }, debord: deb });
    check("peu de place : l'écart s'arrête au bord de la zone, le côté ne change pas", juste.cote === "gauche" && juste.pousse === 5, JSON.stringify(juste));
    check("par-dessus la bannière : pas d'écart", placerVolet({ hote: { left: 109, width: 102 }, bannieres: B, largeur: L, zone: { left: 16, right: 304 }, debord: deb }).pousse === 0);
    // en hauteur : la carte coupe (1024 px, mesuré : le volet dépassait de 11 px en bas)
    check("rien ne coupe en hauteur : pas de décalage", decalerVolet({ haut: 450, hauteur: 405, zone: { top: -Infinity, bottom: Infinity } }) === 0);
    check("dans la carte : pas de décalage", decalerVolet({ haut: 450, hauteur: 405, zone: { top: 184, bottom: 900 } }) === 0);
    check("il dépasse du bas de la carte : remonté, 6 px au-dessus du bord", decalerVolet({ haut: 450, hauteur: 405, zone: { top: 184, bottom: 844 } }) === 844 - 6 - 405 - 450);
    check("il dépasse du haut : descendu, 6 px sous le bord", decalerVolet({ haut: 100, hauteur: 405, zone: { top: 130, bottom: 900 } }) === 36);
    check("plus haut que la carte : collé en haut", decalerVolet({ haut: 100, hauteur: 405, zone: { top: 130, bottom: 400 } }) === 36);
    check("le CSS applique l'écart et le décalage (--pousse des deux côtés, --dy)", (pod.match(/var\(--pousse, 0px\)/g) ?? []).length === 2 && pod.includes("var(--dy, 0px)"));
    check("la marge du texte du panneau est bien de 104 unités sur 360 (TEXTE_VOLET), des deux côtés de la bannière", Math.abs(TEXTE_VOLET - 104 / 360) < 1e-12 && /\[data-cote="droite"\] \.contenu \{\s*padding-left: calc\(var\(--u\) \* 104\)/.test(pan) && /\[data-cote="gauche"\] \.contenu \{\s*padding-right: calc\(var\(--u\) \* 104\)/.test(pan));
    // à toutes les largeurs de place (le volet suit la bannière dès 202 px, garde 129 px en dessous), les pièces ne mangent pas le texte
    const largeurs = [100, 120, 130, 150, 180, 193, 194, 200, 201, 202, 204, 210, 230, 240, 250];
    const touche = largeurs.filter((W) => {
      const h = { left: 400, width: W };
      const Lw = mesures(W).pw;
      const p = placerVolet({ hote: h, bannieres: B, largeur: Lw, zone: { left: 0, right: 1600 }, debord: deb });
      const finP = h.left + W * B.gauche - deb.gauche * W * (B.droite - B.gauche);
      const finTexte = h.left + W * B.gauche + Lw * RECOUVREMENT_VOLET - p.pousse - TEXTE_VOLET * Lw;
      return p.cote !== "gauche" || finTexte > finP - 3;
    });
    check("à toutes les largeurs de place (100 à 250 px), le texte du volet ouvert à gauche finit avant le bout des pièces", touche.length === 0, touche.join(" "));
  }

  console.log("\n# Le volet a la taille de la bannière (un peu moins), et ce qu'il garde y tient");
  {
    check("la largeur (--pw) et la hauteur (--ph) du volet sont dans le CSS ; il les applique (width, height) et se fait conteneur de taille", !!mw && !!mh && Number(mw[2]) === VOLET_LARGEUR_MIN && /\.volet \{[^}]*container-type: size;[^}]*width: var\(--pw\);\s*height: var\(--ph\);/.test(pod) && /top: calc\([^;]*- var\(--ph\) \/ 2 \+ var\(--dy, 0px\)\)/.test(pod) && !/\.volet \{[^}]*aspect-ratio/.test(pod), `${mw?.[0]} ${mh?.[0]}`);
    check("le volet seul a les proportions de la bannière (360 × 850, --u sur 360) : 96 % de sa largeur (64 cqw de la place, la bannière en fait 66,67), donc 96 % de sa hauteur", Math.abs(A / (360 / 540) - 0.96) < 1e-9 && Math.abs(C - 0.96) < 1e-9 && pan.includes(".panneau[data-isole] {\n  --u: calc(100cqw / 360);"), `A ${A} C ${C}`);
    const places = Array.from({ length: 151 }, (_, i) => 100 + i);
    const tropHaut = places.filter((W) => mesures(W).ph > mesures(W).bh * 0.96 + 1e-9);
    check("à toutes les largeurs de place (100 à 250 px, chaque pixel), le volet ne dépasse pas 96 % de la hauteur de la bannière", tropHaut.length === 0, tropHaut.join(" "));
    // en largeur : la bannière fait 2/3 de la place ; 129 px de volet (le plancher) la dépassent sous 194 px de place
    const egale = VOLET_LARGEUR_MIN / (360 / 540);
    const plein = Math.ceil(VOLET_LARGEUR_MIN / A);
    const tropLarge = places.filter((W) => W >= egale && mesures(W).pw > mesures(W).bw + 1e-9);
    const r = mesures(204);
    check("dès 194 px de place (l'ordinateur ; l'écran de l'utilisateur : 204 px), le volet n'est pas plus large que la bannière ; dès 202 px, il en fait 96 % en largeur et en hauteur, à ses proportions", Math.ceil(egale) === 194 && plein === 202 && tropLarge.length === 0 && places.filter((W) => W >= plein).every((W) => Math.abs(mesures(W).pw / mesures(W).bw - 0.96) < 1e-9 && Math.abs(mesures(W).ph / mesures(W).bh - 0.96) < 1e-9 && Math.abs(mesures(W).hu - 850) < 1e-6), `204 px : volet ${r.pw.toFixed(1)} × ${r.ph.toFixed(1)}, bannière ${r.bw.toFixed(1)} × ${r.bh.toFixed(1)} ; ${tropLarge.join(" ")}`);
    // sous 194 px (téléphone, tablette étroite) : à la taille de la bannière, ses textes passeraient sous 10 px ; le plancher l'emporte, en largeur seulement
    const petit = mesures(100);
    check("sous 194 px de place, le plancher de lisibilité (129 px : textes de 10 px) l'emporte en largeur seulement, la hauteur reste à 96 % de la bannière", places.filter((W) => W < egale).every((W) => mesures(W).pw === VOLET_LARGEUR_MIN && Math.abs(mesures(W).ph / mesures(W).bh - 0.96) < 1e-9), `100 px : volet ${petit.pw} × ${petit.ph.toFixed(0)}, bannière ${petit.bw.toFixed(0)} × ${petit.bh.toFixed(0)}`);

    // ce qui reste dans le panneau seul (en unités sur 360), recalculé depuis sa feuille de style : la règle « .panneau[data-isole] … »
    // si elle existe, sinon la règle de base
    const echappe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regle = (sel: string): string => (pan.match(new RegExp(`(?:^|\\n)${echappe(sel)} \\{([^}]*)\\}`)) ?? ["", ""])[1];
    const lire = (sel: string, prop: string, forme: string): number => {
      for (const s of [`.panneau[data-isole] ${sel}`, sel]) {
        const m = regle(s).match(new RegExp(`(?:^|[;\\s])${prop}: ${forme}`));
        if (m) return Number(m[1]);
      }
      return NaN;
    };
    const u = (sel: string, prop: string) => lire(sel, prop, "(?:max\\([\\d.]+px, )?calc\\(var\\(--u\\) \\* ([\\d.]+)\\)");
    const nb = (sel: string, prop: string) => lire(sel, prop, "([\\d.]+)(?:em)?;");
    const quatre = (sel: string) => [...(regle(sel).match(/(?:^|[;\s])padding: ([^;]+);/)?.[1] ?? "").matchAll(/calc\(var\(--u\) \* ([\d.]+)\)/g)].map((m) => Number(m[1]));
    const [padH, , padB] = quatre(".contenu");
    const [statH, , statB] = quatre(".stat");
    const v = {
      marges: padH + padB,
      nom: u(".nom", "font-size") * nb(".nom", "line-height"),
      ecart: u(".identite", "gap"),
      filet: u(".filet", "height"),
      insigne: u(".insigne", "height"),
      rangLigne: u(".rangTexte b", "font-size") * nb(".rangTexte b", "line-height"),
      provLigne: u(".provisoire", "font-size") * nb(".provisoire", "line-height"),
      blocs: u(".contenu", "gap"),
      losange: u(".losange", "height"),
      entreBadges: u(".badges", "gap"),
      stat: statH + statB + 2 * u(".stat", "border") + u(".stat dt", "font-size") * nb(".stat dt", "line-height") + u(".stat", "gap") + u(".stat dd", "font-size") * nb(".stat dd", "line-height"),
      entreStats: u(".stats", "gap"),
    };
    check("les mesures du panneau seul se lisent toutes dans sa feuille de style", Object.values(v).every((x) => Number.isFinite(x) && x > 0), JSON.stringify(v));
    // l'identité : le pseudo, le filet, le rang (l'insigne, ou le nom du palier sur trois lignes au plus, « Grand / Maître /
    // III », ou « Placement 3/5 » sur deux)
    const identite = v.nom + 2 * v.ecart + v.filet + Math.max(v.insigne, 3 * v.rangLigne, 2 * v.provLigne);
    const besoin = (badges: number, stats: number) => v.marges + identite + (badges ? v.blocs + badges * v.losange + (badges - 1) * v.entreBadges : 0) + (stats ? v.blocs + stats * v.stat + (stats - 1) * v.entreStats : 0);
    const seuils = [...pan.matchAll(/@container \(aspect-ratio > 360 \/ (\d+)\)/g)].map((m) => Number(m[1]));
    check("six seuils de hauteur, du plus haut au plus bas, et plus aucun sur 470", seuils.length === 6 && seuils.every((s, i) => i === 0 || s < seuils[i - 1]) && !pan.includes("aspect-ratio > 470"), seuils.join(" "));
    // les retraits, dans l'ordre des seuils : le 3e badge, le 3e chiffre, le 2e badge, le 2e chiffre, le dernier badge, le dernier chiffre
    const garde = (hu: number) => {
      const n = seuils.filter((s) => hu < s).length;
      return { badges: [3, 2, 2, 1, 1, 0, 0][n], stats: [3, 3, 2, 2, 1, 1, 0][n] };
    };
    const deborde = places.filter((W) => {
      const { hu } = mesures(W);
      const k = garde(hu);
      return besoin(k.badges, k.stats) > hu;
    });
    check("à toutes les largeurs de place, ce que le volet garde tient dans sa hauteur", deborde.length === 0, deborde.map((W) => `${W}:${mesures(W).hu.toFixed(0)}`).join(" "));
    check("à pleine taille (204 px de place, l'écran de l'utilisateur), rien n'est retiré : trois badges, trois chiffres", egal(garde(mesures(204).hu), { badges: 3, stats: 3 }) && egal(garde(850), { badges: 3, stats: 3 }) && besoin(3, 3) <= 850, `${besoin(3, 3).toFixed(1)} unités sur 850`);
    check("à chaque seuil : ce qui reste en dessous y tient, ce qu'il y avait au-dessus aussi, et rien ne part trop tôt (moins de 12 unités de marge)", seuils.every((s) => {
      const k = garde(s - 0.01);
      const avant = garde(s + 0.01);
      const b = besoin(avant.badges, avant.stats);
      return besoin(k.badges, k.stats) <= s - 0.01 && b <= s && b > s - 12;
    }), seuils.map((s) => { const a = garde(s + 0.01); return `${s}:${besoin(a.badges, a.stats).toFixed(1)}`; }).join(" "));
    check("les seuils et les retraits ne valent que pour le panneau seul (data-isole) : la carte complète n'en a aucun", [...pan.matchAll(/@container[^{]*\{\s*([^{]+)\{/g)].every((m) => m[1].trim().startsWith(".panneau[data-isole]")));
    // la colonne de texte du rang (360 − 38 − 104, moins l'insigne et l'écart) : « PLACEMENT » en mono (0,6 em + l'espacement) et
    // le plus long mot d'un palier (« Diamant », « Platine » : 7 lettres de Dela Gothic, ~0,78 em) y tiennent
    const colonne = 360 - 38 - 104 - u(".insigne", "width") - u(".rang", "gap");
    const placement = 9 * (0.6 + nb(".provisoire", "letter-spacing")) * u(".provisoire", "font-size");
    const palier = 7 * 0.78 * u(".rangTexte b", "font-size");
    check("la colonne du rang tient « PLACEMENT » et « Diamant » sans les couper", placement <= colonne && palier <= colonne, `colonne ${colonne}, placement ${placement.toFixed(0)}, palier ${palier.toFixed(0)}`);
  }

  console.log("\n# Les panneaux du podium : lecture qui dégrade proprement");
  {
    const { panneauxDuPodium } = await import("@/components/classement/data");
    const ligne = (i: number, extra: Partial<BoardRow> = {}): BoardRow => ({ userId: "u" + i, name: "Joueur " + i, avatarUrl: null, elo: 1800 - i * 100, gamesPlayed: 30 - i, rank: i + 1, mastery: 60, lastDelta: 3, isMe: false, bannerUrl: null, titre: null, ...extra });
    // une base qui plante à chaque lecture : aucune exception, aucune entrée (le podium montre alors le pseudo et le rang)
    const casse = { from: () => { throw new Error("base indisponible"); }, rpc: () => { throw new Error("base indisponible"); } } as unknown as SupabaseClient;
    let sortie: Map<string, unknown> | null = null;
    let erreur = "";
    try {
      sortie = await panneauxDuPodium(casse, null, [ligne(0, { banniere: compositionExemple({}) }), ligne(1, { banniere: compositionExemple({ pieces: "royal" }) })]);
    } catch (e) {
      erreur = String(e);
    }
    check("une base qui plante : pas d'exception", sortie !== null && erreur === "", erreur);
    check("une base qui plante : pas de panneau inventé (le podium montre le pseudo et le rang)", sortie !== null && sortie.size === 0, String(sortie?.size));
    const sans = await panneauxDuPodium(casse, null, [ligne(0), ligne(1, { banniere: null })]);
    check("des joueurs sans bannière composée : rien à lire, aucune entrée", sans.size === 0);
    const aucun = await panneauxDuPodium(casse, null, []);
    check("aucun joueur : aucune entrée", aucun.size === 0);
  }

  console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
  process.exit(ko ? 1 : 0);
}
main();
