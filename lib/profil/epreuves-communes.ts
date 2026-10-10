import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FaceAFace } from "@/lib/profil/face-a-face";

// Les épreuves communes de deux joueurs : ce qu'ils ont fait l'un et l'autre
// avec les mêmes questions (le défi du jour, les 5 du jour, un examen blanc
// classé, et leurs duels). Lu avec le client admin, côté serveur, et
// seulement les scores, déjà publics dans les classements du défi et des
// examens. Une copie du jour ne compte qu'une fois close des deux côtés
// (finished_at et score posés) : l'embargo d'une copie ouverte tient. Les
// duels viennent du bilan déjà lu (lib/profil/face-a-face.ts). Deux lectures
// en parallèle, sans boucle ; si l'une échoue, null (pas de bilan partiel). Module serveur ; l'onglet Face-à-face seulement.

export type TypeEpreuve = "defi" | "cinq" | "examen" | "duel";
export const TYPES_EPREUVE: TypeEpreuve[] = ["defi", "cinq", "examen", "duel"];

export type Issue = "victoire" | "defaite" | "nul";

export type EpreuveCommune = {
  cle: string;
  type: TypeEpreuve;
  /** jour (AAAA-MM-JJ) du défi, ou l'instant (ISO) d'un examen ou d'un duel */
  date: string;
  /** le jour seulement (clé AAAA-MM-JJ) : rendu par jourCourt */
  jour: boolean;
  titre: string | null;
  monScore: number;
  sonScore: number;
  total: number;
  issue: Issue;
  href: string | null;
};

export type Bilan = { victoires: number; defaites: number; nuls: number };

export type EpreuvesCommunes = {
  /** du plus récent au plus ancien */
  epreuves: EpreuveCommune[];
  parType: Record<TypeEpreuve, Bilan>;
  general: Bilan & { total: number };
};

const issueDe = (moi: number, lui: number): Issue => (moi > lui ? "victoire" : moi < lui ? "defaite" : "nul");

type CopieDuJour = { challenge_id: string; user_id: string; day: string; score: number | null; total: number | null; daily_challenges: { program: string } | { program: string }[] | null };
type CopieExamen = { exam_id: string; user_id: string; score: number; total: number; completed_at: string | null; mock_exams: { title: string } | { title: string }[] | null };

const un = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/** Regroupe par épreuve et ne garde que celles rendues par les deux. */
function paires<T>(lignes: T[], cle: (l: T) => string, joueur: (l: T) => string, moi: string, autre: string): [T, T][] {
  const parCle = new Map<string, { m?: T; a?: T }>();
  for (const l of lignes) {
    const k = cle(l);
    const p = parCle.get(k) ?? {};
    if (joueur(l) === moi) p.m = l;
    else if (joueur(l) === autre) p.a = l;
    parCle.set(k, p);
  }
  const out: [T, T][] = [];
  for (const p of parCle.values()) if (p.m && p.a) out.push([p.m, p.a]);
  return out;
}

export const epreuvesCommunes = cache(
  async (admin: SupabaseClient | null, moi: string, autre: string, duels: FaceAFace | null): Promise<EpreuvesCommunes | null> => {
    const epreuves: EpreuveCommune[] = [];
    if (admin && moi !== autre) {
      const [jours, examens] = await Promise.all([
        admin
          .from("daily_attempts")
          .select("challenge_id,user_id,day,score,total,daily_challenges(program)")
          .in("user_id", [moi, autre])
          .not("finished_at", "is", null)
          .not("score", "is", null)
          .order("day", { ascending: false })
          .limit(3000)
          .then(
            (r) => (r.error ? null : ((r.data ?? []) as unknown as CopieDuJour[])),
            () => null,
          ),
        admin
          .from("mock_exam_results")
          .select("exam_id,user_id,score,total,completed_at,mock_exams(title)")
          .in("user_id", [moi, autre])
          .limit(1000)
          .then(
            (r) => (r.error ? null : ((r.data ?? []) as unknown as CopieExamen[])),
            () => null,
          ),
      ]);
      // une lecture en échec : pas de bilan partiel présenté comme complet, la carte s'efface
      if (!jours || !examens) return null;
      for (const [m, a] of paires(jours, (l) => l.challenge_id, (l) => l.user_id, moi, autre)) {
        const programme = un(m.daily_challenges)?.program ?? "";
        const cinq = programme.endsWith("-cinq");
        epreuves.push({
          cle: `j-${m.challenge_id}`,
          type: cinq ? "cinq" : "defi",
          date: m.day,
          jour: true,
          titre: null,
          monScore: m.score ?? 0,
          sonScore: a.score ?? 0,
          total: m.total ?? a.total ?? 0,
          issue: issueDe(m.score ?? 0, a.score ?? 0),
          href: null,
        });
      }
      for (const [m, a] of paires(examens, (l) => l.exam_id, (l) => l.user_id, moi, autre)) {
        epreuves.push({
          cle: `e-${m.exam_id}`,
          type: "examen",
          date: [m.completed_at, a.completed_at].filter((x): x is string => !!x).sort().pop() ?? "",
          jour: false,
          titre: un(m.mock_exams)?.title ?? null,
          monScore: m.score,
          sonScore: a.score,
          total: m.total,
          issue: issueDe(m.score, a.score),
          href: `/mock-exams/${m.exam_id}`,
        });
      }
    }
    // les duels : la liste (50 au plus) du bilan, et son compte sur tous les duels
    for (const d of duels?.duels ?? []) {
      if (d.monScore === null || d.sonScore === null) continue;
      epreuves.push({
        cle: `d-${d.id}`,
        type: "duel",
        date: d.fin,
        jour: false,
        titre: null,
        monScore: d.monScore,
        sonScore: d.sonScore,
        total: d.total,
        issue: d.gagne === null ? "nul" : d.gagne ? "victoire" : "defaite",
        href: `/duel/${d.id}?revue=1`,
      });
    }
    // tri : le jour d'un défi vaut son midi, comparable aux instants
    const instant = (e: EpreuveCommune) => Date.parse(e.jour ? `${e.date}T12:00:00Z` : e.date) || 0;
    epreuves.sort((x, y) => instant(y) - instant(x));

    const vide = (): Bilan => ({ victoires: 0, defaites: 0, nuls: 0 });
    const parType: Record<TypeEpreuve, Bilan> = { defi: vide(), cinq: vide(), examen: vide(), duel: vide() };
    for (const e of epreuves) {
      if (e.type === "duel") continue;
      const b = parType[e.type];
      if (e.issue === "victoire") b.victoires++;
      else if (e.issue === "defaite") b.defaites++;
      else b.nuls++;
    }
    if (duels) parType.duel = { victoires: duels.victoires, defaites: duels.defaites, nuls: duels.nuls };
    const general = TYPES_EPREUVE.reduce(
      (s, t) => ({
        victoires: s.victoires + parType[t].victoires,
        defaites: s.defaites + parType[t].defaites,
        nuls: s.nuls + parType[t].nuls,
        total: s.total + parType[t].victoires + parType[t].defaites + parType[t].nuls,
      }),
      { victoires: 0, defaites: 0, nuls: 0, total: 0 },
    );
    return { epreuves, parType, general };
  },
);
