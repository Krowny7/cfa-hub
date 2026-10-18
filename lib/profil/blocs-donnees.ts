// Les données des blocs de la page de profil (onglet Profil, et la même
// page dans Personnaliser) : tout ce que les blocs montrent, lu une seule
// fois par le serveur (app/people/[id]/page.tsx, ModePersonnaliser.tsx) et
// passé une seule fois au client. Tout est sérialisable : aucune fonction,
// aucune Map. Les résumés se calculent dans lib/profil/blocs-resumes.ts.
// Module neutre (imports de types seulement).

import type { ProfilStats, VitrineKey, Visibilite } from "@/lib/profil/catalogue";
import type { AmiLite } from "@/lib/profil/donnees";
import type { AnswerSource } from "@/lib/answer-stats";
import type { LigneTrophee } from "@/lib/trophees";
import type { Saisons } from "@/lib/profil/saisons";
import type { EvenementJournal } from "@/lib/profil/journal";
import type { DonneesFolio } from "@/components/profil/Folio";
import type { Bloc } from "@/lib/profil/disposition";

export type SeanceProgression = { id: string; topics: string[]; format: number; score: number; total: number; completed_at: string };

export type ResumeReponses = {
  total: number;
  justes: number;
  /** % de bonnes réponses, null sans réponse */
  precision: number | null;
  /** sources non vides, de la plus jouée à la moins jouée, avec leur précision (%) */
  sources: { source: AnswerSource; nom: string; n: number; pct: number }[];
  /** des sources n'ont pas pu être lues (le compte est un minimum) */
  incomplet: boolean;
};

export type ResumeTrophees = { lignes: LigneTrophee[]; complet: boolean };

export type ExtraitJournal = {
  /** l'ELO au premier jour des 90 jours, puis après chaque match (90 points au plus, les derniers) */
  depart: number;
  points: number[];
  /** les matchs classés de toujours */
  matchs: number;
  /** ceux des 90 jours (la courbe) ; absent : le nombre de points */
  matchs90?: number;
  /** les 4 derniers événements, du plus récent au plus ancien */
  evenements: EvenementJournal[];
  /** le jour (Paris, AAAA-MM-JJ) de chaque point, pour un axe de dates commun avec la courbe du visiteur */
  dates?: string[];
};

/** Le carnet de jours (52 semaines) : les questions par jour (n > 0), la série, le record, le seuil d'un jour d'encre. */
export type ExtraitCarnet = {
  jours: [string, number][];
  aujourdhui: string;
  serie: number;
  record: number;
  /** questions qui font un jour d'encre (10 avec la série d'encre) ; null : une question suffit */
  seuil: number | null;
};

/** Un ami dans un bloc : son ELO (le cercle), et s'il est aussi ton ami. */
export type AmiBloc = AmiLite & { elo?: number; commun?: boolean };

/**
 * Ce que les blocs savent de celui qui regarde, chez un autre (« est-il
 * chaud, comparé à moi ? ») : lu par le serveur ; ce qui coûte n'est lu que
 * si le bloc qui s'en sert est posé.
 */
export type DonneesVisiteur = {
  id: string;
  /** sa couleur (le trait fin des comparaisons) */
  accent: string | null;
  elo: number;
  parties: number;
  /** maîtrise du programme (%), null tant qu'elle n'est pas mesurée */
  maitrise: number | null;
  /** ses chiffres (questions, série, record, matières, duels, défis, calculs, examens…) */
  stats: ProfilStats;
  /** ses jours des 52 semaines (n > 0) et aujourd'hui (Paris) */
  jours: [string, number][];
  aujourdhui: string;
  /** si le bloc Trophées est posé : ses trophées par palier (1 bronze … 4 diamant) */
  trophees?: { parPalier: Record<1 | 2 | 3 | 4, number>; total: number; complet: boolean } | null;
  /** si le bloc Saisons est posé : la saison en cours et son palmarès (courante.moi : le visiteur) */
  saisons?: Saisons | null;
  /** si le bloc Progression est posé : ses séances */
  seances?: SeanceProgression[] | null;
  /** si le bloc Journal est posé (et le Journal ouvert) : sa courbe d'ELO des 90 jours, jour par jour */
  courbeElo?: { depart: number; points: number[]; dates: string[] } | null;
  /** si le bloc Amis est posé : ses amis communs avec le joueur regardé (identifiants) */
  amis?: string[] | null;
  /** ton avatar et ton pseudo (le cercle d'amis) */
  profil?: AmiLite;
  /** bloc Folio posé : le folio qu'il porte est aussi à toi ; null : on ne sait pas (pas de badge) */
  folio?: boolean | null;
};

/** Tout ce que les blocs de la page montrent : lu par le serveur, passé une seule fois au client. */
export type DonneesBlocs = {
  /** le joueur affiché */
  id: string;
  nom: string;
  /** son propre profil, hors aperçu (« Gérer mes amis », « Tes matières ») */
  moi: boolean;
  /** celui qui regarde (pas de point de présence sur lui-même) */
  viewerId: string | null;
  /** « voir comme les autres » (sur son profil) : les écarts disent « toi ± » sans chiffre */
  apercu?: boolean;
  /** son avatar (le cercle d'amis) */
  avatarUrl?: string | null;
  /** son ELO, ses parties et sa maîtrise du programme (l'en-tête ; les comparaisons) */
  elo?: number;
  parties?: number;
  maitrise?: number | null;
  /** la couleur et les chiffres clés (dans Personnaliser : ceux du brouillon) */
  accent: string;
  showcase: VitrineKey[];
  stats: ProfilStats;
  radar: { moyennes: Record<string, number | null>; miennes: ProfilStats["matieres"] | null; monAccent: string | null };
  /** ses amis ; `cercle` (chez un autre) : sa place et la tienne par ELO dans son cercle (lui et toi compris) */
  /** `cercle.toiAmi` : celui qui regarde est son ami (lu au serveur : il peut être hors des amis montrés) */
  amis: { amis: AmiBloc[]; total: number; cercle?: { lui: number; toi: number | null; taille: number; toiAmi?: boolean } } | null;
  reponses: ResumeReponses | null;
  trophees: ResumeTrophees | null;
  progression: SeanceProgression[] | null;
  folio: DonneesFolio | null;
  /** null : non lu, ou Journal fermé à celui qui regarde */
  journal: ExtraitJournal | null;
  saisons: Saisons | null;
  /** qui voit le Journal (Personnaliser le dit sur le bloc) */
  visibiliteJournal: Visibilite;
  /** le carnet de jours (suit la visibilité du Journal) ; null : non lu, ou Journal fermé */
  carnet?: ExtraitCarnet | null;
  /** celui qui regarde, chez un autre et connecté ; null ou absent sinon (chez soi, aperçu) */
  toi?: DonneesVisiteur | null;
};

/**
 * Le bloc a-t-il quelque chose à montrer ? Non : sa case garde sa place,
 * vide, sur ordinateur (vue publique). En Personnaliser, le bloc se rend
 * toujours (son état vide ou son invitation).
 */
export function aDuContenu(b: Bloc, d: DonneesBlocs): boolean {
  switch (b.k) {
    case "vitrine":
    case "radar":
    case "media":
      return true;
    case "amis":
      return d.amis !== null;
    case "reponses":
      // le chiffre fort est le nombre de questions (les stats) ; le détail par source vient en plus s'il se lit
      return d.stats.questions > 0;
    case "trophees":
      return d.trophees !== null;
    case "progression":
      // la courbe ne se trace qu'à partir de 2 séances (PracticeProgressChart)
      return d.progression !== null && d.progression.length >= 2;
    case "folio":
      return d.folio !== null;
    case "journal":
      return d.journal !== null;
    case "saisons":
      return !!d.saisons && (!!d.saisons.courante || d.saisons.palmares.length > 0);
    case "carnet":
      // Journal fermé : la série et le record, déjà publics, restent
      return !!d.carnet || d.stats.meilleureSerie > 0;
    case "carte":
      return !!(b.titre || b.texte || b.img);
  }
}
