// Tests des blocs Journal, Progression, Carnet de jours, des médias et de la
// carte de la page de profil (components/profil/blocs/Journal.tsx,
// Progression.tsx, Carnet.tsx, Medias.tsx), sans base ni réseau ni
// navigateur (rendu statique par react-dom/server).
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-blocs-journal.tsx
// Chaque bloc à chaque format permis (FORMATS_PERMIS), dans les trois vues :
// chez un autre (RICHE_TOI), l'aperçu « voir comme les autres » ({ ...RICHE,
// apercu: true }), chez soi ({ ...RICHE_TOI, moi: true, toi: null }) ; la
// refonte « une seule rendue pour tous » : aucune comparaison (ni « toi − »,
// ni score, ni double trait), le même dessin chez soi et chez un autre ; puis
// le contenu clé de chaque tuile (Journal « Courbe annotée », Séances « Courbe
// d'encre » et « Barres de score », Carnet « Calendrier d'encre »), l'état
// vide, la visibilité du Journal.
import "./sans-css";
import "./react-global";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ECART_PINS, JournalBloc, courbeElo, courbeParIndice, epingles, evenementsPosables, serieElo } from "@/components/profil/blocs/Journal";
import { BON, FAIBLE, NOMBRE, ProgressionBloc, SEUIL, geoCourbe, moyenne5, pointsSeances, sens } from "@/components/profil/blocs/Progression";
import { CarnetBloc, SEMAINES_TELEPHONE, SEMAINES_TUILE, casesCarnet, debutCarnet, joursDEncre, niveau, recentes } from "@/components/profil/blocs/Carnet";
import { AvecImage, CarteBloc, ImageEnHaut, MediaBloc } from "@/components/profil/blocs/Medias";
import { FORMATS_PERMIS, type BlocCarte, type BlocMedia, type Format } from "@/lib/profil/disposition";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import { BLOCS_JOURNAL as V } from "@/lib/voice-blocs-journal";
import { NBSP, nombre } from "@/lib/voice";
import { GIF_EXEMPLE, RICHE, RICHE_TOI, SOBRE, TOI_EXEMPLE } from "./donnees-blocs-exemple";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const rend = (n: React.ReactNode) => renderToStaticMarkup(<>{n}</>);
const compte = (html: string, motif: string) => html.split(motif).length - 1;
/** le texte à l'écran, sans balises (les entités de base décodées, les espaces ramenés à un) */
const texte = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ");

const AUTRE: DonneesBlocs = RICHE_TOI;
const APERCU: DonneesBlocs = { ...RICHE, apercu: true };
const MOI: DonneesBlocs = { ...RICHE_TOI, moi: true, toi: null };
const VUES: [string, DonneesBlocs][] = [
  ["chez un autre", AUTRE],
  ["aperçu", APERCU],
  ["chez soi", MOI],
];
const blocs = { journal: JournalBloc, progression: ProgressionBloc, carnet: CarnetBloc } as const;
const r = (k: keyof typeof blocs, d: DonneesBlocs, f: Format, edition = false) => rend(blocs[k]({ d, f, edition }));
const TOUS: Format[] = ["tuile", "colonne", "heros", "bande", "demi"];

/** ce qui disait « toi » : un jeton d'écart, un score, une pastille de comparaison, le double trait, le ruban */
const COMPARAISON = [/toi\s*[−+±]/, /toi\s*0\s*[–-]/, /toi\s+\d+\s*[–-]/, /toi\s*[–-]\s*[–-]/, /pas encore mesuré/, /Épais :/, /dépassé/, /Ici, l&#x27;écart/, /Sem\. du/, /Semaines où tu as fait/];
const parle = (html: string) => COMPARAISON.filter((m) => m.test(html)).map(String);

// ── Tous les formats permis, dans les trois vues ──
for (const k of Object.keys(blocs) as (keyof typeof blocs)[]) {
  for (const [nom, d] of VUES) {
    const rates: string[] = [];
    const comparent: string[] = [];
    for (const f of FORMATS_PERMIS[k]) {
      for (const edition of [false, true]) {
        try {
          const html = r(k, d, f, edition);
          // l'aperçu de RICHE n'a pas de carnet lu : le bloc garde la série et le record (Journal « fermé »)
          if (!html.includes("<section")) rates.push(f);
          if (parle(html).length) comparent.push(`${f} : ${parle(html).join(" ")}`);
        } catch (e) {
          rates.push(`${f} (${(e as Error).message})`);
        }
      }
    }
    check(`${k} : rendu à chaque format permis (${FORMATS_PERMIS[k].join(", ")}), ${nom}, en vue publique et dans Personnaliser`, rates.length === 0, rates.join(" ; "));
    check(`${k} : aucune comparaison (ni « toi ± », ni score, ni double trait), ${nom}`, comparent.length === 0, comparent.join(" ; "));
  }
}
// la bande est refusée au Journal ; reçue quand même, elle se rend comme le héros
check("journal : la bande, reçue quand même, se rend comme le héros", r("journal", AUTRE, "bande") === r("journal", AUTRE, "heros"));

// ── Une seule rendue pour tous : chez soi et chez un autre, le même dessin ──
{
  /** la phrase lue à voix haute du carnet change (« Ton carnet… » / « Le carnet de … ») ; le dessin non */
  const memeDessin = (html: string) => html.replace(/aria-label="(Ton carnet de jours|Le carnet de jours de [^"]+)"/g, 'aria-label="carnet"');
  for (const k of Object.keys(blocs) as (keyof typeof blocs)[]) {
    const ecarts = FORMATS_PERMIS[k].filter((f) => memeDessin(r(k, AUTRE, f)) !== memeDessin(r(k, MOI, f)));
    check(`${k} : chez soi et chez un autre montrent le même dessin (${FORMATS_PERMIS[k].join(", ")})`, ecarts.length === 0, ecarts.join(", "));
  }
  // ta propre donnée ne change rien : sans toi, ou avec une autre toi, le rendu est le même
  const sansToi: DonneesBlocs = { ...RICHE_TOI, toi: null };
  const autreToi: DonneesBlocs = { ...RICHE_TOI, toi: { ...TOI_EXEMPLE, seances: null, courbeElo: null, jours: [] } };
  for (const k of Object.keys(blocs) as (keyof typeof blocs)[]) {
    const ecarts = FORMATS_PERMIS[k].filter((f) => r(k, AUTRE, f) !== r(k, sansToi, f) || r(k, AUTRE, f) !== r(k, autreToi, f));
    check(`${k} : le visiteur (toi) ne change pas le dessin`, ecarts.length === 0, ecarts.join(", "));
  }
}

// ── Journal ──
{
  const j = AUTRE.journal!;
  const gainLui = j.points[j.points.length - 1] - j.depart; // +126
  const tuile = r("journal", AUTRE, "tuile");
  check("journal : l'étiquette « Journal · ELO 90 j » et le gain « +126 » à droite, en vert", texte(tuile).includes("Journal · ELO 90 j") && texte(tuile).includes(`+${gainLui}`) && tuile.includes("color:var(--gain)"));
  check("journal : le repère « +NN ELO · 90 j » et les jetons d'avant sont retirés", !tuile.includes("ELO · 90 j</") && !tuile.includes("Repere"));
  check("journal, mini-tuile : la courbe (aire, tracé, dernier point), 1 événement posé, sa légende, le lien", tuile.includes('class="aire"') && tuile.includes('class="trait"') && tuile.includes('class="fin"') && compte(tuile, 'class="pin"') === 1 && compte(tuile, "<li") === 1 && tuile.includes("Tout le journal"));
  check("journal, mini-tuile : l'événement posé est le plus récent (victoire contre Hugo P., +18), numéroté 1", texte(tuile).includes("Victoire contre Hugo P.") && texte(tuile).includes("+18") && /class="pin"[^>]*>1</.test(tuile) && /class="num"[^>]*>1</.test(tuile));
  const colonne = r("journal", AUTRE, "colonne");
  check("journal, colonne : 3 pastilles, 3 lignes de légende, le lien", compte(colonne, 'class="pin"') === 3 && compte(colonne, "<li") === 3 && colonne.includes("Tout le journal"));
  const heros = r("journal", AUTRE, "heros");
  check("journal, héros : 3 pastilles, 3 lignes de légende, le lien, la courbe et le côté", compte(heros, 'class="pin"') === 3 && compte(heros, "<li") === 3 && heros.includes("Tout le journal") && heros.includes('class="milieu"') && heros.includes('class="cote"'));
  // les pastilles vont de la plus ancienne à la plus récente, de gauche à droite
  const ordre = ["30 jours d&#x27;encre de suite", "Sceau Assiduité", "Victoire contre Hugo P."].map((x) => heros.indexOf(x));
  check("journal : la légende suit les pastilles, de la plus ancienne (1) à la plus récente (3)", ordre.every((x) => x > 0) && ordre[0] < ordre[1] && ordre[1] < ordre[2], ordre.join(","));
  const gauches = [...heros.matchAll(/class="pin" style="left:([\d.]+)%/g)].map((m) => parseFloat(m[1]));
  check("journal : les pastilles se lisent de gauche à droite (1, 2, 3)", gauches.length === 3 && gauches[0] < gauches[1] && gauches[1] < gauches[2], gauches.join(","));
  const demi = r("journal", AUTRE, "demi");
  check("journal, demi-bande : « ELO · 90 j », +126, « 12 matchs », la courbe, le lien « Tout le journal › », ni légende ni pastille", demi.includes("ELO · 90 j") && texte(demi).includes(`+${gainLui}`) && demi.includes("12 matchs") && demi.includes("Tout le journal ›") && demi.includes('class="svg"') && !demi.includes("<li") && !demi.includes('class="pin"'));
  check("journal : chaque pastille porte son infobulle « 15 oct. · Victoire contre Hugo P. »", tuile.includes('title="15 oct. · Victoire contre Hugo P."'));
  check("journal, Personnaliser : « Visible par » (aussi en demi-bande)", r("journal", MOI, "tuile", true).includes("Visible par") && r("journal", MOI, "demi", true).includes("Visible par") && !r("journal", MOI, "tuile").includes("Visible par"));

  // la couleur du gain : rouge quand il a perdu des points
  const baisse: DonneesBlocs = { ...AUTRE, journal: { ...j, depart: 1500, points: [1490, 1470, 1460], dates: ["2026-09-01", "2026-09-20", "2026-10-10"], matchs90: 3 } };
  const hb = r("journal", baisse, "tuile");
  check("journal : un gain négatif est en rouge (−40)", hb.includes("color:var(--perte)") && texte(hb).includes("−40"));
  // sans match sur 90 jours : la phrase calme, pas de courbe ni de gain ; les événements en puces
  const calme: DonneesBlocs = { ...AUTRE, journal: { ...j, points: [], dates: [], matchs: 0 } };
  const hc = r("journal", calme, "colonne");
  check("journal, aucun match en 90 jours : la phrase calme, ni courbe ni gain, les événements en puces sans numéro", texte(hc).includes("Aucun match classé sur 90 jours.") && !hc.includes('class="svg"') && !hc.includes('class="pin"') && compte(hc, 'class="puce"') === 3 && !hc.includes('class="gain"'));
  check("journal, aucun match, demi-bande : la phrase calme et « 0 »", texte(r("journal", calme, "demi")).includes("Aucun match classé sur 90 jours.") && texte(r("journal", calme, "demi")).includes(" 0 "));
  // sans les jours (données d'avant) : la courbe à égale distance, aucune pastille, des puces
  const sansJours: DonneesBlocs = { ...AUTRE, journal: { ...j, dates: undefined } };
  const hs = r("journal", sansJours, "heros");
  check("journal, sans les jours des points : la courbe est tracée, aucune pastille, les événements en puces", hs.includes('class="svg"') && !hs.includes('class="pin"') && compte(hs, 'class="puce"') === 3);
  // l'état vide
  check("journal fermé ou non lu : rien en vue publique, l'état vide dans Personnaliser", r("journal", { ...RICHE_TOI, journal: null }, "tuile") === "" && r("journal", { ...MOI, journal: null }, "tuile", true).includes("rien à montrer"));
  check("journal fermé, demi-bande dans Personnaliser : l'état vide en demi-bande", r("journal", { ...MOI, journal: null }, "demi", true).includes("rien pour l&#x27;instant"));

  // l'axe commun : départ 90 jours avant aujourd'hui, l'ELO tenu jusqu'à aujourd'hui
  const sl = serieElo(j, "2026-10-18")!;
  check("journal : la courbe va du 20 juil. (90 j avant) à aujourd'hui", sl.dates[0] === "2026-07-20" && sl.dates[sl.dates.length - 1] === "2026-10-18" && sl.valeurs[sl.valeurs.length - 1] === 1478);
  check("journal : sans les jours (données d'avant), pas d'axe des dates", serieElo({ depart: 1, points: [2] }, "2026-10-18") === null);

  // la géométrie : en pourcentages, du bord gauche au bord droit, dans la plage verticale
  const c = courbeElo(sl)!;
  const ys = [...c.chemin.matchAll(/[ML]([\d.]+),([\d.]+)/g)].map((m) => [parseFloat(m[1]), parseFloat(m[2])]);
  check("journal : le tracé va de 0 % à 100 % et reste dans la plage verticale", ys[0][0] === 0 && ys[ys.length - 1][0] === 100 && ys.every(([, y]) => y >= 12 - 0.01 && y <= 88 + 0.01), `${ys[0]} … ${ys[ys.length - 1]}`);
  check("journal : le dernier point est au bord droit, l'aire se ferme par le bas", c.fin.x === 100 && c.aire.endsWith("L0.00,100 Z") && c.aire.includes("L100.00,100"));
  check("journal : un jour se place sur l'axe (20 juil. = 0 %, aujourd'hui ≈ 100 %), hors plage il reste dans la boîte", c.xDuJour("2026-07-20") === 0 && c.xDuJour("2026-10-18")! > 98 && c.xDuJour("2020-01-01") === 0 && c.xDuJour("2030-01-01") === 100);
  check("journal : courbeElo refuse moins de 2 points", courbeElo({ dates: ["2026-10-01"], valeurs: [1] }) === null && courbeParIndice([1400]) === null);
  const ind = courbeParIndice([1400, 1410, 1405])!;
  check("journal : sans les jours, les points sont à égale distance (0, 50, 100 %) et aucun jour ne se place", ind.chemin.startsWith("M0.00,") && ind.chemin.includes("L50.00,") && ind.fin.x === 100 && ind.xDuJour("2026-10-01") === null);
  const evts = evenementsPosables(j, 3);
  check("journal : les 3 derniers événements, du plus ancien au plus récent", evts.map((e) => e.cle).join(",") === "r1,c1,v1");
  const pins = epingles(c, evts);
  check("journal : une pastille par événement, numérotée 1, 2, 3, posée sur la courbe", pins.map((p) => p.n).join("") === "123" && pins.every((p) => Math.abs(p.y - c.yEn(p.x)) < 0.01 && p.x >= 4 && p.x <= 96));
  // deux événements le même jour : jamais l'un sur l'autre
  const memeJour = epingles(c, [
    { type: "palier", cle: "a", jour: "2026-10-15", palier: 3 },
    { type: "victoire", cle: "b", jour: "2026-10-15", adversaire: null, score: null, delta: 12 },
    { type: "serie", cle: "c", jour: "2026-10-15", jours: 30 },
  ]);
  check("journal : trois événements le même jour → pastilles écartées d'au moins 8 %", memeJour[1].x - memeJour[0].x >= ECART_PINS - 0.01 && memeJour[2].x - memeJour[1].x >= ECART_PINS - 0.01, memeJour.map((p) => p.x.toFixed(1)).join(" "));
  // au bord droit : tout reste dans la boîte
  const aujourdhui = epingles(c, [
    { type: "palier", cle: "a", jour: "2026-10-18", palier: 3 },
    { type: "victoire", cle: "b", jour: "2026-10-18", adversaire: null, score: null, delta: 12 },
    { type: "serie", cle: "c", jour: "2026-10-18", jours: 30 },
  ]);
  check("journal : trois événements aujourd'hui → rangés avant le bord droit (≤ 96 %), écartés de 8 %", aujourdhui.every((p) => p.x <= 96.01) && aujourdhui[2].x - aujourdhui[1].x >= ECART_PINS - 0.01 && aujourdhui[1].x - aujourdhui[0].x >= ECART_PINS - 0.01, aujourdhui.map((p) => p.x.toFixed(1)).join(" "));
  // rendu serveur identique au client : pas d'horloge, deux rendus égaux
  check("journal : deux rendus identiques (pas d'horloge ni de hasard)", r("journal", AUTRE, "heros") === r("journal", AUTRE, "heros"));
}

// ── Progression ──
{
  const lui = pointsSeances(AUTRE.progression);
  const m = moyenne5(lui)!;
  check("progression : la moyenne des 5 dernières séances est 80 %", m === 80);
  const tuile = r("progression", AUTRE, "tuile");
  check("progression, mini-tuile : « Séances », « moyenne des 5 dernières », « 80 % » en grand", tuile.includes(">Séances<") && tuile.includes("moyenne des 5 dernières") && tuile.includes(`80${NBSP}%`));
  check("progression, mini-tuile : la courbe d'encre (aire, tracé, ligne de seuil, repère 70 %, dernier point), sans barres", tuile.includes('class="aire"') && tuile.includes('class="trait"') && tuile.includes('class="seuil"') && tuile.includes(`70${NBSP}%`) && tuile.includes('class="fin"') && !tuile.includes("barres"));
  check("progression, mini-tuile : sans les dates aux bouts ; colonne et héros avec", !tuile.includes("<figcaption") && r("progression", AUTRE, "colonne").includes("<figcaption") && r("progression", AUTRE, "heros").includes("<figcaption"));
  const colonne = r("progression", AUTRE, "colonne");
  const meilleure = Math.max(...lui.map((p) => p.pct));
  check("progression, colonne : trois repères sous la courbe (14 séances, meilleure, dernière)", colonne.includes("<dl") && texte(colonne).includes(`séances 14`) && texte(colonne).includes(`meilleure ${meilleure} %`) && texte(colonne).includes(`dernière ${lui[lui.length - 1].pct} %`) && !r("progression", AUTRE, "tuile").includes("<dl") && !r("progression", AUTRE, "heros").includes("<dl"));
  const heros = r("progression", AUTRE, "heros");
  check("progression, héros : la courbe d'encre, 20 séances au plus", heros.includes('class="trait"') && !heros.includes("barres"));
  // le nombre de points de la courbe
  const pointsDe = (html: string) => (html.match(/d="([^"]+)" class="trait"/)?.[1].match(/[ML]/g) ?? []).length;
  check("progression : la courbe montre les dernières séances (12 / 14 / 14 / 20)", pointsDe(tuile) === Math.min(NOMBRE.tuile, lui.length) && pointsDe(colonne) === Math.min(NOMBRE.colonne, lui.length) && pointsDe(heros) === Math.min(NOMBRE.heros, lui.length), [pointsDe(tuile), pointsDe(colonne), pointsDe(heros)].join(","));
  // les barres : bande et demi-bande
  const dernieres = (n: number) => lui.slice(-n);
  for (const f of ["bande", "demi"] as const) {
    const html = r("progression", AUTRE, f);
    const vues = dernieres(NOMBRE[f]);
    const ok = vues.filter((p) => sens(p.pct) === "ok").length;
    const ko2 = vues.filter((p) => sens(p.pct) === "ko").length;
    check(`progression, ${f} : une barre par séance (${vues.length}), vertes ≥ ${BON} %, rouges < ${FAIBLE} %, à l'encre sinon`, compte(html, '<i class="ok"') === ok && compte(html, '<i class="ko"') === ko2 && compte(html, '<i class="mid"') === vues.length - ok - ko2 && ok + ko2 < vues.length, `${ok} vertes, ${ko2} rouges`);
    check(`progression, ${f} : la hauteur de chaque barre est son score, la ligne du seuil à ${SEUIL} %, aucune courbe`, vues.every((p) => html.includes(`--h:${p.pct}%`)) && html.includes(`bottom:${SEUIL}%`) && html.includes("ligneSeuil") && !html.includes('class="trait"'));
    check(`progression, ${f} : l'infobulle de chaque barre « 12 oct. · 82 % »`, /title="\d+ [a-zéû.]+ · \d+ %"/.test(html));
  }
  const bande = r("progression", AUTRE, "bande");
  check("progression, bande : « Séances · 14 dernières », « 80 % », « moyenne des 5 dernières », la légende du seuil", texte(bande).includes("Séances · 14 dernières") && bande.includes(`80${NBSP}%`) && bande.includes("moyenne des 5 dernières") && bande.includes(`seuil 70${NBSP}%`));
  const demi = r("progression", AUTRE, "demi");
  check("progression, demi-bande : la cellule « Séances » / 80 % / « 14 séances », puis les barres", demi.includes("Séances") && demi.includes(`80${NBSP}%`) && demi.includes("14 séances") && demi.includes("barresDemi"));
  // chez soi : la même (plus de PracticeProgressChart)
  check("progression, chez soi : plus de menu des matières ni de courbe du site", ["heros", "bande"].every((f) => !r("progression", MOI, f as Format).includes("Toutes les matières")));
  // le cas limite : un seul point, des séances sans total
  const g1 = geoCourbe([80]);
  check("progression : une seule séance → un point au milieu, sans plantage", g1.fin.x === 50 && Number.isFinite(g1.fin.y));
  const g = geoCourbe([60, 90, 75]);
  check("progression : la courbe va de 0 % à 100 % et le seuil de 70 % reste dans la plage", g.chemin.startsWith("M0.00,") && g.fin.x === 100 && g.ySeuil > 10 && g.ySeuil < 90);
  check("progression : le sens d'une barre (75 vert, 74 encre, 60 encre, 59 rouge)", sens(75) === "ok" && sens(74) === "mid" && sens(60) === "mid" && sens(59) === "ko");
  // vide
  check("progression : moins de 2 séances → rien, l'état vide dans Personnaliser", r("progression", { ...RICHE_TOI, progression: AUTRE.progression!.slice(0, 1) }, "tuile") === "" && r("progression", { ...MOI, progression: null }, "heros", true).includes("rien à montrer"));
  check("progression, Personnaliser : l'état vide à tous les formats", TOUS.every((f) => r("progression", { ...MOI, progression: null }, f, true).length > 0));
}

// ── Carnet de jours ──
{
  const c = AUTRE.carnet!;
  const cases = casesCarnet(c.jours, c.aujourdhui);
  check("carnet : 364 cases, du lundi d'il y a 51 semaines au dimanche", cases.length === 364 && new Date(debutCarnet(c.aujourdhui) + "T12:00:00Z").getUTCDay() === 1 && cases[0].jour === debutCarnet(c.aujourdhui) && cases[363].jour >= c.aujourdhui);
  check("carnet : les jours à venir sont marqués, rien avant aujourd'hui", cases.filter((x) => x.avenir).every((x) => x.jour > c.aujourdhui) && cases.filter((x) => !x.avenir).every((x) => x.jour <= c.aujourdhui));
  check("carnet : cinq niveaux d'encre (0 vide ; 1–9 ; 10–19 ; 20–39 ; 40 et plus)", [0, 1, 9, 10, 19, 20, 39, 40, 200].map(niveau).join("") === "011223344");
  const seuil = c.seuil ?? 1;
  const an = joursDEncre(cases, seuil);
  const six = recentes(cases, SEMAINES_TUILE);
  check("carnet : les cases récentes sont des semaines entières (182 et 126)", six.length === 182 && recentes(cases, SEMAINES_TELEPHONE).length === 126 && six[0].jour === cases[182].jour);
  const ligne = `série ${V.j(c.serie)} · record ${V.j(c.record)}`;

  // mini-tuile
  const tuile = r("carnet", AUTRE, "tuile");
  check("carnet, mini-tuile : « Carnet de jours », les jours d'encre en grand (ceux des 52 semaines, comme le Journal), « jours d'encre »", tuile.includes(">Carnet de jours<") && tuile.includes(`>${nombre(an)}<`) && texte(tuile).includes("jours d'encre") && tuile.includes('title="sur 52 semaines"'));
  check("carnet, mini-tuile : « série 12 j · record 31 j » dessous", texte(tuile).includes(ligne), texte(tuile).slice(-80));
  check("carnet, mini-tuile : 182 cases (26 semaines), aujourd'hui cerclé une seule fois, les à-venir marqués", compte(tuile, "<i data-n") === 182 - compte(tuile, "<i data-f") && compte(tuile, "data-auj") === 1);
  check("carnet, mini-tuile : les cinq niveaux d'encre paraissent (0 à 4)", [0, 1, 2, 3, 4].every((n) => tuile.includes(`data-n="${n}"`)));
  check("carnet : l'infobulle d'un jour « 3 oct. · 42 traits » (même texte chez soi et chez un autre)", /title="\d+ [a-zéû.]+ · \d+ traits"/.test(tuile) && /title="\d+ [a-zéû.]+ · \d+ traits"/.test(r("carnet", MOI, "tuile")));
  check("carnet, mini-tuile : ni légende ni ruban ni jeton", !tuile.includes("moins") && !tuile.includes("ruban") && parle(tuile).length === 0);

  // colonne : le calendrier vertical
  const colonne = r("carnet", AUTRE, "colonne");
  check("carnet, colonne : le calendrier à la verticale (182 cases, initiales L M M J V S D), les jours d'encre, « Série » et « Record » en rangées", colonne.includes('class="vertical"') && compte(colonne, "<i data-") === 182 + 4 && V.initialesJours.every((l) => colonne.includes(`<span>${l}</span>`)) && texte(colonne).includes("jours d'encre sur 52 semaines") && texte(colonne).includes("Série 12 j") && texte(colonne).includes("Record 31 j") && colonne.includes(`>${nombre(an)}<`));
  check("carnet, colonne : la légende « moins … plus » et cinq niveaux", colonne.includes("moins") && colonne.includes("plus") && compte(colonne, 'class="echelle"') === 1);

  // héros et bande : 52 semaines
  for (const f of ["heros", "bande"] as const) {
    const html = r("carnet", AUTRE, f);
    check(`carnet, ${f} : 364 cases (52 semaines), jours d'encre ${an}, « jours d'encre sur 52 semaines », série et record`, compte(html, "<i data-") === 364 + 4 && html.includes(`>${nombre(an)}<`) && texte(html).includes("jours d'encre sur 52 semaines") && texte(html).includes("Série 12 j") && texte(html).includes("Record 31 j"), `${compte(html, "<i data-")}`);
    check(`carnet, ${f} : la légende des niveaux, la grille de l'année`, html.includes("moins") && html.includes("plus") && html.includes("annee"));
  }
  check("carnet, bande : la grille en pleine largeur, le résumé à côté (bandeV)", r("carnet", AUTRE, "bande").includes("bandeV") && r("carnet", AUTRE, "heros").includes("herosV"));

  // demi-bande
  const demi = r("carnet", AUTRE, "demi");
  check("carnet, demi-bande : « Jours d'encre » / 219 j / « sur 52 sem. », « Série » / 12 j / « record 31 j », puis la grille", demi.includes("Jours d&#x27;encre") && demi.includes("sur 52 sem.") && demi.includes(">Série<") && demi.includes("record 31 j") && demi.includes("annee") && compte(demi, "<i data-") >= 364);
  check("carnet, demi-bande : le chiffre des 52 semaines", demi.includes(V.j(an)));

  // Journal fermé : la série et le record, déjà publics
  const ferme: DonneesBlocs = { ...RICHE_TOI, carnet: null };
  for (const f of FORMATS_PERMIS.carnet) {
    const html = r("carnet", ferme, f);
    check(`carnet ${f}, Journal fermé : « Série 12 j », « Record 31 j », « Carnet privé », ni grille ni légende`, texte(html).includes("12 j") && texte(html).includes("31 j") && html.includes("Carnet privé") && !html.includes("grille") && !html.includes("<i data-") && parle(html).length === 0);
  }
  check("carnet fermé, chez soi : pas de « Carnet privé » (c'est le sien), « Visible par » dans Personnaliser", !r("carnet", { ...MOI, carnet: null }, "tuile").includes("Carnet privé") && r("carnet", { ...MOI, carnet: null }, "tuile", true).includes("Visible par") && r("carnet", { ...MOI, carnet: null }, "demi", true).includes("Visible par"));

  // chez soi
  check("carnet, Personnaliser : « Visible par » à chaque format", FORMATS_PERMIS.carnet.every((f) => r("carnet", MOI, f, true).includes("Visible par") && !r("carnet", MOI, f).includes("Visible par")));
  check("carnet, chez soi : la lecture à voix haute dit « Ton carnet de jours »", r("carnet", MOI, "tuile").includes('aria-label="Ton carnet de jours"') && r("carnet", AUTRE, "tuile").includes('aria-label="Le carnet de jours de Sforzinda"'));
  // aperçu
  const ap = r("carnet", { ...RICHE_TOI, toi: undefined, apercu: true }, "demi");
  check("carnet, aperçu avec un carnet lu : le même dessin, sans « toi »", ap.includes("annee") && parle(ap).length === 0 && !texte(ap).includes("toi "));
  check("carnet, aperçu sans carnet lu : la série et le record", texte(r("carnet", APERCU, "tuile")).includes("Record") && r("carnet", APERCU, "tuile").includes("Carnet privé"));
  // visiteur non connecté
  check("carnet, visiteur non connecté : le même dessin", r("carnet", { ...RICHE_TOI, toi: null }, "heros") === r("carnet", RICHE_TOI, "heros"));
  // vide
  const rien: DonneesBlocs = { ...SOBRE, stats: { ...SOBRE.stats, meilleureSerie: 0 }, carnet: null };
  check("carnet : rien à montrer → rien en vue publique, l'état vide dans Personnaliser", r("carnet", rien, "demi") === "" && r("carnet", { ...rien, moi: true }, "tuile", true).includes("rien à montrer"));
  // le téléphone : les 18 semaines se masquent par le CSS, la grille garde ses 364 cases
  check("carnet : la grille de l'année garde ses 364 cases (le téléphone en masque 238 par le CSS)", compte(r("carnet", AUTRE, "bande"), "<i data-") >= 364);
}

// ── Médias et carte ──
{
  const image: BlocMedia = { k: "media", id: "i1", type: "image", url: "/illustrations/reviser-pupitre.webp", ratio: 16 / 10, legende: "Mon coin de révision.", y: 88, f: "demi" };
  const video: BlocMedia = { k: "media", id: "v1", type: "video", url: "/intro/encre-port.mp4", ratio: 1080 / 1920, legende: "Mon edit.", duree: 12, couverture: 4, f: "heros" };
  const gif: BlocMedia = { k: "media", id: "g1", type: "image", url: GIF_EXEMPLE, ratio: 1, legende: "Quand le sceau tombe.", source: "klipy", px: 240, f: "tuile" };
  for (const [g, m] of [
    ["image", image],
    ["gif", gif],
    ["video", video],
  ] as [keyof typeof FORMATS_PERMIS, BlocMedia][]) {
    const vus = FORMATS_PERMIS[g].map((f) => rend(<MediaBloc m={{ ...m, f }} f={f} />));
    check(`média ${g} : rendu à chaque format permis (${FORMATS_PERMIS[g].join(", ")})`, vus.every((h) => h.includes("<figure")));
  }
  const banniere = rend(<MediaBloc m={image} f="demi" />);
  check("image en demi-bande : une bannière (cover, point focal --y), la légende en infobulle et en aria-label, sans figcaption", banniere.includes("banniere") && banniere.includes('title="Mon coin de révision."') && banniere.includes('aria-label="Mon coin de révision."') && banniere.includes("--y:88%") && banniere.includes("50% 88%") && !banniere.includes("<figcaption"));
  check("image en mini-tuile : la légende reste dessous", rend(<MediaBloc m={image} f="tuile" />).includes("<figcaption"));
  const vh = rend(<MediaBloc m={video} f="heros" />);
  check("vidéo en héros : plus de surtitre « Vidéo · en boucle, sans le son », la légende seule, à côté", !vh.includes("en boucle") && vh.includes("Mon edit.") && vh.includes("videoCote") && vh.includes("#t=4"));
  check("vidéo : sans boutons", !vh.includes("<button"));
  check("vidéo en héros sans légende : pas de légende vide", !rend(<MediaBloc m={{ ...video, legende: null }} f="heros" />).includes("<figcaption"));
  for (const f of ["tuile", "colonne", "heros", "bande", "demi"] as Format[]) {
    check(`image en haut (${f}) : rendue, image et vidéo`, rend(<ImageEnHaut img={{ id: "h", type: "image", url: "/a.webp", ratio: 2 }} f={f} />).includes("imageHaut") && rend(<ImageEnHaut img={{ id: "h", type: "video", url: "/a.mp4", ratio: 0.5, couverture: 2 }} f={f} />).includes("#t=2"));
  }
  check("module avec image en haut, en demi-bande : le module seul (refusée)", !rend(<AvecImage img={{ id: "h", type: "image", url: "/a.webp", ratio: 2 }} f="demi"><section>m</section></AvecImage>).includes("imageHaut"));
  check("module avec image en haut, en héros : l'image puis le module", rend(<AvecImage img={{ id: "h", type: "image", url: "/a.webp", ratio: 2 }} f="heros"><section>m</section></AvecImage>).includes("imageHaut"));

  const long = "Objectif : passer le niveau I en mai. Deux heures par jour, le week-end des examens blancs, et un duel chaque soir pour garder le rythme.";
  const carte: BlocCarte = { k: "carte", id: "c1", titre: "Mai 2027", texte: long, img: { id: "ci", type: "image", url: "/b.webp", ratio: 1.5, y: 30 }, f: "demi" };
  for (const f of FORMATS_PERMIS.carte) check(`carte : rendue en ${f}`, rend(<CarteBloc c={{ ...carte, f }} f={f} edition={false} />).includes("Mai 2027"));
  const cd = rend(<CarteBloc c={carte} f="demi" edition={false} />);
  check("carte en demi-bande : la vignette carrée, le titre, le texte sur une ligne (en entier en infobulle)", cd.includes("vignette") && cd.includes("titreDemi") && cd.includes("truncate") && cd.includes(`title="${long}"`) && !cd.includes("imageHaut"));
  check("carte en demi-bande, vidéo en haut : pas de vignette", !rend(<CarteBloc c={{ ...carte, img: { id: "cv", type: "video", url: "/v.mp4", ratio: 0.5 } }} f="demi" edition={false} />).includes("vignette"));
  check("carte en colonne : l'image en haut, comme avant", rend(<CarteBloc c={{ ...carte, f: "colonne" }} f="colonne" edition={false} />).includes("imageHaut"));
  const vide: BlocCarte = { k: "carte", id: "c2", titre: "", texte: null, f: "demi" };
  check("carte vide : rien en vue publique, son invitation dans Personnaliser (demi-bande comprise)", rend(<CarteBloc c={vide} f="demi" edition={false} />) === "" && rend(<CarteBloc c={vide} f="demi" edition />).includes("Ta carte est vide"));
}

// ── La voix : jamais « il » ni « elle » pour le joueur ──
{
  const textes: string[] = [];
  for (const v of Object.values(V)) {
    if (typeof v === "string") textes.push(v);
    else if (Array.isArray(v)) textes.push(...v);
    else if (typeof v === "function") textes.push(String((v as (...a: unknown[]) => unknown)(3, "Inès", 4, 5, 6)), String((v as (...a: unknown[]) => unknown)("Inès", "12 sept.")));
  }
  check("voix : ni « il » ni « elle »", textes.every((x) => !/\b(il|elle)\b/i.test(x)), textes.filter((x) => /\b(il|elle)\b/i.test(x)).join(" | "));
}

console.log(ko ? `\n${ko} échec(s)` : "\nTout est vert.");
process.exit(ko ? 1 : 0);
