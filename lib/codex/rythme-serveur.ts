// Le rythme long du Codex côté serveur (V3 §10.3, §10.5) : lire le choix de
// la semaine et le verdict (codex_semaine, codex_resultat ; sans la §8 de
// migration_codex_v3.sql, le compte) et les écrire. Ce que /codex en montre
// est bâti par lib/codex/rythme.ts. Les clients Supabase sont passés en argument.
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { baseAbsente } from "@/lib/profil/sceaux-base";
import { COMMANDES, CIBLES_SEMAINE, type Commande, type Semaine } from "@/lib/codex/catalogue";
import { lundiDe, maitriseDe, semaineEntamee, type Entree } from "@/lib/codex/moteur";
import { programmeActif } from "@/lib/codex/programmes";
import { lireSemaine, lireVerdict, matiereBanquier, type Bande, type StatutVerdict, type Verdict } from "@/lib/codex/plan";
import type { RythmeLu } from "@/lib/codex/rythme";

type Joueur = Pick<User, "id" | "user_metadata">;

// ── Lire ───────────────────────────────────────────────────────────────

/** Le verdict gardé dans le compte (user_metadata.rl_verdict) quand codex_resultat n'est pas collée. */
const verdictDuCompte = (meta: unknown): Verdict | null => lireVerdict((meta as { rl_verdict?: unknown } | null)?.rl_verdict);

/**
 * Le choix de la semaine en cours et les verdicts du joueur. Table absente :
 * pas de choix possible (semaineDispo faux) ; verdict lu dans le compte. Une
 * autre erreur : rien de lu, sans basculer sur le compte.
 */
export async function lireRythme(a: SupabaseClient, user: Joueur, jour: string): Promise<RythmeLu> {
  const lundi = lundiDe(jour);
  const [s, v] = await Promise.all([
    a.from("codex_semaine").select("lundi,cible,commande,params").eq("user_id", user.id).eq("lundi", lundi).maybeSingle().then((x) => x, () => null),
    a.from("codex_resultat").select("programme,session,statut,bandes,saisi_le").eq("user_id", user.id).order("saisi_le", { ascending: false }).limit(10).then((x) => x, () => null),
  ]);
  const semaineDispo = !!s && !(s.error && baseAbsente(s.error));
  const semaine = s && !s.error ? lireSemaine(s.data, lundi) : null;
  let verdicts: Verdict[] = [];
  if (v && !v.error && Array.isArray(v.data)) verdicts = v.data.map(lireVerdict).filter((x): x is Verdict => !!x);
  else if (!v || (v.error && baseAbsente(v.error))) {
    const c = verdictDuCompte(user.user_metadata);
    verdicts = c ? [c] : [];
  }
  return { semaine, semaineDispo, verdicts };
}

// ── Écrire ─────────────────────────────────────────────────────────────

/**
 * Le choix du lundi (codex_semaine_poser, clé service) : la semaine en cours,
 * la cible et la commande ; le banquier vise la matière lourde la plus faible
 * d'après les mesures du dernier calcul. Le premier choix de la semaine gagne.
 * Refusé dès qu'un contrat que la commande remplace a payé cette semaine
 * (semaineEntamee, lu en base) : la commande repaierait le même travail.
 */
export async function poserSemaine(
  a: SupabaseClient,
  user: Joueur,
  jour: string,
  choix: { cible: number; commande: Commande },
  e: Pick<Entree, "lecture" | "contenu" | "programmes"> | null,
): Promise<{ ok: true } | { ok: false; raison: "indisponible" | "refus" }> {
  if (!(CIBLES_SEMAINE as readonly number[]).includes(choix.cible) || !COMMANDES.some((c) => c.id === choix.commande)) return { ok: false, raison: "refus" };
  let params: Semaine["params"] = {};
  if (choix.commande === "banquier") {
    if (!e) return { ok: false, raison: "indisponible" };
    const contenu = e.contenu ?? programmeActif(e.programmes).matieres();
    // la même lecture que l'objectif du contrat (mesure « maitrise ») : les matières mesurées seulement
    const m = matiereBanquier(contenu, (cle) => maitriseDe(e, cle));
    if (!m) return { ok: false, raison: "refus" };
    params = m;
  }
  try {
    const lundi = lundiDe(jour);
    const payes = await a.from("codex_progression").select("quete_id,periode,etat").eq("user_id", user.id).eq("periode", lundi).like("quete_id", "contrat:hebdo:%");
    if (payes.error) return { ok: false, raison: "indisponible" };
    if (semaineEntamee((payes.data ?? []) as Parameters<typeof semaineEntamee>[0], lundi)) return { ok: false, raison: "refus" };
    const { error } = await a.rpc("codex_semaine_poser", { p_user: user.id, p_lundi: lundi, p_cible: choix.cible, p_commande: choix.commande, p_params: params });
    if (error) return { ok: false, raison: baseAbsente(error) ? "indisponible" : "refus" };
    return { ok: true };
  } catch {
    return { ok: false, raison: "indisponible" };
  }
}

/**
 * Le verdict d'une session (codex_resultat_poser, clé service) : « admis »
 * mène le programme. Sans la §8 : gardé dans le compte (rl_verdict), et
 * « admis » mène le programme par codex_programme_poser si la §3 est là.
 */
export async function poserVerdict(
  a: SupabaseClient,
  supabase: SupabaseClient,
  user: Joueur,
  v: { programme: string; session: string; statut: StatutVerdict; bandes: Record<string, Bande> },
): Promise<{ ok: true } | { ok: false; raison: "indisponible" | "refus" }> {
  try {
    const { error } = await a.rpc("codex_resultat_poser", { p_user: user.id, p_programme: v.programme, p_session: v.session, p_statut: v.statut, p_bandes: v.statut === "pas_cette_fois" ? v.bandes : null });
    if (!error) return { ok: true };
    if (!baseAbsente(error)) return { ok: false, raison: "refus" };
  } catch {
    return { ok: false, raison: "indisponible" };
  }
  // sans codex_resultat : le compte
  const { error } = await supabase.auth.updateUser({ data: { rl_verdict: { ...v, bandes: v.statut === "pas_cette_fois" ? v.bandes : {}, saisi_le: new Date().toISOString() } } });
  if (error) return { ok: false, raison: "indisponible" };
  if (v.statut === "admis") {
    try {
      await a.rpc("codex_programme_poser", { p_user: user.id, p_programme: v.programme, p_statut: "mene", p_jour_j: null });
    } catch {
      // sans la §3 : le programme n'a pas de statut ; le verdict reste gardé
    }
  }
  return { ok: true };
}
