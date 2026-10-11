import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Icone } from "@/components/adn/icons";
import { DomainSpace } from "@/components/reviser/DomainSpace";
import { SubjectExplorer } from "@/components/reviser/SubjectExplorer";
import { SubjectPanel } from "@/components/reviser/SubjectPanel";
import { ListeClassee, courseOf, repere, totalMinutes, weakest } from "@/components/reviser/Briques";
import { subjectRail } from "@/components/reviser/rail";
import { SUBJECTS, type SubjectAvailability } from "@/components/reviser/catalog";
import { ficheInfo } from "@/components/reviser/shelves";
import { BandeEncre, RangeeLiens } from "@/components/ui/BandeEncre";
import { CarteLieu } from "@/components/ui/CarteLieu";
import { Illustration } from "@/components/ui/Illustration";
import { Medaillon, Sceau, TuileCalme } from "@/components/ui/Tuiles";
import { nombre } from "@/lib/voice";
import { RV } from "@/lib/voice-reviser";
import { ESPACES } from "@/lib/voice-z4";

// Espace « Réviser », variante A « La matière à revoir + la Bibliothèque » :
// un héros pour ta matière la plus fragile qui a une fiche (seul bouton
// plein), La Bibliothèque (un « lieu » illustré, comme L'Atelier), deux
// tuiles calmes (flashcards, carnet de ratures), la bande « Écouter un
// cours », une rangée de liens, puis les 10 matières (choisir une matière
// montre sa fiche, son cours et ses cartes). Sans requête : app/reviser
// charge les données, l'aperçu en fournit d'exemple.

/** Ligne d'un format secondaire (aussi pour S'entraîner). entier : la description passe à la ligne au lieu d'être coupée (colonnes étroites), les titres restent alignés en haut. */
export function FormatRow({ href, icon, title, desc, meta, entier = false }: { href: string; icon: React.ReactNode; title: string; desc: string; meta?: string | null; entier?: boolean }) {
  return (
    <Link href={href} className={"rl-row group flex h-full gap-4 px-5 py-[18px] md:px-6 " + (entier ? "items-start" : "items-center")}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-surface-2">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-bold leading-tight tracking-[-0.01em]">{title}</span>
        <span className={"t-micro mt-1 block " + (entier ? "" : "sm:truncate")}>{desc}</span>
      </span>
      {meta && <span className="t-micro hidden shrink-0 font-semibold sm:inline">{meta}</span>}
      <ChevronRight size={16} aria-hidden className="shrink-0 self-center text-muted transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** Matière ouverte au départ dans la rangée des 10 matières : celle demandée (?matiere=), sinon la première du programme. */
function initialSubject(subjects: SubjectAvailability[], requested?: string | null) {
  if (requested && subjects.some((s) => s.key === requested)) return requested;
  return subjects[0]?.key ?? "";
}

export function ReviserView({
  subjects,
  matiere,
  flashcardSets = null,
  ratures = null,
}: {
  subjects: SubjectAvailability[];
  matiere?: string | null;
  /** sets de flashcards officiels publiés (null : inconnu, on compte les matières) */
  flashcardSets?: number | null;
  /** questions du carnet de ratures à reprendre (null : inconnu) */
  ratures?: number | null;
}) {
  const fiches = subjects.filter((s) => s.fiche).length;
  const avecCartes = subjects.filter((s) => s.flashcards);
  const paquets = flashcardSets ?? avecCartes.reduce((a, s) => a + s.flashcardSets, 0);
  const nbCours = subjects.filter((s) => s.course).length;

  // le héros : ta matière la plus fragile qui a une fiche (sinon la première qui en a une)
  const s = weakest(subjects, (x) => !!x.fiche, 1)[0] ?? subjects.find((x) => x.fiche) ?? null;
  const ensuite = s ? weakest(subjects, (x) => !!x.fiche || !!x.course, 4).filter((x) => x.key !== s.key).slice(0, 3) : [];
  const c = s ? courseOf(s) : null;

  const heros = s ? (
    <section
      className={"card-hero rl-in grid min-h-[260px] min-w-0 lg:h-full gap-x-8 gap-y-6 p-6 md:p-8 " + (ensuite.length > 0 ? "md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" : "")}
      aria-label={RV.enPriorite}
      data-leonard="fiches"
    >
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="t-eyebrow">{s.pct === null ? RV.parOuCommencer : RV.enPriorite}</p>
          <h2 className="t-h1 m-0 [overflow-wrap:anywhere]">{s.name}</h2>
          <p className="t-micro m-0">{repere(s)}</p>
        </div>
        <div className="grid gap-1.5">
          <p className="t-body m-0 max-w-[480px] text-muted">{s.pct === null ? RV.heroNonMesure : RV.heroMesure(s.pct)}</p>
          <p className="t-small m-0 max-w-[480px]">{RV.heroLigne(ficheInfo(s.fiche!).meta, c?.minutes ?? null)}</p>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
          <Link href={`/fiches/${s.fiche}`} className="btn btn-primary rl-press w-fit max-md:min-h-[44px]">
            <Icone nom="fiche" size={16} /> {RV.ouvrirFiche} <ArrowRight size={16} aria-hidden />
          </Link>
          {c && (
            <Link href={`/courses/${c.slug}`} className="ink-link inline-flex min-h-[44px] items-center gap-1 text-[13px] font-semibold md:min-h-0">
              {RV.ecouterCours(c.minutes)} <ArrowRight size={13} aria-hidden />
            </Link>
          )}
        </div>
      </div>
      {ensuite.length > 0 && (
        <ListeClassee
          title={RV.ensuite}
          rows={ensuite.map((x) => ({
            key: x.key,
            href: `/reviser?matiere=${x.key}`,
            label: x.name,
            pct: x.pct,
            note: [x.fiche && "fiche", x.course && "cours", x.flashcards && "cartes"].filter(Boolean).join(" · "),
          }))}
        />
      )}
    </section>
  ) : null;

  const tuiles = (
    <div className="grid min-w-0 gap-4 max-lg:order-last md:gap-[18px] lg:col-span-8 lg:col-start-1 lg:row-start-2 xl:grid-cols-2">
      <TuileCalme
        icone={<Icone nom="flashcards" size={17} />}
        titre={RV.flashTitre}
        droite={
          <span className="-my-1.5 flex items-center gap-3">
            {paquets > 0 && <span className="t-micro font-mono">{RV.flashPaquets(paquets)}</span>}
            <Medaillon nom="reviser-casier-medaillon" taille={60} />
          </span>
        }
        ligne={RV.flashLigne(avecCartes.map((x) => x.name))}
        actions={
          <Link href="/flashcards" className="ink-link inline-flex items-center gap-1 text-[14px] font-semibold">
            {RV.flashAction} <ArrowRight size={14} aria-hidden />
          </Link>
        }
      />
      <TuileCalme
        icone={<Icone nom="erreurs" size={17} />}
        titre={RV.carnetTitre}
        droite={ratures !== null && ratures > 0 ? <span className="t-micro font-mono">{nombre(ratures)}</span> : undefined}
        fort={ratures === 0 ? RV.carnetPropre : RV.carnetFort}
        ligne={ratures === 0 ? RV.carnetLignePropre : RV.carnetLigne}
        actions={
          <Link href="/moi?onglet=erreurs" className="btn btn-secondary rl-press min-h-[38px] px-3.5 text-[13.5px]">
            {RV.carnetAction} <ArrowRight size={15} aria-hidden />
          </Link>
        }
      />
    </div>
  );

  const lead = (
    <div className="flex flex-col gap-4 md:gap-[18px]">
      <div className="grid gap-4 md:gap-[18px] lg:grid-cols-12">
        {heros && <div className="min-w-0 lg:col-span-8 lg:col-start-1 lg:row-start-1">{heros}</div>}
        {tuiles}
        <CarteLieu
          className="lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1 lg:self-stretch"
          dataLeonard="formats"
          label={RV.biblio}
          ratio="4 / 3"
          visuel={<Illustration nom="reviser-bibliotheque" position="50% 45%" />}
          vignette={<Illustration nom="reviser-bibliotheque" position="50% 45%" decorative />}
          marque={
            <Sceau>
              <Icone nom="reviser" size={20} />
            </Sceau>
          }
          nom={RV.biblio}
          tailleNom="text-[21px] lg:text-[33px] xl:text-[38px]"
          sousTitre={RV.biblioSous}
          etat={RV.biblioEtat(fiches, paquets)}
          action={{ href: "/fiches", label: RV.biblioAction }}
          liens={[{ href: "/flashcards", label: RV.biblioLien }]}
        />
      </div>
      <BandeEncre
        icone={<Icone nom="cours" size={22} />}
        titre={RV.coursTitre}
        ligne={RV.coursLigne(nbCours, Math.round(totalMinutes(subjects) / 60))}
        action={{ href: "/courses", label: RV.coursAction }}
      />
      <RangeeLiens
        label={RV.fonds}
        liens={[
          { href: "/moi?onglet=marquees", icon: <Icone nom="serie" size={20} />, title: RV.marquees[0], desc: RV.marquees[1] },
          { href: "/practice", icon: <Icone nom="entrainer" size={20} />, title: RV.apresLecture[0], desc: RV.apresLecture[1] },
          { href: "/eclair", icon: <Icone nom="examen" size={20} />, title: RV.eclair[0], desc: RV.eclair[1] },
        ]}
      />
    </div>
  );

  return (
    <DomainSpace kicker="Réviser" icon={<Icone nom="reviser" size={18} />} title={ESPACES.reviserTitre} lead={lead}>
      <section className="rl-section" aria-labelledby="reviser-matieres">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="reviser-matieres" className="t-h2 m-0">
            {RV.dixMatieres}
          </h2>
          <span className="t-micro">{RV.dixMatieresAide}</span>
        </div>
        <SubjectExplorer
          initial={initialSubject(subjects, matiere)}
          items={subjectRail(subjects, (key) => {
            const x = subjects.find((y) => y.key === key);
            return { formats: { fiche: !!x?.fiche, course: !!x?.course, cards: !!x?.flashcards } };
          })}
          panels={Object.fromEntries(
            subjects.map((x) => {
              const i = SUBJECTS.findIndex((y) => y.key === x.key);
              return [x.key, <SubjectPanel key={x.key} s={x} index={i + 1} code={SUBJECTS[i]?.code ?? ""} />];
            }),
          )}
        />
      </section>
    </DomainSpace>
  );
}
