import type { SupabaseClient } from "@supabase/supabase-js";
import { loadActivity, parisHour, withLiveDaily } from "@/components/accueil/queries";
import { longDay } from "@/components/accueil/format";
import { countPlayers } from "@/components/classement/data";
import { lireCarteDuJourEnCache } from "@/components/accueil/lobby/lecture-carte";
import { lireEnDirect, lirePersoVainqueur } from "@/components/accueil/lobby/lecture-direct";
import { lireAmis, lireCarnet, lireDeblocage, lireGrandeSalle, lireQuete, lireScores } from "@/components/accueil/lobby/lecture-parcours";
import { lireRelancesRecues, lireRivalActivite } from "@/components/accueil/lobby/lecture-rival";
import { construireLobby, dejaVenu } from "@/components/accueil/lobby/modele";
import { fusionnerNouveau, nouveauteRelance } from "@/components/accueil/lobby/modele-parcours";
import { FILET_CARTES_MS, FILET_MS, plafonnerAvecReprise } from "@/components/accueil/lobby/plafond";
import type { CartesDifferees, CtxLecture, Lobby } from "@/components/accueil/lobby/types";
import { getDailyBoard, getTodayDaily, shiftDay, type TodayDaily } from "@/lib/daily";
import { lireSobre } from "@/lib/codex/sobre";
import { calcStreakAndToday, type XpDay } from "@/lib/leveling";
import { getTopicMastery, programMastery } from "@/lib/mastery";
import { dateExamen, etatObjectif, objectifDe } from "@/lib/objectif";
import { OBJECTIF_DU_JOUR } from "@/components/adn/AnneauDuJourEvents";
import { nouveautesAmis } from "@/lib/profil/nouveau";
import { DEFAULT_ELO } from "@/lib/ranks";
import { getLeaderboardRank, getMyRating, getRatingHistory } from "@/lib/rating";
import { joursEncreUnifies, lireSerieEncre } from "@/lib/serie-encre";
import { lireVainqueurDuJour } from "@/lib/vainqueur-du-jour";

// La lecture de l'accueil « Le lobby » (/dashboard) : UN seul Promise.all pour
// la page, chaque lecture avec son .catch(() => null). Le socle (le joueur, les
// 30 et les 5 du jour et leur classement, la journée, le vainqueur d'hier, le
// rang) et les cartes des lots 2 à 5 (les records, la Grande Salle, du nouveau,
// les amis, le carnet de jours, chacune avec un filet de 4 s). Tant qu'une
// migration n'est pas collée, ou sans clé de service, la source concernée vaut
// null et la carte se masque ou se simplifie : aucune valeur inventée.
//
// Les cinq cartes lentes (le lobby en direct, le rival, la carte du jour, le
// déblocage, la quête) NE bloquent PLUS la page et ne se masquent plus à 1,5 s
// (« de temps en temps la carte du jour n'apparaît pas ») : leurs lectures
// démarrent en même temps que le reste mais sortent du Promise.all, et la page
// les reçoit en `differees` (des promesses qui ne rejettent jamais) pour les
// rendre en continu, chacune dans un <Suspense> avec son squelette (Rangees.tsx).
// Seule une lecture qui échoue vraiment, ou qui dépasse le filet large de
// FILET_CARTES_MS, retire la carte. La carte du jour, la même toute la journée,
// est gardée par joueur, jour et réglages (lecture-carte.ts). Le classement des
// 30 d'aujourd'hui est lu UNE fois (200 lignes) pour le classement de la page et
// le lobby en direct. Module serveur.

type Profil = { username: string | null; avatar_url: string | null };

/** Ce que lit la page : le lobby (le socle et les cartes lues avec elle) et les cinq cartes lentes qui arrivent après. */
export type AccueilLu = { lobby: Lobby; differees: Required<CartesDifferees> };

async function lireProfil(sb: SupabaseClient, id: string): Promise<Profil | null> {
  const r = await sb.from("profiles").select("username, avatar_url").eq("id", id).maybeSingle();
  return r.error ? null : (r.data as Profil | null);
}

/** L'XP par jour sur 30 jours : sert à savoir si le joueur est déjà venu et à l'ancien calcul de la série. */
async function lireXp(sb: SupabaseClient): Promise<XpDay[]> {
  try {
    const r = await sb.rpc("get_xp_daily", { p_days: 30 });
    return Array.isArray(r.data) ? (r.data as XpDay[]).map((x) => ({ day: String(x.day).slice(0, 10), xp: Number(x.xp) || 0 })) : [];
  } catch {
    return [];
  }
}

/** Le jour d'une copie commencée ou rendue (la preuve qu'il est venu) ; les défis « bientôt » ou à jouer n'en sont pas une. */
const copieOuverte = (d: TodayDaily | null) => (d && (d.status === "playing" || d.status === "done") ? d.day : null);

/** Le rang au classement du programme, une fois l'ELO connu (une seule lecture de la note). */
async function lireNote(sb: SupabaseClient, id: string) {
  const r = await getMyRating(sb, id);
  return { ...r, place: await getLeaderboardRank(sb, id, r.elo) };
}

/** Le classement du jour : assez de lignes pour que le lobby en direct y trouve les copies de l'heure (la page n'en montre que 5). */
const LIGNES_CLASSEMENT = 200;

/**
 * Tout ce que la page montre : le lobby, lu d'un bloc, et les cinq cartes lentes,
 * dont les lectures sont déjà parties mais que la page n'attend pas.
 * @param ctx les deux clients (admin : null sans clé de service), le joueur, l'instant et le jour de Paris
 */
export async function lireLobby(ctx: CtxLecture): Promise<AccueilLu> {
  const { sb, admin, user, now, jour } = ctx;
  const id = user.id;
  // la journée d'abord : l'objectif en dépend (la courbe se recale sur les questions du jour)
  const activite = loadActivity(sb, id, now).catch(() => null);
  // le classement du jour, lu une fois ; le dernier vainqueur, puis son personnage
  const classementAuj = plafonnerAvecReprise(() => getDailyBoard(sb, jour, LIGNES_CLASSEMENT));
  const vainqueurLu = plafonnerAvecReprise(() => lireVainqueurDuJour(sb, id, jour));
  // le profil, lu une fois : le salut, et ton visage « Toi » dans le lobby en direct
  const profilLu = lireProfil(sb, id).catch(() => null);
  // les cinq cartes lentes : les lectures partent maintenant, en même temps que le reste, mais la page ne les attend
  // pas (elles ne rejettent jamais : deux essais, puis null sur un échec ou au-delà du filet)
  const differees: Required<CartesDifferees> = {
    enDirect: plafonnerAvecReprise(
      () =>
        Promise.all([classementAuj, profilLu]).then(([b, p]) =>
          lireEnDirect(ctx, { classements: { trente: b }, moi: p ? { nom: p.username?.trim() || null, avatarUrl: p.avatar_url } : undefined }),
        ),
      FILET_CARTES_MS,
    ),
    rival: plafonnerAvecReprise(() => lireRivalActivite(ctx), FILET_CARTES_MS),
    carteDuJour: plafonnerAvecReprise(() => lireCarteDuJourEnCache({ sb, user, jour }), FILET_CARTES_MS),
    deblocage: plafonnerAvecReprise(() => lireDeblocage(ctx), FILET_CARTES_MS),
    quete: plafonnerAvecReprise(() => lireQuete(ctx), FILET_CARTES_MS),
  };
  const [
    profil,
    xp,
    daily,
    cinq,
    boardAuj,
    boardHier,
    act,
    etat,
    vainqueur,
    persoVainqueur,
    note,
    historique,
    joueurs,
    topics,
    serieBase,
    examen,
    scores,
    grandeSalle,
    nouveauAmis,
    relances,
    amis,
    carnet,
  ] = await Promise.all([
    profilLu,
    lireXp(sb).catch(() => [] as XpDay[]),
    plafonnerAvecReprise(() => getTodayDaily(sb, id)),
    plafonnerAvecReprise(() => getTodayDaily(sb, id, "cinq")),
    classementAuj,
    plafonnerAvecReprise(() => getDailyBoard(sb, shiftDay(jour, -1), 5)),
    activite,
    activite.then((a) => etatObjectif(user, a?.today ?? 0)).catch(() => null),
    vainqueurLu,
    vainqueurLu.then((v) => (v ? plafonnerAvecReprise(() => lirePersoVainqueur(ctx, v.userId), FILET_MS) : null)).catch(() => null),
    lireNote(sb, id).catch(() => null),
    getRatingHistory(sb, id, 1).catch(() => []),
    countPlayers(sb).catch(() => null),
    getTopicMastery(sb, id).catch(() => null),
    lireSerieEncre(sb).catch(() => null),
    dateExamen(id).catch(() => null),
    // les autres cartes des lots 2 à 5, chacune avec son filet
    plafonnerAvecReprise(() => lireScores(ctx), FILET_MS),
    plafonnerAvecReprise(() => lireGrandeSalle(ctx), FILET_MS),
    plafonnerAvecReprise(() => nouveautesAmis(sb, admin, id), FILET_MS),
    plafonnerAvecReprise(() => lireRelancesRecues(ctx), FILET_MS),
    plafonnerAvecReprise(() => lireAmis(ctx), FILET_MS),
    plafonnerAvecReprise(() => lireCarnet(ctx), FILET_MS),
  ]);

  // la journée : les réponses du jour, avec une copie ouverte ou rendue recalée (withLiveDaily)
  const activity = act ? withLiveDaily(withLiveDaily(act, daily), cinq) : null;
  const repondues = activity?.today ?? 0;
  const heure = parisHour(now);
  // UNE seule série : celle d'encre (10 questions, joker) quand la migration est collée, l'ancien calcul sinon
  const ancien = calcStreakAndToday(xp, { today: jour, actifs: activity?.activeDays });
  const { streak, dayState, serie, reste } = joursEncreUnifies(serieBase, repondues, heure, ancien);
  const venu = dejaVenu([...xp.filter((x) => x.xp > 0).map((x) => x.day), ...(activity?.activeDays ?? []), copieOuverte(daily), copieOuverte(cinq)]);

  const dernier = historique.length ? historique[historique.length - 1].delta : null;
  const lobby = construireLobby({
    now,
    jour,
    heure,
    dateLabel: longDay(now),
    pseudo: profil?.username?.trim() || null,
    dejaVenu: venu,
    examen,
    daily,
    cinq,
    boardAuj,
    boardHier,
    repondues,
    calculs: activity?.todayCalc ?? 0,
    objectif: etat ? objectifDe(etat) : OBJECTIF_DU_JOUR,
    serie,
    streak,
    dayState,
    reste,
    vainqueur,
    persoVainqueur,
    rating: { elo: note?.elo ?? DEFAULT_ELO, gamesPlayed: note?.gamesPlayed ?? 0 },
    place: note?.place ?? null,
    joueurs,
    dernierDelta: dernier,
    mastery: topics ? programMastery(topics) : 0,
    sobre: lireSobre(user),
    // les cinq cartes lentes n'y sont pas : elles arrivent en `differees`
    suite: {
      scores,
      grandeSalle,
      // les relances reçues d'abord, puis les nouvelles des amis
      nouveau: fusionnerNouveau(nouveauAmis, relances ? relances.map(nouveauteRelance) : null),
      amis,
      carnet,
    },
  });
  return { lobby, differees };
}
