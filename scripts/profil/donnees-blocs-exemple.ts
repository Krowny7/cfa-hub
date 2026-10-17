// Des données de blocs d'exemple (aucun appel à la base), pour le test de la
// grille (test-grille.tsx) et l'aperçu local de la page : « Sforzinda », qui
// a tout rempli (sa page à 10 blocs, DISPO_RICHE), et « Paul D. », qui n'a
// presque rien touché (la page par défaut). Reprises des données de la
// maquette B. Les médias pointent sur des fichiers du site (public/).

import { STATS_VIDES, type ProfilStats } from "@/lib/profil/catalogue";
import { DISPOSITION_DEFAUT, type Disposition } from "@/lib/profil/disposition";
import { folioPorte } from "@/lib/profil/etagere";
import type { DonneesBlocs, SeanceProgression } from "@/lib/profil/blocs-donnees";
import type { Saisons } from "@/lib/profil/saisons";

/** un « GIF » de la banque, petit (240 px) : une goutte d'encre qui tombe et s'étale, en boucle (SVG) */
export const GIF_EXEMPLE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'><rect width='240' height='240' fill='#f4ecdc'/><ellipse cx='120' cy='196' rx='10' ry='3' fill='#1b1712' opacity='.85'><animate attributeName='rx' values='0;0;64;70' keyTimes='0;.45;.8;1' dur='2.4s' repeatCount='indefinite'/></ellipse><circle cx='120' cy='30' r='13' fill='#1b1712'><animate attributeName='cy' values='20;192;192' keyTimes='0;.45;1' dur='2.4s' repeatCount='indefinite'/><animate attributeName='r' values='13;13;0' keyTimes='0;.45;.5' dur='2.4s' repeatCount='indefinite'/></circle><text x='120' y='120' text-anchor='middle' font-family='Georgia,serif' font-size='26' font-style='italic' fill='#b4412f'>+1 sceau</text></svg>`,
  );

const MATIERES: ProfilStats["matieres"] = [
  { key: "ethics", pct: 71, answered: 412, statut: "mesuree" },
  { key: "quant", pct: 58, answered: 388, statut: "mesuree" },
  { key: "economics", pct: 49, answered: 240, statut: "mesuree" },
  { key: "corporate", pct: 64, answered: 176, statut: "mesuree" },
  { key: "fsa", pct: 82, answered: 905, statut: "mesuree" },
  { key: "equity", pct: 66, answered: 351, statut: "mesuree" },
  { key: "fixed_income", pct: 38, answered: 297, statut: "mesuree" },
  { key: "derivatives", pct: 55, answered: 132, statut: "mesuree" },
  { key: "alternatives", pct: 47, answered: 31, statut: "provisoire" },
  { key: "portfolio", pct: 60, answered: 210, statut: "mesuree" },
];
const MOYENNES: Record<string, number | null> = { ethics: 66, quant: 52, economics: 47, corporate: 55, fsa: 59, equity: 54, fixed_income: 44, derivatives: 51, alternatives: 49, portfolio: 53 };
const MIENNES: ProfilStats["matieres"] = [
  { key: "ethics", pct: 63, answered: 120, statut: "mesuree" },
  { key: "quant", pct: 67, answered: 140, statut: "mesuree" },
  { key: "fsa", pct: 70, answered: 200, statut: "mesuree" },
  { key: "fixed_income", pct: 57, answered: 90, statut: "mesuree" },
];

const NOMS_AMIS = ["Inès B.", "Hugo P.", "Sofia R.", "Marc L.", "Nadia T.", "Paul D.", "Yanis K.", "Léa M.", "Tom V.", "Clara S.", "Omar F.", "Jade N."];
export const amisExemple = (n: number) => NOMS_AMIS.slice(0, n).map((name, i) => ({ id: `ami-${i}`, name, avatarUrl: null }));

const seances = (n: number): SeanceProgression[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    topics: [["fsa"], ["fixed_income"], ["quant", "economics"], ["ethics"], ["equity"], ["derivatives"]][i % 6],
    format: 10,
    score: Math.min(10, 4 + Math.round(i / 3) + (i % 3 === 0 ? 1 : 0)),
    total: 10,
    completed_at: new Date(Date.UTC(2026, 7, 20 + i * 2, 18)).toISOString(),
  }));

const SAISONS_RICHE: Saisons = {
  courante: { cle: "s3", numero: 3, nom: "Mai 2027", debut: "2026-09-01", dernierJour: "2026-11-30", fin: "2026-11-30T23:00:00Z", moi: { pic: { palier: 3, division: "II" }, eloPic: 1502, matchs: 14 } },
  palmares: [
    { cle: "s2", numero: 2, nom: "Février 2027", debut: "2026-06-01", dernierJour: "2026-08-31", pic: { palier: 4, division: "III" }, eloPic: 1561, final: { palier: 3, division: "I" }, eloFinal: 1532, place: 5, matchs: 31, joueurs: 212 },
    { cle: "s1", numero: 1, nom: "Novembre 2026", debut: "2026-03-01", dernierJour: "2026-05-31", pic: { palier: 2, division: "I" }, eloPic: 1388, final: { palier: 2, division: "II" }, eloFinal: 1342, place: 19, matchs: 22, joueurs: 168 },
  ],
};

/** la page de Sforzinda : 10 blocs, les 3 formats, les 3 genres de média */
export const DISPO_RICHE: Disposition = [
  { k: "vitrine", f: "bande" },
  { k: "radar", f: "heros" },
  { k: "media", id: "video1", type: "video", url: "/intro/encre-port.mp4", ratio: 1080 / 1920, legende: "Mon edit de la semaine des 30 jours.", duree: 12, couverture: 4, f: "tuile" },
  { k: "journal", f: "tuile" },
  { k: "media", id: "image1", type: "image", url: "/illustrations/reviser-pupitre.webp", ratio: 16 / 10, legende: "Mon coin de révision, la veille de l'examen blanc.", y: 88, f: "heros" },
  { k: "folio", f: "tuile" },
  { k: "saisons", f: "tuile" },
  { k: "media", id: "gif1", type: "image", url: GIF_EXEMPLE, ratio: 1, legende: "Quand le sceau tombe.", source: "klipy", px: 240, f: "tuile" },
  { k: "amis", f: "heros" },
  { k: "trophees", f: "tuile" },
  { k: "reponses", f: "tuile" },
  { k: "progression", f: "heros" },
];

export const RICHE: DonneesBlocs = {
  id: "sforzinda",
  nom: "Sforzinda",
  moi: false,
  viewerId: "moi",
  accent: "#e0674b",
  showcase: ["questions", "serie", "matiere"],
  stats: { ...STATS_VIDES, questions: 3412, meilleureSerie: 31, serie: 12, serieEncre: true, duelsGagnes: 18, duelsJoues: 27, defisRendus: 41, calculsJustes: 236, matieres: MATIERES },
  radar: { moyennes: MOYENNES, miennes: MIENNES, monAccent: null },
  amis: { amis: amisExemple(12), total: 23 },
  reponses: {
    total: 3412,
    justes: 2184,
    precision: 64,
    sources: [
      { source: "daily", nom: "Défi du jour", n: 1240 },
      { source: "practice", nom: "Sessions ciblées", n: 980 },
      { source: "duel", nom: "Duels", n: 610 },
      { source: "eclair", nom: "Séries éclair", n: 342 },
      { source: "mock", nom: "Examens blancs", n: 240 },
    ],
    incomplet: false,
  },
  trophees: {
    lignes: [
      { source: "ciblee", palier: 1, n: 7 },
      { source: "ciblee", palier: 2, n: 4 },
      { source: "ciblee", palier: 3, n: 2 },
      { source: "cinq", palier: 1, n: 5 },
      { source: "cinq", palier: 4, n: 1 },
      { source: "duel", palier: 2, n: 3 },
    ],
    complet: true,
  },
  progression: seances(14),
  folio: folioPorte("tourbillons"),
  journal: {
    depart: 1352,
    points: [1360, 1374, 1366, 1391, 1402, 1395, 1418, 1431, 1440, 1436, 1458, 1478],
    matchs: 12,
    evenements: [
      { type: "victoire", cle: "v1", jour: "2026-10-15", adversaire: { id: "ami-1", nom: "Hugo P." }, score: [8, 6], delta: 18 },
      { type: "sceau", cle: "c1", jour: "2026-10-12", sceau: "assiduite", palier: 2 },
      { type: "serie", cle: "r1", jour: "2026-10-09", jours: 30 },
      { type: "palier", cle: "p1", jour: "2026-10-02", palier: 3 },
    ],
  },
  saisons: SAISONS_RICHE,
  visibiliteJournal: "public",
};

/** Paul D. : la page par défaut, presque rien de rempli */
export const SOBRE: DonneesBlocs = {
  id: "paul",
  nom: "Paul D.",
  moi: false,
  viewerId: "moi",
  accent: "ink",
  showcase: [],
  stats: { ...STATS_VIDES, questions: 286, serie: 2, meilleureSerie: 4, matieres: MATIERES.map((m) => ({ ...m, pct: m.key === "fsa" || m.key === "ethics" ? m.pct : null, answered: m.key === "fsa" || m.key === "ethics" ? 40 : 0 })) },
  radar: { moyennes: MOYENNES, miennes: null, monAccent: null },
  amis: { amis: amisExemple(2), total: 2 },
  reponses: null,
  trophees: null,
  progression: null,
  folio: null,
  journal: null,
  saisons: { courante: { ...SAISONS_RICHE.courante!, moi: null }, palmares: [] },
  visibiliteJournal: "friends",
};

export const DISPO_SOBRE = DISPOSITION_DEFAUT;
