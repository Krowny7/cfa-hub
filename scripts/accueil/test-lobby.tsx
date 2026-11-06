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
import { renderToReadableStream, renderToStaticMarkup } from "react-dom/server";
import { prerender } from "react-dom/static";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { LobbyView } from "@/components/accueil/lobby/LobbyView";
import { CarteTraitsGrande } from "@/components/accueil/lobby/CarteTraits";
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
import { FILET_CARTES_MS, FILET_MS, plafonner } from "@/components/accueil/lobby/plafond";
import { couleurArc } from "@/components/ui/ArcElectrique";
import type { CartesDifferees, Lobby, NouveauLobby } from "@/components/accueil/lobby/types";
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
  check("le vainqueur : Marie L., 29/30 en 11 min 40 s, devant 130 joueurs, son profil, pas de personnage", v.nom === "Marie L." && !v.moi && JSON.stringify(v.ligne) === JSON.stringify([{ b: "29/30" }, " en ", { b: `11${NB}min${NB}40${NB}s` }, ", devant 130 joueurs"]) && v.href === `/people/${base.vainqueur!.userId}` && v.perso === null, JSON.stringify(v.ligne));
  check("le vainqueur, c'est toi : « Toi »", bandeVainqueur({ ...base.vainqueur!, isMe: true }).nom === "Toi");

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
  // la petite carte des traits : l'anneau (156 px) et « Encore 14 traits », rien d'autre (demande de l'utilisateur)
  const traitsHtml = html.slice(html.lastIndexOf("<section", html.indexOf('id="lobby-traits"')), html.indexOf("</section>", html.indexOf('id="lobby-traits"')));
  check("les traits : « Encore 14 traits » et le sceau TENU en pointillé ; J-110 reste dans l'en-tête", traitsHtml.includes("Encore 14 traits") && traitsHtml.includes('aria-label="Sceau TENU : pas encore, il se pose à 40 traits"') && html.includes("J-110"), traitsHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  check("les traits : ni liste du bas (série d'encre, joker de la semaine, examen) ni phrase d'explication dans la petite carte", !traitsHtml.includes("Série d'encre") && !traitsHtml.includes("Joker de la semaine") && !traitsHtml.includes("Examen") && !traitsHtml.includes(`9${NB}jours`) && !traitsHtml.includes('class="kvl') && !traitsHtml.includes('class="st"') && !traitsHtml.includes("traitsTexte") && !traitsHtml.includes("traitsPied") && !/J-\d/.test(traitsHtml));
  check("les traits : l'anneau passe de 104 à 156 px, centré dans la carte avec le titre à côté, un seul anneau et le repère de Léonard gardé", traitsHtml.includes("width:156px;height:156px") && !traitsHtml.includes("104px") && compte(traitsHtml, /data-leonard="anneau"/g) === 1 && traitsHtml.indexOf('class="traitsCorps"') > 0 && traitsHtml.indexOf("width:156px") < traitsHtml.indexOf('class="traitsTitre"'));
  // au survol de l'anneau, une bulle : les questions et les calculs du jour (l'exemple n'a pas de calcul)
  check("les traits : l'anneau se lit en entier (traits, objectif, questions, calculs) et porte sa bulle « 26 questions · 0 calcul », focalisable", /data-leonard="anneau" class="self-center anneauInfo" tabindex="0" role="img" aria-label="Anneau du jour : 26 traits sur \d+, dont 26 questions et 0 calcul"/.test(traitsHtml) && traitsHtml.includes(`<span class="bulle" aria-hidden="true">26${NB}questions · 0${NB}calcul</span>`), traitsHtml.slice(traitsHtml.indexOf("anneauInfo") - 40, traitsHtml.indexOf("anneauInfo") + 200));
  // la carte des 5 : un courant électrique qui longe le coin bas droit (ArcCoin, un canvas vide au rendu serveur)
  const cinqHtml = html.slice(html.lastIndexOf("<section", html.indexOf('id="lobby-cinq"')), html.indexOf("</section>", html.indexOf('id="lobby-cinq"')));
  check("les 5 : l'arc du coin (canvas aria-hidden, classe coin), posé en dernier dans la carte, une seule fois sur la page, plus d'ancien éclair", /<canvas aria-hidden="true" data-arc="coin" class="coin "><\/canvas>/.test(cinqHtml) && cinqHtml.indexOf('data-arc="coin"') > cinqHtml.indexOf("Jouer les 5 du jour") && compte(cinqHtml, /data-arc=/g) === 1 && compte(html, /data-arc="coin"/g) === 1 && !html.includes('data-arc="eclair"') && !html.includes("eclairCinq"), cinqHtml.slice(-260));
  check("les 5 : l'arc ne porte ni lien ni bouton ni texte (rien à lire, rien à cliquer)", !/data-arc="coin"[^>]*(href|onclick|tabindex|role=)/.test(cinqHtml));
  check("le vainqueur : Marie L., 29/30, 11 min 40 s, devant 130 joueurs, le bouton Profil, plus de palier ni de lien d'hier", html.includes("Dernier vainqueur des 30 du jour") && html.includes(`11${NB}min${NB}40${NB}s`) && html.includes("devant 130 joueurs") && html.includes(`href="/people/${base.vainqueur!.userId}"`) && html.includes(">Profil<") && !html.includes("Le classement d'hier"));
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
    "duel-lice.webp",
    'id="lobby-vainqueur"',
    'id="lobby-direct-titre"',
    'id="lobby-rang"',
    'id="lobby-deblocage-titre"',
    'id="lobby-quete-titre"',
    'id="lobby-scores-titre"',
    "/illustrations/accueil-cascade.webp",
    'id="lobby-salle-titre"',
    'id="lobby-nouveau-titre"',
    'id="lobby-amis-titre"',
    'id="lobby-carnet-titre"',
  ];
  check("l'ordre final : salut, les 30 + classement, les 5, traits, carte du jour, rival, affiche, vainqueur, lobby, rang, déblocage, quête, scores, affiche, Grande Salle, du nouveau, amis, carnet", croissant(positions(html, final)), positions(html, final).join());
  check("(a) la ligue de la semaine est remplacée par une affiche : plus de ligue ni d'XP entre amis, une figure sans lien", !/ligue/i.test(html.replace(/Ligue d/g, "")) && !html.includes("Zone de montée") && /<figure[^>]*>(?:(?!<\/figure>).)*duel-lice\.webp(?:(?!<\/figure>).)*<\/figure>/s.test(html) && !/<figure[^>]*>(?:(?!<\/figure>).)*<a /s.test(html));
  check("(b) le carnet de jours est la DERNIÈRE carte : plus aucune carte après lui", !html.slice(html.indexOf('id="lobby-carnet-titre"')).includes("<section"), html.slice(html.indexOf('id="lobby-carnet-titre"')).split("<section").length - 1 + " section(s) après");
  check("les deux affiches sont des peintures du site (public/illustrations), jamais /_blob/", html.includes("/illustrations/duel-lice.webp") && html.includes("/illustrations/accueil-cascade.webp") && html.includes("/illustrations/mock-grande-salle.webp") && !html.includes("/_blob/"));
  check("la rangée 3 a ses trois cartes (data-n absent), la rangée du vainqueur a sa colonne (vainqueur puis lobby)", /class="rangeeJour"/.test(html) && !/class="rangeeJour" data-n/.test(html) && html.indexOf('id="lobby-vainqueur"') < html.indexOf('id="lobby-direct-titre"') && html.indexOf('id="lobby-direct-titre"') < html.indexOf('id="lobby-rang"'));
  check("la Grande Salle a un bouton NOIR en aplat, sans liquide", html.includes("Voir l'examen blanc") && !/lobby-salle-titre(?:(?!<\/section>).)*rl-encre/s.test(html));
  check("du nouveau garde sa cible de Léonard et liste la relance de Marie en premier (« ce matin »)", compte(html, /data-leonard="du-nouveau"/g) === 1 && html.indexOf("t'a relancé") > 0 && html.indexOf("t'a relancé") < html.indexOf("t'a battu") && html.includes("ce matin"));
  check("le carnet reçoit la journée : « 26 traits sur 40 »", html.includes("26 traits sur 40"));
  // le lobby en direct : toi d'abord, tes amis, les autres, « +N » ; la carte garde sa hauteur naturelle (plus de grand vide blanc)
  const direct = html.slice(html.indexOf('id="lobby-direct-titre"'), html.indexOf('id="lobby-rang"'));
  const noms = [...direct.matchAll(/<li class="joueur( moi)?" title="([^"]*)"/g)].map((m) => m[2]);
  check("lobby en direct : toi en premier (« Toi »), tes amis en ligne (Inès, Hugo) juste après, puis les autres", noms.join(",") === "Toi,Inès K.,Hugo B.,Marie L.,Sarah T.,Lucas M." && /<li class="joueur moi"/.test(direct), noms.join(","));
  check("lobby en direct : le reste se compte (« +32 » sur 38)", direct.includes('aria-hidden="true">+32</b>'), direct.slice(direct.indexOf('class="joueurs"'), direct.indexOf('class="joueurs"') + 120));
  check("lobby en direct : la carte n'est plus étirée à la hauteur du rang (pas de classe etire), le vainqueur non plus quand le lobby est là", !/class="[^"]*etire[^"]*" aria-labelledby="lobby-direct-titre"/.test(html) && !/class="[^"]*etire[^"]*"/.test(html.slice(html.indexOf('class="vqw'), html.indexOf('id="lobby-direct-titre"'))));
  const amis = html.slice(html.indexOf('id="lobby-amis-titre"'));
  check("tes amis, à côté de « Du nouveau » : colonne ordinaire (c4), pas la bande", /class="carte petite amis c4"/.test(html) && !html.includes("amisSeule") && amis.includes("Inès"));
}

titre("# Léonard, la palette et l'inventaire des liquides");
{
  check('data-leonard="defi" sur la carte héros (une fois) et data-leonard="anneau" sur l\'anneau (une fois)', compte(html, /data-leonard="defi"/g) === 1 && compte(html, /data-leonard="anneau"/g) === 1);
  check("la palette est posée sur la racine : noir, anthracite, gris perle, blanc, texture graphite.webp", html.includes("--pal-1:#111113") && html.includes("--pal-2:#3b3b3f") && html.includes("--pal-3:#8d8d92") && html.includes("--pal-4:#f1f1f2") && html.includes("/encres/graphite.webp"));
  check("chaque liquide a l'encre de la page, sauf les 5 du jour (éclair) et les 30 (vallée)", compte(html, /data-palette="(graphite|eclair|vallee)"/g) === compte(html, /class="rl-encre-vif"/g) && !/data-palette="(?!graphite|eclair|vallee)/.test(html) && compte(html, /data-palette="eclair"/g) === 1 && compte(html, /data-palette="vallee"/g) === 1);
  check("exactement 4 liquides par défaut : Rendre ma copie, Jouer les 5 du jour, l'option active « Aujourd'hui » et Lui lancer un défi", compte(html, /class="rl-encre-vif"/g) === 4, String(compte(html, /class="rl-encre-vif"/g)));
  const iDefi = html.indexOf("Lui lancer un défi");
  const boutonDefi = html.slice(html.lastIndexOf("<a ", iDefi), iDefi);
  const iPlus = html.indexOf('class="plus"');
  const boutonPlus = html.slice(html.lastIndexOf("<button", iPlus), html.indexOf("</button>", iPlus));
  check("« Lui lancer un défi » porte le liquide du rival (palette graphite), « Relancer » reste un bouton à contour sans encre", boutonDefi.includes("rl-encre-vif") && boutonDefi.includes('data-palette="graphite"') && boutonPlus.includes("Relancer") && !boutonPlus.includes("rl-encre"), boutonPlus.slice(0, 80));
  check("chaque liquide est l'enfant direct d'un .rl-encre positionné", compte(html, /rl-encre[^>]*data-palette="(?:graphite|eclair|vallee)"[^>]*><canvas[^>]*class="rl-encre-vif"/g) === 4 || compte(html, /class="rl-encre encre [^"]*"[^>]*><canvas/g) + compte(html, /class="rl-encre encre"[^>]*><canvas/g) === 4);
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
  check("nouveau joueur : pas de « Du nouveau », donc tes amis prennent la rangée en bande (amisSeule, c12), pas en colonne étirée et vide", /class="carte petite amis amisSeule c12"/.test(neuf) && !neuf.includes('id="lobby-nouveau-titre"'));
  check("nouveau joueur : « Toi » ouvre la rangée du lobby en direct, une seule fois", /<li class="joueur moi" title="Toi"/.test(neuf) && neuf.search(/<li class="joueur( moi)?"/) === neuf.search(/<li class="joueur moi"/) && compte(neuf, /<li class="joueur moi"/g) === 1);

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
  check("sans migrations : ni joker ni palier, ni classement ni vainqueur ; la page tient", !sansMig.includes("Joker de la semaine") && !sansMig.includes('class="feuille">×') && !sansMig.includes("Classement des 30") && !sansMig.includes("Vainqueur des 30 d'hier") && sansMig.includes("Ton rang") && sansMig.length > 5000);
  // la phrase et la liste du bas ont quitté la petite carte ; la grande variante (ni 30 ni 5) les garde, avec les mêmes données
  const grandeSansMig = renderToStaticMarkup(<CarteTraitsGrande t={exemple("sansMigrations").traits} />).replace(/&#x27;/g, "'");
  check("sans migrations : la phrase des traits (grande variante) dit seulement le palier à venir (pas de ×2 inventé), la série est à 4 jours sans palier ni joker", grandeSansMig.includes("×1,5 dès 3") && !grandeSansMig.includes('<b>×2</b>') && grandeSansMig.includes("4" + NB + "jours") && !grandeSansMig.includes("Joker de la semaine") && !grandeSansMig.includes('class="feuille">×'));
  check("sans migrations : la petite carte n'a plus la phrase (×1,5 dès 3 absent de la page)", !sansMig.includes("×1,5 dès 3") && !sansMig.includes("4" + NB + "jours"));
  const grande = rendre("sansDefis");
  check("ni 30 ni 5 : la grande variante garde la phrase, la série d'encre (9 jours à ×2), le joker disponible et J-110 en bas", grande.includes('class="st"') && grande.includes("Série d'encre") && grande.includes(`9${NB}jours`) && grande.includes('class="feuille">×2<') && grande.includes("Joker de la semaine") && grande.includes("disponible") && compte(grande, /J-110/g) >= 2 && grande.includes("width:170px;height:170px"));

  const sd = rendre("sansDate");
  check("sans date d'examen : « Fixe ton jour J », plus de J-n ni de phase", sd.includes("Fixe ton jour J") && !/J-\d/.test(sd) && sd.includes("Fixe ton jour J pour suivre ta phase de révision"));

  const toutes: Variante[] = ["base", "nouveau", "enCours", "toutFait", "tenu", "bientot", "sansDefis", "placement", "sansClassement", "sansMigrations", "sansDate", "perso", "sansAdmin", "sansRival", "sansJour", "sansExtras"];
  check("toutes les variantes se rendent, en un h1 chacune", toutes.every((v) => compte(rendre(v), /<h1/g) === 1));
}

titre("# l'assemblage : les variantes qui retirent des cartes (la rangée se recompose)");
{
  const perso = rendre("perso");
  check("personnage du vainqueur : posé comme enfant direct de l'enveloppe (vqAvecPerso), une image décorative, chargée à la demande", perso.includes("vqAvecPerso") && /<\/section><span class="persoCadre"[^>]*><img class="perso"[^>]*alt=""[^>]*loading="lazy"/.test(perso) && perso.includes("/illustrations/accueil-duel.webp"));

  const sansAdmin = rendre("sansAdmin");
  check("sans clé de service : ni lobby en direct ni rival ; les amis disent combien ils sont (la présence ne se lit pas)", !sansAdmin.includes("En ce moment dans le lobby") && !sansAdmin.includes('id="lobby-rival-titre"') && /<b[^>]*>14<[/]b><span>amis<[/]span>/.test(sansAdmin) && !sansAdmin.includes("en ligne sur 14"));
  check("sans clé de service : la carte du jour garde son affiche à côté du rival absent (deux cartes, data-n=2), la colonne du vainqueur ne tient que la bande", sansAdmin.includes('class="rangeeJour" data-n="2"') && sansAdmin.includes('id="lobby-vainqueur"') && compte(sansAdmin, /class="rl-encre-vif"/g) === 3);

  const sansRival = rendre("sansRival");
  check("sans rival ni carte du jour : la rangée 3 disparaît, l'affiche ne reste pas seule", !sansRival.includes("rangeeJour") && !sansRival.includes("duel-lice.webp") && sansRival.includes('id="lobby-vainqueur"') && sansRival.includes("accueil-cascade.webp"));
  check("sans rival : « Lui lancer un défi » disparaît, 3 liquides", !sansRival.includes("Lui lancer un défi") && compte(sansRival, /class="rl-encre-vif"/g) === 3);

  const sansJour = rendre("sansJour");
  check("sans carte du jour : le rival et l'affiche se partagent la rangée (data-n=2)", sansJour.includes('class="rangeeJour" data-n="2"') && sansJour.includes('id="lobby-rival-titre"') && sansJour.includes("duel-lice.webp") && !sansJour.includes('data-matiere="fsa"') && !sansJour.includes("La carte du jour"));

  const socle = rendre("sansExtras");
  check("socle seul (rien des lots 2 à 5) : la page tient, une seule h1, les cartes du socle sont là", compte(socle, /<h1/g) === 1 && socle.includes('id="lobby-defi"') && socle.includes('id="lobby-traits"') && socle.includes('id="lobby-rang"') && socle.includes('id="lobby-vainqueur"'));
  check("socle seul : ni rangée 3, ni lobby, ni scores, ni affiche, ni Grande Salle, ni du nouveau, ni amis, ni carnet", ["rangeeJour", "lobby-direct-titre", "lobby-scores-titre", "lobby-deblocage-titre", "lobby-quete-titre", "/illustrations/accueil-cascade.webp", "duel-lice.webp", "lobby-salle-titre", "lobby-nouveau-titre", "lobby-amis-titre", "lobby-carnet-titre"].every((x) => !socle.includes(x)));
  check("socle seul : le vainqueur remplit seul sa colonne (il s'étire), le rang à côté", socle.includes("etire") && socle.indexOf('id="lobby-vainqueur"') < socle.indexOf('id="lobby-rang"'));

  const sansMig = rendre("sansMigrations");
  check("sans migrations : « Relancer » n'apparaît pas (la table des relances manque), « Lui lancer un défi » reste", !/class="plus"/.test(sansMig) && sansMig.includes("Lui lancer un défi"));

  const neuf = rendre("nouveau");
  check("nouveau joueur : ni rival ni scores ni nouvelles ; le carnet est vide mais posé, les amis invitent à en ajouter", !neuf.includes('id="lobby-rival-titre"') && !neuf.includes('id="lobby-scores-titre"') && !neuf.includes('id="lobby-nouveau-titre"') && neuf.includes('id="lobby-carnet-titre"') && neuf.includes("Ajoute tes premiers amis"));
  check("nouveau joueur : l'affiche de la rangée 3 accompagne la carte du jour (data-n=2) ; pas de colonne de déblocage donc pas d'affiche de la bibliothèque", neuf.includes('class="rangeeJour" data-n="2"') && !neuf.includes("accueil-cascade.webp"));
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
  check("les filets : 8 s pour les cartes lues avec la page, 15 s pour les cinq cartes lues après elle", FILET_MS === 8000 && FILET_CARTES_MS === 15000);
  check("une lecture rapide rend sa valeur", (await plafonner(attente(5, "ok"), 200)) === "ok");
  const t0 = Date.now();
  check("une lecture trop lente rend null à l'heure, sans l'attendre", (await plafonner(attente(400, "tard"), 30)) === null && Date.now() - t0 < 300, String(Date.now() - t0));
  check("une lecture qui échoue rend null (jamais d'exception)", (await plafonner(Promise.reject(new Error("boum")), 200)) === null);
  check("une lecture qui rend déjà null reste null", (await plafonner(Promise.resolve(null), 200)) === null);
})();

titre("# les cinq cartes lentes lues APRÈS la page (en continu) : squelettes, puis cartes");
const finContinu = finAsync.then(async () => {
  const lob = exemple("base");
  const sansLentes = (l: Lobby): Lobby => ({ ...l, enDirect: null, rival: null, carteDuJour: null, deblocage: null, quete: null });
  const lentesDe = (l: Lobby): Required<CartesDifferees> => ({
    enDirect: Promise.resolve(l.enDirect),
    rival: Promise.resolve(l.rival),
    carteDuJour: Promise.resolve(l.carteDuJour),
    deblocage: Promise.resolve(l.deblocage),
    quete: Promise.resolve(l.quete),
  });
  const jamais = <T,>() => new Promise<T | null>(() => {});
  const enAttente: Required<CartesDifferees> = { enDirect: jamais(), rival: jamais(), carteDuJour: jamais(), deblocage: jamais(), quete: jamais() };
  const habille = (n: React.ReactElement) => <AppRouterContext.Provider value={routeur}>{n}</AppRouterContext.Provider>;
  const net = (h: string) => h.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/<!--[\s\S]*?-->/g, "");
  /** la page quand toutes les lectures ont fini : prerender attend tous les <Suspense> et rend le HTML final, sans squelette ni commentaire de frontière */
  const rendu = async (l: Lobby, d?: CartesDifferees): Promise<string> => {
    // progressiveChunkSize énorme : sans lui React met à part (hors de la page, avec un script) les frontières volumineuses, même finies
    const { prelude } = await prerender(habille(<LobbyView l={l} differees={d} />), { progressiveChunkSize: 1e9 });
    return net(await new Response(prelude).text());
  };
  /** la page à l'instant où le serveur l'envoie, lectures en cours : les squelettes à la place des cartes */
  const pendant = (l: Lobby, d: CartesDifferees): string => net(renderToStaticMarkup(habille(<LobbyView l={l} differees={d} />)));
  const sansClasse = (h: string, ...classes: string[]) => classes.reduce((x, c) => x.split(` ${c}`).join(""), h);
  const ouvertures = (h: string) => [...h.matchAll(/<div class="((?:rangee|colonne)[^"]*)"[^>]*>/g)].map((m) => m[1]);
  const ids = (h: string) => [...h.matchAll(/aria-labelledby="(lobby-[^"]+)"/g)].map((m) => m[1]);
  const NOMS = ["carteDuJour", "rival", "enDirect", "deblocage", "quete"];
  const REELLES = ["data-matiere=", "lobby-rival-titre", "lobby-direct-titre", "lobby-deblocage-titre", "lobby-quete-titre"];

  check("la maquette complète a bien les cinq cartes lentes", !!lob.carteDuJour && !!lob.rival && !!lob.enDirect && !!lob.deblocage && !!lob.quete);

  // ── les squelettes, à la place exacte des cartes ──
  const att = pendant(sansLentes(lob), enAttente);
  check("pendant la lecture : les cinq squelettes sont là, chacun une fois, tous en aria-busy", NOMS.every((n) => compte(att, new RegExp(`data-squelette="${n}"`, "g")) === 1) && compte(att, /aria-busy="true"/g) === 5);
  check("   aucune vraie carte lente à leur place (ni carte du jour, ni rival, ni lobby en direct, ni déblocage, ni quête)", !REELLES.some((r) => att.includes(r)));
  check("   un texte réservé aux lecteurs d'écran dit laquelle arrive", ["La carte du jour arrive", "Ton rival arrive", "Le lobby en direct arrive", "Ton prochain déblocage arrive", "Ta prochaine quête arrive"].every((t) => att.includes(`>${t}<`)));
  const complet = await rendu(sansLentes(lob), lentesDe(lob));
  check("   chaque squelette est posé à la place EXACTE de sa carte : même ordre dans la page que les vraies cartes", croissant(positions(att, NOMS.map((n) => `data-squelette="${n}"`))) && croissant(positions(complet, REELLES)));
  check("   la composition des rangées est la MÊME qu'une fois les cartes arrivées (rangée de la carte du jour, du vainqueur, colonne du déblocage…)", JSON.stringify(ouvertures(att)) === JSON.stringify(ouvertures(sansClasse(complet, "etireSeule"))), JSON.stringify(ouvertures(att)));
  const LENTES_IDS = ["lobby-rival-titre", "lobby-direct-titre", "lobby-deblocage-titre", "lobby-quete-titre"];
  check("   le reste de la page est déjà là (30 du jour, 5, traits, vainqueur, rang, scores, nouveau, amis, carnet, les deux affiches)", JSON.stringify(ids(att)) === JSON.stringify(ids(complet).filter((i) => !LENTES_IDS.includes(i))) && compte(att, /<figure/g) === 2, `${ids(att).length} cartes`);
  check("   la bande du vainqueur reste étirable si elle finit seule (.etireSeule), le lobby en direct attend dans la même colonne", att.includes("etireSeule") && att.indexOf("lobby-vainqueur") < att.indexOf('data-squelette="enDirect"'));
  {
    const nv = exemple("nouveau");
    const p = pendant(sansLentes(nv), { enDirect: jamais(), carteDuJour: jamais() });
    check("   sans vainqueur, la colonne du lobby en direct se retire s'il n'arrive pas : .colonneDirect et .rangApresDirect posés (et seulement alors)", p.includes('class="colonne c7 colonneDirect"') && p.includes("rang c5 rangApresDirect") && !att.includes("colonneDirect"));
  }

  // ── la page part avant les cartes lentes (le vrai flux, comme le serveur l'envoie) ──
  {
    let finie = false;
    // 1,5 s : le premier rendu du flux (à froid) peut dépasser 400 ms sur une machine chargée ; la lecture serait alors
    // « finie » avant le premier morceau lu, et le contrôle échouerait sans que le code soit en cause
    const lente = attente(1500, lob.carteDuJour).then((c) => {
      finie = true;
      return c;
    });
    const flux = await renderToReadableStream(habille(<LobbyView l={sansLentes(lob)} differees={{ ...lentesDe(lob), carteDuJour: lente }} />));
    const lecteur = flux.getReader();
    const decodeur = new TextDecoder();
    // ce que le flux a déjà livré tant que la lecture lente n'est pas finie, puis le reste
    let avant = "";
    let apres = "";
    for (;;) {
      const r = await lecteur.read();
      if (r.done) break;
      const morceau = decodeur.decode(r.value, { stream: true });
      if (finie) apres += morceau;
      else avant += morceau;
    }
    check("la page part SANS attendre la carte lente : le flux livre déjà la page pendant que sa lecture dure encore", avant.length > 20000 && finie);
    check("   ces premiers morceaux portent le socle (les 30, le rang, le carnet) et le squelette de la carte du jour, pas la carte", avant.includes("lobby-rang") && avant.includes("lobby-scores-titre") && avant.includes('data-squelette="carteDuJour"') && !avant.includes("data-matiere="));
    check("   la carte du jour arrive ensuite dans le même flux, à la place du squelette (script de remplacement de React)", apres.includes("data-matiere=") && apres.includes("$RC("), `${apres.length} octets`);
  }

  // ── les cartes arrivées = la page rendue d'un bloc ──
  const dUnBloc = await rendu(lob);
  check("une fois les cinq lectures finies : EXACTEMENT la page rendue d'un bloc (seule la classe .etireSeule de la bande diffère)", sansClasse(complet, "etireSeule") === dUnBloc, `${complet.length} / ${dUnBloc.length} octets`);
  check("   toutes les vraies cartes lentes sont là, plus aucun squelette", REELLES.every((r) => complet.includes(r)) && !complet.includes("data-squelette") && !complet.includes('aria-busy="true"'));

  // ── une lecture lente n'est plus masquée ──
  {
    const t0 = Date.now();
    const lente = plafonner(attente(120, lob.carteDuJour), FILET_CARTES_MS);
    const h = await rendu(sansLentes(lob), { ...lentesDe(lob), carteDuJour: lente });
    check("une lecture lente (120 ms, ici sous le filet) n'est plus masquée : la carte du jour est dans la page, après son attente", h.includes("data-matiere=") && !h.includes("data-squelette") && Date.now() - t0 >= 100, String(Date.now() - t0));
    check("   ce que faisait l'ancien plafond, à petite échelle : la même lecture, coupée à 40 ms, aurait disparu", (await plafonner(attente(120, lob.carteDuJour), 40)) === null);
    const tardive = await rendu(sansLentes(lob), { ...lentesDe(lob), rival: plafonner(attente(300, lob.rival), 40) });
    check("   une lecture qui dépasse vraiment le filet est abandonnée : le rival est masqué, la page se rend sans l'attendre davantage", !tardive.includes("lobby-rival-titre") && tardive.includes("data-matiere="));
  }

  // ── un échec ou un dépassement du filet : la rangée se recompose comme avant, sans trou ──
  {
    const sans = async (cle: keyof CartesDifferees, attendu: Lobby, retire: (keyof CartesDifferees)[] = [], bandeSeule = false) => {
      const d = lentesDe(lob);
      for (const c of [cle, ...retire]) d[c] = Promise.resolve(null) as never;
      const diffee = await rendu(sansLentes(lob), d);
      const dUnBloc = await rendu(attendu);
      // le lobby en direct absent : d'un bloc la bande a .etire, lue en continu elle a .etireSeule (le CSS l'étire alors qu'elle est seule)
      return bandeSeule ? diffee.split("etireSeule").join("etire") === dUnBloc : sansClasse(diffee, "etireSeule") === sansClasse(dUnBloc, "etireSeule");
    };
    check("sans carte du jour : le rival et l'affiche se partagent la rangée (data-n=2), comme la variante « sans carte du jour »", await sans("carteDuJour", exemple("sansJour")));
    check("sans carte du jour ni rival : la rangée disparaît (une affiche seule n'a pas de sens), comme « sans rival »", await sans("carteDuJour", exemple("sansRival"), ["rival"]));
    check("sans lobby en direct (le vainqueur reste) : la bande remplit la colonne, comme avant", await sans("enDirect", { ...lob, enDirect: null }, [], true));
    check("sans déblocage : la quête s'étire seule dans la colonne", await sans("deblocage", { ...lob, deblocage: null }));
    check("sans déblocage ni quête : les scores s'étirent (c8), l'affiche reste", await sans("deblocage", { ...lob, deblocage: null, quete: null }, ["quete"]));
    const rien = await rendu(sansLentes(lob), { enDirect: Promise.resolve(null), rival: Promise.resolve(null), carteDuJour: Promise.resolve(null), deblocage: Promise.resolve(null), quete: Promise.resolve(null) });
    check("   les cinq en échec : aucun squelette ne reste, la page se rend entière sans les cinq cartes", !rien.includes("data-squelette") && !REELLES.some((r) => rien.includes(r)) && rien.includes("lobby-scores-titre") && rien.includes("lobby-rang"));
    const nv = exemple("nouveau");
    const sansVq = await rendu(sansLentes(nv), { enDirect: Promise.resolve(null), carteDuJour: Promise.resolve(nv.carteDuJour) });
    check("   sans vainqueur ni lobby en direct : la colonne reste VIDE (le CSS la retire : :empty) et le rang reprend la rangée", sansVq.includes('<div class="colonne c7 colonneDirect"></div>') && sansVq.includes("rang c5 rangApresDirect"));
    const avecVq = await rendu(sansLentes(nv), { enDirect: Promise.resolve(nv.enDirect), carteDuJour: Promise.resolve(nv.carteDuJour) });
    check("   sans vainqueur mais avec le lobby en direct : la page d'un bloc (aux classes .colonneDirect et .rangApresDirect près)", sansClasse(avecVq, "colonneDirect", "rangApresDirect") === (await rendu(nv)));
    const rejet = await rendu(sansLentes(lob), { ...lentesDe(lob), carteDuJour: new Promise((_, non) => setTimeout(() => non(new Error("boum")), 10)) });
    check("   une promesse qui rejetterait malgré tout (plafonner ne le laisse pas faire) ne casse pas la page : la carte est masquée", !rejet.includes("data-matiere=") && rejet.includes("lobby-rival-titre"));
  }

  // ── le code ──
  {
    const lecture = (f: string) => readFileSync(join(process.cwd(), "components/accueil/lobby", f), "utf8");
    const donnees = lecture("donnees.ts");
    const grandPromiseAll = donnees.slice(donnees.indexOf("] = await Promise.all(["));
    check("donnees.ts : les cinq lectures lentes sont HORS du Promise.all de la page (elle ne les attend plus)", ["lireEnDirect(", "lireRivalActivite(", "lireCarteDuJourEnCache(", "lireDeblocage(", "lireQuete("].every((f) => donnees.includes(f) && !grandPromiseAll.includes(f)));
    const objet = donnees.slice(donnees.indexOf("const differees:"), donnees.indexOf("] = await Promise.all(["));
    check("   chacune a le filet large (FILET_CARTES_MS), plus le plafond court de 1,5 s", compte(objet, /FILET_CARTES_MS/g) === 5 && !donnees.includes("PLAFOND_MS"), String(compte(objet, /FILET_CARTES_MS/g)));
    check("   la page reçoit { lobby, differees } et les donne à LobbyView", donnees.includes("return { lobby, differees };") && readFileSync("app/dashboard/page.tsx", "utf8").includes("<LobbyView l={lobby} differees={differees} />"));
    const plaf = await import("@/components/accueil/lobby/plafond");
    check("plafond.ts : plus de PLAFOND_MS ; le filet des cinq cartes est large (au moins 4 s), le filet par défaut est FILET_MS", !("PLAFOND_MS" in plaf) && plaf.FILET_CARTES_MS >= 4000 && plaf.FILET_CARTES_MS >= plaf.FILET_MS && (await plafonner(attente(5, "ok"))) === "ok");
    const vue = lecture("LobbyView.tsx");
    check("LobbyView : les cinq cartes lentes passent par Rangees.tsx (plus de rendu direct de CarteDuJour, CarteRival, CarteDeblocage, CarteQuete)", !/<(CarteDuJour|CarteRival|CarteDeblocage|CarteQuete|CarteScores)\b/.test(vue) && vue.includes("RangeeJourEnContinu") && vue.includes("RangeeScoresEnContinu") && vue.includes("EnDirectEnContinu"));
    const rangees = lecture("Rangees.tsx");
    check("Rangees.tsx : un <Suspense> par lecture (la rangée de la carte du jour, celle du déblocage, le lobby en direct), serveur pur", compte(rangees, /<Suspense fallback=/g) === 3 && !rangees.includes("use client") && !/Intl|toLocale/.test(rangees));
    const sq = lecture("Squelettes.tsx");
    const sqCss = lecture("Squelettes.module.css");
    const sqCode = sqCss.replace(/\/\*[\s\S]*?\*\//g, "");
    check("Squelettes : aria-busy, texte réservé, aucune encre, aucune animation, aplats gris pâles du site (--well)", compte(sq, /aria-busy="true"/g) === 1 && sq.includes("sr-only") && !/Encre|EncreVive/.test(sq) && !/@keyframes|animation|transition|url\(/.test(sqCode) && sqCode.includes("var(--well)") && !sq.includes("use client"));
    const reel = lecture("CarteDuJour.module.css");
    check("   la carte du jour a la même hauteur que la vraie : 476 px, 440 px au téléphone (requête de conteneur à 760 px)", /\.jc \{[^}]*min-height: 476px/.test(reel) && /\.sq\.carteDuJour \{[^}]*min-height: 476px/.test(sqCss) && /@container \(max-width: 760px\)[\s\S]*\.sq\.carteDuJour \{\s*min-height: 440px/.test(sqCss) && /@container \(max-width: 760px\)\s*\{\s*\.jc \{\s*min-height: 440px/.test(reel));
    const css = lecture("Lobby.module.css");
    check("Lobby.module.css : la colonne et la bande se recomposent sans :has() (:empty, :only-child, frère adjacent)", css.includes(".colonne > .etireSeule:only-child") && css.includes(".colonneDirect:empty {") && css.includes(".colonneDirect:empty + .rangApresDirect") && !css.includes(":has("));
  }
});

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
  // l'arrivée sur un ordinateur (~1737 × 870) : l'en-tête resserré, la rangée du héros entière sous lui
  const bureau = bloc(/@container \(min-width: 761px\)/);
  const large = bloc(/@container \(min-width: 1081px\)/);
  check("dès 761 px : l'en-tête remonte (marge haute négative) et se rapproche du héros ; le J-n passe de 56 à 46 px (40 px au téléphone, inchangé)", /\.entete\s*\{[^}]*margin-top: -\d+px[^}]*margin-bottom: -\d+px/.test(bureau) && /\.examenJ\s*\{\s*font-size: 46px/.test(css) && !/margin-top: -/.test(tel));
  check("dès 1081 px : la rangée du héros est bornée par la fenêtre (max-height: max(600px, calc(100svh - …)) sur une rangée à 1fr), le classement défile dans sa carte", /\.rangeeHeros\s*\{[^}]*grid-template-rows: minmax\(0, 1fr\)[^}]*max-height: max\(600px, calc\(100svh - \d+px\)\)/.test(large) && /\.rangeeHeros > \.heros\s*\{[^}]*grid-template-rows: minmax\(0, 1fr\)/.test(large) && /\.rangeeHeros \.classement\s*\{[^}]*min-height: 0/.test(large) && /\.rangeeHeros \.lignes\s*\{[^}]*overflow-y: auto/.test(large));
  check("rien de cette limite sous 761 px ni entre 761 et 1080 px (les cartes y sont empilées) : ni .rangeeHeros ni svh en dehors des deux blocs", !tel.includes("rangeeHeros") && !tel.includes("svh") && !bureau.includes("rangeeHeros") && !bureau.includes("svh"));
  check("LobbyView pose .rangeeHeros sur la rangée des 30 | 5 et traits, pas sur celle des traits en grand", html.includes('class="rangee rangeeHeros"') && !rendre("sansDefis").includes("rangeeHeros"));
  check("plus de règle .eclairCinq dans la feuille du lobby", !css.includes("eclairCinq"));
  // l'arc du coin ne gêne rien et se tait quand il le faut : il ne capte aucun clic, s'efface en mode discret, reste posé en mouvement réduit
  const coinCss = readFileSync(join(process.cwd(), "components/ui/ArcCoin.module.css"), "utf8");
  const coinAnim = readFileSync(join(process.cwd(), "components/ui/arc-coin-anim.ts"), "utf8");
  check("l'arc du coin : sans clic (pointer-events: none), coupé en mode discret", /\.coin\s*\{[^}]*pointer-events: none/.test(coinCss) && /html\[data-discreet="1"\]\)\s*\.coin\s*\{\s*display: none/.test(coinCss));
  check("l'arc du coin : posé (une image fixe) avec prefers-reduced-motion et data-rl-motion=off, en pause hors écran et onglet caché", coinAnim.includes('matchMedia("(prefers-reduced-motion: reduce)")') && coinAnim.includes('dataset.rlMotion === "off"') && coinAnim.includes("image(POSE, false)") && coinAnim.includes("IntersectionObserver") && coinAnim.includes("document.hidden"));
  check("l'arc du coin : redessiné aussitôt après un changement de taille ou de densité d'écran (ni trou ni flou)", /const redimensionner = \(\) => \{\s*mesurer\(\);\s*image\(/.test(coinAnim) && coinAnim.includes("(resolution: ") && /if \(toile\.width !== lw\)/.test(coinAnim));
  // la couleur ne passe plus par le HTML (le canvas est vide au rendu serveur) : on la contrôle à la source
  const cinqSrc = readFileSync(join(process.cwd(), "components/accueil/lobby/CarteCinq.tsx"), "utf8");
  check("les 5 : l'arc est froid sur le noir (palier 3, aura cyan clair #9FF0FF)", /const PALIER_ECLAIR = 3;/.test(cinqSrc) && cinqSrc.includes("<ArcCoin palier={PALIER_ECLAIR} />") && couleurArc(3).toUpperCase() === "#9FF0FF", couleurArc(3));
  // ArcElectrique (contour du classement et du podium, éclair d'AutourDeToi) reste en service ailleurs : ses garde-fous aussi
  const arc = readFileSync(join(process.cwd(), "components/ui/ArcElectrique.module.css"), "utf8");
  check("ArcElectrique : sans clic (pointer-events: none), coupé en mode discret, posé avec prefers-reduced-motion et data-rl-motion=off", /\.arc\s*\{[^}]*pointer-events: none/.test(arc) && /html\[data-discreet="1"\]\)\s*\.arc\s*\{\s*display: none/.test(arc) && /html\[data-rl-motion="off"\]\)\s*\.arc\s*\{\s*animation: none/.test(arc) && /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.arc\s*\{\s*animation: none/.test(arc));
  const direct = readFileSync(join(process.cwd(), "components/accueil/lobby/EnDirect.module.css"), "utf8");
  check("le personnage du vainqueur est masqué sous 760 px, par requête de conteneur (la largeur de la page, pas celle de l'écran)", /@container \(max-width: 760px\)\s*\{\s*\.persoCadre\s*\{\s*display: none/.test(direct) && !/@media \(max-width: 760px\)/.test(direct));
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
  check("/dashboard sert le lobby, sans drapeau ni ancienne page", page.includes("LobbyView") && page.includes("lireLobby") && page.includes("differees") && !page.includes("lobby=1") && !page.includes("searchParams") && !page.includes("DashboardView"));
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
    "EnDirect.tsx", "Visage.tsx", "PersoVainqueur.tsx", "modele-direct.ts", "lecture-direct.ts", "EnDirect.module.css",
    "CarteRival.tsx", "BoutonRelance.tsx", "actions-rival.ts", "modele-rival.ts", "lecture-rival.ts", "Rival.module.css",
    "CarteDuJour.tsx", "CarteDuJourIle.tsx", "actions-carte.ts", "modele-carte.ts", "lecture-carte.ts", "CarteDuJour.module.css",
    "CarteScores.tsx", "CarteDeblocage.tsx", "CarteQuete.tsx", "Rangees.tsx", "Squelettes.tsx", "Squelettes.module.css", "BandeGrandeSalle.tsx", "Affiche.tsx", "DuNouveau.tsx", "TesAmis.tsx", "CarnetJours.tsx", "modele-parcours.ts", "lecture-parcours.ts", "Parcours.module.css", "CarnetJours.module.css",
  ];
  check("les fichiers des six lots sont là", attendus.every((f) => fichiers.includes(f)), attendus.filter((f) => !fichiers.includes(f)).join());
  const sources = fichiers.map((f) => [f, readFileSync(join(dossier, f), "utf8")] as const);
  const clients = sources.filter(([, c]) => /^["']use client["']/.test(c.trimStart()));
  check("les îlots clients du dossier : aucun Intl, aucun toLocaleString", clients.every(([, c]) => !/\bIntl\b|toLocaleString|toLocaleDateString|toLocaleTimeString/.test(c)), clients.map(([f]) => f).join());
  check("les îlots clients attendus : le classement, la relance, la carte du jour, les éclairs du carnet (et rien d'autre)", JSON.stringify(clients.map(([f]) => f).sort()) === JSON.stringify(["BoutonRelance.tsx", "CarteDuJourIle.tsx", "ClassementTrente.tsx", "EclairsCarnet.tsx"]), clients.map(([f]) => f).join());
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

Promise.all([finAsync, finContinu]).then(() => {
  console.log("");
  if (ko > 0) {
    console.log(`${ko} vérification(s) en échec`);
    process.exit(1);
  }
  console.log("tout est vert");
});
