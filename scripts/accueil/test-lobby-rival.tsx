// Tests de la carte « Ton rival » de l'accueil « Le lobby » (lot 3), sans base,
// réseau ni navigateur :
//   npx tsx --tsconfig tsconfig.json scripts/accueil/test-lobby-rival.tsx
// Les calculs (la fenêtre de sept jours, le compte par côté, la confidentialité du
// Journal et du temps, les lignes et les barres de la maquette, les verdicts, ce
// qu'il reste à rattraper, le repli « bilan » sous deux mesures, les moments de
// la relance), la lecture avec un faux client (relances, absence de clé de
// service), l'action serveur (identifiant refusé) puis le rendu statique de la
// carte (une seule encre, le bouton « Relancer » en contour, les états de la
// relance, les liens) et les règles de fichier (aucun Intl dans l'îlot client,
// aucun chemin de la machine).
import "../codex/sans-css";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BoutonRelance } from "@/components/accueil/lobby/BoutonRelance";
import { CarteRival } from "@/components/accueil/lobby/CarteRival";
import {
  COTE_VIDE,
  activiteSemaine,
  barres,
  comptes,
  coteSemaine,
  construireRival,
  debutFenetre,
  dejaRelance,
  fenetre,
  journalOuvertPour,
  mesuresDe,
  momentDe,
  pourcent,
  prenomDe,
  rattrapeDe,
  recueDe,
  verdictDe,
  type CoteSemaine,
  type EntreeRival,
  type LigneRelance,
} from "@/components/accueil/lobby/modele-rival";
import type { RivalLobby } from "@/components/accueil/lobby/types";
import { NBSP } from "@/lib/voice";
import { RIV } from "@/lib/voice-accueil-lobby-rival";
import type { Segment } from "@/lib/voice-moi";

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
const rendre = (el: React.ReactElement): string => {
  try {
    return renderToStaticMarkup(<AppRouterContext.Provider value={routeur}>{el}</AppRouterContext.Provider>)
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&");
  } catch (e) {
    console.log(e);
    return "";
  }
};
/** Le texte d'une phrase en segments. */
const texte = (segs: Segment[]) => segs.map((g) => (typeof g === "string" ? g : "b" in g ? g.b : "marque" in g ? g.marque : g.neg)).join("");
/** Le texte visible d'un morceau de HTML. */
const nu = (html: string) => html.replace(/<[^>]+>/g, "");

// ── les données de la maquette ──────────────────────────────────────────────

const JOUR = "2026-10-29"; // un jeudi
const ID = "7c1e2f3a-5b6c-4d7e-8f90-a1b2c3d4e5f6";
const MOI = "11111111-2222-4333-8444-555555555555";
const MOI_COTE: CoteSemaine = { traits: 186, jours: 5, temps: 15000, serie: 9, duels: 3 }; // 4 h 10
const LUI_COTE: CoteSemaine = { traits: 241, jours: 7, temps: 21900, serie: 14, duels: 5 }; // 6 h 05
const entree = (sur: Partial<EntreeRival> = {}): EntreeRival => ({
  id: ID,
  nom: "Marie L.",
  rencontres: 5,
  victoiresMoi: 2,
  victoiresLui: 3,
  pseudoMoi: "Theo",
  moi: MOI_COTE,
  lui: LUI_COTE,
  relance: { dispo: true, envoyee: false },
  recue: null,
  ...sur,
});

// ── 1. la fenêtre de sept jours ─────────────────────────────────────────────
{
  titre("1. La fenêtre de sept jours glissants");
  const f = fenetre(JOUR);
  check("sept jours, du plus ancien à aujourd'hui", f.length === 7 && f[0] === "2026-10-23" && f[6] === JOUR, f.join(" "));
  check("début de fenêtre = J-6", debutFenetre(JOUR) === "2026-10-23");
  check("à cheval sur deux mois et sur le passage à l'heure d'hiver", fenetre("2026-11-02")[0] === "2026-10-27" && fenetre("2026-03-02")[0] === "2026-02-24");
  check("à cheval sur deux années", fenetre("2027-01-03")[0] === "2026-12-28");

  const avant = [
    { day: "2026-10-22", n: 99 }, // J-7 : hors fenêtre
    { day: "2026-10-23", n: 20 }, // J-6 : dedans
    { day: "2026-10-25", n: 0 }, // zéro : pas un jour actif
    { day: "2026-10-28", n: 30 }, // J-1
    { day: JOUR, n: 500 }, // aujourd'hui lu dans « avant » : ignoré (c'est duJour qui compte)
  ];
  const a = activiteSemaine(avant, 12, JOUR);
  check("traits = jours J-6 à J-1 + aujourd'hui (20 + 30 + 12), J-7 et le doublon d'aujourd'hui ignorés", a.traits === 62, String(a.traits));
  check("jours actifs = ceux à au moins une question (J-6, J-1, aujourd'hui = 3)", a.jours === 3, String(a.jours));
  const b = activiteSemaine(avant, 0, JOUR);
  check("aujourd'hui sans question : ni trait ni jour de plus", b.traits === 50 && b.jours === 2);
  const c = activiteSemaine([{ day: "2026-10-24", n: 5 }, { day: "2026-10-24", n: 7 }], 0, JOUR);
  check("deux lignes du même jour s'additionnent et ne comptent qu'un jour actif", c.traits === 12 && c.jours === 1);
  const d = activiteSemaine([], Number.NaN, JOUR);
  check("rien du tout (ou un nombre illisible) : zéro et zéro", d.traits === 0 && d.jours === 0);
  const sept = Array.from({ length: 7 }, (_, i) => ({ day: fenetre(JOUR)[i], n: 10 })).slice(0, 6);
  const e = activiteSemaine(sept, 10, JOUR);
  check("une semaine pleine : 7 jours actifs sur 7", e.jours === 7 && e.traits === 70);
}

// ── 2. la confidentialité ───────────────────────────────────────────────────
{
  titre("2. Confidentialité : le Journal et le temps");
  check("Journal public : ouvert à tous", journalOuvertPour("public", "aucune") && journalOuvertPour("public", null) && journalOuvertPour("public", "amis"));
  check("Journal des amis : ouvert seulement à un ami", journalOuvertPour("friends", "amis") && !journalOuvertPour("friends", "aucune") && !journalOuvertPour("friends", "envoyee") && !journalOuvertPour("friends", null));
  check("Journal privé : fermé, même à un ami", !journalOuvertPour("private", "amis") && !journalOuvertPour("private", null));

  const avant = [{ day: "2026-10-27", n: 40 }];
  const ferme = coteSemaine({ avant, duJour: 10, ouvert: false, temps: 3600, serie: 4, duels: 2, jour: JOUR });
  check("Journal fermé : traits et jours actifs masqués, le reste reste", ferme.traits === null && ferme.jours === null && ferme.temps === 3600 && ferme.serie === 4 && ferme.duels === 2);
  const ouvert = coteSemaine({ avant, duJour: 10, ouvert: true, temps: null, serie: 4, duels: 2, jour: JOUR });
  check("Journal ouvert : traits 50, 2 jours actifs ; temps privé (null) reste null", ouvert.traits === 50 && ouvert.jours === 2 && ouvert.temps === null);
  const illisible = coteSemaine({ avant: null, duJour: null, ouvert: true, temps: Number.NaN, serie: -3, duels: null, jour: JOUR });
  check("questions par jour illisibles : traits null ; nombre absurde : null ; négatif : 0", illisible.traits === null && illisible.temps === null && illisible.serie === 0 && illisible.duels === null);

  // un Journal fermé retire ses deux lignes de la comparaison, pour les deux côtés
  const m = mesuresDe(MOI_COTE, { ...LUI_COTE, traits: null, jours: null }, "Marie");
  check("Journal fermé : plus de traits ni de jours actifs dans les lignes", m.map((x) => x.cle).join() === "temps,serie,duels");
  // le temps privé retire sa ligne
  const t = mesuresDe(MOI_COTE, { ...LUI_COTE, temps: null }, "Marie");
  check("temps privé : la ligne « Temps sur le site » est omise", t.map((x) => x.cle).join() === "traits,jours,serie,duels");
}

// ── 3. les lignes, les barres ───────────────────────────────────────────────
{
  titre("3. Les lignes et les barres (les chiffres de la maquette)");
  const m = mesuresDe(MOI_COTE, LUI_COTE, "Marie");
  check("cinq lignes dans l'ordre : traits, jours actifs, temps, série, duels", m.map((x) => x.cle).join() === "traits,jours,temps,serie,duels");
  const txt = m.map((x) => `${x.toiTxt}|${x.luiTxt}`).join(" ");
  check("valeurs : 186|241 5/7|7/7 4 h 10|6 h 05 9 j|14 j 3|5", txt === `186|241 5/7|7/7 4${NBSP}h 10|6${NBSP}h 05 9${NBSP}j|14${NBSP}j 3|5`, txt);
  check("libellés de la maquette", m.map((x) => x.lib).join() === "Traits,Jours actifs,Temps sur le site,Série d'encre,Duels joués");
  check("lecture d'écran : traits, jours, temps, série, duels", m[0].aria === "Traits : toi 186, Marie 241" && m[1].aria === "Jours actifs : toi 5 sur 7, Marie 7 sur 7" && m[2].aria === "Temps sur le site : toi 4 h 10, Marie 6 h 05" && m[3].aria === "Série d'encre : toi 9 jours, Marie 14 jours" && m[4].aria === "Duels joués : toi 3, Marie 5", m.map((x) => x.aria).join(" / "));
  const bs = m.map((x) => barres(x));
  check("barres de la maquette : 77,2 % / 71,4 % / 68,5 % / 64,3 % / 60 % pour toi, 100 % pour lui", bs.map((x) => x.toi).join() === "77.2,71.4,68.5,64.3,60" && bs.every((x) => x.lui === 100), bs.map((x) => x.toi).join());
  check("l'autre côté plus long : la plus longue remplit, l'autre est une part", barres({ toi: 300, lui: 100 }).toi === 100 && barres({ toi: 300, lui: 100 }).lui === 33.3);
  check("égalité : deux barres pleines", barres({ toi: 4, lui: 4 }).toi === 100 && barres({ toi: 4, lui: 4 }).lui === 100);
  check("une valeur nulle : barre vide ; deux valeurs nulles : deux barres vides", barres({ toi: 0, lui: 8 }).toi === 0 && barres({ toi: 0, lui: 0 }).lui === 0 && pourcent(5, 0) === 0 && pourcent(-3, 10) === 0);

  const zero = mesuresDe({ ...MOI_COTE, duels: 0 }, { ...LUI_COTE, duels: 0 }, "Marie");
  check("zéro des deux côtés : la ligne est omise (rien à comparer)", !zero.some((x) => x.cle === "duels") && zero.length === 4);
  const un = mesuresDe({ ...MOI_COTE, duels: 0 }, LUI_COTE, "Marie");
  check("zéro d'un côté seulement : la ligne reste", un.some((x) => x.cle === "duels" && x.toi === 0 && x.luiTxt === "5"));
  check("temps de moins d'une heure : « 45 min »", mesuresDe({ ...COTE_VIDE, temps: 2700 }, { ...COTE_VIDE, temps: 600 }, "Léa")[0].toiTxt === `45${NBSP}min`);
  check("une série d'un seul jour : « 1 jour » à la lecture", RIV.lecture("serie", 1, 0, "Léa") === "Série d'encre : toi 1 jour, Léa 0 jour");
}

// ── 4. les verdicts ─────────────────────────────────────────────────────────
{
  titre("4. Les verdicts");
  const cinq = mesuresDe(MOI_COTE, LUI_COTE, "Marie");
  check("il te devance sur les 5 points : « Marie te devance sur les 5 points. »", texte(verdictDe("Marie", cinq)) === "Marie te devance sur les 5 points.", texte(verdictDe("Marie", cinq)));
  const surligne = verdictDe("Marie", cinq).some((g) => typeof g !== "string" && "marque" in g && g.marque === "les 5 points");
  check("le passage « les 5 points » est surligné", surligne);

  const quatre = mesuresDe({ ...MOI_COTE, duels: 6 }, LUI_COTE, "Marie");
  check("il gagne 4 lignes sur 5 : « Marie te devance sur 4 points sur 5. »", texte(verdictDe("Marie", quatre)) === "Marie te devance sur 4 points sur 5.", texte(verdictDe("Marie", quatre)));
  const trois = mesuresDe({ ...MOI_COTE, duels: 6, serie: 20 }, LUI_COTE, "Marie");
  check("il gagne 3 lignes sur 5", texte(verdictDe("Marie", trois)) === "Marie te devance sur 3 points sur 5.");
  check("comptes : 3 pour lui, 2 pour toi", JSON.stringify(comptes(trois)) === JSON.stringify({ toi: 2, lui: 3, egal: 0 }));

  const moiDevant = mesuresDe(LUI_COTE, MOI_COTE, "Marie");
  check("tu gagnes les 5 : « Tu devances Marie sur les 5 points. »", texte(verdictDe("Marie", moiDevant)) === "Tu devances Marie sur les 5 points.");
  const moiTrois = mesuresDe({ ...LUI_COTE }, { ...MOI_COTE, traits: 500, duels: 9 }, "Marie");
  check("tu gagnes 3 lignes sur 5, il en gagne 2 : « Tu devances Marie sur 3 points sur 5. »", texte(verdictDe("Marie", moiTrois)) === "Tu devances Marie sur 3 points sur 5.", texte(verdictDe("Marie", moiTrois)));

  const egal = mesuresDe({ traits: 100, jours: 5, temps: 3600, serie: 3, duels: 0 }, { traits: 90, jours: 6, temps: 3000, serie: 4, duels: 0 }, "Marie");
  check("2 lignes chacun sur 4 (le temps et les traits pour toi, les jours et la série pour lui) : « Au coude-à-coude »", texte(verdictDe("Marie", egal)) === "Au coude-à-coude avec Marie : 2 points chacun.", texte(verdictDe("Marie", egal)));
  const un1 = mesuresDe({ traits: 100, jours: 5, temps: null, serie: null, duels: null }, { traits: 90, jours: 6, temps: null, serie: null, duels: null }, "Marie");
  check("une ligne chacun : « 1 point chacun » (singulier)", texte(verdictDe("Marie", un1)) === "Au coude-à-coude avec Marie : 1 point chacun.");
  const nul = mesuresDe({ ...MOI_COTE }, { ...MOI_COTE }, "Marie");
  check("tout est égal : « Rien ne te sépare de Marie : égalité sur tous les points. »", texte(verdictDe("Marie", nul)) === "Rien ne te sépare de Marie : égalité sur tous les points.");

  check("rattrape : « Rattrape 55 traits pour l'égaler. » (241 − 186)", texte(rattrapeDe(cinq) ?? []) === "Rattrape 55 traits pour l'égaler.", texte(rattrapeDe(cinq) ?? []));
  check("le chiffre à rattraper est en rouge", (rattrapeDe(cinq) ?? []).some((g) => typeof g !== "string" && "neg" in g && g.neg === "55 traits"));
  check("tu mènes aux traits : rien à rattraper", rattrapeDe(moiDevant) === null);
  check("traits à égalité : rien à rattraper", rattrapeDe(nul) === null);
  check("pas de ligne de traits (Journal fermé) : rien à rattraper", rattrapeDe(mesuresDe(MOI_COTE, { ...LUI_COTE, traits: null }, "Marie")) === null);
  check("un seul trait de retard : « 1 trait » au singulier", texte(rattrapeDe(mesuresDe({ ...MOI_COTE, traits: 240 }, LUI_COTE, "Marie")) ?? []) === "Rattrape 1 trait pour l'égaler.");
}

// ── 5. les noms ─────────────────────────────────────────────────────────────
{
  titre("5. Les noms");
  check("« Marie L. » → « Marie »", prenomDe("Marie L.") === "Marie");
  check("un pseudo sans espace reste entier", prenomDe("marie_l") === "marie_l");
  check("nom composé : le premier mot, trait d'union compris", prenomDe("Jean-Pierre Dupont") === "Jean-Pierre");
  check("espaces autour ignorés ; vide : vide", prenomDe("  Léa  ") === "Léa" && prenomDe("") === "");
  const long = prenomDe("TraderDuDimancheSoir2000");
  check("un pseudo trop long est coupé à 14 caractères avec « … »", long.length === 14 && long.endsWith("…"), long);
  check("élision : « Relance d'Inès » mais « Relance de Marie » et « de Hugo »", RIV.recue("Inès", "ce matin").startsWith("Relance d'Inès") && RIV.recue("Marie", "ce matin").startsWith("Relance de Marie") && RIV.recue("Hugo", "ce soir").startsWith("Relance de Hugo"));
}

// ── 6. les moments de la relance ────────────────────────────────────────────
{
  titre("6. Les moments de la relance (heure de Paris)");
  const j = "2026-10-29"; // heure d'hiver (UTC+1) depuis le 25 octobre
  check("07 h 30 à Paris : « ce matin »", momentDe("2026-10-29T06:30:00Z", j) === "ce matin");
  check("minuit 30 à Paris (23 h 30 UTC la veille) : « ce matin », pas « hier »", momentDe("2026-10-28T23:30:00Z", j) === "ce matin");
  check("11 h 59 : « ce matin » ; midi : « cet après-midi »", momentDe("2026-10-29T10:59:00Z", j) === "ce matin" && momentDe("2026-10-29T11:00:00Z", j) === "cet après-midi");
  check("17 h 59 : « cet après-midi » ; 18 h : « ce soir »", momentDe("2026-10-29T16:59:00Z", j) === "cet après-midi" && momentDe("2026-10-29T17:00:00Z", j) === "ce soir");
  check("23 h 59 : « ce soir »", momentDe("2026-10-29T22:59:00Z", j) === "ce soir");
  check("hier : « hier » (23 h 59 la veille, heure de Paris)", momentDe("2026-10-28T12:00:00Z", j) === "hier" && momentDe("2026-10-28T22:59:00Z", j) === "hier");
  check("avant-hier, demain, illisible : null", momentDe("2026-10-27T12:00:00Z", j) === null && momentDe("2026-10-30T12:00:00Z", j) === null && momentDe("pas une date", j) === null);
  check("heure d'été (UTC+2) : 22 h 30 UTC le 13 juillet = 00 h 30 le 14 → « ce matin »", momentDe("2026-07-13T22:30:00Z", "2026-07-14") === "ce matin");

  const lignes: LigneRelance[] = [
    { de: ID, a: MOI, jour: "2026-10-28", cree_le: "2026-10-28T20:00:00Z" },
    { de: ID, a: MOI, jour: JOUR, cree_le: "2026-10-29T06:30:00Z" },
    { de: "autre", a: MOI, jour: JOUR, cree_le: "2026-10-29T15:00:00Z" },
    { de: MOI, a: ID, jour: JOUR, cree_le: "2026-10-29T08:00:00Z" },
  ];
  check("la relance reçue du rival : la plus récente, avec son moment", recueDe("Marie", lignes, ID, MOI, JOUR) === "Relance de Marie ce matin : à toi de jouer.", String(recueDe("Marie", lignes, ID, MOI, JOUR)));
  check("seulement hier : « hier »", recueDe("Marie", [lignes[0]], ID, MOI, JOUR) === "Relance de Marie hier : à toi de jouer.");
  check("celles des autres joueurs et celles que tu as envoyées n'y sont pas", recueDe("Marie", [lignes[2], lignes[3]], ID, MOI, JOUR) === null);
  check("trop ancienne ou aucune : null", recueDe("Marie", [{ de: ID, a: MOI, jour: "2026-10-20", cree_le: "2026-10-20T10:00:00Z" }], ID, MOI, JOUR) === null && recueDe("Marie", [], ID, MOI, JOUR) === null);
  check("déjà relancé aujourd'hui : oui", dejaRelance(lignes, MOI, ID, JOUR));
  check("relancé seulement hier : non (une par jour)", !dejaRelance([{ de: MOI, a: ID, jour: "2026-10-28", cree_le: "2026-10-28T08:00:00Z" }], MOI, ID, JOUR));
  check("relancé un autre joueur : non", !dejaRelance(lignes, MOI, "autre", JOUR));
}

// ── 7. la carte, construite ─────────────────────────────────────────────────
let rival: RivalLobby;
{
  titre("7. La carte construite");
  rival = construireRival(entree());
  check("identité : id, nom, prénom, initiales, profil", rival.id === ID && rival.nom === "Marie L." && rival.prenom === "Marie" && rival.initiales === "ML" && rival.href === `/people/${ID}`);
  check("cinq mesures, pas de bilan", rival.mesures.length === 5 && rival.bilan === null);
  check("verdict et rattrape de la maquette", texte(rival.verdict) === "Marie te devance sur les 5 points." && texte(rival.rattrape ?? []) === "Rattrape 55 traits pour l'égaler.");
  check("défi : le lobby des duels avec l'adversaire", rival.defi.href === `/duel?adversaire=${ID}` && rival.defi.libelle === "Lui lancer un défi");
  check("relance possible, pas envoyée, aperçu au nom du joueur", rival.relance.dispo && !rival.relance.envoyee && rival.relance.apercu === "Relance de Theo : à toi de jouer.", rival.relance.apercu);
  check("pas de relance reçue", rival.recue === null);

  const sans = construireRival(entree({ relance: { dispo: false, envoyee: true } }));
  check("table absente : pas de relance, et jamais « envoyée »", !sans.relance.dispo && !sans.relance.envoyee);
  check("déjà relancé aujourd'hui : envoyée", construireRival(entree({ relance: { dispo: true, envoyee: true } })).relance.envoyee);
  check("ton pseudo inconnu : un aperçu sans nom", construireRival(entree({ pseudoMoi: null })).relance.apercu === "Relance : à toi de jouer." && construireRival(entree({ pseudoMoi: "  " })).relance.apercu === "Relance : à toi de jouer.");
  check("ton pseudo en voyelle : élision", construireRival(entree({ pseudoMoi: "Inès" })).relance.apercu === "Relance d'Inès : à toi de jouer.");
  check("la relance reçue est passée telle quelle", construireRival(entree({ recue: "Relance de Marie ce matin : à toi de jouer." })).recue === "Relance de Marie ce matin : à toi de jouer.");

  // moins de deux mesures : le bilan des rencontres
  const peu = { ...COTE_VIDE, duels: 2 };
  const b1 = construireRival(entree({ moi: peu, lui: { ...COTE_VIDE, duels: 4 }, victoiresMoi: 3, victoiresLui: 1, rencontres: 5 }));
  check("une seule mesure comparable : le bilan, aucune ligne, aucun verdict", b1.mesures.length === 0 && b1.verdict.length === 0 && b1.rattrape === null && b1.bilan === "Tu mènes : 3 victoires sur 5 rencontres.", String(b1.bilan));
  const b2 = construireRival(entree({ moi: COTE_VIDE, lui: COTE_VIDE, victoiresMoi: 1, victoiresLui: 3, rencontres: 5 }));
  check("aucune mesure (Journal fermé, temps privé, rien joué) : « Marie mène : 3 victoires sur 5 rencontres. »", b2.bilan === "Marie mène : 3 victoires sur 5 rencontres." && b2.mesures.length === 0, String(b2.bilan));
  const b3 = construireRival(entree({ moi: COTE_VIDE, lui: COTE_VIDE, victoiresMoi: 2, victoiresLui: 2, rencontres: 5 }));
  check("égalité : « À égalité : 2 victoires chacun sur 5 rencontres. »", b3.bilan === "À égalité : 2 victoires chacun sur 5 rencontres.", String(b3.bilan));
  const b4 = construireRival(entree({ moi: COTE_VIDE, lui: COTE_VIDE, victoiresMoi: 1, victoiresLui: 0, rencontres: 1 }));
  check("une rencontre : « 1 victoire sur 1 rencontre » (singulier)", b4.bilan === "Tu mènes : 1 victoire sur 1 rencontre.", String(b4.bilan));
  const dix = construireRival(entree({ moi: { ...COTE_VIDE, duels: 1, serie: 2 }, lui: { ...COTE_VIDE, duels: 3, serie: 1 } }));
  check("deux mesures suffisent pour comparer", dix.mesures.length === 2 && dix.bilan === null);
  const jsonOk = (() => {
    try {
      return JSON.parse(JSON.stringify(rival)).mesures.length === 5;
    } catch {
      return false;
    }
  })();
  check("la carte se sérialise (rien d'autre que des données)", jsonOk);
}

// ── 8. le rendu de la carte ─────────────────────────────────────────────────
{
  titre("8. Le rendu de la carte");
  const html = rendre(<CarteRival rival={rival} className="place" />);
  check("section nommée par son titre, le placement reçu", html.includes('aria-labelledby="lobby-rival-titre"') && html.includes('id="lobby-rival-titre"') && html.includes('class="carte place"'));
  check("le nom du rival en titre de niveau 2", /<h2 id="lobby-rival-titre" class="font-brand ttl">Marie L\.<\/h2>/.test(html));
  check("le surtitre honnête (le plus croisé)", html.includes("Ton rival · le plus croisé") && !html.includes("qui joue le plus"));
  check("« Son profil » mène au profil", html.includes(`href="/people/${ID}"`) && html.includes("Son profil"));
  check("cinq lignes dans une liste nommée", compte(html, /<li class="act">/g) === 5 && html.includes("Activité des 7 derniers jours, toi contre Marie"));
  check("« Sur 7 jours » (et non « cette semaine » : la fenêtre glisse)", html.includes("Sur 7 jours") && !html.includes("Cette semaine"));
  check("les valeurs visibles de la maquette", nu(html).includes("186") && nu(html).includes("241") && nu(html).includes("5/7") && nu(html).includes("7/7") && nu(html).includes(`4${NBSP}h 10`) && nu(html).includes(`14${NBSP}j`));
  check("lecture d'écran de chaque ligne, les valeurs visuelles cachées", html.includes('<span class="sr">Traits : toi 186, Marie 241</span>') && compte(html, /class="v[ a-zA-Z]*" aria-hidden="true"/g) === 10);
  check("barres : 77,2 % pour toi et 100 % pour lui sur la première ligne", html.includes('style="width:77.2%"') && compte(html, /style="width:100%"/g) === 5);
  check("le chiffre le plus bas s'efface (toi, sur les 5 lignes)", compte(html, /class="v bas"/g) === 5 && compte(html, /class="v vD"/g) === 5);
  check("verdict surligné et rattrape en rouge", html.includes('<span class="surligne">les 5 points</span>') && html.includes('<span class="neg">55 traits</span>') && nu(html).includes("Marie te devance sur les 5 points."));
  check("aucun bilan quand on compare", !html.includes('class="bilan"'));

  // l'encre : un seul liquide, sur « Lui lancer un défi » ; « Relancer » reste en contour
  check("un seul liquide dans la carte", compte(html, /rl-encre-vif/g) === 1 && compte(html, /class="rl-encre /g) === 1);
  check("le liquide est celui de la palette « florence »", html.includes('data-palette="florence"'));
  check("le bouton d'encre est « Lui lancer un défi », vers le lobby des duels", html.includes(`href="/duel?adversaire=${ID}"`) && html.includes('class="rl-encre encre bouton"') && html.includes("Lui lancer un défi"));
  check("l'encre est enfant direct du bouton (premier enfant), comme les autres pages", /class="rl-encre encre bouton"[^>]*><canvas[^>]*class="rl-encre-vif"/.test(html));
  check("« Relancer Marie » : un vrai bouton en contour, sans encre", /<button type="button" class="plus"[^>]*>/.test(html) && html.includes("Relancer Marie") && compte(html, /<button/g) === 1 && !html.includes('class="rl-encre plus"'));
  check("le bouton « Relancer » a un nom complet et une infobulle", html.includes('aria-label="Relancer Marie L. : un petit mot qui l\'invite à jouer"') && html.includes('title="Marie verra : « Relance de Theo : à toi de jouer. »"'));
  check("aucune fausse animation : pas de glissement de texture dans le CSS de la carte", !/@keyframes|animation\s*:|background-position/.test(readFileSync("components/accueil/lobby/Rival.module.css", "utf8")));

  // les états de la relance
  const sans = rendre(<CarteRival rival={{ ...rival, relance: { ...rival.relance, dispo: false } }} />);
  check("table absente : pas de bouton « Relancer », le défi reste", !sans.includes("Relancer") && sans.includes("Lui lancer un défi") && compte(sans, /rl-encre-vif/g) === 1);
  const faite = rendre(<CarteRival rival={{ ...rival, relance: { ...rival.relance, envoyee: true } }} />);
  check("déjà relancé aujourd'hui : « Relance envoyée » et ce que l'autre verra, plus de bouton", faite.includes("Relance envoyée") && faite.includes("Marie verra : « Relance de Theo : à toi de jouer. »") && !faite.includes("Relancer Marie") && !/<button/.test(faite));
  const recue = rendre(<CarteRival rival={{ ...rival, recue: "Relance de Marie ce matin : à toi de jouer." }} />);
  check("relance reçue : la phrase est dans la carte", recue.includes('<p class="recue">Relance de Marie ce matin : à toi de jouer.</p>'));
  check("pas de relance reçue : pas de ligne", !html.includes('class="recue"'));

  // le repli sans assez de chiffres
  const repli = rendre(<CarteRival rival={construireRival(entree({ moi: COTE_VIDE, lui: COTE_VIDE, victoiresMoi: 1, victoiresLui: 3, rencontres: 5 }))} />);
  check("repli : le bilan à la place du face-à-face, sans liste ni verdict", repli.includes('<p class="bilan">Marie mène : 3 victoires sur 5 rencontres.</p>') && !repli.includes('class="acts"') && !repli.includes('class="verdict"'));
  check("repli : les deux actions restent", repli.includes("Lui lancer un défi") && repli.includes("Relancer Marie"));
  check("repli : la phrase d'explication", repli.includes("Pas assez de chiffres à comparer sur 7 jours"));

  // l'îlot seul
  const ile = rendre(<BoutonRelance id={ID} nom="Marie L." prenom="Marie" apercu="Relance de Theo : à toi de jouer." envoyee={false} />);
  check("îlot : un bouton « Relancer Marie », une zone d'annonce vide, aucune note", ile.includes("Relancer Marie") && /<span class="sr" role="status" aria-live="polite"><\/span>/.test(ile) && !ile.includes('class="note"'));
  const ile2 = rendre(<BoutonRelance id={ID} nom="Marie L." prenom="Marie" apercu="Relance de Theo : à toi de jouer." envoyee />);
  check("îlot déjà envoyé : l'état, la note et l'annonce", ile2.includes("Relance envoyée") && ile2.includes('class="note"') && ile2.includes("Relance envoyée. Marie verra") && !ile2.includes("<button"));
}

// ── 9. la lecture avec un faux client ───────────────────────────────────────
async function lecture() {
  titre("9. La lecture (faux client Supabase)");
  const faux = (reponses: Record<string, { data?: unknown; error?: unknown } | Error>) => {
    const appels: string[] = [];
    const chaine = (table: string): unknown => {
      const c: unknown = new Proxy(function () {}, {
        get(_t, prop) {
          if (prop === "then") {
            const r = reponses[table];
            return (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => (r instanceof Error ? Promise.reject(r) : Promise.resolve(r ?? { data: null, error: null })).then(ok, ko);
          }
          return (...args: unknown[]) => {
            appels.push(`${table}.${String(prop)}(${args.map((a) => JSON.stringify(a)).join(",")})`);
            return c;
          };
        },
      });
      return c;
    };
    return { sb: { from: (t: string) => chaine(t) } as unknown as SupabaseClient, appels };
  };
  let lib: typeof import("@/components/accueil/lobby/lecture-rival");
  try {
    lib = await import("@/components/accueil/lobby/lecture-rival");
  } catch (e) {
    check("le module de lecture se charge", false, String(e));
    return;
  }
  check("le module de lecture se charge", true);

  const ok = faux({
    relances: {
      data: [
        { de: ID, a: MOI, jour: "2026-10-29", cree_le: "2026-10-29T06:30:00Z" },
        { de: MOI, a: ID, jour: "2026-10-29T00:00:00", cree_le: "2026-10-29T08:00:00Z" },
        { de: 3, a: MOI, jour: JOUR, cree_le: "x" }, // ligne mal formée : écartée
        null,
      ],
      error: null,
    },
  });
  const r = await lib.lireRelances(ok.sb, MOI, JOUR);
  check("relances : table lisible, deux lignes valides, le jour réduit à AAAA-MM-JJ", r.dispo && r.lignes.length === 2 && r.lignes[1].jour === "2026-10-29", JSON.stringify(r.lignes));
  check("relances : lues depuis hier, les plus récentes d'abord, 60 au plus, celles où je suis expéditeur ou destinataire", ok.appels.some((a) => a.includes('relances.gte("jour","2026-10-28")')) && ok.appels.some((a) => a.includes(`or("de.eq.${MOI},a.eq.${MOI}")`)) && ok.appels.some((a) => a.includes("limit(60)")) && ok.appels.some((a) => a.includes('order("cree_le",{"ascending":false})')));
  const absente = await lib.lireRelances(faux({ relances: { data: null, error: { code: "42P01", message: 'relation "relances" does not exist' } } }).sb, MOI, JOUR);
  check("relances : table absente (migration pas collée) → indisponible, sans exception", !absente.dispo && absente.lignes.length === 0);
  const plante = await lib.lireRelances(faux({ relances: new Error("réseau") }).sb, MOI, JOUR);
  check("relances : lecture qui lève → indisponible, sans exception", !plante.dispo && plante.lignes.length === 0);

  const recues = faux({
    relances: {
      data: [
        { de: ID, a: MOI, jour: "2026-10-29", cree_le: "2026-10-29T06:30:00Z" },
        { de: "u2", a: MOI, jour: "2026-10-28", cree_le: "2026-10-28T20:00:00Z" },
        { de: "u3", a: MOI, jour: "2026-10-27", cree_le: "2026-10-27T20:00:00Z" }, // trop ancienne : sans moment
        { de: MOI, a: ID, jour: "2026-10-29", cree_le: "2026-10-29T08:00:00Z" }, // envoyée : pas une reçue
      ],
      error: null,
    },
    profiles: { data: [{ id: ID, username: "Marie L." }, { id: "u2", username: "  " }], error: null },
  });
  const rr = await lib.lireRelancesRecues({ sb: recues.sb, admin: null, user: { id: MOI, user_metadata: {}, created_at: "2026-01-01" }, now: new Date("2026-10-29T10:00:00Z"), jour: JOUR });
  check("relances reçues : celles d'aujourd'hui et d'hier, avec nom et moment", rr !== null && rr.length === 2 && rr[0].nom === "Marie L." && rr[0].quand === "ce matin" && rr[1].nom === "Un joueur" && rr[1].quand === "hier", JSON.stringify(rr));
  const rn = await lib.lireRelancesRecues({ sb: faux({ relances: { data: null, error: { code: "42P01" } } }).sb, admin: null, user: { id: MOI, user_metadata: {}, created_at: "2026-01-01" }, now: new Date(), jour: JOUR });
  check("relances reçues : table absente → null (Du nouveau n'en ajoute pas)", rn === null);
  const vide = await lib.lireRelancesRecues({ sb: faux({ relances: { data: [], error: null } }).sb, admin: null, user: { id: MOI, user_metadata: {}, created_at: "2026-01-01" }, now: new Date(), jour: JOUR });
  check("relances reçues : aucune → liste vide", Array.isArray(vide) && vide.length === 0);

  const sansAdmin = faux({});
  const rien = await lib.lireRivalActivite({ sb: sansAdmin.sb, admin: null, user: { id: MOI, user_metadata: {}, created_at: "2026-01-01" }, now: new Date(), jour: JOUR });
  check("sans client de service : pas de rival (la carte est absente) et aucune lecture", rien === null && sansAdmin.appels.length === 0);

  // l'action serveur : un identifiant qui n'est pas un UUID est refusé avant toute lecture de session
  const act = await import("@/components/accueil/lobby/actions-rival");
  check("action : identifiant vide, inventé ou piégé → « indisponible » sans toucher à la base", (await act.relancerRival("")) === "indisponible" && (await act.relancerRival("pas-un-uuid")) === "indisponible" && (await act.relancerRival(`${ID}'; drop table relances;--`)) === "indisponible" && (await act.relancerRival(undefined as unknown as string)) === "indisponible");
}

// ── 10. les règles de fichier ───────────────────────────────────────────────
function fichiers() {
  titre("10. Règles de fichier");
  const dir = "components/accueil/lobby/";
  const siens = ["CarteRival.tsx", "BoutonRelance.tsx", "actions-rival.ts", "modele-rival.ts", "lecture-rival.ts", "Rival.module.css"].map((f) => dir + f).concat(["lib/voice-accueil-lobby-rival.ts", "migration_accueil.sql", "scripts/accueil/test-lobby-rival.tsx"]);
  const lus = new Map(siens.map((f) => [f, readFileSync(f, "utf8")] as const));
  // aucun chemin de la machine dans un fichier du dépôt (piège Tailwind : un chemin en dur casse le CSS du site)
  const barre = String.fromCharCode(92);
  const mots = ["te" + "mp/", "app" + "data", "scratch" + "pad"];
  const fautifs = siens.filter((f) => {
    const t = lus.get(f) ?? "";
    return t.includes(barre + barre) || t.includes(":" + barre) || mots.some((m) => t.toLowerCase().includes(m));
  });
  check("aucun chemin de la machine (antislash double, lecteur, dossiers temporaires) dans les fichiers du lot", fautifs.length === 0, fautifs.join(", "));

  const ile = lus.get(dir + "BoutonRelance.tsx") ?? "";
  check("l'îlot client commence par « use client »", ile.trimStart().startsWith('"use client"'));
  check("l'îlot client : ni Intl ni toLocaleString ni Date", !/Intl|toLocale|new Date|Date\.now/.test(ile));
  check("l'îlot client n'importe ni le modèle, ni la lecture, ni le formatage du classement (rien de serveur)", !/modele-rival|lecture-rival|classement\/format|supabase\/server/.test(ile));
  const action = lus.get(dir + "actions-rival.ts") ?? "";
  check("l'action serveur commence par « use server » et n'exporte que des fonctions asynchrones", action.trimStart().startsWith('"use server"') && !/export (const|let|var|function) /.test(action) && /export async function relancerRival/.test(action));
  const carte = lus.get(dir + "CarteRival.tsx") ?? "";
  check("la carte est un composant serveur (ni « use client » ni hook) et n'a pas d'Intl", !carte.includes('"use client"') && !/useState|useEffect|Intl|toLocale/.test(carte));
  check("le SVG reste léger : des icônes lucide, aucun tracé recopié", !/<path|<svg/.test(carte) && !/<path|<svg/.test(ile));
  const css = lus.get(dir + "Rival.module.css") ?? "";
  check("CSS : pas d'image de fond ni de texture, pas de fausse animation", !/url\(|@keyframes|animation\s*:/.test(css));
  const sql = lus.get("migration_accueil.sql") ?? "";
  check("SQL : table relances, une par jour, trois au plus, écriture par la seule fonction", /CREATE TABLE IF NOT EXISTS relances/.test(sql) && /PRIMARY KEY \(de, a, jour\)/.test(sql) && />= 3 THEN RETURN 'limite'/.test(sql) && /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON relances FROM anon, authenticated/.test(sql) && /GRANT EXECUTE ON FUNCTION relancer\(uuid\) TO authenticated/.test(sql));
  check("SQL idempotent : IF NOT EXISTS, OR REPLACE, DROP POLICY IF EXISTS", /DROP POLICY IF EXISTS relances_lire/.test(sql) && /CREATE OR REPLACE FUNCTION relancer/.test(sql) && /CREATE INDEX IF NOT EXISTS/.test(sql));
}

async function main() {
  await lecture();
  fichiers();
  console.log("");
  console.log(ko === 0 ? "Tout est vert." : `${ko} échec(s).`);
  process.exit(ko === 0 ? 0 : 1);
}
main().catch((e) => {
  console.log(e);
  process.exit(1);
});
