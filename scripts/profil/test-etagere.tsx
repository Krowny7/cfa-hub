// Tests légers de l'étagère « Mes pièces », des pièces dessinées, des folios
// et des réglages du lot B6 (V3 §3.8, §3.9, §10.4, §11.5), sans base ni
// réseau ni navigateur (rendu statique par react-dom/server).
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-etagere.tsx
// Vérifie : l'onglet « pieces » de Moi ; les pièces dessinées (chaque pièce
// « css » a son rendu et réciproquement, ce qui bouge, le rendu des décors,
// figé en vignette ; le CSS n'anime que transform, opacity,
// background-position et le tracé, et se fige en mouvement réduit) ;
// l'étagère (rayons, ordre, compte sans les libres, folios, ce qui est porté
// reste à soi, « Y aller » vers une quête non retirée, image de bannière) ;
// le résumé ; deux pièces animées au plus sur téléphone, aucune sous la
// feuille ; ce qui se retire ; stylePorte (cadre, bannière et son image,
// titre, folio et son bloc) ; le bloc « Folio » (demi-largeur, première case
// vide, douze rangées, validé) ; les anecdotes des folios et leurs images ;
// FOLIOS.md ; le repos de la série (plages, règles, libellés).
import "./sans-css";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MOI_TABS, parseMoiTab } from "@/components/moi/data";
import { BANNIERES_DESSINEES, CADRES_DESSINES, banniereBouge, cadreBouge } from "@/lib/profil/rendus";
import { Banniere, CadreSceau } from "@/components/profil/Pieces";
import { BlocFolio, CarteFolio } from "@/components/profil/Folio";
import { ANIMEES_TELEPHONE, piecesAnimees, resumeEtagere, retirable, type PieceEtagere } from "@/lib/profil/etagere-vue";
import { etagere, folioPorte, hrefQuete, stylePorte } from "@/lib/profil/etagere";
import { FOLIOS, FOLIOS_ILLUSTRES, PIECES, queteDe } from "@/lib/profil/pieces";
import { STYLE_DEFAUT, STATS_VIDES, acquisDe, type StyleProfil } from "@/lib/profil/catalogue";
import { DISPOSITION_DEFAUT, RANGEES_MAX, avecBlocFolio, rangeeNeuve, validerDisposition, type Disposition } from "@/lib/profil/disposition";
import { catalogueCodex, contenuDuProgramme } from "@/lib/codex/catalogue";
import { ajouterJours, joursEntre, libellePlage, lundiDe, plagesDe, refusPose, type JourPause } from "@/components/moi/repos";
import type { Acquis } from "@/lib/profil/acquis";

// tsx compile le JSX à l'ancienne (React.createElement) : React global pour les composants rendus
(globalThis as { React?: typeof React }).React = React;

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const RACINE = process.cwd();

const vide: Acquis = acquisDe(STATS_VIDES);
const porteDe = (s: Partial<StyleProfil> = {}) => ({ frame: STYLE_DEFAUT.frame, banner: STYLE_DEFAUT.banner, titre: null, folio: null, ...s });

console.log("# L'onglet");
check("Moi a l'onglet « pieces », avant les réglages", MOI_TABS.indexOf("pieces") >= 0 && MOI_TABS.indexOf("pieces") < MOI_TABS.indexOf("reglages"));
check("?onglet=pieces et #pieces mènent à l'étagère", parseMoiTab("pieces") === "pieces" && parseMoiTab("#Pieces") === "pieces");

console.log("# Les pièces dessinées");
{
  const css = PIECES.filter((p) => p.anime === "css");
  const cadres = css.filter((p) => p.type === "cadre").map((p) => p.nue).sort();
  const bannieres = css.filter((p) => p.type === "banniere").map((p) => p.nue).sort();
  check("chaque cadre « css » a son rendu, et chaque rendu sa pièce", JSON.stringify(cadres) === JSON.stringify([...CADRES_DESSINES].sort()), cadres.join(","));
  check("chaque bannière « css » a son rendu, et chaque rendu sa pièce", JSON.stringify(bannieres) === JSON.stringify([...BANNIERES_DESSINEES].sort()), bannieres.join(","));
  check("ce qui bouge : cadres dessinés et vivants, pas le métal", cadreBouge("sanguine") && cadreBouge("liquide-diamant") && cadreBouge("dorure") && !cadreBouge("or") && !cadreBouge("aucun"));
  check("ce qui bouge : bannières dessinées et vivantes, pas sous une image", banniereBouge("route-milan") && banniereBouge("encre-vivante") && !banniereBouge("lavis") && !banniereBouge("route-milan", "https://x/y.webp"));
  for (const nue of CADRES_DESSINES) {
    const html = renderToStaticMarkup(<CadreSceau frame={nue} name="Léa" avatarUrl={null} size={64} />);
    const fige = renderToStaticMarkup(<CadreSceau frame={nue} name="Léa" avatarUrl={null} size={64} fige />);
    check(`cadre ${nue} : dessiné, décor animé, figé en vignette`, html.includes("dessine") && html.includes("deco") && html.includes("anim") && fige.includes("fige") && !html.includes("<canvas"));
  }
  for (const nue of BANNIERES_DESSINEES) {
    const html = renderToStaticMarkup(<Banniere banner={nue} accent="encre" />);
    const fige = renderToStaticMarkup(<Banniere banner={nue} accent="encre" fige />);
    check(`bannière ${nue} : son décor, animé, figé en vignette`, html.includes("anim") && fige.includes("fige"));
  }
  check("une image de joueur recouvre la bannière dessinée (pas de décor)", !renderToStaticMarkup(<Banniere banner="route-milan" bannerUrl="https://x/y.webp" accent="encre" />).includes("routeTrait"));
  check("aucun long tracé recopié : les décors réutilisent INK (<use>)", renderToStaticMarkup(<Banniere banner="carnet" accent="encre" />).includes("<use") && renderToStaticMarkup(<Banniere banner="imola" accent="encre" />).includes("<use"));

  // le CSS : seulement transform, opacity, background-position et le tracé ; figé en mouvement réduit
  const feuille = fs.readFileSync(path.join(RACINE, "components/profil/Profil.module.css"), "utf8");
  const section = feuille.slice(feuille.indexOf("Pièces dessinées (V3 §3.9)"));
  const images = [...section.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\n)\}/g)];
  const proprietes = new Set(images.flatMap((m) => [...m[2].matchAll(/([a-z-]+)\s*:/g)].map((x) => x[1])));
  const permises = new Set(["transform", "opacity", "background-position", "stroke-dashoffset"]);
  check("les animations n'emploient que transform, opacity, background-position, stroke-dashoffset", images.length >= 10 && [...proprietes].every((p) => permises.has(p)), [...proprietes].join(","));
  check("figées en mouvement réduit, en vignette, sur téléphone (calme) et réglage du site", /prefers-reduced-motion: reduce\)\s*\{\s*\.anim\s*\{\s*animation: none/.test(section) && section.includes(".fige .anim") && section.includes(".calme .anim") && section.includes('data-rl-motion="off"'));
}

console.log("# L'étagère");
{
  const e = etagere(vide, porteDe());
  const types = e.rayons.map((r) => r.type).join(",");
  check("quatre rayons : cadres, bannières, titres, folios", types === "cadre,banniere,titre,folio" && e.rayons.map((r) => r.titre).join(",") === "Cadres,Bannières,Titres,Folios");
  const toutes = e.rayons.flatMap((r) => r.pieces);
  check("« Sans cadre » n'est pas sur l'étagère", !toutes.some((p) => p.cle === "cadre:aucun"));
  check("toutes les autres pièces y sont", toutes.length === PIECES.length - 1);
  check("joueur neuf : rien de possédé hors des libres, aucun folio", e.possedees === 0 && e.folios === 0 && toutes.filter((p) => p.possedee).every((p) => p.libre));
  check("le compte laisse les libres de côté", e.total === PIECES.filter((p) => p.condition !== null).length && e.total === e.rayons.reduce((n, r) => n + r.total, 0));
  check("dans chaque rayon, les possédées d'abord", e.rayons.every((r) => r.pieces.findIndex((p) => !p.possedee) === -1 || r.pieces.slice(r.pieces.findIndex((p) => !p.possedee)).every((p) => !p.possedee)));
  const mains = toutes.find((p) => p.cle === "folio:mains");
  check("une silhouette donnée par le Codex : « Y aller » vers sa quête", mains?.allerA === hrefQuete("acte:acte1") && mains.allerA === "/codex?quete=acte%3Aacte1");
  check("une silhouette gagnée aux questions : pas de « Y aller »", toutes.find((p) => p.cle === "cadre:bronze")?.allerA === null);
  check("les folios ont leur planche et leur anecdote", toutes.filter((p) => p.type === "folio").every((p) => !!p.folio?.oeuvre && p.folio.anecdote.every(Boolean)));
  check("ce qui bouge est marqué (Liquide, Sanguine, Route de Milan ; pas un titre)", !!toutes.find((p) => p.cle === "cadre:liquide-diamant")?.anime && !!toutes.find((p) => p.cle === "banniere:route-milan")?.anime && toutes.filter((p) => p.type === "titre").every((p) => !p.anime));

  // les quêtes retirées gardent ce qu'elles ont donné, mais « Y aller » mène à celle qui donne aujourd'hui
  const quetes = catalogueCodex(contenuDuProgramme());
  const retirees = new Set(quetes.filter((q) => q.retiree).map((q) => q.id));
  const allers = PIECES.map((p) => queteDe(p)).filter((q): q is string => !!q);
  check("« Y aller » ne mène jamais à une quête retirée", allers.length > 0 && allers.every((q) => !retirees.has(q)), allers.filter((q) => retirees.has(q)).join(","));

  const a: Acquis = { ...vide, questions: 600, codex: new Map([["acte:acte1", "2026-10-10"]]) };
  const e2 = etagere(a, porteDe({ frame: "or" }));
  const cadreOr = e2.rayons[0].pieces.find((p) => p.nue === "or");
  check("pièces gagnées comptées (bronze, argent, or ; un folio)", e2.folios === 1 && e2.possedees === 4 && resumeEtagere(e2) === `4 pièces sur ${e2.total} · 1 folio`);
  check("la pièce portée est marquée, et seule de son rayon", !!cadreOr?.portee && e2.rayons[0].pieces.filter((p) => p.portee).length === 1);
  const e3 = etagere(vide, porteDe({ frame: "liquide-diamant", titre: "copiste" }));
  check("ce qui est porté reste à soi, même sans la condition (rien de gagné repris)", !!e3.rayons[0].pieces.find((p) => p.nue === "liquide-diamant")?.possedee && !!e3.rayons[2].pieces.find((p) => p.nue === "copiste")?.portee);
  const e4 = etagere(vide, porteDe({ banner: "lavis" }), "https://x/y.webp");
  check("sous une image de bannière, aucun motif n'est « porté »", e4.rayons[1].pieces.every((p) => !p.portee));
}

console.log("# Résumé, animations, retrait");
{
  check("résumé : « 23 pièces sur 61 · 4 folios »", resumeEtagere({ possedees: 23, total: 61, folios: 4 }) === "23 pièces sur 61 · 4 folios");
  check("résumé : singulier, sans folio", resumeEtagere({ possedees: 1, total: 61, folios: 0 }) === "1 pièce sur 61" && resumeEtagere({ possedees: 0, total: 61, folios: 1 }) === "0 pièce sur 61 · 1 folio");
  const p = (cle: string, possedee: boolean, anime: boolean): PieceEtagere => ({ cle, type: "cadre", nue: cle, nom: cle, description: "", obtention: "", rarete: "rare", anime, possedee, portee: false, libre: false, allerA: null });
  const liste = [p("a", true, true), p("b", true, false), p("c", false, true), p("d", true, true), p("e", true, true)];
  check(`téléphone : ${ANIMEES_TELEPHONE} pièces animées au plus, les premières possédées qui bougent`, [...piecesAnimees(liste, { telephone: true, feuille: false })].join() === "a,d");
  check("ordinateur : toutes les possédées qui bougent ; jamais une silhouette", [...piecesAnimees(liste, { telephone: false, feuille: false })].join() === "a,d,e");
  check("feuille ouverte : plus rien ne bouge derrière", piecesAnimees(liste, { telephone: false, feuille: true }).size === 0);
  check("se retire : ce qui est porté, sauf le défaut", retirable({ type: "cadre", nue: "or", portee: true }) && !retirable({ type: "cadre", nue: "or", portee: false }) && !retirable({ type: "banniere", nue: STYLE_DEFAUT.banner, portee: true }) && retirable({ type: "titre", nue: "copiste", portee: true }));
}

console.log("# Porter, retirer");
{
  const base: StyleProfil = { ...STYLE_DEFAUT, frame: "or", banner: "nuit", bannerUrl: "https://x/y.webp", titre: "copiste", folio: null };
  check("cadre : porté, puis retiré (« Sans cadre »)", stylePorte(base, "cadre", "sanguine").frame === "sanguine" && stylePorte(base, "cadre", null).frame === "aucun");
  const b = stylePorte(base, "banniere", "florence");
  check("bannière : portée, l'image laisse sa place ; retirée : le motif par défaut", b.banner === "florence" && b.bannerUrl === null && stylePorte(base, "banniere", null).banner === STYLE_DEFAUT.banner);
  check("titre : porté, retiré", stylePorte(base, "titre", "collectionneur").titre === "collectionneur" && stylePorte(base, "titre", null).titre === null);
  const f = stylePorte(base, "folio", "mains");
  check("folio : porté, et son bloc posé sur la page", f.folio === "mains" && f.disposition.some((r) => r.c.some((c) => c?.k === "folio")));
  check("folio : retiré, la page ne bouge pas", stylePorte(f, "folio", null).folio === null && stylePorte(f, "folio", null).disposition === f.disposition);
  check("le reste du style ne change pas", f.frame === base.frame && f.titre === base.titre && f.bannerUrl === base.bannerUrl && f.accent === base.accent);
}

console.log("# Le bloc « Folio »");
{
  check("ajouté sans case visée : deux moitiés (les autres : pleine largeur)", rangeeNeuve({ k: "folio" }).m === "deux" && rangeeNeuve({ k: "folio" }).c[1] === null && rangeeNeuve({ k: "radar" }).m === "plein");
  const d = avecBlocFolio(DISPOSITION_DEFAUT);
  check("posé dans la première case vide (à côté des amis)", d[2].c[1]?.k === "folio" && d.length === DISPOSITION_DEFAUT.length && DISPOSITION_DEFAUT[2].c[1] === null);
  check("déjà là : la page ne change pas", avecBlocFolio(d) === d);
  const pleine: Disposition = [{ m: "plein", c: [{ k: "vitrine" }] }];
  const d2 = avecBlocFolio(pleine);
  check("sans case vide : une rangée de deux moitiés à la fin", d2.length === 2 && d2[1].m === "deux" && d2[1].c[0]?.k === "folio");
  const douze: Disposition = Array.from({ length: RANGEES_MAX }, () => ({ m: "plein" as const, c: [{ k: "vitrine" as const }] }));
  check("douze rangées pleines : rien d'ajouté", avecBlocFolio(douze) === douze);
  const v = validerDisposition([{ m: "deux", c: [{ k: "folio" }, null] }], null);
  check("le bloc « Folio » passe la validation", v.refus.length === 0 && v.disposition[0]?.c[0]?.k === "folio");
}

console.log("# Les folios");
{
  check("19 folios, chacun avec deux lignes d'anecdote", FOLIOS.length === 19 && FOLIOS.every((f) => f.anecdote.length === 2 && f.anecdote.every((l) => l.trim().length >= 20 && l.length <= 110)));
  check("aucune date dans les anecdotes (rien d'inventé)", FOLIOS.every((f) => f.anecdote.every((l) => !/\b1[0-9]{3}\b|\b20[0-9]{2}\b/.test(l))));
  check("chaque image déclarée existe dans public/folios", FOLIOS_ILLUSTRES.every((n) => fs.existsSync(path.join(RACINE, "public/folios", `${n}.webp`))));
  check("sans image : la carte « papier », jamais d'image cassée", !renderToStaticMarkup(<CarteFolio f={{ oeuvre: "Le Déluge", image: null }} />).includes("<img") && renderToStaticMarkup(<CarteFolio f={{ oeuvre: "Le Déluge", image: null }} />).includes("Le Déluge"));
  const porte = folioPorte("chats");
  check("le folio porté : son nom, son œuvre, son anecdote", !!porte && porte.oeuvre === "Études de chats" && porte.anecdote.length === 2 && folioPorte(null) === null && folioPorte("inconnu") === null);
  const bloc = porte ? renderToStaticMarkup(<BlocFolio f={porte} />) : "";
  check("le bloc « Folio » montre la planche et l'anecdote", bloc.includes("Études de chats") && bloc.includes(porte?.anecdote[0] ?? "§"));
  const doc = fs.readFileSync(path.join(RACINE, "docs/codex/FOLIOS.md"), "utf8");
  check("FOLIOS.md cite les 19 folios", FOLIOS.every((f) => doc.includes(`\`${f.nue}\``)));
}

console.log("# Le repos de la série");
{
  check("jours : décalage, intervalle, lundi", ajouterJours("2026-10-31", 1) === "2026-11-01" && joursEntre("2026-10-30", "2026-11-02").length === 4 && joursEntre("2026-11-02", "2026-11-01").length === 0 && lundiDe("2026-10-18") === "2026-10-12" && lundiDe("2026-10-19") === "2026-10-19");
  const poses: JourPause[] = [
    { jour: "2026-10-20", genre: "repos" },
    { jour: "2026-10-24", genre: "pause" },
    { jour: "2026-10-25", genre: "pause" },
    { jour: "2026-10-26", genre: "repos" },
  ];
  const plages = plagesDe(poses);
  check("plages : jours qui se suivent et du même genre", plages.length === 3 && plages[1].de === "2026-10-24" && plages[1].a === "2026-10-25" && plages[1].n === 2);
  const auj = "2026-10-17";
  check("jamais dans le passé", !!refusPose("2026-10-16", "2026-10-16", "repos", auj, []) && refusPose("2026-10-17", "2026-10-17", "repos", auj, []) === null);
  check("la fin après le début", !!refusPose("2026-10-20", "2026-10-19", "pause", auj, []));
  check("repos : deux jours par semaine", refusPose("2026-10-21", "2026-10-21", "repos", auj, poses) === null && !!refusPose("2026-10-21", "2026-10-22", "repos", auj, poses));
  check("repos : un jour déjà posé ne compte pas deux fois", refusPose("2026-10-20", "2026-10-21", "repos", auj, poses) === null);
  check("pause : 14 jours d'affilée au plus", refusPose("2026-11-01", "2026-11-14", "pause", auj, []) === null && !!refusPose("2026-11-01", "2026-11-15", "pause", auj, []));
  const vingt = joursEntre("2026-11-01", "2026-11-14").concat(joursEntre("2026-12-01", "2026-12-06")).map((jour): JourPause => ({ jour, genre: "pause" }));
  check("pause : 30 jours sur une année glissante", refusPose("2027-01-04", "2027-01-13", "pause", auj, vingt) === null && !!refusPose("2027-01-04", "2027-01-14", "pause", auj, vingt));
  check("libellés : un jour, une plage", libellePlage({ de: "2026-10-24", a: "2026-10-24" }, auj) === "samedi 24 oct." && libellePlage({ de: "2026-11-03", a: "2026-11-07" }, auj) === "du mardi 3 au samedi 7 nov." && libellePlage({ de: "2027-01-02", a: "2027-01-02" }, auj) === "samedi 2 janv. 2027");
}

console.log(ko ? `\n${ko} échec(s)` : "\nTout est bon.");
process.exit(ko ? 1 : 0);
