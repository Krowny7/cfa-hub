import { Icone } from "@/components/adn/icons";
import { IndexProgramme, courseOf, shelfRows } from "@/components/reviser/Briques";
import { CarteSuite, HerosLieu } from "@/components/reviser/Heros";
import type { SubjectAvailability } from "@/components/reviser/catalog";
import { LegendeAvance } from "@/components/reviser/Pastilles";
import { ficheInfo } from "@/components/reviser/shelves";
import { EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
import type { AvancesProgramme } from "@/lib/flashcards/avancement";
import { LIEUX, RETOUR, RV, type KindListe } from "@/lib/voice-reviser";

// Le gabarit commun des trois listes de Réviser (/fiches, /courses, /flashcards), gabarit A
// des sous-pages : l'en-tête (retour à Réviser, titre, une ligne, `actions` à droite), puis,
// dans le cadre de la page, la rangée héros (la carte « ta suite » `suite` et la peinture du
// lieu), puis l'index du programme ; `apres` vient après l'index (les one-pagers, les
// paquets des flashcards…). `avances` (flashcards seulement, quand le compte est lisible) :
// sous chaque matière, les cartes déjà vues et une pastille par paquet, avec leur légende.
// Sans état ni requête.

export function ListeReviser({
  kind,
  subjects,
  suite,
  actions,
  apres,
  avances,
}: {
  kind: KindListe;
  subjects: SubjectAvailability[];
  /** la carte « ta suite » (déjà composée par la page), absente s'il n'y a rien à reprendre */
  suite?: React.ReactNode;
  /** les actions secondaires de l'en-tête (à contour) */
  actions?: React.ReactNode;
  apres?: React.ReactNode;
  avances?: AvancesProgramme;
}) {
  const l = LIEUX[kind];
  const rows = shelfRows(kind, subjects);
  const suivi = kind === "cartes" && avances && Object.keys(avances.matieres).length > 0 ? avances : undefined;
  return (
    <SousPage
      entete={<EnTeteSousPage retour={RETOUR.reviser} titre={l.titre} ligne={l.desc} actions={actions} />}
      premier={
        <HerosLieu illustration={l.illustration} position={l.position} nom={l.nom}>
          {suite}
        </HerosLieu>
      }
    >
      <section className="rl-section" aria-label={RV.programme}>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="t-h2 m-0">{RV.programme}</h2>
            <span className="t-micro">{RV.programmeAide}</span>
          </div>
          {suivi && <LegendeAvance />}
        </div>
        <IndexProgramme rows={rows} avances={suivi} />
      </section>
      {apres}
    </SousPage>
  );
}

/** La carte « ta suite » d'une liste de fiches ou de cours : la matière la plus fragile (sinon la première) et le format de la page. */
export function SuiteListe({ kind, subjects }: { kind: "fiche" | "cours"; subjects: SubjectAvailability[] }) {
  const has = kind === "fiche" ? (x: SubjectAvailability) => !!x.fiche : (x: SubjectAvailability) => !!x.course;
  const candidates = subjects.filter(has);
  const mesure = candidates.filter((x) => x.pct !== null).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))[0];
  const s = mesure ?? candidates[0];
  if (!s) return null;

  if (kind === "fiche") {
    const meta = ficheInfo(s.fiche!).meta;
    return (
      <CarteSuite
        icone={<Icone nom="fiche" size={22} />}
        titre={mesure ? RV.ficheReprendre(s.name) : RV.commencerPar(s.name)}
        ligne={mesure ? RV.ficheLigne(s.pct ?? 0, meta) : `${meta}.`}
        action={{ href: `/fiches/${s.fiche}`, label: RV.ouvrirFiche }}
      />
    );
  }
  const c = courseOf(s);
  if (!c) return null;
  return (
    <CarteSuite
      icone={<Icone nom="cours" size={22} />}
      titre={mesure ? RV.coursEcouterMatiere(s.name) : RV.commencerPar(s.name)}
      ligne={mesure ? RV.coursLigneSuite(s.pct ?? 0, c.chapters.length, c.minutes) : RV.coursLigneNeuve(c.chapters.length, c.minutes)}
      action={{ href: `/courses/${c.slug}`, label: RV.coursEcouter }}
    />
  );
}
