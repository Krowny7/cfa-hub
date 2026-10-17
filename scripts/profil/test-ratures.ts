// Tests légers des ratures qui sèchent côté site (migration_v3_profil.sql
// §3a), sans base ni réseau :
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-ratures.ts
// Vérifie : la lecture du carnet avec et sans la section (pageDe : seche_le,
// scellee_le, scellées et fraîches absents sans elle), quandSeche (sèche,
// rayée, jamais reprise, demain, l'heure de Paris le jour même, heure d'été
// et d'hiver), bilanSeche (le bilan de l'Atelier : une rature fraîche n'est
// pas rayée, le compte d'après du serveur gardé), et les textes (bilan de
// Mise au propre, badge, « Tout ce qui reste sèche demain », Registre, Atelier).
import { bilanSeche, pageDe, quandSeche } from "@/components/moi/ratures-data";
import type { BilanAtelier } from "@/lib/atelier";
import type { ItemSeance } from "@/lib/atelier-seance";
import { CARNET } from "@/lib/voice-z1";
import { ATELIER } from "@/lib/voice-atelier";
import { REG } from "@/lib/voice-moi";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const J = JSON.stringify;

// ── pageDe : avec et sans la section §3a ─────────────────────────────────
const ligne = {
  question_id: "q1",
  prompt: "Énoncé",
  choices: ["A", "B"],
  correct_index: 0,
  explanation: null,
  last_selected: 1,
  misses: 1,
  sources: ["fiche"],
  last_source: "fiche",
  last_missed_at: "2026-10-16T10:00:00Z",
  first_missed_at: "2026-10-16T10:00:00Z",
  correct_since: 1,
  removed_at: null,
  set_title: null,
  folder_name: null,
};
const avant = pageDe({ total: 1, retirees: 0, retirees_semaine: 0, filtre: 1, sources: { fiche: 1 }, items: [ligne] });
check("sans la section : ni scellées ni ratures qui sèchent (le carnet ne parle pas de séchage)", avant.scellees === undefined && avant.sechent === undefined);
check("sans la section : seche_le et scellee_le à null sur chaque rature", avant.items[0].secheLe === null && avant.items[0].scelleeLe === null);
const apres = pageDe({ total: 1, retirees: 0, retirees_semaine: 0, scellees: 2, sechent: 1, filtre: 1, sources: {}, items: [{ ...ligne, seche_le: "2026-10-17T10:00:00Z", scellee_le: null }] });
check("avec la section : scellées et ratures qui sèchent comptées, seche_le lu", apres.scellees === 2 && apres.sechent === 1 && apres.items[0].secheLe === "2026-10-17T10:00:00Z");
const zero = pageDe({ total: 0, retirees: 0, retirees_semaine: 0, scellees: 0, sechent: 0, filtre: 0, sources: null, items: null });
check("avec la section, rien à compter : 0 (et non absent)", zero.scellees === 0 && zero.sechent === 0);

// ── quandSeche ───────────────────────────────────────────────────────────
const at = (iso: string) => new Date(iso).getTime();
const r = (secheLe: string | null, removedAt: string | null = null) => ({ secheLe, removedAt });
check("jamais reprise depuis l'erreur : rien", quandSeche(r(null), at("2026-10-16T12:00:00Z")) === null);
check("sans la section (champ absent) : rien", quandSeche({ removedAt: null }, at("2026-10-16T12:00:00Z")) === null);
check("déjà sèche : rien", quandSeche(r("2026-10-16T11:00:00Z"), at("2026-10-16T12:00:00Z")) === null);
check("rayée : rien", quandSeche(r("2026-10-17T11:00:00Z", "2026-10-16T11:30:00Z"), at("2026-10-16T12:00:00Z")) === null);
check("sèche le lendemain à Paris : « demain »", J(quandSeche(r("2026-10-17T08:00:00Z"), at("2026-10-16T12:00:00Z"))) === J({ demain: true }));
// 16 octobre (heure d'été, UTC+2) : 13:00Z = 15 h à Paris, le même jour
check("sèche le jour même (heure d'été) : l'heure de Paris, 15 h", J(quandSeche(r("2026-10-16T13:00:00Z"), at("2026-10-16T06:00:00Z"))) === J({ demain: false, heure: 15 }));
// 16 décembre (heure d'hiver, UTC+1) : 13:00Z = 14 h à Paris
check("sèche le jour même (heure d'hiver) : 14 h", J(quandSeche(r("2026-12-16T13:00:00Z"), at("2026-12-16T06:00:00Z"))) === J({ demain: false, heure: 14 }));
// 22:30Z le 16 = 00 h 30 le 17 à Paris : demain, même si c'est le même jour en UTC
check("le jour de Paris décide, pas celui d'UTC (22 h 30 Z = demain 0 h 30)", J(quandSeche(r("2026-10-16T22:30:00Z"), at("2026-10-16T12:00:00Z"))) === J({ demain: true }));

// ── bilanSeche : le bilan de l'Atelier ──────────────────────────────────
const notion = (id: string, rayees: number, apresN: number) => ({
  notion: id,
  avant: { n: 10, ok: 5 },
  pendant: { n: 4, ok: 3 },
  ratures: { avant: 5, apres: apresN, rayees, nouvelles: 0 },
  calcul: null,
  tenue: false,
});
const b: BilanAtelier = { notions: [notion("quant:1", 3, 2), notion("quant:2", 1, 4)], score: 6, total: 8, retest: { n: 0, ok: 0 }, aRevoir: null, prochain: "demain" };
const item = (i: number, k: "rature" | "neuve", n: string, statut: string | null): ItemSeance => ({
  i,
  k,
  notion: n,
  niveau: 1,
  ref: "q" + i,
  prompt: "p",
  choices: ["A", "B"],
  misses: 1,
  premier: statut === null ? null : { choix: 0, juste: statut !== "reste", bonne: 0, explication: null, statut },
  retest: null,
});
const sansFraiche = bilanSeche(b, [item(0, "rature", "quant:1", "rayee"), item(1, "neuve", "quant:1", "juste")], null);
check("aucune rature fraîche : le bilan est rendu tel quel", sansFraiche.bilan === b && J(sansFraiche.fraiches) === J({}));
const items = [item(0, "rature", "quant:1", "rayee"), item(1, "rature", "quant:1", "fraiche"), item(2, "rature", "quant:2", "fraiche"), item(3, "neuve", "quant:2", "juste"), item(4, "rature", "quant:2", null)];
const local = bilanSeche(b, items, null);
check("fraîches comptées par notion (une seule fois chacune)", J(local.fraiches) === J({ "quant:1": 1, "quant:2": 1 }));
check("une fraîche sort des rayées et reste en cours (compte local)", J(local.bilan.notions.map((n) => [n.ratures.rayees, n.ratures.apres])) === J([[2, 3], [0, 5]]), J(local.bilan.notions.map((n) => n.ratures)));
const serveur = bilanSeche(b, items, { "quant:1": { enCours: 2, vives: 0 } });
check("le compte d'après du serveur est gardé ; sans compte serveur pour une notion, le local se corrige", J(serveur.bilan.notions.map((n) => [n.ratures.rayees, n.ratures.apres])) === J([[2, 2], [0, 5]]));
check("le bilan d'origine n'est pas modifié", b.notions[0].ratures.rayees === 3 && b.notions[1].ratures.apres === 4);

// ── les textes ───────────────────────────────────────────────────────────
check("bilan de Mise au propre : « 2 rayées · 1 qui sèche · 1 restée »", CARNET.propreBilan(2, 1, 1) === "2 rayées · 1 qui sèche · 1 restée", CARNET.propreBilan(2, 1, 1));
check("bilan de Mise au propre sans séchage : comme avant", CARNET.propreBilan(2, 1) === "2 rayées · 1 restée" && CARNET.propreBilan(0, 0) === "c'est parti");
check("badge : « encre fraîche · sèche demain », « … · sèche à 15 h »", CARNET.encreFraiche({ demain: true }) === "encre fraîche · sèche demain" && CARNET.encreFraiche({ demain: false, heure: 15 }) === "encre fraîche · sèche à 15 h");
check("réponse fraîche : l'heure si connue, sinon « demain »", CARNET.propreFraiche({ demain: false, heure: 9 }).includes("elle sèche à 9 h") && CARNET.propreFraiche(null).includes("elle sèche demain"), CARNET.propreFraiche(null));
check("« Tout ce qui reste sèche demain » (U6)", CARNET.propreSeche === "Tout ce qui reste sèche demain.");
check("sous le bouton, celles qui sèchent : singulier et pluriel", CARNET.sechentSous(1) === "1 rature sèche encore : elle reviendra demain." && CARNET.sechentSous(3) === "3 ratures sèchent encore : elles reviendront demain.", CARNET.sechentSous(3));
check("scellées : « 1 scellée », « 4 scellées »", CARNET.scellees(1) === "1 scellée" && CARNET.scellees(4) === "4 scellées");
check("Atelier : « 1 réussie, elle sèche demain », « 2 réussies, elles sèchent demain »", ATELIER.fraiches(1) === "1 réussie, elle sèche demain" && ATELIER.fraiches(2) === "2 réussies, elles sèchent demain");
check("Registre : « 1 sèche encore », « 2 scellées : elles tiennent. », la règle de l'encre qui sèche", REG.ratures.sechent(1) === "1 sèche encore" && REG.ratures.sechent(3) === "3 sèchent encore" && REG.ratures.scellees(2) === "2 scellées : elles tiennent." && /un jour après l'erreur/.test(REG.ratures.phraseSeche));
check("Atelier : un statut « fraiche » a son texte (pas « rayée »)", !!ATELIER.statut.fraiche && !/rayée du carnet/.test(ATELIER.statut.fraiche));

console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
process.exit(ko ? 1 : 0);
