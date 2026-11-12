import { shelfRows } from "@/components/reviser/Briques";
import { AvanceFlashcards } from "@/components/reviser/AvanceFlashcards";
import { SUBJECTS } from "@/components/reviser/catalog";
import { pad2 } from "@/components/reviser/rail";
import { Presentoir } from "@/components/ui/Presentoir";
import type { SubjectAvailability } from "@/components/reviser/catalog";
import { LegendeAvance } from "@/components/reviser/Pastilles";
import { EnTeteSousPage, SousPage } from "@/components/ui/SousPage";
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

export function ListeReviser({
  kind,
  subjects,
  actions,
  apres,
  avances,
}: {
  kind: KindListe;
  subjects: SubjectAvailability[];
  /** les actions secondaires de l'en-tête (à contour) */
  actions?: React.ReactNode;
  apres?: React.ReactNode;
  avances?: AvancesProgramme;
}) {
  const l = LIEUX[kind];
  const rows = shelfRows(kind, subjects);
  const suivi = kind === "cartes" && avances && Object.keys(avances.matieres).length > 0 ? avances : undefined;
  return (
    <SousPage entete={<EnTeteSousPage retour={RETOUR.reviser} titre={l.titre} ligne={l.desc} actions={actions} illustration={{ nom: l.illustration, position: l.position }} />}>
      <section className="rl-section" aria-label={RV.programme}>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="t-h2 m-0">{RV.programme}</h2>
            <span className="t-micro">{RV.programmeAide}</span>
          </div>
          {suivi && <LegendeAvance />}
        </div>
        <Presentoir
          forme={kind === "cartes" ? "paquet" : "feuille"}
          label={RV.programme}
          pieces={rows.map((r) => {
            const avance = r.href ? suivi?.matieres[r.key] : undefined;
            return {
              cle: r.key,
              href: r.href,
              numero: pad2(r.index),
              code: CODES[r.key] ?? r.key.slice(0, 3).toUpperCase(),
              titre: r.name,
              ligne: r.href ? r.meta : RV.aVenirUne,
              pct: r.href ? r.pct : undefined,
              pied: avance && suivi ? <AvanceFlashcards suivi={avance} joueur={suivi.joueur} /> : undefined,
            };
          })}
        />
      </section>
      {apres}
    </SousPage>
  );
}
