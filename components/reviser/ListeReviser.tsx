import { BandeEncre } from "@/components/ui/BandeEncre";
import { Icone } from "@/components/adn/icons";
import { IndexProgramme, LieuHorizontal, ListeEntete, courseOf, shelfRows } from "@/components/reviser/Briques";
import type { SubjectAvailability } from "@/components/reviser/catalog";
import { ficheInfo } from "@/components/reviser/shelves";
import { LIEUX, RV, type KindListe } from "@/lib/voice-reviser";

// Le gabarit commun des trois listes de Réviser (/fiches, /courses,
// /flashcards), variante C « Index + vignette du lieu » : en-tête, carte
// horizontale du lieu, une bande d'encre (une seule action forte), puis
// l'index du programme. `bande` est la bande d'encre de la page ; `suite`
// vient après l'index (les paquets des flashcards…). Sans état ni requête.

export function ListeReviser({
  kind,
  subjects,
  bande,
  suite,
}: {
  kind: KindListe;
  subjects: SubjectAvailability[];
  /** la bande d'encre (déjà composée par la page) */
  bande: React.ReactNode;
  suite?: React.ReactNode;
}) {
  const l = LIEUX[kind];
  const rows = shelfRows(kind, subjects);
  const n = rows.filter((r) => r.href).length;
  return (
    <div className="rl-wide rl-page">
      <div className="flex flex-col gap-7 md:gap-10">
        <ListeEntete title={l.titre} desc={l.desc} />
        <LieuHorizontal kind={kind} n={n} />
        {bande}
      </div>
      <section className="rl-section" aria-label={RV.programme}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="t-h2 m-0">{RV.programme}</h2>
          <span className="t-micro">{RV.programmeAide}</span>
        </div>
        <IndexProgramme rows={rows} />
      </section>
      {suite}
    </div>
  );
}

/** La bande d'encre d'une liste de fiches ou de cours : la matière la plus fragile (sinon la première) et le format de la page. */
export function BandeListe({ kind, subjects }: { kind: "fiche" | "cours"; subjects: SubjectAvailability[] }) {
  const has = kind === "fiche" ? (x: SubjectAvailability) => !!x.fiche : (x: SubjectAvailability) => !!x.course;
  const candidates = subjects.filter(has);
  const mesure = candidates.filter((x) => x.pct !== null).sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))[0];
  const s = mesure ?? candidates[0];
  if (!s) return null;

  if (kind === "fiche") {
    const meta = ficheInfo(s.fiche!).meta;
    return (
      <BandeEncre
        icone={<Icone nom="fiche" size={22} />}
        titre={mesure ? `Reprendre par ${s.name}` : `Commencer par ${s.name}`}
        ligne={mesure ? `${s.pct} % de maîtrise, ta matière la plus fragile qui a une fiche · ${meta}.` : `${meta}.`}
        action={{ href: `/fiches/${s.fiche}`, label: RV.ouvrirFiche }}
      />
    );
  }
  const c = courseOf(s);
  if (!c) return null;
  return (
    <BandeEncre
      icone={<Icone nom="cours" size={22} />}
      titre={mesure ? `Écouter ${s.name}` : `Commencer par ${s.name}`}
      ligne={mesure ? `${s.pct} % de maîtrise, ta matière la plus fragile · ${c.chapters.length} modules, ${c.minutes} min.` : `${c.chapters.length} modules, ${c.minutes} min.`}
      action={{ href: `/courses/${c.slug}`, label: "Écouter le cours" }}
    />
  );
}
