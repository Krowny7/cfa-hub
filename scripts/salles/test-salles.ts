// Salles : la logique pure (code, horloge, score, réglages, classement), les
// conversions des RPC, les appels (avec un faux client Supabase) et le tirage
// des calculs côté serveur ; plus quelques gardes de cohérence entre
// migration_salles.sql et le code TypeScript (constantes, droits, clés JSON).
// npx tsx --tsconfig tsconfig.json scripts/salles/test-salles.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SALLE_APERCU_S,
  SALLE_CODE_ALPHABET,
  SALLE_DECOMPTE_S,
  SALLE_MARGE_S,
  SALLE_PAUSE_S,
  SALLE_TOPIC_KEYS,
  analyserCode,
  classer,
  clockDe,
  codeValide,
  decalageHorloge,
  delaiAvantLecture,
  dureeEstimee,
  finPartie,
  finTempsQuestion,
  formaterCode,
  fusionnerEtat,
  genererCode,
  heureServeur,
  horlogeSession,
  libelleDuree,
  libelleParams,
  normaliserCode,
  ouvertureQuestion,
  paramsDepuisJson,
  paramsParDefaut,
  paramsVersJson,
  pointsAu,
  pointsReponse,
  prochainDepuis,
  repartirNombre,
  revelationQuestion,
  validerParams,
  type ClockSession,
} from "../../lib/salles/logique";
import {
  creerSalle,
  estMigrationAbsente,
  getEtatSalle,
  getMesSalles,
  lireEtatSalle,
  messageErreurSalle,
  rejoindreSalleParCode,
  repondreSalle,
  sallesReady,
  toEtat,
} from "../../lib/salles/api";
import { lancerSession, mixDeDifficulte, tirerCalculs } from "../../lib/salles/serveur";
import type { EtatSalle, SalleParams } from "../../lib/salles/types";

let ko = 0;
const ok = (nom: string, bon: boolean, detail = "") => {
  if (!bon) ko++;
  console.log(`${bon ? "ok  " : "KO  "} ${nom}${bon ? "" : detail ? ` → ${detail}` : ""}`);
};
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const section = (titre: string) => console.log(`\n— ${titre}`);

// générateur déterministe (mulberry32)
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const racine = join(__dirname, "..", "..");
const lire = (chemin: string) => readFileSync(join(racine, chemin), "utf8");

async function main() {
  // -------------------------------------------------------------------------
  section("Code de salle");
  ok("alphabet : 31 caractères distincts", SALLE_CODE_ALPHABET.length === 31 && new Set(SALLE_CODE_ALPHABET).size === 31);
  ok("alphabet : ni 0, O, 1, I, L", !/[01ILO]/.test(SALLE_CODE_ALPHABET));
  ok("alphabet : toutes les autres lettres et 2-9", /^[A-Z2-9]+$/.test(SALLE_CODE_ALPHABET) && [..."ABCDEFGHJKMNPQRSTUVWXYZ23456789"].every((c) => SALLE_CODE_ALPHABET.includes(c)));
  {
    const rand = seeded(7);
    let tous = true;
    const vus = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const c = genererCode(rand);
      if (c.length !== 6 || !codeValide(c)) tous = false;
      for (const ch of c) vus.add(ch);
    }
    ok("3000 codes tirés : 6 caractères, tous valides", tous);
    ok("tous les caractères de l'alphabet sortent", vus.size === 31, `${vus.size}`);
  }
  ok("codeValide : accepte un bon code", codeValide("K7MX2Q"));
  ok("codeValide : refuse minuscule, 0, O, 1, I, L, longueur", !codeValide("k7mx2q") && !codeValide("K7MX20") && !codeValide("K7MXOQ") && !codeValide("K7MX1Q") && !codeValide("K7MXIQ") && !codeValide("K7MXLQ") && !codeValide("K7MX2") && !codeValide("K7MX2QQ"));
  ok("normaliserCode : « k7m-x2q » → K7MX2Q", normaliserCode("k7m-x2q") === "K7MX2Q");
  ok("normaliserCode : espaces et ponctuation retirés", normaliserCode("  k7m x2q. ") === "K7MX2Q");
  ok("formaterCode : K7M-X2Q", formaterCode("K7MX2Q") === "K7M-X2Q" && formaterCode("k7m-x2q") === "K7M-X2Q");
  ok("formaterCode : un code incomplet reste tel quel", formaterCode("K7M") === "K7M");
  {
    const a = analyserCode("k7m-x2q");
    ok("analyserCode : code lisible", a.ok && a.code === "K7MX2Q");
    const vide = analyserCode("");
    ok("analyserCode : vide refusé", !vide.ok);
    const court = analyserCode("K7MX2");
    ok("analyserCode : trop court refusé", !court.ok && /6 caractères/.test(court.erreur));
    const long = analyserCode("K7MX2QQ");
    ok("analyserCode : trop long refusé", !long.ok && /6 caractères/.test(long.erreur));
    for (const mauvais of ["K7MX20", "K7MXO2", "K7MX12", "K7MXI2", "K7MXL2"]) {
      const r = analyserCode(mauvais);
      ok(`analyserCode : ${mauvais} refusé (caractère ambigu)`, !r.ok && /ni 0/.test(r.erreur));
    }
  }

  // -------------------------------------------------------------------------
  section("Horloge de la partie");
  const T0 = 1_000_000_000_000;
  const S: ClockSession = { startedAt: T0, temps: 30, pause: 5, nb: 3 };
  const h = (e: number, s: ClockSession = S) => horlogeSession(s, T0 + e);
  {
    const a = h(-10_000);
    ok("décompte : phase, index, rien de visible", a.phase === "decompte" && a.index === -1 && a.nbVisibles === 0 && a.nbFermees === 0 && a.avantProchainMs === 10_000, JSON.stringify(a));
    ok("décompte : l'énoncé 1 se révèle 2 s avant", h(-2001).nbVisibles === 0 && h(-2000).nbVisibles === 1);
    const b = h(0);
    ok("t = 0 : question 1, 30 s restantes", b.phase === "question" && b.index === 0 && b.restantMs === 30_000 && b.avantProchainMs === 30_000, JSON.stringify(b));
    ok("t = 29,999 s : encore la question 1 (1 ms restante)", h(29_999).phase === "question" && h(29_999).restantMs === 1);
    const c = h(30_000);
    ok("t = 30 s : correction (révélation) de la question 1", c.phase === "revelation" && c.index === 0 && c.restantMs === 0 && c.avantProchainMs === 5000, JSON.stringify(c));
    ok("la question 1 n'est pas close avant 32 s (marge réseau)", h(31_999).nbFermees === 0 && h(32_000).nbFermees === 1);
    ok("la question 2 se révèle à 33 s (2 s avant son ouverture)", h(32_999).nbVisibles === 1 && h(33_000).nbVisibles === 2);
    const d = h(35_000);
    ok("t = 35 s : question 2 ouverte", d.phase === "question" && d.index === 1 && d.restantMs === 30_000 && d.nbFermees === 1 && d.nbVisibles === 2, JSON.stringify(d));
    ok("la question 2 est close à 67 s", h(66_999).nbFermees === 1 && h(67_000).nbFermees === 2);
    ok("la dernière correction publique à 102 s", h(102_000).nbFermees === 3 && h(101_999).nbFermees === 2);
    const e = h(104_999);
    ok("dernière milliseconde : révélation de la question 3", e.phase === "revelation" && e.index === 2 && e.avantProchainMs === 1, JSON.stringify(e));
    const f = h(105_000);
    ok("t = 105 s : fin", f.phase === "fin" && f.index === 3 && f.nbFermees === 3 && f.nbVisibles === 3 && f.avantProchainMs === null, JSON.stringify(f));
    ok("bien après la fin : toujours « fin »", h(10_000_000).phase === "fin");
    const g = h(10_000, { ...S, terminee: true });
    ok("partie arrêtée : fin d'office, tout est clos", g.phase === "fin" && g.nbFermees === 3 && g.nbVisibles === 3);
  }
  ok("ouvertureQuestion / finTempsQuestion / revelationQuestion / finPartie", ouvertureQuestion(S, 2) === T0 + 70_000 && finTempsQuestion(S, 2) === T0 + 100_000 && revelationQuestion(S, 2) === T0 + 102_000 && finPartie(S) === T0 + 105_000);
  ok("constantes : pause 5 s, décompte 8 s, marge 2 s, aperçu 2 s", SALLE_PAUSE_S === 5 && SALLE_DECOMPTE_S === 8 && SALLE_MARGE_S === 2 && SALLE_APERCU_S === 2);
  {
    // comparaison avec une définition naïve, sur des parties et des instants tirés au hasard
    const rand = seeded(99);
    let ecarts = 0;
    let essais = 0;
    for (let k = 0; k < 400; k++) {
      const s: ClockSession = { startedAt: T0, temps: 15 + Math.floor(rand() * 106), pause: 5, nb: 5 + Math.floor(rand() * 46) };
      const cycle = (s.temps + s.pause) * 1000;
      const instants = [-20_000, -2001, -2000, -1, 0, 1, s.nb * cycle - 1, s.nb * cycle, s.nb * cycle + 20_000];
      for (let i = 0; i < s.nb; i += 1 + Math.floor(rand() * 4)) {
        for (const d of [-2001, -2000, -1, 0, 1, s.temps * 1000 - 1, s.temps * 1000, s.temps * 1000 + 1999, s.temps * 1000 + 2000]) instants.push(i * cycle + d);
      }
      for (let j = 0; j < 25; j++) instants.push(Math.floor((rand() * 1.1 - 0.05) * s.nb * cycle));
      for (const e of instants) {
        essais++;
        const r = horlogeSession(s, T0 + e);
        // définition naïve : on énumère les questions
        let index = e < 0 ? -1 : s.nb;
        for (let i = 0; i < s.nb; i++) if (e >= i * cycle && e < (i + 1) * cycle) index = i;
        let fermees = 0;
        let visibles = 0;
        for (let i = 0; i < s.nb; i++) {
          if (e >= i * cycle + (s.temps + 2) * 1000) fermees++;
          if (e + 2000 >= i * cycle) visibles++;
        }
        const phase = e < 0 ? "decompte" : e >= s.nb * cycle ? "fin" : e - index * cycle < s.temps * 1000 ? "question" : "revelation";
        if (r.index !== index || r.nbFermees !== fermees || r.nbVisibles !== visibles || r.phase !== phase) {
          ecarts++;
          if (ecarts <= 3) console.log("  écart", { s, e, r, index, fermees, visibles, phase });
        }
      }
    }
    ok(`horloge = définition naïve sur ${essais} instants`, ecarts === 0, `${ecarts} écarts`);
  }
  {
    ok("clockDe : lit une session du serveur", eq(clockDe({ startedAt: "2026-10-30T20:00:00.000Z", temps: 30, pause: 5, nb: 3, statut: "en_cours" }), { startedAt: Date.parse("2026-10-30T20:00:00.000Z"), temps: 30, pause: 5, nb: 3, terminee: false }));
    ok("clockDe : terminée", clockDe({ startedAt: "2026-10-30T20:00:00.000Z", temps: 30, pause: 5, nb: 3, statut: "terminee" }).terminee === true);
  }
  {
    ok("delaiAvantLecture : question qui tourne → rythme de base", delaiAvantLecture(S, T0 + 5000) === 2500);
    ok("delaiAvantLecture : 500 ms avant l'aperçu de la question 1 → 620 ms", delaiAvantLecture(S, T0 - 2500) === 620);
    ok("delaiAvantLecture : juste avant un changement → plancher 300 ms", delaiAvantLecture(S, T0 + 29_990) === 300);
    ok("delaiAvantLecture : partie finie ou arrêtée → rythme de base", delaiAvantLecture(S, T0 + 200_000) === 2500 && delaiAvantLecture({ ...S, terminee: true }, T0 + 1000) === 2500);
    ok("delaiAvantLecture : jamais au-delà de la base", delaiAvantLecture(S, T0 + 5000, 1000) === 1000);
    // tomber sur la correction publique (fin du temps + 2 s)
    ok("delaiAvantLecture : 1 s avant la correction publique", delaiAvantLecture(S, T0 + 31_000) === 1120);
  }
  {
    const d = decalageHorloge("2026-10-30T20:00:10.000Z", Date.parse("2026-10-30T20:00:00.000Z"), Date.parse("2026-10-30T20:00:00.400Z"));
    ok("decalageHorloge : serveur en avance de 9,8 s (mi-trajet)", d === 9800, `${d}`);
    ok("decalageHorloge : horloges alignées", decalageHorloge("2026-10-30T20:00:00.200Z", Date.parse("2026-10-30T20:00:00.000Z"), Date.parse("2026-10-30T20:00:00.400Z")) === 0);
    ok("decalageHorloge : navigateur en avance → décalage négatif", decalageHorloge("2026-10-30T20:00:00.000Z", Date.parse("2026-10-30T20:00:05.000Z"), Date.parse("2026-10-30T20:00:05.200Z")) === -5100);
    ok("decalageHorloge : heure illisible → 0", decalageHorloge("pas une date", 1, 2) === 0);
    ok("heureServeur : ajoute le décalage", heureServeur(9800, 1_000) === 10_800);
  }

  // -------------------------------------------------------------------------
  section("Score");
  ok("réponse à l'ouverture : 1000 points", pointsReponse(30, 30_000) === 1000);
  ok("réponse à la dernière seconde (temps écoulé) : 500 points", pointsReponse(30, 0) === 500);
  ok("à mi-temps : 750 points", pointsReponse(30, 15_000) === 750);
  ok("temps restant négatif (marge réseau) : 500", pointsReponse(30, -1500) === 500);
  ok("temps restant trop grand : plafonné à 1000", pointsReponse(30, 999_999) === 1000);
  ok("temps restant illisible : 500", pointsReponse(30, Number.NaN) === 500);
  ok("arrondi au demi supérieur : 500,5 → 501", pointsReponse(16, 16) === 501);
  ok("arrondi : 500,97 → 500", pointsReponse(16, 15) === 500);
  ok("temps nul : 0 point (pas de division par zéro)", pointsReponse(0, 0) === 0);
  {
    let bon = true;
    let prec = 0;
    for (const t of [15, 20, 45, 120]) {
      prec = 0;
      for (let r = 0; r <= t * 1000; r += 37) {
        const p = pointsReponse(t, r);
        if (p < 500 || p > 1000 || p < prec) bon = false;
        prec = p;
        // même résultat qu'en nombres décimaux, hors des cas d'arrondi pile
        const flottant = 1000 * (0.5 + (0.5 * r) / (t * 1000));
        if (Math.abs(p - Math.round(flottant)) > 1) bon = false;
      }
    }
    ok("score : croissant avec le temps restant, de 500 à 1000", bon);
  }
  ok("pointsAu : à l'ouverture 1000, à la fin du temps 500, à mi-temps de la question 2 : 750", pointsAu(S, 0, T0) === 1000 && pointsAu(S, 0, T0 + 30_000) === 500 && pointsAu(S, 1, T0 + 35_000 + 15_000) === 750);

  // -------------------------------------------------------------------------
  section("Classement");
  {
    const entree = [
      { userId: "a", username: "Alice", points: 1000, bonnes: 2, tempsMs: 5000 },
      { userId: "d", username: "Dora", points: 500, bonnes: 1, tempsMs: 1000 },
      { userId: "c", username: "Charles", points: 1000, bonnes: 2, tempsMs: 4000 },
      { userId: "b", username: "Bastien", points: 1000, bonnes: 2, tempsMs: 4000 },
      { userId: "e", username: "Emma", points: 1000, bonnes: 3, tempsMs: 9000 },
      { userId: "f", username: "Farid", points: 0, bonnes: 0, tempsMs: 0 },
      { userId: "g", username: "Gina", points: 0, bonnes: 0, tempsMs: 0 },
    ];
    const copie = JSON.stringify(entree);
    const r = classer(entree);
    ok("classer : points, puis bonnes, puis temps cumulé", eq(r.map((x) => x.userId), ["e", "b", "c", "a", "d", "f", "g"]), r.map((x) => x.userId).join(","));
    ok("classer : rangs 1, 2, 2, 4, 5, 6, 6 (égalité parfaite = même rang)", eq(r.map((x) => x.rang), [1, 2, 2, 4, 5, 6, 6]), r.map((x) => x.rang).join(","));
    ok("classer : ne modifie pas l'entrée", JSON.stringify(entree) === copie);
    ok("classer : liste vide", classer([]).length === 0);
  }

  // -------------------------------------------------------------------------
  section("Réglages : validation");
  {
    const def = paramsParDefaut();
    const v0 = validerParams(def);
    ok("réglages par défaut valides et inchangés", v0.ok && eq(v0.params, def), JSON.stringify(v0));

    const v1 = validerParams({ type: "mixte", nombre: "20", topics: ["quant", "ethics", "bogus"], source: "mocks", difficulte: "difficile", temps: "60", partCalculs: 50 });
    ok("mixte : chaînes numériques lues, matières dans l'ordre du programme, inconnues écartées", v1.ok && eq(v1.params, { type: "mixte", nombre: 20, source: "mocks", topics: ["ethics", "quant"], difficulte: "difficile", temps: 60, partCalculs: 50 }), JSON.stringify(v1));

    const v2 = validerParams({ type: "calculs", nombre: 10, topics: ["quant"], source: "mocks", partCalculs: 30 });
    ok("calculs : source ramenée à la banque, part 100, temps 45 et difficulté mélangée par défaut", v2.ok && eq(v2.params, { type: "calculs", nombre: 10, source: "banque", topics: ["quant"], difficulte: "melange", temps: 45, partCalculs: 100 }), JSON.stringify(v2));

    const v3 = validerParams({ type: "questions", nombre: 5, topics: ["fsa", "fsa", "fsa"], partCalculs: 70 });
    ok("questions : part de calculs ramenée à 0, matière en double comptée une fois", v3.ok && v3.params.partCalculs === 0 && eq(v3.params.topics, ["fsa"]), JSON.stringify(v3));

    const base = { type: "questions", nombre: 10, topics: ["quant"] };
    const refuse = (nom: string, brut: unknown, champ: string) => {
      const r = validerParams(brut);
      ok(nom, !r.ok && r.erreurs.some((e) => e.champ === champ), JSON.stringify(r));
    };
    refuse("type absent refusé", { ...base, type: undefined }, "type");
    refuse("type inconnu refusé", { ...base, type: "quiz" }, "type");
    refuse("nombre 4 refusé", { ...base, nombre: 4 }, "nombre");
    refuse("nombre 51 refusé", { ...base, nombre: 51 }, "nombre");
    refuse("nombre décimal refusé", { ...base, nombre: 12.5 }, "nombre");
    refuse("nombre illisible refusé", { ...base, nombre: "abc" }, "nombre");
    refuse("nombre absent refusé", { ...base, nombre: undefined }, "nombre");
    refuse("temps 14 refusé", { ...base, temps: 14 }, "temps");
    refuse("temps 121 refusé", { ...base, temps: 121 }, "temps");
    refuse("temps décimal refusé", { ...base, temps: 30.5 }, "temps");
    refuse("source inconnue refusée", { ...base, source: "web" }, "source");
    refuse("difficulté inconnue refusée", { ...base, difficulte: "extreme" }, "difficulte");
    refuse("aucune matière refusée", { ...base, topics: [] }, "topics");
    refuse("matières inconnues seulement refusées", { ...base, topics: ["bogus"] }, "topics");
    refuse("matières absentes refusées", { ...base, topics: undefined }, "topics");
    refuse("mixte : part 9 % refusée", { ...base, type: "mixte", partCalculs: 9 }, "partCalculs");
    refuse("mixte : part 91 % refusée", { ...base, type: "mixte", partCalculs: 91 }, "partCalculs");
    const tout = validerParams({});
    ok("tout est signalé d'un coup (type, nombre, matières)", !tout.ok && ["type", "nombre", "topics"].every((c) => tout.erreurs.some((e) => e.champ === c)), JSON.stringify(tout));
    ok("null et non-objets refusés sans exception", !validerParams(null).ok && !validerParams("x").ok && !validerParams(42).ok);
    for (const [t, n] of [[15, 5], [120, 50]]) ok(`bornes acceptées : temps ${t}, nombre ${n}`, validerParams({ ...base, temps: t, nombre: n }).ok);
    ok("mixte : parts 10 et 90 acceptées", validerParams({ ...base, type: "mixte", partCalculs: 10 }).ok && validerParams({ ...base, type: "mixte", partCalculs: 90 }).ok);
  }

  section("Réglages : répartition et libellés");
  {
    ok("questions seules : tout en questions", eq(repartirNombre({ type: "questions", nombre: 12, partCalculs: 0 }), { questions: 12, calculs: 0 }));
    ok("calculs seuls : tout en calculs", eq(repartirNombre({ type: "calculs", nombre: 12, partCalculs: 100 }), { questions: 0, calculs: 12 }));
    ok("mixte 10 à 40 % : 6 questions et 4 calculs", eq(repartirNombre({ type: "mixte", nombre: 10, partCalculs: 40 }), { questions: 6, calculs: 4 }));
    ok("mixte 5 à 10 % : au moins un calcul", eq(repartirNombre({ type: "mixte", nombre: 5, partCalculs: 10 }), { questions: 4, calculs: 1 }));
    ok("mixte 5 à 90 % : au moins une question", eq(repartirNombre({ type: "mixte", nombre: 5, partCalculs: 90 }), { questions: 1, calculs: 4 }));
    ok("mixte : 15 à 30 % → 4,5 arrondi à 5 (demi supérieur)", eq(repartirNombre({ type: "mixte", nombre: 15, partCalculs: 30 }), { questions: 10, calculs: 5 }));
    let bon = true;
    for (let n = 5; n <= 50; n++) {
      let prec = 0;
      for (let p = 10; p <= 90; p++) {
        const r = repartirNombre({ type: "mixte", nombre: n, partCalculs: p });
        if (r.questions + r.calculs !== n || r.calculs < 1 || r.questions < 1 || r.calculs < prec) bon = false;
        prec = r.calculs;
      }
    }
    ok("mixte, tous nombres (5-50) et toutes parts (10-90) : somme juste, au moins un de chaque, croissant", bon);
    ok("dureeEstimee : 10 questions de 30 s = 353 s", dureeEstimee({ nombre: 10, temps: 30 }) === 353);
    ok("libelleDuree", libelleDuree(353) === "5 min 53 s" && libelleDuree(45) === "45 s" && libelleDuree(120) === "2 min" && libelleDuree(3900) === "1 h 05" && libelleDuree(-3) === "0 s");
    ok("libelleParams", libelleParams({ type: "questions", nombre: 20, source: "mocks", topics: ["ethics", "quant", "fsa"], difficulte: "difficile", temps: 45 }) === "20 questions · mocks · 3 matières · difficile · 45 s");
    ok("libelleParams : calculs, toutes les matières, difficulté mélangée", libelleParams({ type: "calculs", nombre: 10, source: "banque", topics: SALLE_TOPIC_KEYS, difficulte: "melange", temps: 60 }) === "10 calculs · toutes les matières · difficulté mélangée · 60 s");
    const p: SalleParams = { type: "mixte", nombre: 20, source: "mocks", topics: ["ethics", "quant"], difficulte: "moyen", temps: 60, partCalculs: 40 };
    const json = paramsVersJson(p);
    ok("paramsVersJson : snake_case attendu par lancer_session", eq(json, { type: "mixte", nombre: 20, source: "mocks", topics: ["ethics", "quant"], difficulte: "moyen", temps: 60, part_calculs: 40 }));
    ok("paramsDepuisJson : relit les réglages et les nombres tirés", eq(paramsDepuisJson({ ...json, nb_questions: 12, nb_calculs: 8 }), { ...p, nbQuestions: 12, nbCalculs: 8 }));
    ok("paramsDepuisJson : sans les nombres tirés, la répartition prévue", eq(paramsDepuisJson(json), { ...p, nbQuestions: 12, nbCalculs: 8 }));
    ok("paramsDepuisJson : JSON abîmé → réglages par défaut, sans exception", paramsDepuisJson(null).nombre === 10);
  }

  // -------------------------------------------------------------------------
  section("Conversion de l'état (etat_salle)");
  const brutEtat = (surcharge: Record<string, unknown> = {}) => ({
    server_now: "2026-10-30T20:00:40.000Z",
    salle: { id: "s-1", nom: "Les CFA du jeudi", description: null, code: "K7MX2Q", publique: true, admin_id: "u1", created_at: "2026-10-30T19:00:00Z" },
    moi: { user_id: "u1", est_admin: true },
    nb_membres: 2,
    membres: [
      { user_id: "u1", username: "Théo", avatar_url: null, role: "admin", est_admin: true, elo: 1250, rejoint_le: "2026-10-30T19:00:00Z" },
      { user_id: "u2", username: null, avatar_url: "http://x/a.png", role: "membre", est_admin: false, elo: null, rejoint_le: "2026-10-30T19:05:00Z" },
    ],
    session: {
      id: "ses-1", numero: 2, statut: "en_cours",
      params: { type: "mixte", nombre: 10, source: "banque", topics: ["quant", "fsa"], difficulte: "melange", temps: 30, part_calculs: 40, nb_questions: 6, nb_calculs: 4 },
      nb: 10, temps: 30, pause: 5, started_at: "2026-10-30T20:00:00Z", fin_at: "2026-10-30T20:05:50Z",
      index: 1, phase: "question", nb_visibles: 2, nb_fermees: 1, repondu_courante: 1, nb_joueurs: 2,
    },
    items: [
      { position: 0, origine: "question", topic: "quant", difficulte: "facile", libelle: null, enonce: "Q0", choix: ["a", "b", "c"], donnees: null, unite: null, decimales: null },
      { position: 1, origine: "calcul", topic: "bogus", difficulte: "moyen", libelle: "Quant · TVM", enonce: "Calculez", choix: null, donnees: [{ label: "PV", value: "100" }, { label: "r", value: "5 %" }], unite: "$", decimales: 2 },
    ],
    corrections: [{ position: 0, bonne_index: 1, bonne_valeur: null, explication: "Parce que.", etapes: null }],
    mes_reponses: [{ position: 0, choix: 1, valeur: null, juste: true, points: 912, delai_ms: 2600 }],
    classement: [{ rang: 1, user_id: "u1", username: "Théo", avatar_url: null, points: 912, bonnes: 1, repondues: 1, temps_ms: 2600 }],
    mon_classement: { rang: 1, points: 912, bonnes: 1, repondues: 1, temps_ms: 2600 },
    historique: [
      { session_id: "ses-0", numero: 1, nb: 5, params: { type: "questions", nombre: 5, source: "mocks", topics: ["quant"], difficulte: "facile", temps: 20, part_calculs: 0 }, started_at: "2026-10-30T19:10:00Z", fin_at: "2026-10-30T19:12:00Z", nb_joueurs: 2, gagnant: { user_id: "u2", username: "Zoé", points: 4200 }, moi: { rang: 2, points: 3100 } },
      { session_id: "ses-00", numero: 0, nb: 5, params: { type: "questions", nombre: 5, source: "mocks", topics: ["quant"], difficulte: "facile", temps: 20, part_calculs: 0 }, started_at: "2026-10-30T19:00:00Z", fin_at: "2026-10-30T19:02:00Z", nb_joueurs: 0, gagnant: null, moi: null },
    ],
    ...surcharge,
  });
  const etat: EtatSalle = toEtat(brutEtat());
  ok("toEtat : salle, moi, membres", etat.salle.code === "K7MX2Q" && etat.salle.adminId === "u1" && etat.moi.estAdmin && etat.membres.length === 2 && etat.membres[0].estAdmin && etat.membres[1].username === null && etat.membres[1].elo === null);
  ok("toEtat : session (réglages relus, phase, compteurs)", etat.session?.id === "ses-1" && etat.session.phase === "question" && etat.session.params.partCalculs === 40 && etat.session.params.nbQuestions === 6 && etat.session.params.nbCalculs === 4 && etat.session.nbVisibles === 2 && etat.session.reponduCourante === 1 && etat.session.pause === 5);
  ok("toEtat : QCM et calcul", etat.items[0].choix?.length === 3 && etat.items[0].donnees === null && etat.items[1].origine === "calcul" && etat.items[1].donnees?.[1].value === "5 %" && etat.items[1].choix === null && etat.items[1].decimales === 2);
  ok("toEtat : matière inconnue → null", etat.items[1].topic === null && etat.items[0].topic === "quant");
  ok("toEtat : corrections, mes réponses, classement", etat.corrections[0].bonneIndex === 1 && eq(etat.corrections[0].etapes, []) && etat.mesReponses[0].delaiMs === 2600 && etat.classement[0].tempsMs === 2600 && etat.monClassement?.rang === 1);
  ok("toEtat : historique (gagnant, mon rang, ou rien)", etat.historique[0].gagnant?.username === "Zoé" && etat.historique[0].moi?.rang === 2 && etat.historique[1].gagnant === null && etat.historique[1].moi === null && etat.historique[0].params.source === "mocks");
  {
    const vide = toEtat(brutEtat({ session: null, items: [], corrections: [], mes_reponses: [], classement: [], mon_classement: null, historique: [] }));
    ok("toEtat : salle sans partie", vide.session === null && vide.monClassement === null && vide.items.length === 0);
    ok("toEtat : JSON vide sans exception", toEtat({}).membres.length === 0 && toEtat(null).session === null);
  }
  ok("prochainDepuis : nombre de corrections déjà reçues (0 sans état)", prochainDepuis(etat) === 1 && prochainDepuis(null) === 0 && prochainDepuis(toEtat(brutEtat({ session: null }))) === 0);
  {
    const suivant = toEtat(
      brutEtat({
        items: [{ position: 1, origine: "calcul", topic: "quant", difficulte: "moyen", libelle: "Quant · TVM", enonce: "Calculez", choix: null, donnees: [], unite: "$", decimales: 2 }, { position: 2, origine: "question", topic: "fsa", difficulte: "facile", libelle: null, enonce: "Q2", choix: ["x", "y"], donnees: null, unite: null, decimales: null }],
        corrections: [{ position: 1, bonne_index: null, bonne_valeur: 105, explication: null, etapes: ["100 × 1,05"] }],
      }),
    );
    const f = fusionnerEtat(etat, suivant);
    ok("fusionnerEtat : énoncés et corrections ajoutés par position", eq(f.items.map((i) => i.position), [0, 1, 2]) && eq(f.corrections.map((c) => c.position), [0, 1]) && f.corrections[1].bonneValeur === 105);
    ok("fusionnerEtat : le plus récent l'emporte, le reste vient du nouvel état", f.items[1].topic === "quant" && f.session === suivant.session);
    const autre = toEtat(brutEtat({ session: { ...(brutEtat().session as object), id: "ses-2" } }));
    ok("fusionnerEtat : autre partie → nouvel état tel quel", fusionnerEtat(etat, autre) === autre);
    ok("fusionnerEtat : sans état précédent → nouvel état tel quel", fusionnerEtat(null, suivant) === suivant);
  }

  // -------------------------------------------------------------------------
  section("Appels (faux client Supabase)");
  type Appel = { fn: string; args: Record<string, unknown> };
  const faux = (reponses: Record<string, unknown | ((args: Record<string, unknown>, n: number) => unknown)>, appels: Appel[] = [], tableOk = true) => {
    const compteurs: Record<string, number> = {};
    const client = {
      rpc: async (fn: string, args: Record<string, unknown> = {}) => {
        appels.push({ fn, args });
        compteurs[fn] = (compteurs[fn] ?? 0) + 1;
        const r = reponses[fn];
        const v = typeof r === "function" ? (r as (a: Record<string, unknown>, n: number) => unknown)(args, compteurs[fn]) : r;
        if (v && typeof v === "object" && "__erreur" in (v as object)) return { data: null, error: (v as { __erreur: unknown }).__erreur };
        return { data: v ?? null, error: null };
      },
      from: () => ({ select: () => ({ limit: async () => ({ error: tableOk ? null : { code: "42P01", message: 'relation "public.salles" does not exist' } }) }) }),
    };
    return client as unknown as SupabaseClient;
  };
  {
    const appels: Appel[] = [];
    const c = faux({ etat_salle: brutEtat() }, appels);
    const lu = await getEtatSalle(c, "s-1", 3);
    ok("getEtatSalle : passe la salle et la position de départ", lu.ok && appels[0].fn === "etat_salle" && eq(appels[0].args, { p_salle_id: "s-1", p_depuis: 3 }));
    ok("getEtatSalle : renvoie l'état et le décalage d'horloge", lu.ok && lu.data.salle.nom === "Les CFA du jeudi" && Number.isFinite(lu.data.decalageMs));
    const neg = await getEtatSalle(faux({ etat_salle: brutEtat() }, [], true), "s-1", -5);
    ok("getEtatSalle : position négative ramenée à 0", neg.ok);
    const appels2: Appel[] = [];
    await getEtatSalle(faux({ etat_salle: brutEtat() }, appels2), "s-1", -5);
    ok("getEtatSalle : p_depuis jamais négatif", appels2[0].args.p_depuis === 0);
  }
  {
    const absente = await getEtatSalle(faux({ etat_salle: { __erreur: { code: "PGRST202", message: "Could not find the function public.etat_salle(p_depuis, p_salle_id) in the schema cache" } } }), "s-1");
    ok("migration absente : { ok: false, migrationAbsente: true } et message poli", !absente.ok && absente.migrationAbsente && absente.message === "Les salles arrivent bientôt.", JSON.stringify(absente));
    const metier = await getEtatSalle(faux({ etat_salle: { __erreur: { code: "P0001", message: "Salle introuvable." } } }), "s-1");
    ok("erreur du serveur : le message français passe, pas de fausse migration absente", !metier.ok && !metier.migrationAbsente && metier.message === "Salle introuvable.", JSON.stringify(metier));
    const liste = await getMesSalles(faux({ mes_salles: { __erreur: { code: "42883", message: "function mes_salles() does not exist" } } }));
    ok("getMesSalles : migration absente sans exception", !liste.ok && liste.migrationAbsente);
    const planteur = { rpc: async () => { throw new Error("boom"); } } as unknown as SupabaseClient;
    const lecture = await getMesSalles(planteur);
    ok("lecture : une exception du client est rattrapée", !lecture.ok);
    ok("sallesReady : table présente", (await sallesReady(faux({}))) === true);
    ok("sallesReady : table absente", (await sallesReady(faux({}, [], false))) === false);
  }
  {
    const appels: Appel[] = [];
    const prev = etat; // corrections.length = 1, session ses-1
    const c = faux(
      {
        etat_salle: (args: Record<string, unknown>, n: number) =>
          n === 1 && args.p_depuis === 1
            ? brutEtat({ session: { ...(brutEtat().session as object), id: "ses-2" }, items: [], corrections: [] })
            : brutEtat({ session: { ...(brutEtat().session as object), id: "ses-2" } }),
      },
      appels,
    );
    const lu = await lireEtatSalle(c, "s-1", prev);
    ok("lireEtatSalle : autre partie détectée → relecture depuis 0", lu.ok && appels.length === 2 && appels[0].args.p_depuis === 1 && appels[1].args.p_depuis === 0 && lu.data.session?.id === "ses-2" && lu.data.items.length === 2);
    const appels2: Appel[] = [];
    const lu2 = await lireEtatSalle(faux({ etat_salle: brutEtat() }, appels2), "s-1", prev);
    ok("lireEtatSalle : même partie → une seule lecture, fusionnée", lu2.ok && appels2.length === 1 && appels2[0].args.p_depuis === 1 && lu2.data.items.length === 2);
    const appels3: Appel[] = [];
    await lireEtatSalle(faux({ etat_salle: brutEtat() }, appels3), "s-1", null);
    ok("lireEtatSalle : premier appel depuis 0", appels3[0].args.p_depuis === 0);
  }
  {
    const appels: Appel[] = [];
    const c = faux({ rejoindre_salle: { id: "s-1", nom: "Les CFA du jeudi", publique: false, deja_membre: false } }, appels);
    const r = await rejoindreSalleParCode(c, "k7m-x2q");
    ok("rejoindreSalleParCode : code normalisé avant l'appel", appels[0].fn === "rejoindre_salle" && appels[0].args.p_code === "K7MX2Q" && r.nom === "Les CFA du jeudi" && r.dejaMembre === false);
    let leve = "";
    const appelsKo: Appel[] = [];
    try {
      await rejoindreSalleParCode(faux({}, appelsKo), "K7MX20");
    } catch (e) {
      leve = (e as Error).message;
    }
    ok("rejoindreSalleParCode : code ambigu refusé sans appel", /ni 0/.test(leve) && appelsKo.length === 0, leve);
  }
  {
    let message = "";
    try {
      await creerSalle(faux({ creer_salle: { __erreur: { code: "P0001", message: "Tu administres déjà 10 salles : supprime-en une avant d'en créer une autre." } } }), "Ma salle");
    } catch (e) {
      message = (e as Error).message;
    }
    ok("creerSalle : le message du serveur est repris", /10 salles/.test(message), message);
    const appels: Appel[] = [];
    const r = await creerSalle(faux({ creer_salle: { id: "s-9", code: "ABC234", nom: "Ma salle", publique: true } }, appels), "Ma salle", true, "pour réviser");
    ok("creerSalle : arguments et résultat", eq(appels[0].args, { p_nom: "Ma salle", p_publique: true, p_description: "pour réviser" }) && r.code === "ABC234" && r.publique);
  }
  {
    const appels: Appel[] = [];
    const c = faux(
      { repondre_salle: { ok: true, deja: false, juste: true, points: 880, delai_ms: 3600, choix: 2, valeur: null, bonne_index: 2, bonne_valeur: null, explication: "Parce que.", etapes: null } },
      appels,
    );
    const r = await repondreSalle(c, "ses-1", 4, { choix: 2 });
    ok("repondreSalle QCM : p_choix envoyé, correction rendue", appels[0].args.p_choix === 2 && appels[0].args.p_valeurs === undefined && r.ok && r.juste && r.points === 880 && r.bonneIndex === 2 && r.explication === "Parce que.");
    const appels2: Appel[] = [];
    const c2 = faux({ repondre_salle: { ok: true, deja: false, juste: false, points: 0, delai_ms: 9000, choix: null, valeur: 8.5, bonne_index: null, bonne_valeur: 8.53, explication: null, etapes: ["PV × (1 + r)"] } }, appels2);
    const r2 = await repondreSalle(c2, "ses-1", 5, { saisie: "8,5 %" });
    ok("repondreSalle calcul : la saisie est lue (virgule, unité)", eq(appels2[0].args.p_valeurs, [8.5]) && r2.ok && !r2.juste && r2.bonneValeur === 8.53 && r2.etapes.length === 1);
    const appels3: Appel[] = [];
    await repondreSalle(faux({ repondre_salle: { ok: true, juste: true } }, appels3), "ses-1", 5, { saisie: "16,500" });
    ok("repondreSalle calcul : « 16,500 » envoie les deux lectures", eq(appels3[0].args.p_valeurs, [16.5, 16500]), JSON.stringify(appels3[0].args));
    const appels4: Appel[] = [];
    let msg = "";
    try {
      await repondreSalle(faux({}, appels4), "ses-1", 5, { saisie: "abc" });
    } catch (e) {
      msg = (e as Error).message;
    }
    ok("repondreSalle calcul : saisie illisible refusée sans appel", /pas un nombre/.test(msg) && appels4.length === 0, msg);
    const fmt = await repondreSalle(faux({ repondre_salle: { ok: false, raison: "format", indice: "Réponds en pourcentage : 8.5 pour 8,5 %." } }), "ses-1", 5, { saisie: "0,085" });
    ok("repondreSalle calcul : mauvaise échelle → { ok: false, raison: format }", !fmt.ok && fmt.raison === "format" && /pourcentage/.test(fmt.indice));
    let tard = "";
    try {
      await repondreSalle(faux({ repondre_salle: { __erreur: { code: "P0001", message: "Le temps est écoulé pour cette question." } } }), "ses-1", 4, { choix: 0 });
    } catch (e) {
      tard = (e as Error).message;
    }
    ok("repondreSalle : « Le temps est écoulé… » repris tel quel", tard === "Le temps est écoulé pour cette question.", tard);
  }
  {
    ok("messageErreurSalle : Not authenticated", /Session expirée/.test(messageErreurSalle(new Error("Not authenticated"))));
    ok("messageErreurSalle : réseau", /réseau/.test(messageErreurSalle({ message: "TypeError: Failed to fetch" })));
    ok("messageErreurSalle : erreur technique → phrase neutre", /réessaie/.test(messageErreurSalle({ message: 'duplicate key value violates unique constraint "salles_code_key"' })));
    ok("messageErreurSalle : migration absente", messageErreurSalle({ code: "PGRST202", message: "x" }) === "Les salles arrivent bientôt.");
    ok("messageErreurSalle : vide → repli", messageErreurSalle(null, "repli") === "repli");
    ok("estMigrationAbsente : fonction, table, cache", estMigrationAbsente({ code: "42883" }) && estMigrationAbsente({ code: "42P01" }) && estMigrationAbsente({ message: "Could not find the function public.creer_salle in the schema cache" }) && !estMigrationAbsente({ message: "Salle introuvable." }) && !estMigrationAbsente(null));
  }

  // -------------------------------------------------------------------------
  section("Calculs tirés côté serveur");
  {
    ok("mixDeDifficulte : un niveau = 100 % de ce niveau", eq(mixDeDifficulte("difficile"), { facile: 0, moyen: 0, difficile: 100 }) && eq(mixDeDifficulte("facile"), { facile: 100, moyen: 0, difficile: 0 }));
    ok("mixDeDifficulte : mélangé = 50/30/20 comme /calculs/session", eq(mixDeDifficulte("melange"), { facile: 50, moyen: 30, difficile: 20 }));

    const t = tirerCalculs({ topics: SALLE_TOPIC_KEYS, difficulte: "melange" }, 10, seeded(5));
    ok("10 calculs demandés → 10 tirés", t.calculs.length === 10 && !t.manque, `${t.calculs.length}`);
    const cle = (c: (typeof t.calculs)[number]) => `${c.topic}|${c.libelle}|${c.enonce}|${JSON.stringify(c.donnees)}`;
    ok("aucun doublon", new Set(t.calculs.map(cle)).size === t.calculs.length);
    const unites = ["%", "$", "x", "years", "bp", ""];
    const sains = t.calculs.every(
      (c) =>
        Number.isFinite(c.reponse) &&
        Number.isFinite(c.tolerance) &&
        c.tolerance >= 0 &&
        c.enonce.length > 0 &&
        c.etapes.length > 0 &&
        Number.isInteger(c.decimales) &&
        c.decimales >= 0 &&
        c.decimales <= 8 &&
        unites.includes(c.unite) &&
        c.donnees.every((d) => typeof d.label === "string" && typeof d.value === "string") &&
        c.libelle.includes(" · ") &&
        SALLE_TOPIC_KEYS.includes(c.topic) &&
        ["facile", "moyen", "difficile"].includes(c.niveau) &&
        typeof c.stricte === "boolean",
    );
    ok("chaque calcul a sa réponse, sa tolérance, sa correction et son libellé", sains);
    ok("la correction ne répète pas la ligne « Réponse : »", t.calculs.every((c) => c.etapes.length < 2 || !/^ *Réponse *:/i.test(c.etapes[c.etapes.length - 1])));

    const meme = tirerCalculs({ topics: SALLE_TOPIC_KEYS, difficulte: "melange" }, 10, seeded(5));
    ok("tirage reproductible avec la même graine", eq(meme.calculs, t.calculs));
    const autre = tirerCalculs({ topics: SALLE_TOPIC_KEYS, difficulte: "melange" }, 10, seeded(6));
    ok("une autre graine donne un autre tirage", !eq(autre.calculs, t.calculs));

    const quant = tirerCalculs({ topics: ["quant"], difficulte: "melange" }, 12, seeded(1));
    ok("matière unique respectée", quant.calculs.length > 0 && quant.calculs.every((c) => c.topic === "quant"));
    const deux = tirerCalculs({ topics: ["quant", "fsa"], difficulte: "melange" }, 20, seeded(2));
    ok("deux matières : seulement ces deux-là, et les deux présentes", deux.calculs.every((c) => c.topic === "quant" || c.topic === "fsa") && new Set(deux.calculs.map((c) => c.topic)).size === 2);
    for (const niveau of ["facile", "moyen", "difficile"] as const) {
      const r = tirerCalculs({ topics: SALLE_TOPIC_KEYS, difficulte: niveau }, 10, seeded(3));
      ok(`difficulté « ${niveau} » : que des calculs de ce niveau`, r.calculs.length > 0 && r.calculs.every((c) => c.niveau === niveau), r.calculs.map((c) => c.niveau).join(","));
    }
    const petit = tirerCalculs({ topics: ["quant"], difficulte: "melange" }, 3, seeded(4));
    ok("moins de 5 demandés → exactement le nombre demandé", petit.calculs.length === 3 && !petit.manque);
    ok("0 demandé → rien, sans manque", eq(tirerCalculs({ topics: ["quant"], difficulte: "melange" }, 0), { calculs: [], demandes: 0, manque: false }));
    const aucune = tirerCalculs({ topics: [], difficulte: "melange" }, 5);
    ok("aucune matière → rien et manque", aucune.calculs.length === 0 && aucune.manque);
    const gros = tirerCalculs({ topics: ["quant"], difficulte: "facile" }, 50, seeded(8));
    ok("demande plus grande que le vivier → moins de calculs et manque signalé", gros.calculs.length <= 50 && (gros.calculs.length === 50 || gros.manque), `${gros.calculs.length}`);
  }
  {
    const appels: Appel[] = [];
    const lancee = { session_id: "ses-9", numero: 3, nb: 20, nb_questions: 12, nb_calculs: 8, manque: false, started_at: "2026-10-30T20:00:08Z", server_now: "2026-10-30T20:00:00Z" };
    const r = await lancerSession(faux({ lancer_session: lancee }, appels), "s-1", { type: "mixte", nombre: 20, topics: ["quant", "fsa"], source: "mocks", difficulte: "melange", temps: 40, partCalculs: 40 }, seeded(11));
    const a = appels[0];
    ok("lancerSession (mixte 20 à 40 %) : 8 calculs envoyés avec réponse, réglages en snake_case", a.fn === "lancer_session" && (a.args.p_calculs as unknown[]).length === 8 && (a.args.p_params as Record<string, unknown>).part_calculs === 40 && (a.args.p_params as Record<string, unknown>).source === "mocks" && a.args.p_salle_id === "s-1");
    ok("lancerSession : résultat converti", r.sessionId === "ses-9" && r.nbCalculs === 8 && r.nbQuestions === 12 && r.manque === false && r.numero === 3);
    ok("lancerSession : chaque calcul envoyé porte sa réponse", (a.args.p_calculs as { reponse: number }[]).every((c) => Number.isFinite(c.reponse)));

    const appelsQ: Appel[] = [];
    await lancerSession(faux({ lancer_session: lancee }, appelsQ), "s-1", { type: "questions", nombre: 10, topics: ["ethics"] }, seeded(11));
    ok("lancerSession (questions) : aucun calcul envoyé", (appelsQ[0].args.p_calculs as unknown[]).length === 0);

    const appelsC: Appel[] = [];
    await lancerSession(faux({ lancer_session: lancee }, appelsC), "s-1", { type: "calculs", nombre: 15, topics: ["quant", "equity"], difficulte: "moyen" }, seeded(11));
    ok("lancerSession (calculs) : les calculs demandés, source ramenée à la banque", (appelsC[0].args.p_calculs as unknown[]).length === 15 && (appelsC[0].args.p_params as Record<string, unknown>).source === "banque");

    const appelsKo: Appel[] = [];
    let msg = "";
    try {
      await lancerSession(faux({}, appelsKo), "s-1", { type: "calculs", nombre: 3, topics: [] });
    } catch (e) {
      msg = (e as Error).message;
    }
    ok("lancerSession : réglages invalides refusés avant tout appel, tous les messages réunis", appelsKo.length === 0 && /nombre de questions va de 5 à 50/.test(msg) && /au moins une matière/.test(msg), msg);

    let pasAdmin = "";
    try {
      await lancerSession(faux({ lancer_session: { __erreur: { code: "P0001", message: "Seul l'admin de la salle peut lancer une partie." } } }), "s-1", { type: "questions", nombre: 10, topics: ["quant"] });
    } catch (e) {
      pasAdmin = (e as Error).message;
    }
    ok("lancerSession : « Seul l'admin… » repris tel quel", /admin/.test(pasAdmin), pasAdmin);
  }

  // -------------------------------------------------------------------------
  section("Garde-fous : jamais de réponse côté navigateur");
  {
    const clients = ["lib/salles/api.ts", "lib/salles/logique.ts", "lib/salles/types.ts"];
    const interdits = [/lib\/calc\/index/, /session-draw/, /\.\/serveur/, /lib\/calc\/(ethics|quant|economics|corporate|fsa|equity|fixed-income|derivatives|alternatives|portfolio)/];
    for (const f of clients) {
      const src = lire(f);
      ok(`${f} n'importe ni catalogue de calculs ni lib/salles/serveur`, !interdits.some((re) => re.test(src.replace(/\/\/.*$/gm, ""))));
    }
    ok("lib/salles/serveur.ts rappelle de ne pas l'importer côté client", /JAMAIS être importé par un composant\s+\/\/ client/.test(lire("lib/salles/serveur.ts")));
  }

  // -------------------------------------------------------------------------
  section("Cohérence migration_salles.sql ↔ TypeScript");
  {
    const sql = lire("migration_salles.sql");
    ok("alphabet des codes identique", sql.includes(`c_alphabet CONSTANT text := '${SALLE_CODE_ALPHABET}'`));
    ok("contrainte de format du code (31 caractères sans ambiguïté)", sql.includes("'^[A-HJKMNP-Z2-9]{6}$'"));
    ok("décompte et pause identiques", sql.includes(`c_decompte CONSTANT int := ${SALLE_DECOMPTE_S}`) && sql.includes(`c_pause    CONSTANT int := ${SALLE_PAUSE_S}`));
    const marges = [...sql.matchAll(/c_marge\s+CONSTANT numeric := (\d+)/g)].map((m) => Number(m[1]));
    ok("marge réseau identique dans l'horloge et dans repondre_salle", marges.length === 2 && marges.every((m) => m === SALLE_MARGE_S), marges.join(","));
    ok("aperçu identique", new RegExp(`c_apercu CONSTANT numeric := ${SALLE_APERCU_S}`).test(sql));
    ok("score : 1000 × (0,5 + 0,5 × restant / temps), demi supérieur", sql.includes("floor(1000 * (0.5 + 0.5 * v_restant / v_ses.temps) + 0.5)"));
    ok("répartition du mélange : même arrondi", sql.includes("floor(v_nombre * (v_p ->> 'part_calculs')::int / 100.0 + 0.5)"));
    const listes = [...sql.matchAll(/ARRAY\['ethics',[^\]]*\]/g)].map((m) => m[0]);
    ok("la liste des matières du SQL = SALLE_TOPIC_KEYS", listes.length >= 1 && listes.every((l) => eq([...l.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]), SALLE_TOPIC_KEYS)), listes.join(" | "));
    const enChaine = sql.match(/WHEN v_el ->> 'topic' IN \(([^)]*)\)/);
    ok("la liste des matières acceptées pour un calcul = SALLE_TOPIC_KEYS", !!enChaine && eq([...enChaine[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]), SALLE_TOPIC_KEYS));

    const fonctions = [...sql.matchAll(/CREATE OR REPLACE FUNCTION (\w+)\(/g)].map((m) => m[1]);
    const publiques = fonctions.filter((f) => !f.startsWith("_"));
    const internes = fonctions.filter((f) => f.startsWith("_") && f !== "_salle_moi_membre");
    ok(`${fonctions.length} fonctions : ${publiques.length} publiques, ${internes.length + 1} internes`, publiques.length === 14 && internes.length === 12, `${publiques.length}/${internes.length}`);
    ok("chaque RPC publique est accordée aux joueurs connectés", publiques.every((f) => new RegExp(`GRANT EXECUTE ON FUNCTION ${f}\\(`).test(sql)), publiques.filter((f) => !new RegExp(`GRANT EXECUTE ON FUNCTION ${f}\\(`).test(sql)).join(","));
    ok("chaque RPC publique est retirée à PUBLIC et anon", publiques.every((f) => new RegExp(`REVOKE ALL ON FUNCTION ${f}\\([^)]*\\) FROM PUBLIC, anon;`).test(sql)));
    ok("chaque outil interne est retiré à tout le monde", internes.every((f) => new RegExp(`REVOKE ALL ON FUNCTION ${f}\\([^)]*\\) FROM PUBLIC, anon, authenticated;`).test(sql)), internes.filter((f) => !new RegExp(`REVOKE ALL ON FUNCTION ${f}\\([^)]*\\) FROM PUBLIC, anon, authenticated;`).test(sql)).join(","));
    ok("les RPC attendues par lib/salles/api.ts existent", ["creer_salle", "rejoindre_salle", "rejoindre_salle_publique", "quitter_salle", "modifier_salle", "supprimer_salle", "salles_publiques", "mes_salles", "salle_questions_disponibles", "lancer_session", "etat_salle", "repondre_salle", "arreter_session", "classement_session"].every((f) => publiques.includes(f)));
    const api = lire("lib/salles/api.ts");
    const appelees = [...api.matchAll(/(?:appeler|lire)\(supabase, "(\w+)"/g)].map((m) => m[1]);
    ok("tout appel de api.ts correspond à une RPC du SQL", appelees.length >= 12 && appelees.every((f) => publiques.includes(f)), appelees.filter((f) => !publiques.includes(f)).join(","));

    // les clés JSON lues par toEtat existent côté SQL
    const cles = ["server_now", "salle", "moi", "nb_membres", "membres", "session", "items", "corrections", "mes_reponses", "classement", "mon_classement", "historique", "repondu_courante", "nb_visibles", "nb_fermees", "nb_joueurs", "bonne_index", "bonne_valeur", "explication", "etapes", "delai_ms", "temps_ms", "avatar_url", "est_admin", "deja_membre", "en_cours", "session_id", "nb_questions", "nb_calculs", "manque", "started_at", "fin_at", "libelle", "donnees", "decimales", "unite", "deja", "raison", "indice"];
    ok("les clés JSON lues côté TypeScript sont écrites côté SQL", cles.every((k) => sql.includes(`'${k}'`)), cles.filter((k) => !sql.includes(`'${k}'`)).join(","));
    // clés qui viennent du nom d'une colonne (json_agg d'une ligne) : rejoint_le, derniere_activite, admin_username, gagnant
    ok("les clés issues de colonnes existent aussi", ["rejoint_le", "derniere_activite", "admin_username", "gagnant"].every((k) => new RegExp(`\\b${k}\\b`).test(sql)));
    const debut = sql.indexOf("-- énoncés révélés");
    const milieu = sql.indexOf("-- corrections des seules questions closes");
    const fin = sql.indexOf("INTO v_mes", milieu);
    const blocItems = sql.slice(debut, milieu);
    const blocCorrections = sql.slice(milieu, fin);
    ok("la bonne réponse n'est jamais dans la liste des énoncés d'etat_salle", debut > 0 && milieu > debut && !/bonne_|explication|etapes|tolerance|stricte/.test(blocItems));
    ok("les énoncés sont limités aux questions révélées, les corrections aux questions closes", /i\.position < v_h\.nb_visibles/.test(blocItems) && /i\.position < v_h\.nb_fermees/.test(blocCorrections));
    ok("le classement en direct ne compte que les questions closes", /_salle_classement\(p_salle_id, v_ses\.id, v_h\.nb_fermees\)/.test(sql));
    ok("les tables aux réponses cachées n'ont aucune policy", !/ON salle_items\b[^;]*FOR/.test(sql.replace(/REVOKE[^;]*;/g, "")) && !/ON salle_reponses\b[^;]*FOR/.test(sql.replace(/REVOKE[^;]*;/g, "")));
  }

  console.log(ko ? `\n${ko} échec(s)` : "\nTout est vert");
  process.exit(ko ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
