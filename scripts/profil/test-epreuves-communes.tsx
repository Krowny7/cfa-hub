// Tests des parties de Salle comptées comme des rencontres (lib/salles/rencontres.ts)
// et des épreuves communes du Face-à-face (lib/profil/epreuves-communes.ts,
// components/profil/EpreuvesCommunes.tsx), sans base ni réseau ni navigateur :
//   npx tsx --tsconfig tsconfig.json scripts/profil/test-epreuves-communes.tsx
// Vérifie : qui gagne une partie (points, puis bonnes réponses, puis temps sur
// les bonnes ; tout pareil : nul), ce qu'est une partie finie (close, ou heure
// de fin passée), la lecture (les deux ont répondu, la partie pas finie
// ignorée, la salle supprimée comptée sans lien, les pages de 1000 lignes, la
// migration absente : rien, une panne : null), le Face-à-face (le type
// « Salle », ses points, son lien, son bilan) et son rendu.
import "./sans-css";
import "./react-global";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { SupabaseClient } from "@supabase/supabase-js";
import { issueSalle, lirePartiesCommunes, partieFinie, scoresSalle, type ScoreSalle } from "@/lib/salles/rencontres";
import { epreuvesCommunes, TYPES_EPREUVE, type EpreuvesCommunes as Donnees } from "@/lib/profil/epreuves-communes";
import { EpreuvesCommunes } from "@/components/profil/EpreuvesCommunes";
import { COMMUNES } from "@/lib/voice-profil";

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
/** les espaces insécables ramenés à des espaces simples */
const plat = (s: string) => s.replace(/[  ]/g, " ");
const routeur = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
const rendre = (el: React.ReactElement): string => plat(renderToStaticMarkup(<AppRouterContext.Provider value={routeur}>{el}</AppRouterContext.Provider>).replace(/&#x27;/g, "'"));

// ——— un client Supabase minimal en mémoire ———
type Row = Record<string, unknown>;
type Panne = { code?: string; message: string } | "leve";
function faux(tables: Record<string, Row[]>, pannes: Record<string, Panne> = {}) {
  const appels: string[] = [];
  const from = (table: string) => {
    const panne = pannes[table];
    if (panne === "leve") throw new Error("réseau");
    let rows = [...(tables[table] ?? [])];
    const trace: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = {
      select: () => b,
      eq: (c: string, v: unknown) => (trace.push(`eq(${c},${String(v)})`), (rows = rows.filter((r) => r[c] === v)), b),
      neq: (c: string, v: unknown) => (trace.push(`neq(${c},${String(v)})`), (rows = rows.filter((r) => r[c] !== v)), b),
      in: (c: string, vs: unknown[]) => ((rows = rows.filter((r) => vs.includes(r[c]))), b),
      not: (c: string, op: string, v: unknown) => ((rows = op === "is" && v === null ? rows.filter((r) => r[c] !== null && r[c] !== undefined) : rows), b),
      order: () => b,
      limit: (n: number) => ((rows = rows.slice(0, n)), b),
      range: (a: number, z: number) => ((rows = rows.slice(a, z + 1)), b),
      then: (ok: (v: unknown) => unknown, ko2?: (e: unknown) => unknown) => {
        appels.push(`${table}:${trace.join(",")}`);
        return Promise.resolve(panne ? { data: null, error: panne } : { data: rows, error: null }).then(ok, ko2);
      },
    };
    return b;
  };
  return { sb: { from } as unknown as SupabaseClient, appels };
}

const sc = (points: number, bonnes: number, tempsMs: number, repondues = bonnes): ScoreSalle => ({ points, bonnes, tempsMs, repondues });

console.log("# qui gagne une partie de Salle");
{
  check("plus de points : gagné, quel que soit le reste", issueSalle(sc(1800, 2, 9000), sc(1500, 3, 1000)) === "moi" && issueSalle(sc(1500, 3, 1000), sc(1800, 2, 9000)) === "lui");
  check("mêmes points : plus de bonnes réponses", issueSalle(sc(1000, 2, 9000), sc(1000, 1, 1000)) === "moi");
  check("mêmes points, mêmes bonnes : le temps le plus court", issueSalle(sc(600, 1, 9000), sc(600, 1, 5000)) === "lui" && issueSalle(sc(600, 1, 5000), sc(600, 1, 9000)) === "moi");
  check("tout pareil : nul", issueSalle(sc(700, 1, 3000), sc(700, 1, 3000)) === "nul" && issueSalle(sc(0, 0, 0, 1), sc(0, 0, 0, 3)) === "nul");
  const maintenant = Date.parse("2026-11-02T12:00:00Z");
  check(
    "une partie finie : close, ou heure de fin passée ; pas encore : en cours avant sa fin, sans heure de fin",
    partieFinie({ statut: "terminee", fin_at: "2026-11-03T00:00:00Z" }, maintenant) &&
      partieFinie({ statut: "en_cours", fin_at: "2026-11-02T11:59:00Z" }, maintenant) &&
      partieFinie({ statut: "attente", fin_at: "2026-11-02T12:00:00Z" }, maintenant) &&
      !partieFinie({ statut: "en_cours", fin_at: "2026-11-02T12:01:00Z" }, maintenant) &&
      !partieFinie({ statut: "en_cours", fin_at: null }, maintenant),
  );
  const s = scoresSalle([
    { session_id: "s", user_id: "me", points: 900, juste: true, delai_ms: 4000 },
    { session_id: "s", user_id: "me", points: 0, juste: false, delai_ms: 9000 },
    { session_id: "s", user_id: "me", points: null, juste: true, delai_ms: null },
  ]);
  check("le score : la somme des points, les bonnes, le temps des seules bonnes réponses, les réponses données", JSON.stringify(s.get("s|me")) === JSON.stringify({ points: 900, bonnes: 2, tempsMs: 4000, repondues: 3 }), JSON.stringify(s.get("s|me")));
}

// ——— la base : la salle X (« Les Requins »), une salle supprimée, une partie à venir ———
const futur = new Date(Date.now() + 3_600_000).toISOString();
const rep = (session_id: string, user_id: string, position: number, points: number, juste: boolean, delai_ms: number) => ({ session_id, user_id, position, points, juste, delai_ms });
const base: Record<string, Row[]> = {
  salles: [{ id: "salleX", nom: "Les Requins" }],
  salle_sessions: [
    { id: "s1", salle_id: "salleX", statut: "terminee", fin_at: "2026-10-20T10:00:00Z", nb: 3 },
    { id: "s2", salle_id: "salleX", statut: "en_cours", fin_at: "2026-10-21T10:00:00Z", nb: 2 },
    { id: "s3", salle_id: "salleX", statut: "en_cours", fin_at: futur, nb: 2 },
    { id: "s4", salle_id: null, statut: "terminee", fin_at: "2026-10-22T10:00:00Z", nb: 2 },
    { id: "s5", salle_id: "salleX", statut: "terminee", fin_at: "2026-10-23T10:00:00Z", nb: 2 },
  ],
  salle_reponses: [
    // s1 : 1 800 points contre 1 500 → gagné
    rep("s1", "me", 0, 900, true, 4000), rep("s1", "me", 1, 900, true, 4000), rep("s1", "me", 2, 0, false, 9000),
    rep("s1", "A", 0, 800, true, 6000), rep("s1", "A", 1, 700, true, 8000),
    // s2 (en cours, heure de fin passée) : mêmes points, mêmes bonnes, A plus rapide → perdu
    rep("s2", "me", 0, 600, true, 9000),
    rep("s2", "A", 0, 600, true, 5000),
    // s3 : à venir → jamais comptée
    rep("s3", "me", 0, 1000, true, 1000), rep("s3", "A", 0, 500, true, 9000),
    // s4 (salle supprimée depuis) : égalité parfaite → nul, sans lien
    rep("s4", "me", 0, 700, true, 3000), rep("s4", "A", 0, 700, true, 3000),
    // s5 : A n'a rien répondu ; C, si
    rep("s5", "me", 0, 1000, true, 1000), rep("s5", "C", 0, 500, true, 9000),
  ],
};

async function lectures() {
  console.log("# lirePartiesCommunes");
  {
    const f = faux(base);
    const avecA = await lirePartiesCommunes(f.sb, "me", { autre: "A", noms: true });
    check("avec A : trois parties finies (la partie à venir et celle où A n'a pas répondu ignorées), la plus récente d'abord", avecA?.map((p) => p.sessionId).join(",") === "s4,s2,s1", JSON.stringify(avecA?.map((p) => p.sessionId)));
    const [s4, s2, s1] = avecA ?? [];
    check("s1 : gagnée, 1 800 contre 1 500 points, 2 bonnes contre 2, 3 questions, le nom de la salle", s1?.issue === "moi" && s1.moi.points === 1800 && s1.lui.points === 1500 && s1.moi.bonnes === 2 && s1.nb === 3 && s1.nom === "Les Requins" && s1.salleId === "salleX" && s1.fin === "2026-10-20T10:00:00Z");
    check("s2 : en cours mais heure de fin passée, perdue au temps", s2?.issue === "lui");
    check("s4 : salle supprimée, nul, sans salle ni nom", s4?.issue === "nul" && s4.salleId === null && s4.nom === null);
    check("avec A : seules ses réponses sont lues (pas celles des autres joueurs)", f.appels.some((a) => a === "salle_reponses:eq(user_id,A)") && !f.appels.some((a) => a.includes("neq(user_id,me)")), JSON.stringify(f.appels));
    const tous = await lirePartiesCommunes(faux(base).sb, "me");
    check("avec tout le monde (le rival) : C aussi, dans s5", tous?.length === 4 && tous.some((p) => p.sessionId === "s5" && p.autre === "C" && p.issue === "moi"), JSON.stringify(tous?.map((p) => [p.sessionId, p.autre, p.issue])));
    check("sans les noms demandés : nom vide", (tous ?? []).every((p) => p.nom === null));
    check("contre soi-même : rien", (await lirePartiesCommunes(faux(base).sb, "me", { autre: "me" }))?.length === 0);
    check("rien joué en Salle : rien", (await lirePartiesCommunes(faux({ ...base, salle_reponses: [] }).sb, "me", { autre: "A" }))?.length === 0);
    const absente = await lirePartiesCommunes(faux({}, { salle_reponses: { code: "PGRST205", message: "Could not find the table 'public.salle_reponses' in the schema cache" } }).sb, "me");
    check("migration absente : rien, sans erreur", Array.isArray(absente) && absente.length === 0);
    check("une panne sur les parties : null", (await lirePartiesCommunes(faux(base, { salle_sessions: { code: "57014", message: "canceling statement due to statement timeout" } }).sb, "me")) === null);
    check("une lecture qui lève : null, jamais d'exception", (await lirePartiesCommunes(faux(base, { salle_reponses: "leve" }).sb, "me")) === null);
    const sansNoms = await lirePartiesCommunes(faux(base, { salles: { code: "42501", message: "permission denied" } }).sb, "me", { autre: "A", noms: true });
    check("les noms illisibles : les parties restent, sans nom", sansNoms?.length === 3 && sansNoms.every((p) => p.nom === null));
    // plus de 1000 réponses : la partie du bout de la deuxième page est trouvée
    const beaucoup = {
      ...base,
      salle_sessions: [...base.salle_sessions, { id: "sa", salle_id: "salleX", statut: "terminee", fin_at: "2026-10-10T10:00:00Z", nb: 50 }, { id: "sz", salle_id: "salleX", statut: "terminee", fin_at: "2026-10-30T10:00:00Z", nb: 1 }],
      salle_reponses: [...Array.from({ length: 1000 }, (_, i) => rep("sa", "me", i, 0, false, 1000)), rep("sz", "me", 0, 800, true, 2000), rep("sz", "A", 0, 900, true, 1000)],
    };
    const pages = await lirePartiesCommunes(faux(beaucoup).sb, "me", { autre: "A" });
    check("plus de 1000 réponses : lues par pages, la partie de la deuxième page comptée", pages?.length === 1 && pages[0].sessionId === "sz" && pages[0].issue === "lui", JSON.stringify(pages?.map((p) => p.sessionId)));
    // plafond de 30 pages atteint au milieu d'une partie (mock de 600 questions) : elle est écartée,
    // sans quoi « sc » serait perdue (0 point lu sur les 500 premières réponses, 5 000 en tout)
    const plafond = {
      ...base,
      salle_sessions: [
        { id: "sg", salle_id: "salleX", statut: "terminee", fin_at: "2026-10-10T10:00:00Z", nb: 600 },
        { id: "sc", salle_id: "salleX", statut: "terminee", fin_at: "2026-10-30T10:00:00Z", nb: 600 },
      ],
      salle_reponses: [
        ...Array.from({ length: 29_500 }, (_, i) => rep("sg", "me", i, 0, false, 1000)),
        rep("sg", "A", 0, 100, true, 1000),
        ...Array.from({ length: 1000 }, (_, i) => rep("sc", "me", i, i < 500 ? 0 : 10, true, 1000)),
        rep("sc", "A", 0, 1000, true, 1000),
      ],
    };
    const coupe = await lirePartiesCommunes(faux(plafond).sb, "me", { autre: "A" });
    check("plafond de pages atteint : la partie coupée est écartée, pas de score faux", coupe?.map((p) => `${p.sessionId}:${p.issue}`).join(",") === "sg:lui", JSON.stringify(coupe?.map((p) => [p.sessionId, p.issue, p.moi.points])));
  }

  console.log("# epreuvesCommunes (le Face-à-face)");
  const autres: Record<string, Row[]> = {
    daily_attempts: [
      { challenge_id: "c1", user_id: "me", day: "2026-10-19", score: 20, total: 30, finished_at: "2026-10-19T10:00:00Z", daily_challenges: { program: "cfa-l1" } },
      { challenge_id: "c1", user_id: "A", day: "2026-10-19", score: 18, total: 30, finished_at: "2026-10-19T11:00:00Z", daily_challenges: { program: "cfa-l1" } },
    ],
    mock_exam_results: [],
  };
  let d: Donnees | null = null;
  {
    d = await epreuvesCommunes(faux({ ...base, ...autres }).sb, "me", "A", null);
    const salles = d?.epreuves.filter((e) => e.type === "salle") ?? [];
    check("trois parties de Salle et un défi du jour, de la plus récente à la plus ancienne", d?.epreuves.map((e) => e.cle).join(",") === "s-s4,s-s2,s-s1,j-c1", JSON.stringify(d?.epreuves.map((e) => e.cle)));
    const s1 = salles.find((e) => e.cle === "s-s1");
    check("une partie : type « salle », ses points, ses bonnes réponses, la date de fin, le lien et le nom de la salle", s1?.monScore === 1800 && s1.sonScore === 1500 && s1.total === 3 && s1.bonnes?.moi === 2 && s1.bonnes.lui === 2 && s1.date === "2026-10-20T10:00:00Z" && !s1.jour && s1.href === "/salles/salleX" && s1.titre === "Les Requins" && s1.issue === "victoire");
    check("la salle supprimée : la partie compte, sans lien", salles.find((e) => e.cle === "s-s4")?.href === null && salles.find((e) => e.cle === "s-s4")?.issue === "nul");
    check("le bilan des Salles : 1 victoire, 1 défaite, 1 nul", JSON.stringify(d?.parType.salle) === JSON.stringify({ victoires: 1, defaites: 1, nuls: 1 }), JSON.stringify(d?.parType.salle));
    check("le bilan général compte les Salles : 4 épreuves, 2 victoires, 1 défaite, 1 nul", d?.general.total === 4 && d.general.victoires === 2 && d.general.defaites === 1 && d.general.nuls === 1, JSON.stringify(d?.general));
    check("la Salle est le cinquième type, en dernier", TYPES_EPREUVE.length === 5 && TYPES_EPREUVE[4] === "salle" && COMMUNES.type.salle === "Salle");
    const sansSalles = await epreuvesCommunes(faux(autres, { salle_reponses: { code: "42P01", message: 'relation "salle_reponses" does not exist' } }).sb, "me", "A", null);
    check("sans la migration des Salles : le défi reste, rien en Salle", sansSalles?.epreuves.length === 1 && sansSalles.general.total === 1 && sansSalles.parType.salle.victoires + sansSalles.parType.salle.defaites + sansSalles.parType.salle.nuls === 0);
    check("une panne sur les Salles : pas de bilan partiel (null)", (await epreuvesCommunes(faux({ ...base, ...autres }, { salle_sessions: { code: "57014", message: "timeout" } }).sb, "me", "A", null)) === null);
    check("sans clé admin : aucune lecture, rien en Salle", (await epreuvesCommunes(null, "me", "A", null))?.general.total === 0);
  }

  console.log("# le rendu de la carte");
  if (d) {
    const html = rendre(<EpreuvesCommunes donnees={d} nom="Léa" />);
    check("cinq tuiles de bilan, la dernière « Salle » à 1–1 avec 1 égalité", (html.match(/class="card-quiet /g) ?? []).length === 5 && /Salle<\/span><span[^>]*>1–1<\/span>/.test(html) && html.includes("1 égalité"), (html.match(/Salle<\/span>.{0,200}/) ?? [""])[0]);
    check("la grille tient les cinq tuiles sur une ligne dès la tablette", html.includes("sm:grid-cols-5"));
    check("une partie : « Salle » en lien vers la salle, son nom au survol", /<a(?=[^>]*href="\/salles\/salleX")(?=[^>]*title="Les Requins")[^>]*>Salle<\/a>/.test(html), (html.match(/<a[^>]*salleX[^>]*>/) ?? [""])[0]);
    check("ses points et ses bonnes réponses : « 1 800 pts · 2/3 » contre « 1 500 pts · 2/3 »", html.includes("1 800 pts · 2/3") && html.includes("1 500 pts · 2/3"));
    check("lue à voix haute : « Salle, 20 oct. : toi 1 800 pts · 2/3, Léa 1 500 pts · 2/3, gagné »", html.includes('aria-label="Salle, 20 oct. : toi 1 800 pts · 2/3, Léa 1 500 pts · 2/3, gagné"'));
    check("la salle supprimée : « Salle » sans lien", /<span class="font-semibold">Salle<\/span><span class="t-micro"> · 22 oct\.<\/span>/.test(html));
    check("le défi du jour garde sa copie : « 20/30 · 67 % »", html.includes("20/30 · 67 %"));
    check("l'aide dit que la Salle se gagne aux points", html.includes("Une partie de Salle se gagne aux points"));
    const vide = rendre(<EpreuvesCommunes donnees={{ epreuves: [], parType: d.parType, general: { victoires: 0, defaites: 0, nuls: 0, total: 0 } }} nom="Léa" />);
    check("rien en commun : le texte cite la partie de Salle", vide.includes("un duel ou une partie de Salle"));
  }
}

lectures().then(
  () => {
    console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
    process.exit(ko ? 1 : 0);
  },
  (e) => {
    console.log(e);
    process.exit(1);
  },
);
