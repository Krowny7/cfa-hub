// Test de « Ton plus grand rival » et « Les maîtres de chaque matière » (page
// S'affronter), sans base, réseau ni navigateur :
//   npx tsx --tsconfig tsconfig.json scripts/classement/test-rival-maitres.tsx
// Les calculs purs (choisirRival, cumulDe, sommetsDe, avecPlaces) puis le rendu
// (react-dom/server) des deux cartes et de leur place dans la page.
import "../codex/sans-css";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ClassementView } from "@/components/classement/ClassementView";
import { CarteMaitres } from "@/components/classement/CarteMaitres";
import { CarteRival } from "@/components/classement/CarteRival";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cumulDe, sommetsDe, avecPlaces, lireMaitres, oublierLesLectures, type Cumul } from "@/components/classement/maitres";
import { choisirRival, lireRival, type Rencontre } from "@/components/classement/rival";
import type { BoardRow, ClassementData, MaitreMatiere, RivalData } from "@/components/classement/types";
import { STYLE_DEFAUT } from "@/lib/profil/catalogue";
import { MATIERES_COURTES, SEUIL_MAITRE } from "@/lib/voice-classement";
import { TOPICS } from "@/lib/practiceTopics";

(globalThis as { React?: typeof React }).React = React;

let ko = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log((cond ? "ok   " : "KO   ") + label + (extra ? "  " + extra : ""));
  if (!cond) ko++;
};
const routeur = { back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
const rendre = (el: React.ReactElement): string => {
  try {
    return renderToStaticMarkup(<AppRouterContext.Provider value={routeur}>{el}</AppRouterContext.Provider>).replace(/&#x27;/g, "'").replace(/[  ]/g, " ");
  } catch (e) {
    console.log(e);
    return "";
  }
};
const compte = (html: string, re: RegExp) => (html.match(re) ?? []).length;

// ——— le rival : qui, et le bilan ———
console.log("# choisirRival");
{
  const r = (epreuve: Rencontre["epreuve"], autre: string, issue: Rencontre["issue"], quand: string): Rencontre => ({ epreuve, autre, issue, quand });
  const rencontres: Rencontre[] = [
    r("duel", "A", "moi", "2026-10-01T10:00:00Z"),
    r("duel", "A", "moi", "2026-10-02T10:00:00Z"),
    r("duel", "A", "lui", "2026-10-03T10:00:00Z"),
    r("trente", "A", "nul", "2026-10-04T10:00:00Z"),
    r("trente", "A", "moi", "2026-10-05T10:00:00Z"),
    r("cinq", "B", "lui", "2026-10-06T10:00:00Z"),
    r("cinq", "B", "lui", "2026-10-07T10:00:00Z"),
    r("examen", "B", "moi", "2026-10-08T10:00:00Z"),
    r("trente", "B", "moi", "2026-10-09T10:00:00Z"),
    r("trente", "B", "nul", "2026-10-10T10:00:00Z"),
    r("duel", "C", "moi", "2026-10-11T10:00:00Z"),
  ];
  const b = choisirRival(rencontres);
  check("B (5 rencontres) devant A (5) : à égalité, la plus récente", b?.autre === "B" && b.rencontres === 5, JSON.stringify(b && { autre: b.autre, n: b.rencontres }));
  check("bilan de B : 2 pour moi, 2 pour lui, 1 nul", b?.moi === 2 && b?.lui === 2 && b?.nuls === 1);
  check("le détail suit l'ordre fixe duels, 30, 5, examens, sans épreuve vide", b?.epreuves.map((e) => e.epreuve).join(",") === "trente,cinq,examen", b?.epreuves.map((e) => e.epreuve).join(","));
  check("le détail de B : 30 du jour 1–0 et 1 nul, 5 du jour 0–2, examen 1–0", JSON.stringify(b?.epreuves.map((e) => [e.moi, e.lui, e.nuls])) === JSON.stringify([[1, 0, 1], [0, 2, 0], [1, 0, 0]]), JSON.stringify(b?.epreuves.map((e) => [e.moi, e.lui, e.nuls])));
  check("la dernière rencontre", b?.derniere === "2026-10-10T10:00:00Z");
  const sans = choisirRival(rencontres.filter((x) => x.autre !== "B"));
  check("sans B : A (5 rencontres : 3 pour moi, 1 pour lui, 1 nul)", sans?.autre === "A" && sans.moi === 3 && sans.lui === 1 && sans.nuls === 1);
  check("A devant C (plus de rencontres), même sans être le plus récent", sans?.autre === "A" && sans.rencontres === 5);
  check("aucune rencontre : null", choisirRival([]) === null);
  const egal = choisirRival([r("duel", "Z", "moi", "2026-10-01T00:00:00Z"), r("duel", "Y", "moi", "2026-10-01T00:00:00Z")]);
  check("égalité parfaite : l'identifiant le plus petit (ordre stable)", egal?.autre === "Y");
}

// ——— les maîtres ———
console.log("# cumulDe, sommetsDe");
{
  const lignes = [
    { user_id: "me", topics: ["ethics"], score: 27, total: 40 },
    { user_id: "me", topics: ["ethics", "quant"], score: 20, total: 20 },
    { user_id: "me", topics: ["quant"], score: 3, total: 3 },
    { user_id: "me", topics: ["economics"], score: 9, total: 12 },
    { user_id: "me", topics: ["fsa"], score: 44, total: 50 },
    { user_id: "me", topics: ["equity"], score: 44, total: 50 },
    { user_id: "h1", topics: ["ethics"], score: 92, total: 100 },
    { user_id: "h2", topics: ["ethics"], score: 26, total: 30 },
    { user_id: "n1", topics: ["ethics"], score: 5, total: 5 },
    { user_id: "x", topics: ["fsa"], score: 53, total: 60 },
    { user_id: "y", topics: ["equity"], score: 44, total: 50 },
    { user_id: "z", topics: ["alternatives"], score: 19, total: 19 },
  ];
  const cumul: Cumul = cumulDe(lignes);
  check("une séance à plusieurs matières ne compte pas (Ethics = 40 réponses, pas 60)", cumul.get("me")?.get("ethics")?.total === 40);
  check("(la séance Ethics + Quant est ignorée : Quant = 3 réponses seulement)", cumul.get("me")?.get("quant")?.total === 3);
  const s = sommetsDe(cumul, "me");
  const de = (cle: string) => s.find((x) => x.cle === cle);
  check("10 sommets, un par matière, dans l'ordre du programme", s.length === 10 && s.map((x) => x.cle).join(",") === TOPICS.map((t) => t.key).join(","));
  const eth = de("ethics");
  check("Ethics : le maître est h1 (92 %), le 5 sur 5 de n1 ne compte pas (sous le seuil)", eth?.maitreId === "h1" && eth.maitrePct === 92 && !eth.cestToi);
  check("Ethics : ta place est 3e (68 %, derrière h1 et h2), ton % est 68", eth?.moiPlace === 3 && eth.moiPct === 68 && eth.moiReponses === 40);
  const fsa = de("fsa");
  check("FSA : 88 % partout, x a plus de réponses : il est devant toi (place 2)", fsa?.maitreId === "x" && fsa.moiPlace === 2 && !fsa.cestToi);
  const eq = de("equity");
  check("Equity : égalité parfaite avec y, c'est toi qui passes devant", eq?.cestToi === true && eq.moiPlace === 1 && eq.maitreId === "me");
  const quant = de("quant");
  check("Quant : 3 réponses, pas mesuré (moiPct null), pas classé, pas de maître", quant?.moiPct === null && quant.moiPlace === null && quant.maitreId === null);
  const eco = de("economics");
  check("Economics : 12 réponses, tu es mesuré (75 %) mais pas classé (sous " + SEUIL_MAITRE + ")", eco?.moiPct === 75 && eco.moiPlace === null && eco.maitreId === null);
  const alt = de("alternatives");
  check("Alternatives : z a 19 réponses (sous le seuil) : pas de maître", alt?.maitreId === null);
  check("sans aucune donnée : aucun maître nulle part", sommetsDe(new Map(), "me").every((x) => x.maitreId === null && x.moiPlace === null));
  const mat = (cle: string, id: string | null): MaitreMatiere => ({ cle, court: cle, maitre: id ? { userId: id, name: id, avatarUrl: null, pct: 90, elo: 1500, gamesPlayed: 20, mastery: 60, rank: null } : null, cestToi: false, moiPct: null, moiPlace: null, moiReponses: 0 });
  const places = avecPlaces([mat("a", "h1"), mat("b", null), mat("c", "q")], new Map([["h1", 4]]));
  check("avecPlaces : la place des maîtres connus, rien pour les autres", places?.[0].maitre?.rank === 4 && places?.[1].maitre === null && places?.[2].maitre?.rank === null);
  check("avecPlaces(null) reste null", avecPlaces(null, new Map()) === null);
}

// ——— le rendu ———
const style = { banner: STYLE_DEFAUT.banner, bannerUrl: null, bannerPos: 50, accent: STYLE_DEFAUT.accent, frame: STYLE_DEFAUT.frame };
const bilan = (epreuve: RivalData["epreuves"][number]["epreuve"], moi: number, lui: number, nuls = 0) => ({ epreuve, rencontres: moi + lui + nuls, moi, lui, nuls });
const rival: RivalData = {
  userId: "u2",
  name: "Léa",
  avatarUrl: null,
  elo: 1524,
  gamesPlayed: 31,
  rank: 3,
  mastery: 66,
  niveau: 14,
  style,
  rencontres: 23,
  moi: 14,
  lui: 9,
  epreuves: [bilan("duel", 4, 2), bilan("trente", 7, 4), bilan("cinq", 2, 2), bilan("examen", 1, 0, 1)],
};

console.log("# la carte « Ton plus grand rival »");
{
  const html = rendre(<CarteRival rival={rival} />);
  check("le titre et la phrase d'accroche", html.includes("Ton plus grand rival") && html.includes("toutes épreuves confondues"));
  check("sa carte joueur : nom, rang (Platine), ELO, place, niveau", html.includes(">Léa<") && html.includes("Platine") && html.includes("1 524 ELO · 3e · Niveau 14"));
  check("« Croisé 23 fois » avec le nombre surligné", /Croisé <span class="surligne">23<\/span> fois/.test(html));
  check("le verdict : « Tu mènes 14–9 »", html.includes("Tu mènes 14–9"));
  check("quatre lignes d'épreuve, dans l'ordre", ["Duels", "Défi du jour (les 30)", "Les 5 du jour", "Examens blancs"].every((x) => html.includes(`<b>${x}</b>`)) && compte(html, /class="epreuve"/g) === 4);
  check("le détail : 4–2 pour toi, égalité, un nul", html.includes("4–2 pour toi") && html.includes("2–2, égalité") && html.includes("1–0 pour toi · 1 nul"));
  check("compacte : la carte joueur sans bannière, les épreuves sans piste", !html.includes("width:67%") && !html.includes("pisteFine"));
  check("« Défier Léa » vers /duel?adversaire=u2 et « Voir son profil » vers /people/u2", html.includes('href="/duel?adversaire=u2"') && html.includes("Défier Léa") && html.includes('href="/people/u2"') && html.includes("Voir son profil"));
  const lui = rendre(<CarteRival rival={{ ...rival, moi: 9, lui: 14 }} />);
  check("il mène : « Léa mène 14–9 »", lui.includes("Léa mène 14–9"));
  const egal = rendre(<CarteRival rival={{ ...rival, moi: 9, lui: 9 }} />);
  check("à égalité : « À égalité 9–9 »", egal.includes("À égalité 9–9"));
  const placement = rendre(<CarteRival rival={{ ...rival, gamesPlayed: 2 }} />);
  check("en placement : « Placement »", placement.includes(">Placement<"));
  const seul = rendre(<CarteRival rival={{ ...rival, epreuves: [bilan("duel", 1, 0)], rencontres: 1, moi: 1, lui: 0 }} seul />);
  check("une seule rencontre : une ligne, « Croisé 1 fois », et la carte seule prend la largeur", compte(seul, /class="epreuve"/g) === 1 && seul.includes("Croisé") && seul.includes(">1<") && seul.includes("seule"));
}

const maitres: MaitreMatiere[] = TOPICS.map((t, i) => {
  const base = { cle: t.key, court: MATIERES_COURTES[t.key], moiReponses: 40 };
  if (t.key === "fsa") return { ...base, maitre: { userId: "me", name: "Théo", avatarUrl: null, pct: 88, elo: 1512, gamesPlayed: 23, mastery: 64, rank: 4 }, cestToi: true, moiPct: 88, moiPlace: 1 };
  if (t.key === "derivatives") return { ...base, maitre: null, cestToi: false, moiPct: null, moiPlace: null, moiReponses: 0 };
  if (t.key === "alternatives") return { ...base, maitre: { userId: "u5", name: "Inès", avatarUrl: null, pct: 83, elo: 1400, gamesPlayed: 3, mastery: 50, rank: null }, cestToi: false, moiPct: 55, moiPlace: null, moiReponses: 12 };
  return { ...base, maitre: { userId: "u" + i, name: "Maître" + i, avatarUrl: null, pct: 90 - i, elo: 1500 + i * 20, gamesPlayed: 20, mastery: 60, rank: i + 1 }, cestToi: false, moiPct: 60, moiPlace: 3 };
});

console.log("# la carte « Les maîtres de chaque matière »");
{
  const html = rendre(<CarteMaitres maitres={maitres} />);
  check("le titre et la règle (classé dès 20 réponses)", html.includes("Les maîtres de chaque matière") && html.includes("classé dès 20 réponses"));
  check("dix matières, une ligne chacune, en libellés courts de la maquette", compte(html, /class="maitre( cestToi)?"/g) === 10 && ["Ethics", "Quant", "FSA", "Corporate Issuers", "Fixed Income", "Portfolio Management"].every((x) => html.includes(`>${x}</b>`)));
  check("« C'est toi » sur FSA seulement, et la ligne est mise en valeur", compte(html, />C'est toi</g) === 1 && compte(html, /class="maitre cestToi"/g) === 1);
  check("ta place et ton %, ailleurs : « toi 3e · 60 % »", html.includes("toi 3e · 60 %"));
  check("pas classé : « toi · non classé », avec l'infobulle des 20 réponses", html.includes("toi · non classé") && html.includes("Il faut 20 réponses dans la matière pour être classé (tu en as 12)."));
  check("sans maître : « Pas encore de maître »", html.includes("Pas encore de maître"));
  check("compacte : plus de piste ni de repère", !html.includes('class="repere"') && !html.includes("pisteMaitre"));
  check("le % du maître avec espace insécable", html.includes("88 %") || html.includes("88 %"));
  check("les noms des maîtres s'affichent", html.includes("Maître0") && html.includes("Inès"));
}

console.log("# dans la page");
{
  const board: BoardRow[] = [
    { userId: "u1", name: "Hugo", avatarUrl: null, elo: 1618, gamesPlayed: 30, rank: 1, mastery: 60, lastDelta: 5, isMe: false },
    { userId: "me", name: "Théo", avatarUrl: null, elo: 1512, gamesPlayed: 23, rank: 2, mastery: 61, lastDelta: 8, isMe: true },
  ];
  const data: ClassementData = {
    me: { elo: 1512, gamesPlayed: 23, mastery: 61, leaderboardRank: 2, totalPlayers: 2 },
    history: [],
    board,
    meRow: null,
    exam: null,
    pastExams: [],
    openDuels: [],
    recentDuels: [],
    amis: [],
  };
  const sans = rendre(<ClassementView data={data} />);
  check("sans rival ni maîtres : aucune des deux cartes (ni rangée vide)", !sans.includes("Ton plus grand rival") && !sans.includes("Les maîtres de chaque matière"));
  const html = rendre(<ClassementView data={{ ...data, rival, maitres }} />);
  const ordre = ['id="cl-trouver"', 'id="cl-duels"', 'id="cl-rival"', 'id="cl-maitres"', 'id="cl-tableau"'].map((x) => html.indexOf(x));
  check("l'ordre : Trouver, Duels, rival, maîtres (téléphone : rival puis maîtres), Classement général", ordre.every((x) => x > 0) && ordre.every((x, i) => i === 0 || x > ordre[i - 1]), ordre.join(" < "));
  check("deux cartes dans la rangée : aucune ne prend toute la largeur", !/class="[^"]*\bseule\b/.test(html));
  const rienQueLeRival = rendre(<ClassementView data={{ ...data, rival }} />);
  check("le rival seul : sa carte, pas celle des maîtres, et elle prend toute la largeur", rienQueLeRival.includes("Ton plus grand rival") && !rienQueLeRival.includes("Les maîtres de chaque matière") && /id="cl-rival"/.test(rienQueLeRival) && /class="[^"]*\bseule\b[^"]*"[^>]*aria-labelledby="cl-rival"|aria-labelledby="cl-rival"/.test(rienQueLeRival) && rienQueLeRival.includes("seule"));
  const rienQueLesMaitres = rendre(<ClassementView data={{ ...data, maitres }} />);
  check("les maîtres seuls : leur carte, pas celle du rival, pleine largeur", rienQueLesMaitres.includes("Les maîtres de chaque matière") && !rienQueLesMaitres.includes("Ton plus grand rival") && rienQueLesMaitres.includes("seule"));
  check("null explicite : aucune des deux cartes", !rendre(<ClassementView data={{ ...data, rival: null, maitres: null }} />).includes("Ton plus grand rival"));
  check("les repères de Léonard sont intacts (rang, joueurs)", html.includes('data-leonard="rang"') && html.includes('data-leonard="joueurs"'));
}

// ——— les lectures, sur une base en mémoire ———
type Row = Record<string, unknown>;
/** Un client Supabase minimal en mémoire : select/eq/neq/in/gt/not/or/order/range/limit/maybeSingle, et le comptage (head). */
function faux(tables: Record<string, Row[]>, panne = false): SupabaseClient {
  const from = (table: string) => {
    if (panne) throw new Error("base en panne");
    let rows = [...(tables[table] ?? [])];
    let un = false;
    let tete = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = {
      select: (_c?: string, o?: { head?: boolean }) => {
        if (o?.head) tete = true;
        return b;
      },
      eq: (c: string, v: unknown) => ((rows = rows.filter((r) => r[c] === v)), b),
      neq: (c: string, v: unknown) => ((rows = rows.filter((r) => r[c] !== v)), b),
      in: (c: string, vs: unknown[]) => ((rows = rows.filter((r) => vs.includes(r[c]))), b),
      gt: (c: string, v: number) => ((rows = rows.filter((r) => (r[c] as number) > v)), b),
      not: (c: string, op: string, v: unknown) => ((rows = op === "is" && v === null ? rows.filter((r) => r[c] !== null && r[c] !== undefined) : rows), b),
      or: (expr: string) => {
        const conds = expr.split(",").map((x) => x.split("."));
        rows = rows.filter((r) => conds.some(([c, op, v]) => op === "eq" && r[c] === v));
        return b;
      },
      order: () => b,
      limit: () => b,
      range: (a: number, z: number) => ((rows = rows.slice(a, z + 1)), b),
      maybeSingle: () => ((un = true), b),
      then: (ok: (v: unknown) => unknown, ko2?: (e: unknown) => unknown) =>
        Promise.resolve(tete ? { data: null, count: rows.length, error: null } : un ? { data: rows[0] ?? null, error: null } : { data: rows, error: null }).then(ok, ko2),
    };
    return b;
  };
  return { from } as unknown as SupabaseClient;
}

async function lectures() {
  console.log("# lireRival, sur une base en mémoire");
  {
    const base = {
      duels: [
        { id: "d1", status: "finished", challenger_id: "me", opponent_id: "A", winner_id: "me", finished_at: "2026-10-01T10:00:00Z", created_at: "2026-09-30T10:00:00Z" },
        { id: "d2", status: "finished", challenger_id: "A", opponent_id: "me", winner_id: "A", finished_at: "2026-10-02T10:00:00Z", created_at: "2026-10-01T10:00:00Z" },
        { id: "d3", status: "pending", challenger_id: "me", opponent_id: "A", winner_id: null, finished_at: null, created_at: "2026-10-03T10:00:00Z" },
        { id: "d4", status: "finished", challenger_id: "B", opponent_id: "C", winner_id: "B", finished_at: "2026-10-04T10:00:00Z", created_at: "2026-10-04T10:00:00Z" },
      ],
      daily_challenges: [
        { id: "c1", program: "cfa-l1" },
        { id: "c2", program: "cfa-l1-cinq" },
        { id: "c3", program: "cfa-l1" },
        { id: "c9", program: "autre" },
      ],
      daily_attempts: [
        { challenge_id: "c1", user_id: "me", score: 20, seconds: 600, finished_at: "2026-10-05T10:00:00Z" },
        { challenge_id: "c2", user_id: "me", score: 4, seconds: 100, finished_at: "2026-10-05T11:00:00Z" },
        { challenge_id: "c3", user_id: "me", score: null, seconds: null, finished_at: null },
        { challenge_id: "c9", user_id: "me", score: 3, seconds: 90, finished_at: "2026-10-05T12:00:00Z" },
        { challenge_id: "c1", user_id: "A", score: 18, seconds: 500, finished_at: "2026-10-05T10:30:00Z" },
        { challenge_id: "c2", user_id: "A", score: 4, seconds: 120, finished_at: "2026-10-05T11:30:00Z" },
        { challenge_id: "c3", user_id: "A", score: 25, seconds: 700, finished_at: "2026-10-06T10:30:00Z" },
        { challenge_id: "c9", user_id: "A", score: 3, seconds: 80, finished_at: "2026-10-05T12:30:00Z" },
        { challenge_id: "c1", user_id: "B", score: 25, seconds: 900, finished_at: "2026-10-05T10:45:00Z" },
        { challenge_id: "c1", user_id: "C", score: 20, seconds: 600, finished_at: null },
      ],
      mock_exams: [
        { id: "e1", status: "closed", scheduled_at: "2026-09-01T08:00:00Z", window_days: 3 },
        { id: "e2", status: "open", scheduled_at: new Date(Date.now() + 30 * 86_400_000).toISOString(), window_days: 3 },
      ],
      mock_exam_results: [
        { exam_id: "e1", user_id: "me", score: 60, total: 90, completed_at: "2026-09-01T10:00:00Z" },
        { exam_id: "e1", user_id: "A", score: 50, total: 90, completed_at: "2026-09-01T10:30:00Z" },
        { exam_id: "e2", user_id: "me", score: 10, total: 90, completed_at: "2026-10-01T10:00:00Z" },
        { exam_id: "e2", user_id: "A", score: 80, total: 90, completed_at: "2026-10-01T10:30:00Z" },
      ],
      profiles: [{ id: "A", username: "Léa", avatar_url: null, xp_total: 1500 }],
      ratings: [
        { user_id: "A", elo: 1524, games_played: 31 },
        { user_id: "me", elo: 1400, games_played: 20 },
      ],
      practice_session_results: [{ user_id: "A", topics: ["ethics"], score: 18, total: 20 }],
    };
    const r = await lireRival(faux(base), faux(base), "me");
    check("le rival est A (Léa), 5 rencontres", r?.userId === "A" && r.name === "Léa" && r.rencontres === 5, JSON.stringify(r && { id: r.userId, n: r.rencontres }));
    const detail = JSON.stringify(r?.epreuves.map((e) => [e.epreuve, e.moi, e.lui, e.nuls]));
    check("duels 1–1, les 30 du jour 1–0 (20 contre 18), les 5 du jour 1–0 (même score, plus rapide), examen 1–0", detail === JSON.stringify([["duel", 1, 1, 0], ["trente", 1, 0, 0], ["cinq", 1, 0, 0], ["examen", 1, 0, 0]]), detail);
    check("bilan cumulé 4–1", r?.moi === 4 && r.lui === 1);
    check("son ELO, ses parties, son niveau (1 500 XP), sa maîtrise du programme", r?.elo === 1524 && r.gamesPlayed === 31 && (r.niveau ?? 0) >= 1 && r.mastery === 9, JSON.stringify(r && { niveau: r.niveau, mastery: r.mastery }));
    check("un programme inconnu, une copie ouverte, un examen non terminé, un duel en attente : jamais comptés", r?.rencontres === 5);
    check("sans clé admin : null", (await lireRival(faux(base), null, "me")) === null);
    check("rien joué ensemble : null", (await lireRival(faux(base), faux({ ...base, duels: [], daily_attempts: [], mock_exam_results: [] }), "me")) === null);
    check("une base en panne : null, jamais d'exception", (await lireRival(faux(base), faux(base, true), "me")) === null);
    const sansLeProfil = await lireRival(faux({ ...base, profiles: [], ratings: [] }), faux(base), "me");
    check("profil et ELO illisibles : la carte tient (nom « Joueur… », 1200 d'ELO)", !!sansLeProfil && sansLeProfil.name.startsWith("Joueur") && sansLeProfil.elo === 1200);
  }

  console.log("# lireMaitres, sur une base en mémoire");
  {
    const lots = (id: string, matiere: string, bonnes: number, total: number, n = 1) => Array.from({ length: n }, () => ({ user_id: id, topics: [matiere], score: bonnes / n, total: total / n }));
    const base = {
      practice_session_results: [...lots("me", "ethics", 27, 40, 2), ...lots("A", "ethics", 92, 100, 4), ...lots("A", "fsa", 53, 60), ...lots("me", "fsa", 44, 50)],
      profiles: [
        { id: "A", username: "Léa", avatar_url: null },
        { id: "me", username: "Théo", avatar_url: null },
      ],
      ratings: [
        { user_id: "A", elo: 1524, games_played: 31 },
        { user_id: "me", elo: 1400, games_played: 20 },
      ],
    };
    const m = await lireMaitres(faux(base), faux(base), "me");
    const eth = m?.find((x) => x.cle === "ethics");
    check("dix matières, Ethics : Léa à 92 %, toi 2e à 68 %", m?.length === 10 && eth?.maitre?.name === "Léa" && eth.maitre.pct === 92 && eth.moiPlace === 2 && eth.moiPct === 68, JSON.stringify(eth && { m: eth.maitre?.name, pct: eth.maitre?.pct, place: eth.moiPlace, moi: eth.moiPct }));
    const fsa = m?.find((x) => x.cle === "fsa");
    check("FSA : Léa (88 % sur 60) devant toi (88 % sur 50) : seconde place", fsa?.maitre?.name === "Léa" && fsa.moiPlace === 2 && !fsa.cestToi);
    check("une matière que personne n'a assez travaillée : pas de maître", m?.find((x) => x.cle === "equity")?.maitre === null);
    check("son insigne : ELO, parties et maîtrise du programme", eth?.maitre?.elo === 1524 && eth.maitre.gamesPlayed === 31 && eth.maitre.mastery !== null);
    oublierLesLectures();
    check("sans clé admin : null", (await lireMaitres(faux(base), null, "me")) === null);
    oublierLesLectures();
    check("personne de classé : null (la carte ne s'affiche pas)", (await lireMaitres(faux(base), faux({ ...base, practice_session_results: [] }), "me")) === null);
    oublierLesLectures();
    check("une base en panne : null, jamais d'exception", (await lireMaitres(faux(base), faux(base, true), "me")) === null);
  }
}

lectures().then(() => {
  console.log(ko ? `\n${ko} échec(s)` : "\ntout est bon");
  process.exit(ko ? 1 : 0);
});
