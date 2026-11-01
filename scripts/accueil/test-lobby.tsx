// Test de l'accueil « Le lobby » : le socle (lot 1) et la page assemblée (lot 6),
// avec react-dom/server, sans base, réseau ni navigateur :
//   npx tsx --tsconfig tsconfig.json scripts/accueil/test-lobby.tsx
// Le modèle pur (les trois états des deux défis, ta ligne du classement
// aujourd'hui et hier, les cases des 5, les phases aux bornes, le salut, J-n à
// minuit de Paris, le filet des lectures lentes, du nouveau avec les relances),
// puis le rendu de LobbyView sur les données d'exemple (scripts/accueil/lobby-exemple.ts) :
// l'en-tête, l'ORDRE FINAL des cartes (l'affiche « La Lice » à la place de la
// ligue, le carnet de jours tout en bas), les repères de Léonard, la palette
// « graphite », l'inventaire des liquides (4 par défaut), les variantes (nouveau
// joueur, 30 bientôt, ni 30 ni 5, tout fait, copie en cours, placement, sans
// classement, sans migrations, sans date, personnage du vainqueur, sans clé de
// service, sans rival, sans carte du jour, socle seul), la version téléphone (les
// règles du CSS, qui ne se charge pas ici), la bascule de /dashboard et le
// nettoyage du code mort, et les garde-fous (aucun Intl dans un îlot client,
// aucun antislash ni chemin de travail, poids du HTML). Les noms de classes des
// modules CSS sont rendus tels quels.
import "../codex/sans-css";
import React from "react";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { LobbyView } from "@/components/accueil/lobby/LobbyView";
import {
  carteCinq,
  carteDefi,
  carteRang,
  carteTraits,
  casesDesCinq,
  bandeVainqueur,
  dateLongue,
  enteteLobby,
  jourClassement,
  joursAvantExamen,
  phaseLobby,
  salutDe,
  titreDesTraits,
} from "@/components/accueil/lobby/modele";
import { fusionnerNouveau, nouveauteRelance, phraseNouveau, actionNouveau, quandDe } from "@/components/accueil/lobby/modele-parcours";
import { FILET_MS, PLAFOND_MS, plafonner } from "@/components/accueil/lobby/plafond";
import type { NouveauLobby } from "@/components/accueil/lobby/types";
import { parisDay, type DailyBoard } from "@/lib/daily";
import { exemple, entrees, JOUR, MAINTENANT, MINUIT, type Variante } from "./lobby-exemple";

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
        <LobbyView l={exemple(v)} />
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
const nowIso = MAINTENANT.toISOString();
/** Les positions de ces repères dans le HTML ; -1 si l'un manque. */
const positions = (html: string, reperes: string[]) => reperes.map((r) => html.indexOf(r));
const croissant = (xs: number[]) => xs.every((x, i) => x >= 0 && (i === 0 || x > xs[i - 1]));

const base = entrees();
const trente = base.daily!;
const cinq = base.cinq!;
const fait = { status: "done" as const, answered: 30, score: 27, total: 30, rank: 12, seconds: 842 };

titre("# le modèle : les 30 et les 5 du jour, trois états");
{
  const a = carteDefi(trente, { nowIso, dateLabel: "Samedi 31 octobre" });
  check("30 à rendre : trois tuiles (128 joueurs, 29/30, 5 h avant le gel)", a.etat === "todo" && a.tuiles.map((t) => `${t.val} ${t.lib}`).join("|") === `128 joueurs aujourd'hui|29/30 meilleure copie|5${NB}h avant le gel`, JSON.stringify(a.tuiles));
  check("30 à rendre : « Rendre ma copie » vers /defi, la puce « Se fige dans 5 h », pas de second lien", a.action.libelle === "Rendre ma copie" && a.action.href === "/defi" && a.statut === `Se fige dans 5${NB}h` && a.second === null && a.progression === null);
  const b = carteDefi({ ...trente, status: "playing", answered: 12, deadline: "2026-10-31T18:01:00Z" }, { nowIso, dateLabel: "Samedi 31 octobre" });
  check("30 en cours : 12/30 répondues, 31 min de chrono, la copie 12 sur 30", b.etat === "playing" && b.tuiles[0].val === "12/30" && b.tuiles[1].val === `31${NB}min` && b.progression?.faites === 12 && b.progression.total === 30, JSON.stringify(b.tuiles));
  check("30 en cours : « Reprendre ma copie »", b.action.libelle === "Reprendre ma copie" && b.action.href === "/defi");
  const c = carteDefi({ ...trente, ...fait }, { nowIso, dateLabel: "Samedi 31 octobre" });
  check("30 rendus : ta copie 27/30, ton rang 12e sur 128", c.etat === "done" && c.tuiles[0].val === "27/30" && c.tuiles[1].val === "12e sur 128", JSON.stringify(c.tuiles));
  check("30 rendus : « Revoir ma copie » vers la revue et « Le classement du jour » vers la page du jour", c.action.libelle === "Revoir ma copie" && c.action.href === "/defi/2026-10-31?revue=1" && c.second?.href === "/defi/2026-10-31" && c.second.libelle === "Le classement du jour", JSON.stringify(c.second));
  const d = carteDefi(cinq, { nowIso, dateLabel: "Samedi 31 octobre" });
  check("5 à jouer : « Jouer les 5 du jour » vers /defi/cinq, 342 joueurs, meilleur 5/5", d.format === "cinq" && d.action.libelle === "Jouer les 5 du jour" && d.action.href === "/defi/cinq" && d.tuiles[0].val === "342" && d.tuiles[1].val === "5/5");
  const e = carteDefi({ ...cinq, status: "playing", answered: 3 }, { nowIso, dateLabel: "x" });
  check("5 en cours : « Reprendre mes 5 », 3/5", e.action.libelle === "Reprendre mes 5" && e.tuiles[0].val === "3/5" && e.progression?.faites === 3);
  const f = carteDefi({ ...cinq, status: "done", answered: 5, score: 4, total: 5, rank: 12 }, { nowIso, dateLabel: "x" });
  check("5 rendus : « Revoir mes 5 » vers /defi/cinq/<jour>?revue=1, second lien vers la page du jour", f.action.libelle === "Revoir mes 5" && f.action.href === "/defi/cinq/2026-10-31?revue=1" && f.second?.href === "/defi/cinq/2026-10-31");
  const g = carteDefi({ ...trente, closesAt: "2026-10-31T17:45:00Z" }, { nowIso, dateLabel: "x" });
  check("l'heure qui reste : 15 min avant le gel", g.statut === `Se fige dans 15${NB}min` && g.tuiles.at(-1)?.val === `15${NB}min`, g.statut);
  const h = carteDefi({ ...trente, closesAt: "2026-10-31T17:00:00Z" }, { nowIso, dateLabel: "x" });
  check("fenêtre close : « Se fige ce soir », plus de tuile du gel", h.statut === "Se fige ce soir" && h.tuiles.length === 2);
}

titre("# le modèle : le classement, ta ligne aujourd'hui et hier");
{
  const auj = base.boardAuj as DailyBoard;
  const j = jourClassement({ cle: "auj", board: auj, jour: JOUR, daily: trente, reste: `5${NB}h` });
  check("aujourd'hui : cinq lignes, rang, nom, score ; le temps seulement pour les trois premiers", j.lignes.length === 5 && j.lignes[0].nom === "Marie L." && j.lignes[0].score === "29/30" && j.lignes[0].temps === `en 11${NB}min${NB}40` && j.lignes[2].temps !== null && j.lignes[3].temps === null && j.lignes[4].temps === null, JSON.stringify(j.lignes[0]));
  check("aujourd'hui : en direct, 128 joueurs, « Se fige dans 5 h », page du jour", j.direct && j.etat === "En direct" && j.joueurs === "128 joueurs" && j.pied === `Se fige dans 5${NB}h` && j.href === "/defi/2026-10-31");
  check("toi, pas encore rendu : « Toi : pas encore rendu », bouton « à rendre »", j.toi.titre === "Toi : pas encore rendu" && j.toi.val === "à rendre" && !j.toi.rendu);
  const enCours = jourClassement({ cle: "auj", board: auj, jour: JOUR, daily: { ...trente, status: "playing", answered: 12 } });
  check("toi, en cours : « Toi : en cours, 12/30 »", enCours.toi.titre === "Toi : en cours, 12/30" && !enCours.toi.rendu);
  const rendu = jourClassement({ cle: "auj", board: { ...auj, me: { ...auj.rows[0], rank: 12, score: 27, seconds: 842 } }, jour: JOUR, daily: { ...trente, ...fait } });
  check("toi, rendu : « Toi : 12e », en 14 min 02, 27/30", rendu.toi.titre === "Toi : 12e" && rendu.toi.sous === `en 14${NB}min${NB}02` && rendu.toi.val === "27/30" && rendu.toi.rendu, JSON.stringify(rendu.toi));
  const repli = jourClassement({ cle: "auj", board: auj, jour: JOUR, daily: { ...trente, ...fait } });
  check("toi, rendu mais absent du classement : la ligne vient du résumé du jour", repli.toi.titre === "Toi : 12e" && repli.toi.val === "27/30" && repli.toi.rendu);
  const hier = jourClassement({ cle: "hier", board: base.boardHier as DailyBoard, jour: "2026-10-30" });
  check("hier : figé, 131 joueurs, « Vainqueur : Marie L. », page d'hier", !hier.direct && hier.etat === "Figé hier soir" && hier.joueurs === "131 joueurs" && hier.pied === "Vainqueur : Marie L." && hier.href === "/defi/2026-10-30");
  check("hier : « Toi : 19e », en 16 min 12, 25/30", hier.toi.titre === "Toi : 19e" && hier.toi.sous === `en 16${NB}min${NB}12` && hier.toi.val === "25/30" && hier.toi.rendu, JSON.stringify(hier.toi));
  const pasJoue = jourClassement({ cle: "hier", board: { ...(base.boardHier as DailyBoard), me: null }, jour: "2026-10-30" });
  check("hier, pas joué : « Toi : pas joué », sans score", pasJoue.toi.titre === "Toi : pas joué" && pasJoue.toi.val === "—" && !pasJoue.toi.rendu);
  const vide = jourClassement({ cle: "auj", board: { ...auj, rows: [], players: 0 }, jour: JOUR, daily: trente });
  check("personne n'a rendu : aucune ligne, 0 joueur", vide.lignes.length === 0 && vide.joueurs === "0 joueur");
}

titre("# le modèle : les cases des 5, le rang, les phases, le salut, J-n");
{
  const c = (o: Partial<typeof cinq>) => casesDesCinq({ ...cinq, ...o });
  check("5 à jouer : cinq cases vides", JSON.stringify(c({})) === JSON.stringify([null, null, null, null, null]));
  check("5 en cours (3 répondues) : trois cases faites", JSON.stringify(c({ status: "playing", answered: 3 })) === JSON.stringify(["faite", "faite", "faite", null, null]));
  check("5 rendus à 4/5 : quatre justes puis une faite", JSON.stringify(c({ status: "done", answered: 5, score: 4, total: 5 })) === JSON.stringify(["juste", "juste", "juste", "juste", "faite"]));
  check("5 rendus à 5/5 : cinq justes ; à 0/5 : cinq faites", c({ status: "done", answered: 5, score: 5, total: 5 }).every((x) => x === "juste") && c({ status: "done", answered: 5, score: 0, total: 5 }).every((x) => x === "faite"));
  const k = carteCinq({ ...cinq, status: "done", answered: 5, score: 4, total: 5, rank: 12 });
  check("5 rendus : la ligne « 4/5 · 80 % · 12e sur 342 »", JSON.stringify(k.ligne) === JSON.stringify([{ b: "4/5" }, ` · 80${NB}%`, " · 12e sur 342"]), JSON.stringify(k.ligne));
  check("5 à jouer : pas de ligne, 342 joueurs, meilleur 5/5", carteCinq(cinq).ligne === null && carteCinq(cinq).joueurs === 342 && carteCinq(cinq).meilleur === "5/5");

  const phase = (n: number | null) => phaseLobby(n)?.index ?? null;
  check("phases aux bornes : 91 → découverte, 90 et 31 → consolidation, 30, 8 et 7 → sprint final", phase(91) === 0 && phase(90) === 1 && phase(31) === 1 && phase(30) === 2 && phase(8) === 2 && phase(7) === 2);
  check("phases : jour J → sprint final ; examen passé (−1) ou sans date → aucune", phase(0) === 2 && phase(-1) === null && phase(null) === null);
  check("la phase dit « phase 2 sur 3 » et ses trois libellés", phaseLobby(60)?.sur === "phase 2 sur 3" && phaseLobby(60)?.libelles.join() === "Découverte,Consolidation,Sprint final");

  check("le salut : déjà venu → « Bon retour, Theo » ; premier passage → « Bienvenue, Theo » ; sans pseudo → le mot seul", salutDe("Theo", true) === "Bon retour, Theo" && salutDe("Theo", false) === "Bienvenue, Theo" && salutDe(null, true) === "Bon retour" && salutDe("  ", false) === "Bienvenue");
  check("J-n : 110 le 31 octobre, jour J à 0, null le lendemain de l'examen et sans date", joursAvantExamen("2027-02-18", "2026-10-31") === 110 && joursAvantExamen("2027-02-18", "2027-02-18") === 0 && joursAvantExamen("2027-02-18", "2027-02-19") === null && joursAvantExamen(null, "2026-10-31") === null);
  // minuit à Paris : 23 h 59 le 31 octobre (UTC+1) → J-110 ; 00 h 00 le 1er novembre → J-109
  const avant = parisDay(new Date("2026-10-31T22:59:00Z"));
  const apres = parisDay(new Date("2026-10-31T23:00:00Z"));
  check("J-n à minuit de Paris : 23 h 59 → J-110, 00 h 00 → J-109", avant === "2026-10-31" && apres === "2026-11-01" && joursAvantExamen("2027-02-18", avant) === 110 && joursAvantExamen("2027-02-18", apres) === 109, `${avant} ${apres}`);
  check("les dates longues sans Intl : « 18 février 2027 », « 1er mars 2027 », illisible → null", dateLongue("2027-02-18") === `18${NB}février${NB}2027` && dateLongue("2027-03-01") === `1er${NB}mars${NB}2027` && dateLongue("n'importe quoi") === null && dateLongue(null) === null);
  const en = enteteLobby({ pseudo: "Theo", dejaVenu: true, examen: "2027-02-18", jour: JOUR });
  check("l'en-tête : J-110, « 18 février 2027 », « Bon retour, Theo » et rien d'autre (trois champs)", en.jn === 110 && en.dateExamen === `18${NB}février${NB}2027` && en.salut === "Bon retour, Theo" && Object.keys(en).length === 3);

  check("le titre des traits : 0/40 → « À toi le trait », 26/40 → « Encore 14 traits », 40/40 → « Journée tenue » (sans point ni prénom)", titreDesTraits({ repondues: 0, objectif: 40, heure: 10, serie: 0 }) === "À toi le trait" && titreDesTraits({ repondues: 26, objectif: 40, heure: 10, serie: 9 }) === "Encore 14 traits" && titreDesTraits({ repondues: 40, objectif: 40, heure: 10, serie: 9 }) === "Journée tenue");
  check("le soir, rien fait, série en jeu : « Ne laisse pas sécher l'encre »", titreDesTraits({ repondues: 0, objectif: 40, heure: 21, serie: 5 }) === "Ne laisse pas sécher l'encre");
  const t = carteTraits({ repondues: 26, objectif: 40, jour: JOUR, heure: 18, streak: 9, serie: base.serie, dayState: "fait", reste: 0, jn: 110, plein: false });
  check("les traits : 9 jours à ×2, joker disponible, J-110, pas de bouton (les 30 restent à faire)", t.serie?.jours === 9 && t.serie.mult === "×2" && t.joker === "disponible" && t.jn === 110 && t.action === null && !t.tenu);
  check("la phrase : le sceau TENU et « Ta série te vaut ×2 »", JSON.stringify(t.phrase).includes('"TENU"') && JSON.stringify(t.phrase).includes('"×2"'));
  const p = carteTraits({ repondues: 26, objectif: 40, jour: JOUR, heure: 18, streak: 9, serie: base.serie, dayState: "fait", reste: 0, jn: null, plein: true });
  check("les 30 et les 5 faits, journée pas tenue : le bouton d'encre « Tracer des traits » vers /reviser", p.action?.libelle === "Tracer des traits" && p.action.href === "/reviser");
  const q = carteTraits({ repondues: 40, objectif: 40, jour: JOUR, heure: 18, streak: 9, serie: base.serie, dayState: "fait", reste: 0, jn: null, plein: true });
  check("journée tenue : plus de bouton, la phrase le dit", q.tenu && q.action === null && JSON.stringify(q.phrase).includes("sceau est posé"));
  const s0 = carteTraits({ repondues: 0, objectif: 40, jour: JOUR, heure: 22, streak: 3, serie: null, dayState: "sec", reste: 3, jn: null, plein: true });
  check("sans migration : ni joker ni palier ; le soir, le bouton garde la série (« Encore 3 questions »)", s0.joker === null && s0.serie?.mult === null && s0.action?.libelle === "Encore 3 questions", JSON.stringify(s0.action));

  const v = bandeVainqueur(base.vainqueur!);
  check("le vainqueur : Marie L., 29/30 en 11 min 40 s, devant 130 joueurs, Platine, page d'hier, pas de personnage", v.nom === "Marie L." && !v.moi && JSON.stringify(v.ligne) === JSON.stringify([{ b: "29/30" }, " en ", { b: `11${NB}min${NB}40${NB}s` }, ", devant 130 joueurs"]) && v.palier === "Platine" && v.href === "/defi/2026-10-30" && v.perso === null, JSON.stringify(v.ligne));
  check("le vainqueur, c'est toi : « Toi » ; en placement, « Placement »", bandeVainqueur({ ...base.vainqueur!, isMe: true }).nom === "Toi" && bandeVainqueur({ ...base.vainqueur!, placement: true }).palier === "Placement");

  const r = carteRang({ elo: 1478, gamesPlayed: 18, mastery: 52, place: 7, joueurs: 412, dernier: 12, jn: 110 });
  check("le rang : Platine II, 1 478 ELO · 7e sur 412 joueurs · +12 au dernier duel", r.palier === "Platine II" && r.chiffres.map((x) => `${x.val} ${x.lib}`).join("|") === `1${NB}478 ELO|7e sur 412 joueurs|+12 au dernier duel`, JSON.stringify(r.chiffres));
  check("le rang : la barre jusqu'à Platine I (22 ELO), la phase de révision aux seuils du Codex (J-110 : découverte)", r.barre.genre === "barre" && JSON.stringify(r.barre).includes("22") && r.phase?.index === 0);
  const pl = carteRang({ elo: 1200, gamesPlayed: 3, mastery: 20, place: null, joueurs: 412, dernier: null, jn: null });
  check("en placement : « Placement », 3/5 parties classées, pas d'ELO, pas de phase sans date", pl.placement && pl.palier === "Placement" && pl.chiffres.length === 1 && pl.chiffres[0].val === "3/5" && pl.phase === null);
}

titre("# la page de la maquette (variante base)");
const html = rendre("base");
{
  check("le rendu n'est pas vide", html.length > 5000, String(html.length));
  const entete = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
  check("l'en-tête : « Bon retour, Theo » à gauche, « J-110 avant l'examen · 18 février 2027 » à droite", entete.includes("<h1") && entete.includes("Bon retour, Theo") && entete.includes("J-110") && entete.includes("avant l'examen") && entete.includes(`18${NB}février${NB}2027`));
  check("l'en-tête ne dit rien d'autre : ni l'heure du gel, ni la date du jour, ni sur-titre", !/se figent?\b/i.test(entete) && !entete.includes("octobre") && !entete.includes("Samedi") && compte(entete, /<p /g) === 1 && compte(entete, /<h1/g) === 1, entete.replace(/<[^>]+>/g, " ").trim());
  check("une seule h1 dans la page (le salut) ; les cartes sont en h2", compte(html, /<h1/g) === 1 && compte(html, /<h2/g) >= 5);
  const ordre = ["Bon retour, Theo", 'id="lobby-defi"', "Classement des 30", 'id="lobby-cinq"', 'id="lobby-traits"', 'id="lobby-vainqueur"', 'id="lobby-rang"'];
  check("l'ordre du lot 1 : salut, Les 30, Classement des 30, Les 5, Tes traits, Vainqueur, Rang", croissant(positions(html, ordre)), positions(html, ordre).join());
  check("l'ordre des rangées : les 30 | les 5 puis les traits ; le vainqueur | le rang", html.indexOf('id="lobby-cinq"') < html.indexOf('id="lobby-traits"') && html.indexOf('id="lobby-vainqueur"') < html.indexOf('id="lobby-rang"'));
  check("les 30 : « Samedi 31 octobre · à rendre », tuiles 128, 29/30, 5 h, la puce « Se fige dans 5 h »", html.includes("Samedi 31 octobre · à rendre") && html.includes("<b>128</b>") && html.includes("<b>29/30</b>") && html.includes(`<b>5${NB}h</b>`) && html.includes(`Se fige dans 5${NB}h`));
  check("le classement : les cinq noms, « En direct », 128 joueurs, « Toi : pas encore rendu », « Tout le classement → »", ["Marie L.", "Inès K.", "Hugo B.", "Sarah T.", "Lucas M."].every((n) => html.includes(n)) && html.includes("En direct") && html.includes("128 joueurs") && html.includes("Toi : pas encore rendu") && html.includes("Tout le classement →") && html.includes('href="/defi/2026-10-31"'));
  check("le sélecteur Aujourd'hui | Hier : un groupe de deux boutons, Aujourd'hui pressé", html.includes('role="group" aria-label="Quel jour"') && /aria-pressed="true"[^>]*>(<canvas[^>]*><\/canvas>)?Aujourd'hui</.test(html) && /aria-pressed="false"[^>]*>Hier</.test(html));
  check("les 5 : cinq cases, 342 joueurs, meilleur 5/5, « Jouer les 5 du jour »", compte(html, /class="case5"/g) === 5 && html.includes("<b>342</b> joueurs") && html.includes("meilleur <b>5/5</b>") && html.includes("Jouer les 5 du jour"));
  check("les traits : « Encore 14 traits », le sceau TENU en pointillé, 9 jours à ×2, joker disponible, J-110", html.includes("Encore 14 traits") && html.includes('aria-label="Sceau TENU : pas encore, il se pose à 40 traits"') && html.includes(`9${NB}jours`) && html.includes('class="feuille">×2<') && html.includes("Joker de la semaine") && html.includes("disponible") && compte(html, /J-110/g) >= 2);
  check("le vainqueur : Marie L., 29/30, 11 min 40 s, devant 130 joueurs, Platine, « Le classement d'hier → »", html.includes("Vainqueur des 30 d'hier") && html.includes(`11${NB}min${NB}40${NB}s`) && html.includes("devant 130 joueurs") && html.includes('class="puce">Platine<') && html.includes("Le classement d'hier →") && html.includes('href="/defi/2026-10-30"'));
  check("le rang : Platine II, 1 478, 7e sur 412 joueurs, +12, « Plus que 22 ELO avant Platine I »", html.includes("Platine II") && html.includes(`<b>1${NB}478</b>`) && html.includes("<b>7e</b>") && html.includes("sur 412 joueurs") && html.includes("<b>+12</b>") && html.includes(`22${NB}ELO</b> avant Platine I`));
  check("la phase : « phase 1 sur 3 » à J-110, Découverte active, trois étapes", html.includes("phase 1 sur 3") && html.includes("Ta phase de révision") && compte(html, /class="ph phOn"/g) === 1 && compte(html, /class="ph /g) + compte(html, /class="ph"/g) === 3);
  check("le vainqueur sans personnage : pas de place réservée (vqAvecPerso absent)", !html.includes("vqAvecPerso"));

  // l'ordre FINAL de la maquette D2 avec les deux changements demandés à la validation
  const final = [
    "Bon retour, Theo",
    'id="lobby-defi"',
    "Classement des 30",
    'id="lobby-cinq"',
    'id="lobby-traits"',
    'data-matiere="fsa"',
    'id="lobby-rival-titre"',
    ">La Lice<",
    'id="lobby-vainqueur"',
    'id="lobby-direct-titre"',
    'id="lobby-rang"',
    'id="lobby-deblocage-titre"',
    'id="lobby-quete-titre"',
    'id="lobby-scores-titre"',
    ">La Bibliothèque<",
    'id="lobby-salle-titre"',
    'id="lobby-nouveau-titre"',
    'id="lobby-amis-titre"',
    'id="lobby-carnet-titre"',
  ];
  check("l'ordre final : salut, les 30 + classement, les 5, traits, carte du jour, rival, affiche, vainqueur, lobby, rang, déblocage, quête, scores, affiche, Grande Salle, du nouveau, amis, carnet", croissant(positions(html, final)), positions(html, final).join());
  check("(a) la ligue de la semaine est remplacée par une affiche : plus de ligue ni d'XP entre amis, une figure sans lien", !/ligue/i.test(html.replace(/Ligue d/g, "")) && !html.includes("Zone de montée") && /<figure[^>]*>(?:(?!<\/figure>).)*La Lice<\/figcaption><\/figure>/s.test(html) && !/<figure[^>]*>(?:(?!<\/figure>).)*<a /s.test(html));
  check("(b) le carnet de jours est la DERNIÈRE carte : plus aucune carte après lui", !html.slice(html.indexOf('id="lobby-carnet-titre"')).includes("<section"), html.slice(html.indexOf('id="lobby-carnet-titre"')).split("<section").length - 1 + " section(s) après");
  check("les deux affiches sont des peintures du site (public/illustrations), jamais /_blob/", html.includes("/illustrations/duel-lice.webp") && html.includes("/illustrations/reviser-bibliotheque.webp") && html.includes("/illustrations/mock-grande-salle.webp") && !html.includes("/_blob/"));
  check("la rangée 3 a ses trois cartes (data-n absent), la rangée du vainqueur a sa colonne (vainqueur puis lobby)", /class="rangeeJour"/.test(html) && !/class="rangeeJour" data-n/.test(html) && html.indexOf('id="lobby-vainqueur"') < html.indexOf('id="lobby-direct-titre"') && html.indexOf('id="lobby-direct-titre"') < html.indexOf('id="lobby-rang"'));
  check("la Grande Salle a un bouton NOIR en aplat, sans liquide", html.includes("Voir l'examen blanc") && !/lobby-salle-titre(?:(?!<\/section>).)*rl-encre/s.test(html));
  check("du nouveau garde sa cible de Léonard et liste la relance de Marie en premier (« ce matin »)", compte(html, /data-leonard="du-nouveau"/g) === 1 && html.indexOf("t'a relancé") > 0 && html.indexOf("t'a relancé") < html.indexOf("t'a battu") && html.includes("ce matin"));
  check("le carnet reçoit la journée : « 26 traits sur 40 »", html.includes("26 traits sur 40"));
}

titre("# Léonard, la palette et l'inventaire des liquides");
{
  check('data-leonard="defi" sur la carte héros (une fois) et data-leonard="anneau" sur l\'anneau (une fois)', compte(html, /data-leonard="defi"/g) === 1 && compte(html, /data-leonard="anneau"/g) === 1);
  check("la palette est posée sur la racine : noir, anthracite, gris perle, blanc, texture graphite.webp", html.includes("--pal-1:#111113") && html.includes("--pal-2:#3b3b3f") && html.includes("--pal-3:#8d8d92") && html.includes("--pal-4:#f1f1f2") && html.includes("/encres/graphite.webp"));
  check('data-palette="graphite" sur chaque liquide, et aucune autre palette', compte(html, /data-palette="graphite"/g) === compte(html, /class="rl-encre-vif"/g) && !/data-palette="(?!graphite)/.test(html));
  check("exactement 4 liquides par défaut : Rendre ma copie, Jouer les 5 du jour, l'option active « Aujourd'hui » et Lui lancer un défi", compte(html, /class="rl-encre-vif"/g) === 4, String(compte(html, /class="rl-encre-vif"/g)));
  const iDefi = html.indexOf("Lui lancer un défi");
  const boutonDefi = html.slice(html.lastIndexOf("<a ", iDefi), iDefi);
  const iPlus = html.indexOf('class="plus"');
  const boutonPlus = html.slice(html.lastIndexOf("<button", iPlus), html.indexOf("</button>", iPlus));
  check("« Lui lancer un défi » porte le liquide du rival (palette graphite), « Relancer » reste un bouton à contour sans encre", boutonDefi.includes("rl-encre-vif") && boutonDefi.includes('data-palette="graphite"') && boutonPlus.includes("Relancer") && !boutonPlus.includes("rl-encre"), boutonPlus.slice(0, 80));
  check("chaque liquide est l'enfant direct d'un .rl-encre positionné", compte(html, /rl-encre[^>]*data-palette="graphite"[^>]*><canvas[^>]*class="rl-encre-vif"/g) === 4 || compte(html, /class="rl-encre encre [^"]*"[^>]*><canvas/g) + compte(html, /class="rl-encre encre"[^>]*><canvas/g) === 4);
  const parCarte = html.split("<section").slice(1).map((x) => compte(x.slice(0, x.indexOf("</section>")), /class="rl-encre-vif"/g));
  check("un liquide au plus par carte, sauf la carte des 30 (son bouton et l'option active du classement)", parCarte.every((n, i) => n <= 1 || (i === 0 && n === 2)), parCarte.join());
  check("la carte du jour, panneau fermé : aucun liquide (« Enregistrer » n'existe qu'ouvert) ; la Grande Salle et l'affiche non plus", !/data-matiere="fsa"(?:(?!<\/section>).)*rl-encre-vif/s.test(html) && !/<figure(?:(?!<\/figure>).)*rl-encre/s.test(html));
  check("aucune image de la maquette, aucun /_blob/", !html.includes("/_blob/"));
  check("les images sont celles de public/illustrations", html.includes("/illustrations/accueil-trente-du-jour.webp") && html.includes("/illustrations/accueil-bandeau.webp"));
  check("aucun antislash ni chemin de travail dans la page", !html.includes(String.fromCharCode(92)) && !/scratchpad|AppData|Temp[/]|C:[/]/.test(html));
  check("la page reste légère (piège d'hydratation #418 : pas de tracés recopiés)", html.length < 160_000, String(html.length));
  check("un seul anneau du jour dans la page (un masque d'anneau, id fixe)", compte(html, /id="adn-anneau-/g) === 1, String(compte(html, /id="adn-anneau-/g)));
}

titre("# les variantes");
{
  const neuf = rendre("nouveau");
  check("nouveau joueur : « Bienvenue, Camille », « Fixe ton jour J » vers les réglages, pas de J-n", neuf.includes("Bienvenue, Camille") && neuf.includes('href="/moi?onglet=reglages#objectif"') && neuf.includes("Fixe ton jour J") && !/J-\d/.test(neuf));
  check("nouveau joueur : pas de bande vainqueur, le lobby en direct reste seul dans sa colonne à côté du rang, placement 0/5, phase à fixer", !neuf.includes("Vainqueur des 30 d'hier") && neuf.includes("lobby-direct-titre") && neuf.includes("Placement") && neuf.includes("0/5") && neuf.includes("Fixe ton jour J pour suivre ta phase de révision"));
  check("nouveau joueur : classement vide (« Le premier trait est à toi »), pas de sélecteur Hier, pas de série ni de joker", neuf.includes("Le premier trait est à toi") && !neuf.includes('aria-label="Quel jour"') && !neuf.includes("Joker de la semaine") && !neuf.includes("Série d'encre"));
  check("nouveau joueur : 2 liquides (les 30 et les 5), pas d'option active à encrer sans sélecteur", compte(neuf, /class="rl-encre-vif"/g) === 2, String(compte(neuf, /class="rl-encre-vif"/g)));

  const enCours = rendre("enCours");
  const herosEnCours = enCours.slice(enCours.indexOf('id="lobby-defi"'), enCours.indexOf('id="lobby-cinq"'));
  check("30 en cours : « Reprendre ma copie », 12 coches pleines sur 30, « Samedi 31 octobre · copie en cours »", enCours.includes("Reprendre ma copie") && compte(herosEnCours, /class="pip pipOn"/g) === 12 && compte(herosEnCours, /class="pip"/g) === 18 && enCours.includes("copie en cours") && enCours.includes("<b>12/30</b>"));
  check("30 en cours : « Toi : en cours, 12/30 » dans le classement, les 5 en cours (3 cases faites)", enCours.includes("Toi : en cours, 12/30") && compte(enCours, /class="case5 case5Faite"/g) === 3 && enCours.includes("3/5 répondues"));

  const bientot = rendre("bientot");
  check("30 bientôt : les 5 prennent le héros (Défi éclair, « Les 5 du jour », image du bandeau), pas de classement des 30", bientot.includes("Défi éclair") && bientot.includes("Jouer les 5 du jour") && !bientot.includes("Classement des 30") && bientot.includes("/illustrations/accueil-bandeau.webp") && !bientot.includes('id="lobby-cinq"'));
  check("30 bientôt : la carte héros n'a qu'une colonne, deux liquides (le bouton des 5 et le défi du rival), Léonard garde sa cible", bientot.includes("herosSeul") && compte(bientot, /class="rl-encre-vif"/g) === 2 && compte(bientot, /data-leonard="defi"/g) === 1);

  const sans = rendre("sansDefis");
  check("ni 30 ni 5 : Tes traits du jour en grand, une tuile calme « bientôt », la cible de Léonard sur la tuile", sans.includes("traitsGrand") && sans.includes("Encore 14 traits") && sans.includes("bientôt") && sans.includes("Mêmes questions pour tous") && compte(sans, /data-leonard="defi"/g) === 1 && !sans.includes("Classement des 30") && !sans.includes('id="lobby-defi"'));
  check("ni 30 ni 5 : le bouton d'encre est celui des traits (avec le défi du rival, deux liquides), un seul anneau", compte(sans, /class="rl-encre-vif"/g) === 2 && compte(sans, /data-leonard="anneau"/g) === 1 && sans.includes("Tracer des traits"));

  const tout = rendre("toutFait");
  check("tout fait : « Revoir ma copie » et « Revoir mes 5 » à contour, le second lien « Le classement du jour »", tout.includes("Revoir ma copie") && tout.includes("Revoir mes 5") && tout.includes("Le classement du jour →") && tout.includes("copie rendue"));
  check("tout fait : seule l'option active du classement garde l'encre (avec le défi du rival, 2 liquides), le sceau TENU est posé", compte(tout, /class="rl-encre-vif"/g) === 2 && tout.includes("sceauTenu") && !tout.includes("Sceau TENU : pas encore") && tout.includes("Journée tenue"));
  check("tout fait : « Toi : 12e » avec 27/30 et ses cases (4 justes et 1 faite aux 5)", tout.includes("Toi : 12e") && tout.includes("27/30") && compte(tout, /class="case5 case5Juste"/g) === 4 && compte(tout, /class="case5 case5Faite"/g) === 1);

  const tenu = rendre("tenu");
  check("journée tenue mais les 30 à rendre : le bouton des traits n'existe pas, 4 liquides", tenu.includes("Journée tenue") && !tenu.includes("Tracer des traits") && compte(tenu, /class="rl-encre-vif"/g) === 4);

  const placement = rendre("placement");
  check("placement : « Placement », 3/5 parties classées, la barre dit combien de parties restent", placement.includes("Placement") && placement.includes("3/5") && placement.includes("parties classées") && placement.includes("Plus que 2 parties classées"));

  const sansCl = rendre("sansClassement");
  check("sans classement : pas de carte de classement ni de sélecteur, la carte des 30 garde son bouton", !sansCl.includes("Classement des 30") && !sansCl.includes('aria-label="Quel jour"') && sansCl.includes("herosSeul") && sansCl.includes("Rendre ma copie") && compte(sansCl, /class="rl-encre-vif"/g) === 3);

  const sansMig = rendre("sansMigrations");
  check("sans migrations : ni joker ni palier, ni classement ni vainqueur ; la page tient", !sansMig.includes("Joker de la semaine") && !sansMig.includes('class="feuille">×') && sansMig.includes("4" + NB + "jours") && !sansMig.includes("Classement des 30") && !sansMig.includes("Vainqueur des 30 d'hier") && sansMig.includes("Ton rang") && sansMig.length > 5000);
  check("sans migrations : la phrase des traits dit seulement le palier à venir (pas de ×2 inventé)", sansMig.includes("×1,5 dès 3") && !sansMig.includes('<b>×2</b>'));

  const sd = rendre("sansDate");
  check("sans date d'examen : « Fixe ton jour J », plus de J-n ni de phase", sd.includes("Fixe ton jour J") && !/J-\d/.test(sd) && sd.includes("Fixe ton jour J pour suivre ta phase de révision"));

  const toutes: Variante[] = ["base", "nouveau", "enCours", "toutFait", "tenu", "bientot", "sansDefis", "placement", "sansClassement", "sansMigrations", "sansDate", "perso", "sansAdmin", "sansRival", "sansJour", "sansExtras"];
  check("toutes les variantes se rendent, en un h1 chacune", toutes.every((v) => compte(rendre(v), /<h1/g) === 1));
}

titre("# l'assemblage : les variantes qui retirent des cartes (la rangée se recompose)");
{
  const perso = rendre("perso");
  check("personnage du vainqueur : posé comme enfant direct de l'enveloppe (vqAvecPerso), une image décorative, chargée à la demande", perso.includes("vqAvecPerso") && /<\/section><img class="perso"[^>]*alt=""[^>]*loading="lazy"/.test(perso) && perso.includes("/illustrations/accueil-duel.webp"));

  const sansAdmin = rendre("sansAdmin");
  check("sans clé de service : ni lobby en direct ni rival ; les amis disent combien ils sont (la présence ne se lit pas)", !sansAdmin.includes("En ce moment dans le lobby") && !sansAdmin.includes('id="lobby-rival-titre"') && /<b[^>]*>14<[/]b><span>amis<[/]span>/.test(sansAdmin) && !sansAdmin.includes("en ligne sur 14"));
  check("sans clé de service : la carte du jour garde son affiche à côté du rival absent (deux cartes, data-n=2), la colonne du vainqueur ne tient que la bande", sansAdmin.includes('class="rangeeJour" data-n="2"') && sansAdmin.includes('id="lobby-vainqueur"') && compte(sansAdmin, /class="rl-encre-vif"/g) === 3);

  const sansRival = rendre("sansRival");
  check("sans rival ni carte du jour : la rangée 3 disparaît, l'affiche ne reste pas seule", !sansRival.includes("rangeeJour") && !sansRival.includes(">La Lice<") && sansRival.includes('id="lobby-vainqueur"') && sansRival.includes(">La Bibliothèque<"));
  check("sans rival : « Lui lancer un défi » disparaît, 3 liquides", !sansRival.includes("Lui lancer un défi") && compte(sansRival, /class="rl-encre-vif"/g) === 3);

  const sansJour = rendre("sansJour");
  check("sans carte du jour : le rival et l'affiche se partagent la rangée (data-n=2)", sansJour.includes('class="rangeeJour" data-n="2"') && sansJour.includes('id="lobby-rival-titre"') && sansJour.includes(">La Lice<") && !sansJour.includes('data-matiere="fsa"') && !sansJour.includes("La carte du jour"));

  const socle = rendre("sansExtras");
  check("socle seul (rien des lots 2 à 5) : la page tient, une seule h1, les cartes du socle sont là", compte(socle, /<h1/g) === 1 && socle.includes('id="lobby-defi"') && socle.includes('id="lobby-traits"') && socle.includes('id="lobby-rang"') && socle.includes('id="lobby-vainqueur"'));
  check("socle seul : ni rangée 3, ni lobby, ni scores, ni affiche, ni Grande Salle, ni du nouveau, ni amis, ni carnet", ["rangeeJour", "lobby-direct-titre", "lobby-scores-titre", "lobby-deblocage-titre", "lobby-quete-titre", ">La Bibliothèque<", ">La Lice<", "lobby-salle-titre", "lobby-nouveau-titre", "lobby-amis-titre", "lobby-carnet-titre"].every((x) => !socle.includes(x)));
  check("socle seul : le vainqueur remplit seul sa colonne (il s'étire), le rang à côté", socle.includes("etire") && socle.indexOf('id="lobby-vainqueur"') < socle.indexOf('id="lobby-rang"'));

  const sansMig = rendre("sansMigrations");
  check("sans migrations : « Relancer » n'apparaît pas (la table des relances manque), « Lui lancer un défi » reste", !/class="plus"/.test(sansMig) && sansMig.includes("Lui lancer un défi"));

  const neuf = rendre("nouveau");
  check("nouveau joueur : ni rival ni scores ni nouvelles ; le carnet est vide mais posé, les amis invitent à en ajouter", !neuf.includes('id="lobby-rival-titre"') && !neuf.includes('id="lobby-scores-titre"') && !neuf.includes('id="lobby-nouveau-titre"') && neuf.includes('id="lobby-carnet-titre"') && neuf.includes("Ajoute tes premiers amis"));
  check("nouveau joueur : l'affiche de la rangée 3 accompagne la carte du jour (data-n=2) ; pas de colonne de déblocage donc pas d'affiche de la bibliothèque", neuf.includes('class="rangeeJour" data-n="2"') && !neuf.includes(">La Bibliothèque<"));
}

titre("# du nouveau : les relances d'abord, cinq lignes au plus");
{
  const joueur = (i: number, nom: string) => ({ id: `u${i}`, nom, avatarUrl: null });
  const amis: NouveauLobby[] = [
    { type: "victoire", cle: "v", jour: JOUR, joueur: joueur(1, "Inès K."), duel: "d", score: [23, 19] },
    { type: "palier", cle: "p", jour: JOUR, joueur: joueur(2, "Hugo B."), palier: 3 },
    { type: "depasse", cle: "d", jour: JOUR, joueur: joueur(3, "Sarah T."), ecart: 8 },
    { type: "palier", cle: "p2", jour: JOUR, joueur: joueur(4, "Lucas M."), palier: 2 },
    { type: "palier", cle: "p3", jour: JOUR, joueur: joueur(5, "Marc L."), palier: 1 },
  ];
  const r = nouveauteRelance({ de: "u9", nom: "Marie L.", creeLe: "2026-10-31T08:15:00Z", quand: "ce matin" });
  check("une relance reçue devient une ligne de du nouveau : type relance, jour de Paris, « ce matin »", r.type === "relance" && r.jour === "2026-10-31" && r.joueur.nom === "Marie L." && r.quand === "ce matin" && r.joueur.avatarUrl === null, JSON.stringify(r));
  const f = fusionnerNouveau(amis, [r]);
  check("fusion : la relance en premier, cinq lignes au plus (la dernière nouvelle des amis tombe)", f?.length === 5 && f[0].type === "relance" && f[4].cle === "p2", f?.map((x) => x.cle).join());
  check("fusion : des relances seules, des nouvelles seules, rien du tout (null : la carte n'est pas posée)", fusionnerNouveau(null, [r])?.length === 1 && fusionnerNouveau(amis, null)?.length === 5 && fusionnerNouveau(null, null) === null && fusionnerNouveau([], []) === null);
  check("la phrase, le bouton et le moment d'une relance : « t'a relancé », « Le défier » vers /duel?adversaire=, « ce matin » (pas un jour)", JSON.stringify(phraseNouveau(r)) === JSON.stringify(["t'a relancé"]) && actionNouveau(r).libelle === "Le défier" && actionNouveau(r).href === "/duel?adversaire=u9" && quandDe(r, JOUR) === "ce matin" && quandDe(amis[0], JOUR) === "aujourd'hui");
}

titre("# le filet des lectures lentes");
const attente = <T,>(ms: number, v: T) => new Promise<T>((fin) => setTimeout(() => fin(v), ms));
const finAsync = (async () => {
  check("les plafonds : 1,5 s pour les cartes lentes, 4 s de filet pour les autres", PLAFOND_MS === 1500 && FILET_MS === 4000 && FILET_MS > PLAFOND_MS);
  check("une lecture rapide rend sa valeur", (await plafonner(attente(5, "ok"), 200)) === "ok");
  const t0 = Date.now();
  check("une lecture trop lente rend null à l'heure, sans l'attendre", (await plafonner(attente(400, "tard"), 30)) === null && Date.now() - t0 < 300, String(Date.now() - t0));
  check("une lecture qui échoue rend null (jamais d'exception)", (await plafonner(Promise.reject(new Error("boum")), 200)) === null);
  check("une lecture qui rend déjà null reste null", (await plafonner(Promise.resolve(null), 200)) === null);
})();

titre("# la version téléphone : les règles du CSS (il ne se charge pas ici)");
{
  const css = readFileSync(join(process.cwd(), "components/accueil/lobby/Lobby.module.css"), "utf8");
  const bloc = (re: RegExp) => {
    const m = re.exec(css);
    if (!m) return "";
    // le bloc @container jusqu'à son accolade fermante (les règles intérieures sont sur un niveau)
    let niveau = 0;
    for (let i = css.indexOf("{", m.index); i < css.length; i++) {
      if (css[i] === "{") niveau++;
      if (css[i] === "}" && --niveau === 0) return css.slice(m.index, i + 1);
    }
    return "";
  };
  const tel = bloc(/@container \(max-width: 760px\)/);
  const petit = bloc(/@container \(max-width: 360px\)/);
  check("sous 760 px : toutes les cibles tactiles font 44 px (liens, mini-boutons, options du sélecteur)", /\.lien,[\s\S]*\.mini,[\s\S]*\.opt\s*\{\s*min-height: 44px/.test(tel));
  check("sous 760 px : la rangée de la carte du jour passe en une colonne, dans l'ordre du document", /\.rangeeJour,\s*\.rangeeJour\[data-n="2"\]\s*\{\s*grid-template-columns: minmax\(0, 1fr\)/.test(tel));
  check("sous 760 px : J-n passe à 40 px et le personnage du vainqueur ne pousse plus le texte", /\.examenJ\s*\{\s*font-size: 40px/.test(tel) && /\.vqAvecPerso \.vq\s*\{\s*padding-right: 20px/.test(tel));
  check("sous 360 px : le classement n'a plus de ligne de temps", /\.rg \.nm span\s*\{\s*display: none/.test(petit));
  const direct = readFileSync(join(process.cwd(), "components/accueil/lobby/EnDirect.module.css"), "utf8");
  check("le personnage du vainqueur est masqué sous 760 px, par requête de conteneur (la largeur de la page, pas celle de l'écran)", /@container \(max-width: 760px\)\s*\{\s*\.perso\s*\{\s*display: none/.test(direct) && !/@media \(max-width: 760px\)/.test(direct));
  const carnet = readFileSync(join(process.cwd(), "components/accueil/lobby/CarnetJours.module.css"), "utf8");
  check("le carnet au téléphone : 18 semaines (les anciennes cachées), plus de libellés de jours", /@container \(max-width: 760px\)[\s\S]*\.jours\s*\{\s*display: none/.test(carnet) && /\[data-ancien\]\s*,[\s\S]*\{\s*display: none/.test(carnet));
  const parcours = readFileSync(join(process.cwd(), "components/accueil/lobby/Parcours.module.css"), "utf8");
  check("les affiches font 160 px de haut au téléphone, 220 px sur une page étroite", /@container \(max-width: 760px\)[\s\S]*\.affiche\.affiche\s*\{\s*min-height: 160px/.test(parcours) && /@container \(max-width: 1080px\)\s*\{\s*\.affiche\.affiche\s*\{\s*min-height: 220px/.test(parcours));
  const rival = readFileSync(join(process.cwd(), "components/accueil/lobby/Rival.module.css"), "utf8");
  check("le rival au téléphone : « Relancer » et le défi à 44 px", /@container \(max-width: 760px\)\s*\{\s*\.bouton,\s*\.plus,[\s\S]*min-height: 44px/.test(rival));
  check("aucun fichier du lobby ne se règle sur l'écran (@media de largeur) : tout suit la largeur du bloc", readdirSync(join(process.cwd(), "components/accueil/lobby")).filter((f) => f.endsWith(".css")).every((f) => !/@media \((?:max|min)-width/.test(readFileSync(join(process.cwd(), "components/accueil/lobby", f), "utf8"))));
}

titre("# la bascule de /dashboard, les métadonnées et le code mort");
{
  const page = readFileSync(join(process.cwd(), "app/dashboard/page.tsx"), "utf8");
  check("/dashboard sert le lobby, sans drapeau ni ancienne page", page.includes("LobbyView") && page.includes("lireLobby") && !page.includes("lobby=1") && !page.includes("searchParams") && !page.includes("DashboardView"));
  check("les titres de l'onglet : « Accueil · Ranked Lobby »", page.includes('export const metadata = { title: "Accueil · Ranked Lobby" }'));
  check("les lectures mortes de l'ancienne page sont parties (moyennes, erreurs, reprise, duels ouverts)", !/getTopicAverages|getProgramAverage|loadErrors|loadResume|getReviewableDuels|getOpenChallenges|loadPointFaible/.test(page));
  check("le squelette propre à la route existe, sans donnée", existsSync("app/dashboard/loading.tsx") && !/supabase|await/.test(readFileSync("app/dashboard/loading.tsx", "utf8")));
  const morts = [
    "components/DashboardView.tsx",
    "components/accueil/HomeCards.tsx",
    "components/accueil/CompeteCards.tsx",
    "components/accueil/RankCard.tsx",
    "components/accueil/Tile.tsx",
    "components/accueil/Sections.tsx",
    "components/accueil/ProgressTabs.tsx",
    "components/accueil/Rendezvous.tsx",
    "components/accueil/VainqueurDuJour.tsx",
    "components/accueil/VainqueurDuJour.module.css",
    "components/accueil/DuNouveau.tsx",
    "components/accueil/point-faible.ts",
    "components/defi/DefiHero.tsx",
    "components/defi/CinqCarte.tsx",
    "lib/voice-accueil.ts",
  ];
  check("le code mort de l'ancien accueil est supprimé", morts.every((f) => !existsSync(f)), morts.filter((f) => existsSync(f)).join());
  const gardes = ["components/accueil/queries.ts", "components/accueil/format.ts", "components/accueil/types.ts", "components/accueil/SceauTenu.tsx", "components/accueil/SerieEncreLigne.tsx", "components/defi/DefiTile.tsx"];
  check("ce qui sert encore est gardé (lectures de la semaine, formats, sceau TENU, ligne de série, tuile du défi)", gardes.every((f) => existsSync(f)), gardes.filter((f) => !existsSync(f)).join());
  const queries = readFileSync("components/accueil/queries.ts", "utf8");
  check("queries.ts ne garde que ce qui sert : l'activité, la journée, l'heure, l'examen blanc", /export (async )?function (parisDay|loadActivity|withLiveDaily|parisHour|loadNextMockExam)\b/.test(queries) && !/loadErrors|loadResume|getProgramAverage|lastActiveDay|daysBetweenKeys/.test(queries));
  const repliques = readFileSync("scripts/leonard/test-repliques.ts", "utf8");
  check("Léonard : les repères de l'accueil pointent vers les cartes du lobby", repliques.includes('defi: "components/accueil/lobby/CarteTrente.tsx"') && repliques.includes('anneau: "components/accueil/lobby/CarteTraits.tsx"'));
}

titre("# les fichiers : îlots clients et garde-fous (tout le dossier du lobby)");
{
  const dossier = join(process.cwd(), "components/accueil/lobby");
  const fichiers = readdirSync(dossier).filter((f) => /\.(tsx?|css)$/.test(f));
  const attendus = [
    "types.ts", "modele.ts", "donnees.ts", "plafond.ts", "LobbyView.tsx", "Lobby.module.css", "Encre.tsx", "Entete.tsx", "CarteTrente.tsx", "ClassementTrente.tsx", "CarteCinq.tsx", "CarteTraits.tsx", "BandeVainqueur.tsx", "CarteRang.tsx",
    "EnDirect.tsx", "PersoVainqueur.tsx", "modele-direct.ts", "lecture-direct.ts", "EnDirect.module.css",
    "CarteRival.tsx", "BoutonRelance.tsx", "actions-rival.ts", "modele-rival.ts", "lecture-rival.ts", "Rival.module.css",
    "CarteDuJour.tsx", "CarteDuJourIle.tsx", "actions-carte.ts", "modele-carte.ts", "lecture-carte.ts", "CarteDuJour.module.css",
    "CarteScores.tsx", "CarteDeblocage.tsx", "CarteQuete.tsx", "BandeGrandeSalle.tsx", "Affiche.tsx", "DuNouveau.tsx", "TesAmis.tsx", "CarnetJours.tsx", "modele-parcours.ts", "lecture-parcours.ts", "Parcours.module.css", "CarnetJours.module.css",
  ];
  check("les fichiers des six lots sont là", attendus.every((f) => fichiers.includes(f)), attendus.filter((f) => !fichiers.includes(f)).join());
  const sources = fichiers.map((f) => [f, readFileSync(join(dossier, f), "utf8")] as const);
  const clients = sources.filter(([, c]) => /^["']use client["']/.test(c.trimStart()));
  check("les îlots clients du dossier : aucun Intl, aucun toLocaleString", clients.every(([, c]) => !/\bIntl\b|toLocaleString|toLocaleDateString|toLocaleTimeString/.test(c)), clients.map(([f]) => f).join());
  check("les îlots clients attendus : le classement, la relance, la carte du jour (et rien d'autre)", JSON.stringify(clients.map(([f]) => f).sort()) === JSON.stringify(["BoutonRelance.tsx", "CarteDuJourIle.tsx", "ClassementTrente.tsx"]), clients.map(([f]) => f).join());
  const lectures = sources.filter(([f]) => /^(lecture-|donnees|actions-)/.test(f) && f.endsWith(".ts"));
  check("les lectures ne sont jamais importées par un îlot client (seules ses actions serveur le sont)", clients.every(([, c]) => !/from "(\.\/|@\/components\/accueil\/lobby\/)(lecture-|donnees)/.test(c)) && lectures.length >= 5);
  const autres = [...fichiers.map((f) => join(dossier, f)), ...readdirSync(join(process.cwd(), "lib")).filter((f) => f.startsWith("voice-accueil-lobby")).map((f) => join(process.cwd(), "lib", f)), join(process.cwd(), "scripts/accueil/lobby-exemple.ts"), join(process.cwd(), "app/dashboard/page.tsx"), join(process.cwd(), "app/dashboard/loading.tsx"), join(process.cwd(), "migration_accueil.sql")];
  // un chemin de travail (lecteur, dossier utilisateur, Temp, scratchpad) codé en dur casserait le CSS du site (piège Tailwind)
  const chemin = /scratchpad|AppData|[A-Za-z]:[\\/](Users|Documents|Dossier)|[\\/]Temp[\\/]/;
  const fautifs = autres.filter((f) => !f.endsWith("test-lobby.tsx") && chemin.test(readFileSync(f, "utf8")));
  check("aucun chemin de travail (Temp, scratchpad, AppData, lecteur) dans les fichiers de l'accueil", fautifs.length === 0, fautifs.join());
  const antislash = autres.filter((f) => !f.endsWith(".css") && !f.endsWith("test-lobby.tsx") && /[A-Za-z]:\\/.test(readFileSync(f, "utf8")));
  check("aucun chemin à antislash (une lettre de lecteur suivie d'un antislash) dans les fichiers de l'accueil", antislash.length === 0, antislash.join());
  // une fonction passée du serveur à un îlot ne se sérialise pas : seules des données ou des nœuds rendus au serveur
  const serveur = sources.filter(([f, c]) => f.endsWith(".tsx") && !/^["']use client["']/.test(c.trimStart()));
  const ilots = ["ClassementTrente", "BoutonRelance", "CarteDuJourIle"];
  const fautive = serveur.filter(([, c]) => ilots.some((n) => new RegExp(`<${n}\\b[^>]*(\\bon[A-Z]\\w*=|=\\{\\s*\\(\\)|=\\{\\s*function|=\\{\\s*async)`).test(c)));
  check("aucune fonction n'est passée du serveur à un îlot client (des données, des nœuds rendus au serveur)", fautive.length === 0, fautive.map(([f]) => f).join());
  check("aucun tracé SVG recopié dans les composants (icônes lucide seulement : pas de page à 600 Ko, pas de #418)", sources.every(([f, c]) => f.endsWith(".css") || !/<path\s/.test(c)));
  check("aucune image de la maquette (/_blob/) dans le dossier", sources.every(([, c]) => !c.includes("/_blob/")));
  const palette = sources.filter(([f, c]) => f.endsWith(".tsx") && /import \{[^}]*\b(Bouton|BoutonAction|Selecteur)\b[^}]*\} from ["'][.][/]Encre["']|EncreVive/.test(c)).map(([f]) => f);
  check("la vraie encre ne sert qu'aux boutons principaux et au sélecteur : les cartes sans bouton d'encre n'en importent pas", ["Affiche.tsx", "TesAmis.tsx", "DuNouveau.tsx", "CarnetJours.tsx", "CarteScores.tsx", "CarteDeblocage.tsx", "CarteQuete.tsx", "BandeGrandeSalle.tsx", "EnDirect.tsx", "BandeVainqueur.tsx"].every((f) => !palette.includes(f)), palette.join());
  const migration = readFileSync(join(process.cwd(), "migration_accueil.sql"), "utf8");
  check("la seule migration est celle des relances, idempotente", /CREATE TABLE IF NOT EXISTS relances/.test(migration) && /CREATE OR REPLACE FUNCTION relancer/.test(migration) && /DROP POLICY IF EXISTS/.test(migration));
}

finAsync.then(() => {
  console.log("");
  if (ko > 0) {
    console.log(`${ko} vérification(s) en échec`);
    process.exit(1);
  }
  console.log("tout est vert");
});
