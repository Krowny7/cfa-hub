import { shelfRows } from "@/components/reviser/Briques";
import { SUBJECTS, type SubjectAvailability } from "@/components/reviser/catalog";
import { pad2 } from "@/components/reviser/rail";
import type { Piece } from "@/components/ui/Presentoir";
import { Carrousel, type FormeCarrousel } from "@/components/ui/Carrousel";
import { CadreZones, EnTeteSousPage, SousPage, type Zone } from "@/components/ui/SousPage";
import type { AvancesProgramme } from "@/lib/flashcards/avancement";
import { LIEUX, RETOUR, RV, type KindListe } from "@/lib/voice-reviser";

// Le gabarit commun des trois listes de Réviser (/fiches, /courses, /flashcards), sur le modèle des
// sous-pages validé par Théo (2026-11-12) : l'en-tête (retour à Réviser, titre, une ligne, la
// peinture du lieu à droite), puis le cadre à zones : à gauche, les 10 matières en carrousel, chacune
// l'objet de la page (carnet, livret, carte à jouer) ; un clic sur la pièce de devant l'ouvre. À
// droite, la colonne grise de la page (`droite`), s'il y en a une. Pas d'annexe. Sans état ni requête.

/** Le code de chaque matière (ETH, QM…), pour la face des pièces du carrousel. */
const CODES: Record<string, string> = Object.fromEntries(SUBJECTS.map((x) => [x.key, x.code]));

/** Chaque liste son objet, pour qu'on la reconnaisse ; le titre de sa zone ; ce que fait la pièce de devant. */
const FORME: Record<KindListe, FormeCarrousel> = { fiche: "carnet", cours: "livret", cartes: "cartes" };
const TITRE: Record<KindListe, string> = { fiche: RV.fichesChoisir, cours: RV.coursChoisir, cartes: RV.cartesTitre };
const ACTION: Record<KindListe, string> = { fiche: RV.ouvrirFiche, cours: RV.coursOuvrirUn, cartes: RV.cartesOuvrir };

export function ListeReviser({
  kind,
  subjects,
  droite,
  croupier,
  titreCroupier,
  choisie,
}: {
  kind: KindListe;
  subjects: SubjectAvailability[];
  /** la colonne grise (le mini mur des one-pagers, la platine des cours…) */
  droite?: Zone;
  /** flashcards : la colonne grise (Léonard et la partie de cartes) et son titre ; vaut `droite` */
  croupier?: React.ReactNode;
  titreCroupier?: string;
  /** la matière sur laquelle le carrousel s'ouvre */
  choisie?: string;
  /** plus montré par le carrousel ; gardé pour scripts/flashcards/test-avancement.tsx */
  avances?: AvancesProgramme;
}) {
  const l = LIEUX[kind];
  const pieces: Piece[] = shelfRows(kind, subjects).map((r) => ({
    cle: r.key,
    // flashcards : le paquet de devant ouvre la révision de sa matière
    href: r.href && kind === "cartes" ? `/flashcards/matiere/${r.key}` : r.href,
    numero: pad2(r.index),
    code: CODES[r.key] ?? r.key.slice(0, 3).toUpperCase(),
    titre: r.name,
  }));
  const zoneD = droite ?? (croupier && titreCroupier ? { titre: titreCroupier, contenu: croupier } : undefined);
  return (
    <SousPage entete={<EnTeteSousPage retour={RETOUR.reviser} titre={l.titre} ligne={l.desc} illustration={{ nom: l.illustration, position: l.position }} />}>
      <CadreZones
        gauche={{
          titre: TITRE[kind],
          contenu: <Carrousel forme={FORME[kind]} pieces={pieces} action={ACTION[kind]} depart={Math.max(0, pieces.findIndex((x) => x.cle === choisie))} />,
        }}
        droite={zoneD}
      />
    </SousPage>
  );
}
