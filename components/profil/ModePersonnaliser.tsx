import type { SupabaseClient } from "@supabase/supabase-js";
import { Personnaliser } from "@/components/profil/Personnaliser";
import type { EnteteData } from "@/components/profil/EnteteJoueur";
import { masteryByUser, tryAdmin } from "@/components/classement/data";
import { displayName } from "@/components/classement/format";
import { levelInfoFromXp } from "@/lib/leveling";
import { getLeaderboardRank } from "@/lib/rating";
import { DEFAULT_ELO } from "@/lib/ranks";
import { getTopicAverages } from "@/lib/mastery";
import { getAnswerStats } from "@/lib/answer-stats";
import { amisDe, datesDuPic, lireLien, lireNom, lireStyle, statsProfil } from "@/lib/profil/donnees";
import { sceauxDuJoueur } from "@/lib/profil/sceaux-base";
import { posesDe } from "@/lib/profil/sceaux";
import { LIEN_DEFAUT, NOM_DEFAUT, acquisDe } from "@/lib/profil/catalogue";
import { lireAcquis } from "@/lib/profil/acquis";
import { titresPortables } from "@/lib/profil/styles";
import { lireTrophees } from "@/lib/trophees";
import { folioPorte } from "@/lib/profil/etagere";
import { journalDe } from "@/lib/profil/journal";
import { lireSaisons } from "@/lib/profil/saisons";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import { extraitCarnet, extraitJournal, resumeReponses, resumeTrophees } from "@/lib/profil/blocs-resumes";
import { lireCercle, maitriseMesuree } from "@/lib/profil/visiteur";
import { BESOINS_TOUS, classementDepuis, lireTuilesNeuves } from "@/lib/profil/tuiles-neuves";

// Personnaliser, côté serveur (/people/<moi>?personnaliser=1, sur son
// propre profil seulement) : tout ce que l'ancien éditeur /moi/profil
// lisait (le style, le LinkedIn et le nom tels quels, les blocs de la page),
// plus ce qui ouvre les pièces gagnées (questions, pic et sa date, sceaux)
// et les titres qu'il peut porter (gagnés au Codex, aux trophées, au fil
// rouge : l'Acquis complet reste ici, la page n'en reçoit que la liste).
// Les blocs de la page reçoivent leurs données une seule fois
// (DonneesBlocs) : les siennes, Journal compris (toujours ouvert pour lui :
// il peut poser le bloc), et ses saisons.

type ProfilLu = { username: string | null; avatar_url: string | null; xp_total: number | null };

async function progression(sb: SupabaseClient, id: string) {
  try {
    const { data } = await sb.rpc("get_user_practice_progress", { p_user_id: id });
    return Array.isArray(data) ? (data as { id: string; topics: string[]; format: number; score: number; total: number; completed_at: string }[]) : [];
  } catch {
    return [];
  }
}

export async function ModePersonnaliser({ id, supabase, profil, rating }: { id: string; supabase: SupabaseClient; profil: ProfilLu; rating: { elo: number; games_played: number } | null }) {
  const admin = tryAdmin();
  const statsLues = statsProfil(id, supabase);
  const maitrisesLues = masteryByUser(admin, [id]);
  const sceauxLus = statsLues.then((s) => sceauxDuJoueur(id, s));
  const [place, masteries, { style, disponible, pins, journal: visibiliteJournal }, lien, stats, amis, nom, moyennes, answers, trophees, progress, sceaux, datesPic, acquisLu, journal, saisons, neuves] = await Promise.all([
    getLeaderboardRank(supabase, id),
    maitrisesLues,
    lireStyle(supabase, id),
    lireLien(supabase, id),
    statsLues,
    // ses amis par ELO (le bloc Amis chez soi : les plus hauts ELO), sinon comme avant
    lireCercle({ id, toi: null, sb: supabase, admin, moi: true })
      .then((c) => c?.amis ?? amisDe(id, supabase, 12))
      .catch(() => amisDe(id, supabase, 12)),
    lireNom(supabase, id),
    // les blocs de la page, comme sur le profil
    admin ? getTopicAverages(admin) : Promise.resolve({} as Record<string, number | null>),
    getAnswerStats(supabase, id, { detail: false }).catch(() => null),
    // la Salle des trophées : toutes les sources, sinon l'entraînement ciblé seul
    lireTrophees(supabase, id),
    progression(supabase, id),
    sceauxLus,
    datesDuPic(supabase, id),
    // le Codex, les trophées, les programmes menés (le profil s'y ajoute plus bas)
    statsLues.then((s) => lireAcquis(admin ?? supabase, id, { stats: s, sceaux: [], datesPic: [] })),
    // le bloc Journal : le sien, toujours ouvert pour lui (la courbe avec son client, les victoires avec l'admin)
    Promise.all([statsLues, maitrisesLues, sceauxLus])
      .then(([s, m, sc]) => journalDe({ id, sb: supabase, admin, stats: s, mastery: m.get(id) ?? null, gardes: sc.gardes }))
      .catch(() => null),
    lireSaisons(supabase, id),
    // les sept tuiles de plus : toutes, il peut poser n'importe laquelle ; le Journal lui est toujours ouvert
    lireTuilesNeuves({ id, sb: supabase, admin, moi: true, besoins: BESOINS_TOUS, ouvert: true, elo: rating?.elo ?? DEFAULT_ELO }),
  ]);
  const titres = titresPortables({ ...acquisLu, sceaux: sceaux.etats, datesPic }, style.titre);

  const xpTotal = Number(profil.xp_total ?? 0) || 0;
  const lvl = levelInfoFromXp(xpTotal);
  const elo = rating?.elo ?? DEFAULT_ELO;
  const carte: EnteteData = {
    id,
    name: displayName(profil.username, id),
    nomComplet: nom?.nom ?? null,
    avatarUrl: profil.avatar_url ?? null,
    style,
    niveau: lvl.level,
    levelPct: Math.round(lvl.progressPct * 100),
    xpTotal,
    elo,
    mastery: masteries.get(id) ?? null,
    place,
    gamesPlayed: rating?.games_played ?? 0,
    linkedin: lien?.linkedin ?? null,
    amis: amis ? amis.total : null,
    pic: stats.palierMax,
  };
  // les blocs de la page (la couleur et les chiffres clés suivent ensuite le brouillon)
  const donnees: DonneesBlocs = {
    id,
    nom: carte.name,
    moi: true,
    viewerId: id,
    avatarUrl: profil.avatar_url ?? null,
    elo,
    parties: rating?.games_played ?? 0,
    maitrise: maitriseMesuree(masteries.get(id) ?? null),
    accent: style.accent,
    showcase: style.showcase,
    stats,
    radar: { moyennes, miennes: null, monAccent: null },
    amis,
    reponses: answers ? resumeReponses(answers) : null,
    trophees: resumeTrophees(trophees),
    progression: progress,
    folio: folioPorte(style.folio),
    journal: journal ? extraitJournal(journal) : null,
    saisons,
    visibiliteJournal,
    // le carnet de jours : le sien, toujours ouvert pour lui
    carnet: journal ? extraitCarnet(journal) : null,
    formeDuels: neuves.formeDuels,
    jourJ: neuves.jourJ,
    classement: classementDepuis({ place, joueurs: neuves.joueurs, elo, maitrise: masteries.get(id) ?? null, variation: neuves.variation }),
    examens: neuves.examens,
    codex: neuves.codex,
    rythme: neuves.rythme,
  };

  return (
    <div className="rl-wide rl-page">
      <Personnaliser
        carte={carte}
        acquis={acquisDe(stats, sceaux.etats, datesPic)}
        initial={style}
        pins={posesDe(sceaux.etats, sceaux.base ? pins : null).map((e) => e.def.cle)}
        base={sceaux.base}
        linkedin={lien?.linkedin ?? null}
        visibilite={lien?.visibilite ?? LIEN_DEFAUT.visibilite}
        nom={nom ?? NOM_DEFAUT}
        disponible={disponible}
        donnees={donnees}
        banqueGifs={!!process.env.KLIPY_API_KEY}
        titres={titres}
      />
    </div>
  );
}
