import { shelfRows } from "@/components/reviser/Briques";
import { AvanceFlashcards } from "@/components/reviser/AvanceFlashcards";
import { SUBJECTS } from "@/components/reviser/catalog";
import { pad2 } from "@/components/reviser/rail";
import { Presentoir, type FormePiece, type Piece } from "@/components/ui/Presentoir";
import { Carrousel } from "@/components/ui/Carrousel";
import type { SubjectAvailability } from "@/components/reviser/catalog";
import { LegendeAvance } from "@/components/reviser/Pastilles";
import { CadrePrincipal, CadreZones, EnTeteSousPage, SousPage, type Ambiance } from "@/components/ui/SousPage";
import type { AvancesProgramme } from "@/lib/flashcards/avancement";
import { LIEUX, RETOUR, RV, type KindListe } from "@/lib/voice-reviser";

// Le gabarit commun des trois listes de Réviser (/fiches, /courses, /flashcards), gabarit A
// des sous-pages : le cadre d'en-tête (retour à Réviser, titre, une ligne, `actions`, la
// peinture du lieu à droite), puis les 10 matières sur le présentoir (components/ui/Presentoir) ; `apres` vient après l'index (les one-pagers, les
// paquets des flashcards…). `avances` (flashcards seulement, quand le compte est lisible) :
// sous chaque matière, les cartes déjà vues et une pastille par paquet, avec leur légende.
// Sans état ni requête.

/** Le code de chaque matière (ETH, QM…), pour la face des pièces du présentoir. */
const CODES: Record<string, string> = Object.fromEntries(SUBJECTS.map((x) => [x.key, x.code]));

/** Chaque liste son lieu, pour qu'on la reconnaisse : la matière du cadre et l'objet posé dessus. */
const AMBIANCE: Record<KindListe, Ambiance> = { fiche: "carnet", cours: "pupitre", cartes: "tapis" };
const FORME: Record<KindListe, FormePiece> = { fiche: "carnet", cours: "livret", cartes: "paquet" };

export function ListeReviser({
  kind,
  subjects,
  apres,
  avances,
  croupier,
  titreCroupier,
  choisie,
}: {
  kind: KindListe;
  subjects: SubjectAvailability[];
  apres?: React.ReactNode;
  avances?: AvancesProgramme;
  /** flashcards : le panneau de droite (Léonard et la partie de cartes) ; à gauche, le carrousel des paquets */
  croupier?: React.ReactNode;
  /** le titre de la colonne de droite, dans la bande noire */
  titreCroupier?: string;
  /** la matière montrée dans l'annexe : le carrousel s'ouvre sur elle */
  choisie?: string;
}) {
  const l = LIEUX[kind];
  const rows = shelfRows(kind, subjects);
  const suivi = kind === "cartes" && avances && Object.keys(avances.matieres).length > 0 ? avances : undefined;
  const pieces: Piece[] = rows.map((r) => {
      const avance = r.href ? suivi?.matieres[r.key] : undefined;
      return {
        cle: r.key,
        // flashcards : le paquet de devant ouvre la révision de sa matière
    href: r.href && kind === "cartes" ? `/flashcards/matiere/${r.key}` : r.href,
        numero: pad2(r.index),
        code: CODES[r.key] ?? r.key.slice(0, 3).toUpperCase(),
        titre: r.name,
        ligne: r.href ? r.meta : RV.aVenirUne,
        pct: r.href ? r.pct : undefined,
        pied: avance && suivi ? <AvanceFlashcards suivi={avance} joueur={suivi.joueur} /> : undefined,
      };
    });
  return (
    <SousPage entete={<EnTeteSousPage retour={RETOUR.reviser} titre={l.titre} ligne={l.desc} illustration={{ nom: l.illustration, position: l.position }} />}>
      {kind === "cartes" && croupier ? (
        <CadreZones
          gauche={{ titre: RV.cartesTitre, contenu: <Carrousel pieces={pieces} action={RV.cartesOuvrir} depart={Math.max(0, pieces.findIndex((x) => x.cle === choisie))} /> }}
          droite={titreCroupier ? { titre: titreCroupier, contenu: croupier } : undefined}
        />
      ) : (
        <CadrePrincipal ambiance={AMBIANCE[kind]} titre={RV.programme} aide={RV.programmeAide} tete={suivi ? <LegendeAvance /> : undefined}>
          <Presentoir forme={FORME[kind]} label={RV.programme} pieces={pieces} />
        </CadrePrincipal>
      )}
      {apres}
    </SousPage>
  );
}
