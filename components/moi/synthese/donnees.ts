import type { SupabaseClient, User } from "@supabase/supabase-js";
import { traitsDuJour } from "@/components/adn/AnneauDuJourData";
import { countPlayers } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import { lireNotionsJoueur } from "@/components/moi/points-faibles-data";
import {
  activiteEn,
  calculSynthese,
  codexSynthese,
  globaleSynthese,
  historiqueEn,
  marqueesSynthese,
  matiereLaPlusFaible,
  matieresSynthese,
  mesuresCalculDe,
  mesuresNotionsDe,
  moyennesDe,
  noteSynthese,
  notionsDe,
  notionsDepuisPointsFaibles,
  objectifSynthese,
  progressionSynthese,
  type Copie30,
  rangSynthese,
  rythmeDe,
  tempsSynthese,
  tropheesSynthese,
} from "@/components/moi/synthese/modele";
import type { NotionSynthese, SyntheseMoi, TropheesSynthese } from "@/components/moi/synthese/types";
import { lireSobre } from "@/lib/codex/sobre";
import { compterCartesMarquees } from "@/lib/flashcards/marquees";
import { getMaitrise, getTopicMastery, programMastery } from "@/lib/mastery";
import { datesSynthese, lireActivite, lireMaitriseSynthese, lireRythme } from "@/lib/moi-synthese";
import { NOTIONS } from "@/lib/notions";
import { dateExamen, etatObjectif, jourParis } from "@/lib/objectif";
import { joursEntre } from "@/lib/objectif-calc";
import { lireCodexMoi } from "@/lib/profil/codex-moi";
import { getLeaderboardRank, getMyRating } from "@/lib/rating";
import { DEFAULT_ELO } from "@/lib/ranks";
import { lireTempsSite } from "@/lib/temps-site";
import { lireTrophees, lignesTrophees } from "@/lib/trophees";
import { jourJ } from "@/lib/voice";

// La lecture de la page Moi « La synthèse » (onglet stats) : UN seul
// Promise.all, chaque lecture avec son .catch(() => null), et rien d'autre
// que ce que la page montre : le joueur (rang, temps, Codex, marquées),
// l'objectif, la note estimée, la salle des trophées, puis les matières (avec
// leur évolution), les notions, le calcul ou la théorie, le rythme et la
// progression, qui viennent des deux fonctions de migration_moi_synthese.sql
// (maitrise_synthese et rythme_joueur, avec le client de service), et ce qui a
// été fait depuis chaque comparaison (activite_depuis, migration_moi_activite.sql).
// Tant que la migration n'est pas collée, ou sans clé de service, ces sources
// valent null et les blocs qui en dépendent aussi (la carte se masque ou se
// simplifie) : aucune valeur inventée. Seul repli, lu en série et seulement
// quand maitrise_synthese ne répond pas : points_faibles, pour les notions.
// Module serveur.

type Profil = { username: string | null; avatar_url: string | null };

async function lireProfil(supabase: SupabaseClient, id: string): Promise<Profil | null> {
  const r = await supabase.from("profiles").select("username,avatar_url").eq("id", id).maybeSingle();
  return r.error ? null : (r.data as Profil | null);
}

/** Le nombre de questions marquées (un comptage, pas la liste) ; null sans la table. */
async function compterQuestionsMarquees(supabase: SupabaseClient, id: string): Promise<number | null> {
  const { count, error } = await supabase.from("question_flags").select("question_id", { count: "exact", head: true }).eq("user_id", id);
  return error ? null : (count ?? 0);
}

/** La salle des trophées : avec le client de service, trophees_joueur (qui rend aussi le moment du dernier) ; sinon les comptes seuls. */
async function lireSalle(supabase: SupabaseClient, admin: SupabaseClient | null, id: string): Promise<TropheesSynthese> {
  if (admin) {
    try {
      const { data, error } = await admin.rpc("trophees_joueur", { p_user: id });
      if (!error && Array.isArray(data)) return tropheesSynthese(lignesTrophees(data), true);
    } catch {
      // fonction absente ou lecture refusée : le repli ci-dessous
    }
  }
  const t = await lireTrophees(supabase, id);
  return tropheesSynthese(t.lignes, t.complet);
}

type Notions = { notions: NotionSynthese[] | null; source: SyntheseMoi["sourceNotions"] };

/**
 * Les 93 notions du catalogue et leur mesure. Avec maitrise_synthese : la règle
 * de la matière sur 20 réponses (source « unique »). Sans elle : points_faibles,
 * 90 jours sans pondération (source « 90j », lue ici, en série, seulement dans
 * ce cas). Sans l'une ni l'autre, null : la carte se masque (93 cases « jamais
 * vue » mentiraient). Une mesure vide chez un joueur qui a déjà répondu veut
 * dire que les questions ne portent pas encore leur notion : null aussi.
 */
async function lireNotions(supabase: SupabaseClient, syn: { notions: Record<string, unknown> } | null, aRepondu: boolean): Promise<Notions> {
  if (syn) {
    const mesures = mesuresNotionsDe(syn.notions);
    return Object.keys(mesures).length || !aRepondu ? { notions: notionsDe(NOTIONS, mesures), source: "unique" } : { notions: null, source: null };
  }
  const base = await lireNotionsJoueur(supabase).catch(() => null);
  return base?.remplie ? { notions: notionsDepuisPointsFaibles(base.lignes, NOTIONS), source: "90j" } : { notions: null, source: null };
}

/**
 * Tout ce que la page Moi « La synthèse » montre.
 * @param admin le client de service (tryAdmin) ; null : les trophées sans « dernier gagné », et ni historique, ni activité, ni calcul, ni rythme, ni moyennes
 * @param now l'instant de la requête (ms)
 */
/** Les copies des 30 du jour des six derniers mois (les séries de 5 sont écartées : même format, écart type comparable). */
async function lireCopies30(supabase: SupabaseClient, id: string, now: number): Promise<Copie30[]> {
  const depuis = jourParis(now - 190 * 864e5);
  const { data, error } = await supabase.from("daily_attempts").select("day,score,total").eq("user_id", id).gte("day", depuis).not("finished_at", "is", null).gte("total", 20);
  if (error || !data) return [];
  return data.map((c) => ({ jour: String(c.day).slice(0, 10), pct: (100 * Number(c.score)) / Number(c.total) }));
}

export async function lireSynthese(supabase: SupabaseClient, admin: SupabaseClient | null, user: Pick<User, "id" | "user_metadata">, now: number): Promise<SyntheseMoi> {
  const id = user.id;
  const dates = datesSynthese(now);
  const [profil, maitrise, mesures, etat, classe, joueurs, temps, codex, questions, cartes, trophees, examen, syn, ryt, act, copies30] = await Promise.all([
    lireProfil(supabase, id).catch(() => null),
    getMaitrise(supabase, id).catch(() => null),
    getTopicMastery(supabase, id).catch(() => null),
    // l'objectif, sans passer par loadActivity : le jour vient de la même lecture que la barre du haut
    traitsDuJour(id).then((jour) => etatObjectif(user, jour ?? 0)).catch(() => null),
    // la note puis la place (qui ne relit pas la note)
    getMyRating(supabase, id)
      .then(async (r) => ({ ...r, place: await getLeaderboardRank(supabase, id, r.elo) }))
      .catch(() => null),
    countPlayers(supabase).catch(() => null),
    lireTempsSite(supabase, id).catch(() => null),
    lireCodexMoi(supabase, id, { sobre: lireSobre(user), historique: false }).catch(() => null),
    compterQuestionsMarquees(supabase, id).catch(() => null),
    compterCartesMarquees(supabase).catch(() => null),
    lireSalle(supabase, admin, id).catch(() => null),
    dateExamen(id).catch(() => null),
    // les deux fonctions de migration_moi_synthese.sql : null sans clé de service, sans la migration, ou si la réponse est illisible
    lireMaitriseSynthese(admin, id, dates).catch(() => null),
    lireRythme(admin, id).catch(() => null),
    // les réponses depuis 3, 30, 60 et 90 jours (migration_moi_activite.sql) : null sans clé de service ou sans la migration
    lireActivite(admin, id, dates).catch(() => null),
    lireCopies30(supabase, id, now).catch((): Copie30[] => []),
  ]);
  const rang = rangSynthese({
    elo: classe?.elo ?? DEFAULT_ELO,
    gamesPlayed: classe?.gamesPlayed ?? 0,
    mastery: mesures ? programMastery(mesures) : 0,
    place: classe?.place ?? null,
    joueurs,
  });
  const aujourdhui = jourParis(now);
  const jn = examen ? jourJ(joursEntre(aujourdhui, examen)) : null;

  // les matières : la maîtrise d'aujourd'hui toujours, son évolution et les moyennes des joueurs si maitrise_synthese répond
  const histo = syn ? historiqueEn(syn.historique, dates.map((d) => jourParis(Date.parse(d)))) : null;
  const moyennes = syn ? moyennesDe(syn.moyennes) : null;
  const activite = act ? activiteEn(act.depuis) : null;
  const aRepondu = maitrise ? maitrise.matieres.some((m) => m.total > 0) : true;
  const { notions, source } = await lireNotions(supabase, syn, aRepondu);

  return {
    joueur: {
      id,
      nom: displayName(profil?.username, id),
      avatar: profil?.avatar_url ?? null,
      jn,
      rang,
      temps: tempsSynthese(temps),
      codex: codexSynthese(codex),
      marquees: marqueesSynthese(questions, cartes),
    },
    objectif: etat ? objectifSynthese(etat, matiereLaPlusFaible(maitrise)) : { etat: "sans" },
    note: noteSynthese(maitrise),
    matieres: maitrise ? matieresSynthese(maitrise, histo, moyennes, activite) : null,
    globale: maitrise ? globaleSynthese(maitrise, histo, activite) : null,
    notions,
    sourceNotions: source,
    calcul: syn ? calculSynthese(mesuresCalculDe(syn.calcul), maitrise?.matieres) : null,
    rythme: rythmeDe(ryt),
    progression: progressionSynthese(histo, maitrise, aujourdhui, examen, copies30),
    trophees,
  };
}
