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
  matchs: number;
  /** les 4 derniers événements, du plus récent au plus ancien */
  evenements: EvenementJournal[];
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
  /** la couleur et les chiffres clés (dans Personnaliser : ceux du brouillon) */
  accent: string;
  showcase: VitrineKey[];
  stats: ProfilStats;
  radar: { moyennes: Record<string, number | null>; miennes: ProfilStats["matieres"] | null; monAccent: string | null };
  amis: { amis: AmiLite[]; total: number } | null;
  reponses: ResumeReponses | null;
  trophees: ResumeTrophees | null;
  progression: SeanceProgression[] | null;
  folio: DonneesFolio | null;
  /** null : non lu, ou Journal fermé à celui qui regarde */
  journal: ExtraitJournal | null;
  saisons: Saisons | null;
  /** qui voit le Journal (Personnaliser le dit sur le bloc) */
  visibiliteJournal: Visibilite;
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
      return d.reponses !== null;
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
  }
}
