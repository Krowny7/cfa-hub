// Tests des sept tuiles de plus de la page de profil : Duels, Jour J, Matière
// phare, Classement, Examens blancs, Codex, Rythme (components/profil/blocs/
// Duels.tsx, JourJ.tsx, Phare.tsx, Classement.tsx, Examens.tsx, CodexTuile.tsx,
// Rythme.tsx ; lib/profil/tuiles-neuves.ts), sans base ni réseau ni navigateur
// (rendu statique par react-dom/server).
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-tuiles-neuves.tsx
// Les fonctions pures (suite des duels, jours restants, variation sur 7 jours,
// matrice du rythme en heure de Paris, quête en cours…), puis chaque tuile à
// chaque format permis, chez un autre, chez soi, sans données et dans
// Personnaliser : sans erreur, sans comparaison, le même dessin chez soi et
// chez un autre, la confidentialité (rien d'un Journal fermé), le CSS.
import "./sans-css";
import "./react-global";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DuelsBloc } from "@/components/profil/blocs/Duels";
import { JourJBloc } from "@/components/profil/blocs/JourJ";
import { PhareBloc } from "@/components/profil/blocs/Phare";
import { ClassementBloc } from "@/components/profil/blocs/Classement";
import { ExamensBloc, sensExamen } from "@/components/profil/blocs/Examens";
import { CodexBloc } from "@/components/profil/blocs/CodexTuile";
import { RythmeBloc, jourFort, niveauRythme } from "@/components/profil/blocs/Rythme";
import { ICONE_BLOC } from "@/components/profil/BlocsProfil";
import { BLOCS, FORMATS_PERMIS, FORMAT_DEFAUT, formatPermis, raisonRefus, validerDisposition, type CleBloc, type Format } from "@/lib/profil/disposition";
import { aDuContenu, matierePhare, parHeure, type DonneesBlocs } from "@/lib/profil/blocs-donnees";
import { montre } from "@/lib/profil/modeles-page";
import {
  BESOINS_TOUS,
  RYTHME_MIN,
  aDesBesoins,
  besoinsDe,
  classementDepuis,
  codexDepuis,
  examensDepuis,
  formeDesDuels,
  heurePic,
  jourHeureParis,
  jourJDepuis,
  matriceRythme,
  momentDe,
  rythmeDepuis,
  texteRecompense,
  variationElo,
} from "@/lib/profil/tuiles-neuves";
import { BLOCS_NEUVES as V, JOURS_SEMAINE, leJour } from "@/lib/voice-blocs-neuves";
import { NBSP } from "@/lib/voice";
import { CLASSEMENT_RICHE, CODEX_RICHE, EXAMENS_RICHE, FORME_DUELS_RICHE, JOUR_J_RICHE, RICHE, RICHE_TOI, RYTHME_RICHE, SOBRE, DISPO_RICHE, grilleExemple } from "./donnees-blocs-exemple";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const egal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const compte = (html: string, motif: string) => html.split(motif).length - 1;
/** le texte à l'écran, sans balises ni commentaires de React (les entités de base décodées) */
const texte = (html: string) => html.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/[ \t\n\r]+/g, " ");
/** un texte attendu avec les espaces insécables de nombre() et pct() : entre les milliers et avant « % » */
const nb = (s: string) => s.replace(/(\d) (\d{3})/g, `$1${NBSP}$2`).replace(/ %/g, `${NBSP}%`);

// ── Les fonctions pures ──────────────────────────────────────────────────

console.log("# Duels : les 5 derniers");
{
  const l = (w: string | null, t: string) => ({ winner_id: w, finished_at: t });
  const lignes = [l("moi", "2026-10-01T10:00:00Z"), l("lui", "2026-10-02T10:00:00Z"), l(null, "2026-10-03T10:00:00Z"), l("moi", "2026-10-04T10:00:00Z"), l("moi", "2026-10-05T10:00:00Z"), l("lui", "2026-10-06T10:00:00Z"), l("moi", "2026-09-01T10:00:00Z")];
  check("les 5 plus récents, du plus ancien au plus récent (V gagné, D perdu, N sans gagnant)", egal(formeDesDuels(lignes, "moi"), ["D", "N", "V", "V", "D"]), JSON.stringify(formeDesDuels(lignes, "moi")));
  check("dans n'importe quel ordre : même suite", egal(formeDesDuels([...lignes].reverse(), "moi"), formeDesDuels(lignes, "moi")));
  check("moins de 5 duels : tous, jamais plus de 5", formeDesDuels(lignes.slice(0, 2), "moi").length === 2 && formeDesDuels(lignes, "moi").length === 5);
  check("aucun duel : suite vide", formeDesDuels([], "moi").length === 0);
  check("l'autre joueur : les mêmes duels vus de son côté", formeDesDuels(lignes.slice(0, 2), "lui").join("") === "DV");
}

console.log("# Jour J : jours restants");
{
  const j = jourJDepuis("2026-11-12", "2026-10-18", 68.4);
  check("25 jours, la date, le programme couvert arrondi", !!j && j.jours === 25 && j.date === "2026-11-12" && j.couverture === 68, JSON.stringify(j));
  check("le jour même : 0 jour", jourJDepuis("2026-10-18", "2026-10-18", 10)?.jours === 0);
  check("examen passé : rien", jourJDepuis("2026-10-17", "2026-10-18", 10) === null);
  check("pas de date, date illisible : rien", jourJDepuis(null, "2026-10-18", 10) === null && jourJDepuis("12/11/2026", "2026-10-18", 10) === null && jourJDepuis(undefined, "2026-10-18", 10) === null);
  check("couverture 0, inconnue ou absurde : pas de barre, borne à 100", jourJDepuis("2026-11-12", "2026-10-18", 0)?.couverture === null && jourJDepuis("2026-11-12", "2026-10-18", null)?.couverture === null && jourJDepuis("2026-11-12", "2026-10-18", 140)?.couverture === 100);
  check("à cheval sur le passage à l'heure d'hiver : 8 jours entiers", jourJDepuis("2026-10-31", "2026-10-23", null)?.jours === 8 && jourJDepuis("2026-11-02", "2026-10-24", null)?.jours === 9);
  check("la date en toutes lettres", leJour("2026-11-12") === "le 12 novembre" && leJour("2027-01-01") === "le 1er janvier" && leJour("2026-08-05") === "le 5 août");
}

console.log("# Classement : la variation sur 7 jours, le palier");
{
  const ev = (t: string, avant: number, apres: number) => ({ created_at: t, elo_before: avant, elo_after: apres });
  const depuis = Date.parse("2026-10-12T12:00:00Z");
  const evs = [ev("2026-10-05T10:00:00Z", 1400, 1410), ev("2026-10-13T10:00:00Z", 1454, 1466), ev("2026-10-16T10:00:00Z", 1466, 1478)];
  check("l'ELO actuel moins l'ELO d'avant le premier match de la période", variationElo(evs, 1478, depuis) === 24);
  check("aucun match dans la période : 0", variationElo(evs.slice(0, 1), 1410, depuis) === 0 && variationElo([], 1200, depuis) === 0);
  check("une baisse est négative", variationElo([ev("2026-10-14T10:00:00Z", 1500, 1482)], 1482, depuis) === -18);
  check(
    "deux matchs à la même seconde : le premier de la chaîne, quel que soit l'ordre de lecture",
    variationElo([ev("2026-10-14T10:00:00Z", 1512, 1524), ev("2026-10-14T10:00:00Z", 1500, 1512)], 1524, depuis) === 24 &&
      variationElo([ev("2026-10-14T10:00:00Z", 1500, 1512), ev("2026-10-14T10:00:00Z", 1512, 1524)], 1524, depuis) === 24,
  );
  check("dans le désordre : même résultat", variationElo([...evs].reverse(), 1478, depuis) === 24);
  const c = classementDepuis({ place: 7, joueurs: 412, elo: 1478, maitrise: 64, variation: 24 })!;
  check("Platine II, 52 % du palier, 72 ELO pour Diamant", c.palier === 3 && c.division === "II" && c.suivant === "Diamant" && c.points === 72 && c.progress === 52 && c.place === 7 && c.joueurs === 412 && c.variation === 24, JSON.stringify(c));
  check("pas de place : rien ; un total plus petit que la place est écarté", classementDepuis({ place: null, joueurs: 10, elo: 1200, maitrise: null, variation: 0 }) === null && classementDepuis({ place: 5, joueurs: 3, elo: 1200, maitrise: null, variation: 0 })?.joueurs === null);
  check("la maîtrise verrouille le palier, comme l'en-tête (1 600 ELO, 40 % : pas Diamant)", classementDepuis({ place: 30, joueurs: 100, elo: 1600, maitrise: 40, variation: 0 })!.palier < 4 && classementDepuis({ place: 30, joueurs: 100, elo: 1600, maitrise: 70, variation: 0 })!.palier === 4);
  check("égal aux données d'exemple", egal(classementDepuis({ place: 7, joueurs: 412, elo: 1478, maitrise: 64, variation: 24 }), CLASSEMENT_RICHE));
}

console.log("# Examens blancs");
{
  const l = (score: number | null, total: number | null, t: string | null, titre?: string) => ({ score, total, completed_at: t, mock_exams: titre ? { title: titre } : null });
  const x = examensDepuis([l(74, 100, "2026-10-12T10:00:00Z", "Blanc 3"), l(58, 100, "2026-09-01T10:00:00Z", "Blanc 1"), l(53, 90, "2026-09-20T10:00:00Z"), l(5, 0, "2026-10-01T10:00:00Z"), l(null, 10, null)])!;
  check("du plus ancien au plus récent, en pourcentage arrondi", egal(x.scores.map((s) => s.pct), [58, 59, 74]), JSON.stringify(x.scores));
  check("les titres suivent, un total nul ou un score absent est écarté", x.scores[0].titre === "Blanc 1" && x.scores[1].titre === null && x.n === 3);
  const douze = Array.from({ length: 14 }, (_, i) => l(50 + i, 100, `2026-09-${String(i + 1).padStart(2, "0")}T10:00:00Z`));
  const d = examensDepuis(douze)!;
  check("dix examens au plus, les derniers ; n garde le compte", d.scores.length === 10 && d.scores[0].pct === 54 && d.scores[9].pct === 63 && d.n === 14);
  check("aucun examen : rien", examensDepuis([]) === null && examensDepuis([l(3, 0, null)]) === null);
  check("le titre d'une jointure en liste", examensDepuis([{ score: 1, total: 2, completed_at: "2026-10-01T10:00:00Z", mock_exams: [{ title: "Liste" }] }])!.scores[0].titre === "Liste");
  check("le sens d'une note : 70 et plus ok, sous 60 ko, entre les deux moyen", sensExamen(70) === "ok" && sensExamen(100) === "ok" && sensExamen(69) === "moyen" && sensExamen(60) === "moyen" && sensExamen(59) === "ko");
}

console.log("# Rythme : la matrice 7 × 24 en heure de Paris");
{
  check("lundi 19 oct. 2026, 19 h 30 UTC : lundi 21 h 30 à Paris (heure d'été)", egal(jourHeureParis(Date.parse("2026-10-19T19:30:00Z")), [0, 21]));
  check("mardi 1er déc., 19 h 30 UTC : mardi 20 h 30 (heure d'hiver)", egal(jourHeureParis(Date.parse("2026-12-01T19:30:00Z")), [1, 20]));
  check("minuit passé à Paris : mardi 0 h (jamais 24)", egal(jourHeureParis(Date.parse("2026-10-19T22:30:00Z")), [1, 0]));
  check("le passage à l'heure d'été (dimanche 29 mars 2026) : 0 h 30 UTC, c'est dimanche 1 h 30", egal(jourHeureParis(Date.parse("2026-03-29T00:30:00Z")), [6, 1]));
  check("dimanche 23 h 59 UTC en hiver : lundi 0 h 59 à Paris", egal(jourHeureParis(Date.parse("2026-12-06T23:59:00Z")), [0, 0]));
  check("un instant illisible : rien", jourHeureParis(NaN) === null);
  const m = matriceRythme([{ t: "2026-10-19T19:30:00Z" }, { t: "2026-10-19T19:45:00Z" }, { t: "2026-10-20T07:10:00Z", w: 5 }, { t: "n'importe quoi" }, { t: "2026-10-19T19:50:00Z", w: 0 }]);
  check("7 lignes de 24 colonnes", m.grille.length === 7 && m.grille.every((l) => l.length === 24));
  check("les réponses à leur case, les poids comptés, l'illisible et le poids nul écartés", m.grille[0][21] === 2 && m.grille[1][9] === 5 && m.total === 7);
  const brut = Array.from({ length: RYTHME_MIN - 1 }, (_, i) => ({ t: `2026-10-${String(1 + (i % 28)).padStart(2, "0")}T18:00:00Z` }));
  check("moins de 30 réponses : rien à dire", rythmeDepuis(brut) === null && rythmeDepuis([]) === null);
  const soir = Array.from({ length: 60 }, (_, i) => ({ t: new Date(Date.UTC(2026, 9, 1 + (i % 28), i % 5 === 0 ? 5 : 19, 15)).toISOString() }));
  const r = rythmeDepuis(soir)!;
  check("30 réponses ou plus : la grille, l'heure forte, le moment (soir)", !!r && r.total === 60 && r.pic === 21 && r.moment === "soir", JSON.stringify({ pic: r?.pic, moment: r?.moment }));
  check("rien qu'un nombre : ni horodatage ni texte dans ce qui part au client", Object.keys(r).sort().join() === "grille,moment,pic,total" && !/\d{4}-\d{2}-\d{2}/.test(JSON.stringify(r)) && r.grille.flat().every((v) => Number.isInteger(v)));
  const h = Array.from({ length: 24 }, () => 0);
  check("le premier pic en cas d'égalité", heurePic(h) === 0 && heurePic(Object.assign([...h], { 7: 3, 20: 3 })) === 7);
  const dans = (heures: number[]) => momentDe(Object.assign([...h], Object.fromEntries(heures.map((x) => [x, 4]))));
  check("les moments : matin, midi, après-midi, soir, nuit", dans([8, 9]) === "matin" && dans([12, 13]) === "midi" && dans([15, 16]) === "apres-midi" && dans([20, 21]) === "soir" && dans([23, 2]) === "nuit" && dans([0, 3, 4]) === "nuit");
  check("l'exemple : 21 h, le soir", heurePic(parHeure(RYTHME_RICHE.grille)) === 21 && momentDe(parHeure(RYTHME_RICHE.grille)) === "soir" && RYTHME_RICHE.grille.length === 7 && grilleExemple().flat().length === 168);
  check("le niveau d'encre : 0 vide, 1 à 4, la racine de la part du maximum", niveauRythme(0, 10) === 0 && niveauRythme(1, 100) === 1 && niveauRythme(10, 100) === 1 && niveauRythme(20, 100) === 2 && niveauRythme(50, 100) === 3 && niveauRythme(90, 100) === 4 && niveauRythme(100, 100) === 4 && niveauRythme(5, 0) === 0);
  check("le jour le plus actif", jourFort([[1], [9], [2], [0], [0], [0], [3]]) === 1 && JOURS_SEMAINE[jourFort(RYTHME_RICHE.grille)][1].length > 3);
}

console.log("# Codex : le fil, l'acte en cours, la quête en cours");
{
  const f = (...ids: string[]) => ids.map((quete_id) => ({ quete_id, etat: "recompensee" }));
  const neuf = codexDepuis([])!;
  check("rien de fait : le prologue en cours, le fil de 6 étapes (prologue, actes II à VI)", neuf.fil.length === 6 && neuf.fil.map((e) => e.marque).join(" ") === "P II III IV V VI" && neuf.fil[0].etat === "cours" && neuf.fil.slice(1).every((e) => e.etat === "avenir") && neuf.acte?.numero === 0 && neuf.acte.total === 6);
  check("la quête en cours : la première de la trame du prologue, avec sa récompense en XP", !!neuf.quete && neuf.quete.titre.length > 3 && /XP/.test(neuf.quete.recompense), JSON.stringify(neuf.quete));
  const suite = codexDepuis(f("trame:prologue:premier-trait"))!;
  check("une quête faite : la suivante, sans les facultatives (ordre 2 : « la date sur le chevalet »)", suite.quete?.titre !== neuf.quete?.titre && !/chevalet/i.test(suite.quete?.titre ?? ""), suite.quete?.titre);
  const quatre = codexDepuis(f("acte:prologue", "acte:acte2", "acte:acte3", "trame:a4:blanc"))!;
  check("prologue, II et III clos : l'acte IV en cours, 3 faites, 1 en cours, 2 à venir", egal(quatre.fil.map((e) => e.etat), ["fait", "fait", "fait", "cours", "avenir", "avenir"]) && quatre.acte?.numero === 4 && quatre.acte.total === 6);
  check("la quête en cours de l'acte IV : après « Rendre un premier examen blanc »", quatre.quete?.titre !== "Rendre un premier examen blanc" && !!quatre.quete);
  const sans = codexDepuis(f("acte:prologue", "acte:acte2", "acte:acte3"))!;
  check("acte IV, rien de fait : « Rendre un premier examen blanc » d'abord", sans.quete?.titre === "Rendre un premier examen blanc" && sans.quete.recompense.includes("150"), JSON.stringify(sans.quete));
  const tout = codexDepuis(f("acte:prologue", "acte:acte1", "acte:acte2", "acte:acte3", "acte:acte4", "acte:acte5", "acte:acte6"))!;
  check("le fil achevé : tout est fait, plus d'acte ni de quête", tout.acte === null && tout.quete === null && tout.fil.every((e) => e.etat === "fait"));
  const fil = codexDepuis(f("acte:prologue", "acte:acte2", "acte:acte3", "acte:acte4", "acte:acte5", "acte:acte6"))!;
  check("le fil clos, l'acte I (les outils) encore ouvert : le fil est tout de même achevé", fil.acte === null && fil.fil.every((e) => e.etat === "fait"));
  check("les lignes non faites ne comptent pas", codexDepuis([{ quete_id: "acte:prologue", etat: "active" }])!.fil[0].etat === "cours");
  check("la récompense en clair", texteRecompense({ xp: 150 }) === `150${NBSP}XP` && texteRecompense({ xp: 0 }) === "" && texteRecompense({ xp: 300, folio: "folio:adoration" }).startsWith(`300${NBSP}XP · folio « `));
  check("l'exemple : l'acte IV sur VI", CODEX_RICHE.acte?.numero === 4 && CODEX_RICHE.fil.length === 6);
}

console.log("# Quelles lectures");
{
  const b = besoinsDe(new Set(["duels", "radar", "codex"]));
  check("seules les tuiles posées sont lues", b.duels && b.codex && !b.jourj && !b.classement && !b.examens && !b.rythme && aDesBesoins(b));
  check("aucune tuile de plus posée : rien à lire", !aDesBesoins(besoinsDe(new Set(["vitrine", "phare", "carnet"]))));
  check("Personnaliser : tout se lit", Object.values(BESOINS_TOUS).every(Boolean));
}

// ── Les blocs ────────────────────────────────────────────────────────────

const blocs = { duels: DuelsBloc, jourj: JourJBloc, phare: PhareBloc, classement: ClassementBloc, examens: ExamensBloc, codex: CodexBloc, rythme: RythmeBloc } as const;
type Cle = keyof typeof blocs;
const CLES = Object.keys(blocs) as Cle[];
const rend = (n: React.ReactNode) => renderToStaticMarkup(<>{n}</>);
const r = (k: Cle, d: DonneesBlocs, f: Format, edition = false) => rend(blocs[k]({ d, f, edition }));

const AUTRE: DonneesBlocs = RICHE_TOI;
const APERCU: DonneesBlocs = { ...RICHE, apercu: true };
const MOI: DonneesBlocs = { ...RICHE_TOI, moi: true, toi: null };
const VUES: [string, DonneesBlocs][] = [
  ["chez un autre", AUTRE],
  ["aperçu", APERCU],
  ["chez soi", MOI],
];
const SANS_RIEN: DonneesBlocs = { ...SOBRE, stats: { ...SOBRE.stats, duelsJoues: 0, duelsGagnes: 0, matieres: [] } };

console.log("# Branchements");
{
  const nouveaux: CleBloc[] = ["duels", "jourj", "phare", "classement", "examens", "codex", "rythme"];
  // 18 : les 17 d'avant, puis le temps sur le site (« Temps sur le site », hors des sept)
  check("BLOCS : les 7 nouvelles tuiles, marquées « neuf »", nouveaux.every((k) => BLOCS.some((b) => b.k === k && "neuf" in b && b.neuf)) && BLOCS.length === 18);
  check("formats permis : tous sauf la matière phare (pas de bande)", CLES.every((k) => (k === "phare" ? egal(FORMATS_PERMIS[k], ["tuile", "colonne", "heros", "demi"]) : egal(FORMATS_PERMIS[k], ["tuile", "colonne", "heros", "bande", "demi"]))));
  check("formats par défaut : tuiles, sauf examens, codex et rythme en héros", FORMAT_DEFAUT.duels === "tuile" && FORMAT_DEFAUT.jourj === "tuile" && FORMAT_DEFAUT.phare === "tuile" && FORMAT_DEFAUT.classement === "tuile" && FORMAT_DEFAUT.examens === "heros" && FORMAT_DEFAUT.codex === "heros" && FORMAT_DEFAUT.rythme === "heros");
  check("la matière phare refuse la bande, avec sa raison", formatPermis("phare", "bande") === "heros" && raisonRefus({ k: "phare", f: "tuile" }, "bande").includes("jauge"));
  check("une icône par tuile", CLES.every((k) => !!ICONE_BLOC[k]));
  const v = validerDisposition(nouveaux.map((k) => ({ k, f: "bande" })), "lecture");
  check("la validation les connaît (une fois chacune, format permis)", v.disposition.length === 7 && v.disposition.every((e) => e.k !== "libre" && e.k !== "media" && e.k !== "carte" && FORMATS_PERMIS[e.k].includes(e.f)) && v.disposition.find((e) => e.k === "phare")!.f === "heros");
  // (la page d'exemple est pleine à 20 éléments : le temps sur le site n'y tient plus)
  check("la page d'exemple pose les 17 blocs", BLOCS.filter((b) => b.k !== "temps").every((b) => DISPO_RICHE.some((e) => e.k === b.k)) && DISPO_RICHE.length === 20);
  check("les modèles ne posent le jour J, les examens et le rythme que si le Journal est public", !montre("jourj", { ...RICHE, visibiliteJournal: "friends" }) && !montre("rythme", { ...RICHE, visibiliteJournal: "private" }) && montre("jourj", RICHE) && montre("examens", RICHE) && !montre("examens", { ...RICHE, visibiliteJournal: "friends" }) && montre("duels", { ...RICHE, visibiliteJournal: "friends" }));
}

console.log("# aDuContenu");
{
  const a = (k: Cle, d: DonneesBlocs) => aDuContenu({ k, f: "tuile" }, d);
  check("tout rempli : les sept ont du contenu", CLES.every((k) => a(k, RICHE)));
  check("Paul D., presque rien : seule la matière phare (FSA et Éthique à 40 réponses)", CLES.filter((k) => a(k, SOBRE)).join() === "phare");
  check("duels : des duels joués", a("duels", RICHE) && !a("duels", SANS_RIEN));
  check("phare : une matière à 10 réponses au moins", a("phare", RICHE) && !a("phare", SANS_RIEN) && matierePhare([{ key: "fsa", pct: 90, answered: 9 }]) === null && matierePhare([{ key: "fsa", pct: null, answered: 50 }]) === null);
  check("la matière phare : la plus haute, à égalité la plus travaillée", matierePhare(RICHE.stats.matieres)?.key === "fsa" && matierePhare([{ key: "a", pct: 70, answered: 20 }, { key: "b", pct: 70, answered: 80 }, { key: "c", pct: 60, answered: 900 }])?.key === "b");
  check("jour J, classement, codex, rythme : leur lecture ; examens : au moins un", !a("jourj", { ...RICHE, jourJ: null }) && !a("classement", { ...RICHE, classement: null }) && !a("codex", { ...RICHE, codex: null }) && !a("rythme", { ...RICHE, rythme: null }) && !a("examens", { ...RICHE, examens: { scores: [], n: 0 } }) && !a("examens", { ...RICHE, examens: null }));
  check("champs absents (page d'avant) : rien, sans erreur", CLES.filter((k) => k !== "phare" && k !== "duels").every((k) => !a(k, { ...SOBRE, formeDuels: undefined })));
}

console.log("# Rendu : chaque tuile, chaque format permis, chaque vue");
for (const k of CLES) {
  for (const [nom, d] of VUES) {
    const rates: string[] = [];
    for (const f of FORMATS_PERMIS[k]) {
      try {
        const html = r(k, d, f);
        if (!html.includes("<section")) rates.push(`${f} (rien)`);
        if (/toi [−+±]|toi 0 –|toi – –|toi [0-9]+ –/.test(texte(html))) rates.push(`${f} (comparaison)`);
        if (/undefined|NaN|\[object/.test(html)) rates.push(`${f} (undefined/NaN)`);
        r(k, d, f, true);
      } catch (e) {
        rates.push(`${f} (${(e as Error).message})`);
      }
    }
    check(`${k} : rendu à chaque format permis (${FORMATS_PERMIS[k].join(", ")}), ${nom}, sans comparaison`, rates.length === 0, rates.join(" ; "));
  }
}

console.log("# Le même dessin chez soi et chez un autre");
for (const k of CLES) {
  const memes = FORMATS_PERMIS[k].filter((f) => r(k, AUTRE, f) !== r(k, MOI, f) || r(k, AUTRE, f) !== r(k, APERCU, f));
  // l'aperçu ne diffère que par les données : RICHE et RICHE_TOI portent les mêmes champs de ces tuiles
  check(`${k} : chez un autre, en aperçu et chez soi, exactement le même balisage`, memes.length === 0, memes.join(", "));
  check(`${k} : ni jeton « toi », ni score de tuile, ni double trait`, FORMATS_PERMIS[k].every((f) => !/\bjeton\b|ScoreTuile|\bdouble\b|\btoi\b/.test(r(k, AUTRE, f))));
}

console.log("# Rien à montrer : rien en vue publique, l'état vide dans Personnaliser");
for (const k of CLES) {
  const d = k === "phare" || k === "duels" ? SANS_RIEN : SOBRE;
  const publics = FORMATS_PERMIS[k].filter((f) => r(k, d, f) !== "");
  const dit = (html: string) => ["rien à montrer", "rien pour l&#x27;instant", "Fixe ta date", "pas de date"].some((x) => html.includes(x));
  const editions = FORMATS_PERMIS[k].filter((f) => !dit(r(k, { ...d, moi: true }, f, true)));
  check(`${k} : sans données, rien en vue publique`, publics.length === 0, publics.join(", "));
  check(`${k} : sans données, Personnaliser garde la coque et le dit`, editions.length === 0, editions.join(", "));
}

console.log("# Duels");
{
  const tuile = r("duels", RICHE, "tuile");
  const t = texte(tuile);
  check("l'anneau à 67 % (18 victoires sur 27), le nombre de duels, « 18 V · 9 D »", t.includes(nb("67 %")) && t.includes("27") && t.includes("duels") && t.includes("de victoires") && /18 V · 9 D/.test(t), t.slice(0, 200));
  check("l'anneau est à la couleur du joueur", tuile.includes("--k:#e0674b") && tuile.includes("--p:67"));
  check("les 5 derniers duels en pastilles V V D V N, dans l'ordre", compte(tuile, 'data-i="') === 5 && /data-i="V"[^>]*>V<.*data-i="V"[^>]*>V<.*data-i="D"[^>]*>D<.*data-i="V"[^>]*>V<.*data-i="N"[^>]*>N</.test(tuile) && tuile.includes("Victoire") && tuile.includes("Défaite") && tuile.includes("Nul"));
  check("Journal fermé (suite absente) : le taux et les totaux restent, pas de pastille", !r("duels", { ...RICHE, formeDuels: null }, "tuile").includes("data-i=") && texte(r("duels", { ...RICHE, formeDuels: null }, "tuile")).includes(nb("67 %")));
  check("Personnaliser : la suite des derniers duels dit qui la voit", r("duels", { ...MOI, visibiliteJournal: "friends" }, "tuile", true).includes("visibles par tes amis") && !r("duels", MOI, "tuile").includes("visibles par"));
  const demi = texte(r("duels", RICHE, "demi"));
  check("demi-bande : « Duels 27 », « Victoires 67 % », les pastilles", demi.includes("Duels") && demi.includes("27") && demi.includes("Victoires") && demi.includes(nb("67 %")) && compte(r("duels", RICHE, "demi"), 'data-i="') === 5);
  const parfait = texte(r("duels", { ...RICHE, stats: { ...RICHE.stats, duelsJoues: 12, duelsGagnes: 12 } }, "tuile"));
  check("12 sur 12 : 100 %, 0 défaite ; 1 sur 300 : 1 % (jamais 0)", parfait.includes(nb("100 %")) && /12 V · 0 D/.test(parfait) && texte(r("duels", { ...RICHE, stats: { ...RICHE.stats, duelsJoues: 300, duelsGagnes: 1 } }, "tuile")).includes(nb("1 %")));
  check("des victoires de trop (stats incohérentes) : bornées aux duels joués", texte(r("duels", { ...RICHE, stats: { ...RICHE.stats, duelsJoues: 5, duelsGagnes: 9 } }, "tuile")).includes(nb("100 %")));
}

console.log("# Jour J");
{
  const t = texte(r("jourj", RICHE, "tuile"));
  check("« J-25 », « le 12 novembre », « programme couvert à 68 % »", t.includes("J-25") && t.includes("le 12 novembre") && t.includes(nb("programme couvert à 68 %")), t.slice(0, 160));
  check("la barre du programme couvert (68 %)", r("jourj", RICHE, "tuile").includes("--w:68%") && r("jourj", RICHE, "tuile").includes("Programme couvert à"));
  check("le jour même : « Jour J »", texte(r("jourj", { ...RICHE, jourJ: { ...JOUR_J_RICHE, jours: 0 } }, "tuile")).includes("Jour J") && !texte(r("jourj", { ...RICHE, jourJ: { ...JOUR_J_RICHE, jours: 0 } }, "tuile")).includes("J-0"));
  check("programme non mesuré : la date seule, sans barre", !r("jourj", { ...RICHE, jourJ: { ...JOUR_J_RICHE, couverture: null } }, "tuile").includes("jjBarre") && texte(r("jourj", { ...RICHE, jourJ: { ...JOUR_J_RICHE, couverture: null } }, "tuile")).includes("le 12 novembre"));
  const inv = r("jourj", { ...MOI, jourJ: null }, "tuile", true);
  check("Personnaliser sans date : l'invitation à la régler dans Moi", inv.includes("Fixe ta date d&#x27;examen") && inv.includes('href="/moi"'));
  check("demi-bande : J-25, la date, le programme couvert, la barre", texte(r("jourj", RICHE, "demi")).includes("J-25") && texte(r("jourj", RICHE, "demi")).includes(nb("68 %")) && r("jourj", RICHE, "demi").includes("--w:68%"));
  check("Personnaliser : qui voit le jour J", r("jourj", { ...MOI, visibiliteJournal: "friends" }, "tuile", true).includes("Visible par : tes amis") && r("jourj", { ...MOI, visibiliteJournal: "friends" }, "demi", true).includes("Visible par : tes amis") && !r("jourj", MOI, "tuile").includes("Visible par"));
  check("la taille du chiffre se tire de la largeur de la case (cqw), pas de pixels fixes", r("jourj", RICHE, "tuile").includes("--w:") && readFileSync("components/profil/blocs/neuves.module.css", "utf8").includes("100cqw"));
}

console.log("# Matière phare");
{
  const html = r("phare", RICHE, "tuile");
  const t = texte(html);
  check("« FSA · 82 % » et le nom complet", t.includes(nb("FSA · 82 %")) && t.includes("Financial Statement Analysis"), t.slice(0, 120));
  check("l'aiguille monte à 82 % (57,6°) et l'arc va à 82", html.includes("--a:57.6deg") && html.includes("--p:82"));
  check("0 % et 100 % : l'aiguille à gauche, à droite", r("phare", { ...RICHE, stats: { ...RICHE.stats, matieres: [{ key: "fsa", pct: 100, answered: 50 }] } }, "tuile").includes("--a:90.0deg") && r("phare", { ...RICHE, stats: { ...RICHE.stats, matieres: [{ key: "fsa", pct: 0, answered: 50 }] } }, "tuile").includes("--a:-90.0deg"));
  check("3 graduations, 2 bornes, une jauge lisible à voix haute", compte(html, 'class="jGrad"') === 3 && html.includes("Financial Statement Analysis : 82") && compte(html, "<text") === 2);
  check("une autre matière : son code et son nom", texte(r("phare", { ...RICHE, stats: { ...RICHE.stats, matieres: [{ key: "fixed_income", pct: 77, answered: 90 }] } }, "tuile")).includes(nb("FI · 77 %")));
  check("héros, colonne et demi-bande se rendent ; pas de bande", ["heros", "colonne", "demi"].every((f) => r("phare", RICHE, f as Format).includes("FSA")) && !FORMATS_PERMIS.phare.includes("bande"));
  check("demi-bande : « FSA », « 82 % », la petite jauge", texte(r("phare", RICHE, "demi")).includes("FSA") && texte(r("phare", RICHE, "demi")).includes(nb("82 %")) && r("phare", RICHE, "demi").includes("jMini"));
}

console.log("# Classement");
{
  const html = r("classement", RICHE, "tuile");
  const t = texte(html);
  check("la place en énorme (7, « e » plus petit)", /<b[^>]*>7<small>e<\/small><\/b>/.test(html));
  check("« sur 412 joueurs · Platine II · 1 478 ELO »", t.includes(nb("sur 412 joueurs")) && t.includes("Platine II") && t.includes(nb("1 478")) && t.includes("ELO"), t);
  check("la variation de la semaine : « ▲ +24 ELO cette semaine », en vert", t.includes("▲ +24 ELO cette semaine") && html.includes('data-s="h"'));
  check("une baisse : ▼ et −, en rouge", texte(r("classement", { ...RICHE, classement: { ...CLASSEMENT_RICHE, variation: -18 } }, "tuile")).includes("▼ −18 ELO cette semaine") && r("classement", { ...RICHE, classement: { ...CLASSEMENT_RICHE, variation: -18 } }, "tuile").includes('data-s="b"'));
  check("variation nulle : rien", !r("classement", { ...RICHE, classement: { ...CLASSEMENT_RICHE, variation: 0 } }, "tuile").includes("cette semaine"));
  check("le 1er : « 1 » et « er »", /<b[^>]*>1<small>er<\/small><\/b>/.test(r("classement", { ...RICHE, classement: { ...CLASSEMENT_RICHE, place: 1 } }, "tuile")));
  check("total inconnu : pas de « sur … joueurs »", !texte(r("classement", { ...RICHE, classement: { ...CLASSEMENT_RICHE, joueurs: null } }, "tuile")).includes("joueurs"));
  check("la puce du palier aux couleurs de son métal (Platine)", html.includes("--m1:#D9E1E8"));
  check("colonne, héros et bande : où il en est dans son palier (72 ELO pour Diamant)", ["colonne", "heros", "bande"].every((f) => texte(r("classement", RICHE, f as Format)).includes(nb("encore 72 ELO pour Diamant"))) && !t.includes("encore 72"));
  check("au sommet : pas de progression", !texte(r("classement", { ...RICHE, classement: { ...CLASSEMENT_RICHE, suivant: null, points: null } }, "heros")).includes("encore"));
  const demi = texte(r("classement", RICHE, "demi"));
  check("demi-bande : 7e, sur 412 joueurs, Platine II, 1 478 ELO, ▲ +24", demi.includes("7e") && demi.includes("412") && demi.includes("Platine II") && demi.includes(nb("1 478")) && demi.includes("+24"));
}

console.log("# Examens blancs");
{
  const html = r("examens", RICHE, "tuile");
  const t = texte(html);
  check("un bâton par examen blanc (4), leurs notes", compte(html, 'data-s="') === 4 && ["58", "66", "71", "74"].every((x) => t.includes(x)));
  check("« Examens blancs · 4 », « meilleur 74 % »", t.includes("Examens blancs · 4") && t.includes(nb("meilleur 74 %")));
  check("vert à 70 % et plus, encre entre 60 et 69, rouge dessous", compte(html, 'data-s="ok"') === 2 && compte(html, 'data-s="moyen"') === 1 && compte(html, 'data-s="ko"') === 1);
  check("la ligne pointillée à 70 %, sa légende", html.includes("--seuil:70%") && t.includes(nb("pointillés : 70 %")));
  check("la hauteur d'un bâton, sa note, son titre en infobulle", html.includes("--h:74%") && html.includes("Examen blanc n° 4 · 74"));
  const dix = { ...RICHE, examens: { scores: Array.from({ length: 10 }, (_, i) => ({ pct: 40 + i * 6, titre: null })), n: 23 } };
  check("dix bâtons au plus ; le total des examens rendus dans le titre", compte(r("examens", dix, "tuile"), 'data-s="') === 10 && texte(r("examens", dix, "tuile")).includes("Examens blancs · 23"));
  check("héros et bande : meilleur, moyenne (67 %), dernier", ["heros", "bande"].every((f) => { const x = texte(r("examens", RICHE, f as Format)); return x.includes("Meilleur") && x.includes("Moyenne") && x.includes(nb("67 %")) && x.includes("Dernier"); }) && !t.includes("Moyenne"));
  const demi = texte(r("examens", RICHE, "demi"));
  check("demi-bande : 4 examens, meilleur 74 %, dernier 74 %, les bâtons sans notes", demi.includes("Examens blancs") && demi.includes(nb("meilleur 74 %")) && demi.includes("Dernier") && compte(r("examens", RICHE, "demi"), 'data-s="') === 4 && !r("examens", RICHE, "demi").includes("eVal"));
  check("Personnaliser : qui voit les examens", r("examens", { ...MOI, visibiliteJournal: "private" }, "tuile", true).includes("Visible par : toi seul"));
}

console.log("# Codex");
{
  const html = r("codex", RICHE, "tuile");
  const t = texte(html);
  check("« acte IV sur VI », le fil en 6 cases (P II III IV V VI)", t.includes("acte IV sur VI") && ["P", "II", "III", "IV", "V", "VI"].every((x) => html.includes(`>${x}</span>`)), t);
  check("3 faits, 1 en cours, 2 à venir", compte(html, 'data-e="fait"') === 3 && compte(html, 'data-e="cours"') === 1 && compte(html, 'data-e="avenir"') === 2);
  check("la quête en cours et sa récompense", t.includes("Quête en cours") && t.includes("Rendre un premier examen blanc") && t.includes("récompense : 150"));
  check("les titres des actes en infobulle", html.includes('title="Les 10 matières"'));
  const fini = { ...RICHE, codex: { fil: CODEX_RICHE.fil.map((e) => ({ ...e, etat: "fait" as const })), acte: null, quete: null } };
  check("le fil achevé : « fil achevé » et « Le fil principal est achevé. »", texte(r("codex", fini, "tuile")).includes("fil achevé") && texte(r("codex", fini, "tuile")).includes("Le fil principal est achevé."));
  check("le prologue : « prologue », sans « sur VI »", texte(r("codex", { ...RICHE, codex: { ...CODEX_RICHE, acte: { numero: 0, total: 6 } } }, "tuile")).includes("prologue") && !texte(r("codex", { ...RICHE, codex: { ...CODEX_RICHE, acte: { numero: 0, total: 6 } } }, "tuile")).includes("sur VI"));
  check("pas de quête (en attente de clôture) : le fil seul", !texte(r("codex", { ...RICHE, codex: { ...CODEX_RICHE, quete: null } }, "tuile")).includes("Quête en cours"));
  check("colonne et héros : les titres des étapes sont dans la page", texte(r("codex", RICHE, "colonne")).includes("Premiers pas") && texte(r("codex", RICHE, "heros")).includes("Niveau examen"));
  const demi = texte(r("codex", RICHE, "demi"));
  check("demi-bande : « Acte IV », « sur VI », le fil, la quête", demi.includes("Acte IV") && demi.includes("sur VI") && demi.includes("Rendre un premier examen blanc"));
}

console.log("# Rythme");
{
  const heros = r("rythme", RICHE, "heros");
  check("héros : la grille de 7 × 24 cases (168, plus les 5 de la légende), à quatre niveaux", compte(heros, "<i data-n=") === 168 + 5 && ["0", "1", "2", "3", "4"].every((n) => heros.includes(`data-n="${n}"`)));
  check("héros : « plutôt le soir », le pic à 21 h, le jour le plus actif, la légende", texte(heros).includes("plutôt le soir") && texte(heros).includes("21 h") && texte(heros).includes("Jour fort") && texte(heros).includes("moins") && texte(heros).includes("plus"));
  check("héros : les jours (L M M J V S D) et les heures repères (0 h, 6 h, 12 h, 18 h)", JOURS_SEMAINE.every(([ini]) => heros.includes(`<span>${ini}</span>`)) && ["0 h", "6 h", "12 h", "18 h"].every((x) => texte(heros).includes(x)));
  check("une case non vide a son infobulle (« jour 21 h · N réponses »)", /title="[a-z]+ \d+ h · \d+ réponses?"/.test(heros));
  const tuile = r("rythme", RICHE, "tuile");
  check("mini-tuile : l'horloge, 24 rayons, un seul pic en vermillon, « pic à 21 h »", compte(tuile, "<line") === 24 && compte(tuile, 'data-pic="oui"') === 1 && texte(tuile).includes("pic à 21 h"));
  check("colonne : l'horloge, le pic, le jour le plus actif, le moment, la lecture", compte(r("rythme", RICHE, "colonne"), "<line") === 24 && texte(r("rythme", RICHE, "colonne")).includes("Jour fort") && texte(r("rythme", RICHE, "colonne")).includes("Moment") && texte(r("rythme", RICHE, "colonne")).includes("Un rayon par heure"));
  check("le rayon du pic est plein, les autres plus ou moins pâles", /data-pic="oui"[^>]*opacity:1/.test(tuile) || tuile.includes('opacity:1;'));
  const demi = r("rythme", RICHE, "demi");
  check("demi-bande : « 21 h », « pic · plutôt le soir », la grille sans étiquettes", texte(demi).includes("21 h") && texte(demi).includes("pic · plutôt le soir") && compte(demi, "<i data-n=") === 168 && !demi.includes("rHeures"));
  check("bande : la grille aussi", compte(r("rythme", RICHE, "bande"), "<i data-n=") === 168 + 5);
  check("Personnaliser : qui voit le rythme", r("rythme", { ...MOI, visibiliteJournal: "friends" }, "heros", true).includes("Visible par : tes amis") && r("rythme", { ...MOI, visibiliteJournal: "friends" }, "tuile", true).includes("Visible par : tes amis") && r("rythme", { ...MOI, visibiliteJournal: "friends" }, "demi", true).includes("Visible par : tes amis"));
  const vide = { ...RICHE, rythme: { ...RYTHME_RICHE, grille: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0)), total: 0 } };
  check("une grille entièrement vide ne casse rien", ["tuile", "heros", "demi"].every((f) => !!r("rythme", vide, f as Format)));
}

console.log("# Confidentialité : tout est sérialisable, rien d'un Journal fermé, aucun horodatage");
{
  const champs = { formeDuels: RICHE.formeDuels, jourJ: RICHE.jourJ, classement: RICHE.classement, examens: RICHE.examens, codex: RICHE.codex, rythme: RICHE.rythme };
  check("sérialisable (aucune fonction, aucune Map)", egal(JSON.parse(JSON.stringify(champs)), champs));
  check("aucun horodatage ISO dans les données des tuiles", !/\d{4}-\d{2}-\d{2}T\d{2}:/.test(JSON.stringify(champs)));
  const ferme = { ...RICHE, formeDuels: null, jourJ: null, examens: null, rythme: null };
  check("Journal fermé : le jour J, les examens et le rythme ne se rendent pas, les duels gardent leurs totaux", ["jourj", "examens", "rythme"].every((k) => FORMATS_PERMIS[k as Cle].every((f) => r(k as Cle, ferme, f) === "")) && texte(r("duels", ferme, "tuile")).includes(nb("67 %")));
  check("Journal fermé : le classement, le Codex et la matière phare restent publics", ["classement", "codex", "phare"].every((k) => r(k as Cle, ferme, "tuile") !== ""));
  check("la voix : « visible par » du Journal dit tes amis / toi seul / tous", r("examens", { ...MOI, visibiliteJournal: "public" }, "tuile", true).includes("Visible par : tous"));
}

console.log("# Fichiers : jetons du site, mouvement réduit, aucun chemin codé en dur");
{
  const css = readFileSync("components/profil/blocs/neuves.module.css", "utf8");
  const sansCommentaires = css.replace(/\/\*[\s\S]*?\*\//g, "");
  check("aucune couleur codée en dur (que des jetons du site)", !/#[0-9a-fA-F]{3,8}\b/.test(sansCommentaires) && !/\brgba?\(/.test(sansCommentaires), (sansCommentaires.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)/g) ?? []).join(" "));
  const reduit = sansCommentaires.slice(sansCommentaires.indexOf("@media (prefers-reduced-motion: reduce)"));
  const animes = [...sansCommentaires.slice(0, sansCommentaires.indexOf("@media (prefers-reduced-motion: reduce)")).matchAll(/([^{}]+)\{[^{}]*\banimation:[^{}]*\}/g)].map((m) => m[1].trim().split(/\s*,\s*/).pop()!.trim());
  const sansCoupure = animes.filter((s) => !reduit.includes(s.replace(/^@container[^{]*\{/, "").trim()));
  check(`mouvement réduit : les ${animes.length} animations d'entrée sont toutes coupées`, animes.length >= 10 && sansCoupure.length === 0, sansCoupure.join(" | "));
  const durees = [...sansCommentaires.matchAll(/animation:\s*[a-zA-Z]+\s+([0-9.]+)s(?:\s+([0-9.]+)s)?/g)].map((m) => Number(m[1]) + (m[2] ? Number(m[2]) : 0));
  check("les animations d'entrée durent 1,2 s au plus (retard compris, sauf le décalage des pastilles)", durees.length >= 10 && durees.every((x) => x <= 1.4), durees.join(", "));
  check("rien ne reste invisible si l'animation ne joue pas : aucun opacity:0 ni scale(0) dans les règles hors animation", !/(^|[;{\s])(opacity:\s*0\s*;|transform:\s*scale\(0\))/m.test(sansCommentaires.replace(/@keyframes[^{]+\{(?:[^{}]|\{[^{}]*\})*\}/g, "")));
  const fichiers = ["Duels", "JourJ", "Phare", "Classement", "Examens", "CodexTuile", "Rythme", "neuves"].map((n) => `components/profil/blocs/${n}.tsx`).concat(["components/profil/blocs/neuves.module.css", "lib/profil/tuiles-neuves.ts", "lib/voice-blocs-neuves.ts", "scripts/profil/donnees-blocs-exemple.ts"]);
  const sources = fichiers.map((f) => [f, readFileSync(f, "utf8")] as const);
  const cheminCode = /AppData|scratchpad|(?<![A-Za-z0-9])[A-Za-z]:[\\/]/i;
  check("aucun chemin du scratchpad dans le dépôt (il casserait le CSS du site)", sources.every(([, s]) => !cheminCode.test(s)), sources.filter(([, s]) => cheminCode.test(s)).map(([f]) => f).join(", "));
  check("aucune classe Tailwind arbitraire ([…]) dans les nouveaux blocs", sources.filter(([f]) => f.endsWith(".tsx") && f.includes("blocs/")).every(([, s]) => !/className=(?:\{)?"[^"]*[a-z]-\[/.test(s)));
  check("aucun hook au niveau haut des blocs (appelés comme des fonctions)", sources.filter(([f]) => /Duels|JourJ|Phare|Classement|Examens|CodexTuile|Rythme/.test(f) && f.endsWith(".tsx")).every(([, s]) => !/\buse(State|Effect|Memo|Ref|Callback|Id)\(/.test(s)));
  check("rendu serveur = client : ni Date.now(), ni Math.random(), ni toLocaleString dans les blocs", sources.filter(([f]) => f.endsWith(".tsx")).every(([, s]) => !/Date\.now\(|Math\.random\(|toLocale/.test(s)));
}

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
