// Tests des blocs Journal, Progression, Carnet de jours, des médias et de la
// carte de la page de profil (components/profil/blocs/Journal.tsx,
// Progression.tsx, Carnet.tsx, Medias.tsx), sans base ni réseau ni
// navigateur (rendu statique par react-dom/server).
//   npx tsx scripts/profil/test-blocs-journal.tsx
// Chaque bloc à chaque format permis (FORMATS_PERMIS), dans les trois vues :
// chez un autre avec écarts (RICHE_TOI), l'aperçu « voir comme les autres »
// ({ ...RICHE, apercu: true }), chez soi ({ ...RICHE_TOI, moi: true, toi:
// null }) ; puis les textes clés de la spécification : jetons, score, ce qui
// est retiré, l'état vide, les seuils.
import "./sans-css";
import "./react-global";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JournalBloc, croisements, evenementsPour, serieElo } from "@/components/profil/blocs/Journal";
import { ProgressionBloc, moyenne5, pointsSeances } from "@/components/profil/blocs/Progression";
import { CarnetBloc, casesCarnet, debutCarnet, joursDEncre, scoreSemaines, semainesCarnet } from "@/components/profil/blocs/Carnet";
import { AvecImage, CarteBloc, ImageEnHaut, MediaBloc } from "@/components/profil/blocs/Medias";
import { FORMATS_PERMIS, type BlocCarte, type BlocMedia, type Format } from "@/lib/profil/disposition";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import { ecart, questionsSur7 } from "@/lib/profil/ecart";
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
/** le texte à l'écran, sans balises (les entités de base décodées) */
const texte = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');

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

// ── Tous les formats permis, dans les trois vues ──
for (const k of Object.keys(blocs) as (keyof typeof blocs)[]) {
  for (const [nom, d] of VUES) {
    const rates: string[] = [];
    for (const f of FORMATS_PERMIS[k]) {
      try {
        const html = r(k, d, f);
        // l'aperçu de RICHE n'a pas de carnet lu : le bloc garde la série et le record (Journal « fermé »)
        if (!html.includes("<section")) rates.push(f);
      } catch (e) {
        rates.push(`${f} (${(e as Error).message})`);
      }
    }
    check(`${k} : rendu à chaque format permis (${FORMATS_PERMIS[k].join(", ")}), ${nom}`, rates.length === 0 || (k === "progression" && nom === "chez soi" && rates.every((x) => x === "heros" || x === "bande")), rates.join(" ; "));
  }
}

// ── Journal ──
{
  const j = AUTRE.journal!;
  const gainLui = j.points[j.points.length - 1] - j.depart; // +126
  const ce = TOI_EXEMPLE.courbeElo!;
  const gainToi = ce.points[ce.points.length - 1] - ce.depart; // +22
  const e = ecart(gainLui, gainToi, "elo")!;
  const tuile = r("journal", AUTRE, "tuile");
  check("journal, chez un autre : le chiffre fort est son ELO gagné (+126)", texte(tuile).includes(`+${gainLui}`));
  check(`journal, chez un autre : le jeton « ${e.long} »`, tuile.includes(e.long) && e.long === "toi −104");
  check("journal : l'infobulle du jeton", tuile.includes(`ELO gagné en 90 jours · Sforzinda +${gainLui} · toi +${gainToi}`));
  check("journal, chez un autre : le repère « +NN ELO · 90 j » est retiré", !tuile.includes("ELO · 90 j"));
  check("journal, chez un autre : le double trait, sans légende (infobulle « Épais : … · fin : toi »)", tuile.includes("Épais : Sforzinda · fin : toi") && !tuile.includes("(épais)"));
  check("journal, mini-tuile chez un autre : 1 événement", compte(tuile, "<li") === 1);
  check("journal, colonne chez un autre : 4 événements et le lien", compte(r("journal", AUTRE, "colonne"), "<li") === 4 && r("journal", AUTRE, "colonne").includes("Tout le journal"));
  const heros = r("journal", AUTRE, "heros");
  check("journal, héros chez un autre : 3 événements et le lien", compte(heros, "<li") === 3 && heros.includes("Tout le journal"));
  check("journal, héros : jeton à 16 px", heros.includes("font-size:16px"));
  const demi = r("journal", AUTRE, "demi");
  check("journal, demi-bande chez un autre : « ELO · 90 j », le jeton, le lien « Tout le journal › », pas d'événement", demi.includes("ELO · 90 j") && demi.includes("toi −104") && demi.includes("Tout le journal ›") && !demi.includes("<li"));
  check("journal, demi-bande : la courbe de 80 px, sans les dates aux bouts", demi.includes("height:80px") && !demi.includes("<figcaption"));
  const moi = r("journal", MOI, "tuile");
  check("journal, chez soi : l'existant (repère « +126 ELO · 90 j », 3 événements, lien)", moi.includes(`+${gainLui} ELO · 90 j`) && compte(moi, "<li") === 3 && moi.includes("Tout le journal"));
  check("journal, chez soi : ni jeton ni « toi »", !moi.includes("toi −") && !moi.includes("toi +") && !moi.includes("Épais"));
  const moiDemi = r("journal", MOI, "demi");
  check("journal, demi-bande chez soi : « ELO · 90 j » / +126 / « 12 matchs », la courbe, le lien", moiDemi.includes("ELO · 90 j") && moiDemi.includes("12 matchs") && moiDemi.includes("Tout le journal ›") && moiDemi.includes("<svg"));
  check("journal, Personnaliser : « Visible par » (aussi en demi-bande)", r("journal", MOI, "tuile", true).includes("Visible par") && r("journal", MOI, "demi", true).includes("Visible par"));
  const ap = r("journal", APERCU, "tuile");
  check("journal, aperçu : « toi ± », sans chiffre d'écart", ap.includes("toi ±") && ap.includes("Ici, l&#x27;écart avec la personne qui regarde") && !ap.includes("toi −"));
  // le visiteur non connecté : vue d'un autre, sans jeton
  const anonyme = r("journal", { ...RICHE_TOI, toi: null }, "tuile");
  check("journal, visiteur non connecté : ni jeton ni « pas encore mesuré »", !anonyme.includes("toi −") && !anonyme.includes("toi ±") && !anonyme.includes("pas encore mesuré"));
  // ta courbe absente : pas de jeton, l'infobulle le dit
  const sansCourbe = r("journal", { ...RICHE_TOI, toi: { ...TOI_EXEMPLE, courbeElo: null } }, "tuile");
  check("journal, ta courbe non lue : pas de jeton, « toi : pas encore mesuré »", !sansCourbe.includes("toi −") && sansCourbe.includes("toi : pas encore mesuré"));
  // l'état vide
  check("journal fermé ou non lu : rien en vue publique, l'état vide dans Personnaliser", r("journal", { ...RICHE_TOI, journal: null }, "tuile") === "" && r("journal", { ...MOI, journal: null }, "tuile", true).includes("rien à montrer"));
  check("journal fermé, demi-bande dans Personnaliser : l'état vide en demi-bande", r("journal", { ...MOI, journal: null }, "demi", true).includes("rien pour l&#x27;instant"));

  // les événements qui te concernent passent en tête
  const evts = [...j.evenements.slice(0, 3), { type: "victoire" as const, cle: "v9", jour: "2026-09-01", adversaire: { id: "moi", nom: "Toi" }, score: [9, 7] as [number, number], delta: 14 }];
  const avecToi: DonneesBlocs = { ...RICHE_TOI, journal: { ...j, evenements: evts } };
  check("journal : l'événement qui te concerne passe en tête", evenementsPour(avecToi, 1)[0].cle === "v9" && r("journal", avecToi, "tuile").includes("Victoire contre toi"));
  check("journal, chez soi : l'ordre gardé", evenementsPour({ ...avecToi, moi: true }, 1)[0].cle === "v1");

  // l'axe commun : départ 90 jours avant aujourd'hui, l'ELO tenu jusqu'à aujourd'hui
  const sl = serieElo(j, "2026-10-18")!;
  check("journal : la courbe va du 20 juil. (90 j avant) à aujourd'hui", sl.dates[0] === "2026-07-20" && sl.dates[sl.dates.length - 1] === "2026-10-18" && sl.valeurs[sl.valeurs.length - 1] === 1478);
  check("journal : sans les jours (données d'avant), pas d'axe commun", serieElo({ depart: 1, points: [2] }, "2026-10-18") === null);

  // les croisements : un point, et qui a dépassé qui
  const devant: DonneesBlocs = { ...RICHE_TOI, toi: { ...TOI_EXEMPLE, courbeElo: { depart: 1420, points: [1430, 1425], dates: ["2026-08-01", "2026-09-20"] } } };
  const h1 = r("journal", devant, "heros");
  check("journal : Sforzinda passe devant toi → « Sforzinda t'a dépassé le … »", h1.includes("Sforzinda t&#x27;a dépassé le") && h1.includes("croix"));
  const derriere: DonneesBlocs = { ...RICHE_TOI, toi: { ...TOI_EXEMPLE, courbeElo: { depart: 1300, points: [1310, 1500], dates: ["2026-10-09", "2026-10-10"] } } };
  const h2 = r("journal", derriere, "heros");
  check("journal : tu passes devant → « Tu as dépassé Sforzinda le 10 oct. »", h2.includes("Tu as dépassé Sforzinda le 10 oct."));
  check("journal : la courbe d'exemple (toujours derrière) : aucun croisement", !r("journal", AUTRE, "heros").includes("dépassé"));
  const cx = croisements({ dates: ["2026-01-01", "2026-01-11"], valeurs: [0, 10] }, { dates: ["2026-01-01", "2026-01-11"], valeurs: [10, 0] }, 100);
  check("journal : un croisement au milieu des deux droites", cx.length === 1 && Math.abs(cx[0].x - 300) < 40 && cx[0].sens === "lui");
}

// ── Progression ──
{
  const lui = pointsSeances(AUTRE.progression);
  const toi = pointsSeances(TOI_EXEMPLE.seances);
  const mL = moyenne5(lui)!;
  const mT = moyenne5(toi)!;
  check("progression : moyennes des 5 dernières (80 % et 52 %)", mL === 80 && mT === 52);
  const e = ecart(mL, mT, "pct")!;
  const tuile = r("progression", AUTRE, "tuile");
  check("progression, chez un autre : étiquette « Séances », chiffre « 80 % »", tuile.includes(">Séances<") && tuile.includes(`80${NBSP}%`));
  check(`progression, chez un autre : le jeton « ${e.long} »`, tuile.includes("toi −28"));
  check("progression : l'infobulle « 5 dernières séances · Sforzinda 80 % · toi 52 % »", tuile.includes(`5 dernières séances · Sforzinda 80${NBSP}% · toi 52${NBSP}%`));
  check("progression : le double trait (la tienne fine) et le seuil de 70 % en pointillé", tuile.includes("Épais : Sforzinda · fin : toi") && tuile.includes('stroke-dasharray="4 4"'));
  const retires = ["Toutes les matières", "sessions ·", ">Progression<", "seuil 70", "moyenne"];
  for (const f of FORMATS_PERMIS.progression) {
    const html = r("progression", AUTRE, f);
    check(`progression ${f}, chez un autre : titre, ligne de sessions, menu, légende, moyenne retirés`, retires.every((x) => !html.includes(x)), retires.filter((x) => html.includes(x)).join(", "));
  }
  check("progression : les points en héros et en bande seulement", r("progression", AUTRE, "heros").includes("<circle") && r("progression", AUTRE, "bande").includes("<circle") && !r("progression", AUTRE, "tuile").includes("<circle") && !r("progression", AUTRE, "demi").includes("<circle"));
  check("progression : courbes de 48 / 160 / 160 / 140 / 80 px", (["tuile", "colonne", "heros", "bande", "demi"] as Format[]).every((f, i) => r("progression", AUTRE, f).includes(`height:${[48, 160, 160, 140, 80][i]}px`)));
  check("progression, bande : le jeton à 16 px, sur la ligne du chiffre", r("progression", AUTRE, "bande").includes("font-size:16px") && r("progression", AUTRE, "bande").includes("items-baseline"));
  const demi = r("progression", AUTRE, "demi");
  check("progression, demi-bande : une cellule « Séances » / 80 % / « toi −28 », puis la courbe", demi.includes("Séances") && demi.includes("toi −28") && demi.includes("<svg"));
  // chez soi
  check("progression, chez soi en héros et en bande : PracticeProgressChart tel quel", r("progression", MOI, "heros").includes("Toutes les matières") && r("progression", MOI, "bande").includes(">Progression<"));
  const moiTuile = r("progression", MOI, "tuile");
  check("progression, chez soi en mini-tuile : 80 %, « 14 séances », la courbe seule, sans « toi »", moiTuile.includes(`80${NBSP}%`) && moiTuile.includes("14 séances") && !moiTuile.includes("toi") && !moiTuile.includes("Épais"));
  check("progression, chez soi en colonne et en demi-bande : le rendu compact", r("progression", MOI, "colonne").includes("14 séances") && r("progression", MOI, "demi").includes("14 séances"));
  // aperçu, seuils, vide
  check("progression, aperçu : « toi ± »", r("progression", APERCU, "tuile").includes("toi ±") && !r("progression", APERCU, "tuile").includes("toi −"));
  const deux: DonneesBlocs = { ...RICHE_TOI, toi: { ...TOI_EXEMPLE, seances: TOI_EXEMPLE.seances!.slice(0, 2) } };
  const h2 = r("progression", deux, "tuile");
  check("progression : 2 séances de ton côté → pas de jeton (« pas encore mesuré »), mais ta courbe", !h2.includes("toi −") && h2.includes("toi : pas encore mesuré") && h2.includes("Épais : Sforzinda · fin : toi"));
  const une: DonneesBlocs = { ...RICHE_TOI, toi: { ...TOI_EXEMPLE, seances: TOI_EXEMPLE.seances!.slice(0, 1) } };
  check("progression : 1 séance de ton côté → ni jeton ni ta courbe", !r("progression", une, "tuile").includes("Épais"));
  check("progression : moins de 2 séances chez lui → rien, l'état vide dans Personnaliser", r("progression", { ...RICHE_TOI, progression: AUTRE.progression!.slice(0, 1) }, "tuile") === "" && r("progression", { ...MOI, progression: null }, "heros", true).includes("rien à montrer"));
}

// ── Carnet de jours ──
{
  const c = AUTRE.carnet!;
  const t = TOI_EXEMPLE;
  const cases = casesCarnet(c.jours, t.jours, c.aujourdhui);
  check("carnet : 364 cases, du lundi d'il y a 51 semaines au dimanche", cases.length === 364 && new Date(debutCarnet(c.aujourdhui) + "T12:00:00Z").getUTCDay() === 1 && cases[0].jour === debutCarnet(c.aujourdhui) && cases[363].jour >= c.aujourdhui);
  const seuil = c.seuil ?? 1;
  const eL = joursDEncre(cases, seuil, "lui");
  const eT = joursDEncre(cases, seuil, "toi");
  const sem = semainesCarnet(cases);
  const sc = scoreSemaines(sem);
  check("carnet : 52 semaines ; le score compte chaque semaine non vide", sem.length === 52 && sc.toi + sc.lui + sc.egal <= 52 && sc.toi + sc.lui > 0);
  const eEncre = ecart(eL, eT, "jours")!;
  const eSerie = ecart(c.serie, t.stats.serie, "jours")!;
  const s7L = questionsSur7(c.jours, c.aujourdhui);
  const s7T = questionsSur7(t.jours, t.aujourdhui);
  const eSept = ecart(s7L, s7T, "compte")!;
  for (const f of FORMATS_PERMIS.carnet) {
    const html = r("carnet", AUTRE, f);
    check(
      `carnet ${f}, chez un autre : jours d'encre (${eL} j, ${eEncre.long}), score « toi ${sc.toi} – ${sc.lui} »`,
      html.includes(`${nombre(eL)} j`) && html.includes(eEncre.long) && html.includes(`toi ${sc.toi} – ${sc.lui}`) && html.includes(`Semaines où tu as fait plus de questions : ${sc.toi} · Sforzinda : ${sc.lui} · égalité : ${sc.egal}`),
    );
    check(`carnet ${f}, chez un autre : le ruban (52 semaines, « Sem. du … »)`, compte(html, "Sem. du ") === 52);
  }
  const tuile = r("carnet", AUTRE, "tuile");
  check("carnet, mini-tuile : la ligne « Série 12 j » et son jeton court", tuile.includes(">Série<") && tuile.includes(">12 j<") && tuile.includes(`>${eSerie.court}<`));
  // le 7 oct. 2026 est un mercredi
  check("carnet : l'infobulle d'un jour « mer. 7 oct. · Sforzinda … · toi … »", /mer\. 7 oct\. · Sforzinda \d+ · toi \d+/.test(tuile));
  check("carnet : l'infobulle d'une semaine « Sem. du … · Sforzinda … · toi … »", /Sem\. du \d+ [a-zéû.]+ · Sforzinda [\d ]+ · toi [\d ]+/.test(tuile));
  check("carnet : l'infobulle du jeton « Jours d'encre · Sforzinda … »", tuile.includes(`Jours d&#x27;encre · Sforzinda ${eL} j · toi ${eT} j`));
  const colonne = r("carnet", AUTRE, "colonne");
  check("carnet, colonne : « Série » et « 7 jours » en lignes courtes ; deux carnets verticaux coiffés « Sforzinda » et « toi »", colonne.includes(">7 jours<") && colonne.includes(`>${nombre(s7L)}<`) && colonne.includes(`>${eSept.court}<`) && compte(colonne, 'class="vertical"') === 2 && colonne.includes(">Sforzinda<") && colonne.includes(">toi<") && colonne.includes("rubanV"));
  check("carnet, colonne : ton carnet à ta couleur", colonne.includes("--encre:#3b6fd6"));
  check("carnet, héros : chiffres à droite (jeton 16 px), « Série », « 7 jours »", r("carnet", AUTRE, "heros").includes("font-size:16px") && r("carnet", AUTRE, "heros").includes(">7 jours<"));
  check("carnet, bande : « Série » et « 7 jours » au-dessus, la grille en pleine largeur", r("carnet", AUTRE, "bande").includes(">7 jours<") && r("carnet", AUTRE, "bande").includes("bande"));
  const demi = r("carnet", AUTRE, "demi");
  check("carnet, demi-bande : cellules « Carnet » et « Série » (jetons entiers, « toi … »), la grille, le score à droite", demi.includes(">Carnet<") && demi.includes(">Série<") && demi.includes(`>${eSerie.long}<`) && demi.includes("grille") && demi.indexOf("droite") < demi.lastIndexOf(`toi ${sc.toi} – ${sc.lui}`));
  // Journal fermé
  const ferme: DonneesBlocs = { ...RICHE_TOI, carnet: null };
  for (const f of FORMATS_PERMIS.carnet) {
    const html = r("carnet", ferme, f);
    check(`carnet ${f}, Journal fermé : « Série 12 j toi −7 j », « Record 31 j toi −12 j », « Carnet privé », ni grille ni ruban ni 7 jours`, html.includes("toi −7 j") && html.includes("toi −12 j") && html.includes("Carnet privé") && !html.includes("Sem. du") && !html.includes("grille") && !html.includes("7 jours") && !html.includes("toi " + sc.toi));
  }
  // chez soi
  for (const f of ["colonne", "heros", "bande"] as Format[]) {
    const html = r("carnet", MOI, f);
    check(`carnet ${f}, chez soi : le CarnetJours du Journal (série · record, jours d'encre, légende)`, html.includes("Carnet de jours") && html.includes("série 12 jours") && html.includes("record 31 jours") && html.includes("sur 52 semaines") && html.includes("moins") && !html.includes("toi "));
  }
  const moiTuile = r("carnet", MOI, "tuile");
  check("carnet, mini-tuile chez soi : la grille, « 212 j d'encre », « série 12 j · record 31 j », sans légende", moiTuile.includes("grille") && moiTuile.includes(" j d&#x27;encre") && moiTuile.includes("série 12 j · record 31 j") && !moiTuile.includes(">moins<"));
  const moiDemi = r("carnet", MOI, "demi");
  check("carnet, demi-bande chez soi : « Carnet » / … / « sur 52 sem. », « Série » / 12 j / « record 31 j », la grille sans ruban ni score", moiDemi.includes("sur 52 sem.") && moiDemi.includes("record 31 j") && moiDemi.includes("grille") && !moiDemi.includes("Sem. du") && !moiDemi.includes("toi "));
  check("carnet, Personnaliser : « Visible par »", r("carnet", MOI, "demi", true).includes("Visible par") && r("carnet", MOI, "heros", true).includes("Visible par"));
  check("carnet, chez soi : l'infobulle d'un jour, celle du Journal (« … traits »)", moiTuile.includes(" traits"));
  // aperçu
  const ap = r("carnet", { ...RICHE_TOI, toi: undefined, apercu: true }, "demi");
  check("carnet, aperçu : « toi ± » et « toi – – », ni ruban ni écart chiffré", ap.includes("toi ±") && ap.includes("toi – –") && !ap.includes("Sem. du") && !ap.includes("toi −"));
  check("carnet, aperçu sans carnet lu : la série et le record, « toi ± »", r("carnet", APERCU, "tuile").includes("toi ±") && r("carnet", APERCU, "tuile").includes("Record"));
  // visiteur non connecté
  const anonyme = r("carnet", { ...RICHE_TOI, toi: null }, "demi");
  check("carnet, visiteur non connecté : ni jeton, ni score, ni ruban", !anonyme.includes("toi ") && !anonyme.includes("Sem. du"));
  // vide
  const rien: DonneesBlocs = { ...SOBRE, stats: { ...SOBRE.stats, meilleureSerie: 0 }, carnet: null };
  check("carnet : rien à montrer → rien en vue publique, l'état vide dans Personnaliser", r("carnet", rien, "demi") === "" && r("carnet", { ...rien, moi: true }, "tuile", true).includes("rien à montrer"));
  // au téléphone : la grille garde ses 364 cases (le CSS masque les 34 premières semaines)
  check("carnet : 364 cases dans la grille (le téléphone en masque par le CSS)", compte(tuile, "<i") >= 364);
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
