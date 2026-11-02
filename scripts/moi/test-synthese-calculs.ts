// Tests purs de la page Moi « La synthèse » (lots 1 et 2), sans base, réseau ni navigateur :
//   npx tsx --tsconfig tsconfig.json scripts/moi/test-synthese-calculs.ts
// Le calcul de la barre de rang (versDivisionSuivante), la quête (pastilles ou
// barre), la géométrie de la trajectoire et de la jauge (les chiffres de la
// maquette), la lecture des nombres (insécable avant « % », vrai signe moins),
// la palette « jade », les noms courts des matières, le dernier trophée gagné,
// la place au classement sans relire la note, le Codex sans historique ; puis
// (lot 2) la lecture du JSON de maitrise_synthese et de rythme_joueur : les
// dates, l'historique, la note à une date, les 93 notions et leurs états, le
// repli sur 90 jours, calcul ou théorie, les atouts, le rythme, la courbe, et
// les lecteurs mémorisés qui rendent null au moindre accroc ; enfin la date
// de 3 jours (rang 15) et l'activité depuis chaque comparaison (activite_depuis).
import { COMPARAISONS, COUVERTURE_MIN, JOURS_COMPARAISON, JOURS_RECENT, JOURS_SYNTHESE, MATIERES_POIDS, RANG_COMPARAISON, RANG_RECENT, RANG_SEMAINE, SEMAINES_COURBE, activiteEn, atouts, calculGlobal, calculSynthese, chiffresObjectif, comptesNotions, dateCourte, dateJour, dateLongue, echelleQuestions, entier, etatNotion, geometrieJauge, geometrieTrajectoire, globaleSynthese, historiqueEn, hrefQuete, ligneRang, matiereLaPlusFaible, matieresSynthese, mesureeA, mesuresCalculDe, mesuresDuJour, mesuresNotionsDe, metalDePalier, moyennesDe, notionsDe, notionsDepuisPointsFaibles, pc, preparationA, progressionSynthese, rangSynthese, rythmeDe, signe, sousEchantillonner, ton, TRAJECTOIRE_COMPACTE, TRAJECTOIRE_LARGE, tempsSynthese, barreRang, type Mesure } from "@/components/moi/synthese/modele";
import { CHIFFRES_EXEMPLE, PLAN_EXEMPLE } from "./synthese-exemple";
import { maitriseDepuis, type Maitrise } from "@/lib/maitrise";
import { actBrutDepuis, datesActivite, datesSynthese, lireActivite, lireMaitriseSynthese, lireRythme, rytBrutDepuis, synBrutDepuis } from "@/lib/moi-synthese";
import { NOTIONS } from "@/lib/notions";
import { PALETTES, paletteDeChemin } from "@/lib/palettes";
import { codexMoiDe } from "@/lib/profil/codex-moi";
import { getLeaderboardRank } from "@/lib/rating";
import { TIERS, TOP_TIER, rankFor, versDivisionSuivante } from "@/lib/ranks";
import { TOPICS } from "@/lib/practiceTopics";
import { dernierGagne, lignesTrophees } from "@/lib/trophees";
import { COURTS_FR, MINIS_FR } from "@/lib/voice-moi";
import type { SupabaseClient } from "@supabase/supabase-js";

let ko = 0;
const titre = (t: string) => {
  console.log("");
  console.log(t);
};
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const NB = String.fromCharCode(160);

// ── la palette « jade » ─────────────────────────────────────────────────────
console.log("# palette jade");
{
  const j = PALETTES.jade;
  check("la palette jade existe, 4 couleurs triées du plus sombre au plus clair", !!j && j.couleurs.length === 4 && j.couleurs[0].hex === "#121016" && j.couleurs[3].hex === "#f4f2f7", j?.couleurs.map((c) => c.hex).join());
  check("le liquide : noir, améthyste, jade, blanc lilas", j.liquide.join() === ["#121016", "#5a3a8f", "#2f8f5f", "#f4f2f7"].join(), j.liquide.join());
  check("la texture de repli est /encres/jade.webp", j.encre === "/encres/jade.webp");
  check("/moi et ses sous-pages prennent jade ; ébène reste définie (bannières)", paletteDeChemin("/moi")?.key === "jade" && paletteDeChemin("/moi/x")?.key === "jade" && !!PALETTES.ebene);
}

// ── la barre de rang ────────────────────────────────────────────────────────
titre("# versDivisionSuivante");
{
  const v1478 = versDivisionSuivante(1478, rankFor(1478, 65, 7), 24);
  check("1 478 (Platine II) : 22 ELO avant Platine I, 56 % de la barre", v1478.genre === "division" && v1478.reste === 22 && v1478.cible === "Platine I" && v1478.pct === 56 && v1478.de === 1450 && v1478.vers === 1500, JSON.stringify(v1478));
  const i1520 = versDivisionSuivante(1520, rankFor(1520, 65, null), 24);
  check("division I : le seuil devient le palier suivant (Diamant III à 1 550)", i1520.genre === "division" && i1520.cible === "Diamant III" && i1520.vers === 1550 && i1520.reste === 30 && i1520.pct === 40, JSON.stringify(i1520));
  const gm2 = versDivisionSuivante(1920, rankFor(1920, 85, 40), 24);
  check("Grand Maître II : la division I est à 1 950", gm2.genre === "division" && gm2.cible === "Grand Maître I" && gm2.vers === 1950 && gm2.reste === 30, JSON.stringify(gm2));
  const gm1 = versDivisionSuivante(1990, rankFor(1990, 85, 40), 24);
  check("Grand Maître I : plus de palier d'ELO au-dessus, donc le sommet", gm1.genre === "sommet", JSON.stringify(gm1));
  const verrou = versDivisionSuivante(1600, rankFor(1600, 40, null), 24);
  check("verrou : l'ELO suffit pour Diamant mais la maîtrise (40 %) retient, 60 % requis", verrou.genre === "verrou" && verrou.lock === 60 && verrou.cible === "Diamant", JSON.stringify(verrou));
  const top = rankFor(1900, 95, 5);
  check("Top 10 : le palier est TOP_TIER et la barre dit le sommet", top.tierIndex === TOP_TIER && versDivisionSuivante(1900, top, 40).genre === "sommet");
  const place = versDivisionSuivante(1200, rankFor(1200, 50, null), 3);
  check("placement : « Placement 3/5 »", place.genre === "placement" && place.jouees === 3 && place.total === 5, JSON.stringify(place));
  const bronze = versDivisionSuivante(1050, rankFor(1050, 10, null), 24);
  check("Bronze (sans seuil bas, part de 950) : 50 ELO avant Argent III", bronze.genre === "division" && bronze.cible === "Argent III" && bronze.reste === 50, JSON.stringify(bronze));
  check("pas de barre hors de 0–100", [v1478, i1520, gm2, bronze].every((b) => b.genre !== "division" || (b.pct >= 0 && b.pct <= 100)));
  // le rang de la carte, ligne et barre
  const r = rangSynthese({ elo: 1478, gamesPlayed: 24, mastery: 65, place: 7, joueurs: 412 });
  check("rangSynthese : Platine II, ligne « 1 478 ELO · 7e sur 412 »", r.palier === "Platine II" && ligneRang(r) === `1${NB}478${NB}ELO · 7e sur 412`, ligneRang(r));
  const b = barreRang(r);
  check("la barre : 56 %, bornes 1 450 et 1 500 dans la description", b.genre === "barre" && b.pct === 56 && b.droite === `1${NB}500` && b.aria.includes(`1${NB}450`), JSON.stringify(b));
  const rp = rangSynthese({ elo: 1200, gamesPlayed: 3, mastery: 0, place: null, joueurs: null });
  check("en placement : palier « Placement », ligne « Placement 3/5 », barre 60 %", rp.placement && rp.palier === "Placement" && ligneRang(rp) === "Placement 3/5" && barreRang(rp).genre === "barre" && (barreRang(rp) as { pct: number }).pct === 60);
  const rv = rangSynthese({ elo: 1600, gamesPlayed: 24, mastery: 40, place: 30, joueurs: 100 });
  const bv = barreRang(rv);
  check("verrou : la barre devient une phrase « 60 % de maîtrise requis »", bv.genre === "texte" && bv.texte.includes(`60${NB}%`) && bv.texte.includes("Diamant"), JSON.stringify(bv));
}

// ── la quête et l'objectif ──────────────────────────────────────────────────
titre("# objectif");
{
  const avec = (quotidien: number, jour: number, extra: Partial<typeof PLAN_EXEMPLE> = {}) => chiffresObjectif({ ...PLAN_EXEMPLE, quotidien, jour, ...extra });
  const a = avec(24, 5);
  check("24 par jour : 24 pastilles, 5 allumées", a.quete?.mode === "pastilles" && a.quete.n === 24 && a.quete.on === 5, JSON.stringify(a.quete));
  const c25 = avec(25, 5);
  check("25 par jour : une barre (20 %)", c25.quete?.mode === "barre" && c25.quete.pct === 20, JSON.stringify(c25.quete));
  check("quête : 16 par jour, 7 faites, reste 9 (maquette)", CHIFFRES_EXEMPLE.quete?.mode === "pastilles" && CHIFFRES_EXEMPLE.quete.n === 16 && CHIFFRES_EXEMPLE.quete.on === 7 && CHIFFRES_EXEMPLE.resteJour === 9);
  check("plan atteint ou passé : pas de quête, pas de reste du jour", avec(0, 0, { statut: "atteint" }).quete === null && avec(0, 0, { statut: "passe" }).resteJour === 0);
  check("1 240 sur 3 000 : 41 %, il en reste 1 760, J-110", CHIFFRES_EXEMPLE.fait === 1240 && CHIFFRES_EXEMPLE.pct === 41 && CHIFFRES_EXEMPLE.reste === 1760 && CHIFFRES_EXEMPLE.jn === "J-110", `${CHIFFRES_EXEMPLE.pct} ${CHIFFRES_EXEMPLE.jn}`);
  check("« un peu en retard » : 29 questions de retard, moins de 2 jours de plan (32)", CHIFFRES_EXEMPLE.etat === "peu" && CHIFFRES_EXEMPLE.avance === -29);
  check("dans les temps à 0 ou plus, en retard au-delà de 2 jours de plan", avec(16, 7, { ideal: 1233 }).etat === "temps" && avec(16, 7, { ideal: 1233 + 33 }).etat === "retard" && avec(16, 7, { ideal: 1233 + 32 }).etat === "peu");
  check("l'écart « −220 » : 2 780 pour 3 000, il faut 2 de plus par jour", CHIFFRES_EXEMPLE.ecart === -220 && CHIFFRES_EXEMPLE.deplus === 2, `${CHIFFRES_EXEMPLE.ecart} ${CHIFFRES_EXEMPLE.deplus}`);
  check("le jour J : « Jour J » ; passé : null", chiffresObjectif({ ...PLAN_EXEMPLE, aujourdhui: PLAN_EXEMPLE.examen }).jn === "Jour J" && chiffresObjectif({ ...PLAN_EXEMPLE, aujourdhui: "2027-02-19" }).jn === null);
  check("la séance de la quête : de 10 à 90 questions, Éthique si rien n'est mesuré", hrefQuete(9, "fsa") === "/practice?topic=fsa&n=10&go=1" && hrefQuete(120, "quant") === "/practice?topic=quant&n=90&go=1" && hrefQuete(30, null) === "/practice?topic=ethics&n=30&go=1");
  const m = { matieres: [{ cle: "a", pct: 55, poids: 5 }, { cle: "b", pct: 30, poids: 5 }, { cle: "c", pct: 30, poids: 9 }, { cle: "d", pct: null, poids: 20 }] } as unknown as Maitrise;
  check("la matière mesurée la plus faible (à égalité, la plus lourde) ; null si rien n'est mesuré", matiereLaPlusFaible(m) === "c" && matiereLaPlusFaible({ matieres: [{ cle: "z", pct: null, poids: 1 }] } as unknown as Maitrise) === null && matiereLaPlusFaible(null) === null);
}

// ── la trajectoire ──────────────────────────────────────────────────────────
titre("# trajectoire");
{
  const g = geometrieTrajectoire(PLAN_EXEMPLE, TRAJECTOIRE_COMPACTE);
  check("extrémités : départ à 38, fin à 212, aujourd'hui à 134,5 (la maquette)", g.xDebut === 38 && g.xFin === 212 && Math.abs(g.xAuj - 134.5) < 0.2, `${g.xDebut} ${g.xAuj} ${g.xFin}`);
  check("ordonnées : 3 000 à 14, 1 240 à 83,2, 2 780 à 22,7", g.yTotal === 14 && Math.abs(g.yFait - 83.2) < 0.2 && Math.abs(g.yProjection - 22.7) < 0.2, `${g.yTotal} ${g.yFait} ${g.yProjection}`);
  check("l'écart vaut −220 et son étiquette est posée sous les deux autres", g.ecart === -220 && g.etiquettes.ecart !== null && g.etiquettes.ecart > g.etiquettes.projection && g.etiquettes.projection > g.etiquettes.total, JSON.stringify(g.etiquettes));
  check("la grille : 3 000, 2 000, 1 000, 0", g.grille.map((l) => l.texte).join("|") === ["3 000", "2 000", "1 000", "0"].map((x) => x.replace(" ", NB)).join("|"), g.grille.map((l) => l.texte).join("|"));
  check("dates sous l'axe : 16 juin et 18 févr.", g.dates.debut === "16 juin" && g.dates.fin === "18 févr.", JSON.stringify(g.dates));
  const w = geometrieTrajectoire(PLAN_EXEMPLE, TRAJECTOIRE_LARGE);
  check("version large : 40 → 270, sommet 14", w.xDebut === 40 && w.xFin === 270 && w.yTotal === 14);
  const e = echelleQuestions(3000);
  const e2 = echelleQuestions(2500);
  check("échelle : 3 000 en 3 pas de 1 000 ; 2 500 monte à 3 000", e.haut === 3000 && e.pas === 1000 && e2.haut === 3000);
  const dessus = geometrieTrajectoire({ ...PLAN_EXEMPLE, projection: 3400 }, TRAJECTOIRE_COMPACTE);
  check("projection au-dessus de l'objectif : pas d'écart rouge", dessus.etiquettes.ecart === null && dessus.ecart > 0);
  const depart = geometrieTrajectoire({ ...PLAN_EXEMPLE, avant: 0, jour: 0, serie: [{ day: "2026-10-31", cumul: 0 }] }, TRAJECTOIRE_COMPACTE);
  check("premier jour (un seul point) : aujourd'hui est à gauche, sans NaN", depart.xAuj === 38 && !depart.courbe.includes("NaN") && !depart.aire.includes("NaN"));
  const s20 = sousEchantillonner(Array.from({ length: 20 }, (_, i) => i), 7);
  check("sous-échantillonnage : 7 points au plus, le premier et le dernier gardés", s20.length === 7 && s20[0] === 0 && s20[6] === 19 && sousEchantillonner([1, 2, 3], 7).length === 3);
}

// ── la jauge ────────────────────────────────────────────────────────────────
titre("# jauge");
{
  const j61 = geometrieJauge(61);
  check("61 % : l'arc de la valeur finit en (138,5 ; 33), zone ambre", j61.valeur === "M26 112 A84 84 0 0 1 138.5 33" && j61.zone === "a", j61.valeur ?? "");
  const j70 = geometrieJauge(70);
  check("70 % : zone verte ; le repère du seuil de (152,3 ; 53,8) à (172,3 ; 26,2)", j70.zone === "e" && j70.tick.x1 === 152.3 && j70.tick.y1 === 53.8 && j70.tick.x2 === 172.3 && j70.tick.y2 === 26.2, JSON.stringify(j70.tick));
  check("les zones de l'anneau : 0–50, 50–70 (finit en 168,8 ; 31,1), 70–100", j61.zones[0] === "M10 112 A100 100 0 0 1 110 12" && j61.zones[1] === "M110 12 A100 100 0 0 1 168.8 31.1" && j61.zones[2].startsWith("M168.8 31.1"), j61.zones.join(" / "));
  check("0 % : pas de tracé de valeur, zone rouge ; 100 % : l'arc va au bout", geometrieJauge(0).valeur === null && geometrieJauge(0).zone === "r" && geometrieJauge(100).valeur === "M26 112 A84 84 0 0 1 194 112");
  check("49 → rouge, 50 → ambre, 69 → ambre", ton(49) === "r" && ton(50) === "a" && ton(69) === "a" && ton(70) === "e" && ton(null) === null);
  check("la jauge ne s'affiche qu'à partir de 50 % du programme mesuré", COUVERTURE_MIN === 50);
}

// ── les nombres et les dates ────────────────────────────────────────────────
titre("# formats");
{
  check("insécable avant « % »", pc(61) === `61${NB}%`);
  check("vrai signe moins (U+2212), pas le tiret", signe(-220) === "−220" && signe(-220).charCodeAt(0) === 0x2212 && signe(15) === "+15" && signe(0) === "0" && entier(-5) === "−5");
  check("milliers à l'espace insécable, sans Intl", entier(1240) === `1${NB}240` && entier(3000) === `3${NB}000` && entier(999) === "999" && entier(1234567) === `1${NB}234${NB}567`);
  check("dates à la main : 18 février 2027, 18 févr., 1er mars", dateLongue("2027-02-18") === "18 février 2027" && dateCourte("2027-02-18") === "18 févr." && dateJour("2026-03-01") === "1er mars" && dateJour("n'importe quoi") === "n'importe quoi");
  const t = tempsSynthese({ mesurees: 3600, estimees: 120_000, total: 123_600, premierJour: "2026-06-16", premierMesure: "2026-10-26", semaine: 15_000, inscription: "2026-06-16" });
  check("temps : « 34 h 20 », 7 jours « 4 h 10 », depuis le 16 juin", !!t && t.total === `34${NB}h 20` && t.semaine === `4${NB}h 10` && t.depuis === "16 juin", JSON.stringify(t));
  check("temps : rien de compté (moins d'une minute) ou sans migration, la ligne disparaît", tempsSynthese(null) === null && tempsSynthese({ mesurees: 30, estimees: 0, total: 30, premierJour: null, premierMesure: null, semaine: 30, inscription: null }) === null);
}

// ── les noms courts des matières ────────────────────────────────────────────
titre("# noms courts");
{
  check("COURTS_FR couvre les 10 clés de TOPICS", TOPICS.every((t) => !!COURTS_FR[t.key]) && Object.keys(COURTS_FR).length === TOPICS.length, Object.keys(COURTS_FR).join());
  check("MINIS_FR aussi, et plus court ou égal", TOPICS.every((t) => !!MINIS_FR[t.key] && MINIS_FR[t.key].length <= COURTS_FR[t.key].length));
  check("les métaux des trophées : bronze = palier 0, diamant = palier 4 des insignes", metalDePalier(1) === TIERS[0].metal && metalDePalier(2) === TIERS[1].metal && metalDePalier(3) === TIERS[2].metal && metalDePalier(4) === TIERS[4].metal);
}

// ── le dernier trophée gagné ────────────────────────────────────────────────
titre("# dernier gagné");
{
  const lignes = lignesTrophees([
    { source: "ciblee", palier: 1, n: "6", dernier: "2026-10-20T10:00:00Z" },
    { source: "trente", palier: 3, n: 2, dernier: "2026-10-29T09:30:00Z" },
    { source: "blanc", palier: 4, n: 1, dernier: "2026-10-29T09:30:00Z" },
    { source: "cinq", palier: 1, n: 1 },
    { source: "inconnue", palier: 1, n: 1, dernier: "2027-01-01T00:00:00Z" },
    { source: "duel", palier: 9, n: 1, dernier: "2027-01-01T00:00:00Z" },
    { source: "atelier", palier: 1, n: 0, dernier: "2027-01-01T00:00:00Z" },
  ]);
  check("lignesTrophees garde « dernier » quand il est là (et seulement alors)", lignes[0].dernier === "2026-10-20T10:00:00Z" && !("dernier" in lignes[3]));
  const d = dernierGagne(lignes);
  check("le plus récent ; à égalité, le palier le plus haut (diamant, Examen blanc) ; lignes invalides écartées", d?.source === "blanc" && d.palier === 4 && d.nom === "Trophée de diamant · Examen blanc", JSON.stringify(d));
  const or = dernierGagne([{ source: "trente", palier: 3, n: 1, dernier: "2026-10-29T09:30:00Z" }]);
  check("la règle du palier suit : « 27/30 ou plus »", or?.nom === "Trophée d'or · Les 30 du jour" && or.regle === "27/30 ou plus", JSON.stringify(or));
  check("sans date (repli sans trophees_joueur) : aucun dernier", dernierGagne([{ source: "ciblee", palier: 1, n: 3 }]) === null && dernierGagne([]) === null);
}

// ═══ Lot 2 : les nouvelles sources (maitrise_synthese, rythme_joueur) ═══════

const JOUR_MS = 86_400_000;
const MAINTENANT = Date.parse("2026-10-31T10:00:00Z");
/** Le jour (AAAA-MM-JJ) de chacune des 16 dates demandées. */
const JOURS = datesSynthese(MAINTENANT).map((x) => x.slice(0, 10));
const idsDe = (matiere: string) => NOTIONS.filter((n) => n.matiere === matiere).map((n) => n.id);

// ── les dates demandées ─────────────────────────────────────────────────────
titre("# datesSynthese");
{
  const d = datesSynthese(MAINTENANT);
  const il = (j: number) => new Date(MAINTENANT - j * JOUR_MS).toISOString();
  check("16 dates distinctes (30, 60, 90 jours, 12 semaines, puis 3 jours), 20 au plus pour la fonction SQL", d.length === 16 && new Set(d).size === 16 && d.length <= 20 && JOURS_SYNTHESE.length === 16, String(new Set(d).size));
  check("rangs 0 à 2 : il y a 30, 60 et 90 jours (inchangés)", d[0] === il(30) && d[1] === il(60) && d[2] === il(90) && d[RANG_COMPARAISON[30]] === il(30) && d[RANG_COMPARAISON[60]] === il(60) && d[RANG_COMPARAISON[90]] === il(90));
  check("rangs 3 à 14 : il y a 7 × k jours, k de 1 à 12 (inchangés)", RANG_SEMAINE === 3 && RANG_SEMAINE === JOURS_COMPARAISON.length && Array.from({ length: SEMAINES_COURBE }, (_, k) => d[RANG_SEMAINE + k] === il(7 * (k + 1))).every(Boolean));
  check("rang 15, ajouté à la fin : il y a 3 jours", JOURS_RECENT === 3 && RANG_RECENT === 15 && RANG_COMPARAISON[3] === 15 && d[15] === il(3));
  check("les comparaisons du sélecteur : 3, 30, 60, 90 jours, dans cet ordre", COMPARAISONS.join() === "3,30,60,90");
  check("activite_depuis reçoit les dates des comparaisons dans l'ordre 3, 30, 60, 90 (les mêmes instants)", datesActivite(d).join() === [il(3), il(30), il(60), il(90)].join());
  check("les poids officiels : 10 matières, 102,5 en tout", MATIERES_POIDS.length === 10 && MATIERES_POIDS.reduce((s, m) => s + m.poids, 0) === 102.5);
}

// ── l'historique et la note à une date ──────────────────────────────────────
titre("# historique et note à une date");
{
  const brut = [
    { i: 1, matieres: { ethics: { pct: 70, n: 30 }, quant: { pct: null, n: 6 } } },
    { i: 4, matieres: { ethics: { pct: 75, n: 35 }, quant: { pct: 150, n: 30 }, bogus: { pct: 50, n: 20 }, fsa: "x" } },
    null,
    3,
    "x",
    { i: "a" },
    { i: 0, matieres: {} },
    { i: 99, matieres: {} },
    { i: 2 },
    { i: 3, matieres: [] },
  ];
  const h = historiqueEn(brut, JOURS);
  check("un point par date, dans l'ordre, avec son jour (16, le dernier il y a 3 jours)", !!h && h.length === 16 && h[0].jour === JOURS[0] && h[15].jour === JOURS[15] && JOURS[15] === "2026-10-28");
  check("le rang i (à partir de 1) renvoie à la date i − 1 : 70 % sur 30 réponses, puis 75 %", !!h && h[0].matieres.ethics?.pct === 70 && h[0].matieres.ethics.n === 30 && h[3].matieres.ethics?.pct === 75);
  check("sous 10 réponses : pct null, la clé reste avec son n", !!h && h[0].matieres.quant?.pct === null && h[0].matieres.quant.n === 6);
  check("pct hors bornes ramené à 100 ; matière inconnue, valeur illisible, rang absurde : écartés sans exception", !!h && h[3].matieres.quant?.pct === 100 && !("bogus" in h[3].matieres) && !("fsa" in h[3].matieres) && Object.keys(h[1].matieres).length === 0 && Object.keys(h[2].matieres).length === 0);
  check("un JSON qui n'est pas une liste : null", historiqueEn("x", JOURS) === null && historiqueEn(null, JOURS) === null && historiqueEn({}, JOURS) === null && historiqueEn(undefined, JOURS) === null);
  check("la note à une date compte 0 pour une matière non mesurée : Éthique 80 % × 17,5 / 102,5 = 14", preparationA({ ethics: { pct: 80, n: 40 } }) === 14 && preparationA({}) === 0 && preparationA({ quant: { pct: null, n: 4 } }) === 0);
  check("toutes les matières à 100 % : 100 ; mesureeA", preparationA(Object.fromEntries(TOPICS.map((t) => [t.key, { pct: 100, n: 60 }]))) === 100 && mesureeA({ ethics: { pct: 10, n: 10 } }) && !mesureeA({ ethics: { pct: null, n: 3 } }) && !mesureeA(undefined));
}

// ── un JSON inattendu donne null (ou vide), jamais une exception ────────────
titre("# JSON inattendu");
{
  const mauvais: unknown[] = [undefined, null, 3, "x", [], true, {}, { historique: "x", notions: {}, calcul: {}, moyennes: {} }, { historique: [], notions: [], calcul: {}, moyennes: {} }, { historique: [], notions: {}, calcul: null, moyennes: {} }];
  check("maitrise_synthese : null pour tout ce qui n'a pas les quatre blocs", mauvais.every((x) => synBrutDepuis(x) === null));
  check("maitrise_synthese : les quatre blocs bien formés passent", synBrutDepuis({ v: 1, historique: [], notions: {}, calcul: {}, moyennes: {} }) !== null);
  check("rythme_joueur : null sans objet « matieres »", [undefined, null, 3, "x", [], {}, { sec: 1, n: 2, matieres: [] }, { matieres: 4 }].every((x) => rytBrutDepuis(x) === null) && rytBrutDepuis({ sec: null, n: 0, matieres: {} }) !== null);
  const vides = [mesuresNotionsDe(42), mesuresNotionsDe([]), moyennesDe(null), moyennesDe("x"), mesuresCalculDe([]), mesuresCalculDe(7)];
  check("mesuresNotionsDe, moyennesDe, mesuresCalculDe : vides sur un JSON inattendu", vides.every((v) => Object.keys(v).length === 0));
  check("rythmeDe : null sur un JSON inattendu", [undefined, null, 4, "x", [], {}, { matieres: [] }, { matieres: 3 }].every((x) => rythmeDe(x) === null));
  check("une notion aux champs de travers est écartée, les autres restent", Object.keys(mesuresNotionsDe({ "ethics:1": { pct: 80, n: 20, total: 20 }, "ethics:2": "x", "ethics:3": { n: "beaucoup" }, "ethics:4": null })).join() === "ethics:1");
}

// ── les 93 notions et leurs états ───────────────────────────────────────────
titre("# les 93 notions");
{
  const eth = idsDe("ethics");
  const qua = idsDe("quant");
  const fsa = idsDe("fsa");
  const mesures = mesuresNotionsDe({
    [eth[0]]: { pct: 82, n: 20, total: 31, derniere: "2026-10-30T10:00:00Z" },
    [eth[1]]: { pct: 91, n: 5, total: 5 },
    [qua[0]]: { pct: 49, n: 12, total: 12 },
    [qua[1]]: { pct: 50, n: 8, total: 8 },
    [qua[2]]: { pct: 69, n: 9, total: 9 },
    [qua[3]]: { pct: 70, n: 20, total: 40 },
    [fsa[0]]: { pct: null, n: 7, total: 7 },
    [fsa[1]]: { pct: null, n: 0, total: 0 },
    "inconnue:99": { pct: 60, n: 20, total: 20 },
  });
  check("le pct d'une notion n'est gardé qu'à 8 réponses (5 réponses : pct écarté), son total reste", mesures[eth[1]].pct === null && mesures[eth[1]].n === 5 && mesures[eth[0]].total === 31 && mesures[eth[0]].derniere === "2026-10-30T10:00:00Z");
  const vide = notionsDe(NOTIONS, {});
  check("93 notions au catalogue ; sans mesure, les 93 sont « jamais vues »", NOTIONS.length === 93 && vide.length === 93 && comptesNotions(vide).jamais === 93);
  const tout = notionsDe(NOTIONS, mesures);
  const c = comptesNotions(tout);
  check("1 rouge, 2 ambres, 2 acquises, 2 en cours, 86 jamais vues ; le total fait toujours 93", c.r === 1 && c.a === 2 && c.e === 2 && c.encours === 2 && c.jamais === 86 && c.r + c.a + c.e + c.encours + c.jamais === 93, JSON.stringify(c));
  const etat = (id: string) => tout.find((n) => n.id === id)?.etat;
  check("49 rouge, 50 et 69 ambre, 70 et 82 acquise ; 5 ou 7 réponses : en cours ; 0 : jamais vue", etat(qua[0]) === "r" && etat(qua[1]) === "a" && etat(qua[2]) === "a" && etat(qua[3]) === "e" && etat(eth[0]) === "e" && etat(eth[1]) === "encours" && etat(fsa[0]) === "encours" && etat(fsa[1]) === "jamais");
  check("etatNotion : les seuils 49 / 50 / 69 / 70 et 7 / 1 / 0 réponses", etatNotion(49, 20) === "r" && etatNotion(50, 8) === "a" && etatNotion(69, 20) === "a" && etatNotion(70, 20) === "e" && etatNotion(null, 7) === "encours" && etatNotion(null, 1) === "encours" && etatNotion(null, 0) === "jamais");
  check("une notion inconnue du catalogue n'ajoute rien", !tout.some((n) => n.id === "inconnue:99"));
  check(
    "chaque notion : matière valide, lien de fiche sinon chapitre du cours",
    tout.every((n, i) => n.m >= 0 && n.m < TOPICS.length && TOPICS[n.m].key === NOTIONS[i].matiere && n.href === (NOTIONS[i].fiches[0]?.href ?? NOTIONS[i].cours) && (n.href.startsWith("/fiches/") || n.href.startsWith("/courses/"))),
  );
  check("l'objet court : id, matière, libellé court, pct, n, état, lien (rien d'autre)", Object.keys(tout[0]).sort().join() === "court,etat,href,id,m,n,pct");
}

// ── le repli sur 90 jours (points_faibles) ──────────────────────────────────
titre("# repli points_faibles");
{
  const eth = idsDe("ethics");
  const qua = idsDe("quant");
  const fsa = idsDe("fsa");
  const lig = (notion: string, ok: number, n: number) => ({ notion, recentes: Array.from({ length: n }, (_, i) => ({ ok: i < ok })) });
  const rep = notionsDepuisPointsFaibles([lig(eth[0], 7, 10), lig(qua[0], 5, 7), lig(qua[1], 10, 20), lig(fsa[0], 25, 25), lig(fsa[1], 0, 0), lig("n-existe:pas", 3, 3)], NOTIONS);
  const e = (id: string) => rep.find((n) => n.id === id);
  check("93 notions ; 7 justes sur 10 : 70 % acquise ; 10 sur 20 : 50 % ambre", rep.length === 93 && e(eth[0])?.pct === 70 && e(eth[0])?.etat === "e" && e(qua[1])?.pct === 50 && e(qua[1])?.etat === "a");
  check("7 réponses : en cours (pas de pct) ; 25 réponses : les 20 plus récentes seulement (20 sur 20 = 100 %)", e(qua[0])?.etat === "encours" && e(qua[0])?.pct === null && e(qua[0])?.n === 7 && e(fsa[0])?.n === 20 && e(fsa[0])?.pct === 100);
  check("sans réponse récente : jamais vue (« pas vue depuis 90 j ») ; total 93", e(fsa[1])?.etat === "jamais" && Object.values(comptesNotions(rep)).reduce((s, x) => s + x, 0) === 93);
}

// ── calcul ou théorie ───────────────────────────────────────────────────────
titre("# calcul ou théorie");
{
  const calc = mesuresCalculDe({
    "ethics:avec": { pct: 60, n: 30 },
    "ethics:sans": { pct: 80, n: 30 },
    "quant:avec": { pct: 50, n: 20 },
    "quant:sans": { pct: 70, n: 20 },
    "fsa:avec": { pct: 40, n: 15 },
    "fsa:sans": { pct: 70, n: 15 },
    "equity:avec": { pct: 55, n: 12 },
    "equity:sans": { pct: 65, n: 4 },
    "bogus:avec": { pct: 10, n: 50 },
    "ethics:autre": { pct: 10, n: 50 },
  });
  check("matière inconnue et genre inconnu écartés ; sous 10 réponses : pas de pct", !("bogus:avec" in calc) && !("ethics:autre" in calc) && calc["equity:sans"].pct === null && calc["equity:sans"].n === 4);
  const g = calculGlobal(calc);
  check("global : seules Éthique, Quant et FSA comptent (mesurées des deux côtés) : avec 51 %, sans 75 %", g?.avec === 51 && g?.sans === 75, JSON.stringify(g));
  const deux = mesuresCalculDe({ "ethics:avec": { pct: 60, n: 30 }, "ethics:sans": { pct: 80, n: 30 }, "quant:avec": { pct: 50, n: 20 }, "quant:sans": { pct: 70, n: 20 }, "fsa:avec": { pct: 40, n: 15 } });
  check("sous 3 matières comparables : null ; sans rien : null", calculGlobal(deux) === null && calculGlobal({}) === null);
  const cs = calculSynthese(calc);
  const eq = cs.matieres.find((m) => m.cle === "equity");
  check("la carte : matières dans l'ordre du programme, Actions avec 55 % et rien sans calcul", cs.matieres.map((m) => m.cle).join() === "ethics,quant,fsa,equity" && eq?.avec === 55 && eq.sans === null && eq.court === COURTS_FR.equity && cs.global?.avec === 51);
  const vide = calculSynthese({});
  check("rien de mesuré : global null, liste vide (l'état vide de la carte)", vide.global === null && vide.matieres.length === 0);
}

// ── les atouts face aux joueurs ─────────────────────────────────────────────
titre("# atouts");
{
  const ms = [
    { cle: "ethics", court: "Éthique", pct: 80 },
    { cle: "quant", court: "Quant", pct: 65 },
    { cle: "fsa", court: "FSA", pct: 40 },
    { cle: "equity", court: "Actions", pct: null },
  ];
  check("moins de 5 joueurs : la moyenne est écartée, donc atouts null", Object.keys(moyennesDe({ quant: { pct: 60, joueurs: 4 }, ethics: { pct: 70, joueurs: 4 } })).length === 0 && atouts(ms, moyennesDe({ quant: { pct: 60, joueurs: 4 } })) === null);
  const moy = moyennesDe({ ethics: { pct: 70, joueurs: 5 }, quant: { pct: 60, joueurs: 12 }, fsa: { pct: 50, joueurs: 30 }, equity: { pct: 40, joueurs: 9 }, bogus: { pct: 1, joueurs: 99 } });
  const a = atouts(ms, moy);
  check("5 joueurs suffisent ; seulement les écarts positifs, du plus grand au plus petit (Éthique +10, Quant +5) ; ni FSA (−10) ni la matière non mesurée", moy.ethics === 70 && !("bogus" in moy) && !!a && a.map((x) => x.cle + x.ecart).join() === "ethics10,quant5", JSON.stringify(a));
  check("aucune moyenne : null ; des moyennes mais aucun atout : liste vide", atouts(ms, null) === null && atouts(ms, {}) === null && atouts([{ cle: "fsa", court: "FSA", pct: 40 }], { fsa: 50 })?.length === 0);
}

// ── le rythme ───────────────────────────────────────────────────────────────
titre("# rythme");
{
  const r = rythmeDe({ v: 1, sec: 104.4, n: 220, matieres: { ethics: { sec: 98, n: 80 }, quant: { sec: 130, n: 15 }, fsa: { sec: 111.6, n: 20 }, bogus: { sec: 50, n: 200 } } });
  check("104 s sur 220 questions ; seules les matières de 20 questions et plus (Éthique 98 s, FSA 112 s)", r?.global === 104 && r.questions === 220 && r.matieres.map((m) => m.cle + m.secondes).join() === "ethics98,fsa112", JSON.stringify(r));
  const peu = rythmeDe({ sec: 80, n: 12, matieres: {} });
  check("sous 20 questions chronométrées : pas de global, la carte (vide) reste", peu !== null && peu.global === null && peu.questions === 12 && peu.matieres.length === 0);
  const rien = rythmeDe({ sec: null, n: 0, matieres: {} });
  check("aucune copie chronométrée : carte vide, sans NaN", rien !== null && rien.global === null && rien.questions === 0 && !JSON.stringify(rien).includes("NaN"));
}

// ── les matières, la maîtrise globale, la courbe ────────────────────────────
titre("# matières, globale, progression");
{
  const m = maitriseDepuis({ matieres: { ethics: { pct: 80, n: 60, total: 80 }, quant: { pct: 50, n: 45, total: 50 }, fsa: { pct: 30, n: 12, total: 12 } } }) as Maitrise;
  // l'historique : il y a 30 j (rang 1), 60 j (rang 2), la semaine k au rang 3 + k, puis il y a 3 j (rang 16)
  const lignes: { i: number; matieres: Record<string, Mesure> }[] = [
    { i: 1, matieres: { ethics: { pct: 70, n: 30 }, quant: { pct: 45, n: 20 } } },
    { i: 2, matieres: { ethics: { pct: 60, n: 20 } } },
    { i: RANG_RECENT + 1, matieres: { ethics: { pct: 78, n: 60 } } },
  ];
  for (let k = 8; k >= 6; k--) lignes.push({ i: RANG_SEMAINE + k, matieres: { ethics: { pct: 60, n: 15 } } });
  for (let k = 5; k >= 1; k--) lignes.push({ i: RANG_SEMAINE + k, matieres: { ethics: { pct: 75, n: 35 }, quant: { pct: 40, n: 12 } } });
  const h = historiqueEn(lignes, JOURS);
  const ms = matieresSynthese(m, h, { quant: 60 });
  const par = (cle: string) => ms.find((x) => x.cle === cle);
  check("10 matières dans l'ordre du programme, noms courts français", ms.length === 10 && ms.map((x) => x.cle).join() === TOPICS.map((t) => t.key).join() && ms.every((x) => x.court === COURTS_FR[x.cle] && x.mini === MINIS_FR[x.cle]));
  check("aujourd'hui : Éthique 80 % mesurée, FSA 30 % provisoire, Économie non mesurée", par("ethics")?.pct === 80 && par("ethics")?.statut === "mesuree" && par("fsa")?.statut === "provisoire" && par("economics")?.statut === "non_mesuree" && par("economics")?.pct === null);
  check("il y a 3, 30, 60, 90 jours : Éthique 78, 70, 60, rien ; Quant rien, 45, rien, rien (nouvelle)", JSON.stringify(par("ethics")?.ilYa) === JSON.stringify({ 3: 78, 30: 70, 60: 60, 90: null }) && JSON.stringify(par("quant")?.ilYa) === JSON.stringify({ 3: null, 30: 45, 60: null, 90: null }));
  check("moyenne des joueurs : seulement là où elle est fondée (Quant 60)", par("quant")?.moyJoueurs === 60 && par("ethics")?.moyJoueurs === null);
  check("gain : 0 au-dessus de 70 % et pour une matière non mesurée ; Quant 1,5 ; FSA provisoire 4,9 (poids / 102,5)", par("ethics")?.gain === 0 && par("economics")?.gain === 0 && par("quant")?.gain === 1.5 && par("fsa")?.gain === 4.9, `${par("quant")?.gain} ${par("fsa")?.gain}`);
  check("liens : fiche de la matière et séance ciblée", par("quant")?.hrefReviser === "/fiches/quantitative-methods" && par("quant")?.hrefEntrainer === "/practice?topic=quant&go=1");
  const sans = matieresSynthese(m, null, null);
  check("sans historique ni moyennes : ilYa et moyJoueurs à null (pas de sélecteur 3/30/60/90)", sans.every((x) => x.ilYa === null && x.moyJoueurs === null) && globaleSynthese(m, null).ilYa === null);
  check("sans activité (activite_depuis absente) : reponses à null, pour chaque matière et pour la globale", ms.every((x) => x.reponses === null) && sans.every((x) => x.reponses === null) && globaleSynthese(m, h).reponses === null);
  const g = globaleSynthese(m, h);
  check("globale : 21 aujourd'hui (= la préparation), 13 il y a 3 j, 15 il y a 30 j, 10 il y a 60 j, rien il y a 90 j", g.auj === 21 && g.auj === m.preparation && g.ilYa?.[3] === 13 && g.ilYa?.[30] === 15 && g.ilYa?.[60] === 10 && g.ilYa?.[90] === null, JSON.stringify(g));
  check("mesuresDuJour : le format de l'historique", mesuresDuJour(m).ethics.pct === 80 && mesuresDuJour(m).ethics.n === 60 && mesuresDuJour(m).economics.pct === null);

  const p = progressionSynthese(h, m, "2026-10-31");
  check("courbe : les 4 plus anciennes semaines (rien de mesuré) sont écartées, 8 semaines puis aujourd'hui", p?.points.length === 9 && p.dates.length === 9 && p.matieres.length === 10 && p.matieres.every((s) => s.length === 9), JSON.stringify(p?.points));
  check("les points : 10 (Éthique 60 %), 16 (75 % et Quant 40 %), puis aujourd'hui 21", p?.points.join() === "10,10,10,16,16,16,16,16,21", p?.points.join());
  check("dates écrites par le serveur : « 5 sept. » à « 31 oct. »", p?.dates[0] === "5 sept." && p.dates[8] === "31 oct.", p?.dates.join());
  check("la série d'une matière : Éthique 60, 60, 60, 75 ×5, 80 ; Quant null ×3 puis 40 ×5 puis 50 ; matière jamais mesurée : que des null", p?.matieres[0].join() === "60,60,60,75,75,75,75,75,80" && p.matieres[1].join() === ",,,40,40,40,40,40,50" && p.matieres[2].every((x) => x === null));
  const vierge = maitriseDepuis({ matieres: {} }) as Maitrise;
  const pv = progressionSynthese(historiqueEn([], JOURS), vierge, "2026-10-31");
  check("rien de mesuré nulle part : aucun point, dix séries vides, sans NaN", !!pv && pv.points.length === 0 && pv.dates.length === 0 && pv.matieres.length === 10 && !JSON.stringify(pv).includes("NaN"));
  const un = progressionSynthese(historiqueEn([], JOURS), m, "2026-10-31");
  check("mesuré seulement aujourd'hui : un seul point (la carte montre son état vide sous 3 points)", un?.points.length === 1 && un.points[0] === 21);
  check("sans historique ou sans maîtrise : null (carte masquée)", progressionSynthese(null, m, "2026-10-31") === null && progressionSynthese(h, null, "2026-10-31") === null);
  check(
    "la courbe garde le jour et l'examen à venir (pour dater la projection) ; un examen passé est oublié",
    p?.aujourdhui === "2026-10-31" && p.examen === null && progressionSynthese(h, m, "2026-10-31", "2027-02-18")?.examen === "2027-02-18" && progressionSynthese(h, m, "2026-10-31", "2026-10-31")?.examen === "2026-10-31" && progressionSynthese(h, m, "2026-10-31", "2026-06-01")?.examen === null && pv?.aujourdhui === "2026-10-31",
  );
}

// ── l'activité depuis chaque comparaison (activite_depuis) ──────────────────
titre("# activité depuis 3, 30, 60, 90 jours");
{
  // rang i : 1 = 3 jours, 2 = 30, 3 = 60, 4 = 90 (l'ordre de datesActivite)
  const brut = [
    { i: 1, matieres: { ethics: { n: 12, justes: 9 }, fixed_income: { n: 30, justes: 18 } } },
    { i: 2, matieres: { ethics: { n: 80, justes: 60 }, quant: { n: 40, justes: 25 }, "ethics:avec": { n: 9, justes: 9 }, bogus: { n: 5, justes: 5 }, fsa: "x", equity: { n: -1, justes: 0 }, corporate: { n: 4, justes: 9 } } },
    { i: 4, matieres: { ethics: { n: "200", justes: 150 } } },
    { i: 9, matieres: { ethics: { n: 1, justes: 1 } } },
    { i: 0, matieres: {} },
    { i: 2.5, matieres: {} },
    null,
    "x",
    { i: 3 },
  ];
  const a = activiteEn(brut);
  check("rangée par comparaison : 3 j (Éthique 12, Fixed Income 30), 30 j, 90 j", !!a && a[3].ethics?.n === 12 && a[3].ethics.justes === 9 && a[3].fixed_income?.n === 30 && a[30].ethics?.n === 80 && a[30].quant?.justes === 25 && a[90].ethics?.n === 200, JSON.stringify(a));
  check("une période sans ligne (60 j ici) : aucune réponse, objet vide", !!a && Object.keys(a[60]).length === 0);
  check("matière inconnue, clé « : », valeur de travers ou négative : écartées ; plus de justes que de réponses : ramené au nombre de réponses", !!a && !("ethics:avec" in a[30]) && !("bogus" in a[30]) && !("fsa" in a[30]) && !("equity" in a[30]) && a[30].corporate?.justes === 4);
  check("rang absurde (0, 9, 2,5, absent) : ignoré sans exception", !!a && Object.keys(a[3]).length === 2 && Object.keys(a[90]).length === 1);
  check("un JSON qui n'est pas une liste : null (source absente) ; une liste vide : quatre périodes sans réponse", [undefined, null, "x", 3, {}].every((x) => activiteEn(x) === null) && JSON.stringify(activiteEn([])) === JSON.stringify({ 3: {}, 30: {}, 60: {}, 90: {} }));
  check("activite_depuis : la forme vérifiée (une liste « depuis »), sinon null", actBrutDepuis({ v: 1, depuis: [] }) !== null && [undefined, null, 3, "x", [], {}, { depuis: {} }, { depuis: "x" }].every((x) => actBrutDepuis(x) === null));

  const m = maitriseDepuis({ matieres: { ethics: { pct: 80, n: 60, total: 80 }, quant: { pct: 50, n: 45, total: 50 }, fixed_income: { pct: 40, n: 30, total: 30 } } }) as Maitrise;
  const ms = matieresSynthese(m, historiqueEn([], JOURS), null, a);
  const par = (cle: string) => ms.find((x) => x.cle === cle);
  check("chaque matière porte ses réponses par période (0 : aucune) : Éthique 12 / 80 / 0 / 200 ; Économie 0 partout", JSON.stringify(par("ethics")?.reponses) === JSON.stringify({ 3: 12, 30: 80, 60: 0, 90: 200 }) && JSON.stringify(par("economics")?.reponses) === JSON.stringify({ 3: 0, 30: 0, 60: 0, 90: 0 }));
  const g = globaleSynthese(m, historiqueEn([], JOURS), a);
  check("la globale fait la somme des matières : 42 réponses en 3 j, 124 en 30 j, 0 en 60 j, 200 en 90 j", JSON.stringify(g.reponses) === JSON.stringify({ 3: 42, 30: 124, 60: 0, 90: 200 }), JSON.stringify(g.reponses));
  const vide = globaleSynthese(m, historiqueEn([], JOURS), activiteEn([]));
  check("aucune réponse nulle part : 0 partout (pas null : la source a répondu)", JSON.stringify(vide.reponses) === JSON.stringify({ 3: 0, 30: 0, 60: 0, 90: 0 }) && !JSON.stringify(vide).includes("NaN"));
}

// ── les lecteurs mémorisés : null au moindre accroc ─────────────────────────

async function lecteurs() {
  titre("# lecteurs mémorisés");
  const dates = datesSynthese(MAINTENANT);
  const faux = (reponse: () => unknown) => {
    const appels: { nom: string; args: Record<string, unknown> }[] = [];
    const client = {
      async rpc(nom: string, args: Record<string, unknown>) {
        appels.push({ nom, args });
        return reponse();
      },
    } as unknown as SupabaseClient;
    return { appels, client };
  };
  const valide = { v: 1, historique: [], notions: {}, calcul: {}, moyennes: {} };

  const ok = faux(() => ({ data: valide, error: null }));
  const a1 = await lireMaitriseSynthese(ok.client, "u-ok", dates);
  const a2 = await lireMaitriseSynthese(ok.client, "u-ok", dates);
  check("réponse valide : rendue, et gardée (une seule requête pour le même joueur)", a1 !== null && a2 === a1 && ok.appels.length === 1);
  check("l'appel : maitrise_synthese, le joueur et les 16 dates", ok.appels[0].nom === "maitrise_synthese" && ok.appels[0].args.p_user === "u-ok" && Array.isArray(ok.appels[0].args.p_dates) && (ok.appels[0].args.p_dates as string[]).length === 16);
  await lireMaitriseSynthese(ok.client, "u-autre", dates);
  check("un autre joueur : sa propre lecture", ok.appels.length === 2 && ok.appels[1].args.p_user === "u-autre");

  const erreur = faux(() => ({ data: null, error: { message: "fonction absente" } }));
  const e1 = await lireMaitriseSynthese(erreur.client, "u-err", dates);
  const e2 = await lireMaitriseSynthese(erreur.client, "u-err", dates);
  check("la fonction répond par une erreur (migration pas collée) : null, gardé un court moment", e1 === null && e2 === null && erreur.appels.length === 1);

  const leve = faux(() => {
    throw new Error("réseau");
  });
  check("la requête lève une exception : null, sans exception", (await lireMaitriseSynthese(leve.client, "u-leve", dates)) === null && (await lireRythme(leve.client, "u-leve2")) === null);

  const nul = faux(() => ({ data: null, error: null }));
  check("la fonction rend NULL (prérequis absents) : null", (await lireMaitriseSynthese(nul.client, "u-nul", dates)) === null);

  const bizarre = faux(() => ({ data: { historique: "x" }, error: null }));
  const texte = faux(() => ({ data: "texte", error: null }));
  check("un JSON de travers : null", (await lireMaitriseSynthese(bizarre.client, "u-biz", dates)) === null && (await lireMaitriseSynthese(texte.client, "u-txt", dates)) === null);

  const sans = faux(() => ({ data: valide, error: null }));
  check("sans client de service : null, aucune requête", (await lireMaitriseSynthese(null, "u-sans", dates)) === null && (await lireRythme(null, "u-sans")) === null && sans.appels.length === 0);

  const ryt = faux(() => ({ data: { v: 1, sec: 100, n: 50, matieres: {} }, error: null }));
  const r1 = await lireRythme(ryt.client, "u-ryt");
  check("rythme : rendu, appel rythme_joueur sur 90 jours", r1 !== null && ryt.appels[0].nom === "rythme_joueur" && ryt.appels[0].args.p_jours === 90 && ryt.appels[0].args.p_user === "u-ryt");
  const rerr = faux(() => ({ data: null, error: { message: "x" } }));
  const rtxt = faux(() => ({ data: [1, 2], error: null }));
  check("rythme : erreur ou JSON inattendu : null", (await lireRythme(rerr.client, "u-rerr")) === null && (await lireRythme(rtxt.client, "u-rtxt")) === null);

  const act = faux(() => ({ data: { v: 1, depuis: [{ i: 1, matieres: { ethics: { n: 3, justes: 2 } } }] }, error: null }));
  const ac1 = await lireActivite(act.client, "u-act", dates);
  const ac2 = await lireActivite(act.client, "u-act", dates);
  const pd = act.appels[0]?.args.p_dates as string[] | undefined;
  check("activité : rendue et gardée (une requête), appel activite_depuis avec le joueur", ac1 !== null && ac2 === ac1 && act.appels.length === 1 && act.appels[0].nom === "activite_depuis" && act.appels[0].args.p_user === "u-act");
  check("activité : les 4 dates des comparaisons, dans l'ordre 3, 30, 60, 90 jours (rangs 15, 0, 1, 2 de datesSynthese)", Array.isArray(pd) && pd.length === 4 && pd.join() === [dates[15], dates[0], dates[1], dates[2]].join());
  const aerr = faux(() => ({ data: null, error: { message: "fonction absente" } }));
  const anul = faux(() => ({ data: null, error: null }));
  const abiz = faux(() => ({ data: { v: 1, depuis: "x" }, error: null }));
  check(
    "activité : migration pas collée, NULL, JSON de travers, exception, pas de client de service : null",
    (await lireActivite(aerr.client, "u-aerr", dates)) === null &&
      (await lireActivite(anul.client, "u-anul", dates)) === null &&
      (await lireActivite(abiz.client, "u-abiz", dates)) === null &&
      (await lireActivite(leve.client, "u-aleve", dates)) === null &&
      (await lireActivite(null, "u-asans", dates)) === null,
  );
}

// ── la place sans relire la note, le Codex sans historique ──────────────────
titre("# lectures");
async function lectures() {
  const faux = (appels: string[]) =>
    ({
      from(table: string) {
        appels.push(table);
        const b: Record<string, unknown> = {};
        b.select = () => b;
        b.eq = () => b;
        b.gt = () => b;
        b.maybeSingle = async () => ({ data: { user_id: "u", elo: 1478, games_played: 9 }, error: null });
        b.then = (res: (v: unknown) => unknown) => res({ count: 6, error: null });
        return b;
      },
    }) as unknown as SupabaseClient;
  const a1: string[] = [];
  const p1 = await getLeaderboardRank(faux(a1), "u");
  const a2: string[] = [];
  const p2 = await getLeaderboardRank(faux(a2), "u", 1478);
  check("getLeaderboardRank : sans ELO connu, 3 lectures ; avec, 2 (la note n'est pas relue)", a1.length === 3 && a2.length === 2 && p1 === 7 && p2 === 7, `${a1.length} ${a2.length} ${p1} ${p2}`);

  const ligne = (quete_id: string, etat: string, extra: Record<string, unknown> = {}) => ({ quete_id, periode: "", etat, xp: 20, cosmetique: null, titre: null, vu: true, retro: false, terminee_le: "2026-10-20T10:00:00Z", recompensee_le: "2026-10-20T10:00:00Z", ...extra });
  const lignesCodex = [ligne("a:1", "recompensee"), ligne("a:2", "recompensee"), ligne("a:3", "terminee"), ligne("acte:x", "recompensee")] as Parameters<typeof codexMoiDe>[0];
  const complet = codexMoiDe(lignesCodex, { sobre: true, titre: (id) => id });
  const leger = codexMoiDe(lignesCodex, { sobre: true, historique: false, titre: () => { throw new Error("titre lu"); } });
  check("Codex sans historique : mêmes comptes, ni historique ni titres lus", leger.faites === complet.faites && leger.xp === complet.xp && leger.aRecuperer === complet.aRecuperer && leger.historique.length === 0 && leger.plusAnciennes === 0 && complet.historique.length > 0, JSON.stringify(leger));
}

lectures().then(lecteurs).then(() => {
  console.log("");
console.log(ko === 0 ? "Tout est vert." : `${ko} échec(s).`);
  process.exit(ko === 0 ? 0 : 1);
});
