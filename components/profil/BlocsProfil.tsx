"use client";

import { BookOpen, Calendar, CalendarClock, CircleCheck, Clapperboard, Clock, ClipboardCheck, Feather, Gauge, Hash, Hexagon, Hourglass, ImageIcon, LayoutPanelTop, LineChart, Medal, Radar as IconeRadar, ScrollText, Swords, Trophy, Users } from "lucide-react";
import { estCarte, estMedia, type Bloc, type BlocCarte, type BlocMedia, type Format, type GenreBloc } from "@/lib/profil/disposition";
import type { DonneesBlocs } from "@/lib/profil/blocs-donnees";
import type { Ctx } from "./blocs/commun";
import { ChiffresBloc } from "./blocs/Chiffres";
import { RadarBloc } from "./blocs/Radar";
import { AmisBloc } from "./blocs/Amis";
import { ReponsesBloc } from "./blocs/Reponses";
import { TropheesBloc } from "./blocs/Trophees";
import { ProgressionBloc } from "./blocs/Progression";
import { FolioBloc } from "./blocs/Folio";
import { JournalBloc } from "./blocs/Journal";
import { SaisonsBloc } from "./blocs/Saisons";
import { CarnetBloc } from "./blocs/Carnet";
import { DuelsBloc } from "./blocs/Duels";
import { JourJBloc } from "./blocs/JourJ";
import { PhareBloc } from "./blocs/Phare";
import { ClassementBloc } from "./blocs/Classement";
import { ExamensBloc } from "./blocs/Examens";
import { CodexBloc } from "./blocs/CodexTuile";
import { RythmeBloc } from "./blocs/Rythme";
import { TempsBloc } from "./blocs/Temps";
import { AvecImage, CarteBloc, MediaBloc } from "./blocs/Medias";
import b from "./BlocsProfil.module.css";

export { couvertureDe } from "./blocs/Medias";

// Les blocs de la page de profil (onglet Profil, et la même page dans
// Personnaliser), chacun dans son fichier (components/profil/blocs/*), à
// l'un des 5 formats de la grille (mini-tuile, colonne, héros, bande,
// demi-bande). Chez un autre, chaque bloc répond d'un coup d'œil à « est-il
// chaud, comparé à moi ? » : son chiffre fort, le jeton d'écart de ton côté
// (« toi −1 692 », vert si tu mènes, rouge s'il mène), le score de la tuile
// (« toi 1 – 2 ») ; le détail à la demande (lib/profil/ecart.ts,
// blocs/commun.tsx). Chez soi : ses chiffres, sobrement. Chaque bloc gère
// son état vide (rien en vue publique, sa coque dans Personnaliser). Ici :
// l'aiguillage, l'image en haut, les couleurs inversées et les icônes.

/** L'icône de chaque genre de bloc (barre de l'éditeur, feuille « Choisir un module »), 15 px. */
export const ICONE_BLOC: Record<GenreBloc, React.ReactNode> = {
  vitrine: <Hash size={15} aria-hidden />,
  radar: <IconeRadar size={15} aria-hidden />,
  amis: <Users size={15} aria-hidden />,
  reponses: <CircleCheck size={15} aria-hidden />,
  trophees: <Trophy size={15} aria-hidden />,
  progression: <LineChart size={15} aria-hidden />,
  folio: <Feather size={15} aria-hidden />,
  journal: <ScrollText size={15} aria-hidden />,
  saisons: <Hexagon size={15} aria-hidden />,
  carnet: <Calendar size={15} aria-hidden />,
  duels: <Swords size={15} aria-hidden />,
  jourj: <CalendarClock size={15} aria-hidden />,
  phare: <Gauge size={15} aria-hidden />,
  classement: <Medal size={15} aria-hidden />,
  examens: <ClipboardCheck size={15} aria-hidden />,
  codex: <BookOpen size={15} aria-hidden />,
  rythme: <Clock size={15} aria-hidden />,
  temps: <Hourglass size={15} aria-hidden />,
  image: <ImageIcon size={15} aria-hidden />,
  gif: <ImageIcon size={15} aria-hidden />,
  video: <Clapperboard size={15} aria-hidden />,
  carte: <LayoutPanelTop size={15} aria-hidden />,
};

/**
 * Un bloc de la page, au format donné. `edition` : dans Personnaliser (état
 * vide ou invitation au lieu de rien). Avec un média en haut, le module
 * passe sous lui ; couleurs inversées : les jetons de l'autre thème.
 */
export function BlocProfil({ bloc, f, d, edition = false }: { bloc: Bloc; f: Format; d: DonneesBlocs; edition?: boolean }): React.ReactNode {
  const rendu = rendreBloc(bloc, f, d, edition);
  // les couleurs inversées : les jetons de l'autre thème, posés sur le bloc (.rl-inverse, app/globals.css)
  if (!bloc.inv || !rendu) return rendu;
  return <div className={"rl-inverse " + b.inverse}>{rendu}</div>;
}

/** le bloc lui-même (null : rien à montrer) ; appelé comme une fonction, pour savoir s'il rend quelque chose */
function rendreBloc(bloc: Bloc, f: Format, d: DonneesBlocs, edition: boolean): React.ReactNode {
  if (estMedia(bloc)) return <MediaBloc m={bloc} f={f} />;
  if (estCarte(bloc)) return CarteBloc({ c: bloc, f, edition });
  const contenu = contenuModule(bloc, { d, f, edition });
  // en demi-bande, pas de média en haut (la validation et l'éditeur le refusent déjà)
  if (!contenu || !bloc.img || bloc.k === "progression" || f === "demi") return contenu;
  return (
    <AvecImage img={bloc.img} f={f}>
      {contenu}
    </AvecImage>
  );
}

/** le contenu d'un module (null : rien à montrer) ; les blocs sont appelés comme des fonctions (leurs états vivent dans leurs sous-composants) */
function contenuModule(bloc: Exclude<Bloc, BlocMedia | BlocCarte>, ctx: Ctx): React.ReactNode {
  switch (bloc.k) {
    case "vitrine":
      return ChiffresBloc(ctx);
    case "radar":
      return RadarBloc(ctx);
    case "amis":
      return AmisBloc(ctx);
    case "reponses":
      return ReponsesBloc(ctx);
    case "trophees":
      return TropheesBloc(ctx);
    case "progression":
      return ProgressionBloc(ctx);
    case "folio":
      return FolioBloc(ctx);
    case "journal":
      return JournalBloc(ctx);
    case "saisons":
      return SaisonsBloc(ctx);
    case "carnet":
      return CarnetBloc(ctx);
    case "duels":
      return DuelsBloc(ctx);
    case "jourj":
      return JourJBloc(ctx);
    case "phare":
      return PhareBloc(ctx);
    case "classement":
      return ClassementBloc(ctx);
    case "examens":
      return ExamensBloc(ctx);
    case "codex":
      return CodexBloc(ctx);
    case "rythme":
      return RythmeBloc(ctx);
    case "temps":
      return TempsBloc(ctx);
    default:
      return null;
  }
}
