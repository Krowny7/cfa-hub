// Test de « La carte du jour » de l'accueil « Le lobby » (lot 4), sans base,
// réseau ni navigateur (calculs purs, lecture sur un faux client, puis rendu
// react-dom/server) :
//   npx tsx --tsconfig tsconfig.json scripts/accueil/test-lobby-carte.tsx
// Les réglages (illisibles : le défaut), la validation de l'action (zéro
// matière refusée), le tirage (stable sur un jour, autre le lendemain), les
// trois sources et leurs replis, le prompt exact, le rendu (carte, panneau,
// un seul liquide, inerte), les fichiers (pas d'Intl dans l'îlot, pas de chemin
// local, pas de texture qui glisse). Les noms de classes des modules CSS sont
// rendus tels quels.
import "../codex/sans-css";
import fs from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { SUBJECTS } from "@/components/reviser/catalog";
import { CARTE_JOUR, CONSIGNE_IA } from "@/lib/voice-accueil-lobby-carte";

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
const NB = String.fromCharCode(160);
const routeur = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
const DOSSIER = "components/accueil/lobby/";
const lire = (chemin: string) => fs.readFileSync(chemin, "utf8");

async function main() {
  const M = await import("@/components/accueil/lobby/modele-carte");
  const L = await import("@/components/accueil/lobby/lecture-carte");
  const { CarteDuJour } = await import("@/components/accueil/lobby/CarteDuJour");
  const { reglerCarteDuJour } = await import("@/components/accueil/lobby/actions-carte");
  type Carte = import("@/components/accueil/lobby/modele-carte").CarteDuJourLobby;

  // ── les réglages ──────────────────────────────────────────────────────────
  titre("# les réglages du compte");
  const TOUTES = SUBJECTS.map((s) => s.key);
  check("les dix matières de la carte = celles du catalogue (clés, ordre, code des coins)", M.MATIERES_CARTE.length === 10 && M.MATIERES_CARTE.every((m, i) => m.cle === SUBJECTS[i].key && m.code === SUBJECTS[i].code));
  const defaut = { mats: TOUTES, src: "toutes" };
  for (const [nom, brut] of [["absent", undefined], ["null", null], ["une chaîne", "fsa"], ["un tableau", ["fsa"]], ["un nombre", 4], ["objet vide", {}]] as const) {
    check(`réglage illisible (${nom}) : les dix matières, « toutes »`, JSON.stringify(M.reglagesDuCompte(brut)) === JSON.stringify(defaut));
  }
  check("matières vides ou toutes inconnues : les dix matières", JSON.stringify(M.reglagesDuCompte({ m: [], s: "marquees" }).mats) === JSON.stringify(TOUTES) && M.reglagesDuCompte({ m: ["x", 4, null], s: "marquees" }).mats.length === 10);
  check("une clé inconnue est ignorée, le reste est gardé", JSON.stringify(M.reglagesDuCompte({ m: ["fsa", "inconnue"], s: "marquees" })) === JSON.stringify({ mats: ["fsa"], src: "marquees" }));
  check("une source inconnue redonne « toutes », les matières sont gardées", JSON.stringify(M.reglagesDuCompte({ m: ["fsa"], s: "zzz" })) === JSON.stringify({ mats: ["fsa"], src: "toutes" }));
  check("l'ordre est celui du programme, sans doublon", JSON.stringify(M.reglagesDuCompte({ m: ["portfolio", "ethics", "ethics", "fsa"], s: "faibles" }).mats) === JSON.stringify(["ethics", "fsa", "portfolio"]));
  check("lecture depuis user_metadata.rl_carte_jour", JSON.stringify(M.lireReglages({ user_metadata: { rl_carte_jour: { m: ["equity"], s: "faibles" } } })) === JSON.stringify({ mats: ["equity"], src: "faibles" }) && M.CLE_CARTE_JOUR === "rl_carte_jour");
  check("compte sans métadonnées : le défaut", JSON.stringify(M.lireReglages({ user_metadata: null })) === JSON.stringify(defaut) && JSON.stringify(M.lireReglages(undefined)) === JSON.stringify(defaut));
  check("ce qu'on écrit dans le compte : { m, s }", JSON.stringify(M.versLeCompte({ mats: ["fsa"], src: "marquees" })) === JSON.stringify({ m: ["fsa"], s: "marquees" }));

  titre("# la validation (ce que l'action accepte)");
  check("un réglage valide passe, rangé dans l'ordre du programme", JSON.stringify(M.validerReglages({ mats: ["fsa", "ethics", "fsa"], src: "faibles" })) === JSON.stringify({ mats: ["ethics", "fsa"], src: "faibles" }));
  check("ZÉRO matière : refusé", M.validerReglages({ mats: [], src: "toutes" }) === null);
  check("une clé de matière inconnue : refusé (rien d'écrit)", M.validerReglages({ mats: ["fsa", "zzz"], src: "toutes" }) === null);
  check("une source inconnue : refusé", M.validerReglages({ mats: ["fsa"], src: "nimporte" }) === null);
  check("pas un objet, pas de tableau, pas de chaînes : refusé", [null, undefined, "fsa", 3, [], { mats: "fsa", src: "toutes" }, { mats: [1], src: "toutes" }, { src: "toutes" }].every((x) => M.validerReglages(x) === null));
  const refus = await reglerCarteDuJour({ mats: [], src: "toutes" });
  check("l'action refuse 0 matière sans toucher à la base", !refus.ok && refus.erreur === CARTE_JOUR.reglages.refus, JSON.stringify(refus));
  const refus2 = await reglerCarteDuJour({ mats: ["zzz"], src: "toutes" });
  const refus3 = await reglerCarteDuJour("n'importe quoi");
  check("l'action refuse aussi une clé inconnue et un corps absurde", !refus2.ok && !refus3.ok);

  // ── le tirage ─────────────────────────────────────────────────────────────
  titre("# le tirage");
  check("FNV-1a : valeurs de référence (vide, « a »)", M.fnv1a("") === 0x811c9dc5 && M.fnv1a("a") === 0xe40c292c);
  const ids = ["c9", "c2", "c7", "c4", "c1", "c5", "c8", "c3"];
  const g1 = M.graineDuJour("u1", "2026-11-01", { mats: ["fsa"], src: "marquees" });
  check("la graine porte le joueur, le jour, la source et les matières", g1 === "u1|2026-11-01|marquees|fsa");
  check("même graine, même carte (et quel que soit l'ordre du lot)", M.gagnant(g1, ids) === M.gagnant(g1, [...ids].reverse()) && M.gagnant(g1, ids) === M.gagnant(g1, ids));
  const jours = Array.from({ length: 30 }, (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}`);
  const gagnants = new Set(jours.map((j) => M.gagnant(M.graineDuJour("u1", j, { mats: ["fsa"], src: "marquees" }), ids)));
  check("une autre carte le lendemain : le tirage varie sur 30 jours", gagnants.size >= 4, `${gagnants.size} cartes différentes`);
  const sansUn = M.classerParTirage(g1, ids.filter((x) => x !== "c4"));
  check("une carte de plus ne bouscule pas l'ordre des autres", JSON.stringify(M.classerParTirage(g1, ids).filter((x) => x !== "c4")) === JSON.stringify(sansUn));
  check("lot vide : null ; doublons écartés", M.gagnant(g1, []) === null && M.classerParTirage(g1, ["a", "a", "b"]).length === 2);

  titre("# le tirage carte par carte");
  check("aucun paquet : null", M.choisirPaquet("g", []) === null);
  const grands = [
    { id: "p-petit", nb: 1 },
    { id: "p-grand", nb: 9 },
  ];
  let grand = 0;
  let dehors = 0;
  for (let i = 0; i < 2000; i++) {
    const r = M.choisirPaquet(`graine-${i}`, grands);
    if (r?.id === "p-grand") grand++;
    if (!r || r.rang === null || r.rang < 0 || r.rang >= (r.id === "p-grand" ? 9 : 1)) dehors++;
  }
  check("un paquet de 9 cartes sort neuf fois sur dix (2 000 tirages)", grand > 1700 && grand < 1900, String(grand));
  check("le rang tiré est toujours dans le paquet", dehors === 0);
  const inconnu = M.choisirPaquet("g", [{ id: "a", nb: null }, { id: "b", nb: 5 }]);
  check("une taille inconnue : paquet tiré, rang à tirer à la lecture (null)", !!inconnu && inconnu.rang === null);
  check("un paquet à 0 carte compte comme une taille inconnue", M.choisirPaquet("g", [{ id: "a", nb: 0 }, { id: "b", nb: 3 }])?.rang === null);
  check("l'indice dans un paquet est stable et borné", M.indexDansPaquet("g", 7) === M.indexDansPaquet("g", 7) && M.indexDansPaquet("g", 7) < 7 && M.indexDansPaquet("g", 0) === 0);

  titre("# la part d'un paquet qui revient à une notion");
  const p = M.partDuPaquet;
  check("trois notions, 31 cartes : [0,10) [10,20) [20,31) (la dernière garde le reste)", JSON.stringify([p(0, 3, 31), p(1, 3, 31), p(2, 3, 31)]) === JSON.stringify([{ debut: 0, fin: 10 }, { debut: 10, fin: 20 }, { debut: 20, fin: 31 }]));
  check("une seule notion : tout le paquet ; paquet vide : rien ; trop de notions : tout le paquet", JSON.stringify([p(0, 1, 40), p(1, 2, 0), p(0, 5, 3)]) === JSON.stringify([{ debut: 0, fin: 40 }, { debut: 0, fin: 0 }, { debut: 0, fin: 3 }]));

  // ── le prompt ─────────────────────────────────────────────────────────────
  titre("# le prompt « Copier pour l'IA »");
  const RECTO = "In a period of rising prices, LIFO vs FIFO: effect on COGS?";
  const VERSO = "LIFO → COGS plus élevé, résultat plus faible, stocks au bilan plus bas.";
  const ATTENDU = "Tu es mon tuteur pour le CFA niveau I. Explique-moi simplement cette carte, comme à un étudiant : l'intuition, un petit exemple chiffré, et le piège classique à l'examen. Recto : In a period of rising prices, LIFO vs FIFO: effect on COGS? Verso : LIFO → COGS plus élevé, résultat plus faible, stocks au bilan plus bas.";
  check("le prompt de la maquette, mot pour mot", M.promptIA(RECTO, VERSO) === ATTENDU);
  check("la consigne est celle de la voix", M.promptIA(RECTO, VERSO).startsWith(CONSIGNE_IA));
  const brut = M.promptIA("What is **duration**?", "Indenture = ==contrat issuer ↔ bondholders==\nEn clair : il fixe les features.\nPiège : le rating n'y figure pas.\n$$D = \\frac{a}{b}$$");
  check("le balisage d'affichage disparaît, les retours à la ligne deviennent des espaces", !brut.includes("==") && !brut.includes("**") && !brut.includes("\n") && brut.includes("Recto : What is duration? Verso : Indenture = contrat issuer ↔ bondholders En clair :"));
  check("les formules restent en LaTeX", brut.includes("$$D = \\frac{a}{b}$$"));
  check("les formules en ligne aussi", M.texteBrut("Prix = $P_0$ et **$D$**") === "Prix = $P_0$ et $D$");

  titre("# la ligne sous le titre");
  const resume = (mats: string[], src: "toutes" | "marquees" | "faibles") => M.resumeReglages({ mats, src });
  check("une matière : « FSA · tes cartes marquées »", resume(["fsa"], "marquees") === "FSA · tes cartes marquées");
  check("deux : « FSA · Fixed Income · tes points faibles »", resume(["fsa", "fixed_income"], "faibles") === "FSA · Fixed Income · tes points faibles");
  check("trois et plus : « 3 matières · … » ; dix : « 10 matières · toutes les flashcards »", resume(["ethics", "fsa", "equity"], "toutes") === "3 matières · toutes les flashcards" && resume(TOUTES, "toutes") === "10 matières · toutes les flashcards");
  check("la note du panneau : singulier et pluriel", M.noteReglages(["fsa"], "toutes") === "1 matière cochée · toutes les flashcards" && M.noteReglages(["fsa", "equity"], "marquees") === "2 matières cochées · tes cartes marquées");

  // ── la lecture, sur un faux client ────────────────────────────────────────
  titre("# la lecture sur un faux client");
  type Req = { table: string; cols: string; filtres: { col: string; op: string; val: unknown }[] };
  type Rep = { data?: unknown; error?: { code?: string; message?: string } | null };
  const faux = (tables: Record<string, (r: Req) => Rep>, rpcs: Record<string, () => Rep> = {}) => {
    const journal: Req[] = [];
    const sb = {
      from(table: string) {
        const r: Req = { table, cols: "", filtres: [] };
        const b: Record<string, unknown> = {};
        const chaine = () => b;
        b.select = (cols: string) => ((r.cols = cols), b);
        b.eq = (col: string, val: unknown) => (r.filtres.push({ col, op: "eq", val }), b);
        b.in = (col: string, val: unknown) => (r.filtres.push({ col, op: "in", val }), b);
        b.order = chaine;
        b.limit = chaine;
        b.range = chaine;
        b.like = chaine;
        b.then = (ok: (x: unknown) => unknown, ko: (e: unknown) => unknown) => {
          journal.push(r);
          const f = tables[table];
          return Promise.resolve(f ? f(r) : { data: [], error: null }).then(ok, ko);
        };
        return b;
      },
      rpc(nom: string) {
        const f = rpcs[nom];
        return Promise.resolve(f ? f() : { data: null, error: { code: "42883" } });
      },
    };
    return { sb: sb as never, journal };
  };

  const T = {
    fsa1: "Financial Statement Analysis — Flashcards 1/4 (Cadre d'analyse, résultat & bilan)",
    fsa2: "Financial Statement Analysis — Flashcards 2/4 (Flux de trésorerie & stocks)",
    fi1: "Fixed Income — Flashcards 1/4 (Bonds)",
    eq1: "Equity — Flashcards 1/4 (Markets)",
    der1: "Derivatives — Flashcards 1/4 (Forwards)",
    vieux: "Fixed Income — Credit analysis",
  };
  const SETS = [
    { id: "s-fsa1", title: T.fsa1, n: 6, officiel: true },
    { id: "s-fsa2", title: T.fsa2, n: 4, officiel: true },
    { id: "s-fi1", title: T.fi1, n: 5, officiel: true },
    { id: "s-eq1", title: T.eq1, n: 3, officiel: true },
    { id: "s-der1", title: T.der1, n: 0, officiel: true },
    { id: "s-vieux", title: T.vieux, n: 9, officiel: true },
    { id: "s-prive", title: "Equity — Flashcards 2/4 (Privé)", n: 4, officiel: false },
  ];
  const CARTES = SETS.flatMap((s) => Array.from({ length: s.n }, (_, i) => ({ id: `${s.id}-c${i + 1}`, set_id: s.id, position: i + 1, front: `Question ${s.id} ${i + 1}`, back: `Réponse ${s.id} ${i + 1}` })));
  const idsDe = (s: string) => CARTES.filter((c) => c.set_id === s).map((c) => c.id);
  const filtrer = (r: Req, ligne: Record<string, unknown>) =>
    r.filtres.every((f) => (f.op === "eq" ? ligne[f.col] === f.val : Array.isArray(f.val) && f.val.includes(ligne[f.col])));
  const tablesBase = (opts: { sansCompte?: boolean; marquees?: { carte: string; set: string }[]; marqueesAbsentes?: boolean } = {}) => ({
    flashcard_sets: (r: Req): Rep => {
      if (opts.sansCompte && r.cols.includes("(count)")) return { data: null, error: { code: "PGRST200", message: "embed refusé" } };
      const lignes = SETS.map((s) => ({ id: s.id, title: s.title, is_official: s.officiel, official_published: s.officiel, flashcards: [{ count: s.n }] })).filter((l) => filtrer(r, l));
      return { data: lignes.map((l) => (r.cols.includes("(count)") ? l : { id: l.id, title: l.title })), error: null };
    },
    flashcards: (r: Req): Rep => ({ data: CARTES.filter((c) => filtrer(r, c)).map((c) => ({ id: c.id, front: c.front, back: c.back, position: c.position })), error: null }),
    flashcard_flags: (): Rep =>
      opts.marqueesAbsentes
        ? { data: null, error: { code: "PGRST205" } }
        : {
            data: (opts.marquees ?? []).map((m, i) => {
              const c = CARTES.find((x) => x.id === m.carte)!;
              const s = SETS.find((x) => x.id === m.set)!;
              return { card_id: c.id, source: "paquet", created_at: `2026-10-${10 + i}T10:00:00Z`, flashcards: { id: c.id, front: c.front, back: c.back, position: c.position, set_id: c.set_id, flashcard_sets: { id: s.id, title: s.title } } };
            }),
            error: null,
          },
  });
  const user = (meta?: Record<string, unknown>) => ({ id: "joueur-1", user_metadata: meta ?? null });
  const lecture = async (sbc: unknown, meta: Record<string, unknown> | undefined, jour = "2026-11-01") => L.lireCarteDuJour({ sb: sbc as never, user: user(meta), jour });

  // toutes
  {
    const { sb, journal } = faux(tablesBase());
    const c = await lecture(sb, undefined);
    check("« toutes » : une carte d'un paquet du programme", !!c && /^s-(fsa1|fsa2|fi1|eq1)-c\d$/.test(c.id), c?.id);
    check("   les paquets hors programme, vides ou privés ne sont jamais tirés (30 jours)", await (async () => {
      for (const j of jours) {
        const x = await lecture(faux(tablesBase()).sb, undefined, j);
        if (!x || /^s-(vieux|der1|prive)/.test(x.id)) return false;
      }
      return true;
    })());
    check("   recto/verso de la carte, matière, coins", !!c && c.recto.startsWith("Question ") && c.verso.startsWith("Réponse ") && !!M.matiereDe(c.matiere.cle) && c.matiere.code.length >= 2, JSON.stringify(c?.matiere));
    check("   la matière suit le paquet (FSA, Fixed Income, Equity)", !!c && ((c.id.startsWith("s-fsa") && c.matiere.cle === "fsa") || (c.id.startsWith("s-fi1") && c.matiere.cle === "fixed_income") || (c.id.startsWith("s-eq1") && c.matiere.cle === "equity")));
    check("   deux petites requêtes : les paquets, puis le paquet tiré", journal.length === 2 && journal[0].table === "flashcard_sets" && journal[1].table === "flashcards", journal.map((r) => r.table).join());
    check("   aucun repli, la ligne sous le titre dit les réglages", !!c && c.repli === null && c.resume === "10 matières · toutes les flashcards");
    check("   le prompt est celui de la carte", !!c && c.prompt === M.promptIA(c.recto, c.verso));
    const memeJour = await lecture(faux(tablesBase()).sb, undefined);
    check("   la même carte toute la journée (deux lectures)", !!c && memeJour?.id === c.id);
    const autres = new Set<string>();
    for (const j of jours) autres.add((await lecture(faux(tablesBase()).sb, undefined, j))?.id ?? "");
    check("   une autre carte les jours suivants", autres.size >= 6, `${autres.size} cartes sur 30 jours`);
    const autreJoueur = await L.lireCarteDuJour({ sb: faux(tablesBase()).sb, user: { id: "joueur-2", user_metadata: null }, jour: "2026-11-01" });
    check("   un autre joueur peut avoir une autre carte (graine = joueur + jour)", !!autreJoueur);
  }
  // sans compte de cartes
  {
    const { sb, journal } = faux(tablesBase({ sansCompte: true }));
    const c = await lecture(sb, undefined);
    check("sans le compte des cartes (embed refusé) : la carte se tire quand même (paquet pesé 1)", !!c && /^s-(fsa1|fsa2|fi1|eq1)-c\d$/.test(c.id) && journal.filter((r) => r.table === "flashcard_sets").length === 2, c?.id);
  }
  // une matière
  {
    let toutFsa = true;
    for (const j of jours) {
      const c = await lecture(faux(tablesBase()).sb, { rl_carte_jour: { m: ["fsa"], s: "toutes" } }, j);
      if (!c || !c.id.startsWith("s-fsa") || c.matiere.cle !== "fsa" || c.resume !== "FSA · toutes les flashcards") toutFsa = false;
    }
    check("une seule matière cochée (FSA) : toujours une carte FSA (30 jours)", toutFsa);
  }
  // matière sans carte
  {
    const c = await lecture(faux(tablesBase()).sb, { rl_carte_jour: { m: ["derivatives"], s: "toutes" } });
    check("matière sans carte (Dérivés vide) : repli sur le programme entier, et la ligne le dit", !!c && c.repli === CARTE_JOUR.replis.toutes && c.matiere.cle !== "derivatives" && c.reglages.mats.join() === "derivatives", JSON.stringify([c?.id, c?.repli]));
  }
  // marquées
  {
    const marquees = [
      { carte: "s-fsa1-c2", set: "s-fsa1" },
      { carte: "s-fi1-c4", set: "s-fi1" },
    ];
    let seulFsa = true;
    for (const j of jours.slice(0, 10)) {
      const c = await lecture(faux(tablesBase({ marquees })).sb, { rl_carte_jour: { m: ["fsa"], s: "marquees" } }, j);
      if (!c || c.id !== "s-fsa1-c2" || c.repli !== null || c.resume !== "FSA · tes cartes marquées") seulFsa = false;
    }
    check("marquées : la seule carte marquée de la matière", seulFsa);
    const deux = new Set<string>();
    for (const j of jours) deux.add((await lecture(faux(tablesBase({ marquees })).sb, { rl_carte_jour: { m: ["fsa", "fixed_income"], s: "marquees" } }, j))?.id ?? "");
    check("   deux marquées : les deux sortent, jamais une autre", deux.has("s-fsa1-c2") && deux.has("s-fi1-c4") && deux.size === 2, [...deux].join());
    const vide = await lecture(faux(tablesBase({ marquees })).sb, { rl_carte_jour: { m: ["equity"], s: "marquees" } });
    check("   aucune marquée dans ces matières : repli « marquées » + une carte du paquet entier", !!vide && vide.repli === CARTE_JOUR.replis.marquees && vide.id.startsWith("s-eq1"), JSON.stringify([vide?.id, vide?.repli]));
    const absente = await lecture(faux(tablesBase({ marqueesAbsentes: true })).sb, { rl_carte_jour: { m: ["fsa"], s: "marquees" } });
    check("   table des marques absente : le même repli, la page ne casse pas", !!absente && absente.repli === CARTE_JOUR.replis.marquees && absente.id.startsWith("s-fsa"));
  }
  // points faibles
  {
    const recentes = (n: number, ok: boolean) => Array.from({ length: n }, (_, i) => [`2026-10-${String(10 + (i % 15)).padStart(2, "0")}T10:00:00Z`, ok]);
    const ligne = (notion: string, extra: Record<string, unknown> = {}) => ({ notion, recentes: recentes(10, false), sources: {}, en_cours: 0, vives: 0, anciennes: 0, rayees_7j: 0, derniere: null, concepts: [], ...extra });
    const rpc = (notions: unknown[], remplie = true) => ({ points_faibles: () => ({ data: { remplie, rayees_semaine: 0, notions }, error: null }) });
    // FSA : la notion 2 est la seule faible, son paquet 1/4 compte 6 cartes pour 3 notions : sa part = positions 3 et 4
    let dansLaPart = true;
    for (const j of jours.slice(0, 12)) {
      const c = await lecture(faux(tablesBase(), rpc([ligne("fsa:2")])).sb, { rl_carte_jour: { m: ["fsa"], s: "faibles" } }, j);
      if (!c || !["s-fsa1-c3", "s-fsa1-c4"].includes(c.id) || c.repli !== null || c.matiere.cle !== "fsa") dansLaPart = false;
    }
    check("faibles (FSA, notion 2 sur 3 du paquet 1/4) : une carte de SA part du paquet", dansLaPart);
    // Fixed Income : le catalogue ne nomme pas de paquet, la carte vient des paquets de la matière
    let deLaMatiere = true;
    for (const j of jours.slice(0, 12)) {
      const c = await lecture(faux(tablesBase(), rpc([ligne("fixed_income:11")])).sb, { rl_carte_jour: { m: ["fixed_income"], s: "faibles" } }, j);
      if (!c || c.matiere.cle !== "fixed_income" || !c.id.startsWith("s-fi1") || c.repli !== null) deLaMatiere = false;
    }
    check("faibles (notion sans paquet nommé) : une carte des paquets de sa matière", deLaMatiere);
    const seulementCochees = await lecture(faux(tablesBase(), rpc([ligne("fixed_income:11")])).sb, { rl_carte_jour: { m: ["fsa"], s: "faibles" } });
    check("   une notion faible hors des matières cochées est ignorée : repli « faibles »", !!seulementCochees && seulementCochees.repli === CARTE_JOUR.replis.faibles && seulementCochees.id.startsWith("s-fsa"));
    const peu = await lecture(faux(tablesBase(), rpc([ligne("fsa:2", { recentes: recentes(3, false) })])).sb, { rl_carte_jour: { m: ["fsa"], s: "faibles" } });
    check("   trop peu de réponses (3 < 8) : pas de point faible, repli", !!peu && peu.repli === CARTE_JOUR.replis.faibles);
    const forte = await lecture(faux(tablesBase(), rpc([ligne("fsa:2", { recentes: recentes(12, true) })])).sb, { rl_carte_jour: { m: ["fsa"], s: "faibles" } });
    check("   une notion réussie (12 sur 12) n'est pas un point faible : repli", !!forte && forte.repli === CARTE_JOUR.replis.faibles);
    const nonRemplie = await lecture(faux(tablesBase(), rpc([ligne("fsa:2")], false)).sb, { rl_carte_jour: { m: ["fsa"], s: "faibles" } });
    const sansRpc = await lecture(faux(tablesBase()).sb, { rl_carte_jour: { m: ["fsa"], s: "faibles" } });
    check("   points_faibles pas remplie, ou absente (migration pas collée) : repli", !!nonRemplie && nonRemplie.repli === CARTE_JOUR.replis.faibles && !!sansRpc && sansRpc.repli === CARTE_JOUR.replis.faibles);
    // notionsFaibles, pur
    const lignes = [ligne("fsa:1"), ligne("fsa:2", { vives: 4, en_cours: 4 }), ligne("fixed_income:11"), ligne("inconnue:9"), ligne("fsa:3", { recentes: recentes(2, false) })].map((l) => ({
      notion: l.notion as string,
      recentes: (l.recentes as [string, boolean][]).map(([at, ok]) => ({ at, ok })),
      sources: {},
      enCours: (l as { en_cours?: number }).en_cours ?? 0,
      vives: l.vives as number,
      anciennes: 0,
      rayees7j: 0,
      derniere: null,
      concepts: [],
    }));
    const f = L.notionsFaibles(lignes, TOUTES);
    check("notionsFaibles : inconnues et insuffisantes écartées, la plus chargée d'abord", f.map((x) => x.id).join() === "fsa:2,fixed_income:11,fsa:1", f.map((x) => `${x.id}:${x.score}`).join());
    check("   le paquet et la part viennent du catalogue (FSA 2 : rang 1 sur 3 ; Fixed Income : aucun)", f[0].titrePaquet === T.fsa1 && f[0].rang === 1 && f[0].voisines === 3 && f[1].titrePaquet === null && f[1].voisines === 0);
    check("   les matières cochées filtrent ; le plafond est de 5", L.notionsFaibles(lignes, ["fixed_income"]).length === 1 && L.notionsFaibles(lignes, TOUTES, 2).length === 2);
  }
  // rien, ou en échec
  {
    const vide = await lecture(faux({ ...tablesBase(), flashcard_sets: () => ({ data: [], error: null }) }).sb, undefined);
    check("aucune flashcard en base : null (la carte est absente)", vide === null);
    const casse = await lecture({ from() { throw new Error("réseau"); }, rpc() { throw new Error("réseau"); } }, undefined);
    check("une lecture qui échoue : null, sans exception", casse === null);
    const erreur = await lecture(faux({ ...tablesBase(), flashcard_sets: () => ({ data: null, error: { code: "42501" } }) }).sb, undefined);
    check("une erreur de la base : null", erreur === null);
    const reglagesFous = await lecture(faux(tablesBase()).sb, { rl_carte_jour: "n'importe quoi" });
    check("un réglage illisible dans le compte : le défaut, la carte sort", !!reglagesFous && reglagesFous.reglages.mats.length === 10 && reglagesFous.reglages.src === "toutes");
  }

  // ── le rendu ──────────────────────────────────────────────────────────────
  titre("# le rendu");
  const carte = (extra: Partial<Carte> = {}): Carte => ({
    id: "c1",
    matiere: { cle: "fsa", court: "FSA", code: "FSA" },
    recto: RECTO,
    verso: VERSO,
    resume: "FSA · Fixed Income · toutes les flashcards",
    prompt: M.promptIA(RECTO, VERSO),
    reglages: { mats: ["fsa", "fixed_income"], src: "toutes" },
    repli: null,
    ...extra,
  });
  const rendre = (c: Carte, ouvert = false): string => {
    try {
      return renderToStaticMarkup(
        <AppRouterContext.Provider value={routeur}>
          <CarteDuJour carte={c} className="placement" ouvertAuDepart={ouvert} />
        </AppRouterContext.Provider>,
      )
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
    } catch (e) {
      console.log(e);
      return "";
    }
  };
  const ferme = rendre(carte());
  check("la carte se rend", ferme.length > 500);
  check("une section nommée par son titre « La carte du jour » (h2), placement donné", ferme.includes("<section") && ferme.includes(">La carte du jour</h2>") && ferme.includes("aria-labelledby=") && ferme.includes("placement"));
  check("le recto et le verso, sans étiquette de langue (demande de l'utilisateur)", ferme.includes(RECTO) && ferme.includes(VERSO) && !ferme.includes("en anglais") && !ferme.includes("en français"));
  check("la carte est un bouton à bascule, non retournée (aria-pressed=false)", ferme.includes('aria-pressed="false"') && compte(ferme, /class="fcj"/g) === 1);
  check("la face cachée sort de l'arbre d'accessibilité (le verso est aria-hidden)", compte(ferme, /aria-hidden="true"[^>]*><span class="idx"/g) === 1 && /class="jf verso"[^>]*aria-hidden="true"/.test(ferme));
  check("les coins portent le code de la matière, quatre fois", compte(ferme, /<b>FSA<\/b>/g) === 4);
  check("l'engrenage : bouton nommé « Choisir mes cartes du jour »", ferme.includes('aria-label="Choisir mes cartes du jour"') && ferme.includes('aria-expanded="false"'));
  check("« Copier pour l'IA » avec son aperçu (le prompt exact, en infobulle)", ferme.includes("Copier pour l'IA") && ferme.includes('role="tooltip"') && ferme.includes(ATTENDU));
  check("le panneau est fermé : pas de dialogue, ZÉRO liquide d'encre", !ferme.includes('role="dialog"') && compte(ferme, /rl-encre/g) === 0 && !ferme.includes("rl-encre-vif"));
  check("rien n'est inerte quand le panneau est fermé", !/\binert\b/.test(ferme));
  check("région annoncée aux lecteurs d'écran (vide au départ)", ferme.includes('role="status"'));
  const repli = rendre(carte({ repli: CARTE_JOUR.replis.marquees }));
  check("repli : la ligne sous le titre donne la raison à la place des réglages", repli.includes(CARTE_JOUR.replis.marquees) && !repli.includes("FSA · Fixed Income · toutes les flashcards"));
  check("sans repli : la ligne sous le titre donne les réglages", ferme.includes("FSA · Fixed Income · toutes les flashcards"));

  const ouvert = rendre(carte(), true);
  check("panneau ouvert : un dialogue nommé, avec son bouton de fermeture", ouvert.includes('role="dialog"') && ouvert.includes('aria-labelledby=') && ouvert.includes(CARTE_JOUR.reglages.fermer));
  check("   dix puces de matières, FSA et Fixed Income cochées", compte(ouvert, /class="chip( chipOn)?"/g) === 10 && compte(ouvert, /class="chip chipOn" aria-pressed="true"/g) === 2);
  check("   trois sources en radios natives, une seule cochée (toutes)", compte(ouvert, /type="radio"/g) === 3 && compte(ouvert, /checked=""/g) === 1 && ouvert.includes(CARTE_JOUR.sources.marquees.libelle) && ouvert.includes(CARTE_JOUR.sources.faibles.libelle));
  check("   « Enregistrer » est le SEUL liquide : un bouton d'encre graphite", compte(ouvert, /rl-encre/g) >= 1 && compte(ouvert, /class="rl-encre( [^"]*)?"/g) === 1 && ouvert.includes('data-palette="graphite"') && compte(ouvert, /rl-encre-vif/g) === 1 && ouvert.includes(">Enregistrer<"));
  check("   la note du pied : « 2 matières cochées · toutes les flashcards »", ouvert.includes("2 matières cochées · toutes les flashcards"));
  check("   la carte et le HUD sont inertes derrière le panneau", compte(ouvert, /\binert=""/g) === 2);
  check("   l'engrenage annonce le panneau ouvert", ouvert.includes('aria-expanded="true"'));

  // le texte rendu au serveur
  const formule = rendre(carte({ recto: "Compute **WACC**: $r_d = 5\\%$", verso: "Indenture = ==contrat issuer ↔ bondholders==\nEn clair : il fixe les features de la bond.\nPiège : le credit rating n'y figure pas." }));
  check("texte enrichi au serveur : formule KaTeX, gras", formule.includes('class="katex"') && formule.includes("<strong>WACC</strong>"));
  check("verso structuré : trois cases, le surligné est un <mark>", formule.includes(">À retenir<") === false && formule.includes(">En clair<") && formule.includes(">Piège<") && formule.includes("<mark") && formule.includes("contrat issuer"));
  const bloc = rendre(carte({ verso: "Duration\n$$D = \\frac{a}{b}$$\nEn clair : la sensibilité au taux." }));
  check("verso à formule en bloc : KaTeX en affichage, sans <div> ni <p> dans le bouton", bloc.includes("katex-display") && !/<div[^>]*class="(retenir|cases|clair)/.test(bloc));
  const liste = rendre(carte({ verso: "Trois piliers\nIdentify · Consider · Reflect\nEn clair : un cadre en trois temps." }));
  check("verso en liste : trois éléments de liste", compte(liste, /role="listitem"/g) === 3);
  const libre = rendre(carte({ verso: "Un verso libre,\nsur deux lignes." }));
  check("verso hors format (ancienne carte) : le texte tel quel, sans les trois cases", libre.includes("Un verso libre,") && libre.includes("sur deux lignes.") && !libre.includes(">En clair<"));
  const dangereux = rendre(carte({ recto: "<script>alert(1)</script> & <b>x</b>" }));
  check("le texte de la carte est échappé (pas de balise injectée)", !dangereux.includes("<script>alert(1)</script>"));

  // ── les fichiers ──────────────────────────────────────────────────────────
  titre("# les fichiers du lot");
  const fichiers = ["CarteDuJour.tsx", "CarteDuJourIle.tsx", "TexteCarte.tsx", "actions-carte.ts", "lecture-carte.ts", "modele-carte.ts", "CarteDuJour.module.css"].map((f) => DOSSIER + f).concat("lib/voice-accueil-lobby-carte.ts");
  const texte = Object.fromEntries(fichiers.map((f) => [f, lire(f)]));
  const ile = texte[DOSSIER + "CarteDuJourIle.tsx"];
  const clients = fichiers.filter((f) => /^\s*["']use client["']/.test(texte[f]));
  check('"use client" : seulement l\'îlot', clients.join() === DOSSIER + "CarteDuJourIle.tsx", clients.join());
  check("l'îlot : ni Intl ni toLocaleString (tout se formate au serveur)", !/Intl|toLocale/.test(ile));
  check("   et ni KaTeX, ni RichText, ni catalogue des cours/notions", !/katex|RichText|reviser\/catalog|lib\/notions|lib\/courses/.test(ile));
  check("   son modèle (importé par l'îlot) reste léger : ni notions, ni catalogue, ni Supabase", !/^import .*(lib\/notions|reviser\/catalog|supabase|ContentDetailHeader|lib\/courses)/m.test(texte[DOSSIER + "modele-carte.ts"]));
  check("   une seule pièce d'encre dans l'îlot : BoutonAction (jamais EncreVive à la main)", compte(ile, /<BoutonAction/g) === 1 && !/EncreVive/.test(ile));
  check("   aucune fonction passée du serveur : la page ne donne que des données et des ReactNode", !/=\{\s*\(.*\)\s*=>/.test(texte[DOSSIER + "CarteDuJour.tsx"]) && !/onClick|use client/.test(texte[DOSSIER + "CarteDuJour.tsx"]));
  check("les fichiers du lot : aucun chemin local (disque, Temp, scratchpad, AppData), aucun /_blob/", fichiers.every((f) => !/[A-Za-z]:[\\/]+(Users|Documents)|Temp|scratchpad|AppData|\/_blob\//.test(texte[f])), fichiers.filter((f) => /[A-Za-z]:[\\/]+(Users|Documents)|Temp|scratchpad|AppData|\/_blob\//.test(texte[f])).join());
  const css = texte[DOSSIER + "CarteDuJour.module.css"];
  check("CSS : aucune texture ni image de fond, aucune animation qui glisse", !/url\(/.test(css) && !/@keyframes|animation:/.test(css));
  check("CSS : la seule transition de la carte est le retournement (+ l'infobulle), coupées en mouvement réduit", compte(css, /transition:(?!\s*none)/g) === 2 && css.includes("prefers-reduced-motion: reduce"));
  check("CSS : téléphone par requête de conteneur, cibles de 44 px (engrenage, puces, radios, copier)", css.includes("@container (max-width: 760px)") && compte(css, /44px/g) >= 4);
  check("CSS : rien d'encre en fond (pas de var(--pal-encre))", !/pal-encre/.test(css));
  check("voix : tutoiement, aucun Intl", !/Intl|toLocale/.test(texte["lib/voice-accueil-lobby-carte.ts"]) && CARTE_JOUR.statut.reponse.length > 0);

  // le panneau ne dépend pas de la mise en page de son voisin : la voix nomme tout ce que l'îlot affiche
  check("la voix n'oublie rien : libellés des trois sources et des dix matières", Object.keys(CARTE_JOUR.sources).join() === "toutes,marquees,faibles" && M.MATIERES_CARTE.every((m) => m.libelle.length > 1 && !m.libelle.includes(NB)));

  console.log("");
  console.log(ko === 0 ? "TOUT VERT" : `${ko} échec(s)`);
  process.exit(ko === 0 ? 0 : 1);
}

main().catch((e) => {
  console.log(e);
  process.exit(1);
});
