import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { jourParis } from "@/lib/objectif";
import { REVOIR, lireMesRevisions, tailleRevoir, type Revisions } from "@/lib/revisions";
import { EnTeteRevoir, RevoirRunner, type VueRevoir } from "@/components/revoir/RevoirRunner";
import type { MatiereDue } from "@/components/revoir/Pile";
import { ActionEncre, SousPage } from "@/components/ui/SousPage";
import { SUBJECTS } from "@/components/reviser/catalog";
import { placeSet } from "@/lib/answer-stats";
import { PILE, jourDe } from "@/lib/voice-revoir";

export const metadata = { title: "À revoir · Ranked Lobby" };

/** La reprise du carnet : là où « À revoir » renvoie tant que la section §3b n'est pas collée. */
const MISE_AU_PROPRE = "/moi?onglet=erreurs&reprise=1";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Après la séance, « C'est assez pour aujourd'hui » ramène au Codex si une
 * séance du jour y est lancée et pas finie (codex_seances, V3 §6.2), sinon à
 * l'accueil. Table absente ou illisible : l'accueil, sans bruit.
 */
async function destinationApres(supabase: Client, userId: string): Promise<string> {
  try {
    const { data, error } = await supabase.from("codex_seances").select("lancee_le,finie_le").eq("user_id", userId).eq("jour", jourParis(Date.now())).maybeSingle();
    if (!error && data?.lancee_le && !data.finie_le) return "/codex";
  } catch {
    // table pas encore collée : l'accueil
  }
  return "/dashboard";
}

type DossierLu = { name: string | null } | { name: string | null }[] | null;
type SetLu = { id?: string; title: string | null; library_folders: DossierLu };
type QuestionLue = { id: string; set_id: string; quiz_sets?: SetLu | SetLu[] | null };

const un = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? (x[0] ?? null) : (x ?? null));
const matiereDe = (setId: string, set: SetLu | null) =>
  set ? placeSet(setId, set.title, un(set.library_folders)?.name ?? null).subject : null;

/**
 * Les matières des questions dues aujourd'hui (la carte du dessus de la pile) : chaque question,
 * son set et le dossier du set (placeSet), en une lecture imbriquée (25 questions au plus ; jamais
 * correct_index) ; si l'imbrication est refusée, en deux lectures. Une question sans matière (un
 * mock complet, par exemple) n'est pas comptée ici : la carte la range dans « AUTRES ». Toute
 * erreur : pas de répartition, sans bruit.
 */
async function lireMatieres(supabase: Client, file: Revisions): Promise<MatiereDue[]> {
  const ids = [...new Set(file.items.map((x) => x.q))];
  if (ids.length === 0) return [];
  try {
    const parQuestion = new Map<string, string | null>();
    const imbrique = await supabase.from("quiz_questions").select("id,set_id,quiz_sets(title,library_folders(name))").in("id", ids);
    if (!imbrique.error && imbrique.data) {
      for (const q of imbrique.data as unknown as QuestionLue[]) parQuestion.set(String(q.id), matiereDe(String(q.set_id), un(q.quiz_sets)));
    } else {
      const { data: qs, error } = await supabase.from("quiz_questions").select("id,set_id").in("id", ids);
      if (error || !qs) return [];
      const setIds = [...new Set(qs.map((q) => String(q.set_id)))];
      const { data: sets, error: e2 } = await supabase.from("quiz_sets").select("id,title,library_folders(name)").in("id", setIds);
      if (e2 || !sets) return [];
      const setParId = new Map((sets as unknown as SetLu[]).map((s): [string, SetLu] => [String(s.id), s]));
      for (const q of qs) parQuestion.set(String(q.id), matiereDe(String(q.set_id), setParId.get(String(q.set_id)) ?? null));
    }
    const comptes = new Map<string, number>();
    for (const it of file.items) {
      const code = SUBJECTS.find((x) => x.key === parQuestion.get(it.q))?.code;
      if (code) comptes.set(code, (comptes.get(code) ?? 0) + 1);
    }
    const ordre = (code: string) => SUBJECTS.findIndex((x) => x.code === code);
    return [...comptes].map(([code, n]) => ({ code, n })).sort((a, b) => b.n - a.n || ordre(a.code) - ordre(b.code));
  } catch {
    return [];
  }
}

/**
 * La part juste des séances « À revoir » rendues ces 30 derniers jours (eclair_series, genre
 * 'revoir'), du joueur seulement : filtrée par user_id (index eclair_series_user_finished), sans
 * compter sur la seule RLS.
 */
async function lireRetenues(supabase: Client, userId: string): Promise<VueRevoir["retenues"]> {
  try {
    const depuis = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from("eclair_series")
      .select("score,total")
      .eq("user_id", userId)
      .eq("genre", "revoir")
      .not("finished_at", "is", null)
      .gte("finished_at", depuis);
    if (error || !data) return null;
    let justes = 0;
    let total = 0;
    for (const r of data as { score: number | null; total: number | null }[]) {
      justes += Math.max(0, Number(r.score) || 0);
      total += Math.max(0, Number(r.total) || 0);
    }
    return total > 0 ? { justes, total } : null;
  } catch {
    return null;
  }
}

// « À revoir » (V3 §5.2), rangée sous Réviser : la file des révisions du jour,
// en une séance de 15 questions (?n=10..25), sur le moteur des séries éclair
// (migration_v3_profil.sql §3b : mes_revisions_dues, revoir_lancer,
// revoir_repondre). La page lit la file, puis la répartition par matière des
// questions dues, la part juste des séances rendues, aujourd'hui et demain (Paris) ;
// l'écran de départ (la pile), la séance et le bilan sont posés par
// RevoirRunner. Tant que la section n'est pas collée : « bientôt », et le lien
// vers « Mettre au propre ».
export default async function RevoirPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login");

  const sp = (await searchParams) ?? {};
  const taille = tailleRevoir(sp.n);
  const [file, destination, retenues] = await Promise.all([lireMesRevisions(supabase), destinationApres(supabase, user.id), lireRetenues(supabase, user.id)]);

  if (file.complet) {
    const aujourdhui = jourParis(Date.now());
    const vue: VueRevoir = {
      matieres: await lireMatieres(supabase, file),
      retenues,
      jours: [jourDe(aujourdhui, 0), jourDe(aujourdhui, 1)],
    };
    return <RevoirRunner taille={taille} file={file} destination={destination} vue={vue} />;
  }

  return (
    <SousPage entete={<EnTeteRevoir ligne={PILE.soon} />}>
      <div className="grid justify-items-center gap-4">
        <ActionEncre href={MISE_AU_PROPRE}>{REVOIR.miseAuPropre}</ActionEncre>
      </div>
    </SousPage>
  );
}
