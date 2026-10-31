// Test du choix des trois du podium de S'affronter et du volet (le panneau de gauche
// qui sort de derrière la bannière), sans base, réseau ni navigateur :
//   npx tsx --tsconfig tsconfig.json scripts/classement/test-podium.ts
// Vérifie : qui monte sur le podium (les trois meilleurs parmi ceux qui ont fait au moins un
// duel, dans l'ordre du classement : un joueur qui n'a jamais joué n'y monte pas, le 6e du
// classement qui a joué peut être 2e du podium), que la page et le tableau font le même choix,
// où se pose le volet (à gauche, à droite si la place manque, par-dessus sur un écran étroit) et
// que la lecture des panneaux dégrade proprement (aucune exception, aucune entrée inventée).
import fs from "node:fs";
import React from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PODIUM_PLACES, RECOUVREMENT_VOLET, VOLET_LARGEUR_MIN, idsDuPodium, joueursDuPodium, placerVolet } from "@/components/classement/podium";
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

  console.log("\n# Où se pose le volet");
  {
    const B = { gauche: -SCENE.x0 / SCENE_L, droite: (100 - SCENE.x0) / SCENE_L };
    const L = VOLET_LARGEUR_MIN + 8; // 232
    const sous = L * RECOUVREMENT_VOLET;
    check("la bannière est à 1/6 du bord gauche de sa boîte et à 5/6 du bord droit ; 60 / 470 du volet passent derrière elle", Math.abs(B.gauche - 1 / 6) < 1e-9 && Math.abs(B.droite - 5 / 6) < 1e-9 && Math.abs(RECOUVREMENT_VOLET - 60 / 470) < 1e-12);
    const large = placerVolet({ hote: { left: 600, width: 210 }, bannieres: B, largeur: L, zone: { left: 0, right: 1400 } });
    check("de la place : à gauche de la bannière, sans décalage", large.cote === "gauche" && large.dx === 0);
    const gauche = placerVolet({ hote: { left: 28, width: 190 }, bannieres: B, largeur: L, zone: { left: 0, right: 1400 } });
    check("la bannière la plus à gauche, où la place manque : à droite", gauche.cote === "droite" && gauche.dx === 0, JSON.stringify(gauche));
    // la page ne coupe pas le volet au-delà de son contenu (main, derrière la barre latérale) : la zone, pas la fenêtre, décide
    const barre = placerVolet({ hote: { left: 400, width: 200 }, bannieres: B, largeur: L, zone: { left: 280, right: 1400 } });
    check("la zone de la page (derrière la barre latérale) compte, pas le bord de la fenêtre : pas assez de place à gauche → à droite", barre.cote === "droite", JSON.stringify(barre));
    const juste = placerVolet({ hote: { left: 400, width: 200 }, bannieres: B, largeur: L, zone: { left: 100, right: 1400 } });
    check("la même place avec assez de place à gauche dans la zone → à gauche", juste.cote === "gauche");
    // téléphone : trois places de ~100 px dans 375 (la place de gauche, le n° 1 au milieu, la place de droite)
    const tel = { left: 0, right: 375 };
    const p2 = placerVolet({ hote: { left: 16, width: 103 }, bannieres: B, largeur: L, zone: tel });
    const p1 = placerVolet({ hote: { left: 127, width: 123 }, bannieres: B, largeur: L, zone: tel });
    const p3 = placerVolet({ hote: { left: 258, width: 103 }, bannieres: B, largeur: L, zone: tel });
    check("téléphone : la place de gauche ouvre à droite, celle de droite à gauche", p2.cote === "droite" && p3.cote === "gauche", `${p2.cote} ${p3.cote}`);
    check("téléphone : le n° 1 au milieu n'a de place ni à gauche ni à droite : par-dessus la bannière, centré sur la place", p1.cote === "dessus" && p1.dx === 0, JSON.stringify(p1));
    // une page encore plus étroite : par-dessus, ramené dans la page (6 px de marge)
    const g = placerVolet({ hote: { left: 20, width: 100 }, bannieres: B, largeur: L, zone: { left: 0, right: 260 } });
    const d = placerVolet({ hote: { left: 170, width: 100 }, bannieres: B, largeur: L, zone: { left: 0, right: 300 } });
    check("une page étroite, la place près du bord gauche : par-dessus, décalé vers la droite pour garder 6 px de marge", g.cote === "dessus" && Math.round(20 + 50 - L / 2 + g.dx) === 6, JSON.stringify(g));
    check("une page étroite, la place près du bord droit : par-dessus, décalé vers la gauche pour garder 6 px de marge", d.cote === "dessus" && Math.round(170 + 50 - L / 2 + d.dx + L) === 300 - 6, JSON.stringify(d));
    check("une page plus étroite que le volet : pas d'exception, un décalage fini", Number.isFinite(placerVolet({ hote: { left: 0, width: 80 }, bannieres: B, largeur: L, zone: { left: 0, right: 200 } }).dx));
    check("le volet est assez large pour se lire : 224 px au moins", VOLET_LARGEUR_MIN === 224 && fs.readFileSync("components/classement/Podium.module.css", "utf8").includes(`${VOLET_LARGEUR_MIN}px`) && sous > 0);
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
