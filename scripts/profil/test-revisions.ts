// Tests légers de la file des révisions et de « À revoir » côté site
// (migration_v3_profil.sql §3b), sans base ni réseau :
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-revisions.ts
// Vérifie : la lecture de revisions_dues (bornes, éléments illisibles
// écartés), le repli sans la section (ratures ouvertes, 25 au plus, par le
// client admin comme par la session), les pastilles « rature » et
// « rappel · J+7 », la ligne « 15 à revoir · demain 22 », la taille ?n=, la
// réponse de revoir_lancer (étiquettes rangées par question, « vide »,
// « bientôt »), les textes du bilan, getEclairStats (séries éclair
// seulement avec la colonne genre, relue sans elle sinon) et l'historique de
// Moi (« À revoir » nommée et menant à /revoir).
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEclairStats } from "@/lib/eclair";
import { getSessionHistory } from "@/components/moi/history-data";
import {
  REVOIR,
  lancementDepuis,
  ligneRevisions,
  lireMesRevisions,
  lireRevisions,
  pastilleRevision,
  repliRevisions,
  revisionsDepuis,
  tailleRevoir,
} from "@/lib/revisions";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const J = JSON.stringify;
const NB = String.fromCharCode(160);

// ── revisionsDepuis et le repli ──────────────────────────────────────────
const brut = {
  aujourdhui: 30,
  demain: "22",
  ratures: 6,
  rappels: 24,
  items: [
    { q: "a", genre: "rature", palier: 0, due: "2026-10-16T10:00:00Z" },
    { q: "b", genre: "rappel", palier: 3, due: "2026-10-16T11:00:00Z" },
    { q: "c", genre: "autre", palier: 1, due: "x" },
    { genre: "rappel", palier: 1 },
  ],
};
const lue = revisionsDepuis(brut);
check("revisionsDepuis : comptes bornés à 25, nombres en texte lus", lue?.aujourdhui === 25 && lue.demain === 22 && lue.ratures === 6 && lue.rappels === 24 && lue.complet === true, J(lue));
check("revisionsDepuis : éléments illisibles écartés (genre inconnu, sans question)", J(lue?.items.map((i) => [i.q, i.genre, i.palier])) === J([["a", "rature", 0], ["b", "rappel", 3]]));
check("revisionsDepuis : réponse illisible → null", revisionsDepuis(null) === null && revisionsDepuis([]) === null && revisionsDepuis({ items: [] }) === null);
check("repliRevisions : ratures ouvertes, 25 au plus, sans demain ni rappels, complet faux", J(repliRevisions(31)) === J({ aujourdhui: 25, demain: 0, ratures: 31, rappels: 0, items: [], complet: false }));

// ── lireRevisions (client admin) et lireMesRevisions (session) ───────────
type Rep = { data?: unknown; error?: { code?: string; message?: string } | null; count?: number | null };
/** Un client factice : rpc(nom) → réponses[nom] ; from("ratures") → compte. */
function client(rpcs: Record<string, Rep | "jette">, compte: Rep | "jette" = { count: 0, error: null }) {
  const appels: string[] = [];
  const fin = (r: Rep | "jette") => (r === "jette" ? Promise.reject(new Error("réseau")) : Promise.resolve({ data: null, error: null, count: null, ...r }));
  const chaine: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "lte"]) chaine[m] = (...a: unknown[]) => (appels.push(`${m}:${J(a[0])}`), chaine);
  chaine.then = (ok: (v: unknown) => unknown, ko: (e: unknown) => unknown) => fin(compte).then(ok, ko);
  const sb = {
    rpc: (nom: string) => (appels.push(`rpc:${nom}`), fin(rpcs[nom] ?? { error: { code: "PGRST202", message: "Could not find the function" } })),
    from: (t: string) => (appels.push(`from:${t}`), chaine),
  };
  return { sb: sb as unknown as SupabaseClient, appels };
}

const main = async () => {
  let c = client({ revisions_dues: { data: brut } });
  let r = await lireRevisions(c.sb, "u1");
  check("lireRevisions : revisions_dues lue (complet)", r.complet && r.aujourdhui === 25 && r.items.length === 2 && !c.appels.includes("from:ratures"));

  c = client({ revisions_dues: { error: { code: "42883", message: "function revisions_dues does not exist" } } }, { count: 12, error: null });
  r = await lireRevisions(c.sb, "u1");
  check("lireRevisions sans la section : les ratures ouvertes et visibles du joueur", !r.complet && r.aujourdhui === 12 && r.ratures === 12 && r.demain === 0, J(r));
  check("lireRevisions sans la section : filtre joueur, en cours, visibles", ["eq:\"user_id\"", "is:\"removed_at\"", "lte:\"visible_from\""].every((a) => c.appels.includes(a)), J(c.appels));

  c = client({ revisions_dues: { error: { code: "42883", message: "absente" } } }, { count: 40, error: null });
  r = await lireRevisions(c.sb, "u1");
  check("lireRevisions sans la section : 25 au plus", r.aujourdhui === 25 && r.ratures === 40);

  c = client({ revisions_dues: "jette" }, "jette");
  r = await lireRevisions(c.sb, "u1");
  check("lireRevisions : réseau en panne partout → rien à revoir, sans erreur", !r.complet && r.aujourdhui === 0);

  c = client({ get_ratures: { data: { total: 30, items: [] } } });
  r = await lireMesRevisions(c.sb);
  check("lireMesRevisions sans la section : le total de get_ratures, 25 au plus", !r.complet && r.aujourdhui === 25 && r.ratures === 30, J(r));
  c = client({ mes_revisions_dues: { data: { aujourdhui: 9, demain: 4, ratures: 3, rappels: 6, items: [] } } });
  r = await lireMesRevisions(c.sb);
  check("lireMesRevisions : mes_revisions_dues lue", r.complet && r.aujourdhui === 9 && r.demain === 4 && !c.appels.includes("rpc:get_ratures"));

  // ── textes ─────────────────────────────────────────────────────────────
  check("pastilles : « rature », « rappel · J+1 / J+3 / J+7 / J+21 »", J([pastilleRevision("rature", 0), ...[1, 2, 3, 4].map((p) => pastilleRevision("rappel", p))]) === J(["rature", "rappel · J+1", "rappel · J+3", "rappel · J+7", "rappel · J+21"]));
  check("pastilles : rappel sans palier lisible, « rappel »", pastilleRevision("rappel", 0) === "rappel" && pastilleRevision("rappel", 9) === "rappel");
  check("ligne : « 15 à revoir · demain 22 »", ligneRevisions({ aujourdhui: 15, demain: 22 }) === `15 à revoir · demain${NB}22`, String(ligneRevisions({ aujourdhui: 15, demain: 22 })));
  check("ligne : « 15 à revoir » sans demain ; « Rien à revoir · demain 3 » ; rien du tout : null",
    ligneRevisions({ aujourdhui: 15, demain: 0 }) === "15 à revoir" && ligneRevisions({ aujourdhui: 0, demain: 3 }) === `Rien à revoir · demain${NB}3` && ligneRevisions({ aujourdhui: 0, demain: 0 }) === null);
  check("taille ?n= : 15 par défaut, bornée à 10..25", J([undefined, "3", "40", "20", ["12"], "abc", "0"].map(tailleRevoir)) === J([15, 10, 25, 20, 12, 15, 15]));
  check("bilan : « 15 revues · 13 justes · demain 22 »", REVOIR.resume(15, 13, 22) === `15 revues · 13 justes · demain${NB}22`, REVOIR.resume(15, 13, 22));
  check("bilan : singulier, et sans demain connu", REVOIR.resume(1, 1, 0) === "1 revue · 1 juste" && REVOIR.resume(5, 0, null) === "5 revues · 0 juste");
  check("vide : trop peu, à jour avec demain, à jour sans rien",
    REVOIR.videTexte(3, 7).startsWith("3 seulement") && REVOIR.videTexte(3, 7).endsWith("Demain, 7.") && REVOIR.videTexte(0, 4) === "Tout est à jour. Demain, 4 à revoir." && !REVOIR.videTexte(0, 0).includes("Demain"));
  check("départ : « 6 ratures sèches · 1 rappel »", REVOIR.depart({ aujourdhui: 7, ratures: 6, rappels: 1 }) === "6 ratures sèches · 1 rappel" && REVOIR.depart({ aujourdhui: 1, ratures: 1, rappels: 0 }) === "1 rature sèche");

  // ── revoir_lancer ──────────────────────────────────────────────────────
  const q = (position: number, id: string) => ({ position, id, prompt: `Q${position}`, choices: ["A", "B", "C"], topic: "fsa", selected_index: null, correct_index: null, explanation: null });
  const l = lancementDepuis({
    id: "s1",
    started_at: "2026-10-17T08:00:00Z",
    genre: "revoir",
    questions: [q(1, "b"), q(0, "a"), q(2, "c")],
    etiquettes: [{ q: "a", genre: "rature", palier: 0 }, { q: "b", genre: "rappel", palier: 3 }],
  });
  check("revoir_lancer : questions rangées par position, étiquettes par question (sans étiquette : rappel)",
    l.kind === "ok" && J(l.serie.questions.map((x) => [x.id, x.genre, x.palier])) === J([["a", "rature", 0], ["b", "rappel", 3], ["c", "rappel", 0]]), J(l));
  check("revoir_lancer : « vide » (aujourdhui, demain)", J(lancementDepuis({ vide: true, aujourdhui: 3, demain: 8 })) === J({ kind: "vide", aujourdhui: 3, demain: 8 }));
  check("revoir_lancer : réponse sans série → « bientôt »", lancementDepuis(null).kind === "soon" && lancementDepuis({ id: null }).kind === "soon");

  // ── getEclairStats : les séries éclair seulement ─────────────────────────
  const stats = async (avecGenre: boolean) => {
    const filtres: string[][] = [];
    const sb = {
      from: () => {
        const f: string[] = [];
        filtres.push(f);
        const ch: Record<string, unknown> = {};
        for (const m of ["select", "eq", "gte", "not", "order", "limit"]) ch[m] = (...a: unknown[]) => (f.push(`${m}:${String(a[0])}${a[1] !== undefined && m === "eq" ? "=" + String(a[1]) : ""}`), ch);
        ch.then = (ok: (v: unknown) => unknown) => {
          const genre = f.includes("eq:genre=eclair");
          if (genre && !avecGenre) return Promise.resolve({ data: null, count: null, error: { code: "42703", message: "column eclair_series.genre does not exist" } }).then(ok);
          const rows = f.some((x) => x.startsWith("limit")) ? [{ score: 4, total: 5 }, { score: 5, total: 5 }] : null;
          return Promise.resolve({ data: rows, count: genre ? 2 : 3, error: null }).then(ok);
        };
        return ch;
      },
    };
    return { s: await getEclairStats(sb as unknown as SupabaseClient, "u1"), filtres };
  };
  const avec = await stats(true);
  check("getEclairStats avec genre : trois lectures filtrées « eclair »", avec.filtres.length === 3 && avec.filtres.every((f) => f.includes("eq:genre=eclair")) && avec.s?.today === 2 && avec.s.recentPct === 90, J(avec.s));
  const sans = await stats(false);
  check("getEclairStats sans la colonne : relue sans le filtre, mêmes stats qu'avant", sans.filtres.length === 6 && sans.filtres.slice(3).every((f) => !f.includes("eq:genre=eclair")) && sans.s?.today === 3 && sans.s.total === 3, J(sans.s));

  // ── l'historique de Moi : « À revoir » nommée ─────────────────────────
  const historique = async (avecGenre: boolean) => {
    const colonnes: string[] = [];
    const sb = {
      from: (t: string) => {
        const ch: Record<string, unknown> = {};
        let cols = "";
        ch.select = (c: string) => ((cols = c), colonnes.push(`${t}:${c}`), ch);
        for (const m of ["eq", "not", "order", "limit"]) ch[m] = () => ch;
        ch.then = (ok: (v: unknown) => unknown) => {
          if (t !== "eclair_series") return Promise.resolve({ data: [], error: null }).then(ok);
          if (cols.includes("genre") && !avecGenre) return Promise.resolve({ data: null, error: { code: "42703", message: "column eclair_series.genre does not exist" } }).then(ok);
          const rows = [
            { id: "e1", score: 4, total: 5, finished_at: "2026-10-17T08:00:00Z", ...(avecGenre ? { genre: "eclair" } : {}) },
            { id: "e2", score: 13, total: 15, finished_at: "2026-10-17T09:00:00Z", ...(avecGenre ? { genre: "revoir" } : {}) },
          ];
          return Promise.resolve({ data: rows, error: null }).then(ok);
        };
        return ch;
      },
    };
    return { h: await getSessionHistory(sb as unknown as SupabaseClient, "u1", Date.parse("2026-10-17T10:00:00Z")), colonnes };
  };
  const h1 = await historique(true);
  check("historique : la séance « À revoir » nommée et menant à /revoir, la série éclair inchangée",
    J(h1.h.map((x) => [x.title, x.href, x.total])) === J([["À revoir", "/revoir", 15], ["5 questions de cours", "/eclair", 5]]), J(h1.h.map((x) => x.title)));
  const h2 = await historique(false);
  check("historique sans la colonne genre : relu sans elle, tout en séries éclair comme avant",
    h2.h.length === 2 && h2.h.every((x) => x.href === "/eclair") && h2.colonnes.filter((c) => c.startsWith("eclair_series")).length === 2, J(h2.colonnes));

  console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
  process.exit(ko ? 1 : 0);
};
void main();
